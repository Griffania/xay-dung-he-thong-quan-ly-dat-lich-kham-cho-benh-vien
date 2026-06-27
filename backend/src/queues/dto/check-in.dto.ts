import { IsNotEmpty, IsUUID } from 'class-validator';

export class CheckInDto {
  @IsUUID('4', { message: 'ID cuộc hẹn phải là mã UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID cuộc hẹn không được để trống' })
  appointmentId!: string;
}
