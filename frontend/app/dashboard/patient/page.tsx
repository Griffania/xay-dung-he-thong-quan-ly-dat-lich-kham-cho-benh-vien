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
  HeartPulse,
  AlertCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface Appointment {
  id: string;
  doctor: {
    user: {
      fullName: string;
    };
    specialty: {
      name: string;
    };
  };
  slot: {
    date: string;
    startTime: string;
    endTime: string;
  };
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  symptoms?: string;
  createdAt: string;
}

interface MedicalRecord {
  id: string;
  doctorName: string;
  specialtyName: string;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  notes?: string;
  followUpDate?: string;
  createdAt: string;
}

export default function PatientDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Danh sách lịch hẹn và bệnh án
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pastRecords, setPastRecords] = useState<MedicalRecord[]>([]);
  const [isApptsLoading, setIsApptsLoading] = useState(false);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  // Trạng thái dữ liệu từ API để đặt lịch
  const [specialtiesList, setSpecialtiesList] = useState<{ id: string; name: string }[]>([]);
  const [doctorsList, setDoctorsList] = useState<{ id: string; user: { fullName: string } }[]>([]);
  const [slotsList, setSlotsList] = useState<{ id: string; startTime: string; endTime: string }[]>([]);

  // Trạng thái biểu mẫu đặt lịch khám
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [successBooking, setSuccessBooking] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Đọc thông tin user từ localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    }
  }, []);

  // Tải danh sách lịch hẹn và bệnh án khi có thông tin user
  const fetchAppointments = async () => {
    setIsApptsLoading(true);
    try {
      const response = await api.get('/appointments?limit=50');
      // Backend findAll trả về cấu trúc { data: appointments[], meta: ... }
      setAppointments(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch hẹn khám:', err);
    } finally {
      setIsApptsLoading(false);
    }
  };

  const fetchMedicalRecords = async (patientId: string) => {
    setIsRecordsLoading(true);
    try {
      const response = await api.get(`/medical-records/patient/${patientId}?limit=50`);
      setPastRecords(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải bệnh án:', err);
    } finally {
      setIsRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchAppointments();
      fetchMedicalRecords(currentUser.id);
    }
  }, [currentUser]);

  // Lấy danh sách chuyên khoa khi component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await api.get('/specialties?isActive=true&limit=100');
        setSpecialtiesList(response.data.data || response.data || []);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách chuyên khoa:', err);
      }
    };
    fetchSpecialties();
  }, []);

  // Lấy danh sách bác sĩ thuộc chuyên khoa được chọn
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await api.get(`/doctors?specialtyId=${selectedSpecialtyId}&isActive=true&limit=100`);
        setDoctorsList(response.data.data || response.data || []);
        setSelectedDoctorId('');
      } catch (err) {
        console.error('Lỗi khi lấy danh sách bác sĩ:', err);
      }
    };
    fetchDoctors();
  }, [selectedSpecialtyId]);

  // Lấy danh sách khung giờ trống của bác sĩ theo ngày
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await api.get(`/doctors/${selectedDoctorId}/slots/available?date=${selectedDate}`);
        setSlotsList(response.data || []);
        setSelectedSlotId('');
      } catch (err) {
        console.error('Lỗi khi lấy danh sách slot khả dụng:', err);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // Định dạng hiển thị giờ từ chuỗi ISO UTC (Ví dụ: "1970-01-01T08:30:00.000Z" -> "08:30")
  const formatSlotTime = (isoTimeStr: string) => {
    try {
      const dateObj = new Date(isoTimeStr);
      const hours = String(dateObj.getUTCHours()).padStart(2, '0');
      const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const displayTimeRange = (start: string, end: string) => {
    return `${formatSlotTime(start)} - ${formatSlotTime(end)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Hủy lịch hẹn
  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn khám này?')) return;
    try {
      await api.patch(`/appointments/${apptId}/cancel`);
      fetchAppointments();
      if (currentUser?.id) {
        fetchMedicalRecords(currentUser.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy lịch khám lúc này!');
    }
  };

  // Đăng ký đặt lịch khám
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    setIsBooking(true);
    setSuccessBooking(null);
    setBookingError(null);

    try {
      await api.post('/appointments', {
        slotId: selectedSlotId,
        symptoms: symptoms || undefined
      });

      const docName = doctorsList.find(d => d.id === selectedDoctorId)?.user.fullName || 'Bác sĩ';
      const chosenSlot = slotsList.find(s => s.id === selectedSlotId);
      const slotTimeStr = chosenSlot ? displayTimeRange(chosenSlot.startTime, chosenSlot.endTime) : '';

      setSuccessBooking(`Đăng ký thành công cuộc hẹn khám với ${docName} lúc ${slotTimeStr} ngày ${selectedDate.split('-').reverse().join('/')}. Vui lòng chờ xác nhận.`);
      
      // Reset form
      setSelectedSpecialtyId('');
      setSelectedDoctorId('');
      setSelectedDate('');
      setSelectedSlotId('');
      setSymptoms('');
      
      fetchAppointments();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đặt lịch hẹn thất bại. Vui lòng kiểm tra lại!';
      setBookingError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-black text-slate-808" style={{ fontSize: '1.875rem' }}>
            Cổng Dịch Vụ Bệnh Nhân
          </h1>
        </div>
        <button 
          onClick={() => {
            fetchAppointments();
            if (currentUser?.id) fetchMedicalRecords(currentUser.id);
          }}
          className="btn btn-secondary"
          style={{ padding: '0.625rem' }}
        >
          <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} />
        </button>
      </div>

      {/* Stats row */}
      <div className="stats-grid stats-grid-3">
        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Lịch khám kế tiếp</span>
            <span className="stats-value" style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {appointments.find(a => a.status === 'CONFIRMED') 
                ? `${formatDate(appointments.find(a => a.status === 'CONFIRMED')!.slot.date)}`
                : 'Chưa có lịch hẹn'}
            </span>
          </div>
          <div className="stats-icon-box stats-icon-blue">
            <Calendar style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Tổng ca khám đã đăng ký</span>
            <span className="stats-value" style={{ color: 'var(--color-success)' }}>{appointments.length}</span>
          </div>
          <div className="stats-icon-box stats-icon-emerald">
            <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Lịch sử bệnh án cá nhân</span>
            <span className="stats-value" style={{ color: 'var(--color-warning)' }}>{pastRecords.length} bệnh án</span>
          </div>
          <div className="stats-icon-box stats-icon-purple">
            <FileText style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 grid-cols-lg-5 gap-8">
        {/* Left Column: Booking Form */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="panel-card p-6 flex flex-col gap-4">
            <h2 className="panel-title flex items-center gap-2">
              <PlusCircle style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Đặt lịch hẹn khám trực tuyến
            </h2>

            {successBooking && (
              <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
                <CheckCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{successBooking}</span>
              </div>
            )}

            {bookingError && (
              <div className="alert alert-error" style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
                <AlertCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBook} className="flex flex-col gap-4">
              {/* Specialty Select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label uppercase">Chọn chuyên khoa</label>
                <select
                  required
                  value={selectedSpecialtyId}
                  onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                  className="select-control w-full"
                >
                  <option value="" disabled>-- Chọn chuyên khoa khám --</option>
                  {specialtiesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Doctor Select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label uppercase">Chọn Bác sĩ phụ trách</label>
                <select
                  required
                  disabled={!selectedSpecialtyId}
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="select-control w-full"
                >
                  <option value="" disabled>-- Chọn bác sĩ khám bệnh --</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id}>{d.user.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Date selection */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label uppercase">Ngày đăng ký khám</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Slot select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label uppercase">Chọn khung giờ khám trống</label>
                <select
                  required
                  disabled={!selectedDate || !selectedDoctorId}
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="select-control w-full"
                >
                  <option value="" disabled>-- Chọn giờ khám --</option>
                  {slotsList.map(s => (
                    <option key={s.id} value={s.id}>
                      {displayTimeRange(s.startTime, s.endTime)}
                    </option>
                  ))}
                  {selectedDate && selectedDoctorId && slotsList.length === 0 && (
                    <option value="" disabled style={{ color: 'var(--color-warning)' }}>
                      Bác sĩ không có ca khám khả dụng ngày này
                    </option>
                  )}
                </select>
              </div>

              {/* Symptoms description */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label uppercase">Mô tả triệu chứng bệnh lý</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Nhập triệu chứng của bạn (Ví dụ: đau họng, sốt nhẹ, đau đầu từ hôm qua...)"
                  rows={2}
                  className="emr-textarea"
                />
              </div>

              <button
                type="submit"
                disabled={isBooking || !selectedSlotId}
                className="btn btn-primary w-full"
                style={{ padding: '0.75rem' }}
              >
                {isBooking ? 'Đang gửi đăng ký...' : 'Xác nhận đặt lịch hẹn'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Appointment List & Health Record history */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Upcoming & All booked list */}
          <div className="panel-card p-6 flex flex-col gap-4">
            <h2 className="panel-title flex items-center gap-2">
              <Calendar style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Lịch khám hẹn của tôi
            </h2>
            
            {isApptsLoading ? (
              <div className="fallback-loader" style={{ minHeight: '15vh' }}>
                <div className="spinner"></div>
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Bạn chưa đăng ký lịch khám bệnh nào.</p>
            ) : (
              <div className="flex flex-col gap-3" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {appointments.map((a) => (
                  <div key={a.id} style={{ padding: '1rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      <h3 className="font-bold text-slate-808" style={{ fontSize: '0.75rem' }}>{a.doctor.user.fullName}</h3>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{a.doctor.specialty.name}</p>
                      <div className="flex gap-4 mt-2 font-medium" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Calendar style={{ width: '0.875rem', height: '0.875rem' }} /> {formatDate(a.slot.date)}</span>
                        <span className="flex items-center gap-1"><Clock style={{ width: '0.875rem', height: '0.875rem' }} /> {displayTimeRange(a.slot.startTime, a.slot.endTime)}</span>
                      </div>
                      {a.symptoms && (
                        <p className="line-clamp-1 italic" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Triệu chứng: {a.symptoms}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`badge ${
                        a.status === 'CONFIRMED' ? 'badge-admin' :
                        a.status === 'COMPLETED' ? '' :
                        a.status === 'PENDING' ? 'badge-receptionist' :
                        a.status === 'CHECKED_IN' ? 'badge-patient' :
                        a.status === 'IN_PROGRESS' ? 'badge-doctor' :
                        'badge-danger'
                      }`}>
                        {a.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : 
                         a.status === 'COMPLETED' ? 'ĐÃ KHÁM XONG' : 
                         a.status === 'PENDING' ? 'ĐANG CHỜ DUYỆT' : 
                         a.status === 'CHECKED_IN' ? 'ĐÃ CHECK-IN' :
                         a.status === 'IN_PROGRESS' ? 'ĐANG KHÁM' :
                         a.status === 'CANCELLED' ? 'ĐÃ HỦY' : 'VẮNG KHÁM'}
                      </span>

                      {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                        <button
                          onClick={() => handleCancelAppointment(a.id)}
                          style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Hủy lịch
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Health Records */}
          <div className="panel-card p-6 flex flex-col gap-4">
            <h2 className="panel-title flex items-center gap-2">
              <FileText style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Hồ sơ bệnh án cá nhân
            </h2>

            {isRecordsLoading ? (
              <div className="fallback-loader" style={{ minHeight: '15vh' }}>
                <div className="spinner"></div>
              </div>
            ) : pastRecords.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Bạn chưa có hồ sơ bệnh án nào trên hệ thống.</p>
            ) : (
              <div className="flex flex-col gap-4" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {pastRecords.map((r) => (
                  <div key={r.id} style={{ padding: '1rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lịch sử khám ngày {formatDate(r.createdAt)}</span>
                        <h4 className="font-bold text-slate-808 mt-0.5" style={{ fontSize: '0.75rem' }}>{r.doctorName}</h4>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.125rem', fontWeight: 600, textTransform: 'uppercase' }}>{r.specialtyName}</p>
                      </div>
                      <span className="badge badge-admin">BỆNH ÁN</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <p><strong className="text-slate-800">Chẩn đoán bệnh:</strong> {r.diagnosis}</p>
                      <p><strong className="text-slate-800">Phương pháp điều trị:</strong> {r.treatment}</p>
                      {r.prescription && (
                        <p>
                          <strong className="text-slate-800">Đơn thuốc chỉ định:</strong>{' '}
                          <span style={{ fontFamily: 'monospace', color: 'var(--color-success)', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.125rem 0.25rem', borderRadius: 'var(--radius-sm)' }}>
                            {r.prescription}
                          </span>
                        </p>
                      )}
                      {r.notes && (
                        <p><strong className="text-slate-500 italic">Lời dặn của bác sĩ:</strong> <span className="italic text-slate-500">{r.notes}</span></p>
                      )}
                      {r.followUpDate && (
                        <p style={{ color: 'var(--color-warning)', fontWeight: 700 }}><strong className="text-slate-800">Hẹn ngày tái khám:</strong> {formatDate(r.followUpDate)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
