'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserCheck, 
  QrCode, 
  Printer, 
  ArrowRight,
  ClipboardCheck,
  PlusCircle,
  Calendar,
  RefreshCw,
  CalendarRange,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import api from '../../../lib/api';
import { formatDate, displayTimeRange } from '../../../lib/utils/datetime';
import './receptionist.css';

interface Appointment {
  id: string;
  patientId: string;
  bookingType: 'ONLINE' | 'WALK_IN';
  isPriority?: boolean;
  patient: {
    fullName: string;
    phone?: string;
    email: string;
  };
  doctor: {
    id: string;
    user: {
      fullName: string;
    };
    specialty: {
      id: string;
      name: string;
    };
  };
  slot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  queueEntry?: {
    queueNo: number;
    estimatedWait: number;
  } | null;
}

export default function ReceptionistDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [activeSpecialtyId, setActiveSpecialtyId] = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<'ALL' | 'WAITING' | 'CHECKED_IN' | 'NO_SHOW'>('ALL');

  // Ticket in ra
  const [printedTicket, setPrintedTicket] = useState<{
    queueNo: number;
    queueNoFormatted: string;
    patientName: string;
    doctorName: string;
    specialtyName: string;
    estimatedWait: number;
  } | null>(null);

  // State Hủy lịch
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // State Đổi lịch (Reschedule)
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSpecialties, setRescheduleSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [rescheduleDoctors, setRescheduleDoctors] = useState<{ id: string; user: { fullName: string } }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<{ id: string; startTime: string; endTime: string; appointments?: any[] }[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Thiết lập ngày mặc định là hôm nay
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
  }, []);

  // Tải danh sách chuyên khoa khi component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await api.get('/specialties?isActive=true&limit=100');
        setSpecialties(res.data.data || res.data || []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách chuyên khoa:', err);
      }
    };
    fetchSpecialties();
  }, []);

  // Lấy các cuộc hẹn theo ngày được chọn
  const fetchAppointments = async (dateStr: string, showLoading = false) => {
    if (!dateStr) return;
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get(`/appointments?date=${dateStr}&limit=100`);
      setAppointments(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch hẹn:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Tự động tải lại khi đổi ngày hoặc mỗi 10 giây
  useEffect(() => {
    if (selectedDate) {
      fetchAppointments(selectedDate, true);

      const interval = setInterval(() => {
        fetchAppointments(selectedDate, false);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [selectedDate]);



  // Thực hiện Check-in cho lịch hẹn đặt trước
  const handleCheckIn = async (apptId: string) => {
    try {
      const response = await api.patch(`/appointments/${apptId}/check-in`);
      const { appointment, queueEntry } = response.data.data;
      
      // Hiển thị ticket để in ấn
      setPrintedTicket({
        queueNo: queueEntry.queueNo,
        queueNoFormatted: queueEntry.queueNoFormatted || `Q-${queueEntry.queueNo}`,
        patientName: appointment.patient.fullName,
        doctorName: appointment.doctor.user.fullName,
        specialtyName: appointment.doctor.specialty.name,
        estimatedWait: queueEntry.estimatedWait
      });

      fetchAppointments(selectedDate, true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể check-in lúc này!');
    }
  };

  // Mở modal Hủy lịch
  const openCancelModal = (appt: Appointment) => {
    setCancellingAppt(appt);
  };

  // Thực hiện Hủy lịch
  const handleCancelBooking = async () => {
    if (!cancellingAppt) return;
    setIsCancelling(true);
    try {
      await api.patch(`/appointments/${cancellingAppt.id}/cancel`);
      setCancellingAppt(null);
      fetchAppointments(selectedDate, true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy lịch hẹn khám này!');
    } finally {
      setIsCancelling(false);
    }
  };

  // Mở modal Đổi lịch
  const openRescheduleModal = (appt: Appointment) => {
    setReschedulingAppt(appt);
    setRescheduleDate(appt.slot.date.substring(0, 10));
    setSelectedSpecialtyId(appt.doctor.specialty.id || '');
    setSelectedDoctorId(appt.doctor.id);
    setSelectedSlotId('');
  };

  // Tải danh sách chuyên khoa khi mở modal Đổi lịch
  useEffect(() => {
    if (!reschedulingAppt) return;
    const loadSpecialties = async () => {
      try {
        const res = await api.get('/specialties?isActive=true&limit=100');
        setRescheduleSpecialties(res.data.data || res.data || []);
      } catch (err) {
        console.error('Lỗi khi tải chuyên khoa:', err);
      }
    };
    loadSpecialties();
  }, [reschedulingAppt]);

  // Tải bác sĩ theo chuyên khoa
  useEffect(() => {
    if (!selectedSpecialtyId) {
      setRescheduleDoctors([]);
      setSelectedDoctorId('');
      return;
    }
    const loadDoctors = async () => {
      try {
        const res = await api.get(`/doctors?specialtyId=${selectedSpecialtyId}&isActive=true&limit=100`);
        setRescheduleDoctors(res.data.data || res.data || []);
      } catch (err) {
        console.error('Lỗi khi tải bác sĩ:', err);
      }
    };
    loadDoctors();
  }, [selectedSpecialtyId]);

  // Tải slots trống của bác sĩ theo ngày
  useEffect(() => {
    if (!selectedDoctorId || !rescheduleDate) {
      setRescheduleSlots([]);
      setSelectedSlotId('');
      return;
    }
    const loadSlots = async () => {
      try {
        const res = await api.get(`/doctors/${selectedDoctorId}/slots/available?date=${rescheduleDate}&includeVacated=true`);
        setRescheduleSlots(res.data || []);
      } catch (err) {
        console.error('Lỗi khi tải slots trống:', err);
      }
    };
    loadSlots();
  }, [selectedDoctorId, rescheduleDate]);

  // Thực hiện Đổi lịch
  const handleRescheduleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt || !selectedSlotId) return;
    setIsRescheduling(true);
    try {
      await api.patch(`/appointments/${reschedulingAppt.id}/reschedule`, {
        newSlotId: selectedSlotId
      });
      setReschedulingAppt(null);
      fetchAppointments(selectedDate, true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể đổi lịch hẹn khám!');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Thực hiện in phiếu (lệnh in mặc định trình duyệt)
  const handlePrint = () => {
    window.print();
  };

  // Lọc lịch hẹn hiển thị theo tìm kiếm, chuyên khoa, và trạng thái
  const filteredAppts = appointments.filter(a => {
    const matchesSearch = 
      a.patient.fullName.toLowerCase().includes(searchFilter.toLowerCase()) || 
      (a.patient.phone && a.patient.phone.includes(searchFilter)) ||
      a.id.includes(searchFilter);
    
    const matchesSpecialty = 
      activeSpecialtyId === 'ALL' || 
      a.doctor.specialty.id === activeSpecialtyId;
    
    let matchesStatus = true;
    if (activeStatus === 'WAITING') {
      matchesStatus = a.status === 'CONFIRMED';
    } else if (activeStatus === 'CHECKED_IN') {
      matchesStatus = a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED';
    } else if (activeStatus === 'NO_SHOW') {
      matchesStatus = a.status === 'NO_SHOW' || a.status === 'CANCELLED';
    }
    
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  // Nhóm các lịch hẹn đã lọc theo chuyên khoa để hiển thị dạng danh sách
  const groupAppointmentsBySpecialty = () => {
    const groups: { [key: string]: { specialtyId: string; specialtyName: string; appointments: Appointment[] } } = {};
    
    filteredAppts.forEach(appt => {
      const specId = appt.doctor.specialty.id;
      const specName = appt.doctor.specialty.name;
      
      if (!groups[specId]) {
        groups[specId] = {
          specialtyId: specId,
          specialtyName: specName,
          appointments: []
        };
      }
      groups[specId].appointments.push(appt);
    });
    
    return Object.values(groups).sort((a, b) => a.specialtyName.localeCompare(b.specialtyName));
  };

  const groupedAppts = groupAppointmentsBySpecialty();

  const hasPriorityWaiting = appointments.some(appt => 
    appt.isPriority && 
    (appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN')
  );

  // Đếm số lượng cuộc hẹn theo trạng thái và chuyên khoa để hiển thị lên badge
  const getFilteredCount = (status: 'ALL' | 'WAITING' | 'CHECKED_IN' | 'NO_SHOW', specialtyId: string = 'ALL') => {
    return appointments.filter(a => {
      const matchesSpec = specialtyId === 'ALL' || a.doctor.specialty.id === specialtyId;
      let matchesStatus = true;
      if (status === 'WAITING') {
        matchesStatus = a.status === 'CONFIRMED';
      } else if (status === 'CHECKED_IN') {
        matchesStatus = a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED';
      } else if (status === 'NO_SHOW') {
        matchesStatus = a.status === 'NO_SHOW' || a.status === 'CANCELLED';
      }
      return matchesSpec && matchesStatus;
    }).length;
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
            width: 80mm; /* Kích thước chuẩn giấy in nhiệt K80 */
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
            Cổng Tiếp Đón Bệnh Nhân (Lễ tân)
          </h1>
        </div>

        <div className="receptionist-actions">
          {/* Bộ lọc ngày khám */}
          <div className="receptionist-date-container">
            <span className="receptionist-date-label">Ngày khám:</span>
            <input
              type="date"
              data-date={selectedDate ? formatDate(selectedDate) : 'dd/mm/yyyy'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="receptionist-date-picker"
            />
          </div>

          <Link href="/dashboard/receptionist/booking" className="btn btn-primary">
            <PlusCircle className="receptionist-btn-icon" />
            Đăng ký khám vãng lai
          </Link>
          
          <button 
            onClick={() => fetchAppointments(selectedDate, true)}
            className="btn btn-secondary receptionist-btn-refresh"
          >
            <RefreshCw className="receptionist-btn-icon-lg" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid-3">
        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Chờ tiếp đón</span>
            <span className="stats-value text-warning" style={{ color: '#d97706' }}>
              {appointments.filter(a => a.status === 'CONFIRMED').length} Lịch hẹn
            </span>
          </div>
          <div className="stats-icon-box" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
            <Users className="receptionist-stats-icon" />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Đã Check-in</span>
            <span className="stats-value text-primary">
              {appointments.filter(a => a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED').length} Bệnh nhân
            </span>
          </div>
          <div className="stats-icon-box stats-icon-blue">
            <UserCheck className="receptionist-stats-icon" />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Vắng mặt / Hủy</span>
            <span className="stats-value text-danger" style={{ color: '#dc2626' }}>
              {appointments.filter(a => a.status === 'NO_SHOW' || a.status === 'CANCELLED').length} Bệnh nhân
            </span>
          </div>
          <div className="stats-icon-box" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
            <AlertTriangle className="receptionist-stats-icon" />
          </div>
        </div>
      </div>

      <div className="receptionist-grid" style={{ gridTemplateColumns: printedTicket ? 'repeat(5, minmax(0, 1fr))' : '1fr' }}>
        {/* Left Column: Search & Confirm Booking List */}
        <div className="receptionist-main-col" style={{ gridColumn: printedTicket ? 'span 3' : '1fr' }}>
          <div className="panel-card p-6 receptionist-panel-inner">
            <h2 className="panel-title receptionist-panel-title">
              <Search className="receptionist-panel-title-icon" />
              Danh sách tiếp đón bệnh nhân ngày {formatDate(selectedDate)}
            </h2>

            {/* Search Input Filter */}
            <div className="search-input-wrapper w-full">
              <span className="search-icon">
                <Search className="receptionist-search-icon" />
              </span>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Nhập tên bệnh nhân, số điện thoại hoặc mã hẹn..."
                className="search-input"
              />
            </div>

            {/* Bộ lọc trạng thái tiếp đón */}
            <div className="specialty-tabs-container" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={`specialty-tab-btn ${activeStatus === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveStatus('ALL')}
              >
                <span>Tất cả</span>
                <span className="badge" style={{
                  backgroundColor: activeStatus === 'ALL' ? '#ffffff' : 'rgba(37, 99, 235, 0.1)',
                  color: activeStatus === 'ALL' ? 'var(--color-primary)' : 'var(--color-primary)',
                  fontWeight: 850,
                  fontSize: '10px'
                }}>
                  {getFilteredCount('ALL')}
                </span>
              </button>
              <button
                type="button"
                className={`specialty-tab-btn ${activeStatus === 'WAITING' ? 'active' : ''}`}
                onClick={() => setActiveStatus('WAITING')}
              >
                <span>Chờ tiếp đón</span>
                <span className="badge" style={{
                  backgroundColor: activeStatus === 'WAITING' ? '#ffffff' : 'rgba(37, 99, 235, 0.1)',
                  color: activeStatus === 'WAITING' ? 'var(--color-primary)' : 'var(--color-primary)',
                  fontWeight: 850,
                  fontSize: '10px'
                }}>
                  {getFilteredCount('WAITING')}
                </span>
              </button>
              <button
                type="button"
                className={`specialty-tab-btn ${activeStatus === 'CHECKED_IN' ? 'active' : ''}`}
                onClick={() => setActiveStatus('CHECKED_IN')}
              >
                <span>Đã check-in</span>
                <span className="badge" style={{
                  backgroundColor: activeStatus === 'CHECKED_IN' ? '#ffffff' : 'rgba(37, 99, 235, 0.1)',
                  color: activeStatus === 'CHECKED_IN' ? 'var(--color-primary)' : 'var(--color-primary)',
                  fontWeight: 850,
                  fontSize: '10px'
                }}>
                  {getFilteredCount('CHECKED_IN')}
                </span>
              </button>
              <button
                type="button"
                className={`specialty-tab-btn ${activeStatus === 'NO_SHOW' ? 'active' : ''}`}
                onClick={() => setActiveStatus('NO_SHOW')}
              >
                <span>Vắng mặt / Hủy</span>
                <span className="badge" style={{
                  backgroundColor: activeStatus === 'NO_SHOW' ? '#ffffff' : 'rgba(37, 99, 235, 0.1)',
                  color: activeStatus === 'NO_SHOW' ? 'var(--color-primary)' : 'var(--color-primary)',
                  fontWeight: 850,
                  fontSize: '10px'
                }}>
                  {getFilteredCount('NO_SHOW')}
                </span>
              </button>
            </div>

            {/* Specialty Filtering Tabs */}
            <div className="specialty-tabs-container">
              <button
                type="button"
                className={`specialty-tab-btn ${activeSpecialtyId === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveSpecialtyId('ALL')}
              >
                <span>Tất cả khoa</span>
                <span className="badge" style={{
                  backgroundColor: activeSpecialtyId === 'ALL' ? '#ffffff' : 'rgba(37, 99, 235, 0.1)',
                  color: activeSpecialtyId === 'ALL' ? 'var(--color-primary)' : 'var(--color-primary)',
                  fontWeight: 850,
                  fontSize: '10px'
                }}>
                  {getFilteredCount(activeStatus, 'ALL')}
                </span>
              </button>
              {specialties.map((spec) => {
                const count = getFilteredCount(activeStatus, spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    className={`specialty-tab-btn ${activeSpecialtyId === spec.id ? 'active' : ''}`}
                    onClick={() => setActiveSpecialtyId(spec.id)}
                  >
                    <span>{spec.name}</span>
                    <span className="badge" style={{
                      backgroundColor: activeSpecialtyId === spec.id ? '#ffffff' : 'rgba(37, 99, 235, 0.1)',
                      color: activeSpecialtyId === spec.id ? 'var(--color-primary)' : 'var(--color-primary)',
                      fontWeight: 850,
                      fontSize: '10px'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List results */}
            <div className="receptionist-list-container">
              {isLoading ? (
                <div className="fallback-loader receptionist-loader-height">
                  <div className="spinner"></div>
                </div>
              ) : filteredAppts.length === 0 ? (
                <p className="receptionist-empty-text">Không tìm thấy lịch hẹn khám nào khớp điều kiện.</p>
              ) : (
                <div className="receptionist-scrollable-list">
                  {groupedAppts.map((group) => (
                    <div key={group.specialtyId} className="specialty-group-section">
                      <div className="specialty-group-header">
                        <div className="specialty-group-title">
                          <span>{group.specialtyName}</span>
                        </div>
                        <span className="specialty-group-count">
                          {group.appointments.length} lịch hẹn
                        </span>
                      </div>
                      
                      {group.appointments.map((a) => (
                        <div 
                          key={a.id} 
                          className={`receptionist-appt-item ${a.isPriority ? 'receptionist-appt-priority' : ''}`}
                          style={a.isPriority ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                        >
                          <div className="receptionist-appt-details">
                            <div className="receptionist-appt-header">
                              <h3 className="receptionist-appt-patient-name" style={a.isPriority ? { color: '#dc2626' } : {}}>{a.patient.fullName}</h3>
                              {a.isPriority && (
                                <span className="badge" style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '9px', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                                  ƯU TIÊN
                                </span>
                              )}
                              <span className="badge receptionist-appt-badge">ID: {a.id.substring(0, 8)}</span>
                            </div>
                            <p className="receptionist-appt-text">
                              SĐT: {a.patient.phone || 'Chưa cung cấp'} • Giờ: {displayTimeRange(a.slot.startTime, a.slot.endTime)}
                            </p>
                            <p className="receptionist-appt-text receptionist-appt-subtext">
                              Khám với: <strong className="receptionist-appt-doctor">{a.doctor.user.fullName}</strong>
                            </p>
                          </div>

                          <div className="receptionist-appt-actions-container">
                            <div className="receptionist-appt-actions">
                              {a.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleCheckIn(a.id)}
                                  className="btn btn-primary receptionist-btn-confirm"
                                >
                                  <span>Check-in</span>
                                  <ArrowRight className="receptionist-btn-icon-sm" />
                                </button>
                              )}

                              {(a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED') && (
                                <span className="receptionist-checked-in-status" style={{
                                  color: a.status === 'IN_PROGRESS' ? 'var(--color-primary)' : a.status === 'COMPLETED' ? '#475569' : 'var(--color-success)',
                                  backgroundColor: a.status === 'IN_PROGRESS' ? 'rgba(37, 99, 235, 0.1)' : a.status === 'COMPLETED' ? '#f1f5f9' : 'rgba(34, 197, 94, 0.1)',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '9999px',
                                }}>
                                  <ClipboardCheck className="receptionist-status-icon-md" />
                                  {a.status === 'CHECKED_IN' && 'Chờ khám'}
                                  {a.status === 'IN_PROGRESS' && 'Đang khám'}
                                  {a.status === 'COMPLETED' && 'Khám xong'}
                                </span>
                              )}

                              {(a.status === 'NO_SHOW' || a.status === 'CANCELLED') && (
                                <span className="receptionist-checked-in-status" style={{
                                  color: a.status === 'NO_SHOW' ? '#d97706' : '#dc2626',
                                  backgroundColor: a.status === 'NO_SHOW' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '9999px',
                                }}>
                                  <AlertTriangle className="receptionist-status-icon-md" />
                                  {a.status === 'NO_SHOW' ? 'Vắng mặt' : 'Đã hủy'}
                                </span>
                              )}
                            </div>

                            {/* In lại số thứ tự chỉ khả dụng cho các lịch hẹn Đã check-in / Đang khám / Hoàn thành mà có queueEntry */}
                            {a.queueEntry && (
                              <div className="receptionist-secondary-actions">
                                <button
                                  onClick={() => {
                                    setPrintedTicket({
                                      queueNo: a.queueEntry!.queueNo,
                                      queueNoFormatted: a.bookingType === 'ONLINE' ? `OL-${String(a.queueEntry!.queueNo).padStart(3, '0')}` : `WL-${String(a.queueEntry!.queueNo).padStart(3, '0')}`,
                                      patientName: a.patient.fullName,
                                      doctorName: a.doctor.user.fullName,
                                      specialtyName: a.doctor.specialty.name,
                                      estimatedWait: a.queueEntry!.estimatedWait
                                    });
                                  }}
                                  className="btn-link-reschedule"
                                  title="In lại số thứ tự"
                                >
                                  <Printer className="receptionist-icon-xs" />
                                  <span>In lại phiếu</span>
                                </button>
                              </div>
                            )}

                            {/* Đổi lịch & Hủy lịch */}
                            <div className="receptionist-secondary-actions">
                              {(a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' || a.status === 'NO_SHOW') && (
                                <button
                                  onClick={() => openRescheduleModal(a)}
                                  className="btn-link-reschedule"
                                  title="Đổi giờ khám"
                                >
                                  <RefreshCw className="receptionist-icon-xs" />
                                  <span>Đổi giờ</span>
                                </button>
                              )}
                              {a.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => openCancelModal(a)}
                                  className="btn-link-cancel"
                                  title="Hủy lịch hẹn"
                                >
                                  <Trash2 className="receptionist-icon-xs" />
                                  <span>Hủy lịch</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Preview */}
        {printedTicket && (
          <div className="receptionist-side-col" style={{ gridColumn: 'span 2' }}>
            <div className="panel-card p-6 receptionist-ticket-preview">
              <h3 className="panel-title receptionist-ticket-title">Mẫu in phiếu khám hiện tại</h3>
              
              {/* Vùng in Ticket */}
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

      {/* Modal Hủy lịch */}
      {cancellingAppt && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="modal-header" style={{ padding: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 className="modal-title receptionist-text-danger">
                <AlertTriangle className="receptionist-modal-title-icon" style={{ color: 'var(--color-danger)' }} />
                Xác nhận hủy lịch hẹn khám
              </h3>
            </div>
            
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <div className="alert alert-error receptionist-alert-small" style={{ borderRadius: 'var(--radius-xl)', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <AlertTriangle className="receptionist-alert-icon" style={{ flexShrink: 0 }} />
                <span>Hành động này không thể hoàn tác. Lịch hẹn khám sẽ bị hủy và slot này sẽ được giải phóng cho bệnh nhân khác đặt.</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <p><strong>Bệnh nhân:</strong> {cancellingAppt.patient.fullName}</p>
                <p><strong>Bác sĩ:</strong> {cancellingAppt.doctor.user.fullName} ({cancellingAppt.doctor.specialty.name})</p>
                <p><strong>Khung giờ hiện tại:</strong> {formatDate(cancellingAppt.slot.date)} • {displayTimeRange(cancellingAppt.slot.startTime, cancellingAppt.slot.endTime)}</p>
              </div>
            </div>
            
            <div className="modal-footer" style={{ padding: '1rem 0 0 0', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCancellingAppt(null)}
                className="btn btn-secondary"
                disabled={isCancelling}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                className="btn btn-danger"
                disabled={isCancelling}
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi lịch (Reschedule) */}
      {reschedulingAppt && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content-lg p-6" style={{ maxWidth: '30rem' }}>
            <div className="modal-header" style={{ padding: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 className="modal-title">
                <CalendarRange className="receptionist-modal-title-icon" />
                Đổi giờ hẹn khám (Reschedule)
              </h3>
            </div>
            
            <form onSubmit={handleRescheduleBooking}>
              <div className="modal-body" style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Thông tin hiện tại */}
                <div style={{ padding: '0.875rem', backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 'var(--radius-xl)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <p style={{ color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lịch khám hiện tại:</p>
                  <p><strong>Bệnh nhân:</strong> {reschedulingAppt.patient.fullName}</p>
                  <p><strong>Bác sĩ:</strong> {reschedulingAppt.doctor.user.fullName} ({reschedulingAppt.doctor.specialty.name})</p>
                  <p><strong>Thời gian:</strong> {formatDate(reschedulingAppt.slot.date)} • {displayTimeRange(reschedulingAppt.slot.startTime, reschedulingAppt.slot.endTime)}</p>
                </div>

                <div className="receptionist-modal-scrollable" style={{ gap: '0.875rem', maxHeight: '350px' }}>
                  {/* Chọn ngày mới */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Chọn ngày khám mới</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      data-date={rescheduleDate ? formatDate(rescheduleDate) : 'dd/mm/yyyy'}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="input-control w-full"
                    />
                    {rescheduleDate && (
                      <p style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '0.25rem', fontWeight: 600 }}>
                        Ngày khám mới: {formatDate(rescheduleDate)}
                      </p>
                    )}
                  </div>

                  {/* Chọn chuyên khoa mới */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Chuyên khoa</label>
                    <select
                      required
                      value={selectedSpecialtyId}
                      onChange={(e) => {
                        setSelectedSpecialtyId(e.target.value);
                        setSelectedDoctorId('');
                        setRescheduleSlots([]);
                        setSelectedSlotId('');
                      }}
                      className="select-control w-full"
                    >
                      <option value="" disabled>-- Chọn chuyên khoa --</option>
                      {rescheduleSpecialties.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chọn bác sĩ mới */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Bác sĩ khám</label>
                    <select
                      required
                      disabled={!selectedSpecialtyId}
                      value={selectedDoctorId}
                      onChange={(e) => {
                        setSelectedDoctorId(e.target.value);
                        setRescheduleSlots([]);
                        setSelectedSlotId('');
                      }}
                      className="select-control w-full"
                    >
                      <option value="" disabled>-- Chọn bác sĩ --</option>
                      {rescheduleDoctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.user.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chọn slot mới */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Giờ khám còn trống</label>
                    <select
                      required
                      disabled={!selectedDoctorId}
                      value={selectedSlotId}
                      onChange={(e) => setSelectedSlotId(e.target.value)}
                      className="select-control w-full"
                    >
                      <option value="" disabled>-- Chọn khung giờ khám mới --</option>
                      {rescheduleSlots.map((s) => {
                        const isVacated = s.appointments && s.appointments.length > 0;
                        const isPriorityPatient = reschedulingAppt?.isPriority;
                        const isDisabled = isVacated && !isPriorityPatient && hasPriorityWaiting;
                        return (
                          <option key={s.id} value={s.id} disabled={isDisabled}>
                            {displayTimeRange(s.startTime, s.endTime)} 
                            {isVacated ? ' (Slot trống do bệnh nhân vắng mặt)' : ''}
                            {isDisabled ? ' - Bị khóa vì có bệnh nhân ưu tiên đang chờ' : ''}
                          </option>
                        );
                      })}
                      {selectedDoctorId && rescheduleSlots.length === 0 && (
                        <option value="" disabled className="receptionist-text-danger">
                          Không có slot trống cho ngày được chọn!
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer" style={{ padding: '1rem 0 0 0', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="btn btn-secondary"
                  disabled={isRescheduling}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isRescheduling || !selectedSlotId}
                >
                  {isRescheduling ? 'Đang cập nhật...' : 'Xác nhận đổi lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
