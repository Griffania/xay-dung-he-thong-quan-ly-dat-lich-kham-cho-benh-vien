import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString({ message: 'Tên chuyên khoa phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Tên chuyên khoa không được để trống!' })
  @MaxLength(100, { message: 'Tên chuyên khoa không được vượt quá 100 ký tự!' })
  name!: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự!' })
  @IsOptional()
  description?: string;
}
