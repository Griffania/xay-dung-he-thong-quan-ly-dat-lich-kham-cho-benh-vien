import { Module } from '@nestjs/common';
import { WorkSchedulesService } from './work-schedules.service';
import { WorkSchedulesController } from './work-schedules.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module quản lý Lịch làm việc của Bác sĩ và Khung giờ khám (Slot)
 */
@Module({
  imports: [PrismaModule],
  controllers: [WorkSchedulesController],
  providers: [WorkSchedulesService],
  exports: [WorkSchedulesService],
})
export class WorkSchedulesModule {}
