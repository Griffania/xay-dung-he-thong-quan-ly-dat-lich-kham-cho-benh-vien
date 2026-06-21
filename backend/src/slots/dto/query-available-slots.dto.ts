import { IsNotEmpty, IsUUID, IsDateString } from 'class-validator';

export class QueryAvailableSlotsDto {
  @IsUUID('4', { message: 'ID bác sĩ phải là mã UUID hợp lệ!' })
  @IsNotEmpty({ message: 'ID bác sĩ không được để trống!' })
  doctorId!: string;

  @IsDateString(
    {},
    { message: 'Ngày truy vấn không đúng định dạng YYYY-MM-DD!' },
  )
  @IsNotEmpty({ message: 'Ngày truy vấn không được để trống!' })
  date!: string;
}
