import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSpecialtyDto {
  @IsString({ message: 'Tên chuyên khoa phải là chuỗi ký tự!' })
  @MaxLength(100, { message: 'Tên chuyên khoa không được vượt quá 100 ký tự!' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự!' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean!' })
  @IsOptional()
  isActive?: boolean;
}
