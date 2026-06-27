import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { QueuesService } from './queues.service';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateQueueStatusDto } from './dto/update-status.dto';

@Controller('queues')
@UseGuards(JwtAuthGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  
   //Check-in cuộc hẹn để đưa vào hàng đợi
   // Quyền truy cập: PATIENT, RECEPTIONIST, ADMIN
   
  @Post('check-in')
  @UseGuards(RolesGuard)
  @Roles(Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN)
  async checkIn(@Body() checkInDto: CheckInDto, @Req() req: any) {
    return this.queuesService.checkIn(checkInDto.appointmentId, req.user);
  }

  
    //Giám sát hàng đợi phòng khám hôm nay hoặc theo ngày cụ thể
   // Quyền truy cập: Tất cả các vai trò đã đăng nhập
   
  @Get('monitor')
  async getQueueMonitor(
    @Query('doctorId') doctorId?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('date') date?: string,
  ) {
    return this.queuesService.getQueueMonitor({ doctorId, specialtyId, date });
  }

  
   // Cập nhật trạng thái lượt khám trong hàng đợi (Ví dụ: Gọi khám -> Bắt đầu khám -> Khám xong)
   //Quyền truy cập: DOCTOR, RECEPTIONIST, ADMIN
   
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateQueueStatusDto,
    @Req() req: any,
  ) {
    return this.queuesService.updateQueueStatus(id, updateStatusDto.status, req.user);
  }
}
