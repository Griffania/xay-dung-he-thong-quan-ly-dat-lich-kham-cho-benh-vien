import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from './../src/auth/enums/role.enum';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, SlotStatus, BookingType, QueueStatus } from '@prisma/client';

describe('Doctor Examination Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtSecret: string;

  // Dữ liệu seeding để test
  let patientRoleId: string;
  let doctorRoleId: string;
  let receptionistRoleId: string;

  let patientId: string;
  let patientToken: string;

  let doctorUserId: string;
  let doctorId: string;
  let doctorToken: string;

  let receptionistId: string;
  let receptionistToken: string;

  let specialtyId: string;
  let workScheduleId: string;
  let slotId1: string;
  let slotId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
    jwtSecret =
      configService.get<string>('JWT_ACCESS_SECRET') ||
      'default_access_secret_123';

    // Đăng ký các pipe và filter giống main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

    await app.init();

    // 1. Lấy Role ID cho PATIENT, DOCTOR, RECEPTIONIST từ Database
    const patientRole = await prisma.role.findUnique({ where: { code: Role.PATIENT } });
    const doctorRole = await prisma.role.findUnique({ where: { code: Role.DOCTOR } });
    const receptionistRole = await prisma.role.findUnique({ where: { code: Role.RECEPTIONIST } });

    if (!patientRole || !doctorRole || !receptionistRole) {
      throw new Error('Không tìm thấy các Role cần thiết trong DB. Vui lòng chạy seed trước.');
    }

    patientRoleId = patientRole.id;
    doctorRoleId = doctorRole.id;
    receptionistRoleId = receptionistRole.id;

    // Dọn dẹp dữ liệu cũ từ các lần chạy trước
    await cleanUpData();

    // 2. Seed dữ liệu chuyên khoa test
    const specialty = await prisma.specialty.create({
      data: {
        name: 'Khoa Ngoại Tổng Quát Test Workflow',
        description: 'Chuyên khoa ngoại tổng quát dùng cho test workflow khám bệnh',
        isActive: true,
      },
    });
    specialtyId = specialty.id;

    // 3. Seed bác sĩ test (Cần tạo User trước, sau đó tạo Doctor)
    const doctorUser = await prisma.user.create({
      data: {
        email: 'doctor_test_workflow@hospital.com',
        fullName: 'BS. Nguyễn Văn Khám Bệnh',
        passwordHash: 'hashed_password_123',
        phone: '0911223344',
        birthDate: new Date('1985-05-20'),
        roleId: doctorRoleId,
        status: 'ACTIVE',
      },
    });
    doctorUserId = doctorUser.id;

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUserId,
        specialtyId: specialtyId,
        licenseNo: '56789/BYT-CCHN-WORKFLOW',
        bio: 'Bác sĩ chuyên khoa ngoại khoa phụ trách test quy trình khám bệnh.',
        isActive: true,
      },
    });
    doctorId = doctor.id;

    // 4. Seed bệnh nhân test
    const patientUser = await prisma.user.create({
      data: {
        email: 'patient_test_workflow@gmail.com',
        fullName: 'Bệnh Nhân Thử Nghiệm Một',
        passwordHash: 'hashed_password_123',
        phone: '0988776655',
        birthDate: new Date('2000-10-10'),
        roleId: patientRoleId,
        status: 'ACTIVE',
      },
    });
    patientId = patientUser.id;

    // 5. Seed nhân viên lễ tân test
    const receptionistUser = await prisma.user.create({
      data: {
        email: 'receptionist_test_workflow@hospital.com',
        fullName: 'Lễ Tân Thử Nghiệm',
        passwordHash: 'hashed_password_123',
        phone: '0977889900',
        birthDate: new Date('1990-01-15'),
        roleId: receptionistRoleId,
        status: 'ACTIVE',
      },
    });
    receptionistId = receptionistUser.id;

    // Ký phát token cho các vai trò để gọi API
    patientToken = jwtService.sign({ sub: patientId, email: patientUser.email, role: Role.PATIENT }, { secret: jwtSecret, expiresIn: '15m' });
    doctorToken = jwtService.sign({ sub: doctorUserId, email: doctorUser.email, role: Role.DOCTOR }, { secret: jwtSecret, expiresIn: '15m' });
    receptionistToken = jwtService.sign({ sub: receptionistId, email: receptionistUser.email, role: Role.RECEPTIONIST }, { secret: jwtSecret, expiresIn: '15m' });

    // 6. Seed ca làm việc (WorkSchedule) và Slot khám trống cho ngày mai
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const workSchedule = await prisma.workSchedule.create({
      data: {
        doctorId: doctorId,
        workDate: tomorrow,
        startTime: new Date('1970-01-01T08:00:00.000Z'),
        endTime: new Date('1970-01-01T09:00:00.000Z'),
        slotDurationMin: 30,
      },
    });
    workScheduleId = workSchedule.id;

    const slot1 = await prisma.slot.create({
      data: {
        workScheduleId: workScheduleId,
        doctorId: doctorId,
        date: tomorrow,
        startTime: new Date('1970-01-01T08:00:00.000Z'),
        endTime: new Date('1970-01-01T08:30:00.000Z'),
        status: SlotStatus.AVAILABLE,
      },
    });
    slotId1 = slot1.id;

    const slot2 = await prisma.slot.create({
      data: {
        workScheduleId: workScheduleId,
        doctorId: doctorId,
        date: tomorrow,
        startTime: new Date('1970-01-01T08:30:00.000Z'),
        endTime: new Date('1970-01-01T09:00:00.000Z'),
        status: SlotStatus.AVAILABLE,
      },
    });
    slotId2 = slot2.id;
  });

  afterAll(async () => {
    await cleanUpData();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanUpData() {
    try {
      const userIdsToDelete = [patientId, doctorUserId, receptionistId].filter(Boolean) as string[];

      await prisma.appointment.deleteMany({
        where: {
          OR: [
            patientId ? { patientId } : undefined,
            doctorId ? { doctorId } : undefined,
          ].filter(Boolean) as any[],
        },
      });

      if (doctorId) {
        await prisma.slot.deleteMany({
          where: { doctorId },
        });

        await prisma.workSchedule.deleteMany({
          where: { doctorId },
        });

        await prisma.doctor.deleteMany({
          where: { id: doctorId },
        });
      }

      if (userIdsToDelete.length > 0) {
        await prisma.user.deleteMany({
          where: {
            id: { in: userIdsToDelete },
          },
        });
      }

      if (specialtyId) {
        await prisma.specialty.deleteMany({
          where: { id: specialtyId },
        });
      }
    } catch (e) {
      console.error('Lỗi khi dọn dẹp dữ liệu:', e);
    }
  }

  describe('Luồng Nghiệp Vụ Khám Bệnh: CHECKED_IN -> IN_PROGRESS -> COMPLETED', () => {
    let appointmentId: string;

    it('1. Đăng ký/Tạo cuộc hẹn thành công ở trạng thái CONFIRMED', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientId,
          doctorId: doctorId,
          slotId: slotId1,
          status: AppointmentStatus.CONFIRMED,
          bookingType: BookingType.ONLINE,
          symptoms: 'Triệu chứng nhức đầu kéo dài',
        },
      });
      appointmentId = appointment.id;
      expect(appointmentId).toBeDefined();
    });

    it('2. Check-in thành công -> Chuyển sang CHECKED_IN và xếp hàng WAITING', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/check-in`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('checkin thành công');
      expect(response.body.data.appointment.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(response.body.data.queueEntry.status).toBe(QueueStatus.WAITING);
      expect(response.body.data.queueEntry.queueNo).toBeGreaterThanOrEqual(1);

      // Kiểm tra DB
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { queueEntry: true },
      });
      expect(dbAppointment?.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(dbAppointment?.queueEntry?.status).toBe(QueueStatus.WAITING);
    });

    it('3. Bệnh nhân tự ý bắt đầu khám -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/start-examination`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('4. Bác sĩ bắt đầu khám -> Chuyển sang IN_PROGRESS và hàng đợi IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/start-examination`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('bắt đầu khám bệnh thành công');
      expect(response.body.data.appointment.status).toBe(AppointmentStatus.IN_PROGRESS);
      expect(response.body.data.queueEntry.status).toBe(QueueStatus.IN_PROGRESS);
      expect(response.body.data.queueEntry.startedAt).not.toBeNull();

      // Kiểm tra DB
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { queueEntry: true },
      });
      expect(dbAppointment?.status).toBe(AppointmentStatus.IN_PROGRESS);
      expect(dbAppointment?.queueEntry?.status).toBe(QueueStatus.IN_PROGRESS);
    });

    it('5. Hoàn thành khám bệnh nhưng thiếu chẩn đoán -> 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/complete-examination`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          treatment: 'Nghỉ ngơi 3 ngày',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('6. Bác sĩ hoàn thành khám -> Chuyển sang COMPLETED, hàng đợi DONE, tạo MedicalRecord', async () => {
      const diagnosisData = {
        diagnosis: 'Rối loạn tiền đình cấp tính',
        treatment: 'Nghỉ ngơi tại chỗ, dùng thuốc giảm đau, tránh ánh sáng mạnh',
        prescription: 'Ginkgo Biloba 120mg x 30 viên, Paracetamol 500mg x 10 viên',
        notes: 'Uống thuốc sau khi ăn no, tái khám nếu đau đầu dữ dội kèm buồn nôn',
        followUpDate: new Date('2026-07-10').toISOString(),
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/complete-examination`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(diagnosisData)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('hoàn thành khám bệnh và lập hồ sơ bệnh án thành công');
      expect(response.body.data.appointment.status).toBe(AppointmentStatus.COMPLETED);
      expect(response.body.data.queueEntry.status).toBe(QueueStatus.DONE);
      expect(response.body.data.queueEntry.completedAt).not.toBeNull();

      // Kiểm tra MedicalRecord được tạo
      const mr = response.body.data.medicalRecord;
      expect(mr).toBeDefined();
      expect(mr.appointmentId).toBe(appointmentId);
      expect(mr.patientId).toBe(patientId);
      expect(mr.doctorId).toBe(doctorId);
      expect(mr.diagnosis).toBe(diagnosisData.diagnosis);
      expect(mr.treatment).toBe(diagnosisData.treatment);
      expect(mr.prescription).toBe(diagnosisData.prescription);

      // Kiểm tra DB
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { queueEntry: true, medicalRecord: true },
      });
      expect(dbAppointment?.status).toBe(AppointmentStatus.COMPLETED);
      expect(dbAppointment?.queueEntry?.status).toBe(QueueStatus.DONE);
      expect(dbAppointment?.medicalRecord?.diagnosis).toBe(diagnosisData.diagnosis);
    });
  });

  describe('Luồng Nghiệp Vụ Vắng Khám: NO_SHOW', () => {
    let appointmentId2: string;

    it('1. Đăng ký cuộc hẹn thứ 2', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientId,
          doctorId: doctorId,
          slotId: slotId2,
          status: AppointmentStatus.CONFIRMED,
          bookingType: BookingType.ONLINE,
          symptoms: 'Triệu chứng đau vai gáy',
        },
      });
      appointmentId2 = appointment.id;
      expect(appointmentId2).toBeDefined();
    });

    it('2. Check-in cuộc hẹn thứ 2', async () => {
      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId2}/check-in`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(HttpStatus.OK);
    });

    it('3. Bác sĩ đánh dấu vắng khám -> Chuyển sang NO_SHOW trong cả Lịch hẹn và Hàng đợi', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId2}/no-show`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('đánh dấu bệnh nhân vắng khám thành công');
      expect(response.body.data.status).toBe(AppointmentStatus.NO_SHOW);
      expect(response.body.data.queueEntry.status).toBe(QueueStatus.NO_SHOW);

      // Kiểm tra DB
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId2 },
        include: { queueEntry: true },
      });
      expect(dbAppointment?.status).toBe(AppointmentStatus.NO_SHOW);
      expect(dbAppointment?.queueEntry?.status).toBe(QueueStatus.NO_SHOW);
    });
  });
});
