'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  FileText, 
  Calendar, 
  Mail, 
  Phone, 
  Activity,
  AlertCircle
} from 'lucide-react';
import api from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils/datetime';
import '../doctor-custom.css';

interface Patient {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate?: string;
  createdAt?: string;
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

export default function DoctorMedicalRecordsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pastRecords, setPastRecords] = useState<MedicalRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Patients List
  const fetchPatients = async (queryStr: string) => {
    setIsPatientsLoading(true);
    try {
      const response = await api.get(`/users?role=PATIENT&search=${encodeURIComponent(queryStr)}`);
      setPatients(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách bệnh nhân:', err);
    } finally {
      setIsPatientsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(debouncedQuery);
  }, [debouncedQuery]);

  // Fetch Medical Records for a Selected Patient
  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsRecordsLoading(true);
    try {
      const response = await api.get(`/medical-records/patient/${patient.id}?limit=50`);
      setPastRecords(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải bệnh án của bệnh nhân:', err);
      setPastRecords([]);
    } finally {
      setIsRecordsLoading(false);
    }
  };

  return (
    <div className="doctor-container">
      {/* Page Title */}
      <div>
        <h1 className="doctor-title">
          Hồ sơ bệnh án
        </h1>
      </div>

      {/* Main Grid */}
      <div className="doctor-main-grid">
        {/* Left Column: Patients Search & List */}
        <div className="col-span-2 flex-col gap-4">
          <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="panel-title align-center gap-2" style={{ fontSize: '1rem', margin: 0 }}>
              <User style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Tìm kiếm bệnh nhân
            </h2>

            {/* Search Input */}
            <div className="patient-search-box-wrapper">
              <Search className="patient-search-icon" />
              <input
                type="text"
                placeholder="Nhập tên, số điện thoại hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-control patient-search-input"
                style={{ fontSize: '0.875rem' }}
              />
            </div>

            {/* Patients List */}
            <div className="patient-list-scroll">
              {isPatientsLoading ? (
                <div className="fallback-loader" style={{ minHeight: '15vh' }}>
                  <div className="spinner"></div>
                </div>
              ) : patients.length === 0 ? (
                <p className="empty-state-desc" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  Không tìm thấy bệnh nhân nào.
                </p>
              ) : (
                patients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className={isSelected ? 'patient-card selected' : 'patient-card'}
                    >
                      <h3 className="patient-card-title">
                        {p.fullName}
                      </h3>
                      <div className="patient-card-details">
                        <span className="patient-card-detail-item">
                          <Phone style={{ width: '0.75rem', height: '0.75rem' }} /> {p.phone}
                        </span>
                        <span className="patient-card-detail-item">
                          <Mail style={{ width: '0.75rem', height: '0.75rem' }} /> {p.email}
                        </span>
                        {p.birthDate && (
                          <span className="patient-card-detail-item">
                            <Calendar style={{ width: '0.75rem', height: '0.75rem' }} /> Ngày sinh: {formatDate(p.birthDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Medical Records History */}
        <div className="col-span-3">
          {selectedPatient ? (
            <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Selected Patient Profile summary */}
              <div className="patient-profile-header">
                <div className="patient-profile-brief">
                  <div className="patient-profile-icon">
                    <User style={{ width: '1.25rem', height: '1.25rem' }} />
                  </div>
                  <div className="patient-profile-info">
                    <h2 className="patient-profile-name">{selectedPatient.fullName}</h2>
                    <p className="patient-profile-meta">
                      SĐT: {selectedPatient.phone} • Email: {selectedPatient.email}
                    </p>
                    {selectedPatient.birthDate && (
                      <p className="patient-profile-meta" style={{ marginTop: '0.125rem' }}>
                        Ngày sinh: {formatDate(selectedPatient.birthDate)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="badge badge-doctor" style={{ textTransform: 'uppercase' }}>Bệnh nhân</span>
              </div>

              {/* Records List */}
              <div className="flex-col gap-4">
                <h3 className="records-section-title">
                  <FileText style={{ width: '1.125rem', height: '1.125rem', color: 'var(--color-primary)' }} />
                  Lịch sử ca bệnh án
                </h3>

                {isRecordsLoading ? (
                  <div className="fallback-loader" style={{ minHeight: '20vh' }}>
                    <div className="spinner"></div>
                  </div>
                ) : pastRecords.length === 0 ? (
                  <div className="empty-state-panel" style={{ border: 0, padding: '2rem' }}>
                    <AlertCircle style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1rem', color: 'var(--border-color)' }} />
                    <p className="empty-state-title" style={{ fontSize: '0.875rem' }}>Bệnh nhân chưa có hồ sơ bệnh án nào trên hệ thống.</p>
                  </div>
                ) : (
                  <div className="records-list-scroll">
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
          ) : (
            <div className="empty-state-panel">
              <div className="empty-state-icon-box">
                <FileText style={{ width: '1.5rem', height: '1.5rem' }} />
              </div>
              <h3 className="empty-state-title">Chưa chọn bệnh nhân</h3>
              <p className="empty-state-desc">
                Hãy chọn một bệnh nhân trong danh sách tìm kiếm bên trái để xem thông tin cá nhân và lịch sử tất cả hồ sơ bệnh án đã lập.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
