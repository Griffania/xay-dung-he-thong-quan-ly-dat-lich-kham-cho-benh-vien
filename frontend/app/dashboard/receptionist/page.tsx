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
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import api from '../../../lib/api';
import './receptionist.css';

interface Appointment {
  id: string;
  patientId: string;
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
}

export default function ReceptionistDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Ticket in ra
  const [printedTicket, setPrintedTicket] = useState<{
    queueNo: number;
    queueNoFormatted: string;
    patientName: string;
    doctorName: string;
    specialtyName: string;
    estimatedWait: number;
  } | null>(null);

  // Lấy các cuộc hẹn ngày hôm nay
  const fetchTodayAppointments = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const response = await api.get(`/appointments?date=${todayStr}&limit=100`);
      setAppointments(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch hẹn hôm nay:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Tự động tải lại mỗi 10 giây
  useEffect(() => {
    fetchTodayAppointments(true);

    const interval = setInterval(() => {
      fetchTodayAppointments(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Xác nhận lịch khám (PENDING -> CONFIRMED)
  const handleConfirmAppointment = async (apptId: string) => {
    try {
      await api.patch(`/appointments/${apptId}/confirm`);
      fetchTodayAppointments(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xác nhận lịch hẹn này!');
    }
  };

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

      fetchTodayAppointments(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể check-in lúc này!');
    }
  };

  // Thực hiện in phiếu (lệnh in mặc định trình duyệt)
  const handlePrint = () => {
    window.print();
  };

  // Lọc lịch hẹn hiển thị hôm nay
  const filteredAppts = appointments.filter(a => 
    a.patient.fullName.toLowerCase().includes(searchFilter.toLowerCase()) || 
    (a.patient.phone && a.patient.phone.includes(searchFilter)) ||
    a.id.includes(searchFilter)
  );

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
          <Link href="/dashboard/receptionist/booking" className="btn btn-primary">
            <PlusCircle className="receptionist-btn-icon" />
            Đăng ký khám vãng lai
          </Link>
          
          <button 
            onClick={() => fetchTodayAppointments(true)}
            className="btn btn-secondary receptionist-btn-refresh"
          >
            <RefreshCw className="receptionist-btn-icon-lg" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid stats-grid-3">
        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Đã Check-in hôm nay</span>
            <span className="stats-value text-primary">
              {appointments.filter(a => a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED').length}
            </span>
          </div>
          <div className="stats-icon-box stats-icon-blue">
            <UserCheck className="receptionist-stats-icon" />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Chờ Check-in</span>
            <span className="stats-value text-success">
              {appointments.filter(a => a.status === 'CONFIRMED').length} Lịch hẹn
            </span>
          </div>
          <div className="stats-icon-box stats-icon-blue">
            <Users className="receptionist-stats-icon" />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Chờ duyệt trực tuyến</span>
            <span className="stats-value text-warning">
              {appointments.filter(a => a.status === 'PENDING').length} Lịch hẹn
            </span>
          </div>
          <div className="stats-icon-box stats-icon-amber">
            <Calendar className="receptionist-stats-icon" />
          </div>
        </div>
      </div>

      <div className="receptionist-grid" style={{ gridTemplateColumns: printedTicket ? 'repeat(5, minmax(0, 1fr))' : '1fr' }}>
        {/* Left Column: Search & Confirm Booking List */}
        <div className="receptionist-main-col" style={{ gridColumn: printedTicket ? 'span 3' : '1fr' }}>
          <div className="panel-card p-6 receptionist-panel-inner">
            <h2 className="panel-title receptionist-panel-title">
              <Search className="receptionist-panel-title-icon" />
              Danh sách tiếp đón bệnh nhân trong ngày
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
                  {filteredAppts.map((a) => (
                    <div key={a.id} className="receptionist-appt-item">
                      <div className="receptionist-appt-details">
                        <div className="receptionist-appt-header">
                          <h3 className="receptionist-appt-patient-name">{a.patient.fullName}</h3>
                          <span className="badge receptionist-appt-badge">ID: {a.id.substring(0, 8)}</span>
                        </div>
                        <p className="receptionist-appt-text">
                          SĐT: {a.patient.phone || 'Chưa cung cấp'} • Giờ: {a.slot.startTime.substring(11, 16)} - {a.slot.endTime.substring(11, 16)}
                        </p>
                        <p className="receptionist-appt-text receptionist-appt-subtext">
                          Khám với: <strong className="receptionist-appt-doctor">{a.doctor.user.fullName}</strong> ({a.doctor.specialty.name})
                        </p>
                      </div>

                      <div className="receptionist-appt-actions">
                        {a.status === 'PENDING' && (
                          <button
                            onClick={() => handleConfirmAppointment(a.id)}
                            className="btn btn-secondary receptionist-btn-pending"
                          >
                            Duyệt lịch
                          </button>
                        )}
                        
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
                          <span className="receptionist-checked-in-status">
                            <ClipboardCheck className="receptionist-status-icon-md" />
                            Đã vào hàng đợi
                          </span>
                        )}
                      </div>
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
    </div>
  );
}
