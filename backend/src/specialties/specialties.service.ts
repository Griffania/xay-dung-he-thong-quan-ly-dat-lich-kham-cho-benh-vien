import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}
//Tạo mới một chuyên khoa

  async create(createSpecialtyDto: CreateSpecialtyDto) {
    const { name, description } = createSpecialtyDto;
    // Kiểm tra tên chuyên khoa trùng lặp
    const existingSpecialty = await this.prisma.specialty.findUnique({
      where: { name },
    });
    if (existingSpecialty) {
      throw new ConflictException(
        'Tên chuyên khoa này đã tồn tại trên hệ thống!',
      );
    }
    // Tiến hành tạo mới
    const specialty = await this.prisma.specialty.create({
      data: {
        name,
        description,
        isActive: true, // Mặc định kích hoạt khi tạo mới
      },
    });
    return {
      message: 'Tạo chuyên khoa thành công',
      data: specialty,
    };
  }
//Truy vấn danh sách chuyên khoa có bộ lọc, tìm kiếm và phân trang

  async findAll(query: {
    search?: string;
    isActive?: string;
  }) {
    const where: any = {};

    // Tìm kiếm theo tên chuyên khoa (không phân biệt hoa thường)
    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Bộ lọc trạng thái hoạt động (isActive)
    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === 'true';
    }

    // Lấy song song dữ liệu và tổng số bản ghi phục vụ phân trang
    const [specialties, total] = await Promise.all([
      this.prisma.specialty.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // Mới tạo hiển thị lên đầu
      }),
      this.prisma.specialty.count({ where }),
    ]);

    return {
      data: specialties,
      meta: {
        total,
      },
    };
  }
 //Lấy chi tiết thông tin một chuyên khoa theo ID
  async findOne(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
    });

    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa yêu cầu!');
    }

    return specialty;
  }
//Cập nhật thông tin chuyên khoa
  async update(id: string, updateSpecialtyDto: UpdateSpecialtyDto) {
    // Kiểm tra sự tồn tại của chuyên khoa
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
    });
    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa để cập nhật!');
    }

    // Nếu thay đổi tên chuyên khoa, kiểm tra xem tên mới có trùng lặp không
    if (updateSpecialtyDto.name && updateSpecialtyDto.name !== specialty.name) {
      const existingSpecialty = await this.prisma.specialty.findUnique({
        where: { name: updateSpecialtyDto.name },
      });
      if (existingSpecialty) {
        throw new ConflictException(
          'Tên chuyên khoa mới đã tồn tại trên hệ thống!',
        );
      }
    }

    // Tiến hành cập nhật
    const updatedSpecialty = await this.prisma.specialty.update({
      where: { id },
      data: updateSpecialtyDto,
    });

    return {
      message: 'Cập nhật chuyên khoa thành công',
      data: updatedSpecialty,
    };
  }
//Vô hiệu hóa một chuyên khoa (ngưng hoạt động)

  async disable(id: string) {
    // Kiểm tra sự tồn tại
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
    });
    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa!');
    }
    const updatedSpecialty = await this.prisma.specialty.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      message: 'Vô hiệu hóa chuyên khoa thành công',
      data: updatedSpecialty,
    };
  }
// Kích hoạt lại chuyên khoa

  async enable(id: string) {
    // Kiểm tra sự tồn tại
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
    });
    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa!');
    }

    const updatedSpecialty = await this.prisma.specialty.update({
      where: { id },
      data: { isActive: true },
    });

    return {
      message: 'Kích hoạt lại chuyên khoa thành công',
      data: updatedSpecialty,
    };
  }
}
