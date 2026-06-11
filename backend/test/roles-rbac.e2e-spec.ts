import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ForbiddenException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';

describe('Roles-Based Access Control (RBAC) (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtSecret: string;

  // Mock PrismaService để tránh ghi/đọc cơ sở dữ liệu thực tế khi kiểm thử
  const mockPrismaService = {
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: '1', email: 'user1@example.com', fullName: 'User One', role: Role.PATIENT, status: 'ACTIVE' },
        { id: '2', email: 'user2@example.com', fullName: 'User Two', role: Role.DOCTOR, status: 'ACTIVE' },
      ]),
      count: jest.fn().mockResolvedValue(2),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email === 'newstaff@test.com') {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: where.id || 'some-id',
          email: where.email || 'user@example.com',
          fullName: 'Test User',
          role: Role.PATIENT,
          status: 'ACTIVE',
          passwordHash: 'hashed_password',
        });
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'new-user-uuid',
          email: data.email,
          fullName: data.fullName,
          role: data.role || Role.PATIENT,
          status: 'ACTIVE',
        });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        return Promise.resolve({
          id: where.id,
          email: 'updated@example.com',
          fullName: 'Updated Name',
          role: Role.PATIENT,
          status: data.status || 'ACTIVE',
        });
      }),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Đăng ký Exception Filter và Global Prefix tương tự như production ở main.ts
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
    app.setGlobalPrefix('api');

    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
    jwtSecret = configService.get<string>('JWT_ACCESS_SECRET') || 'default_access_secret_123';

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Hàm tiện ích để tạo nhanh JWT token cho mục đích test phân quyền
  const generateTokenForRole = (role: Role, email = 'user@example.com', userId = 'test-uuid-123') => {
    const payload = {
      sub: userId,
      email: email,
      role: role,
    };
    return jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });
  };

  describe('Route: GET /api/users (Yêu cầu: ADMIN, DOCTOR, RECEPTIONIST)', () => {
    it('1. Trả về 401 Unauthorized khi không gửi kèm token', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('2. Trả về 401 Unauthorized khi token không hợp lệ/hết hạn', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token-string')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('3. Trả về 403 Forbidden đối với PATIENT (Không đủ quyền hạn)', async () => {
      const patientToken = generateTokenForRole(Role.PATIENT, 'patient@test.com');
      
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.message).toBe('Bạn không có quyền truy cập vào tài nguyên này!');
      expect(response.body.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('4. Trả về 200 OK đối với DOCTOR (Quyền hạn hợp lệ)', async () => {
      const doctorToken = generateTokenForRole(Role.DOCTOR, 'doctor@test.com');

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('5. Trả về 200 OK đối với ADMIN (Quyền hạn hợp lệ)', async () => {
      const adminToken = generateTokenForRole(Role.ADMIN, 'admin@test.com');

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Route: POST /api/users (Yêu cầu: ADMIN)', () => {
    const newUserDto = {
      email: 'newstaff@test.com',
      password: 'password123',
      fullName: 'New Staff Member',
      phone: '0987654321',
      birthDate: '1990-01-01',
      role: Role.DOCTOR,
    };

    it('1. Trả về 403 Forbidden đối với DOCTOR (Không có quyền tạo người dùng mới)', async () => {
      const doctorToken = generateTokenForRole(Role.DOCTOR, 'doctor@test.com');

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(newUserDto)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.message).toBe('Bạn không có quyền truy cập vào tài nguyên này!');
    });

    it('2. Trả về 201 Created đối với ADMIN (Đủ quyền tạo)', async () => {
      const adminToken = generateTokenForRole(Role.ADMIN, 'admin@test.com');

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.message).toBe('Tạo tài khoản thành công');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(newUserDto.email);
    });
  });

  describe('Route: POST /api/users/:id/lock (Yêu cầu: ADMIN)', () => {
    it('1. Trả về 403 Forbidden đối với RECEPTIONIST (Không được quyền khóa tài khoản)', async () => {
      const receptionistToken = generateTokenForRole(Role.RECEPTIONIST, 'receptionist@test.com');

      const response = await request(app.getHttpServer())
        .post('/api/users/some-uuid/lock')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.message).toBe('Bạn không có quyền truy cập vào tài nguyên này!');
    });

    it('2. Trả về 201 Created/200 OK đối với ADMIN (Khóa tài khoản thành công)', async () => {
      const adminToken = generateTokenForRole(Role.ADMIN, 'admin@test.com');

      const response = await request(app.getHttpServer())
        .post('/api/users/some-uuid/lock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED); // NestJS mặc định POST trả về 201

      expect(response.body.message).toBe('Khóa tài khoản thành công');
      expect(response.body.user.status).toBe('LOCKED');
    });
  });
});
