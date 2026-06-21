import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không đúng định dạng!' })
  @IsNotEmpty({ message: 'Email không được để trống!' })
  email!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống!' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự!' })
  password!: string;

  @IsString({ message: 'Họ và tên phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống!' })
  fullName!: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự!' })
  @IsOptional()
  phone?: string;

  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng ISO!' })
  @IsOptional()
  birthDate?: string;

  @IsEnum(Role, { message: 'Vai trò không hợp lệ!' })
  @IsOptional()
  role?: Role;
}
