'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserCheck, 
  QrCode, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  PlusCircle, 
  UserPlus, 
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';
import api from '../../../../lib/api';
import '../receptionist.css';

interface Patient {
  id: string;
  fullName: string;
  phone?: string;
  email: string;
}

export default function ReceptionistBookingPage() {
  // Ticket in ra sau khi book thành công
  const [printedTicket, setPrintedTicket] = useState<{
    queueNo: number;
    queueNoFormatted: string;
    patientName: string;
    doctorName: string;
    specialtyName: string;
    estimatedWait: number;
  } | null>(null);

  // Search patient database
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [dbPatients, setDbPatients] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Quick Register Patient State
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBirth, setRegBirth] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Walk-in booking parameters
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [doctors, setDoctors] = useState<{ id: string; user: { fullName: string } }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [slots, setSlots] = useState<{ id: string; startTime: string; endTime: string }[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  
  const [isBookingWalkin, setIsBookingWalkin] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Định dạng hiển thị giờ từ chuỗi ISO UTC
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

  // Tìm kiếm bệnh nhân trong hệ thống
  const handleSearchDbPatients = async () => {
    if (!patientSearchQuery.trim()) return;
    setIsSearchingPatients(true);
    try {
      const response = await api.get(`/users?role=PATIENT&search=${patientSearchQuery}`);
      setDbPatients(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi tìm kiếm bệnh nhân:', err);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // Tải chuyên khoa khi mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const res = await api.get('/specialties?isActive=true&limit=100');
        setSpecialties(res.data.data || res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadSpecialties();
  }, []);

  // Lấy bác sĩ thuộc chuyên khoa
  useEffect(() => {
    if (!selectedSpecialtyId) {
      setDoctors([]);
      setSelectedDoctorId('');
      return;
    }
    const loadDoctors = async () => {
      try {
        const res = await api.get(`/doctors?specialtyId=${selectedSpecialtyId}&isActive=true&limit=100`);
        setDoctors(res.data.data || res.data || []);
        setSelectedDoctorId('');
      } catch (err) {
        console.error(err);
      }
    };
    loadDoctors();
  }, [selectedSpecialtyId]);

  // Lấy slot trống trong ngày hôm nay của bác sĩ
  useEffect(() => {
    if (!selectedDoctorId) {
      setSlots([]);
      setSelectedSlotId('');
      return;
    }
    const loadSlots = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await api.get(`/doctors/${selectedDoctorId}/slots/available?date=${todayStr}`);
        setSlots(res.data || []);
        setSelectedSlotId('');
      } catch (err) {
        console.error(err);
      }
    };
    loadSlots();
  }, [selectedDoctorId]);

  // Thực hiện Check-in sau khi book thành công để lấy số thứ tự
  const handleCheckIn = async (apptId: string) => {
    try {
      const response = await api.patch(`/appointments/${apptId}/check-in`);
      const { appointment, queueEntry } = response.data.data;
      
      setPrintedTicket({
        queueNo: queueEntry.queueNo,
        queueNoFormatted: queueEntry.queueNoFormatted || `Q-${queueEntry.queueNo}`,
        patientName: appointment.patient.fullName,
        doctorName: appointment.doctor.user.fullName,
        specialtyName: appointment.doctor.specialty.name,
        estimatedWait: queueEntry.estimatedWait
      });
    } catch (err: any) {
      console.error('Lỗi check-in tự động:', err);
      alert(err.response?.data?.message || 'Không thể check-in tự động lúc này!');
    }
  };

  // Đăng ký bệnh nhân vãng lai mới nhanh tại quầy
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    try {
      const res = await api.post('/auth/register', {
        fullName: regName,
        email: regEmail || `${regPhone || Math.random().toString(36).substring(7)}@temp.clinic.com`,
        password: 'Password123!',
        phone: regPhone || undefined,
        birthDate: regBirth ? new Date(regBirth).toISOString() : undefined
      });

      setRegSuccess('Đăng ký bệnh nhân mới thành công!');
      
      const createdUser = res.data.user || res.data;
      setSelectedPatient({
        id: createdUser.id,
        fullName: regName,
        phone: regPhone,
        email: regEmail
      });

      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegBirth('');
      setShowRegisterForm(false);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đăng ký bệnh nhân thất bại!';
      setRegError(Array.isArray(message) ? message[0] : message);
    }
  };

  // Lập cuộc hẹn Walk-in
  const handleBookWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedSlotId) return;

    setIsBookingWalkin(true);
    setBookingSuccess(null);
    setBookingError(null);

    try {
      const res = await api.post('/appointments', {
        slotId: selectedSlotId,
        patientId: selectedPatient.id,
        bookingType: 'WALK_IN'
      });

      const appt = res.data.data || res.data;
      setBookingSuccess('Đăng ký khám vãng lai thành công! Đang tự động Check-in xếp hàng...');
      
      // Auto check-in luôn cho lịch vãng lai
      await handleCheckIn(appt.id);
      
      // Reset form vãng lai nhưng giữ hiển thị ticket
      setSelectedPatient(null);
      setSelectedSpecialtyId('');
      setSelectedDoctorId('');
      setSelectedSlotId('');
      setPatientSearchQuery('');
      setDbPatients([]);
      
      setTimeout(() => {
        setBookingSuccess(null);
      }, 3000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Không thể lập lịch khám vãng lai!';
      setBookingError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsBookingWalkin(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receptionist-container no-print">
      {/* CSS In ấn chỉ in Ticket */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-ticket-area, #print-ticket-area * {
            visibility: visible;
          }
          #print-ticket-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="receptionist-header">
        <div>
          <h1 className="receptionist-title">
            Đặt Lịch Hẹn Khám Mới (Walk-in)
          </h1>
          <p className="receptionist-subtitle">Đăng ký thông tin và xếp lớp khám cho bệnh nhân vãng lai ngay tại quầy</p>
        </div>
      </div>

      <div className="receptionist-grid" style={{ gridTemplateColumns: printedTicket ? 'repeat(5, minmax(0, 1fr))' : '1fr' }}>
        {/* Left Side: Booking fields */}
        <div className="receptionist-main-col" style={{ gridColumn: printedTicket ? 'span 3' : '1fr' }}>
          <div className="panel-card p-6 receptionist-panel-inner">
            <h3 className="panel-title receptionist-panel-title" style={{ fontSize: '1rem' }}>
              <PlusCircle className="receptionist-panel-title-icon" style={{ width: '1.25rem', height: '1.25rem' }} />
              Form đăng ký và xếp phòng khám
            </h3>

            {bookingSuccess && (
              <div className="alert alert-success receptionist-alert-small">
                <CheckCircle className="receptionist-alert-icon" />
                <span>{bookingSuccess}</span>
              </div>
            )}

            {bookingError && (
              <div className="alert alert-error receptionist-alert-small">
                <AlertCircle className="receptionist-alert-icon" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="receptionist-walkin-fields" style={{ gap: '1.5rem' }}>
              {/* 1. Chọn bệnh nhân */}
              <div className="receptionist-modal-section">
                <div className="receptionist-modal-section-header">
                  <label className="form-label uppercase receptionist-m-0">1. Bệnh nhân khám</label>
                  <button 
                    type="button"
                    onClick={() => { setShowRegisterForm(!showRegisterForm); setRegError(null); setRegSuccess(null); }}
                    className="receptionist-link-btn"
                  >
                    <UserPlus className="receptionist-btn-icon-xs" />
                    Đăng ký hồ sơ mới
                  </button>
                </div>

                {showRegisterForm ? (
                  /* Form đăng ký nhanh bệnh nhân */
                  <form onSubmit={handleQuickRegister} className="receptionist-reg-form">
                    <h4 className="font-bold text-slate-808 receptionist-reg-title">Tạo nhanh hồ sơ bệnh nhân</h4>
                    {regSuccess && <div className="alert alert-success receptionist-alert-xs">{regSuccess}</div>}
                    {regError && <div className="alert alert-error receptionist-alert-xs">{regError}</div>}
                    
                    <div className="grid grid-cols-1 grid-cols-md-2 gap-3">
                      <input type="text" required placeholder="Họ và tên *" value={regName} onChange={(e) => setRegName(e.target.value)} className="input-control receptionist-pl-1" />
                      <input type="tel" placeholder="Số điện thoại" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="input-control receptionist-pl-1" />
                      <input type="email" placeholder="Địa chỉ Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-control receptionist-pl-1-span" />
                      <input type="date" placeholder="Ngày sinh" value={regBirth} onChange={(e) => setRegBirth(e.target.value)} className="input-control receptionist-pl-1-span" />
                    </div>
                    <div className="receptionist-reg-actions">
                      <button type="submit" className="btn btn-primary flex-1 receptionist-reg-btn">Lưu hồ sơ</button>
                      <button type="button" onClick={() => setShowRegisterForm(false)} className="btn btn-secondary receptionist-reg-btn-secondary">Hủy</button>
                    </div>
                  </form>
                ) : selectedPatient ? (
                  <div className="receptionist-selected-patient-card">
                    <div>
                      <strong className="receptionist-selected-patient-name">{selectedPatient.fullName}</strong>
                      <p className="receptionist-selected-patient-text">SĐT: {selectedPatient.phone || '—'} • Email: {selectedPatient.email}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="receptionist-change-patient-btn"
                    >
                      Thay đổi
                    </button>
                  </div>
                ) : (
                  <div className="receptionist-patient-search-bar">
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      placeholder="Tìm bệnh nhân theo Tên / SĐT..."
                      className="input-control flex-1 receptionist-pl-1"
                    />
                    <button
                      type="button"
                      onClick={handleSearchDbPatients}
                      disabled={isSearchingPatients}
                      className="btn btn-secondary receptionist-patient-search-btn"
                    >
                      Tìm kiếm
                    </button>
                  </div>
                )}

                {dbPatients.length > 0 && !selectedPatient && (
                  <div className="receptionist-patient-search-results">
                    {dbPatients.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="receptionist-patient-search-item"
                      >
                        <span><strong>{p.fullName}</strong> - SĐT: {p.phone || '—'}</span>
                        <span className="receptionist-patient-select-action">Chọn</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Chọn chuyên khoa & bác sĩ & ca khám */}
              <form onSubmit={handleBookWalkin} className="receptionist-walkin-fields">
                <label className="form-label uppercase receptionist-m-0">2. Chi tiết cuộc hẹn khám</label>
                
                <div className="form-group receptionist-mb-0">
                  <label className="form-label">Chuyên khoa</label>
                  <select
                    required
                    value={selectedSpecialtyId}
                    onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                    className="select-control w-full"
                  >
                    <option value="" disabled>-- Chọn chuyên khoa --</option>
                    {specialties.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group receptionist-mb-0">
                  <label className="form-label">Bác sĩ khám</label>
                  <select
                    required
                    disabled={!selectedSpecialtyId}
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="select-control w-full"
                  >
                    <option value="" disabled>-- Chọn bác sĩ --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.user.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group receptionist-mb-0">
                  <label className="form-label">Giờ khám còn trống hôm nay</label>
                  <select
                    required
                    disabled={!selectedDoctorId}
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    className="select-control w-full"
                  >
                    <option value="" disabled>-- Chọn khung giờ khám --</option>
                    {slots.map(s => (
                      <option key={s.id} value={s.id}>
                        {displayTimeRange(s.startTime, s.endTime)}
                      </option>
                    ))}
                    {selectedDoctorId && slots.length === 0 && (
                      <option value="" disabled className="receptionist-text-danger">
                        Bác sĩ hết slot trống trong hôm nay!
                      </option>
                    )}
                  </select>
                </div>

                {/* Actions */}
                <div className="modal-footer receptionist-modal-footer" style={{ borderTop: 'none', padding: 0, marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={isBookingWalkin || !selectedPatient || !selectedSlotId}
                    className="btn btn-primary flex-1"
                    style={{ padding: '0.875rem' }}
                  >
                    {isBookingWalkin ? 'Đang đăng ký...' : 'Xác nhận & Check-in ngay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side: Printed Ticket Preview */}
        {printedTicket && (
          <div className="receptionist-side-col" style={{ gridColumn: 'span 2' }}>
            <div className="panel-card p-6 receptionist-ticket-preview">
              <h3 className="panel-title receptionist-ticket-title">Phiếu khám bệnh nhân vừa check-in</h3>
              
              <div id="print-ticket-area" className="receptionist-ticket-box">
                <div className="receptionist-ticket-qr-bg">
                  <QrCode className="receptionist-ticket-qr-icon" />
                </div>
                
                <div className="receptionist-ticket-header">
                  <span className="receptionist-ticket-badge-title">Phiếu Số Thứ Tự Khám</span>
                  <h3 className="receptionist-ticket-number">{printedTicket.queueNoFormatted}</h3>
                  <span className="receptionist-ticket-hospital">Hệ thống Y tế Clinic</span>
                </div>

                <div className="receptionist-ticket-details">
                  <div className="receptionist-ticket-row">
                    <span className="receptionist-ticket-label">Bệnh nhân:</span>
                    <span className="receptionist-ticket-val-bold">{printedTicket.patientName}</span>
                  </div>
                  <div className="receptionist-ticket-row">
                    <span className="receptionist-ticket-label">Chuyên khoa:</span>
                    <span className="receptionist-ticket-val-semi">{printedTicket.specialtyName}</span>
                  </div>
                  <div className="receptionist-ticket-row">
                    <span className="receptionist-ticket-label">Bác sĩ khám:</span>
                    <span className="receptionist-ticket-val-semi">{printedTicket.doctorName}</span>
                  </div>
                  <div className="receptionist-ticket-row receptionist-ticket-wait-row">
                    <span className="receptionist-ticket-wait-label">Thời gian chờ dự kiến:</span>
                    <span className="receptionist-ticket-wait-value">{printedTicket.estimatedWait} phút</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={handlePrint}
                  className="btn btn-primary flex-1 receptionist-btn-print"
                >
                  <Printer className="receptionist-btn-icon" />
                  In phiếu khám
                </button>
                <button 
                  onClick={() => setPrintedTicket(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.875rem' }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
