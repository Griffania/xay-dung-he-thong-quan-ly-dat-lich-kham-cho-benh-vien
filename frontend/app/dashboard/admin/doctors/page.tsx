'use client';

import React, { useEffect, useState } from 'react';
import { 
  User, 
  Stethoscope, 
  Search, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import api from '../../../../lib/api';

interface Specialty {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  licenseNo: string;
  bio?: string;
  isActive: boolean;
  specialty: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    status: string;
  };
}

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const min = (i % 2 === 0 ? '00' : '30');
  return `${hour}:${min}`;
});

const getTimeFriendlyLabel = (timeStr: string) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const min = parts[1] || '00';
  if (isNaN(hour)) return timeStr;
  
  if (hour === 0) return `${timeStr} - Nửa đêm`;
  if (hour < 12) return `${timeStr} - Sáng`;
  if (hour === 12) return `${timeStr} - Trưa`;
  if (hour < 18) return `${timeStr} - Chiều`;
  return `${timeStr} - Tối`;
};

export default function DoctorManagementPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [limit] = useState(200);
  const [total, setTotal] = useState(0);

  // Modal tạo bác sĩ mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [bio, setBio] = useState('');
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Modal thêm lịch làm việc (WorkSchedule)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [workDate, setWorkDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [slotDurationMin, setSlotDurationMin] = useState(15);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  // Fetch Specialties
  const fetchSpecialties = async () => {
    try {
      const response = await api.get('/specialties?isActive=true&limit=100');
      setSpecialties(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải chuyên khoa:', err);
    }
  };

  // Fetch Doctors
  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: limit.toString()
      };
      if (search) params.search = search;
      if (specialtyFilter) params.specialtyId = specialtyFilter;

      const response = await api.get('/doctors', { params });
      if (response.data && response.data.data) {
        setDoctors(response.data.data);
        setTotal(response.data.total || response.data.data.length);
      } else {
        setDoctors(response.data || []);
        setTotal(response.data.length || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách bác sĩ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [ search, specialtyFilter]);

  // Toggle Doctor Active status
  const handleToggleActive = async (doctor: Doctor) => {
    const action = doctor.isActive ? 'disable' : 'enable';
    try {
      await api.post(`/doctors/${doctor.id}/${action}`);
      fetchDoctors();
    } catch (err: any) {
      alert(err.response?.data?.message || `Lỗi khi thay đổi trạng thái bác sĩ!`);
    }
  };

  // Tạo bác sĩ mới
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setIsSavingDoctor(true);

    try {
      await api.post('/doctors', {
        email,
        password,
        fullName,
        phone: phone || undefined,
        birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
        specialtyId,
        licenseNo,
        bio: bio || undefined
      });

      setSaveSuccess('Tạo tài khoản và hồ sơ Bác sĩ thành công!');
      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setBirthDate('');
      setSpecialtyId('');
      setLicenseNo('');
      setBio('');
      
      fetchDoctors();
      setTimeout(() => {
        setShowCreateModal(false);
        setSaveSuccess(null);
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Có lỗi xảy ra khi tạo bác sĩ!';
      setSaveError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsSavingDoctor(false);
    }
  };

  // Mở modal lập lịch và đặt lại các giá trị mặc định tránh lưu dữ liệu cũ bị lỗi
  const handleOpenScheduleModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setWorkDate('');
    setStartTime('08:00');
    setEndTime('12:00');
    setSlotDurationMin(15);
    setScheduleError(null);
    setScheduleSuccess(null);
    setShowScheduleModal(true);
  };

  // Thêm lịch làm việc
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setScheduleError(null);//Xóa (reset) các thông báo lỗi hoặc thông báo thành công của lần xếp lịch trước đó
    setScheduleSuccess(null);
    setIsSavingSchedule(true);//Chuyển trạng thái hiển thị của Modal thành true

    try {
      // Validate thời gian phía Frontend
      const startNum = startTime.split(':').map(Number);
      const endNum = endTime.split(':').map(Number);
      const startMinutes = startNum[0] * 60 + startNum[1];
      const endMinutes = endNum[0] * 60 + endNum[1];

      if (startMinutes >= endMinutes) {
        setScheduleError('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
        setIsSavingSchedule(false);
        return;
      }

      if (endMinutes - startMinutes < Number(slotDurationMin)) {
        setScheduleError(`Tổng thời gian làm việc phải lớn hơn hoặc bằng thời lượng một slot khám (${slotDurationMin} phút)!`);
        setIsSavingSchedule(false);
        return;
      }

      await api.post('/work-schedules', {
        doctorId: selectedDoctor.id,
        workDate,
        startTime,
        endTime,
        slotDurationMin: Number(slotDurationMin)
      });

      setScheduleSuccess(`Lập lịch thành công! Backend đã tự động sinh các slot khám cho BS. ${selectedDoctor.user.fullName}.`);
      setWorkDate('');
      setStartTime('08:00');
      setEndTime('12:00');
      setSlotDurationMin(15);
      
      setTimeout(() => {
        setShowScheduleModal(false);
        setSelectedDoctor(null);
        setScheduleSuccess(null);
      }, 2000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Lỗi lập lịch làm việc!';
      setScheduleError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontSize: '1.875rem' }}>
            <Stethoscope style={{ width: '2rem', height: '2rem' }} className="text-primary" />
            Quản lý Danh mục Bác sĩ
          </h1>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <PlusCircle style={{ width: '1rem', height: '1rem' }} />
          Thêm bác sĩ mới
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="controls-bar">
        <div className="search-input-wrapper search-input-wrapper-width">
          <span className="search-icon">
            <Search style={{ width: '1rem', height: '1rem' }} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value);}}
            placeholder="Tìm bác sĩ theo Tên, Email, Giấy phép..."
            className="search-input"
          />
        </div>

        <select
          value={specialtyFilter}
          onChange={(e) => { setSpecialtyFilter(e.target.value); }}
          className="select-control"
          style={{ width: '14rem' }}
        >
          <option value="">Tất cả chuyên khoa</option>
          {specialties.map(spec => (
            <option key={spec.id} value={spec.id}>{spec.name}</option>
          ))}
        </select>
      </div>

      {/* Grid of Doctor cards */}
      {isLoading ? (
        <div className="fallback-loader">
          <div className="spinner"></div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center p-8 panel-card" style={{ borderStyle: 'dashed', padding: '4rem' }}>
          <Stethoscope style={{ width: '3rem', height: '3rem', color: 'var(--text-light)', margin: '0 auto 1rem' }} />
          <h3 className="font-bold text-slate-800 mb-1">Không tìm thấy bác sĩ nào</h3>
          <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>Hãy thử thay đổi điều kiện tìm kiếm hoặc thêm một hồ sơ bác sĩ mới.</p>
        </div>
      ) : (
        <div className="doctor-cards-grid">
          {doctors.map(doc => (
            <div key={doc.id} className="doctor-card">
              <div className="flex flex-col gap-3">
                {/* Doctor Brief Info */}
                <div className="doctor-card-top">
                  <div className="doctor-card-brief">
                    <div className="doctor-avatar-box">
                      <User style={{ width: '1.5rem', height: '1.5rem' }} />
                    </div>
                    <div>
                      <h3 className="doctor-card-name">{doc.user.fullName}</h3>
                      <span className="doctor-card-specialty">
                        {doc.specialty.name}
                      </span>
                    </div>
                  </div>

                  <span className={`doctor-status-badge ${doc.isActive ? 'doctor-status-active' : 'doctor-status-inactive'}`}>
                    {doc.isActive ? 'Bật đặt lịch' : 'Tắt đặt lịch'}
                  </span>
                </div>

                {/* Details */}
                <div className="doctor-details-list">
                  <p><strong>Email:</strong> <span className="font-mono text-slate-500">{doc.user.email}</span></p>
                  {doc.user.phone && <p><strong>SĐT:</strong> <span className="font-mono">{doc.user.phone}</span></p>}
                  <p><strong>Giấy phép hành nghề:</strong> <span className="font-mono text-slate-800 font-semibold">{doc.licenseNo}</span></p>
                  {doc.bio && (
                    <p className="doctor-bio-box line-clamp-2">
                      &quot;{doc.bio}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="doctor-card-footer">
                <button
                  onClick={() => handleOpenScheduleModal(doc)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Calendar style={{ width: '1rem', height: '1rem', color: 'var(--color-primary)' }} />
                  Xếp lịch khám
                </button>
                
                <button
                  onClick={() => handleToggleActive(doc)}
                  className={`btn ${doc.isActive ? 'btn-danger' : 'btn-success'}`}
                >
                  {doc.isActive ? 'Tắt đặt lịch' : 'Bật đặt lịch'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE DOCTOR MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content-lg p-6">
            <div className="accent-bar"></div>

            <h3 className="modal-title mb-4">
              <Stethoscope style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Thêm bác sĩ mới vào hệ thống
            </h3>

            {saveSuccess && (
              <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <CheckCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="alert alert-error" style={{ padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <AlertCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="flex flex-col gap-4" style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div className="grid grid-cols-1 grid-cols-md-2 gap-4">
                {/* FullName */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Họ và tên bác sĩ</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="BS. Nguyễn Văn A" className="input-control" style={{ paddingLeft: '1rem' }} />
                </div>

                {/* Specialty */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Chuyên khoa phụ trách</label>
                  <select required value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)} className="select-control w-full">
                    <option value="" disabled>-- Chọn khoa --</option>
                    {specialties.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Địa chỉ Email đăng nhập</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dr.nguyenvana@gmail.com" className="input-control" style={{ paddingLeft: '1rem' }} />
                </div>

                {/* Password */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mật khẩu khởi tạo</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-control" style={{ paddingLeft: '1rem' }} />
                </div>

                {/* Phone */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Số điện thoại</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" className="input-control" style={{ paddingLeft: '1rem' }} />
                </div>

                {/* Birth Date */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ngày sinh</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input-control" style={{ paddingLeft: '1rem' }} />
                </div>

                {/* License No */}
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 1' }}>
                  <label className="form-label">Số giấy phép hành nghề (License No)</label>
                  <input type="text" required value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="E.g. 012345/BYT-CCHN" className="input-control" style={{ paddingLeft: '1rem' }} />
                </div>

                {/* Bio */}
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 1' }}>
                  <label className="form-label">Giới thiệu bản thân & kinh nghiệm</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="BS. Nguyễn Văn A có hơn 10 năm kinh nghiệm điều trị tim mạch..." rows={3} className="emr-textarea" />
                </div>
              </div>

              {/* Actions */}
              <div className="modal-footer pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                  Hủy bỏ
                </button>
                <button type="submit" disabled={isSavingDoctor} className="btn btn-primary flex-1">
                  {isSavingDoctor ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE WORK SCHEDULE MODAL */}
      {showScheduleModal && selectedDoctor && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="accent-bar"></div>

            <h3 className="modal-title mb-4">
              <Calendar style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Lập lịch làm việc bác sĩ
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', padding: '0.625rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
              Bác sĩ: <strong style={{ color: 'var(--color-primary)' }}>{selectedDoctor.user.fullName}</strong> • Khoa: <strong>{selectedDoctor.specialty.name}</strong>
            </p>

            {scheduleSuccess && (
              <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <CheckCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{scheduleSuccess}</span>
              </div>
            )}

            {scheduleError && (
              <div className="alert alert-error" style={{ padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <AlertCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="flex flex-col gap-4">
              {/* Work Date */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ngày làm việc</label>
                <input
                  type="date"
                  required
                  value={workDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Start & End time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Giờ bắt đầu</label>
                  <select
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="select-control w-full"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {getTimeFriendlyLabel(time)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Giờ kết thúc</label>
                  <select
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="select-control w-full"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {getTimeFriendlyLabel(time)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot Duration */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Thời lượng mỗi ca khám (phút)</label>
                <select
                  value={slotDurationMin}
                  onChange={(e) => setSlotDurationMin(Number(e.target.value))}
                  className="select-control w-full"
                >
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút (Khuyên dùng)</option>
                  <option value={20}>20 phút</option>
                  <option value={30}>30 phút</option>
                </select>
              </div>

              {/* Actions */}
              <div className="modal-footer pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => { setShowScheduleModal(false); setSelectedDoctor(null); }}
                  className="btn btn-secondary flex-1"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="btn btn-primary flex-1"
                >
                  {isSavingSchedule ? 'Đang lưu...' : 'Xác nhận tạo lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
