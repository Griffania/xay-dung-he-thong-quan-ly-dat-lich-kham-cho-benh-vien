# Tóm tắt Dự án & Cấu trúc chức năng các File Code

Dự án này là hệ thống **Quản lý thông tin bệnh viện & Đặt lịch khám**, bao gồm hai thành phần chính: **Backend** (xây dựng bằng NestJS, Prisma ORM, PostgreSQL) và **Frontend** (xây dựng bằng Next.js, TailwindCSS, Axios).

Dưới đây là sơ đồ chi tiết về cấu trúc thư mục, vai trò và chức năng của từng file code hiện có trong dự án.

---

## 1. Cấu trúc Tổng quan Dự án

```text
Project_LVTN/
├── backend/               # Mã nguồn phía Server (NestJS, Prisma, PostgreSQL)
└── frontend/              # Mã nguồn phía Client (Next.js, TailwindCSS)
```

---

## 2. Chi tiết Backend (`/backend`)

Backend được viết dựa trên framework **NestJS** theo cấu trúc mô-đun (Module-based Architecture). Cơ sở dữ liệu sử dụng **PostgreSQL** và được quản lý thông qua **Prisma ORM**.

### 2.1. Cấu hình Database & Prisma (`/backend/prisma`)
*   [schema.prisma](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/prisma/schema.prisma): Định nghĩa toàn bộ lược đồ cơ sở dữ liệu (Database Schema), bao gồm các bảng, kiểu liệt kê (Enum), chỉ mục (Index) và quan hệ liên kết:
    *   `Role`: Quyền hạn người dùng (`PATIENT` - Bệnh nhân, `DOCTOR` - Bác sĩ, `RECEPTIONIST` - Lễ tân, `ADMIN` - Quản trị viên).
    *   `User`: Thông tin tài khoản người dùng dùng chung cho tất cả các vai trò.
    *   `Doctor`: Hồ sơ thông tin chuyên môn của bác sĩ (quan hệ 1:1 với `User`).
    *   `Specialty`: Danh mục các chuyên khoa (Khoa Nội, Khoa Nhi, v.v.).
    *   `WorkSchedule`: Ca làm việc tổng quát của bác sĩ.
    *   `Slot`: Khung giờ khám bệnh chi tiết (hỗ trợ logic tách/chia nhỏ slot khi bác sĩ khám xong sớm).
    *   `Appointment`: Lịch hẹn khám (Thực thể trung tâm kết nối Patient, Doctor, và Slot).
    *   `QueueEntry`: Hàng đợi khám thực tế tại phòng khám sau khi bệnh nhân check-in.
    *   `MedicalRecord`: Bệnh án của bệnh nhân do bác sĩ lập sau ca khám.

### 2.2. Mã nguồn ứng dụng chính (`/backend/src`)
*   [main.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/main.ts): File điểm đầu vào (Entry point) khởi tạo ứng dụng NestJS. Cấu hình CORS, tiền tố API `/api`, tích hợp Winston Logger toàn cục, thiết lập `ValidationPipe` toàn cục (để validate dữ liệu đầu vào DTO) và `AllExceptionsFilter` toàn cục (để bắt lỗi).
*   [app.module.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/app.module.ts): Mô-đun gốc của hệ thống, kết nối tất cả các mô-đun con (`AuthModule`, `UsersModule`, `PrismaModule`, `LoggerModule`).
*   [app.controller.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/app.controller.ts) & [app.service.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/app.service.ts): Controller và Service gốc dùng để kiểm tra kết nối cơ bản với Backend (API Ping/Healthcheck).

### 2.3. Các thành phần dùng chung (`/backend/src/common`)
*   **Bộ lọc ngoại lệ (Exception Filters):**
    *   [all-exceptions.filter.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/common/filters/all-exceptions.filter.ts): Bắt toàn bộ các exception phát sinh trong runtime (kể cả lỗi HTTP hay lỗi server thô như mất kết nối DB, cú pháp code), định dạng phản hồi lỗi đồng nhất trả về Client và tự động ghi log lỗi chi tiết qua Winston Logger.
*   **Hệ thống Logging:**
    *   [logger.module.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/common/logger/logger.module.ts): Cấu hình Winston Logger ghi log ra Console (có tô màu trực quan) và tự động ghi log vào các file xoay vòng (daily rotate) trong thư mục `/logs` để lưu lại vết hệ thống.

