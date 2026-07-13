'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  Volume2, 
  PenTool,
  AlertCircle
} from 'lucide-react';
import api from '../../../../lib/api';
import '../doctor-custom.css';

interface Patient {
  id: string;
  fullName: string;
  phone: string;
}

interface QueueEntry {
  id: string;
  appointmentId: string;
  queueNo: number;
  queueNoFormatted: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'NO_SHOW';
  estimatedWait: number;
  appointment: {
    id: string;
    symptoms?: string;
    notes?: string;
    patient: Patient;
  };
}

interface QueueData {
  doctorId: string;
  doctorName: string;
  waitingCount: number;
  inProgressCount: number;
  currentlyExamining: QueueEntry | null;
  waitingList: QueueEntry[];
  completedList: QueueEntry[];
  noShowList: QueueEntry[];
}

export default function DoctorQueuePage() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // EMR Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lấy dữ liệu hàng đợi
  const fetchQueue = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get('/doctors/me/queue');
      setQueueData(response.data);
    } catch (err) {
      console.error('Lỗi khi tải hàng đợi khám:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Cài đặt Short-polling cập nhật hàng đợi mỗi 10 giây
  useEffect(() => {
    fetchQueue(true);
    const interval = setInterval(() => {
      fetchQueue(false);
    }, 10000); // 10s polling

    return () => clearInterval(interval);
  }, []);

  // Gọi khám bệnh nhân tiếp theo
  const handleCallPatient = async (entry: QueueEntry) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.patch(`/appointments/${entry.appointmentId}/start-examination`);
      fetchQueue(true);
      // Reset form
      setDiagnosis('');
      setTreatment('');
      setPrescription('');
      setNotes('');
      setFollowUpDate('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không thể gọi bệnh nhân vào khám!');
    }
  };

  // Đánh dấu bệnh nhân vắng mặt (No Show)
  const handleMarkNoShow = async (entry: QueueEntry) => {
    if (!window.confirm(`Đánh dấu bệnh nhân ${entry.appointment.patient.fullName} vắng mặt?`)) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.patch(`/appointments/${entry.appointmentId}/no-show`);
      fetchQueue(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Lỗi khi đánh dấu vắng mặt!');
    }
  };

  // Ký số & Lưu Bệnh Án
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueData?.currentlyExamining) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const activeApptId = queueData.currentlyExamining.appointmentId;
    const patientName = queueData.currentlyExamining.appointment.patient.fullName;

    try {
      await api.patch(`/appointments/${activeApptId}/complete-examination`, {
        diagnosis,
        treatment,
        prescription: prescription || undefined,
        notes: notes || undefined,
        followUpDate: followUpDate || undefined
      });

      setSuccessMsg(`Lưu hồ sơ bệnh án thành công cho bệnh nhân: ${patientName}`);
      setDiagnosis('');
      setTreatment('');
      setPrescription('');
      setNotes('');
      setFollowUpDate('');
      
      fetchQueue(true);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Lỗi lưu bệnh án!';
      setErrorMsg(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsSaving(false);
    }
  };

  const todayTotal = queueData 
    ? queueData.waitingCount + queueData.completedList.length + queueData.noShowList.length + (queueData.currentlyExamining ? 1 : 0)
    : 0;

  return (
    <div className="doctor-container">
      {/* Header */}
      <div className="doctor-title-section">
        <h1 className="doctor-title">
          Bảng Điều phối Khám bệnh (Bác sĩ)
        </h1>
        <p className="doctor-subtitle">
          Bác sĩ phụ trách: <strong>{queueData?.doctorName || '...'}</strong>
        </p>
      </div>

      {/* Stats row */}
      <div className="doctor-stats-grid-3">
        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Ca khám hôm nay</span>
            <span className="stats-value">{todayTotal}</span>
          </div>
          <div className="stats-icon-box stats-icon-blue">
            <Calendar style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Đã khám xong</span>
            <span className="stats-value" style={{ color: 'var(--color-success)' }}>
              {queueData?.completedList.length || 0}
            </span>
          </div>
          <div className="stats-icon-box stats-icon-emerald">
            <UserCheck style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>

        <div className="stats-card">
          <div>
            <span className="stats-title uppercase">Bệnh nhân đang đợi</span>
            <span className="stats-value" style={{ color: 'var(--color-warning)' }}>
              {queueData?.waitingCount || 0} Bệnh nhân
            </span>
          </div>
          <div className="stats-icon-box stats-icon-amber">
            <Users style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="doctor-main-grid">
        {/* Left Column: Waiting list queue */}
        <div className="col-span-2 flex-col gap-4">
          <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="justify-between align-center pb-3" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex' }}>
              <h2 className="panel-title align-center gap-2" style={{ margin: 0 }}>
                <Users style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
                Hàng đợi phòng khám
              </h2>
              <span className="badge">
                Thời gian thực
              </span>
            </div>

            {/* Live Queue Cards */}
            <div className="queue-list-scroll">
              {isLoading ? (
                <div className="fallback-loader" style={{ minHeight: '10vh' }}>
                  <div className="spinner"></div>
                </div>
              ) : !queueData || (queueData.waitingList.length === 0 && !queueData.currentlyExamining) ? (
                <p className="empty-state-desc" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  Hiện tại không có bệnh nhân nào trong hàng đợi.
                </p>
              ) : (
                <>
                  {/* Bệnh nhân đang khám */}
                  {queueData.currentlyExamining && (
                    <div className="queue-card-active">
                      <div className="queue-card-active-header">
                        <div>
                          <div className="align-center gap-2">
                            <span className="queue-badge-active">
                              #{queueData.currentlyExamining.queueNoFormatted}
                            </span>
                            <span className="queue-label-active">ĐANG KHÁM</span>
                          </div>
                          <h3 className="patient-card-title" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                            {queueData.currentlyExamining.appointment.patient.fullName}
                          </h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                            SĐT: {queueData.currentlyExamining.appointment.patient.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Danh sách chờ khám */}
                  {queueData.waitingList.map((entry) => (
                    <div key={entry.id} className="queue-card-waiting">
                      <div className="queue-card-waiting-brief">
                        <div className="queue-card-no-badge">
                          #{entry.queueNoFormatted}
                        </div>
                        <div className="queue-card-patient-info">
                          <h3 className="patient-card-title">{entry.appointment.patient.fullName}</h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0.125rem 0 0' }}>
                            SĐT: {entry.appointment.patient.phone} • Chờ: {entry.estimatedWait} phút
                          </p>
                          {entry.appointment.symptoms && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontStyle: 'italic', backgroundColor: 'var(--bg-light)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
                              Triệu chứng: {entry.appointment.symptoms}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex-row gap-2" style={{ display: 'flex' }}>
                        <button
                          onClick={() => handleCallPatient(entry)}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                        >
                          <Volume2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          Gọi vào khám
                        </button>
                        <button
                          onClick={() => handleMarkNoShow(entry)}
                          className="btn btn-secondary"
                          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Vắng mặt
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Diagnosis & Record Creation */}
        <div className="col-span-3">
          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {queueData?.currentlyExamining ? (
            <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="justify-between align-center pb-4" style={{ borderBottom: '1px solid var(--border-light)', display: 'flex' }}>
                <div className="align-center gap-3">
                  <div className="patient-profile-icon">
                    <PenTool style={{ width: '1.25rem', height: '1.25rem' }} />
                  </div>
                  <div>
                    <h2 className="panel-title" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Lập Bệnh Án Điện Tử
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                      Đang khám bệnh nhân: <strong style={{ color: 'var(--color-primary)' }}>{queueData.currentlyExamining.appointment.patient.fullName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveRecord} className="emr-form">
                {/* Diagnosis field */}
                <div className="emr-form-group">
                  <label className="form-label uppercase">Chẩn đoán y khoa <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Nhập chẩn đoán lâm sàng/cận lâm sàng (Ví dụ: Viêm mũi dị ứng, Viêm họng hạt cấp tính)"
                    rows={3}
                    className="emr-textarea"
                  />
                </div>

                {/* Treatment field */}
                <div className="emr-form-group">
                  <label className="form-label uppercase">Phác đồ điều trị / Ghi chú <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Ví dụ: Rửa mũi bằng nước muối sinh lý hàng ngày, hạn chế tiếp xúc khói bụi và điều hòa lạnh"
                    rows={3}
                    className="emr-textarea"
                  />
                </div>

                {/* Prescription field */}
                <div className="emr-form-group">
                  <label className="form-label uppercase">Đơn thuốc chỉ định <span className="text-slate-400 font-normal">(Tùy chọn)</span></label>
                  <textarea
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="Ví dụ: Telfast 180mg (10 viên) - Uống 1 viên vào buổi tối sau ăn"
                    rows={3}
                    className="emr-textarea"
                  />
                </div>

                <div className="form-row-2">
                  {/* Notes */}
                  <div className="emr-form-group">
                    <label className="form-label uppercase">Căn dặn thêm</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ăn chín uống sôi, tập thể dục nhẹ"
                      className="input-control"
                      style={{ paddingLeft: '1rem' }}
                    />
                  </div>

                  {/* Follow up date */}
                  <div className="emr-form-group">
                    <label className="form-label uppercase">Hẹn ngày tái khám</label>
                    <input
                      type="date"
                      value={followUpDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="input-control"
                      style={{ paddingLeft: '1rem' }}
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary w-full"
                    style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isSaving ? (
                      <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderBlockColor: 'var(--color-primary)', margin: 0 }}></div>
                    ) : (
                      <>
                        <PenTool style={{ width: '1rem', height: '1rem' }} />
                        <span>Ký số & Lưu Bệnh Án</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="empty-state-panel">
              <div className="empty-state-icon-box">
                <PenTool style={{ width: '1.5rem', height: '1.5rem' }} />
              </div>
              <h3 className="empty-state-title">Chưa có ca khám nào được chọn</h3>
              <p className="empty-state-desc">
                Hãy chọn một bệnh nhân trong danh sách chờ khám bên trái và nhấn &quot;Gọi vào khám&quot; để bắt đầu lập bệnh án điện tử.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
