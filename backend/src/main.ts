import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // 1. KHỞI TẠO ỨNG DỤNG NESTJS
  const app = await NestFactory.create(AppModule);

  // 2. SETUP LOGGING (Sử dụng Winston Logger làm Logger hệ thống chính)
  // Lấy logger provider của winston đã được cấu hình từ AppModule và gán làm logger mặc định cho NestJS.
  // Mọi log của Nest (khởi chạy, route mapping, lỗi hệ thống) và log từ class Logger sẽ qua Winston.
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const port = Number(process.env.PORT ?? 3001);
  const apiPrefix = process.env.API_PREFIX ?? 'api'; // Tự động thêm tiền tố /api trước mỗi route
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((item) => item.trim()),
  });
  // 3. SETUP VALIDATION (Global Validation Pipe)
  // Tự động kiểm tra dữ liệu đầu vào (request body, query parameters, params) dựa trên các decorator của class-validator trong DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động lược bỏ các trường (fields) gửi lên từ client mà không được định nghĩa trong DTO.
      forbidNonWhitelisted: true, // Trả lỗi BadRequest (400) nếu phát hiện bất kỳ trường thừa/lạ nào gửi lên từ client.
      transform: true, // Tự động chuyển đổi kiểu dữ liệu của request (ví dụ: chuyển chuỗi '123' thành number 123 nếu định nghĩa trong DTO là number).
      transformOptions: {
        enableImplicitConversion: true, // Cho phép tự động ngầm định chuyển đổi kiểu dữ liệu dựa theo TypeScript type.
      },
    }),
  );
  // 4. SETUP EXCEPTION FILTER (Global Exception Filter)
  // Bắt toàn bộ các exception phát sinh trong ứng dụng (lỗi HTTP hoặc lỗi server thô như DB crash, syntax error),
  // định dạng lại response lỗi đồng nhất và ghi log thông qua Winston Logger.
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  await app.listen(port);
}
bootstrap();
