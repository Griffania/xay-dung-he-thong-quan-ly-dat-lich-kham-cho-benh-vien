import { Body, Controller, Get, Post, Query, Req, UseGuards, Param, Patch } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppointmentsService } from "./appointments.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { CreateAppointmentsDto } from "./dto/create-appointments.dto";
import { QueryAppointmentsDto } from "./dto/query.appointments.dto";

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
  //lấy danh sách lịch hẹn có phân trang và bộ lọc bảo mật
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
}
