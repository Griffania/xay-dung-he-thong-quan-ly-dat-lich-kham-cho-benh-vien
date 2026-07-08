'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useCurrentUser } from '../../../../lib/hooks/useCurrentUser';
import { formatDate } from '../../../../lib/utils/datetime';
import { FileText } from 'lucide-react';

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

export default function PatientMedicalHistoryPage() {
  const currentUser = useCurrentUser();
  const [pastRecords, setPastRecords] = useState<MedicalRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

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
    if (currentUser?.id) fetchMedicalRecords(currentUser.id);
  }, [currentUser]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-black text-slate-808" style={{ fontSize: '1.875rem' }}>
        Lịch sử khám bệnh
      </h1>

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
          <div className="flex flex-col gap-4">
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
  );
}