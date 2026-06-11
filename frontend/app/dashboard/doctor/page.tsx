'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  Volume2, 
  Search,
  PenTool
} from 'lucide-react';

interface PatientQueue {
  no: number;
  id: string;
  name: string;
  phone: string;
  time: string;
  status: 'WAITING' | 'EXAMINING' | 'COMPLETED';
}

export default function DoctorDashboard() {
  const [queue, setQueue] = useState<PatientQueue[]>([
    { no: 1, id: 'P004', name: 'Trần Thị Thảo', phone: '0981 123 456', time: '08:15', status: 'COMPLETED' },
    { no: 2, id: 'P012', name: 'Nguyễn Văn Hùng', phone: '0912 345 678', time: '08:45', status: 'COMPLETED' },
    { no: 3, id: 'P019', name: 'Phạm Minh Đức', phone: '0934 567 890', time: '09:30', status: 'EXAMINING' },
    { no: 4, id: 'P022', name: 'Hoàng Ngọc Ánh', phone: '0905 678 901', time: '10:00', status: 'WAITING' },
    { no: 5, id: 'P025', name: 'Vũ Quốc Bảo', phone: '0978 901 234', time: '10:15', status: 'WAITING' },
  ]);

  const [selectedPatient, setSelectedPatient] = useState<PatientQueue | null>(
    queue.find(p => p.status === 'EXAMINING') || null
  );

  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Gọi khám bệnh nhân tiếp theo hoặc chọn bệnh nhân cụ thể
  const handleExamine = (patient: PatientQueue) => {
    setQueue(prev => prev.map(p => {
      if (p.id === patient.id) return { ...p, status: 'EXAMINING' };
      if (p.status === 'EXAMINING') return { ...p, status: 'WAITING' }; // Chuyển bệnh nhân cũ về hàng đợi
      return p;
    }));
    setSelectedPatient({ ...patient, status: 'EXAMINING' });
    setDiagnosis('');
    setTreatment('');
    setPrescription('');
    setSuccessMsg(null);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setIsSaving(true);
    setTimeout(() => {
      // Chuyển trạng thái bệnh nhân trong hàng đợi thành COMPLETED
      setQueue(prev => prev.map(p => {
        if (p.id === selectedPatient.id) return { ...p, status: 'COMPLETED' };
        return p;
      }));
      setSuccessMsg(`Lưu hồ sơ bệnh án thành công cho bệnh nhân: ${selectedPatient.name}`);
      setIsSaving(false);
      setSelectedPatient(null);
      setDiagnosis('');
      setTreatment('');
      setPrescription('');
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
          Bảng Điều phối Khám bệnh (Bác sĩ)
        </h1>
        <p className="text-slate-400 mt-1">Quản lý hàng đợi bệnh nhân và lập kết quả khám điều trị</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Ca Khám Hôm Nay</span>
            <span className="text-3xl font-black text-white mt-1 block">18</span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Đã Hoàn Thành</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">12</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase block">Đang Chờ Khám</span>
            <span className="text-3xl font-black text-amber-400 mt-1 block">5 Bệnh nhân</span>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Waiting list queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/60">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Hàng đợi phòng khám
              </h2>
              <span className="px-2 py-0.5 bg-slate-850 text-slate-400 text-xs font-semibold rounded-lg">
                Hôm nay
              </span>
            </div>

            {/* Live Queue Cards */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {queue.map((p) => (
                <div 
                  key={p.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    p.status === 'EXAMINING'
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-950/20 shadow-lg'
                      : p.status === 'COMPLETED'
                      ? 'bg-slate-900/10 border-slate-800/50 opacity-60'
                      : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 font-black text-xs rounded-xl flex items-center justify-center ${
                        p.status === 'EXAMINING' ? 'bg-emerald-500 text-slate-950' : 
                        p.status === 'COMPLETED' ? 'bg-slate-800 text-slate-400' : 'bg-slate-900 text-slate-300'
                      }`}>
                        #{p.no}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{p.phone} • Checkin: {p.time}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      p.status === 'EXAMINING' ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' :
                      p.status === 'COMPLETED' ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/10 text-amber-300'
                    }`}>
                      {p.status === 'EXAMINING' ? 'ĐANG KHÁM' : p.status === 'COMPLETED' ? 'ĐÃ KHÁM' : 'ĐANG CHỜ'}
                    </span>
                  </div>

                  {p.status === 'WAITING' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleExamine(p)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Mời vào khám
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Diagnosis & Record Creation */}
        <div className="lg:col-span-3">
          {successMsg && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {selectedPatient ? (
            <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Lập Bệnh Án Điện Tử</h2>
                    <p className="text-xs text-slate-400">Đang khám bệnh nhân: <strong className="text-emerald-400">{selectedPatient.name}</strong> ({selectedPatient.id})</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveRecord} className="space-y-4">
                {/* Diagnosis field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Chẩn đoán y khoa</label>
                  <textarea
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Nhập chẩn đoán lâm sàng/cận lâm sàng (Ví dụ: Viêm họng cấp tính, sốt siêu vi)"
                    rows={3}
                    className="w-full p-3.5 bg-slate-950/40 border border-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 rounded-2xl text-white placeholder-slate-650 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Treatment field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Phương pháp điều trị / Ghi chú</label>
                  <textarea
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Ví dụ: Nghỉ ngơi tại giường, uống nhiều nước ấm, theo dõi thân nhiệt"
                    rows={3}
                    className="w-full p-3.5 bg-slate-950/40 border border-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 rounded-2xl text-white placeholder-slate-650 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Prescription field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Đơn thuốc chỉ định</label>
                  <textarea
                    required
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="Ví dụ: Paracetamol 500mg (15 viên) - Uống 1 viên khi sốt > 38.5 độ C"
                    rows={3}
                    className="w-full p-3.5 bg-slate-950/40 border border-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 rounded-2xl text-white placeholder-slate-650 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/60 transition-all duration-200 cursor-pointer"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <PenTool className="w-4 h-4" />
                        <span>Ký số & Lưu Bệnh Án</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-center text-slate-500 min-h-[400px]">
              <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white mb-1">Chưa có ca khám nào được chọn</h3>
              <p className="text-sm text-slate-400 max-w-sm">Hãy chọn một bệnh nhân trong hàng đợi phòng khám bên trái và nhấn &quot;Mời vào khám&quot; để mở bệnh án điện tử.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
