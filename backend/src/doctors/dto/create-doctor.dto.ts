import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

/**
 * Data Transfer Object (DTO) phục vụ việc tạo mới Bác sĩ.
 * Bao gồm cả thông tin tài khoản người dùng và thông tin chuyên môn của bác sĩ.
 */
export class CreateDoctorDto {
  // --- Thông tin tài khoản người dùng (User Account) ---

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

  @IsDateString(
    {},
    { message: 'Ngày sinh không đúng định dạng ISO (YYYY-MM-DD)!' },
  )
  @IsOptional()
  birthDate?: string;
  // --- Thông tin chuyên môn bác sĩ (Doctor Profile) ---
  @IsUUID('4', { message: 'Chuyên khoa phải là mã định danh UUID hợp lệ!' })
  @IsNotEmpty({ message: 'Chuyên khoa không được để trống!' })
  specialtyId!: string;

  @IsString({ message: 'Số giấy phép hành nghề phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Số giấy phép hành nghề không được để trống!' })
  licenseNo!: string;

  @IsString({ message: 'Giới thiệu bản thân phải là chuỗi ký tự!' })
  @IsOptional()
  bio?: string;
}
