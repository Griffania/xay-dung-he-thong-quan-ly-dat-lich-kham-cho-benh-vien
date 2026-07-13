'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, 
  Server, 
  Database, 
  Users, 
  HardDrive, 
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  UserPlus,
  Settings,
  Mail,
  User
} from 'lucide-react';
import api from '../../../lib/api';

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  birthDate?: string;
  status: 'ACTIVE' | 'LOCKED';
  role: {
    code: string;
    name: string;
  };
  createdAt: string;
}


export default function AdminDashboard() {
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');

  // Trạng thái Users
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userLimit] = useState(100);
  const [userTotal, setUserTotal] = useState(0);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Form tạo nhân viên mới (Admin / Lễ tân)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createBirthDate, setCreateBirthDate] = useState('');
  const [createRole, setCreateRole] = useState('RECEPTIONIST');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Đọc hash từ URL để đổi Tab tương ứng với sidebar menu
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#users') {
        setActiveTab('users');
      } else if (hash === '#settings') {
        setActiveTab('settings');
      } else {
        setActiveTab('overview');
      }
    };

    handleHashChange(); // Run on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Lấy dữ liệu danh sách người dùng , sử lý tìm kiếm user
  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const params: any = {
        limit: userLimit.toString()
      };
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;

      const response = await api.get('/users', { params });
      
      // Hỗ trợ cấu trúc trả về phân trang hoặc mảng thô
      if (response.data && response.data.data) {
        setUsersList(response.data.data);
        setUserTotal(response.data.total || response.data.data.length);
      } else {
        setUsersList(response.data || []);
        setUserTotal(response.data.length || 0);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách user:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };


  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userSearch, userRoleFilter]);

  // Khóa tài khoản
  const handleLockUser = async (id: string) => {
    try {
      await api.post(`/users/${id}/lock`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể khóa tài khoản!');
    }
  };

  // Mở khóa tài khoản
  const handleUnlockUser = async (id: string) => {
    try {
      await api.post(`/users/${id}/unlock`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể mở khóa tài khoản!');
    }
  };

  // Tạo nhân viên mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setIsCreatingUser(true);

    try {
      await api.post('/users', {
        email: createEmail,
        password: createPassword,
        fullName: createFullName,
        phone: createPhone || undefined,
        birthDate: createBirthDate ? new Date(createBirthDate).toISOString() : undefined,
        role: createRole
      });

      setCreateSuccess('Tạo tài khoản nhân viên mới thành công!');
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreatePhone('');
      setCreateBirthDate('');
      
      // Reload danh sách & stats
      fetchUsers();

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản!';
      setCreateError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-black text-slate-800 tracking-tight" style={{ fontSize: '1.875rem' }}>
            TRANG QUẢN TRỊ HỆ THỐNG
          </h1>
        </div>
        
        {activeTab === 'users' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <UserPlus style={{ width: '1rem', height: '1rem' }} />
            Tạo tài khoản nhân viên
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button 
          onClick={() => { setActiveTab('users'); window.location.hash = '#users'; }}
          className={`tab-btn ${activeTab === 'users' ? 'tab-btn-active' : ''}`}
        >
          Quản lý tài khoản
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="panel-card">
          {/* Controls bar */}
          <div className="controls-bar">
            {/* Search */}
            <div className="search-input-wrapper search-input-wrapper-width">
              <span className="search-icon">
                <Search style={{ width: '1rem', height: '1rem' }} />
              </span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); }}
                placeholder="Tìm theo Tên, Email, SĐT..."
                className="search-input"
              />
            </div>

            {/* Role select */}
            <div className="flex gap-3" style={{ alignItems: 'center' }}>
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value);}}
                className="select-control"
              >
                <option value="">Tất cả vai trò</option>
                <option value="ADMIN">Admin (Quản trị viên)</option>
                <option value="DOCTOR">Doctor (Bác sĩ)</option>
                <option value="RECEPTIONIST">Receptionist (Lễ tân)</option>
                <option value="PATIENT">Patient (Bệnh nhân)</option>
              </select>

              <button 
                onClick={fetchUsers} 
                className="btn btn-secondary"
                style={{ padding: '0.625rem' }}
              >
                <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="data-table-container">
            {isUsersLoading ? (
              <div className="fallback-loader" style={{ minHeight: '30vh' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên hiển thị</th>
                    <th>Email liên hệ</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty-state">
                        Không tìm thấy tài khoản người dùng nào.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => (
                      <tr key={user.id}>
                        <td className="font-bold text-slate-808" style={{ color: '#1e293b' }}>{user.fullName}</td>
                        <td className="font-mono" style={{ fontSize: '11px', color: '#64748b' }}>{user.email}</td>
                        <td className="font-mono" style={{ fontSize: '11px' }}>{user.phone || '—'}</td>
                        <td>
                          <span className={
                            user.role?.code === 'ADMIN' ? 'badge badge-admin' :
                            user.role?.code === 'DOCTOR' ? 'badge badge-doctor' :
                            user.role?.code === 'RECEPTIONIST' ? 'badge badge-receptionist' :
                            'badge badge-patient'
                          }>
                            {user.role?.name || user.role?.code}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: user.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              backgroundColor: user.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'
                            }}></span>
                            {user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="text-right">
                          {user.role?.code !== 'ADMIN' && (
                            user.status === 'ACTIVE' ? (
                              <button 
                                onClick={() => handleLockUser(user.id)}
                                className="btn btn-secondary"
                                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                              >
                                <Lock style={{ width: '0.75rem', height: '0.75rem' }} /> Lock
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUnlockUser(user.id)}
                                className="btn btn-secondary"
                                style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                              >
                                <Unlock style={{ width: '0.75rem', height: '0.75rem' }} /> Unlock
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {/* CREATE STAFF MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="accent-bar"></div>

            <h3 className="modal-title mb-4">
              <UserPlus style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
              Tạo tài khoản nhân viên mới
            </h3>

            {createSuccess && (
              <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <CheckCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{createSuccess}</span>
              </div>
            )}

            {createError && (
              <div className="alert alert-error" style={{ padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <AlertCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              {/* FullName */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  value={createFullName} 
                  onChange={(e) => setCreateFullName(e.target.value)} 
                  placeholder="Nguyễn Thị B" 
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Email */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Địa chỉ Email</label>
                <input 
                  type="email" 
                  required
                  value={createEmail} 
                  onChange={(e) => setCreateEmail(e.target.value)} 
                  placeholder="...@gmail.com" 
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mật khẩu</label>
                <input 
                  type="password" 
                  required
                  value={createPassword} 
                  onChange={(e) => setCreatePassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Phone */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Số điện thoại</label>
                <input 
                  type="tel" 
                  value={createPhone} 
                  onChange={(e) => setCreatePhone(e.target.value)} 
                  placeholder="0901234567" 
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Birth Date */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ngày sinh</label>
                <input 
                  type="date" 
                  value={createBirthDate} 
                  onChange={(e) => setCreateBirthDate(e.target.value)} 
                  className="input-control"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Role select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vai trò cấp phát</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="select-control w-full"
                >
                  <option value="RECEPTIONIST">Lễ tân (Receptionist)</option>
                  <option value="ADMIN">Quản trị viên (Admin)</option>
                </select>
                <span style={{ fontSize: '10px', color: 'var(--color-warning)', fontWeight: 500, marginTop: '0.25rem' }}>
                  Lưu ý: Để tạo bác sĩ mới, vui lòng vào trang Quản lý Bác sĩ riêng.
                </span>
              </div>

              {/* Actions */}
              <div className="modal-footer pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="btn btn-primary flex-1"
                >
                  {isCreatingUser ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
