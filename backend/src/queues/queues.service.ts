import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { QueueStatus, AppointmentStatus, BookingType } from '@prisma/client';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class QueuesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
  ) {}

  
   // Check-in cuộc hẹn để đưa vào hàng đợi
   
  async checkIn(appointmentId: string, currentUser: any) {
    // Ủy quyền hoàn toàn cho AppointmentsService.checkIn để tránh trùng lặp logic
    return this.appointmentsService.checkIn(appointmentId, currentUser);
  }

  
   //Giám sát hàng đợi khám bệnh (Cho cả phòng khám hoặc từng bác sĩ)
   
  async getQueueMonitor(query: { doctorId?: string; specialtyId?: string; date?: string }) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Xây dựng điều kiện lọc
    const whereClause: any = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (query.doctorId) {
      whereClause.doctorId = query.doctorId;
    }

    if (query.specialtyId) {
      whereClause.doctor = {
        specialtyId: query.specialtyId,
      };
    }

    // Lấy danh sách QueueEntry trong ngày
    const entries = await this.prisma.queueEntry.findMany({
      where: whereClause,
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
            specialty: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        queueNo: 'asc',
      },
    });

    // Hàm phụ trợ định dạng QueueEntry trả về Client
    const formatQueueEntry = (entry: any) => {
      if (!entry) return null;
      const bookingType = entry.appointment?.bookingType || BookingType.ONLINE;
      return {
        ...entry,
        queueNoFormatted: this.formatQueueNumber(entry.queueNo, bookingType),
      };
    };

    // Nếu lọc theo bác sĩ cụ thể, trả về định dạng chi tiết
    if (query.doctorId) {
      const doctorInfo = await this.prisma.doctor.findUnique({
        where: { id: query.doctorId },
        include: { user: { select: { fullName: true } } },
      });

      // Sắp xếp hàng đợi chờ khám theo thời gian chờ dự kiến tăng dần (thứ tự ưu tiên khám)
      const waitingList = entries
        .filter((e) => e.status === QueueStatus.WAITING)
        .map(formatQueueEntry)
        .sort((a, b) => (a?.estimatedWait || 0) - (b?.estimatedWait || 0));

      const currentlyExaminingRaw = entries.find((e) => e.status === QueueStatus.IN_PROGRESS) || null;
      const currentlyExamining = currentlyExaminingRaw ? formatQueueEntry(currentlyExaminingRaw) : null;
      const completedList = entries.filter((e) => e.status === QueueStatus.DONE).map(formatQueueEntry);
      const noShowList = entries.filter((e) => e.status === QueueStatus.NO_SHOW).map(formatQueueEntry);

      return {
        doctorId: query.doctorId,
        doctorName: doctorInfo?.user?.fullName || 'Không rõ',
        waitingCount: waitingList.length,
        inProgressCount: currentlyExamining ? 1 : 0,
        currentlyExamining,
        waitingList,
        completedList,
        noShowList,
      };
    }

    // Nếu không lọc theo bác sĩ, nhóm kết quả theo bác sĩ
    const doctorQueues: any = {};
    for (const entry of entries) {
      const docId = entry.doctorId;
      if (!doctorQueues[docId]) {
        doctorQueues[docId] = {
          doctorId: docId,
          doctorName: entry.doctor?.user?.fullName || 'Không rõ',
          specialtyName: entry.doctor?.specialty?.name || 'Không rõ',
          waitingCount: 0,
          inProgressCount: 0,
          currentlyExamining: null,
          waitingList: [],
          completedList: [],
        };
      }

      const formatted = formatQueueEntry(entry);

      if (entry.status === QueueStatus.WAITING) {
        doctorQueues[docId].waitingList.push(formatted);
        doctorQueues[docId].waitingCount++;
      } else if (entry.status === QueueStatus.IN_PROGRESS) {
        doctorQueues[docId].currentlyExamining = formatted;
        doctorQueues[docId].inProgressCount = 1;
      } else if (entry.status === QueueStatus.DONE) {
        doctorQueues[docId].completedList.push(formatted);
      }
    }

    // Sắp xếp waitingList của từng bác sĩ theo thứ tự ưu tiên
    for (const docId of Object.keys(doctorQueues)) {
      doctorQueues[docId].waitingList.sort(
        (a: any, b: any) => (a?.estimatedWait || 0) - (b?.estimatedWait || 0)
      );
    }

    return Object.values(doctorQueues);
  }

  
    //Cập nhật trạng thái lượt khám trong hàng đợi (WAITING -> IN_PROGRESS -> DONE / NO_SHOW)
   
  async updateQueueStatus(id: string, newStatus: QueueStatus, currentUser: any) {
    // Tìm lượt khám
    const queueEntry = await this.prisma.queueEntry.findUnique({
      where: { id },
      include: {
        appointment: true,
      },
    });

    if (!queueEntry) {
      throw new NotFoundException('Không tìm thấy lượt khám trong hàng đợi');
    }

    // Kiểm tra phân quyền bác sĩ
    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctor || queueEntry.doctorId !== doctor.id) {
        throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái hàng đợi của bác sĩ khác');
      }
    }

    // Thực hiện chuyển trạng thái qua Transaction
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      if (newStatus === QueueStatus.IN_PROGRESS) {
        // Tự động đóng các ca khám khác đang kẹt ở trạng thái IN_PROGRESS của bác sĩ này
        const activeTodayStart = new Date();
        activeTodayStart.setHours(0, 0, 0, 0);
        const activeTodayEnd = new Date();
        activeTodayEnd.setHours(23, 59, 59, 999);

        const currentActiveEntries = await tx.queueEntry.findMany({
          where: {
            doctorId: queueEntry.doctorId,
            status: QueueStatus.IN_PROGRESS,
            id: { not: id },
            createdAt: {
              gte: activeTodayStart,
              lte: activeTodayEnd,
            },
          },
        });

        for (const activeEntry of currentActiveEntries) {
          await tx.queueEntry.update({
            where: { id: activeEntry.id },
            data: {
              status: QueueStatus.DONE,
              completedAt: now,
            },
          });
          await tx.appointment.update({
            where: { id: activeEntry.appointmentId },
            data: {
              status: AppointmentStatus.COMPLETED,
            },
          });
        }

        // Cập nhật lượt khám mục tiêu sang IN_PROGRESS
        const updatedEntry = await tx.queueEntry.update({
          where: { id },
          data: {
            status: QueueStatus.IN_PROGRESS,
            startedAt: now,
            calledAt: queueEntry.calledAt ? undefined : now, // Gọi khám nếu chưa gọi
          },
        });

        // Cập nhật lịch hẹn tương ứng
        await tx.appointment.update({
          where: { id: queueEntry.appointmentId },
          data: {
            status: AppointmentStatus.IN_PROGRESS,
          },
        });

        // Tính lại thời gian chờ cho các bệnh nhân còn lại
        await this.recalculateWaitTimes(tx, queueEntry.doctorId);

        return updatedEntry;
      }

      if (newStatus === QueueStatus.DONE) {
        // Cập nhật lượt khám mục tiêu sang DONE
        const updatedEntry = await tx.queueEntry.update({
          where: { id },
          data: {
            status: QueueStatus.DONE,
            completedAt: now,
          },
        });

        // Cập nhật lịch hẹn tương ứng sang COMPLETED
        await tx.appointment.update({
          where: { id: queueEntry.appointmentId },
          data: {
            status: AppointmentStatus.COMPLETED,
          },
        });

        // Tính lại thời gian chờ cho các bệnh nhân còn lại
        await this.recalculateWaitTimes(tx, queueEntry.doctorId);

        return updatedEntry;
      }

      if (newStatus === QueueStatus.NO_SHOW) {
        // Cập nhật lượt khám mục tiêu sang NO_SHOW
        const updatedEntry = await tx.queueEntry.update({
          where: { id },
          data: {
            status: QueueStatus.NO_SHOW,
          },
        });

        // Cập nhật lịch hẹn tương ứng sang NO_SHOW
        await tx.appointment.update({
          where: { id: queueEntry.appointmentId },
          data: {
            status: AppointmentStatus.NO_SHOW,
          },
        });

        // Tính lại thời gian chờ cho các bệnh nhân còn lại
        await this.recalculateWaitTimes(tx, queueEntry.doctorId);

        return updatedEntry;
      }

      // Đối với các trạng thái khác (ví dụ quay lại WAITING)
      const updatedEntry = await tx.queueEntry.update({
        where: { id },
        data: {
          status: newStatus,
        },
      });
      await this.recalculateWaitTimes(tx, queueEntry.doctorId);
      return updatedEntry;
    });
  }

  
   // Tính toán lại thời gian chờ dự kiến cho tất cả các bệnh nhân đang WAITING của một bác sĩ
  
  
  //Hàm tự động cấp số thứ tự khám tiếp theo cho bác sĩ trong ngày hôm nay.
   // Số thứ tự là số nguyên dương tăng dần từ 1 để đảm bảo dễ theo dõi trong cơ sở dữ liệu.
   
  async generateQueueNumber(tx: any, doctorId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Tìm lượt khám có số thứ tự lớn nhất trong ngày của bác sĩ đó
    const maxQueueEntry = await tx.queueEntry.findFirst({
      where: {
        doctorId,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      orderBy: {
        queueNo: 'desc',
      },
    });

    return maxQueueEntry ? maxQueueEntry.queueNo + 1 : 1;
  }


   // Định dạng số thứ tự in trên phiếu để phân biệt rõ ràng:
    // OL-XXX cho bệnh nhân đặt lịch trực tuyến (ONLINE).
   // WL-XXX cho bệnh nhân vãng lai đăng ký trực tiếp tại quầy (WALK_IN).
   
  formatQueueNumber(queueNo: number, bookingType: BookingType): string {
    const prefix = bookingType === BookingType.ONLINE ? 'OL' : 'WL';
    const padded = String(queueNo).padStart(3, '0');
    return `${prefix}-${padded}`;
  }
   // Hàm sắp xếp thứ tự ưu tiên trong hàng đợi khám (WAITING):
   // Nhóm 1 (ONLINE): Bệnh nhân đặt lịch trực tuyến đến đúng giờ (thời gian hiện tại chưa quá giờ hẹn quá 15 phút).
   //  Nhóm này được sắp xếp theo giờ hẹn (slot.startTime) tăng dần.
   // Nhóm 2 (WALK_IN / LATE): Bệnh nhân vãng lai đăng ký tại quầy + Bệnh nhân ONLINE đi trễ quá 15 phút.
   //  Nhóm này được sắp xếp theo thời gian check-in (createdAt của QueueEntry) tăng dần.
   // Trộn xen kẽ hai nhóm theo tỷ lệ: 2 ONLINE : 1 WALK_IN để tránh việc bệnh nhân vãng lai phải chờ vô tận.
  arrangeQueue(entries: any[]): any[] {
    const now = new Date();
    const LATE_THRESHOLD_MIN = 15; // Ngưỡng đi trễ: 15 phút

    const onlineQueue: any[] = [];
    const walkInQueue: any[] = [];

    for (const entry of entries) {
      const appointment = entry.appointment;
      const isOnline = appointment?.bookingType === BookingType.ONLINE;

      if (isOnline && appointment?.slot) {
        // Tính mốc thời gian hẹn chính xác
        const slotDate = new Date(appointment.slot.date);
        const slotStartTime = new Date(appointment.slot.startTime);
        
        const appointmentTime = new Date(slotDate);
        appointmentTime.setHours(slotStartTime.getHours(), slotStartTime.getMinutes(), slotStartTime.getSeconds(), 0);

        // Đo khoảng thời gian bệnh nhân đi trễ
        const diffMs = now.getTime() - appointmentTime.getTime();
        const diffMin = diffMs / (1000 * 60);

        if (diffMin > LATE_THRESHOLD_MIN) {
          // Bệnh nhân trực tuyến đi trễ quá 15 phút -> Chuyển xuống hàng đợi vãng lai
          walkInQueue.push(entry);
        } else {
          // Đến đúng giờ hoặc đến sớm -> Ưu tiên cao
          onlineQueue.push(entry);
        }
      } else {
        // Bệnh nhân vãng lai (WALK_IN)
        walkInQueue.push(entry);
      }
    }

    // Sắp xếp nhóm ONLINE theo giờ hẹn (ai hẹn trước khám trước)
    onlineQueue.sort((a, b) => {
      const timeA = new Date(a.appointment.slot.startTime).getTime();
      const timeB = new Date(b.appointment.slot.startTime).getTime();
      return timeA - timeB;
    });

    // Sắp xếp nhóm WALK_IN & ONLINE TRỄ theo thời gian check-in (ai đến trước khám trước)
    walkInQueue.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Trộn xen kẽ 2 ONLINE : 1 WALK_IN
    const result: any[] = [];
    const ONLINE_RATIO = 2;
    const WALK_IN_RATIO = 1;

    let onlineIdx = 0;
    let walkInIdx = 0;

    while (onlineIdx < onlineQueue.length || walkInIdx < walkInQueue.length) {
      // Đưa tối đa 2 bệnh nhân ONLINE
      for (let i = 0; i < ONLINE_RATIO && onlineIdx < onlineQueue.length; i++) {
        result.push(onlineQueue[onlineIdx++]);
      }
      // Đưa tối đa 1 bệnh nhân WALK_IN (hoặc đi trễ)
      for (let i = 0; i < WALK_IN_RATIO && walkInIdx < walkInQueue.length; i++) {
        result.push(walkInQueue[walkInIdx++]);
      }
    }

    return result;
  }


   //Tính toán lại thời gian chờ dự kiến (estimatedWait) cho tất cả bệnh nhân WAITING của bác sĩ.
   //Áp dụng thuật toán ước lượng thời gian chờ động:
   // Tính hiệu suất khám thực tế của bác sĩ hôm nay = trung bình cộng thời gian khám các ca đã hoàn thành.
   // Nếu bác sĩ chưa hoàn thành ca nào (hoặc < 3 ca), sử dụng slotDurationMin mặc định của ca làm việc.
   // Tính thời gian còn lại của ca đang khám (nếu có ca đang IN_PROGRESS).
   // Sắp xếp lại hàng đợi bằng thuật toán arrangeQueue.
   // Cập nhật trường estimatedWait trong cơ sở dữ liệu dựa trên thứ tự hàng đợi mới.
   
  async recalculateWaitTimes(tx: any, doctorId: string): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Lấy tất cả ca đã khám xong hôm nay để tính thời gian khám trung bình
    const completedEntries = await tx.queueEntry.findMany({
      where: {
        doctorId,
        status: QueueStatus.DONE,
        completedAt: { not: null },
        startedAt: { not: null },
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    let averageServiceTime = 15; // Mặc định ban đầu là 15 phút

    // Lấy slotDurationMin từ WorkSchedule làm giá trị mặc định cho bác sĩ
    const firstActiveEntry = await tx.queueEntry.findFirst({
      where: {
        doctorId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        appointment: {
          include: {
            slot: {
              include: {
                workSchedule: true,
              },
            },
          },
        },
      },
    });

    if (firstActiveEntry?.appointment?.slot?.workSchedule?.slotDurationMin) {
      averageServiceTime = firstActiveEntry.appointment.slot.workSchedule.slotDurationMin;
    }

    // Nếu bác sĩ đã khám xong tối thiểu 3 ca hôm nay, tính trung bình thực tế
    if (completedEntries.length >= 3) {
      let totalDurationMs = 0;
      for (const entry of completedEntries) {
        totalDurationMs += new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime();
      }
      const avgDurationMin = Math.round(totalDurationMs / (completedEntries.length * 1000 * 60));
      if (avgDurationMin > 0) {
        averageServiceTime = avgDurationMin;
      }
    }

    // 2. Tính thời gian còn lại của ca đang khám (IN_PROGRESS)
    const inProgressEntry = await tx.queueEntry.findFirst({
      where: {
        doctorId,
        status: QueueStatus.IN_PROGRESS,
        startedAt: { not: null },
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    let remainingTimeForCurrent = 0;
    if (inProgressEntry) {
      const elapsedMs = new Date().getTime() - new Date(inProgressEntry.startedAt).getTime();
      const elapsedMin = Math.round(elapsedMs / (1000 * 60));
      remainingTimeForCurrent = Math.max(0, averageServiceTime - elapsedMin);
    }

    // 3. Lấy toàn bộ danh sách bệnh nhân đang WAITING để sắp xếp lại
    const waitingEntries = await tx.queueEntry.findMany({
      where: {
        doctorId,
        status: QueueStatus.WAITING,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        appointment: {
          include: {
            slot: true,
          },
        },
      },
    });

    if (waitingEntries.length === 0) return;

    // Sắp xếp lại hàng đợi theo thuật toán xen kẽ ưu tiên
    const sortedEntries = this.arrangeQueue(waitingEntries);

    // 4. Cập nhật thời gian chờ và thứ tự trong DB
    for (let i = 0; i < sortedEntries.length; i++) {
      const waitMin = remainingTimeForCurrent + i * averageServiceTime;
      await tx.queueEntry.update({
        where: { id: sortedEntries[i].id },
        data: {
          estimatedWait: waitMin,
        },
      });
    }
  }
}
