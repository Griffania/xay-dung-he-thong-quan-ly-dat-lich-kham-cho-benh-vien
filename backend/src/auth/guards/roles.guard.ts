import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser {
  method: string;
  url: string;
  ip: string;
  user?: {
    userId: string;
    email: string;
    role: Role;
  };
}
@Injectable()
export class RolesGuard implements CanActivate {
  // Khởi tạo logger riêng cho RolesGuard, tự động kết xuất log qua Winston hệ thống
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách các role được chỉ định từ decorator @Roles
    // Tìm kiếm ở cả mức method (getHandler) và mức class (getClass)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),//lấy method hiện tại
      context.getClass(),//lấy controller hiện tại
    ]);
    // Nếu route không yêu cầu bất kỳ role nào, cho phép truy cập qua
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    // Lấy thông tin request và user đã được gán bởi JwtAuthGuard trước đó
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request?.user;
    // CẢNH BÁO nếu quên áp dụng JwtAuthGuard trước RolesGuard
    if (!user) {
      this.logger.warn(
        `Lỗi cấu hình Guards: RolesGuard được sử dụng nhưng request.user bị undefined. ` +
          `Đảm bảo rằng JwtAuthGuard đã được áp dụng trước RolesGuard tại route: ${request?.method} ${request?.url}`,
      );
      throw new ForbiddenException(
        'Yêu cầu xác thực tài khoản trước khi phân quyền!',
      );
    }
    // Kiểm tra xem vai trò của user hiện tại có khớp với các vai trò được phép không
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      // Ghi log cảnh báo chi tiết khi phát hiện hành vi truy cập trái phép (Security Warning)
      const { method, url, ip } = request;
      this.logger.warn(
        `[TRUY CẬP TRÁI PHÉP] Người dùng không đủ quyền hạn. ` +
          `User: ${user.email} (ID: ${user.userId}, Role: ${user.role}) ` +
          `đã thử truy cập ${method} ${url} từ IP ${ip}. ` +
          `Yêu cầu một trong các vai trò: [${requiredRoles.join(', ')}]`,
      );
      // Ném lỗi 403 Forbidden kèm thông báo
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào tài nguyên này!',
      );
    }
    return true;
  }
}
