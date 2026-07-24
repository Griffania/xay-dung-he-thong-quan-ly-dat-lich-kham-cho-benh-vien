import {
  IsEmail,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Email không đúng định dạng!' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Họ và tên phải là chuỗi ký tự!' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự!' })
  @IsOptional()
  phone?: string;

  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng ISO!' })
  @IsOptional()
  birthDate?: string;
}
