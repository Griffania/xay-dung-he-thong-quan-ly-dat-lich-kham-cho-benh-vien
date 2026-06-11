import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'User ID phải là chuỗi!' })
  @IsNotEmpty({ message: 'User ID không được để trống!' })
  userId!: string;

  @IsString({ message: 'Refresh Token phải là chuỗi!' })
  @IsNotEmpty({ message: 'Refresh Token không được để trống!' })
  refreshToken!: string;
}
