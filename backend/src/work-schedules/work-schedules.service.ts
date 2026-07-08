import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { Role } from '../auth/enums/role.enum';
import { SlotStatus } from '@prisma/client';

@Injectable()
export class WorkSchedulesService {
  constructor(private readonly prisma: PrismaService) {}
  // Chuyển đổi chuỗi ngày YYYY-MM-DD thành đối tượng Date ở UTC 00:00:00
  private parseDate(dateStr: string): Date {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        'Ngày làm việc không hợp lệ! Định dạng yêu cầu là YYYY-MM-DD.',
      );
    }
    return date;
  }
  // Chuyển đổi chuỗi giờ HH:mm hoặc HH:mm:ss thành đối tượng Date với mốc ngày cố định 1970-01-01 UTC
   
  private parseTime(timeStr: string): Date {
    let formattedTime = timeStr;
    if (timeStr.length === 5) {
      formattedTime = `${timeStr}:00`;
    }
    const date = new Date(`1970-01-01T${formattedTime}.000Z`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        'Giờ làm việc không đúng định dạng HH:mm hoặc HH:mm:ss!',
      );
    }
    return date;
  }
  // Tạo lịch làm việc mới cho Bác sĩ (chỉ ADMIN có quyền)
   
  async create(createWorkScheduleDto: CreateWorkScheduleDto) {
    const {
      doctorId,
      workDate: workDateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      slotDurationMin = 30,
    } = createWorkScheduleDto;
    // Kiểm tra sự tồn tại của Bác sĩ
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ được chỉ định!');
    }
    // Parse và chuẩn hóa ngày/giờ
    const workDate = this.parseDate(workDateStr);
    const startTime = this.parseTime(startTimeStr);
    const endTime = this.parseTime(endTimeStr);
    const startTimeMs = startTime.getTime();
    const endTimeMs = endTime.getTime();
    // Validation phạm vi thời gian
    if (startTimeMs >= endTimeMs) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!',
      );
    }
    const durationMs = endTimeMs - startTimeMs;
    const slotDurationMs = slotDurationMin * 60 * 1000;
    if (durationMs < slotDurationMs) {
      throw new BadRequestException(
        `Tổng thời gian làm việc phải lớn hơn hoặc bằng thời lượng một slot khám (${slotDurationMin} phút)!`,
      );
    }
    //Kiểm tra trùng lặp lịch làm việc (Overlap validation)
    const existingOverlap = await this.prisma.workSchedule.findFirst({
      where: {
        doctorId,
        workDate,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });
    if (existingOverlap) {
      const isDuplicate =
        existingOverlap.startTime.getTime() === startTime.getTime() &&
        existingOverlap.endTime.getTime() === endTime.getTime();

      if (isDuplicate) {
        throw new ConflictException(
          'Bác sĩ đã có lịch làm việc trùng khớp hoàn toàn thời gian bắt đầu và kết thúc trong ngày này!',
        );
      }
      throw new ConflictException(
        'Bác sĩ đã có một ca làm việc khác trùng lặp thời gian (Schedule Collision) trong ngày này!',
      );
    }
    //Khởi chạy transaction tạo lịch trình và tự động chia nhỏ thành các Slot khám
    const result = await this.prisma.$transaction(async (tx) => {
      // Tạo WorkSchedule
      const schedule = await tx.workSchedule.create({
        data: {
          doctorId,
          workDate,
          startTime,
          endTime,
          slotDurationMin,
        },
      });
      //Tính toán và tạo các Slot khám
      const slotsData: any[] = [];
      for (
        let t = startTimeMs;
        t + slotDurationMs <= endTimeMs;
        t += slotDurationMs
      ) {
        slotsData.push({
          workScheduleId: schedule.id,
          doctorId,
          date: workDate,
          startTime: new Date(t),
          endTime: new Date(t + slotDurationMs),
          status: SlotStatus.AVAILABLE,
        });
      }
      if (slotsData.length > 0) {
        await tx.slot.createMany({
          data: slotsData,
        });
      }
      return schedule;
    });
    return {
      message: 'Tạo lịch làm việc và các slot khám thành công',
      data: await this.findOne(result.id, { role: Role.ADMIN }), // Trả về kèm chi tiết slot
    };
  }
  // Truy vấn danh sách lịch làm việc có bộ lọc và phân trang
  async findAll(
    user: any,
    query: {
      doctorId?: string;
      workDate?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    let targetDoctorId = query.doctorId;

    // Phân quyền: Nếu là DOCTOR thì chỉ được xem lịch của chính mình
    if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: user.userId },
      });
      if (!doctor) {
        throw new NotFoundException(
          'Không tìm thấy hồ sơ bác sĩ liên kết với tài khoản của bạn!',
        );
      }

      if (targetDoctorId && targetDoctorId !== doctor.id) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền xem lịch trình của chính mình!',
        );
      }
      targetDoctorId = doctor.id;
    }

    const where: any = {};
    if (targetDoctorId) {
      where.doctorId = targetDoctorId;
    }
    if (query.workDate) {
      where.workDate = this.parseDate(query.workDate);
    }

    const [schedules, total] = await Promise.all([
      this.prisma.workSchedule.findMany({
        where,
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
              specialty: {
                select: {
                  name: true,
                },
              },
            },
          },
          slots: {
            orderBy: { startTime: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: [{ workDate: 'desc' }, { startTime: 'asc' }],
      }),
      this.prisma.workSchedule.count({ where }),
    ]);

    return {
      data: schedules,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  // Lấy chi tiết lịch làm việc theo ID
   
  async findOne(id: string, user: any) {
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                phone: true,
              },
            },
            specialty: {
              select: {
                name: true,
              },
            },
          },
        },
        slots: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch làm việc yêu cầu!');
    }

    // Phân quyền: Nếu là DOCTOR thì chỉ được xem lịch của chính mình
    if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: user.userId },
      });
      if (!doctor || schedule.doctorId !== doctor.id) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền xem lịch trình của chính mình!',
        );
      }
    }

    return schedule;
  }
  // Cập nhật thông tin lịch làm việc và làm mới các slot (chỉ ADMIN có quyền)
   
  async update(id: string, updateWorkScheduleDto: UpdateWorkScheduleDto) {
    // 1. Kiểm tra sự tồn tại của ca làm việc
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch làm việc để cập nhật!');
    }
    // 2. Kiểm tra nếu có bất kỳ slot nào của ca này đã được Đặt (BOOKED) thì KHÔNG được sửa
    const bookedSlot = await this.prisma.slot.findFirst({
      where: {
        workScheduleId: id,
        status: SlotStatus.BOOKED,
      },
    });
    if (bookedSlot) {
      throw new ConflictException(
        'Không thể cập nhật lịch làm việc này vì đã có bệnh nhân đặt hẹn khám!',
      );
    }
    // 3. Chuẩn bị thông tin cập nhật (gộp với dữ liệu cũ nếu để trống)
    const doctorId = updateWorkScheduleDto.doctorId ?? schedule.doctorId;
    const workDate = updateWorkScheduleDto.workDate
      ? this.parseDate(updateWorkScheduleDto.workDate)
      : schedule.workDate;
    // Đảm bảo lấy đúng mốc giờ khi parse
    const startTime = updateWorkScheduleDto.startTime
      ? this.parseTime(updateWorkScheduleDto.startTime)
      : schedule.startTime;
    const endTime = updateWorkScheduleDto.endTime
      ? this.parseTime(updateWorkScheduleDto.endTime)
      : schedule.endTime;
    const slotDurationMin =
      updateWorkScheduleDto.slotDurationMin ?? schedule.slotDurationMin;
    const startTimeMs = startTime.getTime();
    const endTimeMs = endTime.getTime();
    // 4. Validate thời gian
    if (startTimeMs >= endTimeMs) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!',
      );
    }
    const durationMs = endTimeMs - startTimeMs;
    const slotDurationMs = slotDurationMin * 60 * 1000;
    if (durationMs < slotDurationMs) {
      throw new BadRequestException(
        `Tổng thời gian làm việc phải lớn hơn hoặc bằng thời lượng một slot khám (${slotDurationMin} phút)!`,
      );
    }
    // 5. Kiểm tra trùng lặp lịch làm việc (loại trừ chính nó)
    const existingOverlap = await this.prisma.workSchedule.findFirst({
      where: {
        doctorId,
        workDate,
        id: { not: id },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });
    if (existingOverlap) {
      const isDuplicate =
        existingOverlap.startTime.getTime() === startTime.getTime() &&
        existingOverlap.endTime.getTime() === endTime.getTime();

      if (isDuplicate) {
        throw new ConflictException(
          'Bác sĩ đã có lịch làm việc trùng khớp hoàn toàn thời gian bắt đầu và kết thúc trong ngày này!',
        );
      }
      throw new ConflictException(
        'Lịch làm việc cập nhật bị trùng lặp thời gian với ca làm việc khác của bác sĩ!',
      );
    }
    // 6. Thực thi cập nhật trong Database Transaction
    await this.prisma.$transaction(async (tx) => {
      // 6a. Xóa các slot cũ liên quan (vì chưa có slot nào bị BOOKED)
      await tx.slot.deleteMany({
        where: { workScheduleId: id },
      });
      // 6b. Cập nhật thông tin ca làm việc
      await tx.workSchedule.update({
        where: { id },
        data: {
          doctorId,
          workDate,
          startTime,
          endTime,
          slotDurationMin,
        },
      });
      // 6c. Sinh lại danh sách slot khám mới
      const slotsData: any[] = [];
      for (
        let t = startTimeMs;
        t + slotDurationMs <= endTimeMs;
        t += slotDurationMs
      ) {
        slotsData.push({
          workScheduleId: id,
          doctorId,
          date: workDate,
          startTime: new Date(t),
          endTime: new Date(t + slotDurationMs),
          status: SlotStatus.AVAILABLE,
        });
      }
      if (slotsData.length > 0) {
        await tx.slot.createMany({
          data: slotsData,
        });
      }
    });
    return {
      message: 'Cập nhật lịch làm việc và làm mới các slot khám thành công',
      data: await this.findOne(id, { role: Role.ADMIN }),
    };
  }
  // Xóa lịch làm việc (chỉ ADMIN có quyền)
  
  async delete(id: string) {
    // 1. Kiểm tra tồn tại
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch làm việc để xóa!');
    }
    // 2. Chặn nếu có slot đã bị đặt lịch hẹn
    const bookedSlot = await this.prisma.slot.findFirst({
      where: {
        workScheduleId: id,
        status: SlotStatus.BOOKED,
      },
    });
    if (bookedSlot) {
      throw new ConflictException(
        'Không thể xóa lịch làm việc này vì đã có bệnh nhân đặt hẹn khám!',
      );
    }
    // 3. Tiến hành xóa (Prisma schema onDelete: Cascade sẽ tự động xóa các Slot tương ứng)
    await this.prisma.workSchedule.delete({
      where: { id },
    });
    return {
      message: 'Xóa lịch làm việc thành công',
    };
  }
}
