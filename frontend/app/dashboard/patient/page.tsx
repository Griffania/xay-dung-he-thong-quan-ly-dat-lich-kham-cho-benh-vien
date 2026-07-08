'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { useCurrentUser } from '../../../lib/hooks/useCurrentUser';
import { formatDate, displayTimeRange } from '../../../lib/utils/datetime';
import { Calendar, Clock, RefreshCw, PlusCircle } from 'lucide-react';

interface Appointment {
  id: string;
  doctor: { user: { fullName: string }; specialty: { name: string } };
  slot: { date: string; startTime: string; endTime: string };
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  symptoms?: string;
  createdAt: string;
}

export default function PatientAppointmentsPage() {
  const currentUser = useCurrentUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isApptsLoading, setIsApptsLoading] = useState(false);

  const fetchAppointments = async () => {
    setIsApptsLoading(true);
    try {
      const response = await api.get('/appointments?limit=50');
      setAppointments(response.data.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch hẹn khám:', err);
    } finally {
      setIsApptsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) fetchAppointments();
  }, [currentUser]);

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn khám này?')) return;
    try {
      await api.patch(`/appointments/${apptId}/cancel`);
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy lịch khám lúc này!');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="font-black text-slate-808" style={{ fontSize: '1.875rem' }}>
          Lịch hẹn của tôi
        </h1>
        <div className="flex gap-2">
          <Link href="/dashboard/patient/book" className="btn btn-primary">
            <PlusCircle style={{ width: '1.125rem', height: '1.125rem' }} />
            <span>Đặt lịch mới</span>
          </Link>
          <button onClick={fetchAppointments} className="btn btn-secondary" style={{ padding: '0.625rem' }}>
            <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
      </div>

      <div className="panel-card p-6 flex flex-col gap-4">
        {isApptsLoading ? (
          <div className="fallback-loader" style={{ minHeight: '15vh' }}>
            <div className="spinner"></div>
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-6">Bạn chưa đăng ký lịch khám bệnh nào.</p>
        ) : (
          <div className="flex flex-col gap-3">
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
    </div>
  );
}