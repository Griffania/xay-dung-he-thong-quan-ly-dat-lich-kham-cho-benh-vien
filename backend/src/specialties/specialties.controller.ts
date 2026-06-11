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
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
/**
 * Controller Quản lý Danh mục Chuyên khoa (Specialties Management)
 * 
 * Bảo vệ toàn cục:
 * 1. `JwtAuthGuard`: Xác minh JWT Access Token
 * 2. `RolesGuard`: Ràng buộc phân quyền dựa trên vai trò của người dùng
 */
@Controller('specialties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}
  /**
   * Tạo chuyên khoa mới
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createSpecialtyDto: CreateSpecialtyDto) {
    return this.specialtiesService.create(createSpecialtyDto);
  }
  /**
   * Truy vấn danh sách chuyên khoa
   * Quyền truy cập: Mọi tài khoản đã đăng nhập (Patient, Doctor, Receptionist, Admin)
   */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.specialtiesService.findAll({ search, isActive, page, limit });
  }
  /**
   * Lấy chi tiết thông tin chuyên khoa theo ID
   * Quyền truy cập: Mọi tài khoản đã đăng nhập
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.specialtiesService.findOne(id);
  }
  /**
   * Cập nhật thông tin chuyên khoa
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateSpecialtyDto: UpdateSpecialtyDto,
  ) {
    return this.specialtiesService.update(id, updateSpecialtyDto);
  }
  /**
   * Vô hiệu hóa một chuyên khoa (ngưng hoạt động)
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/disable')
  @Roles(Role.ADMIN)
  disable(@Param('id') id: string) {
    return this.specialtiesService.disable(id);
  }
  /**
   * Kích hoạt lại chuyên khoa
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/enable')
  @Roles(Role.ADMIN)
  enable(@Param('id') id: string) {
    return this.specialtiesService.enable(id);
  }
}
