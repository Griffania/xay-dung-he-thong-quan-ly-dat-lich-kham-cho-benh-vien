import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { SlotsService } from './slots.service';
import { QueryAvailableSlotsDto } from './dto/query-available-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

/**
 * Controller Quản lý Khung giờ khám (Slots Management)
 */
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  /**
   * Truy vấn danh sách khung giờ còn trống (khả dụng) của bác sĩ theo ngày
   * Yêu cầu: Đã đăng nhập
   */
  @Get('available')
  @UseGuards(JwtAuthGuard)
  getAvailableSlots(@Query() query: QueryAvailableSlotsDto) {
    return this.slotsService.getAvailableSlots(query);
  }

  /**
   * Khóa thủ công một slot khám
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  lockSlot(@Param('id') id: string) {
    return this.slotsService.lockSlot(id);
  }

  /**
   * Mở khóa lại slot đã bị khóa thủ công
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Patch(':id/unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  unlockSlot(@Param('id') id: string) {
    return this.slotsService.unlockSlot(id);
  }

  /**
   * Kích hoạt thủ công chức năng tách slot (để thử nghiệm hoặc xử lý lỗi)
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/split')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  splitSlot(
    @Param('id') id: string,
    @Body('completedAt') completedAtStr?: string,
  ) {
    const completedAt = completedAtStr ? new Date(completedAtStr) : new Date();
    return this.slotsService.splitSlot(id, completedAt);
  }
}
