'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  FileText, 
  CheckCircle, 
  PlusCircle,
  HelpCircle,
  Building,
  HeartPulse
} from 'lucide-react';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'CONFIRMED' | 'PENDING' | 'COMPLETED';
}

interface PastRecord {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: 'A-901', doctorName: 'BS. Lê Mạnh Cường', specialty: 'Khoa Tim Mạch', date: '08/06/2026', time: '09:00 - 09:30', status: 'CONFIRMED' },
    { id: 'A-456', doctorName: 'BS. Nguyễn Văn Hùng', specialty: 'Khoa Nội', date: '20/05/2026', time: '14:30 - 15:00', status: 'COMPLETED' },
  ]);

  const pastRecords: PastRecord[] = [
    { id: 'MR-019', date: '20/05/2026', doctor: 'BS. Nguyễn Văn Hùng', diagnosis: 'Trào ngược dạ dày thực quản cấp tính', treatment: 'Uống thuốc sau ăn, kiêng đồ chua cay, chất kích thích', prescription: 'Omeprazole 20mg (14 viên) - Uống 1 viên trước ăn sáng' },
    { id: 'MR-008', date: '12/03/2026', doctor: 'BS. Lê Mạnh Cường', diagnosis: 'Rối loạn nhịp tim nhẹ do stress', treatment: 'Hạn chế caffein, làm việc điều độ, ngủ đủ giấc', prescription: 'Magnesium B6 (30 viên) - Uống 2 viên chia 2 lần/ngày' },
  ];

  // Trạng thái dữ liệu từ API
  const [specialtiesList, setSpecialtiesList] = useState<{ id: string; name: string }[]>([]);
  const [doctorsList, setDoctorsList] = useState<{ id: string; user: { fullName: string } }[]>([]);
  const [slotsList, setSlotsList] = useState<{ id: string; startTime: string; endTime: string }[]>([]);

  // Trạng thái biểu mẫu đặt lịch khám
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [successBooking, setSuccessBooking] = useState<string | null>(null);

  // Lấy danh sách chuyên khoa khi component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await api.get('/specialties?isActive=true&limit=100');
        setSpecialtiesList(response.data.data || []);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách chuyên khoa:', err);
      }
    };
    fetchSpecialties();
  }, []);

  // Lấy danh sách bác sĩ thuộc chuyên khoa được chọn
  useEffect(() => {
    if (!selectedSpecialtyId) {
      setDoctorsList([]);
      setSelectedDoctorId('');
      return;
    }
    const fetchDoctors = async () => {
      try {
        const response = await api.get(`/doctors?specialtyId=${selectedSpecialtyId}&isActive=true&limit=100`);
        setDoctorsList(response.data.data || []);
        setSelectedDoctorId('');
      } catch (err) {
        console.error('Lỗi khi lấy danh sách bác sĩ:', err);
      }
    };
    fetchDoctors();
  }, [selectedSpecialtyId]);

  // Lấy danh sách khung giờ trống của bác sĩ theo ngày
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setSlotsList([]);
      setSelectedSlotId('');
      return;
    }
    const fetchSlots = async () => {
      try {
        const response = await api.get(`/slots/available?doctorId=${selectedDoctorId}&date=${selectedDate}`);
        setSlotsList(response.data || []);
        setSelectedSlotId('');
      } catch (err) {
        console.error('Lỗi khi lấy danh sách slot khả dụng:', err);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // Helper định dạng giờ từ chuỗi ISO trả về từ Prisma (mốc 1970-01-01 UTC)
  const formatSlotTime = (isoTimeStr: string) => {
    const dateObj = new Date(isoTimeStr);
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');
    const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const displayTimeRange = (start: string, end: string) => {
    return `${formatSlotTime(start)} - ${formatSlotTime(end)}`;
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecialtyId || !selectedDoctorId || !selectedDate || !selectedSlotId) return;

    setIsBooking(true);
    setTimeout(() => {
      const docName = doctorsList.find(d => d.id === selectedDoctorId)?.user.fullName || 'Bác sĩ';
      const specName = specialtiesList.find(s => s.id === selectedSpecialtyId)?.name || 'Chuyên khoa';
      const chosenSlot = slotsList.find(s => s.id === selectedSlotId);
      const slotTimeStr = chosenSlot ? displayTimeRange(chosenSlot.startTime, chosenSlot.endTime) : '';

      const newAppt: Appointment = {
        id: `A-${Math.floor(Math.random() * 800) + 100}`,
        doctorName: docName,
        specialty: specName,
        date: selectedDate.split('-').reverse().join('/'), // Convert YYYY-MM-DD to DD/MM/YYYY
        time: slotTimeStr,
        status: 'PENDING'
      };

      setAppointments(prev => [newAppt, ...prev]);
      setSuccessBooking(`Đăng ký đặt lịch khám thành công với ${docName} lúc ${slotTimeStr} ngày ${newAppt.date}. Vui lòng chờ xác nhận.`);
      
      // Reset form
      setSelectedSpecialtyId('');
      setSelectedDoctorId('');
      setSelectedDate('');
      setSelectedSlotId('');
      setIsBooking(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
          Cổng Dịch Vụ Bệnh Nhân
        </h1>
        <p className="text-slate-400 mt-1">Đặt lịch hẹn khám bệnh trực tuyến, theo dõi tiến độ và xem lại bệnh án cá nhân</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Lịch Hẹn Sắp Tới</span>
            <span className="text-lg font-bold text-white mt-1 block">
              {appointments.find(a => a.status === 'CONFIRMED') ? '08/06/2026 (09:00)' : 'Chưa có lịch hẹn'}
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Số Ca Khám Đã Đặt</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">{appointments.length}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Hồ Sơ Y Khoa Của Tôi</span>
            <span className="text-3xl font-black text-purple-400 mt-1 block">{pastRecords.length} bệnh án</span>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Booking Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Đặt lịch hẹn mới
            </h2>

            {successBooking && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-xl flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successBooking}</span>
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-3.5">
              {/* Specialty Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350 block">Chọn chuyên khoa khám</label>
                <select
                  required
                  value={selectedSpecialtyId}
                  onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-white outline-none transition-all text-xs"
                >
                  <option value="" disabled className="bg-slate-950">-- Chọn chuyên khoa --</option>
                  {specialtiesList.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-950 text-slate-300">{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Doctor Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350 block">Bác sĩ phụ trách</label>
                <select
                  required
                  disabled={!selectedSpecialtyId}
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white outline-none transition-all text-xs"
                >
                  <option value="" disabled className="bg-slate-950">-- Chọn bác sĩ --</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id} className="bg-slate-950 text-slate-300">{d.user.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Date selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350 block">Ngày đặt khám</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-white outline-none transition-all text-xs"
                />
              </div>

              {/* Slot select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350 block">Chọn khung giờ khám</label>
                <select
                  required
                  disabled={!selectedDate || !selectedDoctorId}
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white outline-none transition-all text-xs"
                >
                  <option value="" disabled className="bg-slate-950">-- Chọn giờ --</option>
                  {slotsList.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-950 text-slate-300">
                      {displayTimeRange(s.startTime, s.endTime)}
                    </option>
                  ))}
                  {selectedDate && selectedDoctorId && slotsList.length === 0 && (
                    <option value="" disabled className="bg-slate-950 text-amber-400">
                      Không có ca khám khả dụng
                    </option>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={isBooking}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all text-xs cursor-pointer shadow-lg shadow-indigo-950/40"
              >
                {isBooking ? 'Đang gửi đăng ký...' : 'Xác nhận đặt lịch hẹn'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Appointment List & Health Record history */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upcoming & All booked list */}
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Lịch khám hẹn của tôi
            </h2>
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">{a.doctorName}</h3>
                    <p className="text-xs text-slate-500 mt-1">{a.specialty}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {a.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {a.time}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    a.status === 'CONFIRMED' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' :
                    a.status === 'COMPLETED' ? 'bg-slate-800 border-slate-700 text-slate-400' :
                    'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  }`}>
                    {a.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : a.status === 'COMPLETED' ? 'ĐÃ KHÁM' : 'ĐANG CHỜ'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Past Health Records */}
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Hồ sơ bệnh án cá nhân
            </h2>
            <div className="space-y-4">
              {pastRecords.map((r) => (
                <div key={r.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Lịch sử khám ngày {r.date}</span>
                      <h4 className="font-bold text-sm text-white mt-0.5">{r.doctor}</h4>
                    </div>
                    <span className="text-xs text-indigo-400 font-semibold">{r.id}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-slate-400"><strong className="text-slate-300">Chẩn đoán:</strong> {r.diagnosis}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Phương pháp điều trị:</strong> {r.treatment}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Đơn thuốc:</strong> <span className="font-mono text-emerald-300">{r.prescription}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
