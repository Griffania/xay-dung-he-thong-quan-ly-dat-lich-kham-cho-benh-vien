'use client';

import React, { useEffect, useState } from 'react';
import { 
  Stethoscope, 
  Search, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle, 
  Edit3,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import api from '../../../../lib/api';

interface Specialty {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SpecialtyManagementPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [total, setTotal] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchSpecialties = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: page.toString(),
        limit: limit.toString()
      };
      if (search) params.search = search;

      const response = await api.get('/specialties', { params });
      if (response.data && response.data.data) {
        setSpecialties(response.data.data);
        setTotal(response.data.total || response.data.data.length);
      } else {
        setSpecialties(response.data || []);
        setTotal(response.data.length || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải chuyên khoa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, [page, search]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setSelectedId(null);
    setName('');
    setDescription('');
    setSaveError(null);
    setSaveSuccess(null);
    setShowModal(true);
  };

  const handleOpenEdit = (spec: Specialty) => {
    setIsEdit(true);
    setSelectedId(spec.id);
    setName(spec.name);
    setDescription(spec.description || '');
    setSaveError(null);
    setSaveSuccess(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    try {
      if (isEdit && selectedId) {
        // Edit Specialty
        await api.patch(`/specialties/${selectedId}`, { name, description });
        setSaveSuccess('Cập nhật chuyên khoa thành công!');
      } else {
        // Create Specialty
        await api.post('/specialties', { name, description });
        setSaveSuccess('Thêm chuyên khoa mới thành công!');
      }

      fetchSpecialties();
      setTimeout(() => {
        setShowModal(false);
        setSaveSuccess(null);
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Có lỗi xảy ra khi lưu chuyên khoa!';
      setSaveError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (spec: Specialty) => {
    const action = spec.isActive ? 'disable' : 'enable';
    try {
      await api.post(`/specialties/${spec.id}/${action}`);
      fetchSpecialties();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái chuyên khoa!');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontSize: '1.875rem' }}>
            <Stethoscope style={{ width: '2rem', height: '2rem' }} className="text-primary" />
            Quản lý Chuyên khoa
          </h1>
          <p className="text-slate-500 mt-1">Cấu hình danh mục chuyên khoa khám bệnh, mô tả dịch vụ y tế</p>
        </div>
        
        <button 
          onClick={handleOpenCreate}
          className="btn btn-primary"
        >
          <PlusCircle style={{ width: '1rem', height: '1rem' }} />
          Thêm chuyên khoa mới
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="controls-bar panel-card">
        <div className="search-input-wrapper search-input-wrapper-width">
          <span className="search-icon">
            <Search style={{ width: '1rem', height: '1rem' }} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo Tên chuyên khoa..."
            className="search-input"
          />
        </div>
      </div>

      {/* Specialties list table */}
      <div className="panel-card">
        <div className="data-table-container">
          {isLoading ? (
            <div className="fallback-loader" style={{ minHeight: '30vh' }}>
              <div className="spinner"></div>
            </div>
          ) : specialties.length === 0 ? (
            <div className="table-empty-state" style={{ padding: '4rem' }}>
              <Stethoscope style={{ width: '3rem', height: '3rem', color: 'var(--text-light)', margin: '0 auto 1rem' }} />
              Chưa có chuyên khoa nào được tạo.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên chuyên khoa</th>
                  <th>Mô tả</th>
                  <th>Trạng thái hoạt động</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {specialties.map((spec) => (
                  <tr key={spec.id}>
                    <td className="font-bold text-slate-800" style={{ fontSize: '0.875rem' }}>{spec.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {spec.description || '—'}
                    </td>
                    <td>
                      <span style={{ 
                        color: spec.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: spec.isActive ? 'var(--color-success)' : 'var(--color-danger)'
                        }}></span>
                        {spec.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="data-table-actions">
                        <button 
                          onClick={() => handleOpenEdit(spec)}
                          className="btn btn-secondary"
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          <Edit3 style={{ width: '0.875rem', height: '0.875rem' }} /> Sửa
                        </button>
                        
                        <button 
                          onClick={() => handleToggleActive(spec)}
                          className={`btn ${spec.isActive ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          {spec.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE OR EDIT MODAL */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="accent-bar"></div>

            <h3 className="modal-title mb-4">
              <Stethoscope style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              {isEdit ? 'Cập nhật chuyên khoa' : 'Thêm chuyên khoa mới'}
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

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Specialty Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tên chuyên khoa</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Khoa Tim Mạch, Khoa Nhi..."
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mô tả chi tiết</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả các dịch vụ khám bệnh và chức năng của khoa..."
                  rows={4}
                  className="emr-textarea"
                />
              </div>

              {/* Actions */}
              <div className="modal-footer pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary flex-1"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
