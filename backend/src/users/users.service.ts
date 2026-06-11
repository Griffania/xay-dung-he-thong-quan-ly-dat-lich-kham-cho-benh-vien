import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
  // Loại bỏ passwordHash khỏi kết quả trả về
  private sanitizeUser(user: any) {
    const { passwordHash, refreshTokenHash, ...sanitized } = user;
    return sanitized;
  }
  async create(createUserDto: CreateUserDto) {
    const { email, password, fullName, phone, birthDate, role } = createUserDto;
    // Kiểm tra email tồn tại
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng!');
    }
    // Mã hóa mật khẩu
    const hashedPassword = await this.hashPassword(password);
    // Tạo mới user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        role: role || Role.PATIENT,
        status: UserStatus.ACTIVE,
      },
    });
    return {
      message: 'Tạo tài khoản thành công',
      user: this.sanitizeUser(user),
    };
  }
  async findAll(query: {
    search?: string;
    role?: Role;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) {
      where.role = query.role;
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng!');
    }

    return this.sanitizeUser(user);
  }
  async lock(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng!');
    }
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.LOCKED,
        refreshTokenHash: null, // Xóa token hiện tại để buộc đăng xuất
      },
    });
    return {
      message: 'Khóa tài khoản thành công',
      user: this.sanitizeUser(updatedUser),
    };
  }
  async unlock(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng!');
    }
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
      },
    });
    return {
      message: 'Mở khóa tài khoản thành công',
      user: this.sanitizeUser(updatedUser),
    };
  }
}
