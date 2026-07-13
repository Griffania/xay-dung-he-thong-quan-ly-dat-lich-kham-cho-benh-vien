import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { QueryMedicalRecordDto } from './dto/query-medical-record.dto';

@Controller('medical-records')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}
  // Tạo hồ sơ bệnh án mới
  //Chỉ cho phép Bác sĩ (DOCTOR) và Quản trị viên (ADMIN)
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.DOCTOR, Role.ADMIN)
  create(@Body() createDto: CreateMedicalRecordDto, @Req() req: any) {
    return this.medicalRecordsService.create(createDto, req.user);
  }

  //Chỉnh sửa thông tin hồ sơ bệnh án
  // Chỉ cho phép Bác sĩ (DOCTOR) và Quản trị viên (ADMIN)
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.DOCTOR, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMedicalRecordDto,
    @Req() req: any,
  ) {
    return this.medicalRecordsService.update(id, updateDto, req.user);
  }

  // Xem lịch sử hồ sơ bệnh án của một bệnh nhân
  //Cho phép tất cả vai trò đăng nhập (PATIENT tự check xem chính mình, DOCTOR/RECEPTIONIST/ADMIN xem bất kỳ)
  @Get('patient/:patientId')
  getPatientHistory(
    @Param('patientId') patientId: string,
    @Query() query: QueryMedicalRecordDto,
    @Req() req: any,
  ) {
    return this.medicalRecordsService.getPatientHistory(
      patientId,
      req.user,
      query,
    );
  }
}
