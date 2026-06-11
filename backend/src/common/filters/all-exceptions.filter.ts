import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // Sử dụng Logger mặc định của NestJS (sẽ được tích hợp với Winston ở main.ts)
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Lấy HTTP adapter (Express/Fastify) từ host
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    // Xác định status code
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let details: any = null;
    if (exception instanceof HttpException) {
      // Nếu exception là một HttpException chính thống của NestJS
      statusCode = exception.getStatus();
      const resContent = exception.getResponse();
      if (typeof resContent === 'object' && resContent !== null) {
        // Trích xuất message và các thông tin chi tiết (ví dụ: validation errors)
        message = (resContent as any).message || JSON.stringify(resContent);
        // Lưu trữ thông tin chi tiết validation nếu có
        details = (resContent as any).error || null;
      } else {
        message = resContent;
      }
    } else if (exception instanceof Error) {
      // Nếu là lỗi hệ thống thông thường (Error object)
      message = exception.message;
    } else {
      // Trường hợp lỗi ko xác định
      message = String(exception);
    }
    // Cấu trúc response chuẩn hóa trả về cho Client
    const responseBody = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: httpAdapter.getRequestMethod(request),
      message: Array.isArray(message) ? message[0] : message, // Lấy message đầu tiên nếu là mảng lỗi validation
      details: Array.isArray(message) && message.length > 1 ? message : details, // Trả về toàn bộ lỗi validation
    };
    // Log chi tiết lỗi sử dụng Winston
    const logMessage = `${responseBody.method} ${responseBody.path} - Status: ${statusCode} - Message: ${
      typeof message === 'object' ? JSON.stringify(message) : message
    }`;
    if (statusCode >= 500) {
      // Log level ERROR cho các lỗi server (500+) kèm theo Stack Trace để dễ debug
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      // Log level WARN cho các lỗi client (400-499)
      this.logger.warn(logMessage);
    }
    // Gửi response về cho client
    httpAdapter.reply(response, responseBody, statusCode);
  }
}
