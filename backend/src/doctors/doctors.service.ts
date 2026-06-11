import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Băm mật khẩu người dùng trước khi lưu vào database
   * @param password Mật khẩu thô
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
  /**
   * Loại bỏ các trường nhạy cảm khỏi thông tin tài khoản người dùng
   * @param user Đối tượng người dùng lấy từ DB
   */
  private sanitizeUser(user: any) {
    if (!user) return null;
    const { passwordHash, refreshTokenHash, ...sanitized } = user;
    return sanitized;
  }
  /**
   * Tạo mới một hồ sơ Bác sĩ (bao gồm tài khoản User với vai trò DOCTOR)
   * Thực hiện trong 1 database transaction để đảm bảo tính toàn vẹn
   * @param createDoctorDto Dữ liệu tạo bác sĩ
   */
  async create(createDoctorDto: CreateDoctorDto) {
    const {
      email,
      password,
      fullName,
      phone,
      birthDate,
      specialtyId,
      licenseNo,
      bio,
    } = createDoctorDto;

    // 1. Kiểm tra email trùng lặp trên bảng users
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trên hệ thống!');
    }

    // 2. Kiểm tra sự tồn tại của chuyên khoa
    const specialty = await this.prisma.specialty.findUnique({
      where: { id: specialtyId },
    });
    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa được chỉ định!');
    }

    // 3. Mã hóa mật khẩu đăng nhập của bác sĩ
    const passwordHash = await this.hashPassword(password);

    // 4. Khởi chạy transaction tạo tài khoản User và hồ sơ Doctor liên kết
    const result = await this.prisma.$transaction(async (tx) => {
      // 4a. Tạo User mới
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          birthDate: birthDate ? new Date(birthDate) : null,
          role: Role.DOCTOR, // Thiết lập vai trò bắt buộc là DOCTOR
          status: UserStatus.ACTIVE,
        },
      });

      // 4b. Tạo hồ sơ chuyên môn Bác sĩ
      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialtyId,
          licenseNo,
          bio,
          isActive: true, // Mặc định hoạt động
        },
      });

      return { user, doctor };
    });

    // 5. Trả về kết quả sau khi loại bỏ mật khẩu băm
    return {
      message: 'Tạo tài khoản bác sĩ thành công',
      data: {
        id: result.doctor.id,
        userId: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        phone: result.user.phone,
        birthDate: result.user.birthDate,
        licenseNo: result.doctor.licenseNo,
        bio: result.doctor.bio,
        isActive: result.doctor.isActive,
        specialty: {
          id: specialty.id,
          name: specialty.name,
        },
        createdAt: result.doctor.createdAt,
      },
    };
  }
  /**
   * Truy vấn danh sách bác sĩ với các điều kiện lọc và phân trang
   * @param query Các filter tìm kiếm, chuyên khoa, trạng thái và phân trang
   */
  async findAll(query: {
    search?: string;
    specialtyId?: string;
    isActive?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tìm kiếm tương đối theo tên bác sĩ, email, sđt hoặc số giấy phép
    if (query.search) {
      where.OR = [
        {
          user: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
        {
          licenseNo: { contains: query.search, mode: 'insensitive' },
        },
      ];
    }

    // Lọc theo Chuyên khoa
    if (query.specialtyId) {
      where.specialtyId = query.specialtyId;
    }

    // Lọc theo trạng thái hoạt động của bác sĩ
    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === 'true';
    }

    // Thực hiện truy vấn song song để tăng hiệu năng
    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: {
          user: true, // Kèm thông tin tài khoản cơ bản
          specialty: true, // Kèm thông tin chuyên khoa
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    // Format lại dữ liệu trả về (ẩn các hash mật khẩu)
    const formattedData = doctors.map((doc) => ({
      id: doc.id,
      userId: doc.userId,
      licenseNo: doc.licenseNo,
      bio: doc.bio,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      user: this.sanitizeUser(doc.user),
      specialty: {
        id: doc.specialty.id,
        name: doc.specialty.name,
        isActive: doc.specialty.isActive,
      },
    }));

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * Lấy chi tiết thông tin một bác sĩ theo ID của hồ sơ bác sĩ
   * @param id ID của hồ sơ bác sĩ
   */
  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: true,
        specialty: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ yêu cầu!');
    }

    return {
      id: doctor.id,
      userId: doctor.userId,
      licenseNo: doctor.licenseNo,
      bio: doctor.bio,
      isActive: doctor.isActive,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
      user: this.sanitizeUser(doctor.user),
      specialty: {
        id: doctor.specialty.id,
        name: doctor.specialty.name,
        isActive: doctor.specialty.isActive,
      },
    };
  }
  /**
   * Cập nhật thông tin bác sĩ (bao gồm thông tin cá nhân ở bảng User và chuyên môn ở bảng Doctor)
   * @param id ID của hồ sơ bác sĩ
   * @param updateDoctorDto Dữ liệu cần cập nhật
   */
  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    // 1. Kiểm tra sự tồn tại của bác sĩ
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ để cập nhật!');
    }

    // 2. Kiểm tra nếu có cập nhật chuyên khoa thì xem chuyên khoa đó có tồn tại không
    if (updateDoctorDto.specialtyId) {
      const specialty = await this.prisma.specialty.findUnique({
        where: { id: updateDoctorDto.specialtyId },
      });
      if (!specialty) {
        throw new NotFoundException('Không tìm thấy chuyên khoa mới được chỉ định!');
      }
    }

    const { fullName, phone, birthDate, specialtyId, licenseNo, bio } =
      updateDoctorDto;

    // 3. Tiến hành cập nhật bằng Transaction
    await this.prisma.$transaction(async (tx) => {
      // Cập nhật thông tin cá nhân
      if (fullName !== undefined || phone !== undefined || birthDate !== undefined) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: {
            fullName,
            phone,
            birthDate: birthDate ? new Date(birthDate) : undefined,
          },
        });
      }

      // Cập nhật thông tin chuyên môn của bác sĩ
      if (specialtyId !== undefined || licenseNo !== undefined || bio !== undefined) {
        await tx.doctor.update({
          where: { id },
          data: {
            specialtyId,
            licenseNo,
            bio,
          },
        });
      }
    });

    // 4. Trả về thông tin bác sĩ sau khi cập nhật thành công
    return {
      message: 'Cập nhật thông tin bác sĩ thành công',
      data: await this.findOne(id),
    };
  }
  /**
   * Gán chuyên khoa khác cho Bác sĩ
   * @param id ID của hồ sơ bác sĩ
   * @param specialtyId ID chuyên khoa cần gán
   */
  async assignSpecialty(id: string, specialtyId: string) {
    // 1. Kiểm tra sự tồn tại của bác sĩ
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ!');
    }
    // 2. Kiểm tra sự tồn tại của chuyên khoa
    const specialty = await this.prisma.specialty.findUnique({
      where: { id: specialtyId },
    });
    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa yêu cầu!');
    }
    // 3. Tiến hành cập nhật
    const updatedDoctor = await this.prisma.doctor.update({
      where: { id },
      data: { specialtyId },
      include: {
        user: true,
        specialty: true,
      },
    });
    return {
      message: 'Gán chuyên khoa cho bác sĩ thành công',
      data: {
        id: updatedDoctor.id,
        licenseNo: updatedDoctor.licenseNo,
        isActive: updatedDoctor.isActive,
        user: this.sanitizeUser(updatedDoctor.user),
        specialty: {
          id: updatedDoctor.specialty.id,
          name: updatedDoctor.specialty.name,
        },
      },
    };
  }
  /**
   * Vô hiệu hóa một bác sĩ (isActive = false)
   * Vô hiệu hóa ở đây có nghĩa là ẩn bác sĩ khỏi danh sách khám, đặt lịch, v.v.
   * @param id ID của hồ sơ bác sĩ
   */
  async disable(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ!');
    }

    const updatedDoctor = await this.prisma.doctor.update({
      where: { id },
      data: { isActive: false },
      include: {
        user: true,
        specialty: true,
      },
    });

    return {
      message: 'Vô hiệu hóa bác sĩ thành công',
      data: {
        id: updatedDoctor.id,
        licenseNo: updatedDoctor.licenseNo,
        isActive: updatedDoctor.isActive,
        user: this.sanitizeUser(updatedDoctor.user),
        specialty: {
          id: updatedDoctor.specialty.id,
          name: updatedDoctor.specialty.name,
        },
      },
    };
  }
  /**
   * Kích hoạt lại bác sĩ (isActive = true)
   * @param id ID của hồ sơ bác sĩ
   */
  async enable(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ!');
    }
    const updatedDoctor = await this.prisma.doctor.update({
      where: { id },
      data: { isActive: true },
      include: {
        user: true,
        specialty: true,
      },
    });
    return {
      message: 'Kích hoạt lại bác sĩ thành công',
      data: {
        id: updatedDoctor.id,
        licenseNo: updatedDoctor.licenseNo,
        isActive: updatedDoctor.isActive,
        user: this.sanitizeUser(updatedDoctor.user),
        specialty: {
          id: updatedDoctor.specialty.id,
          name: updatedDoctor.specialty.name,
        },
      },
    };
  }
}
