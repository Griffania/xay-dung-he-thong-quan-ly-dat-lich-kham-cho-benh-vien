import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  Matches,
  IsDateString,
} from 'class-validator';
/**
 * Data Transfer Object (DTO) phục vụ việc tạo mới Lịch làm việc của Bác sĩ (WorkSchedule).
 */
export class CreateWorkScheduleDto {
  @IsUUID('4', { message: 'ID bác sĩ phải là mã UUID hợp lệ!' })
  @IsNotEmpty({ message: 'ID bác sĩ không được để trống!' })
  doctorId!: string;

  @IsDateString({}, { message: 'Ngày làm việc không đúng định dạng ISO (YYYY-MM-DD)!' })
  @IsNotEmpty({ message: 'Ngày làm việc không được để trống!' })
  workDate!: string;

  @IsString({ message: 'Thời gian bắt đầu phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Thời gian bắt đầu không được để trống!' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Thời gian bắt đầu không đúng định dạng (HH:mm hoặc HH:mm:ss)!',
  })
  startTime!: string;

  @IsString({ message: 'Thời gian kết thúc phải là chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Thời gian kết thúc không được để trống!' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Thời gian kết thúc không đúng định dạng (HH:mm hoặc HH:mm:ss)!',
  })
  endTime!: string;

  @IsInt({ message: 'Thời lượng slot phải là số nguyên (phút)!' })
  @Min(5, { message: 'Thời lượng slot tối thiểu là 5 phút!' })
  @Max(120, { message: 'Thời lượng slot tối đa là 120 phút!' })
  @IsOptional()
  slotDurationMin?: number;
}
