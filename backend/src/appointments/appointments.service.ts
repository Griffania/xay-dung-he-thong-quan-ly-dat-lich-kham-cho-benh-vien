import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppointmentsDto } from "./dto/create-appointments.dto";
import { Role } from "../auth/enums/role.enum";
import { AppointmentStatus, SlotStatus } from "@prisma/client";
import { QueryAppointmentsDto } from "./dto/query.appointments.dto";

@Injectable()
export class AppointmentsService{
    constructor (private readonly prisma: PrismaService){}
            //kiểm tra slot có nằm trong quá khứ so với thời gian hiện tại hay không
            private isSlotInPast(slotDate:Date,slotStartTime:Date):boolean{
                const now = new Date();
                const slotDateStr = slotDate.toISOString().split('T')[0];
                const todayStr = now.toISOString().split('T')[0];

                if(slotDateStr<todayStr){
                    return true;
                }
                if(slotDateStr===todayStr){
                    const hours = String(now.getUTCHours()).padStart(2,'0');
                    const minutes = String(now.getUTCMinutes()).padStart(2,'0');
                    const seconds = String(now.getUTCSeconds()).padStart(2,'0');
                    const currentTimeOfDay = new Date(`1970-01-01T${hours}:${minutes}:${seconds}.000Z`);
                    return slotStartTime.getTime()<= currentTimeOfDay.getTime();
                }
                return false;
            }
            //tạo lịch mới (đặt lịch khám)
            //nghiệp vụ đổi trạng thái slot->booked , tạo Appointment ở trạng thái Pending
            async create(createDto: CreateAppointmentsDto,currentUser:any){
                const {slotId,patientId,symptoms,notes} = createDto;
                //xác định id bệnh nhân thực tế
                let finalPatientId='';
                if(currentUser.role===Role.PATIENT){
                    finalPatientId = currentUser.userId;
                }else if(
                    currentUser.role===Role.RECEPTIONIST||currentUser.role===Role.ADMIN
                ){
                    if(!patientId){
                        throw new BadRequestException('vui lòng cung cấp id bệnh nhân khi đặt lich hộ');
                    }
                    finalPatientId=patientId;
                }else {
                    throw new ForbiddenException('bác sĩ không có quyền đặt lịch hẹn');
                }
                //xác định bệnh nhân tồn tại
                const patientUser = await this.prisma.user.findUnique({
                    where:{id:finalPatientId},
                    include:{role:true},
                });
                if(!patientUser||patientUser.role.code!=Role.PATIENT){
                    throw new NotFoundException('không tìm thấy thông tin bệnh nhân hợp lệ trên hệ thống');
                }
                //thực hiện trong database transaction để tránh đặt trùng lịch race condition
                return this.prisma.$transaction(async(tx)=>{
                    // 1. Sử dụng SELECT FOR UPDATE để khóa dòng ghi trong bảng slots (Pessimistic Locking)
                    const slots = await tx.$queryRaw<any[]>`
                        SELECT 
                            id, 
                            date, 
                            status, 
                            doctor_id as "doctorId", 
                            start_time as "startTime", 
                            end_time as "endTime", 
                            work_schedule_id as "workScheduleId", 
                            parent_slot_id as "parentSlotId" 
                        FROM slots 
                        WHERE id = ${slotId}::uuid 
                        FOR UPDATE
                    `;
                    
                    if (!slots || slots.length === 0) {
                        throw new NotFoundException('không tìm thấy slot khám theo yêu cầu');
                    }
                    const slot = slots[0];

                    if(slot.status!==SlotStatus.AVAILABLE){
                        throw new ConflictException('khung giờ khám này đã được đặt trước hoặc bị khóa');
                    }

                    // 2. Kiểm tra xem có lịch hẹn nào đang hoạt động (PENDING hoặc CONFIRMED) liên kết với slot này không
                    const activeAppointment = await tx.appointment.findFirst({
                        where: {
                            slotId: slot.id,
                            status: {
                                in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
                            }
                        }
                    });

                    if (activeAppointment) {
                        throw new ConflictException('khung giờ khám này đã được đặt trước hoặc đang được xử lý');
                    }

                    //kiểm tra slot có trong quá khứ không
                    const slotDate = new Date(slot.date);
                    const slotStartTime = new Date(slot.startTime);
                    if(this.isSlotInPast(slotDate, slotStartTime)){
                        throw new BadRequestException('không thể đặt lịch hẹn với khung giờ trong quá khứ');
                    }
                    //tạo bản ghi cuộc hẹn (appointment)
                    const appointment = await tx.appointment.create({
                        data:{
                            patientId: finalPatientId,
                            doctorId: slot.doctorId,
                            slotId: slot.id,
                            symptoms: symptoms || null,
                            notes : notes || null,
                            status :AppointmentStatus.PENDING,
                        },
                        include:{
                            patient:{
                                select:{
                                    id:true,
                                    fullName:true,
                                    email:true,
                                    phone:true,
                                },
                            },
                            doctor:{
                                include:{
                                    user:{
                                        select:{
                                            fullName:true,
                                            phone:true,
                                        },
                                    },
                                    specialty:true,
                                },
                            },
                            slot:true,
                        },
                    });
                    //cập nhật trạng thái sang booked
                    await tx.slot.update({
                        where : {id:slotId},
                        data:{status:SlotStatus.BOOKED},
                    });
                    return {
                        message:'đặt lịch khám thành công',
                        data :appointment,
                    };
                });
            }
            //hủy lịch khám
            //nghiệp vụ chuyển trạng thái lịch hẹn -> cancelled    , slot  -> available
            async cancel(id:string,currentUser:any){
                //tìm lịch hẹn kèm theo thông tin của slot
                const appointment =await this.prisma.appointment.findUnique({
                    where:{id},
                    include:{slot:true},
                });
                if(!appointment){
                    throw new NotFoundException('không tìm thấy dữ liệu cuộc hẹn yêu cầu');
                }
                //chỉ cho phép hủy khi lịch hẹn ở trạng thái pending hoặc confirmed
                const allowedCancelStatus:AppointmentStatus[] = [AppointmentStatus.PENDING,AppointmentStatus.CONFIRMED];
                if(!allowedCancelStatus.includes(appointment.status)){
                    throw new BadRequestException(`không thể hủy lịch hẹn ở trạng thái hiện tại(${appointment.status})!`,);
                }
                //kiểm tra quyền để hủy
                if(currentUser.role===Role.PATIENT){
                    if(appointment.patientId!=currentUser.userId){
                        throw new ForbiddenException('bạn không có quyền hủy lịch hẹn của người khác');
                    }
                }else if(
                    currentUser.role===Role.DOCTOR
                ){
                    const doctorProfile = await this.prisma.doctor.findUnique({
                        where:{userId:currentUser.userId},
                    });
                    if(!doctorProfile||appointment.doctorId!==doctorProfile.id){
                        throw new ForbiddenException('bác sĩ không có quyền hủy lịch hẹn của người khác');
                    }
                }
                //cập nhật đồng bộ trạng thái bằng database transaction
                return this.prisma.$transaction(async(tx)=>{
                    const updateAppointment = await tx.appointment.update({
                        where: {id},
                        data:{status:AppointmentStatus.CANCELLED},
                        include:{
                            patient:{
                                select:{
                                    fullName:true,
                                },
                            },
                            slot:true,
                        },
                    });
                    //giải phóng slot trả về trạng thái available
                    await tx.slot.update({
                        where:{id:appointment.slotId},
                        data:{status:SlotStatus.AVAILABLE},
                    });
                    return {
                        message:'hủy lịch hẹn thành công',
                        data: updateAppointment,
                    };
                });
            }
            //lấy danh sách lịch hẹn khám bênh theo phân quyền và bộ lọc
            async findAll(query:QueryAppointmentsDto,currentUser:any){
                const page = parseInt(query.page||'1',10);
                const limit = parseInt(query.limit||'10',10);
                const skip = (page -1)*limit;
                const where :any = {};
                //áp đặt phân quyền theo vai trò người dùng
                if(currentUser.role===Role.PATIENT){
                    //bệnh nhân sẽ chỉ được xem đanh sách lịch khám của mình
                    where.patientId=currentUser.userId;
                }else if(currentUser.role===Role.DOCTOR){
                    //bác sĩ chỉ được xem các ca khám của chính mình
                    const doctorProfile = await this.prisma.doctor.findUnique({
                        where:{userId:currentUser.userId},
                    });
                    if(!doctorProfile){
                        throw new NotFoundException('không tìm thấy hồ sơ bác sĩ trên hệ thống');
                    }
                    where.doctorId= doctorProfile.userId;
                }else{
                    //admin và lễ tân có thể xem tất cả và lọc theo yêu cầu
                    if(query.patientId){
                        where.patientId=query.patientId;
                    }if(query.doctorId){
                        where.doctorId=query.doctorId;
                    }
                }
                //lọc theo trạng thi lịch khám
                if(query.status){
                    where.status=query.status;
                }
                //lọc theo ngày hẹn(ánh xạ tham chiếu từ bẳng slot)
                if(query.date){
                    const parseDate = new Date (`${query.date}T00:00:00.000Z`);
                    if(!isNaN(parseDate.getTime())){
                        where.slot={
                            date:parseDate,
                        };
                    }
                }
                //thực hiện đếm tổng và truy vấn danh sách song song
                const [appointments,total] = await Promise.all([
                    this.prisma.appointment.findMany({
                        where,
                        include:{
                            patient:{
                                select:{
                                    id:true,
                                    fullName:true,
                                    email:true,
                                    phone:true,
                                    birthDate:true,
                                },
                            },
                            doctor:{
                                include:{
                                    user:{
                                        select:{
                                            fullName:true,
                                            phone:true,
                                        },
                                    },
                                    specialty:true,
                                },
                            },
                            slot:true,
                        },
                        skip,
                        take:limit,
                        orderBy:{createdAt:'desc'},
                    }),
                    this.prisma.appointment.count({where}),
                ]);
                return {
                    data : appointments,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages:Math.ceil(total/limit),
                    },
                };
            }
            //xem thông tin chi tiết 1 cuộc hẹn khám
            async findOne(id:string,currentUser:any){
                const appointment = await this.prisma.appointment.findUnique({
                    where : {id},
                    include:{
                        patient:{
                            select:{
                                id:true,
                                fullName:true,
                                email:true,
                                phone:true,
                                birthDate:true,
                            },
                        },
                        doctor:{
                            include:{
                                user:{
                                    select:{
                                        fullName:true,
                                        phone:true,
                                    },
                                },
                                specialty:true,
                            },
                        },
                        slot:true,
                    },
                });
                if(!appointment){
                    throw new NotFoundException('không tìm tháy lịch hẹn yêu cầu');
                }
                //kiểm tra quyền xem thông tin chi tiết cuộc hẹn
                if(currentUser.role===Role.PATIENT){
                    if(appointment.patientId!==currentUser.userId){
                        throw new ForbiddenException('bạn không có quyền xem chi tiết lịch hẹn này');
                    }
                }
                else if(currentUser.role===Role.DOCTOR){
                    const doctorProfile = await this.prisma.doctor.findUnique({
                        where:{userId:currentUser.userId},
                    });
                    if(!doctorProfile||appointment.doctorId!==doctorProfile.id){
                        throw new ForbiddenException('bạn không có quyền xem chi tiết lịch hẹn của bác sĩ khác');
                    }
                }
                return appointment;
            }
}