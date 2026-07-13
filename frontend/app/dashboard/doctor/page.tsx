'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  User, 
  Clock, 
  FileText, 
  X, 
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../../lib/api';
import { displayTimeRange, formatDate } from '../../../lib/utils/datetime';
import './doctor-custom.css';

interface Patient {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
}

interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  slotId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  symptoms?: string;
  notes?: string;
  patient: Patient;
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
  };
  medicalRecord?: {
    id: string;
    diagnosis: string;
    treatment: string;
    prescription?: string;
    followUpDate?: string;
  };
  queueEntry?: {
    id: string;
    queueNo: number;
    status: string;
  };
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

export default function DoctorSchedulePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [doctorName, setDoctorName] = useState<string>('...');

  // Modal / History Drawer State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pastRecords, setPastRecords] = useState<MedicalRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  const fetchAppointments = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/doctors/me/appointments/today?date=${dateStr}`);
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách lịch hẹn:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctorProfile = async () => {
    try {
      const response = await api.get('/doctors/me/queue');
      if (response.data?.doctorName) {
        setDoctorName(response.data.doctorName);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin bác sĩ:', err);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAppointments(selectedDate);
    }
  }, [selectedDate]);

  // Tải bệnh án cũ
  const handleOpenHistory = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsRecordsLoading(true);
    try {
      const response = await api.get(`/medical-records/patient/${patient.id}?limit=50`);
      setPastRecords(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử bệnh án:', err);
      setPastRecords([]);
    } finally {
      setIsRecordsLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setSelectedPatient(null);
    setPastRecords([]);
  };

  // Tính toán số liệu thống kê cho ngày được chọn
  const totalBookings = appointments.length;
  const completedBookings = appointments.filter(a => a.status === 'COMPLETED').length;
  const pendingBookings = appointments.filter(a => ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)).length;

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>Chờ xác nhận</span>;
      case 'CONFIRMED':
        return <span className="badge" style={{ backgroundColor: '#DBEAFE', color: '#2563EB', border: '1px solid #BFDBFE' }}>Đã xác nhận</span>;
      case 'CHECKED_IN':
        return <span className="badge" style={{ backgroundColor: '#E0E7FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}>Đã check-in</span>;
      case 'IN_PROGRESS':
        return <span className="badge" style={{ backgroundColor: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' }}>Đang khám</span>;
      case 'COMPLETED':
        return <span className="badge" style={{ backgroundColor: '#D1FAE5', color: '#10B981', border: '1px solid #10B981' }}>Đã hoàn thành</span>;
      case 'CANCELLED':
        return <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: '1px solid #FCA5A5' }}>Đã hủy</span>;
      case 'NO_SHOW':
        return <span className="badge" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>Vắng mặt</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="doctor-container">
      {/* Header */}
      <div className="doctor-header-row">
        <div className="doctor-title-section">
          <h1 className="doctor-title">
            Lịch khám bệnh
          </h1>
          <p className="doctor-subtitle">
            Bác sĩ phụ trách: <strong>{doctorName}</strong>
          </p>
        </div>

        {/* Date Selector */}
        <div className="doctor-date-selector">
          <Calendar className="text-slate-400" style={{ width: '1.25rem', height: '1.25rem' }} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="doctor-date-input"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="doctor-stats-grid-3">
        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Tổng số ca hẹn</span>
            <span className="stats-value">{totalBookings}</span>
          </div>
          <div className="stats-icon-box stats-icon-blue">
            <Calendar style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Đã khám xong</span>
            <span className="stats-value" style={{ color: 'var(--color-success)' }}>{completedBookings}</span>
          </div>
          <div className="stats-icon-box stats-icon-emerald">
            <CheckCircle2 style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Chưa khám / Đang chờ</span>
            <span className="stats-value" style={{ color: 'var(--color-warning)' }}>{pendingBookings}</span>
          </div>
          <div className="stats-icon-box stats-icon-amber">
            <Clock style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="panel-card" style={{ padding: '1.5rem' }}>
        <h2 className="panel-title align-center gap-2">
          <Activity style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
          Danh sách ca hẹn ngày {formatDate(selectedDate)}
        </h2>

        {isLoading ? (
          <div className="fallback-loader" style={{ minHeight: '20vh' }}>
            <div className="spinner"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="empty-state-panel" style={{ padding: '3rem', minHeight: 'auto' }}>
            <Calendar style={{ width: '2.5rem', height: '2.5rem', color: 'var(--border-color)', marginBottom: '0.5rem' }} />
            <p className="empty-state-title" style={{ fontSize: '0.875rem' }}>Không có lịch hẹn khám nào cho ngày này.</p>
          </div>
        ) : (
          <div className="doctor-table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>Giờ khám</th>
                  <th>Bệnh nhân</th>
                  <th>Triệu chứng / Ghi chú</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id}>
                    <td>
                      <div className="align-center gap-2">
                        <Clock style={{ width: '1rem', height: '1rem', color: 'var(--color-primary)' }} />
                        <span className="doctor-table-time">
                          {displayTimeRange(appt.slot.startTime, appt.slot.endTime)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-col">
                        <span className="doctor-table-patient-name">
                          {appt.patient.fullName}
                        </span>
                        <span className="doctor-table-patient-info">
                          SĐT: {appt.patient.phone} • DOB: {formatDate(appt.patient.birthDate)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-col gap-1">
                        {appt.symptoms ? (
                          <span className="doctor-table-symptoms">
                            {appt.symptoms}
                          </span>
                        ) : (
                          <span className="doctor-table-symptoms-empty">
                            Không có ghi chú triệu chứng
                          </span>
                        )}
                        {appt.notes && (
                          <span className="doctor-table-notes">
                            Lời dặn: {appt.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(appt.status)}
                    </td>
                    <td>
                      <div className="doctor-actions-cell">
                        <button
                          onClick={() => handleOpenHistory(appt.patient)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <FileText style={{ width: '0.875rem', height: '0.875rem' }} />
                          Lịch sử bệnh án
                        </button>
                        {['CHECKED_IN', 'IN_PROGRESS', 'CONFIRMED'].includes(appt.status) && (
                          <button
                            onClick={() => router.push('/dashboard/doctor/queue')}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <span>Vào phòng khám</span>
                            <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Drawer Modal */}
      {selectedPatient && (
        <div className="drawer-overlay">
          <div className="drawer-content">
            <div className="drawer-header">
              <div>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Lịch sử khám bệnh
                </span>
                <h3 className="patient-profile-name" style={{ marginTop: '0.25rem' }}>
                  {selectedPatient.fullName}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  SĐT: {selectedPatient.phone} • Email: {selectedPatient.email}
                </p>
              </div>
              <button onClick={handleCloseHistory} className="drawer-close-btn">
                <X style={{ width: '1.5rem', height: '1.5rem' }} />
              </button>
            </div>

            <div className="flex-col gap-4" style={{ flex: 1 }}>
              {isRecordsLoading ? (
                <div className="fallback-loader" style={{ minHeight: '30vh' }}>
                  <div className="spinner"></div>
                </div>
              ) : pastRecords.length === 0 ? (
                <div className="empty-state-panel" style={{ border: 0, padding: '2rem' }}>
                  <AlertCircle style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1rem', color: 'var(--border-color)' }} />
                  <p className="empty-state-title" style={{ fontSize: '0.875rem' }}>Bệnh nhân chưa có hồ sơ bệnh án nào trên hệ thống.</p>
                </div>
              ) : (
                <div className="flex-col gap-4">
                  {pastRecords.map((record) => (
                    <div key={record.id} className="record-card">
                      <div className="record-card-header">
                        <div className="record-card-meta">
                          <span className="record-card-date">
                            Ngày khám: {formatDate(record.createdAt)}
                          </span>
                          <h4 className="record-card-doctor">
                            BS: {record.doctorName}
                          </h4>
                          <span className="record-card-specialty">
                            Khoa: {record.specialtyName}
                          </span>
                        </div>
                        <span className="badge badge-admin">BỆNH ÁN</span>
                      </div>
                      
                      <div className="record-card-body">
                        <p><strong>Chẩn đoán:</strong> {record.diagnosis}</p>
                        <p><strong>Điều trị:</strong> {record.treatment}</p>
                        {record.prescription && (
                          <p>
                            <strong>Đơn thuốc:</strong>{' '}
                            <span className="record-prescription-badge">
                              {record.prescription}
                            </span>
                          </p>
                        )}
                        {record.notes && (
                          <p className="record-card-notes">
                            <strong>Lời dặn:</strong> {record.notes}
                          </p>
                        )}
                        {record.followUpDate && (
                          <p className="record-card-followup">
                            <strong>Hẹn tái khám:</strong> {formatDate(record.followUpDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
