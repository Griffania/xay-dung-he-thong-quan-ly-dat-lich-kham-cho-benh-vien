import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateMedicalRecordDto {
  @IsUUID('4', { message: 'ID cuộc hẹn phải là định dạng UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID cuộc hẹn không được để trống' })
  appointmentId!: string;

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
