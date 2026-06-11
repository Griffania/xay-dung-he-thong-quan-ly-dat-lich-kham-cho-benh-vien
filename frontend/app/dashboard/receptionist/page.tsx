'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  UserCheck, 
  Activity, 
  QrCode, 
  Printer, 
  ArrowRight,
  ClipboardCheck,
  Building
} from 'lucide-react';

interface Booking {
  id: string;
  patientName: string;
  phone: string;
  doctor: string;
  specialty: string;
  time: string;
  status: 'BOOKED' | 'CHECKED_IN';
}

export default function ReceptionistDashboard() {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[] | null>(null);
  const [checkedInTicket, setCheckedInTicket] = useState<{
    no: number;
    patientName: string;
    doctor: string;
    specialty: string;
    queueNo: string;
  } | null>(null);

  const mockBookings: Booking[] = [
    { id: 'B-1024', patientName: 'Nguyễn Hoàng Nam', phone: '0912345678', doctor: 'BS. Lê Mạnh Cường', specialty: 'Khoa Tim Mạch', time: '13:30', status: 'BOOKED' },
    { id: 'B-1089', patientName: 'Vũ Thị Hồng', phone: '0912345678', doctor: 'BS. Phạm Minh Đức', specialty: 'Khoa Nhi', time: '14:00', status: 'BOOKED' },
    { id: 'B-2015', patientName: 'Đặng Thanh Sơn', phone: '0987654321', doctor: 'BS. Lê Mạnh Cường', specialty: 'Khoa Tim Mạch', time: '14:30', status: 'BOOKED' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) return;
    
    // Tìm kiếm các ca đặt lịch trùng khớp sđt
    const matches = mockBookings.filter(b => b.phone.includes(searchPhone) || b.patientName.toLowerCase().includes(searchPhone.toLowerCase()));
    setSearchResults(matches);
    setCheckedInTicket(null);
  };

  const handleCheckIn = (booking: Booking, index: number) => {
    // Đổi trạng thái lịch hẹn
    if (searchResults) {
      const updated = [...searchResults];
      updated[index] = { ...booking, status: 'CHECKED_IN' };
      setSearchResults(updated);
    }

    // Cấp số thứ tự hàng đợi
    const randomQueueNo = `TM-${Math.floor(Math.random() * 80) + 100}`;
    setCheckedInTicket({
      no: Math.floor(Math.random() * 20) + 5,
      patientName: booking.patientName,
      doctor: booking.doctor,
      specialty: booking.specialty,
      queueNo: randomQueueNo
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-amber-400 bg-clip-text text-transparent">
          Cổng Tiếp Đón Bệnh Nhân (Lễ tân)
        </h1>
        <p className="text-slate-400 mt-1">Tìm kiếm lịch hẹn đặt trước, thực hiện check-in và phân phối số thứ tự khám</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Tiếp đón hôm nay</span>
            <span className="text-3xl font-black text-white mt-1 block">48</span>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Chờ Check-in</span>
            <span className="text-3xl font-black text-indigo-400 mt-1 block">9 Bệnh nhân</span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Phòng khám hoạt động</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">6 Phòng khám</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Search Booking & Check-in */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              Tra cứu & Tiếp đón bệnh nhân
            </h2>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within:text-amber-400 transition-colors">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="Nhập số điện thoại hoặc Tên bệnh nhân..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 rounded-2xl text-white outline-none transition-all text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-2xl transition-all text-sm cursor-pointer shadow-lg shadow-amber-950/40"
              >
                Tìm kiếm
              </button>
            </form>

            {/* Results display */}
            {searchResults !== null && (
              <div className="space-y-3">
                <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Kết quả tìm thấy ({searchResults.length})</span>
                {searchResults.length === 0 ? (
                  <p className="text-slate-500 text-sm">Không tìm thấy lịch hẹn trùng khớp cho hôm nay.</p>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((b, idx) => (
                      <div key={b.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex justify-between items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm">{b.patientName}</h3>
                            <span className="text-[10px] text-slate-500 font-mono">#{b.id}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">SĐT: {b.phone} • {b.time}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{b.doctor} ({b.specialty})</p>
                        </div>

                        {b.status === 'BOOKED' ? (
                          <button
                            onClick={() => handleCheckIn(b, idx)}
                            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-all cursor-pointer"
                          >
                            <span>Check-in</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <ClipboardCheck className="w-4 h-4" />
                            Đã Check-in
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Generator & Queue Balance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Printing Card */}
          {checkedInTicket && (
            <div className="p-6 bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-500/20 rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <QrCode className="w-24 h-24 text-white" />
              </div>
              
              <div className="border-b border-indigo-500/10 pb-4 mb-4 text-center">
                <span className="text-indigo-400 font-black text-xs uppercase tracking-wider">Phiếu Số Thứ Tự Khám</span>
                <h3 className="text-3xl font-black text-white mt-2 tracking-widest">{checkedInTicket.queueNo}</h3>
                <span className="text-[10px] text-slate-500 block mt-1">Hệ thống Y tế Clinic</span>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Bệnh nhân:</span>
                  <span className="font-bold text-white">{checkedInTicket.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Chuyên khoa:</span>
                  <span className="font-semibold">{checkedInTicket.specialty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Bác sĩ phụ trách:</span>
                  <span className="font-semibold">{checkedInTicket.doctor}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-2 mt-2">
                  <span className="text-slate-500 text-xs">Số người đợi phía trước:</span>
                  <span className="font-black text-amber-400">{checkedInTicket.no} người</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-950/50">
                  <Printer className="w-3.5 h-3.5" />
                  In phiếu khám
                </button>
              </div>
            </div>
          )}

          {/* Doctor clinic load balance tracker */}
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Mật độ hàng đợi các phòng khám
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">BS. Lê Mạnh Cường (Tim Mạch)</span>
                  <span className="text-indigo-400">8 Chờ khám</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="w-[80%] h-full bg-indigo-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">BS. Phạm Minh Đức (Khoa Nhi)</span>
                  <span className="text-emerald-400">3 Chờ khám</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="w-[30%] h-full bg-emerald-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">BS. Nguyễn Văn A (Tai Mũi Họng)</span>
                  <span className="text-amber-400">5 Chờ khám</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="w-[50%] h-full bg-amber-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
