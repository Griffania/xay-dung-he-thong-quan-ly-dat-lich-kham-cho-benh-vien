import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

/**
 * Controller Quản lý Người dùng (Users Management)
 *
 * Bảo vệ toàn cục:
 * 1. `JwtAuthGuard`: Xác minh JWT Access Token trong header `Authorization: Bearer <token>`.
 * 2. `RolesGuard`: Đọc metadata của decorator `@Roles(...)` để đối chiếu với vai trò người dùng trong Token.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Tạo tài khoản mới (thường dùng để Admin cấp tài khoản cho Nhân viên/Bác sĩ)
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Truy vấn danh sách người dùng trong hệ thống (Hỗ trợ phân trang, tìm kiếm và lọc theo vai trò)
   * Quyền truy cập: ADMIN, DOCTOR, RECEPTIONIST (Không cho phép PATIENT truy cập danh bạ người dùng khác)
   */
  @Get()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.usersService.findAll({ search, role, });
  }

  /**
   * Lấy chi tiết thông tin một người dùng theo ID
   * Quyền truy cập: ADMIN, DOCTOR, RECEPTIONIST
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Khóa tài khoản người dùng (Vô hiệu hóa đăng nhập và Refresh Token)
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/lock')
  @Roles(Role.ADMIN)
  lock(@Param('id') id: string) {
    return this.usersService.lock(id);
  }

  /**
   * Mở khóa tài khoản người dùng
   * Quyền truy cập: Chỉ dành cho ADMIN
   */
  @Post(':id/unlock')
  @Roles(Role.ADMIN)
  unlock(@Param('id') id: string) {
    return this.usersService.unlock(id);
  }
}
