import { AppointmentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class QueryAppointmentsDto{
    @IsUUID('4',{message:'id của bệnh nhân phải là dạng uuid hợp lệ'})
    @IsOptional()
    patientId?:string;

    @IsUUID('4',{message:'id bác sĩ phải là dạng uuid hợp lệ'})
    @IsOptional()
    doctorId?:string;

    @IsDateString({},{message:'ngày lọc không đúng định dạng YYYY-MM-DD'})
    @IsOptional()
    date?:string;

    @IsEnum(AppointmentStatus,{message:'trạng thái cuộc hẹn không hợp lệ'})
    @IsOptional()
    status?:AppointmentStatus;

    @IsString()
    @IsOptional()
    page?:string;

    @IsString()
    @IsOptional()
    limit?:string;
}