import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';
/**
 * Khóa metadata dùng để lưu trữ danh sách vai trò (roles) được phép truy cập
 */
export const ROLES_KEY = 'roles';
/**
 * Decorator `@Roles(...)` dùng để cấu hình phân quyền truy cập cho Route Handler hoặc Controller.
 * Nhận vào một hoặc nhiều vai trò từ enum `Role` (Prisma Client).
 * `@Roles(Role.ADMIN)`
 * `@Roles(Role.ADMIN, Role.DOCTOR)`
 * Lưu ý: Decorator này chỉ thiết lập metadata. Bạn phải sử dụng kết hợp với `RolesGuard`
 * (thường đi kèm với `JwtAuthGuard`) để thực hiện kiểm tra quyền thực tế.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
