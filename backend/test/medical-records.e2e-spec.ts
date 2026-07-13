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
import {
  AppointmentStatus,
  SlotStatus,
  BookingType,
  QueueStatus,
} from '@prisma/client';

describe('Medical Record Module (e2e) - Kịch bản kiểm thử tiếng Việt', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtSecret: string;

  // Vai trò của người dùng
  let patientRoleId: string;
  let doctorRoleId: string;
  let receptionistRoleId: string;

  // Người dùng 1 (Bệnh nhân)
  let patientId: string;
  let patientToken: string;

  // Người dùng 2 (Bệnh nhân khác)
  let otherPatientId: string;
  let otherPatientToken: string;

  // Bác sĩ phụ trách chính
  let doctorUserId: string;
  let doctorId: string;
  let doctorToken: string;

  // Bác sĩ khác (dùng để test phân quyền)
  let otherDoctorUserId: string;
  let otherDoctorId: string;
  let otherDoctorToken: string;

  // Lễ tân
  let receptionistId: string;
  let receptionistToken: string;

  let specialtyId: string;
  let workScheduleId: string;
  let slotId1: string;
  let slotId2: string;

  let testAppointmentId: string;
  let testMedicalRecordId: string;

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

    // Đăng ký pipe và filter
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

    // 1. Lấy Role ID từ Database
    const patientRole = await prisma.role.findUnique({
      where: { code: Role.PATIENT },
    });
    const doctorRole = await prisma.role.findUnique({
      where: { code: Role.DOCTOR },
    });
    const receptionistRole = await prisma.role.findUnique({
      where: { code: Role.RECEPTIONIST },
    });

    if (!patientRole || !doctorRole || !receptionistRole) {
      throw new Error(
        'Không tìm thấy các Role cần thiết trong DB. Vui lòng chạy seed trước.',
      );
    }

    patientRoleId = patientRole.id;
    doctorRoleId = doctorRole.id;
    receptionistRoleId = receptionistRole.id;

    // Dọn dẹp dữ liệu cũ trước khi test
    await cleanUpData();

    // 2. Seed chuyên khoa
    const specialty = await prisma.specialty.create({
      data: {
        name: 'Khoa Ngoại Nhi Test Medical Record',
        description: 'Khoa Ngoại Nhi phục vụ test hồ sơ bệnh án',
        isActive: true,
      },
    });
    specialtyId = specialty.id;

    // 3. Seed Bác sĩ chính
    const doctorUser = await prisma.user.create({
      data: {
        email: 'dr.main_mr_test@hospital.com',
        fullName: 'BS. Trần Văn Bệnh Án',
        passwordHash: 'hashed_password_123',
        phone: '0981111111',
        birthDate: new Date('1980-01-01'),
        roleId: doctorRoleId,
        status: 'ACTIVE',
      },
    });
    doctorUserId = doctorUser.id;

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUserId,
        specialtyId: specialtyId,
        licenseNo: '11111/BYT-MR-TEST',
        bio: 'Bác sĩ phụ trách chính kiểm thử bệnh án',
        isActive: true,
      },
    });
    doctorId = doctor.id;

    // 4. Seed Bác sĩ khác (Bác sĩ ngoài)
    const otherDoctorUser = await prisma.user.create({
      data: {
        email: 'dr.other_mr_test@hospital.com',
        fullName: 'BS. Lê Khác Biệt',
        passwordHash: 'hashed_password_123',
        phone: '0982222222',
        birthDate: new Date('1982-02-02'),
        roleId: doctorRoleId,
        status: 'ACTIVE',
      },
    });
    otherDoctorUserId = otherDoctorUser.id;

    const otherDoctor = await prisma.doctor.create({
      data: {
        userId: otherDoctorUserId,
        specialtyId: specialtyId,
        licenseNo: '22222/BYT-MR-TEST',
        bio: 'Bác sĩ phụ trách test phân quyền chéo',
        isActive: true,
      },
    });
    otherDoctorId = otherDoctor.id;

    // 5. Seed Bệnh nhân 1 (Chính)
    const patientUser = await prisma.user.create({
      data: {
        email: 'patient1_mr_test@gmail.com',
        fullName: 'Bệnh Nhân Số Một',
        passwordHash: 'hashed_password_123',
        phone: '0901111111',
        birthDate: new Date('1995-05-05'),
        roleId: patientRoleId,
        status: 'ACTIVE',
      },
    });
    patientId = patientUser.id;

    // 6. Seed Bệnh nhân 2 (Khác)
    const otherPatientUser = await prisma.user.create({
      data: {
        email: 'patient2_mr_test@gmail.com',
        fullName: 'Bệnh Nhân Số Hai',
        passwordHash: 'hashed_password_123',
        phone: '0902222222',
        birthDate: new Date('1996-06-06'),
        roleId: patientRoleId,
        status: 'ACTIVE',
      },
    });
    otherPatientId = otherPatientUser.id;

    // 7. Seed Lễ tân
    const receptionistUser = await prisma.user.create({
      data: {
        email: 'receptionist_mr_test@hospital.com',
        fullName: 'Lễ Tân Tiếp Đón',
        passwordHash: 'hashed_password_123',
        phone: '0903333333',
        birthDate: new Date('1990-03-03'),
        roleId: receptionistRoleId,
        status: 'ACTIVE',
      },
    });
    receptionistId = receptionistUser.id;

    // Ký cấp tokens
    patientToken = jwtService.sign(
      { sub: patientId, email: patientUser.email, role: Role.PATIENT },
      { secret: jwtSecret },
    );
    otherPatientToken = jwtService.sign(
      {
        sub: otherPatientId,
        email: otherPatientUser.email,
        role: Role.PATIENT,
      },
      { secret: jwtSecret },
    );
    doctorToken = jwtService.sign(
      { sub: doctorUserId, email: doctorUser.email, role: Role.DOCTOR },
      { secret: jwtSecret },
    );
    otherDoctorToken = jwtService.sign(
      {
        sub: otherDoctorUserId,
        email: otherDoctorUser.email,
        role: Role.DOCTOR,
      },
      { secret: jwtSecret },
    );
    receptionistToken = jwtService.sign(
      {
        sub: receptionistId,
        email: receptionistUser.email,
        role: Role.RECEPTIONIST,
      },
      { secret: jwtSecret },
    );

    // Seed Ca làm việc & Slot
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
      const userIds = [
        patientId,
        otherPatientId,
        doctorUserId,
        otherDoctorUserId,
        receptionistId,
      ].filter(Boolean);

      // Xóa MedicalRecord trước do có khóa ngoại
      await prisma.medicalRecord.deleteMany({
        where: {
          patientId: { in: userIds },
        },
      });

      // Xóa QueueEntry
      await prisma.queueEntry.deleteMany({
        where: {
          doctorId: { in: [doctorId, otherDoctorId].filter(Boolean) },
        },
      });

      // Xóa Appointment
      await prisma.appointment.deleteMany({
        where: {
          patientId: { in: userIds },
        },
      });

      // Xóa Slot
      await prisma.slot.deleteMany({
        where: {
          doctorId: { in: [doctorId, otherDoctorId].filter(Boolean) },
        },
      });

      // Xóa WorkSchedule
      await prisma.workSchedule.deleteMany({
        where: {
          doctorId: { in: [doctorId, otherDoctorId].filter(Boolean) },
        },
      });

      // Xóa Doctor
      await prisma.doctor.deleteMany({
        where: {
          id: { in: [doctorId, otherDoctorId].filter(Boolean) },
        },
      });

      // Xóa User
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: {
            id: { in: userIds },
          },
        });
      }

      // Xóa Specialty
      if (specialtyId) {
        await prisma.specialty.deleteMany({
          where: { id: specialtyId },
        });
      }
    } catch (e) {
      console.error('Lỗi khi dọn dẹp dữ liệu kiểm thử:', e);
    }
  }

  describe('KỊCH BẢN 1: TẠO MỚI HỒ SƠ BỆNH ÁN (CREATE MEDICAL RECORD)', () => {
    it('1. Đăng ký cuộc hẹn mới ở trạng thái CONFIRMED', async () => {
      const appt = await prisma.appointment.create({
        data: {
          patientId: patientId,
          doctorId: doctorId,
          slotId: slotId1,
          status: AppointmentStatus.CONFIRMED,
          bookingType: BookingType.ONLINE,
          symptoms: 'Đau bụng âm ỉ vùng quanh rốn',
        },
      });
      testAppointmentId = appt.id;
      expect(testAppointmentId).toBeDefined();
    });

    it('2. Bệnh nhân tự tạo bệnh án -> Thất bại 403 Forbidden (RBAC chặn)', async () => {
      await request(app.getHttpServer())
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: testAppointmentId,
          diagnosis: 'Đau dạ dày cấp',
          treatment: 'Uống thuốc giảm tiết acid dạ dày',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('3. Lễ tân tạo bệnh án -> Thất bại 403 Forbidden (RBAC chặn)', async () => {
      await request(app.getHttpServer())
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          appointmentId: testAppointmentId,
          diagnosis: 'Đau dạ dày cấp',
          treatment: 'Uống thuốc giảm tiết acid dạ dày',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('4. Bác sĩ khác phụ trách tạo bệnh án -> Thất bại 403 Forbidden (Logic chặn chéo)', async () => {
      await request(app.getHttpServer())
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${otherDoctorToken}`)
        .send({
          appointmentId: testAppointmentId,
          diagnosis: 'Đau dạ dày cấp',
          treatment: 'Uống thuốc giảm tiết acid dạ dày',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('5. Bác sĩ chính tạo bệnh án khi cuộc hẹn chưa bắt đầu khám (Trạng thái CONFIRMED) -> Thất bại 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId: testAppointmentId,
          diagnosis: 'Viêm ruột thừa cấp',
          treatment: 'Phẫu thuật nội soi cắt ruột thừa',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('6. Bác sĩ bắt đầu khám cuộc hẹn (Chuyển sang IN_PROGRESS và tạo QueueEntry)', async () => {
      // Giả lập check-in để có queue entry
      const qEntry = await prisma.queueEntry.create({
        data: {
          appointmentId: testAppointmentId,
          doctorId: doctorId,
          queueNo: 5,
          status: QueueStatus.WAITING,
        },
      });

      // Bác sĩ bấm nút bắt đầu khám
      await prisma.appointment.update({
        where: { id: testAppointmentId },
        data: { status: AppointmentStatus.IN_PROGRESS },
      });

      await prisma.queueEntry.update({
        where: { id: qEntry.id },
        data: {
          status: QueueStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });
    });

    it('7. Bác sĩ chính tạo bệnh án thành công khi cuộc hẹn ở trạng thái IN_PROGRESS -> Thành công 201 Created & Chuyển trạng thái cuộc hẹn thành COMPLETED, hàng đợi thành DONE', async () => {
      const recordPayload = {
        appointmentId: testAppointmentId,
        diagnosis: 'Viêm ruột thừa cấp nhẹ',
        treatment:
          'Phẫu thuật cắt bỏ ruột thừa nội soi, dùng kháng sinh sau mổ',
        prescription:
          'Amoxicillin 500mg x 15 viên, Paracetamol 500mg x 10 viên',
        notes: 'Kiêng đồ ăn nhiều dầu mỡ, tái khám sau 7 ngày',
        followUpDate: new Date('2026-07-04').toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(recordPayload)
        .expect(HttpStatus.CREATED);

      expect(response.body.message).toContain('Lập hồ sơ bệnh án thành công');
      expect(response.body.data.medicalRecord).toBeDefined();
      expect(response.body.data.medicalRecord.diagnosis).toBe(
        recordPayload.diagnosis,
      );
      expect(response.body.data.appointment.status).toBe(
        AppointmentStatus.COMPLETED,
      );
      expect(response.body.data.queueEntry.status).toBe(QueueStatus.DONE);

      testMedicalRecordId = response.body.data.medicalRecord.id;

      // Kiểm tra trong database
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: testAppointmentId },
        include: { medicalRecord: true, queueEntry: true },
      });
      expect(dbAppointment?.status).toBe(AppointmentStatus.COMPLETED);
      expect(dbAppointment?.queueEntry?.status).toBe(QueueStatus.DONE);
      expect(dbAppointment?.medicalRecord).toBeDefined();
      expect(dbAppointment?.medicalRecord?.diagnosis).toBe(
        recordPayload.diagnosis,
      );
    });

    it('8. Tạo trùng bệnh án cho một cuộc hẹn -> Thất bại 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId: testAppointmentId,
          diagnosis: 'Trùng lặp chẩn đoán',
          treatment: 'Điều trị trùng',
        })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('KỊCH BẢN 2: CHỈNH SỬA HỒ SƠ BỆNH ÁN (UPDATE MEDICAL RECORD)', () => {
    it('1. Bệnh nhân cố gắng sửa bệnh án của chính mình -> Thất bại 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/api/medical-records/${testMedicalRecordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          diagnosis: 'Sửa bởi bệnh nhân',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('2. Bác sĩ khác cố gắng sửa bệnh án của bác sĩ chính -> Thất bại 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/api/medical-records/${testMedicalRecordId}`)
        .set('Authorization', `Bearer ${otherDoctorToken}`)
        .send({
          diagnosis: 'Sửa bởi bác sĩ khác',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('3. Bác sĩ chính chỉnh sửa bệnh án của chính mình lập -> Thành công 200 OK', async () => {
      const updatePayload = {
        diagnosis: 'Viêm ruột thừa cấp hoại tử chưa vỡ',
        treatment:
          'Phẫu thuật cắt ruột thừa nội soi cấp cứu, truyền dịch và kháng sinh thế hệ 3',
        prescription: 'Cefuroxime 500mg x 20 viên, Paracetamol 500mg x 15 viên',
        notes:
          'Thay băng vết mổ mỗi ngày, quay lại viện ngay nếu sốt hoặc đau bụng dữ dội',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/medical-records/${testMedicalRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(updatePayload)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain(
        'Cập nhật hồ sơ bệnh án thành công',
      );
      expect(response.body.data.diagnosis).toBe(updatePayload.diagnosis);
      expect(response.body.data.treatment).toBe(updatePayload.treatment);
      expect(response.body.data.prescription).toBe(updatePayload.prescription);

      // Kiểm tra DB
      const dbMR = await prisma.medicalRecord.findUnique({
        where: { id: testMedicalRecordId },
      });
      expect(dbMR?.diagnosis).toBe(updatePayload.diagnosis);
      expect(dbMR?.treatment).toBe(updatePayload.treatment);
    });
  });

  describe('KỊCH BẢN 3: XEM LẠI LỊCH SỬ BỆNH ÁN CŨ (GET PATIENT HISTORY)', () => {
    it('1. Bệnh nhân xem lịch sử bệnh án của chính mình -> Thành công 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/medical-records/patient/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('Lấy lịch sử bệnh án thành công');
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].id).toBe(testMedicalRecordId);
      expect(response.body.data[0].doctorName).toBe('BS. Trần Văn Bệnh Án');
      expect(response.body.data[0].specialtyName).toBe(
        'Khoa Ngoại Nhi Test Medical Record',
      );
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('2. Bệnh nhân xem lịch sử bệnh án của bệnh nhân khác -> Thất bại 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/medical-records/patient/${patientId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('3. Bác sĩ chính xem lịch sử bệnh án của bệnh nhân -> Thành công 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/medical-records/patient/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('Lấy lịch sử bệnh án thành công');
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('4. Nhân viên lễ tân xem lịch sử bệnh án của bệnh nhân -> Thành công 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/medical-records/patient/${patientId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('Lấy lịch sử bệnh án thành công');
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
