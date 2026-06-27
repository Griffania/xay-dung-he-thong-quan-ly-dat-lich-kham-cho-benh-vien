import { Body, Controller, Get, Post, Query, Req, UseGuards, Param, Patch} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppointmentsService } from "./appointments.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { CreateAppointmentsDto } from "./dto/create-appointments.dto";
import { QueryAppointmentsDto } from "./dto/query.appointments.dto";
import { RescheduleAppointmentDto } from "./dto/reschedule-appointment.dto";

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController{
    constructor(private readonly appointmentsService: AppointmentsService){}
     /**
   * Đặt lịch hẹn khám bệnh mới
   * Chỉ cho phép PATIENT, RECEPTIONIST, ADMIN thực hiện đặt
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN)
  create(@Body()createDto:CreateAppointmentsDto,@Req() req:any){
    return this.appointmentsService.create(createDto,req.user);
  }
  //lấy danh sách lịch hẹn 
  @Get()
  findAll(@Query() queryDto: QueryAppointmentsDto, @Req() req: any) {
    return this.appointmentsService.findAll(queryDto, req.user);
  }
  //xem chi tiết một lịch hẹn khám
  @Get(':id')
  findOne(@Param('id')id:string,@Req()req:any){
    return this.appointmentsService.findOne(id,req.user);
  }
  //hủy lịch hẹn khám 
  @Patch(':id/cancel')
  cancel(@Param('id')id:string,@Req()req:any){
    return this.appointmentsService.cancel(id,req.user);
  }
  // Xác nhận lịch hẹn khám (Chỉ cho phép RECEPTIONIST, ADMIN)
  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.confirm(id, req.user);
  }
  // Đổi lịch hẹn khám (Cho phép PATIENT, RECEPTIONIST, ADMIN)
  @Patch(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN)
  reschedule(
    @Param('id') id: string,
    @Body() rescheduleDto: RescheduleAppointmentDto,
    @Req() req: any,
  ) {
    return this.appointmentsService.reschedule(id, rescheduleDto, req.user);
  }
  // Đánh dấu vắng khám (Cho phép RECEPTIONIST, DOCTOR, ADMIN)
  @Patch(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles(Role.RECEPTIONIST, Role.DOCTOR, Role.ADMIN)
  markNoShow(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.markNoShow(id, req.user);
  }
  //api checkin cho bệnh nhân (bệnh nhân tự checkin hoặc là lễ tân và admin checkin giúp bệnh nhân)
  @Patch(':id/check-in')
  @UseGuards(RolesGuard)
  @Roles(Role.PATIENT,Role.RECEPTIONIST,Role.ADMIN)
  checkIn(@Param('id')id:string,@Req()req:any){
    return this.appointmentsService.checkIn(id,req.user);
  }
}
