import { IsNotEmpty, IsUUID } from "class-validator";

export class RescheduleAppointmentDto{
    @IsUUID('4',{message:'id slot khám mới phải là mã dạng uuid hợp lệ'})
    @IsNotEmpty({message:'id slot mới không được để trống'})
    newSlotId!: string;
}