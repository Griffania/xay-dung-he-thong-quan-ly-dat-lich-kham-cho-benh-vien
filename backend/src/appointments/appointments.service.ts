import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentsDto } from './dto/create-appointments.dto';
import { Role } from '../auth/enums/role.enum';
import {
  AppointmentStatus,
  QueueStatus,
  SlotStatus,
  BookingType,
  QueueEntry,
} from '@prisma/client';
import { QueryAppointmentsDto } from './dto/query.appointments.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CompleteExaminationDto } from './dto/complete-examination.dto';
import { QueuesService } from '../queues/queues.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => QueuesService))
    private readonly queuesService: QueuesService,
  ) {}
  //kiểm tra slot có nằm trong quá khứ so với thời gian hiện tại hay không
  private isSlotInPast(slotDate: Date, slotStartTime: Date): boolean {
    const now = new Date();
    // Chuyển sang múi giờ Việt Nam (UTC+7) để so sánh thực tế
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const slotDateStr = slotDate.toISOString().split('T')[0];
    
    const year = vnTime.getUTCFullYear();
    const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnTime.getUTCDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (slotDateStr < todayStr) {
      return true;
    }
    if (slotDateStr === todayStr) {
      const hours = String(vnTime.getUTCHours()).padStart(2, '0');
      const minutes = String(vnTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(vnTime.getUTCSeconds()).padStart(2, '0');
      const currentTimeOfDay = new Date(
        `1970-01-01T${hours}:${minutes}:${seconds}.000Z`,
      );
      return slotStartTime.getTime() <= currentTimeOfDay.getTime();
    }
    return false;
  }

  // Kết hợp ngày và giờ của slot thành đối tượng Date đầy đủ theo UTC
  private getSlotFullDateTime(slotDate: Date, slotStartTime: Date): Date {
    const slotDateStr = slotDate.toISOString().split('T')[0];
    const startTimeISO = slotStartTime.toISOString();
    const timeStr = startTimeISO.substring(11, 23); // Lấy phần 'HH:MM:SS.mmm'
    return new Date(`${slotDateStr}T${timeStr}Z`);
  }

  // Tự động chuyển các lịch hẹn quá hạn check-in sang VẮNG MẶT (NO_SHOW) và giải phóng slot
  async autoExpireAppointments() {
    const now = new Date();
    // Chuyển sang múi giờ Việt Nam (UTC+7) để đồng bộ với giờ hẹn lưu dạng local trong DB
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const confirmedAppts = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        slot: true,
      },
    });

    for (const appt of confirmedAppts) {
      const apptTime = this.getSlotFullDateTime(appt.slot.date, appt.slot.startTime);
      const lateTime = new Date(apptTime.getTime() + 5 * 60 * 1000); // Trễ quá 5 phút
      if (vnTime > lateTime) {
        await this.prisma.$transaction(async (tx) => {
          await tx.appointment.update({
            where: { id: appt.id },
            data: { status: AppointmentStatus.NO_SHOW },
          });
          await tx.slot.update({
            where: { id: appt.slotId },
            data: { status: SlotStatus.AVAILABLE },
          });
        });
      }
    }
  }
  //nghiệp vụ đổi trạng thái slot->booked , tạo Appointment ở trạng thái Pending
  async create(createDto: CreateAppointmentsDto, currentUser: any) {
    const { slotId, patientId, symptoms, notes } = createDto;
    let finalPatientId = '';
    if (currentUser.role === Role.PATIENT) {
      finalPatientId = currentUser.userId;
    } else if (
      currentUser.role === Role.RECEPTIONIST ||
      currentUser.role === Role.ADMIN
    ) {
      if (!patientId) {
        throw new BadRequestException(
          'vui lòng cung cấp id bệnh nhân khi đặt lich hộ',
        );
      }
      finalPatientId = patientId;
    } else {
      throw new ForbiddenException('bác sĩ không có quyền đặt lịch hẹn');
    }
    const patientUser = await this.prisma.user.findUnique({
      where: { id: finalPatientId },
      include: { role: true },
    });
    if (!patientUser || patientUser.role.code != Role.PATIENT) {
      throw new NotFoundException(
        'không tìm thấy thông tin bệnh nhân hợp lệ trên hệ thống',
      );
    }
    //thực hiện trong database transaction để tránh đặt trùng lịch race condition
    return this.prisma.$transaction(async (tx) => {
      //Sử dụng SELECT FOR UPDATE để khóa dòng ghi trong bảng slots (Pessimistic Locking)
      const slots = await tx.$queryRaw<any[]>`
                        SELECT 
                            id, 
                            date, 
                            status, 
                            doctor_id as "doctorId", 
                            start_time as "startTime", 
                            end_time as "endTime", 
                            work_schedule_id as "workScheduleId", 
                            parent_slot_id as "parentSlotId",
                            is_walk_in_only as "isWalkInOnly"
                        FROM slots 
                        WHERE id = ${slotId}::uuid 
                        FOR UPDATE
                    `;

      if (!slots || slots.length === 0) {
        throw new NotFoundException('không tìm thấy slot khám theo yêu cầu');
      }
      const slot = slots[0];

      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new ConflictException(
          'khung giờ khám này đã được đặt trước hoặc bị khóa',
        );
      }

      // Check if online booking is on a walk-in only slot
      const bookingType = createDto.bookingType ||
        (currentUser.role === Role.PATIENT ? BookingType.ONLINE : BookingType.WALK_IN);

      if (bookingType === BookingType.ONLINE && slot.isWalkInOnly) {
        throw new ForbiddenException(
          'Khung giờ khám này chỉ dành riêng cho đăng ký trực tiếp tại quầy tiếp đón',
        );
      }

      // Kiểm tra xem có lịch hẹn nào đang hoạt động (PENDING hoặc CONFIRMED) liên kết với slot này không
      const activeAppointment = await tx.appointment.findFirst({
        where: {
          slotId: slot.id,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          },
        },
      });

      if (activeAppointment) {
        throw new ConflictException(
          'khung giờ khám này đã được đặt trước hoặc đang được xử lý',
        );
      }

      // Kiểm tra xem bệnh nhân đã có cuộc hẹn nào đang hoạt động trong ca làm việc (workScheduleId) này chưa
      const existingPatientAppt = await tx.appointment.findFirst({
        where: {
          patientId: finalPatientId,
          slot: {
            workScheduleId: slot.workScheduleId,
          },
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.CHECKED_IN,
              AppointmentStatus.IN_PROGRESS,
              AppointmentStatus.COMPLETED,
            ],
          },
        },
      });

      if (existingPatientAppt) {
        throw new ConflictException(
          'Bệnh nhân đã đăng ký một lịch hẹn khác trong cùng ca làm việc này của bác sĩ!',
        );
      }

      //kiểm tra slot có trong quá khứ không
      const slotDate = new Date(slot.date);
      const slotStartTime = new Date(slot.startTime);
      if (this.isSlotInPast(slotDate, slotStartTime)) {
        throw new BadRequestException(
          'không thể đặt lịch hẹn với khung giờ trong quá khứ',
        );
      }
      //tạo bản ghi cuộc hẹn (appointment)
      const appointment = await tx.appointment.create({
        data: {
          patientId: finalPatientId,
          doctorId: slot.doctorId,
          slotId: slot.id,
          symptoms: symptoms || null,
          notes: notes || null,
          status: AppointmentStatus.CONFIRMED,
          bookingType,
          isPriority: createDto.isPriority || false,
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
        },
      });
      //cập nhật trạng thái sang booked
      await tx.slot.update({
        where: { id: slotId },
        data: { status: SlotStatus.BOOKED },
      });
      return {
        message: 'đặt lịch khám thành công',
        data: appointment,
      };
    });
  }
  //nghiệp vụ chuyển trạng thái lịch hẹn -> cancelled    , slot  -> available
  async cancel(id: string, currentUser: any) {
    //tìm lịch hẹn kèm theo thông tin của slot
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!appointment) {
      throw new NotFoundException('không tìm thấy dữ liệu cuộc hẹn yêu cầu');
    }
    //chỉ cho phép hủy khi lịch hẹn ở trạng thái pending hoặc confirmed
    const allowedCancelStatus: AppointmentStatus[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
    ];
    if (!allowedCancelStatus.includes(appointment.status)) {
      throw new BadRequestException(
        `không thể hủy lịch hẹn ở trạng thái hiện tại(${appointment.status})!`,
      );
    }
    //kiểm tra quyền để hủy
    if (currentUser.role === Role.PATIENT) {
      if (appointment.patientId != currentUser.userId) {
        throw new ForbiddenException(
          'bạn không có quyền hủy lịch hẹn của người khác',
        );
      }
    } else if (currentUser.role === Role.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctorProfile || appointment.doctorId !== doctorProfile.id) {
        throw new ForbiddenException(
          'bác sĩ không có quyền hủy lịch hẹn của người khác',
        );
      }
    }
    //cập nhật đồng bộ trạng thái bằng database transaction
    return this.prisma.$transaction(async (tx) => {
      const updateAppointment = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
        include: {
          patient: {
            select: {
              fullName: true,
            },
          },
          slot: true,
        },
      });
      //giải phóng slot trả về trạng thái available
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });
      return {
        message: 'hủy lịch hẹn thành công',
        data: updateAppointment,
      };
    });
  }
  //lấy danh sách lịch hẹn khám bênh theo phân quyền và bộ lọc
  async findAll(query: QueryAppointmentsDto, currentUser: any) {
    await this.autoExpireAppointments();
    const where: any = {};
    //áp đặt phân quyền theo vai trò người dùng
    if (currentUser.role === Role.PATIENT) {
      //bệnh nhân sẽ chỉ được xem đanh sách lịch khám của mình
      where.patientId = currentUser.userId;
    } else if (currentUser.role === Role.DOCTOR) {
      //bác sĩ chỉ được xem các ca khám của chính mình
      const doctorProfile = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctorProfile) {
        throw new NotFoundException(
          'không tìm thấy hồ sơ bác sĩ trên hệ thống',
        );
      }
      where.doctorId = doctorProfile.id;
    } else {
      //admin và lễ tân có thể xem tất cả và lọc theo yêu cầu
      if (query.patientId) {
        where.patientId = query.patientId;
      }
      if (query.doctorId) {
        where.doctorId = query.doctorId;
      }
    }
    //lọc theo trạng thi lịch khám
    if (query.status) {
      where.status = query.status;
    }
    //lọc theo ngày hẹn(ánh xạ tham chiếu từ bẳng slot)
    if (query.date) {
      const parseDate = new Date(`${query.date}T00:00:00.000Z`);
      if (!isNaN(parseDate.getTime())) {
        where.slot = {
          date: parseDate,
        };
      }
    }
    //thực hiện đếm tổng và truy vấn danh sách song song
    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              birthDate: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
          queueEntry: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return {
      data: appointments,
      meta: {
        total,
      },
    };
  }
  //xem thông tin chi tiết 1 cuộc hẹn khám
  async findOne(id: string, currentUser: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            birthDate: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true,
              },
            },
            specialty: true,
          },
        },
        slot: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('không tìm tháy lịch hẹn yêu cầu');
    }
    //kiểm tra quyền xem thông tin chi tiết cuộc hẹn
    if (currentUser.role === Role.PATIENT) {
      if (appointment.patientId !== currentUser.userId) {
        throw new ForbiddenException(
          'bạn không có quyền xem chi tiết lịch hẹn này',
        );
      }
    } else if (currentUser.role === Role.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctorProfile || appointment.doctorId !== doctorProfile.id) {
        throw new ForbiddenException(
          'bạn không có quyền xem chi tiết lịch hẹn của bác sĩ khác',
        );
      }
    }
    return appointment;
  }
  //Xác nhận lịch hẹn khám (Confirm Appointment)
  //Trạng thái chuyển: PENDING -> CONFIRMED
  async confirm(id: string, currentUser: any) {
    //tìm lịch hẹn và thông tin slot đi kèm
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!appointment) {
      throw new NotFoundException(
        'không tìm thấy dữ liệu cuộc hẹn được yêu cầu',
      );
    }
    //chỉ cho phép duyệt lịch khi trạng thái lịch là PENDING
    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException(
        `chỉ có thể xác nhận lịch hẹn ở trạng thái PENDING ! trạng thái lịch hiện tại là ${appointment.status}`,
      );
    }
    //cập nhật trạng thái lịch hẹn thàng CONFIRMED
    const updateAppointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true,
              },
            },
            specialty: true,
          },
        },
        slot: true,
      },
    });
    return {
      message: 'xác nhận trạng thái lịch hẹn thành công',
      data: updateAppointment,
    };
  }
  //Đổi lịch hẹn sang khung giờ khác (Reschedule Appointment)
  //Quy trình: Giải phóng slot cũ (AVAILABLE) -> Đặt slot mới (BOOKED) -> Cập nhật cuộc hẹn
  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    currentUser: any,
  ) {
    const { newSlotId } = dto;
    //tìm lịch hẹn gốc
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!appointment) {
      throw new NotFoundException('khôn tìm thấy dữ liệu cuộc hẹn yêu cầu');
    }
    // ràng buộc chỉ cho thay đổi trạng thái lịch hẹn khi ở trạng thái PENDING, CONFIRMED hoặc NO_SHOW
    const allowedRescheduleStatus: AppointmentStatus[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.NO_SHOW,
    ];
    if (!allowedRescheduleStatus.includes(appointment.status)) {
      throw new BadRequestException(
        `không thể thay đổi lịch hẹn ở trạng thái hiện tại : ${appointment.status}`,
      );
    }
    //kiểm tra quyền hạng bệnh nhân chỉ được thay đổi lịch hẹn của chính mình
    if (currentUser.role === Role.PATIENT) {
      if (appointment.patientId !== currentUser.userId) {
        throw new ForbiddenException(
          'bạn không có quyền tha đổi lịch hẹn của người khác',
        );
      }
    }
    //kiểm tra slot mới trùng với slot hiện tại
    if (appointment.slotId === newSlotId) {
      throw new BadRequestException(
        'slot khám mới trùng lập với slot khám hiện tại',
      );
    }
    //thực hiện thay đổi trong database transaction để tránh race condition
    return this.prisma.$transaction(async (tx) => {
      //sử dụng Pessimistic Locking (SELECT FOR UPDATE) để khóa dòng slot mới
      const newSlots = await tx.$queryRaw<any[]>`SELECT id,
                     date,
                     status,
                     doctor_id as "doctorId",
                     start_time as "startTime",
                     end_time as "endTime",
                     work_schedule_id as "workScheduleId",
                     parent_slot_id as "parentSlotId",
                     is_walk_in_only as "isWalkInOnly"
                     FROM slots
                     WHERE id=${newSlotId}::uuid
                     FOR UPDATE`;
      if (!newSlots || newSlots.length === 0) {
        throw new NotFoundException(
          'không tìm thấy slot khám mới theo yêu cầu',
        );
      }
      const newSlot = newSlots[0];

      // Block online rescheduling into walk-in only slots
      if (appointment.bookingType === BookingType.ONLINE && newSlot.isWalkInOnly) {
        throw new ForbiddenException(
          'Khung giờ khám này chỉ dành riêng cho đăng ký trực tiếp tại quầy tiếp đón',
        );
      }

      //kiểm tra slot có khả dụng hay không
      if (newSlot.status !== SlotStatus.AVAILABLE) {
        throw new ConflictException(
          'slot khám mới đã được đặt trước hoặc bị khóa',
        );
      }
      // Ràng buộc 1 bệnh nhân không được đặt 2 lịch hẹn trong 1 lịch trình làm việc
      const existingPatientAppt = await tx.appointment.findFirst({
        where: {
          patientId: appointment.patientId,
          id: {
            not: appointment.id, // Loại trừ chính lịch hẹn đang được đổi
          },
          slot: {
            workScheduleId: newSlot.workScheduleId,
          },
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.CHECKED_IN,
              AppointmentStatus.IN_PROGRESS,
              AppointmentStatus.COMPLETED,
            ],
          },
        },
      });

      if (existingPatientAppt) {
        throw new ConflictException(
          'Bệnh nhân đã đăng ký một lịch hẹn khác trong cùng ca làm việc này của bác sĩ!',
        );
      }

      //kiểm tra slot mới vừa tạo có nằm trong quá khứ hay không
      const slotDate = new Date(newSlot.date);
      const slotStartTime = new Date(newSlot.startTime);
      if (this.isSlotInPast(slotDate, slotStartTime)) {
        throw new BadRequestException(
          'không thể thực hiện đổi lịch khám sang khung giờ trog quá khứ',
        );
      }
      //giải phóng slot cũ về trạng thái có thể đặt
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });
      //chiếm giữ slot mới (BOOKED)
      await tx.slot.update({
        where: { id: newSlotId },
        data: { status: SlotStatus.BOOKED },
      });
      //cập nhật thông tin cuộc hẹn
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          slotId: newSlotId, // Gán cuộc hẹn này vào một khung giờ (slot) mới
          doctorId: newSlot.doctorId, // cập nhật bác sĩ mới nếu đổi bác sĩ
          status: appointment.status === AppointmentStatus.NO_SHOW ? AppointmentStatus.CONFIRMED : appointment.status,
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
        },
      });
      return {
        message: 'đổi lịch hẹn thành công',
        data: updatedAppointment,
      };
    });
  }

  //Đánh dấu bệnh nhân vắng khám (Mark No-Show)
  //Trạng thái cuộc hẹn -> NO_SHOW. Trạng thái hàng đợi nếu có -> NO_SHOW.
  async markNoShow(id: string, currentUser: any) {
    //tìm cuộc hẹn kèm hàng đợi nếu có
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        slot: true,
        queueEntry: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('không tìm thấy dữ liệu cuộc hẹn yêu cầu');
    }
    //chỉ cho phép đánh đấu vắng khi lịch hẹn đang ở trạng thái PENDING CONFIRMED CHECKED_IN
    const allowedNoShowStatus: AppointmentStatus[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
    ];
    if (!allowedNoShowStatus.includes(appointment.status)) {
      throw new BadRequestException(
        `không thể đánh dấu vắng mặt ở trạng thái lịch hẹn hiện tại : ${appointment.status}`,
      );
    }

    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException(
          'bạn không có quyền đánh dấu vắng mặt cho cuộc hẹn của bác sĩ khác',
        );
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const slotDate = appointment.slot.date;
      const slotYear = slotDate.getUTCFullYear();
      const slotMonth = String(slotDate.getUTCMonth() + 1).padStart(2, '0');
      const slotDay = String(slotDate.getUTCDate()).padStart(2, '0');
      const slotDateStr = `${slotYear}-${slotMonth}-${slotDay}`;

      if (todayStr !== slotDateStr) {
        throw new BadRequestException(
          'Bác sĩ chỉ được phép đánh dấu vắng mặt cho lịch hẹn trong ngày hiện tại!',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      //cập nhật trạng thái cuộc hẹn thành no show
      await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.NO_SHOW },
      });

      //nếu bệnh nhân đã đến và checkin vào hàng đợi cập nhật trạng thái hàng đợi là noshow
      if (appointment.queueEntry) {
        await tx.queueEntry.update({
          where: { appointmentId: id },
          data: { status: 'NO_SHOW' as any },
        });
        // Tính toán lại thời gian chờ của hàng đợi
        await this.queuesService.recalculateWaitTimes(tx, appointment.doctorId);
      }

      const updatedAppointment = await tx.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
          queueEntry: true,
        },
      });

      //giử nguyên trạng thái slot là BOOKED vì thời gian khám đã trôi qua không thể giải phóng
      return {
        message: 'đánh dấu bệnh nhân vắng khám thành công',
        data: updatedAppointment,
      };
    });
  }
  //bệnh nhân checkin khi đến nơi
  //quy trình checkin: chuyển trạng thái status lịch hẹn sang CHECK_IN-> tạo QueueEntry mới cho hàng đợi
  async checkIn(id: string, currentUser: any) {
    //tìm cuộc hẹn slot khám và queueEntry hiện tại
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        slot: true,
        queueEntry: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException(
        'không tìm thấy dữ liệu cuộc hẹn được yêu cầu',
      );
    }
    //chỉ cho phép checkin khi cuộc hẹn ở trạng thái CONFIRMED
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        `chỉ có thể checkin với lịch hẹn ở trạng thái CONFIRMED trạng thái lịch hẹn hiện tại là ${appointment.status}`,
      );
    }

    // Kiểm tra khung giờ check-in (trước khung giờ khám và trễ nhất là 5 phút sau khi bắt đầu khung giờ khám)
    const now = new Date();
    // Chuyển sang múi giờ Việt Nam (UTC+7) để đồng bộ với giờ hẹn lưu dạng local trong DB
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const apptTime = this.getSlotFullDateTime(appointment.slot.date, appointment.slot.startTime);
    const endWindow = new Date(apptTime.getTime() + 5 * 60 * 1000);

    // Kiểm tra ngày của lịch hẹn
    const slotDateStr = appointment.slot.date.toISOString().split('T')[0];
    const year = vnTime.getUTCFullYear();
    const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnTime.getUTCDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (slotDateStr !== todayStr) {
      throw new BadRequestException(
        'Chỉ có thể thực hiện check-in vào ngày của lịch hẹn.',
      );
    }

    if (vnTime > endWindow) {
      // Đã quá giờ check-in, tự động chuyển thành Vắng mặt và giải phóng slot
      await this.prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id },
          data: { status: AppointmentStatus.NO_SHOW },
        });
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { status: SlotStatus.AVAILABLE },
        });
      });
      throw new BadRequestException(
        'Lịch hẹn đã quá thời gian check-in (trễ hơn 5 phút). Trạng thái lịch đã được chuyển thành Vắng mặt và giải phóng khung giờ khám.',
      );
    }
    //kiểm tra quyền bệnh nhân chỉ được phép checkin cho lịch hẹn của chính mình
    if (currentUser.role === Role.PATIENT) {
      if (appointment.patientId !== currentUser.userId) {
        throw new ForbiddenException(
          'bạn không có quyền checkin cho cuộc hẹn này',
        );
      }
    }
    //thực hiện transaction cập nhật trạng thái mới cho lịch hẹn
    return this.prisma.$transaction(async (tx) => {
      //cập nhật trạng thái cuộc hẹn thành checkin
      const updateAppointment = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CHECKED_IN },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
        },
      });
      // 1. Tự động cấp số thứ tự khám thông minh qua QueuesService
      const nextQueueNo = await this.queuesService.generateQueueNumber(
        tx,
        appointment.doctorId,
      );

      // 2. Tạo mới lượt xếp hàng khám (QueueEntry) với thời gian chờ tạm thời
      const queueEntry = await tx.queueEntry.create({
        data: {
          appointmentId: id,
          doctorId: appointment.doctorId,
          queueNo: nextQueueNo,
          status: QueueStatus.WAITING,
          estimatedWait: 0,
        },
      });

      // 3. Sắp xếp lại hàng đợi theo thứ tự ưu tiên và tính toán lại thời gian chờ động cho tất cả bệnh nhân
      await this.queuesService.recalculateWaitTimes(tx, appointment.doctorId);

      // Lấy lại bản ghi QueueEntry sau khi đã cập nhật estimatedWait để trả về chính xác
      const updatedQueueEntry = await tx.queueEntry.findUnique({
        where: { id: queueEntry.id },
      });

      return {
        message: 'thực hiện checkin thành công và đã xếp hàng khám',
        data: {
          appointment: updateAppointment,
          queueEntry: updatedQueueEntry,
        },
      };
    });
  }

  // bác sĩ bắt đầu khám cho bệnh nhân
  async startExamination(id: string, currentUser: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        slot: true,
        queueEntry: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('không tìm thấy dữ liệu cuộc hẹn yêu cầu');
    }

    if (appointment.status !== AppointmentStatus.CHECKED_IN) {
      throw new BadRequestException(
        `chỉ có thể bắt đầu khám với lịch hẹn ở trạng thái CHECKED_IN, trạng thái hiện tại là ${appointment.status}`,
      );
    }

    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException(
          'bạn không có quyền bắt đầu khám cho cuộc hẹn của bác sĩ khác',
        );
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const slotDate = appointment.slot.date;
      const slotYear = slotDate.getUTCFullYear();
      const slotMonth = String(slotDate.getUTCMonth() + 1).padStart(2, '0');
      const slotDay = String(slotDate.getUTCDate()).padStart(2, '0');
      const slotDateStr = `${slotYear}-${slotMonth}-${slotDay}`;

      if (todayStr !== slotDateStr) {
        throw new BadRequestException(
          'Bác sĩ chỉ được phép bắt đầu khám cho lịch hẹn trong ngày hiện tại!',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Tự động đóng các ca khám khác đang kẹt ở trạng thái IN_PROGRESS của bác sĩ này
      const activeTodayStart = new Date();
      activeTodayStart.setHours(0, 0, 0, 0);
      const activeTodayEnd = new Date();
      activeTodayEnd.setHours(23, 59, 59, 999);

      const currentActiveEntries = await tx.queueEntry.findMany({
        where: {
          doctorId: appointment.doctorId,
          status: QueueStatus.IN_PROGRESS,
          appointmentId: { not: id },
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

      // cập nhật trạng thái lịch hẹn thành IN_PROGRESS
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.IN_PROGRESS },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
        },
      });

      // cập nhật trạng thái hàng đợi khám thành IN_PROGRESS
      let updatedQueueEntry: QueueEntry | null = null;
      if (appointment.queueEntry) {
        updatedQueueEntry = await tx.queueEntry.update({
          where: { appointmentId: id },
          data: {
            status: QueueStatus.IN_PROGRESS,
            startedAt: now,
            calledAt: appointment.queueEntry.calledAt ? undefined : now,
          },
        });
      }

      // tính lại thời gian chờ của hàng đợi
      await this.queuesService.recalculateWaitTimes(tx, appointment.doctorId);

      return {
        message: 'bắt đầu khám bệnh thành công',
        data: {
          appointment: updatedAppointment,
          queueEntry: updatedQueueEntry,
        },
      };
    });
  }

  // bác sĩ hoàn thành khám bệnh và lưu hồ sơ bệnh án
  async completeExamination(
    id: string,
    completeDto: CompleteExaminationDto,
    currentUser: any,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        slot: true,
        queueEntry: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('không tìm thấy dữ liệu cuộc hẹn yêu cầu');
    }

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `chỉ có thể hoàn thành khám với lịch hẹn ở trạng thái IN_PROGRESS, trạng thái hiện tại là ${appointment.status}`,
      );
    }

    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException(
          'bạn không có quyền hoàn thành khám cho cuộc hẹn của bác sĩ khác',
        );
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const slotDate = appointment.slot.date;
      const slotYear = slotDate.getUTCFullYear();
      const slotMonth = String(slotDate.getUTCMonth() + 1).padStart(2, '0');
      const slotDay = String(slotDate.getUTCDate()).padStart(2, '0');
      const slotDateStr = `${slotYear}-${slotMonth}-${slotDay}`;

      if (todayStr !== slotDateStr) {
        throw new BadRequestException(
          'Bác sĩ chỉ được phép hoàn thành khám cho lịch hẹn trong ngày hiện tại!',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // cập nhật trạng thái lịch hẹn thành COMPLETED
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.COMPLETED },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
              specialty: true,
            },
          },
          slot: true,
        },
      });

      // cập nhật trạng thái hàng đợi khám thành DONE
      let updatedQueueEntry: QueueEntry | null = null;
      if (appointment.queueEntry) {
        updatedQueueEntry = await tx.queueEntry.update({
          where: { appointmentId: id },
          data: {
            status: QueueStatus.DONE,
            completedAt: now,
          },
        });
      }

      // tạo hồ sơ bệnh án MedicalRecord
      const medicalRecord = await tx.medicalRecord.create({
        data: {
          appointmentId: id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          diagnosis: completeDto.diagnosis,
          treatment: completeDto.treatment,
          prescription: completeDto.prescription || null,
          notes: completeDto.notes || null,
          followUpDate: completeDto.followUpDate
            ? new Date(completeDto.followUpDate)
            : null,
        },
      });

      // tính lại thời gian chờ của hàng đợi
      await this.queuesService.recalculateWaitTimes(tx, appointment.doctorId);

      return {
        message: 'hoàn thành khám bệnh và lập hồ sơ bệnh án thành công',
        data: {
          appointment: updatedAppointment,
          queueEntry: updatedQueueEntry,
          medicalRecord,
        },
      };
    });
  }
}