### 2.4. Kết nối Database (`/backend/src/prisma`)
*   [prisma.service.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/prisma/prisma.service.ts): Kế thừa `PrismaClient` để thiết lập kết nối đến cơ sở dữ liệu PostgreSQL khi start và đóng kết nối an toàn khi tắt app.
*   [prisma.module.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/prisma/prisma.module.ts): Đóng gói `PrismaService` dưới dạng Provider để xuất bản (export) sử dụng ở các module khác.

### 2.5. Phân hệ Quản lý Người dùng (`/backend/src/users`)
*   [users.service.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/users/users.service.ts): Chứa các nghiệp vụ tạo mới người dùng, truy vấn thông tin cá nhân qua email hoặc ID.
*   [users.controller.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/users/users.controller.ts): Cung cấp API endpoint liên quan đến thông tin cá nhân của User (yêu cầu đăng nhập thông qua `JwtAuthGuard`).
*   [users.module.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/users/users.module.ts): Liên kết `UsersService`, `UsersController` và xuất bản Service cho phân hệ Authentication sử dụng.
*   [create-user.dto.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/users/dto/create-user.dto.ts): Khai báo và ràng buộc kiểu dữ liệu gửi lên khi tạo tài khoản (fullName, email, password, phone, birthDate).

### 2.6. Phân hệ Xác thực & Quyền hạn (`/backend/src/auth`)
*   [auth.controller.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/auth.controller.ts): Cung cấp các REST API cho Clients:
    *   `POST /auth/register`: Đăng ký tài khoản.
    *   `POST /auth/login`: Đăng nhập, nhận về bộ đôi JWT Access Token & Refresh Token.
    *   `POST /auth/refresh`: Làm mới Access Token khi hết hạn bằng Refresh Token hợp lệ.
    *   `POST /auth/logout`: Đăng xuất (xóa hash Refresh Token trong DB để vô hiệu hóa phiên làm việc).
    *   `POST /auth/change-password`: Thay đổi mật khẩu cá nhân (yêu cầu JWT).
*   [auth.service.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/auth.service.ts): Xử lý toàn bộ logic xác thực: băm/so sánh mật khẩu (bcrypt), ký phát JWT (Access/Refresh Tokens), xác minh và lưu trữ băm Refresh Token vào cơ sở dữ liệu để chống giả mạo.
*   [auth.module.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/auth.module.ts): Đăng ký JwtModule, Passport, kết nối AuthService và cấu hình chiến lược xác thực JWT.
*   **Chiến lược & Bảo mật (Strategies & Guards):**
    *   [jwt.strategy.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/strategies/jwt.strategy.ts): Cấu hình chiến lược phân tích và xác thực tính hợp lệ của chuỗi JWT gửi kèm trong request header (`Bearer token`).
    *   [jwt-auth.guard.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/guards/jwt-auth.guard.ts): Guard chặn các request chưa đăng nhập hoặc token sai.
    *   [roles.guard.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/guards/roles.guard.ts): Guard phân quyền nâng cao (RBAC - Role-Based Access Control) để chặn các request không có vai trò phù hợp truy cập vào tài nguyên (ví dụ chỉ cho `DOCTOR` hoặc `ADMIN` vào).
    *   [roles.decorator.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/decorators/roles.decorator.ts): Decorator tùy chỉnh `@Roles(...)` giúp đánh dấu quyền được phép truy cập nhanh trên các Controller.
*   **Ràng buộc Dữ liệu đầu vào (DTOs):**
    *   [register.dto.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/dto/register.dto.ts): Ràng buộc dữ liệu gửi lên khi đăng ký.
    *   [login.dto.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/dto/login.dto.ts): Ràng buộc định dạng email và mật khẩu khi đăng nhập.
    *   [refresh-token.dto.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/dto/refresh-token.dto.ts): Ràng buộc `userId` và `refreshToken` gửi kèm khi yêu cầu cấp mới Access Token.
    *   [change-password.dto.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/backend/src/auth/dto/change-password.dto.ts): Kiểm tra tính hợp lệ của mật khẩu cũ và mật khẩu mới khi đổi mật khẩu.

---

## 3. Chi tiết Frontend (`/frontend`)

Frontend được xây dựng bằng **Next.js 15 (App Router)** kết hợp với **TailwindCSS** và các thư viện hỗ trợ như **Lucide Icons**, **Axios**, và **React Hook Form**.

