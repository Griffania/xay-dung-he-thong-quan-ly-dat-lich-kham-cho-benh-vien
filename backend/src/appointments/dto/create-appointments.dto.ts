import { BookingType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentsDto {
  @IsUUID('4', { message: 'ID slot khám phải là mã có dạng uuid hợp lệ' })
  @IsNotEmpty({ message: 'ID slot khám không được để trống' })
  slotId!: string;

  @IsUUID('4', { message: 'ID của bệnh nhân phải là dạng uuid hợp lệ' })
  @IsOptional()
  patientId?: string;

  @IsString({ message: 'triệu chứng phải là chuổi văn bản' })
  @IsOptional()
  symptoms?: string;

  @IsString({ message: 'chú thích phải là chuổi văn bản' })
  @IsOptional()
  notes?: string;

  @IsEnum(BookingType, {
    message: 'Phương thức đặt lịch không hợp lệ (ONLINE hoặc WALK_IN)',
  })
  @IsOptional()
  bookingType?: BookingType;
}
