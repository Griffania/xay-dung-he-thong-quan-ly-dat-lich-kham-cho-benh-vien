import { IsEnum, IsNotEmpty } from 'class-validator';
import { QueueStatus } from '@prisma/client';

export class UpdateQueueStatusDto {
  @IsEnum(QueueStatus, {
    message:
      'Trạng thái hàng đợi không hợp lệ (Phải là WAITING, IN_PROGRESS, DONE hoặc NO_SHOW)',
  })
  @IsNotEmpty({ message: 'Trạng thái hàng đợi không được để trống' })
  status!: QueueStatus;
}
