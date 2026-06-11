import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { AssignSpecialtyDto } from './dto/assign-specialty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
  /**
   * Tạo tài khoản và hồ sơ Bác sĩ mới
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }
  /**
   * Truy vấn danh sách bác sĩ trong hệ thống
   * Quyền truy cập: Mọi tài khoản đã đăng nhập (Patient, Doctor, Receptionist, Admin)
   */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.doctorsService.findAll({
      search,
      specialtyId,
      isActive,
      page,
      limit,
    });
  }
  /**
   * Lấy chi tiết thông tin một bác sĩ theo ID
   * Quyền truy cập: Mọi tài khoản đã đăng nhập
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }
  /**
   * Cập nhật thông tin tài khoản hoặc chuyên môn bác sĩ
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDoctorDto: UpdateDoctorDto,
  ) {
    return this.doctorsService.update(id, updateDoctorDto);
  }
  /**
   * API chuyên biệt gán hoặc đổi chuyên khoa cho bác sĩ
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Patch(':id/assign-specialty')
  @Roles(Role.ADMIN)
  assignSpecialty(
    @Param('id') id: string,
    @Body() assignSpecialtyDto: AssignSpecialtyDto,
  ) {
    return this.doctorsService.assignSpecialty(id, assignSpecialtyDto.specialtyId);
  }
  /**
   * Vô hiệu hóa hoạt động của bác sĩ
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/disable')
  @Roles(Role.ADMIN)
  disable(@Param('id') id: string) {
    return this.doctorsService.disable(id);
  }
  /**
   * Kích hoạt lại hoạt động của bác sĩ
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/enable')
  @Roles(Role.ADMIN)
  enable(@Param('id') id: string) {
    return this.doctorsService.enable(id);
  }
}
