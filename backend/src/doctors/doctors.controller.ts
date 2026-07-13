import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { AssignSpecialtyDto } from './dto/assign-specialty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { query } from 'winston';

/**
 * Controller Quản lý Bác sĩ (Doctor Management)
 *
 * Bảo vệ toàn cục:
 * 1. `JwtAuthGuard`: Xác minh JWT Access Token của người dùng.
 * 2. `RolesGuard`: Áp dụng phân quyền RBAC (Role-Based Access Control) trên từng api.
 */
@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.doctorsService.findAll({
      search,
      specialtyId,
      isActive,
    });
  }

  @Get('me/appointments/today')
  @Roles(Role.DOCTOR)
  getTodayAppointments(@Req() req: any, @Query('date') date?: string) {
    return this.doctorsService.getTodayAppointments(req.user, date);
  }

  @Get('me/queue')
  @Roles(Role.DOCTOR)
  getDoctorQueue(@Req() req: any, @Query('date') date?: string) {
    return this.doctorsService.getDoctorQueue(req.user, date);
  }

  @Get('patients/:id')
  @Roles(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN)
  getPatientDetail(@Param('id') id: string) {
    return this.doctorsService.getPatientDetail(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDoctorDto);
  }

  @Patch(':id/assign-specialty')
  @Roles(Role.ADMIN)
  assignSpecialty(
    @Param('id') id: string,
    @Body() assignSpecialtyDto: AssignSpecialtyDto,
  ) {
    return this.doctorsService.assignSpecialty(
      id,
      assignSpecialtyDto.specialtyId,
    );
  }

  @Post(':id/disable')
  @Roles(Role.ADMIN)
  disable(@Param('id') id: string) {
    return this.doctorsService.disable(id);
  }

  @Post(':id/enable')
  @Roles(Role.ADMIN)
  enable(@Param('id') id: string) {
    return this.doctorsService.enable(id);
  }

  @Get(':id/chedules')
  getDoctorSchedules(
    @Param('id') id: string,
    @Req() req: any,
    @Query('workDate') workDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.doctorsService.findDoctorSchedules(id, req.user, {
      workDate,
      page,
      limit,
    });
  }

  @Get(':id/slots/available')
  getAvailableSlots(@Param('id') id: string, @Query('date') date: string) {
    return this.doctorsService.findAvailableSlots(id, date);
  }
}
