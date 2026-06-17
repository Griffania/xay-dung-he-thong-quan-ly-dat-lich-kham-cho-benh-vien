import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkSchedulesService } from './work-schedules.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

/**
 * Controller Quản lý Lịch làm việc Bác sĩ (WorkSchedules Management)
 *
 * Bảo vệ toàn cục:
 * 1. `JwtAuthGuard`: Xác minh JWT Access Token
 * 2. `RolesGuard`: Ràng buộc phân quyền dựa trên vai trò người dùng (RBAC)
 */
@Controller('work-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  /**
   * Tạo lịch làm việc mới và tự động sinh các slot khám
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createWorkScheduleDto: CreateWorkScheduleDto) {
    return this.workSchedulesService.create(createWorkScheduleDto);
  }

  /**
   * Truy vấn danh sách lịch làm việc có bộ lọc và phân trang
   * Quyền truy cập: Mọi tài khoản đã đăng nhập
   * Lưu ý phân quyền ngầm định: Bác sĩ (DOCTOR) chỉ có thể xem lịch trình của chính mình.
   */
  @Get()
  findAll(
    @Req() req: any,
    @Query('doctorId') doctorId?: string,
    @Query('workDate') workDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workSchedulesService.findAll(req.user, {
      doctorId,
      workDate,
      page,
      limit,
    });
  }
  /**
   * Lấy chi tiết một lịch làm việc kèm danh sách slot cụ thể
   * Quyền truy cập: Mọi tài khoản đã đăng nhập
   * Lưu ý phân quyền ngầm định: Bác sĩ (DOCTOR) chỉ xem được chi tiết của chính mình.
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.workSchedulesService.findOne(id, req.user);
  }
  /**
   * Cập nhật thông tin lịch làm việc và tạo lại các slot tương ứng
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateWorkScheduleDto: UpdateWorkScheduleDto,
  ) {
    return this.workSchedulesService.update(id, updateWorkScheduleDto);
  }
  /**
   * Xóa lịch làm việc và toàn bộ các slot tương ứng
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.workSchedulesService.delete(id);
  }
}
