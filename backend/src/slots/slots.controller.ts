import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Query,
  UseGuards,
  Body,
  Req,
} from '@nestjs/common';
import { SlotsService } from './slots.service';
import { QueryAvailableSlotsDto } from './dto/query-available-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  // Truy vấn danh sách khung giờ còn trống (khả dụng) của bác sĩ theo ngày
  // Yêu cầu: Đã đăng nhập
  @Get('available')
  @UseGuards(JwtAuthGuard)
  getAvailableSlots(@Query() query: QueryAvailableSlotsDto) {
    return this.slotsService.getAvailableSlots(query);
  }

  //Khóa thủ công một slot khám
  //Quyền truy cập: ADMIN hoặc DOCTOR
  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOCTOR)
  lockSlot(@Param('id') id: string, @Req() req: any) {
    return this.slotsService.lockSlot(id, req.user);
  }

  // Mở khóa lại slot đã bị khóa thủ công
  // Quyền truy cập: ADMIN hoặc DOCTOR
  @Patch(':id/unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOCTOR)
  unlockSlot(@Param('id') id: string, @Req() req: any) {
    return this.slotsService.unlockSlot(id, req.user);
  }

  //Kích hoạt thủ công chức năng tách slot hoặc tự động kích hoạt khi bác sĩ kết thúc sớm
  // Quyền truy cập: ADMIN hoặc DOCTOR
  @Post(':id/split')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOCTOR)
  splitSlot(
    @Param('id') id: string,
    @Req() req: any,
    @Body('completedAt') completedAtStr?: string,
  ) {
    const completedAt = completedAtStr ? new Date(completedAtStr) : new Date();
    return this.slotsService.splitSlot(id, completedAt, req.user);
  }
}
