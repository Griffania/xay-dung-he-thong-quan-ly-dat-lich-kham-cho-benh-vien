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
import { AppointmentStatus, SlotStatus } from '@prisma/client';

describe('Concurrency Control - Double Booking & Slot Locking (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtSecret: string;

  // Dữ liệu seeding để test
  let patientRoleId: string;
  let doctorRoleId: string;

  let patientId: string;
  let patientToken: string;

  let patientId2: string;
  let patientToken2: string;

  let doctorId: string;
  let doctorUserId: string;
  let specialtyId: string;
  let workScheduleId: string;
  let slotId: string;

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

    // 1. Lấy Role ID cho PATIENT và DOCTOR
    const patientRole = await prisma.role.findUnique({
      where: { code: Role.PATIENT },
    });
    const doctorRole = await prisma.role.findUnique({
      where: { code: Role.DOCTOR },
    });

    if (!patientRole || !doctorRole) {
      throw new Error(
        'Không tìm thấy Role PATIENT hoặc DOCTOR trong DB. Vui lòng seed trước.',
      );
    }

    patientRoleId = patientRole.id;
    doctorRoleId = doctorRole.id;

    // Dọn dẹp dữ liệu cũ (nếu có trùng lặp từ lần chạy trước)
    await cleanUpData();

    // 2. Seed dữ liệu chuyên khoa test
    const specialty = await prisma.specialty.create({
      data: {
        name: 'Khoa Ngoại Thần Kinh Test Concurrency',
        description: 'Chuyên khoa ngoại thần kinh dùng cho test concurrency',
        isActive: true,
      },
    });
    specialtyId = specialty.id;

    // 3. Seed bác sĩ test (Cần tạo User trước, sau đó tạo Doctor)
    const doctorUser = await prisma.user.create({
      data: {
        email: 'doctor_test_concurrency@hospital.com',
        fullName: 'BS. Nguyễn Văn Concurrency',
        passwordHash: 'hashed_password_123',
        phone: '0912345678',
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
        licenseNo: '12345/BYT-CCHN-CONCURRENCY',
        bio: 'Bác sĩ chuyên khoa thần kinh giàu kinh nghiệm thực nghiệm concurrency.',
        isActive: true,
      },
    });
    doctorId = doctor.id;

    // 4. Seed 2 bệnh nhân test
    const patientUser1 = await prisma.user.create({
      data: {
        email: 'patient1_test_concurrency@gmail.com',
        fullName: 'Bệnh Nhân Concurrency Một',
        passwordHash: 'hashed_password_123',
        phone: '0987654321',
        birthDate: new Date('1995-05-15'),
        roleId: patientRoleId,
        status: 'ACTIVE',
      },
    });
    patientId = patientUser1.id;

    const patientUser2 = await prisma.user.create({
      data: {
        email: 'patient2_test_concurrency@gmail.com',
        fullName: 'Bệnh Nhân Concurrency Hai',
        passwordHash: 'hashed_password_123',
        phone: '0987654322',
        birthDate: new Date('1996-06-16'),
        roleId: patientRoleId,
        status: 'ACTIVE',
      },
    });
    patientId2 = patientUser2.id;

    // Ký phát token cho 2 bệnh nhân để gọi API (đồng bộ payload và key name với auth service và jwt strategy)
    patientToken = jwtService.sign(
      { sub: patientId, email: patientUser1.email, role: Role.PATIENT },
      { secret: jwtSecret, expiresIn: '15m' },
    );
    patientToken2 = jwtService.sign(
      { sub: patientId2, email: patientUser2.email, role: Role.PATIENT },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    // 5. Seed ca làm việc (WorkSchedule) và Slot khám trống
    // Chọn ngày hôm sau để tránh lỗi slot in past
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 2);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const workSchedule = await prisma.workSchedule.create({
      data: {
        doctorId: doctorId,
        workDate: tomorrow,
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T09:30:00.000Z'),
        slotDurationMin: 30,
      },
    });
    workScheduleId = workSchedule.id;

    const slot = await prisma.slot.create({
      data: {
        workScheduleId: workScheduleId,
        doctorId: doctorId,
        date: tomorrow,
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T09:30:00.000Z'),
        status: SlotStatus.AVAILABLE,
      },
    });
    slotId = slot.id;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu kiểm thử
    await cleanUpData();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanUpData() {
    // Xóa các bản ghi liên quan đến concurrency test bằng email và tên chuyên khoa đặc trưng
    // Chú ý thứ tự xóa ràng buộc khóa ngoại (Appointment -> Slot -> WorkSchedule -> Doctor -> User/Specialty)
    try {
      await prisma.appointment.deleteMany({
        where: {
          OR: [
            { patientId: patientId },
            { patientId: patientId2 },
            { doctorId: doctorId },
          ],
        },
      });

      await prisma.slot.deleteMany({
        where: { doctorId: doctorId },
      });

      await prisma.workSchedule.deleteMany({
        where: { doctorId: doctorId },
      });

      await prisma.doctor.deleteMany({
        where: { id: doctorId },
      });

      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'doctor_test_concurrency@hospital.com',
              'patient1_test_concurrency@gmail.com',
              'patient2_test_concurrency@gmail.com',
            ],
          },
        },
      });

      await prisma.specialty.deleteMany({
        where: { name: 'Khoa Ngoại Thần Kinh Test Concurrency' },
      });
    } catch (e) {
      console.warn(
        'Lỗi dọn dẹp dữ liệu test (bỏ qua nếu bảng chưa có dữ liệu):',
        e.message,
      );
    }
  }

  describe('Race Condition - Đặt lịch đồng thời cho cùng một Slot', () => {
    it('Nên xử lý các yêu cầu đồng thời, chỉ cho phép đúng 1 yêu cầu đặt lịch thành công và 9 yêu cầu còn lại bị từ chối sạch sẽ với HTTP 409', async () => {
      const concurrentRequests = 10;
      const requestPromises = [];

      // Gửi đồng thời 10 yêu cầu
      for (let i = 0; i < concurrentRequests; i++) {
        // Luân phiên dùng token của bệnh nhân 1 và bệnh nhân 2
        const token = i % 2 === 0 ? patientToken : patientToken2;

        requestPromises.push(
          request(app.getHttpServer())
            .post('/api/appointments')
            .set('Authorization', `Bearer ${token}`)
            .send({
              slotId: slotId,
              symptoms: `Mô phỏng đặt lịch đồng thời ca thứ ${i}`,
              notes: 'Concurrency E2E test',
            }),
        );
      }

      // Đợi tất cả hoàn thành
      const responses = await Promise.all(requestPromises);

      // Phân loại kết quả phản hồi
      const successResponses = responses.filter(
        (r) => r.status === HttpStatus.CREATED,
      );
      const conflictResponses = responses.filter(
        (r) => r.status === HttpStatus.CONFLICT,
      );

      // Verify kiểm soát đặt lịch
      expect(successResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(concurrentRequests - 1);

      // Kiểm tra nội dung phản hồi thành công
      const successBody = successResponses[0].body;
      expect(successBody.message).toBe('đặt lịch khám thành công');
      expect(successBody.data.slotId).toBe(slotId);
      expect(successBody.data.status).toBe(AppointmentStatus.PENDING);

      // Kiểm tra các phản hồi bị từ chối
      conflictResponses.forEach((response) => {
        expect(response.body.statusCode).toBe(HttpStatus.CONFLICT);
        expect(
          response.body.message.includes(
            'khung giờ khám này đã được đặt trước',
          ) || response.body.message.includes('đang được xử lý'),
        ).toBe(true);
      });

      // Truy vấn database để khẳng định chỉ có duy nhất 1 cuộc hẹn thành công được ghi nhận trong DB
      const appointmentsInDb = await prisma.appointment.findMany({
        where: { slotId: slotId },
      });
      expect(appointmentsInDb.length).toBe(1);

      // Khẳng định Slot đã chuyển sang BOOKED
      const updatedSlot = await prisma.slot.findUnique({
        where: { id: slotId },
      });
      expect(updatedSlot?.status).toBe(SlotStatus.BOOKED);
    });

    it('Nên cho phép tái sử dụng Slot sau khi cuộc hẹn cũ bị hủy (Cancelled Slot Reuse)', async () => {
      // 1. Tìm cuộc hẹn đang hoạt động vừa được đặt từ bài test trước
      const activeAppt = await prisma.appointment.findFirst({
        where: { slotId: slotId, status: AppointmentStatus.PENDING },
      });
      expect(activeAppt).toBeDefined();

      // 2. Tiến hành Hủy cuộc hẹn này
      const tokenToCancel =
        activeAppt!.patientId === patientId ? patientToken : patientToken2;
      const cancelResponse = await request(app.getHttpServer())
        .patch(`/api/appointments/${activeAppt!.id}/cancel`)
        .set('Authorization', `Bearer ${tokenToCancel}`)
        .expect(HttpStatus.OK);

      expect(cancelResponse.body.message).toBe('hủy lịch hẹn thành công');
      expect(cancelResponse.body.data.status).toBe(AppointmentStatus.CANCELLED);

      // Xác nhận slot đã quay về AVAILABLE
      const slotAfterCancel = await prisma.slot.findUnique({
        where: { id: slotId },
      });
      expect(slotAfterCancel?.status).toBe(SlotStatus.AVAILABLE);

      // 3. Sử dụng Bệnh nhân 2 để đặt lại slot vừa được giải phóng đó
      const rebookResponse = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken2}`)
        .send({
          slotId: slotId,
          symptoms: 'Đặt lại slot sau khi đã được hủy',
          notes: 'Rebook test',
        })
        .expect(HttpStatus.CREATED);

      expect(rebookResponse.body.message).toBe('đặt lịch khám thành công');
      expect(rebookResponse.body.data.patientId).toBe(patientId2);

      // Kiểm tra trong DB: Phải có 2 bản ghi cuộc hẹn liên kết với cùng 1 slotId (1 cái CANCELLED, 1 cái PENDING)
      const allApptsForSlot = await prisma.appointment.findMany({
        where: { slotId: slotId },
      });
      expect(allApptsForSlot.length).toBe(2);

      const cancelledAppt = allApptsForSlot.find(
        (a) => a.status === AppointmentStatus.CANCELLED,
      );
      const pendingAppt = allApptsForSlot.find(
        (a) => a.status === AppointmentStatus.PENDING,
      );

      expect(cancelledAppt).toBeDefined();
      expect(pendingAppt).toBeDefined();
      expect(pendingAppt?.patientId).toBe(patientId2);
    });
  });
});
