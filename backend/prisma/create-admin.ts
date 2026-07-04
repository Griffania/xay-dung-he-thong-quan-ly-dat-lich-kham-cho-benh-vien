import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('=== KHỞI TẠO TÀI KHOẢN ADMIN ===\n');
  // Lấy thông tin từ đối số dòng lệnh hoặc hỏi người dùng
  let email = process.argv[2];
  let password = process.argv[3];
  let fullName = process.argv[4];
  if (!email || !password || !fullName) {
    console.log('Vui lòng cung cấp thông tin tài khoản admin (hoặc nhấn Enter để dùng mặc định):');
    if (!email) {
      email = await askQuestion('Email [admin@gmail.com]: ');
      email = email.trim() || 'admin@hospital.com';
    }
    if (!password) {
      password = await askQuestion('Mật khẩu [Admin@123]: ');
      password = password || 'Admin@123';
    }
    if (!fullName) {
      fullName = await askQuestion('Họ và tên [Quản trị viên hệ thống]: ');
      fullName = fullName.trim() || 'Quản trị viên hệ thống';
    }
  }
  // 1. Kiểm tra định dạng email cơ bản
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Lỗi: Email không đúng định dạng!');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Lỗi: Mật khẩu phải có ít nhất 6 ký tự!');
    process.exit(1);
  }
  // 2. Tìm hoặc tạo Role ADMIN
  let adminRole = await prisma.role.findUnique({
    where: { code: 'ADMIN' }
  });
  if (!adminRole) {
    console.log('Không tìm thấy Role ADMIN, đang tạo mới...');
    adminRole = await prisma.role.create({
      data: {
        code: 'ADMIN',
        name: 'Quản trị viên',
        description: 'Quản lý toàn bộ hệ thống, danh mục chuyên khoa'
      }
    });
  }
  // 3. Kiểm tra xem User với email này đã tồn tại chưa
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  if (existingUser) {
    console.log(`Tài khoản với email ${email} đã tồn tại!`);
    const updateChoice = await askQuestion('Bạn có muốn cập nhật thông tin và mật khẩu cho tài khoản này không? (y/n): ');
    if (updateChoice.toLowerCase() === 'y' || updateChoice.toLowerCase() === 'yes') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hashedPassword,
          fullName,
          roleId: adminRole.id,
          status: 'ACTIVE'
        }
      });
      console.log(`\nCập nhật tài khoản Admin thành công!`);
      console.log(`Email: ${email}`);
      console.log(`Mật khẩu mới: ${password}`);
    } else {
      console.log('Đã hủy thao tác.');
    }
  } else {
    // 4. Tạo tài khoản Admin mới
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        roleId: adminRole.id,
        status: 'ACTIVE'
      }
    });

    console.log(`\nKhởi tạo tài khoản Admin thành công!`);
    console.log(`ID: ${newAdmin.id}`);
    console.log(`Email: ${email}`);
    console.log(`Mật khẩu: ${password}`);
    console.log(`Họ tên: ${fullName}`);
  }
}
main()
  .catch((e) => {
    console.error('Đã xảy ra lỗi trong quá trình khởi tạo:', e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
