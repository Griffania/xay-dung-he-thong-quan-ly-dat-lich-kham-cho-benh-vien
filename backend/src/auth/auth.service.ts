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

  //Đăng ký tài khoản: Mã hóa mật khẩu mới và lưu thông tin người dùng vào database.
  async register(registerDto: RegisterDto) {
    const { email, password, fullName, phone, birthDate } = registerDto;
    // Kiểm tra xem email đã được sử dụng chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng!');
    }
    // Băm mật khẩu trước khi lưu vào cơ sở dữ liệu
    const hashedPassword = await this.hashPassword(password);
    // Lưu User mới vào database
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });
    return {
      message: 'Đăng ký tài khoản thành công',
      userId: user.id,
    };
  }

  // Sinh bộ đôi token (AT và RT): Ký số (sign) thông tin người dùng (payload) với khóa tương ứng.
  async generateTokens(payload: { sub: string; email: string; role: string }) {
     // Tạo Access Token
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
    // Tạo Refresh Token
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
    // Băm Refresh Token trước khi lưu vào DB để đảm bảo an toàn bảo mật thông tin
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
  // Đăng nhập: Kiểm tra thông tin, sinh token và trả về thông tin user cùng token.
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    // Lấy thông tin user dựa theo email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác!',
      );
    }
    // Kiểm tra xem tài khoản có bị khóa không
    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản này đã bị khóa!');
    }
    // So sánh mật khẩu
    const isPasswordValid = await this.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác!',
      );
    }
    // Tạo token và trả về thông tin đăng nhập
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }
  // Refresh Token mới: Dùng Refresh Token hợp lệ gửi lên để cấp lại một cặp Access Token & Refresh Token hoàn toàn mới.
  async refreshTokens(userId: string, refreshToken: string) {
    // 1. Xác minh chữ ký và tính hợp lệ của Refresh Token
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
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Quyền truy cập bị từ chối!');
    }
    // So sánh Refresh Token gửi lên với chuỗi băm trong DB
    const isRefreshTokenValid = await this.comparePassword(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn!',
      );
    }
    // Tạo bộ token mới
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return tokens;
  }
  // Đăng xuất: Xóa trường refreshToken trong DB để vô hiệu hóa Refresh Token hiện tại.
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
  // Thay đổi mật khẩu người dùng
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại!');
    }
    // So sánh mật khẩu cũ
    const isPasswordValid = await this.comparePassword(
      oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không chính xác!');
    }
    // Băm mật khẩu mới
    const hashedNewPassword = await this.hashPassword(newPassword);
    // Cập nhật mật khẩu mới và xóa Refresh Token hash để buộc tất cả phiên đăng nhập khác phải đăng nhập lại
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
