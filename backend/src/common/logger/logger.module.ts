import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

// Định nghĩa định dạng log tùy chỉnh (Custom log format)
// Kết hợp timestamp, màu sắc (cho console) và định dạng chuỗi hiển thị rõ ràng
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const contextStr = context ? `[${context}] ` : '';
    const metaStr = Object.keys(meta).length
      ? ` - Meta: ${JSON.stringify(meta)}`
      : '';
    return `${timestamp} [${level.toUpperCase()}] ${contextStr}${message}${metaStr}`;
  }),
);

// Cấu hình loggerConfig sử dụng WinstonModule.forRoot để import trực tiếp vào AppModule
export const loggerConfig = WinstonModule.forRoot({
  transports: [
    // 1. Console Transport: Log ra màn hình console của terminal
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }), // Thêm màu sắc cho từng level (info, error, warn, v.v.)
        customFormat,
      ),
    }),
    // 2. File Transport cho các log lỗi (Error Logs): Lưu vào file error.log
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.uncolorize(), // Không dùng code màu trong file log
        customFormat,
      ),
    }),
    // 3. File Transport cho tất cả các log (Combined Logs): Lưu vào file combined.log
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/combined.log'),
      format: winston.format.combine(winston.format.uncolorize(), customFormat),
    }),
  ],
});
