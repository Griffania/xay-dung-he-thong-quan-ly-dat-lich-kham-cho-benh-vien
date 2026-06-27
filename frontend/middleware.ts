import { NextResponse, NextRequest } from 'next/server';

// Hàm giải mã JWT payload an toàn ở tầng Edge Runtime (không dùng thư viện Node.js)
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Chuyển đổi Base64Url sang Base64 tiêu chuẩn
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Giải mã Base64 và xử lý tiếng Việt / UTF-8
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Đọc access token từ cookies của client
  const token = request.cookies.get('accessToken')?.value;
  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname.startsWith('/login');
  //  Trường hợp chưa đăng nhập
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    // Lưu lại trang đích để sau khi đăng nhập có thể quay lại nếu cần (tùy chọn)
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  //  Trường hợp đã có token
  if (token) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role?.toUpperCase();
    // Nếu token bị lỗi giải mã hoặc hết hạn (không có role hợp lệ)
    if (isProtectedRoute && !role) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      // Xóa cookie token bị lỗi để tránh lặp vô tận
      response.cookies.delete('accessToken');
      return response;
    }
    // Nếu người dùng cố vào trang login khi đã đăng nhập hợp lệ
    if (isAuthRoute && role) {
      const targetDashboard = `/dashboard/${role.toLowerCase()}`;
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    // Kiểm tra phân quyền truy cập các thư mục con trong dashboard
    if (isProtectedRoute && role) {
      const lowerRole = role.toLowerCase();
      // Nếu truy cập chính xác trang gốc "/dashboard" -> Chuyển hướng theo vai trò (Role Redirect)
      if (pathname === '/dashboard' || pathname === '/dashboard/') {
        return NextResponse.redirect(new URL(`/dashboard/${lowerRole}`, request.url));
      }
      // Kiểm tra xem route con của dashboard có khớp với vai trò không
      // Ví dụ: Bệnh nhân (/dashboard/patient) cố vào admin (/dashboard/admin)
      const allowedRoles = ['admin', 'doctor', 'receptionist', 'patient'];
      for (const r of allowedRoles) {
        if (pathname.startsWith(`/dashboard/${r}`) && lowerRole !== r) {
          // Không khớp quyền -> Chuyển hướng họ về đúng dashboard của vai trò của họ
          return NextResponse.redirect(new URL(`/dashboard/${lowerRole}`, request.url));
        }
      }
    }
  }
  return NextResponse.next();
}
// Áp dụng middleware chạy qua dashboard và trang login
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
