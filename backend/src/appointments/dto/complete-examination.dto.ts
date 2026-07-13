import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CompleteExaminationDto {
  @IsString({ message: 'Chẩn đoán phải là chuỗi văn bản' })
  @IsNotEmpty({ message: 'Chẩn đoán không được để trống' })
  diagnosis!: string;

  @IsString({ message: 'Phác đồ điều trị phải là chuỗi văn bản' })
  @IsNotEmpty({ message: 'Phác đồ điều trị không được để trống' })
  treatment!: string;

  @IsString({ message: 'Đơn thuốc phải là chuỗi văn bản' })
  @IsOptional()
  prescription?: string;

  @IsString({ message: 'Ghi chú phải là chuỗi văn bản' })
  @IsOptional()
  notes?: string;

  @IsDateString({}, { message: 'Ngày tái khám phải là định dạng ngày hợp lệ' })
  @IsOptional()
  followUpDate?: string;
}
