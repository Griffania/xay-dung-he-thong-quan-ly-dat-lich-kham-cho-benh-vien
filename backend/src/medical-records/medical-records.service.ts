import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { QueryMedicalRecordDto } from './dto/query-medical-record.dto';
import { Role } from '../auth/enums/role.enum';
import { AppointmentStatus, QueueStatus } from '@prisma/client';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queuesService: QueuesService,
  ) {}

  // Tạo mới hồ sơ bệnh án cho một lịch hẹn khám
   
  async create(createDto: CreateMedicalRecordDto, currentUser: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: createDto.appointmentId },
      include: {
        queueEntry: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy thông tin cuộc hẹn khám');
    }

    // Kiểm tra phân quyền: Chỉ ADMIN hoặc chính DOCTOR phụ trách cuộc hẹn mới được lập bệnh án
    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('Bạn không có quyền lập hồ sơ bệnh án cho cuộc hẹn của bác sĩ khác');
      }
    } else if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ Bác sĩ hoặc Quản trị viên mới được phép lập hồ sơ bệnh án');
    }

    // Kiểm tra xem bệnh án đã tồn tại chưa
    const existingRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: createDto.appointmentId },
    });
    if (existingRecord) {
      throw new ConflictException('Hồ sơ bệnh án cho cuộc hẹn này đã tồn tại');
    }

    // Kiểm tra trạng thái cuộc hẹn
    if (
      appointment.status !== AppointmentStatus.IN_PROGRESS &&
      appointment.status !== AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Chỉ có thể lập hồ sơ bệnh án cho cuộc hẹn ở trạng thái IN_PROGRESS hoặc COMPLETED. Trạng thái hiện tại là ${appointment.status}`,
      );
    }

    // Lưu bệnh án trong một transaction
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Tạo hồ sơ bệnh án
      const medicalRecord = await tx.medicalRecord.create({
        data: {
          appointmentId: createDto.appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          diagnosis: createDto.diagnosis,
          treatment: createDto.treatment,
          prescription: createDto.prescription || null,
          notes: createDto.notes || null,
          followUpDate: createDto.followUpDate ? new Date(createDto.followUpDate) : null,
        },
      });

      let updatedAppointment = appointment;
      let updatedQueueEntry = appointment.queueEntry;

      // Nếu lịch hẹn đang khám (IN_PROGRESS), tự động hoàn thành cuộc hẹn và cập nhật hàng đợi
      if (appointment.status === AppointmentStatus.IN_PROGRESS) {
        updatedAppointment = await tx.appointment.update({
          where: { id: createDto.appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
          include: { queueEntry: true },
        });

        if (appointment.queueEntry) {
          updatedQueueEntry = await tx.queueEntry.update({
            where: { appointmentId: createDto.appointmentId },
            data: {
              status: QueueStatus.DONE,
              completedAt: now,
            },
          });
        }

        // Tính lại thời gian chờ của hàng đợi cho bác sĩ này
        await this.queuesService.recalculateWaitTimes(tx, appointment.doctorId);
      }

      return {
        message: 'Lập hồ sơ bệnh án thành công',
        data: {
          medicalRecord,
          appointment: {
            id: updatedAppointment.id,
            status: updatedAppointment.status,
          },
          queueEntry: updatedQueueEntry
            ? {
                id: updatedQueueEntry.id,
                status: updatedQueueEntry.status,
                completedAt: updatedQueueEntry.completedAt,
              }
            : null,
        },
      };
    });
  }

  //  Chỉnh sửa thông tin hồ sơ bệnh án đã lập
   
  async update(id: string, updateDto: UpdateMedicalRecordDto, currentUser: any) {
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });

    if (!medicalRecord) {
      throw new NotFoundException('Không tìm thấy hồ sơ bệnh án yêu cầu');
    }

    // Kiểm tra phân quyền: Chỉ ADMIN hoặc chính DOCTOR lập bệnh án mới được chỉnh sửa
    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.userId },
      });
      if (!doctor || medicalRecord.doctorId !== doctor.id) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa hồ sơ bệnh án của bác sĩ khác');
      }
    } else if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ Bác sĩ phụ trách hoặc Quản trị viên mới được phép chỉnh sửa hồ sơ bệnh án');
    }

    const updatedRecord = await this.prisma.medicalRecord.update({
      where: { id },
      data: {
        diagnosis: updateDto.diagnosis,
        treatment: updateDto.treatment,
        prescription: updateDto.prescription,
        notes: updateDto.notes,
        followUpDate: updateDto.followUpDate ? new Date(updateDto.followUpDate) : undefined,
      },
    });

    return {
      message: 'Cập nhật hồ sơ bệnh án thành công',
      data: updatedRecord,
    };
  }

  //Xem lại toàn bộ bệnh án cũ của một bệnh nhân
   
  async getPatientHistory(patientId: string, currentUser: any, query: QueryMedicalRecordDto) {
    //  Kiểm tra phân quyền:
    // - PATIENT chỉ được xem bệnh án của chính mình
    // - ADMIN, DOCTOR, RECEPTIONIST được xem lịch sử bệnh án của bất kỳ ai
    if (currentUser.role === Role.PATIENT && currentUser.userId !== patientId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch sử bệnh án của bệnh nhân khác');
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' }, // Sắp xếp theo ngày tạo giảm dần (bệnh án mới nhất lên đầu)
        skip,
        take: limit,
        include: {
          appointment: {
            include: {
              doctor: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                  specialty: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.medicalRecord.count({
        where: { patientId },
      }),
    ]);

    // Format kết quả trả về sạch đẹp
    const formattedRecords = records.map((rec) => {
      const doctorUser = rec.appointment?.doctor?.user;
      const specialty = rec.appointment?.doctor?.specialty;
      return {
        id: rec.id,
        appointmentId: rec.appointmentId,
        patientId: rec.patientId,
        doctorId: rec.doctorId,
        doctorName: doctorUser ? doctorUser.fullName : 'Bác sĩ',
        specialtyName: specialty ? specialty.name : 'Chuyên khoa',
        diagnosis: rec.diagnosis,
        treatment: rec.treatment,
        prescription: rec.prescription,
        notes: rec.notes,
        followUpDate: rec.followUpDate,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      };
    });

    return {
      message: 'Lấy lịch sử bệnh án thành công',
      data: formattedRecords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
