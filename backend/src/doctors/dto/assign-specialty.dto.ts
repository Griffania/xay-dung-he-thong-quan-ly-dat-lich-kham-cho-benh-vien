import { IsNotEmpty, IsUUID } from 'class-validator';
/**
 * Data Transfer Object (DTO) phục vụ việc gán chuyên khoa cho Bác sĩ.
 */
export class AssignSpecialtyDto {
  @IsUUID('4', { message: 'Chuyên khoa phải là mã định danh UUID hợp lệ!' })
  @IsNotEmpty({ message: 'Chuyên khoa không được để trống!' })
  specialtyId!: string;
}
