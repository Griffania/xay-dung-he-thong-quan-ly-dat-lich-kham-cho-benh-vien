import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

/**
 * Data Transfer Object (DTO) phục vụ việc cập nhật thông tin Bác sĩ.
 * Cho phép chỉnh sửa thông tin cá nhân và thông tin chuyên môn nhưng loại trừ email và password.
 */
export class UpdateDoctorDto {
  // --- Thông tin tài khoản người dùng có thể cập nhật ---
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống nếu truyền lên!' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự!' })
  @IsOptional()
  phone?: string;

  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng ISO (YYYY-MM-DD)!' })
  @IsOptional()
  birthDate?: string;

  // --- Thông tin chuyên môn bác sĩ có thể cập nhật ---

  @IsUUID('4', { message: 'Chuyên khoa phải là mã định danh UUID hợp lệ!' })
  @IsOptional()
  specialtyId?: string;

  @IsString({ message: 'Số giấy phép hành nghề phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Số giấy phép hành nghề không được để trống nếu truyền lên!' })
  @IsOptional()
  licenseNo?: string;

  @IsString({ message: 'Giới thiệu bản thân phải là chuỗi ký tự!' })
  @IsOptional()
  bio?: string;
}
