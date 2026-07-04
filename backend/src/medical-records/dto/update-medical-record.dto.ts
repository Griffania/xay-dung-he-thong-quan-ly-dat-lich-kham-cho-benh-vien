import { IsOptional, IsString, IsDateString } from "class-validator";

export class UpdateMedicalRecordDto {
  @IsString({ message: 'Chẩn đoán phải là chuỗi văn bản' })
  @IsOptional()
  diagnosis?: string;

  @IsString({ message: 'Phác đồ điều trị phải là chuỗi văn bản' })
  @IsOptional()
  treatment?: string;

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