### 3.1. Các file cấu hình hệ thống
*   [next.config.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/next.config.ts): Cấu hình hoạt động của Next.js framework.
*   [tailwind.config.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/tailwind.config.ts) & [postcss.config.mjs](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/postcss.config.mjs): Cấu hình hệ thống thiết kế giao diện (Design Tokens, Responsive, Dark Mode) bằng TailwindCSS.
*   [tsconfig.json](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/tsconfig.json): Quản lý cấu hình compile TypeScript và các path alias (ví dụ `@/*` ánh xạ tới thư mục nguồn).

### 3.2. Middleware Bảo mật & Phân quyền (`/frontend/middleware.ts`)
*   [middleware.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/middleware.ts): Chạy ở tầng Edge của Next.js trước khi render giao diện:
    *   Đọc `accessToken` từ cookies, tự động giải mã JWT payload bằng hàm decode tùy chỉnh để trích xuất vai trò (`role`).
    *   Nếu chưa đăng nhập nhưng cố vào `/dashboard/:path*`, tự động chuyển hướng (redirect) về `/login`.
    *   Nếu đã đăng nhập mà cố vào `/login`, tự động chuyển hướng về đúng dashboard tương ứng với vai trò của họ.
    *   Nếu truy cập `/dashboard` hoặc truy cập chéo quyền (ví dụ bệnh nhân vào trang admin), tự động định tuyến lại (Role Redirect) về đúng trang `/dashboard/[role.toLowerCase()]`.

### 3.3. Thư viện kết nối API
*   [api.ts](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/lib/api.ts): Cấu hình Axios Instance chung:
    *   **Request Interceptor:** Tự động đính kèm `Bearer token` lấy từ `localStorage` vào request header.
    *   **Response Interceptor:** Bắt lỗi `401 Unauthorized`, tự động thực hiện **Silent Refresh** gọi API `/auth/refresh` bằng Refresh Token. Sau khi nhận cặp token mới, tự động cập nhật cả `localStorage` lẫn cookie `accessToken` để đồng bộ hoàn toàn với Middleware, tránh lỗi mất phiên làm việc khi reload.

### 3.4. Các trang hiển thị (`/frontend/app`)
*   [layout.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/layout.tsx): Khung giao diện dùng chung (Global Layout) cho toàn bộ trang web (Font chữ, body wrapper).
*   [globals.css](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/globals.css): Cấu hình TailwindCSS và stylesheet toàn cục.
*   [page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/page.tsx): Trang chủ mặc định (`/`), thực hiện gọi API Ping đến Backend để kiểm tra trạng thái kết nối.
*   **Thư mục xác thực nhóm (`/frontend/app/(auth)`):**
    *   [layout.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/(auth)/layout.tsx): Auth Layout chung chứa giao diện nền tối với orbs phát sáng chuyển động và khung kính glassmorphism.
    *   [page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/(auth)/login/page.tsx): Trang Đăng nhập hệ thống, tích hợp xác thực biểu mẫu và kích hoạt chuyển hướng vai trò (Role Redirect) sau khi đăng nhập thành công.
*   **Phân hệ Bảng điều khiển (`/frontend/app/dashboard`):**
    *   [layout.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/dashboard/layout.tsx): Dashboard Shell dùng chung, hiển thị Sidebar điều hướng thông minh động (thay đổi các tab chức năng theo vai trò người dùng), Profile Header và nút Đăng xuất toàn hệ thống.
    *   [page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/dashboard/page.tsx): Trang gốc `/dashboard` đóng vai trò chuyển tiếp dự phòng ở Client (fallback redirect) về đúng route vai trò.
    *   [admin/page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/dashboard/admin/page.tsx): Dashboard của vai trò `ADMIN` (xem tài nguyên máy chủ CPU/RAM/DB và trực quan hóa Security Audit Logs).
    *   [doctor/page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/dashboard/doctor/page.tsx): Dashboard của vai trò `DOCTOR` (quản lý hàng đợi khám bệnh và biểu mẫu lập bệnh án điện tử, chỉ định đơn thuốc).
    *   [receptionist/page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/dashboard/receptionist/page.tsx): Dashboard của vai trò `RECEPTIONIST` (quầy check-in bệnh nhân theo SĐT, cấp số thứ tự phòng khám và theo dõi mật độ phòng khám).
    *   [patient/page.tsx](file:///d:/Study/project/Luận văn tốt nghiệp/Project_LVTN/frontend/app/dashboard/patient/page.tsx): Dashboard của vai trò `PATIENT` (đặt lịch khám trực tuyến theo bác sĩ/giờ, xem danh sách lịch hẹn và lịch sử hồ sơ bệnh án).
