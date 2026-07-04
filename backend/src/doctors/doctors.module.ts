import { Module, forwardRef } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';

/**
 * Module quản lý danh sách Bác sĩ
 * Kết nối Controller, Service và cung cấp kết nối Database thông qua PrismaModule
 */
@Module({
  imports: [PrismaModule, forwardRef(() => QueuesModule)],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService], // Xuất ra để các module khác (như Lịch hẹn, Hàng đợi) có thể sử dụng nếu cần
})
export class DoctorsModule {}
