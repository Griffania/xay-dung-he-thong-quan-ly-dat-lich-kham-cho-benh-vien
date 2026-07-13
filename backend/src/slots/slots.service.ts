import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlotStatus } from '@prisma/client';
import { QueryAvailableSlotsDto } from './dto/query-available-slots.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  //Truy vấn danh sách khung giờ khám (Slot) khả dụng của bác sĩ trong một ngày cụ thể
  async getAvailableSlots(query: QueryAvailableSlotsDto) {
    const { doctorId, date: dateStr } = query;

    const parsedDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Ngày truy vấn không hợp lệ!');
    }

    const whereClause: any = {
      doctorId,
      date: parsedDate,
      status: SlotStatus.AVAILABLE,
    };

    // Nếu ngày truy vấn là hôm nay, chỉ lấy các slot có giờ bắt đầu lớn hơn giờ hiện tại (local time)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (dateStr === todayStr) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentTimeOfDay = new Date(
        `1970-01-01T${hours}:${minutes}:${seconds}.000Z`,
      );

      whereClause.startTime = {
        gt: currentTimeOfDay,
      };
    }

    return this.prisma.slot.findMany({
      where: whereClause,
      orderBy: { startTime: 'asc' },
    });
  }

  //Khóa thủ công một slot thời gian (ví dụ bác sĩ có việc đột xuất)

  async lockSlot(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Không tìm thấy slot khám yêu cầu!');
    }

    if (slot.status === SlotStatus.BOOKED) {
      throw new ConflictException(
        'Không thể khóa slot này vì đã được bệnh nhân đặt lịch hẹn khám!',
      );
    }

    return this.prisma.slot.update({
      where: { id },
      data: { status: SlotStatus.LOCKED },
    });
  }

  //Mở khóa lại slot đã bị khóa thủ công
  async unlockSlot(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Không tìm thấy slot khám yêu cầu!');
    }

    if (slot.status !== SlotStatus.LOCKED) {
      throw new BadRequestException(
        'Slot này hiện không ở trạng thái bị khóa!',
      );
    }

    return this.prisma.slot.update({
      where: { id },
      data: { status: SlotStatus.AVAILABLE },
    });
  }

  /**
   * Logic tách slot thông minh (Smart Slot Splitting)
   * Sinh ra slot con khả dụng từ khoảng thời gian còn dư khi bác sĩ hoàn thành khám sớm.
   * @param slotId ID của slot hiện tại đang khám (trạng thái BOOKED)
   * @param completedAt Thời điểm bác sĩ kết thúc ca khám thực tế
   * @param minRemainingMin Thời lượng tối thiểu (phút) của slot con mới được sinh ra
   */
  async splitSlot(slotId: string, completedAt: Date, minRemainingMin = 10) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Không tìm thấy slot khám yêu cầu!');
    }

    if (slot.status !== SlotStatus.BOOKED) {
      throw new BadRequestException(
        'Slot cần tách phải ở trạng thái đã đặt (BOOKED)!',
      );
    }

    // Chuyển đổi completedAt thành mốc giờ ngày 1970-01-01 UTC để so sánh
    const hours = String(completedAt.getUTCHours()).padStart(2, '0');
    const minutes = String(completedAt.getUTCMinutes()).padStart(2, '0');
    const seconds = String(completedAt.getUTCSeconds()).padStart(2, '0');
    const completedTimeOfDay = new Date(
      `1970-01-01T${hours}:${minutes}:${seconds}.000Z`,
    );

    const slotEndTimeMs = slot.endTime.getTime();
    const completedTimeMs = completedTimeOfDay.getTime();

    // Kiểm tra xem thời gian hoàn thành thực tế có trước giờ kết thúc dự kiến không
    if (completedTimeMs >= slotEndTimeMs) {
      return {
        message:
          'Ca khám hoàn thành đúng hoặc muộn hơn giờ hẹn. Không cần tách slot.',
        splitCreated: false,
      };
    }

    // Tính toán thời gian còn lại (phút)
    const remainingMs = slotEndTimeMs - completedTimeMs;
    const remainingMin = remainingMs / (60 * 1000); // Đổi từ miligiây sang phút

    if (remainingMin < minRemainingMin) {
      return {
        message: `Thời gian còn lại (${Math.round(remainingMin)} phút) nhỏ hơn thời lượng tối thiểu (${minRemainingMin} phút). Không đủ điều kiện tách slot.`,
        splitCreated: false,
      };
    }

    // Tạo slot con khả dụng từ khoảng thời gian còn dư
    const childSlot = await this.prisma.slot.create({
      data: {
        workScheduleId: slot.workScheduleId,
        doctorId: slot.doctorId,
        date: slot.date,
        startTime: completedTimeOfDay, // Bắt đầu ngay từ lúc bác sĩ vừa khám xong ca trước
        endTime: slot.endTime, // Kết thúc tại đúng giờ kết thúc ban đầu của ca trước
        status: SlotStatus.AVAILABLE, // Trạng thái Trống để người khác đặt
        parentSlotId: slot.id, // Lưu lại ID của slot cha để sau này biết slot này do đâu mà ra
      },
    });

    return {
      message: 'Tách slot con thành công từ thời gian còn dư',
      splitCreated: true,
      data: childSlot,
    };
  }
}
