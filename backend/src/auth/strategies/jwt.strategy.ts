import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      // Rút trích JWT từ header của Request dưới dạng: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Bắt buộc kiểm tra hạn sử dụng của token
      // Xác minh chữ ký bằng khóa Access Secret, Đọc từ file environment (.env)
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'default_access_secret_123',
    });
  }
  // Hàm chạy tự động sau khi Passport giải mã và kiểm tra token hợp lệ thành công
  validate(payload: JwtPayload) {
    // Trả về thông tin nào thì req.user ở Controller sẽ nhận được thông tin đó
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
