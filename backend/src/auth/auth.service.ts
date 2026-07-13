import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { connect } from 'http2';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Băm mật khẩu bằng bcrypt, Mã hóa mật khẩu: Sử dụng thuật toán Salt Rounds = 10 để mã hóa một chiều mật khẩu thô thành chuỗi băm bảo mật.
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // So sánh mật khẩu: Giải mã đối chiếu mật khẩu thô do người dùng nhập với chuỗi băm lưu dưới database.
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(registerDto: RegisterDto) {
    const { email, password, fullName, phone, birthDate } = registerDto;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng!');
    }
    const hashedPassword = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        role: { connect: { code: 'PATIENT' } },
      },
    });
    return {
      message: 'Đăng ký tài khoản thành công',
      userId: user.id,
    };
  }

  async generateTokens(payload: { sub: string; email: string; role: string }) {
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'default_access_secret_123';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default_refresh_secret_123';
    const accessExpiration =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiration as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration as any,
      }),
    ]);
    const hashedRefreshToken = await this.hashPassword(refreshToken);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: {
        refreshTokenHash: hashedRefreshToken,
      },
    });
    return {
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Tài khoản Không tồn tại');
    }
    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản này đã bị khóa!');
    }
    const isPasswordValid = await this.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('mật khẩu không chính xác!');
    }
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role.code,
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.code,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'default_refresh_secret_123';
      await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn!',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Quyền truy cập bị từ chối!');
    }
    const isRefreshTokenValid = await this.comparePassword(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn!',
      );
    }
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role.code,
    });
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });
    return {
      message: 'Đăng xuất thành công',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại!');
    }
    const isPasswordValid = await this.comparePassword(
      oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không chính xác!');
    }
    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedNewPassword,
        refreshTokenHash: null,
      },
    });
    return {
      message: 'Thay đổi mật khẩu thành công. Vui lòng đăng nhập lại!',
    };
  }
}
