import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const roles = [
        {code: 'ADMIN',name: 'Quản trị viên',description: 'Quản lý toàn bộ hệ thống, danh mục chuyên khoa'},
        {code: 'DOCTOR',name: 'Bác sĩ',description: 'Khám bệnh, quản lý lịch khám và lên bệnh án'},
        {code: 'RECEPTIONIST',name:  'Lễ tân',description: 'Xác nhận lịch, check-in, điều phối hàng đợi'},
        {code: 'PATIENT',name: 'Bệnh nhân',description: 'Đặt lịch hẹn khám trực tuyến và xem hồ sơ khám bệnh'},
    ];
     console.log('đang khởi tạo role mặc định');
     for(const role of roles){
        await prisma.role.upsert({
            where:{code: role.code},
            update:{},
            create:role,
        });
     }
     console.log('seed dữ liệu vai trò thành công !');
}
main().catch((e)=>{
    console.error(e);
    process.exit(1);
}).finally(async()=>{
    await prisma.$disconnect();
});