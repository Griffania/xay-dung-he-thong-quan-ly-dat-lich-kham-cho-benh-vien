'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Power, 
  PowerOff, 
  RefreshCw, 
  X, 
  AlertCircle, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';
import api from '../../../../lib/api';

interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  status: string;
}

interface Specialty {
  id: string;
  name: string;
  isActive: boolean;
}

interface Doctor {
  id: string;
  userId: string;
  licenseNo: string;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: UserAccount;
  specialty: Specialty;
}

interface MetaData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function DoctorsAdminPage() {
  // State quản lý danh sách bác sĩ và phân trang
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [meta, setMeta] = useState<MetaData>({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);

  // State lưu danh sách chuyên khoa để đưa vào Dropdown
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  // State các bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState(''); // '' (Tất cả)
  const [statusFilter, setStatusFilter] = useState(''); // '' (Tất cả), 'true', 'false'
  const [currentPage, setCurrentPage] = useState(1);

  // State thông báo Toast
  const [toast, setToast] = useState<Toast | null>(null);

  // State các Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // State nút bật/tắt hoạt động trên từng dòng
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Form states cho Tạo mới
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createBirthDate, setCreateBirthDate] = useState('');
  const [createSpecialtyId, setCreateSpecialtyId] = useState('');
  const [createLicenseNo, setCreateLicenseNo] = useState('');
  const [createBio, setCreateBio] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states cho Cập nhật
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSpecialtyId, setEditSpecialtyId] = useState('');
  const [editLicenseNo, setEditLicenseNo] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Kích hoạt thông báo bay (Toast Alert)
  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Gọi API lấy danh sách chuyên khoa phục vụ dropdowns
  const fetchAllSpecialties = async () => {
    try {
      const response = await api.get('/specialties', {
        params: { limit: '100', isActive: 'true' }
      });
      setSpecialties(response.data.data);
    } catch (error) {
      console.error('Error fetching specialties for dropdown:', error);
    }
  };

  // Gọi API lấy danh sách bác sĩ
  const fetchDoctors = useCallback(async (page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await api.get('/doctors', {
        params: {
          search: searchQuery || undefined,
          specialtyId: specialtyFilter || undefined,
          isActive: statusFilter !== '' ? statusFilter : undefined,
          page: page.toString(),
          limit: '5', // 5 bác sĩ trên một trang
        }
      });
      setDoctors(response.data.data);
      setMeta(response.data.meta);
      setCurrentPage(response.data.meta.page);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      triggerToast('error', error.response?.data?.message || 'Không thể tải danh sách bác sĩ!');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, specialtyFilter, statusFilter, currentPage]);

  // Load ban đầu
  useEffect(() => {
    fetchAllSpecialties();
  }, []);

  // Tải lại khi đổi trang, lọc chuyên khoa, hoặc lọc trạng thái
  useEffect(() => {
    fetchDoctors(currentPage);
  }, [currentPage, specialtyFilter, statusFilter, fetchDoctors]);

  // Xử lý submit tìm kiếm
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDoctors(1);
  };

  // Bật / Vô hiệu hóa bác sĩ
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setActioningId(id);
    const endpoint = currentStatus ? `/doctors/${id}/disable` : `/doctors/${id}/enable`;
    const actionName = currentStatus ? 'Vô hiệu hóa' : 'Kích hoạt lại';

    try {
      const response = await api.post(endpoint);
      triggerToast('success', response.data.message || `${actionName} bác sĩ thành công!`);
      // Cập nhật local state
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, isActive: !currentStatus } : d));
    } catch (error: any) {
      console.error(`Error toggling status for doctor ${id}:`, error);
      triggerToast('error', error.response?.data?.message || `Không thể ${actionName.toLowerCase()} bác sĩ!`);
    } finally {
      setActioningId(null);
    }
  };

  // Submit tạo mới bác sĩ
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validate client
    if (!createEmail.trim() || !createPassword.trim() || !createFullName.trim() || !createSpecialtyId || !createLicenseNo.trim()) {
      setCreateError('Vui lòng nhập đầy đủ các trường bắt buộc (*)!');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/doctors', {
        email: createEmail.trim(),
        password: createPassword,
        fullName: createFullName.trim(),
        phone: createPhone.trim() || undefined,
        birthDate: createBirthDate || undefined,
        specialtyId: createSpecialtyId,
        licenseNo: createLicenseNo.trim(),
        bio: createBio.trim() || undefined,
      });

      triggerToast('success', response.data.message || 'Thêm bác sĩ mới thành công!');
      
      // Reset form
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreatePhone('');
      setCreateBirthDate('');
      setCreateSpecialtyId('');
      setCreateLicenseNo('');
      setCreateBio('');
      setIsCreateOpen(false);

      // Load lại trang 1
      setCurrentPage(1);
      fetchDoctors(1);
    } catch (error: any) {
      console.error('Error creating doctor:', error);
      setCreateError(error.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản bác sĩ!');
    } finally {
      setIsCreating(false);
    }
  };

  // Mở modal Edit và điền dữ liệu
  const handleOpenEdit = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setEditFullName(doc.user.fullName);
    setEditPhone(doc.user.phone || '');
    // Cắt chuỗi ISO lấy định dạng yyyy-MM-dd cho thẻ input date
    setEditBirthDate(doc.user.birthDate ? doc.user.birthDate.substring(0, 10) : '');
    setEditSpecialtyId(doc.specialty.id);
    setEditLicenseNo(doc.licenseNo);
    setEditBio(doc.bio || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  // Submit cập nhật bác sĩ
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setEditError(null);

    if (!editFullName.trim() || !editSpecialtyId || !editLicenseNo.trim()) {
      setEditError('Vui lòng điền đầy đủ thông tin bắt buộc (*)!');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await api.patch(`/doctors/${selectedDoctor.id}`, {
        fullName: editFullName.trim(),
        phone: editPhone.trim() || null,
        birthDate: editBirthDate || null,
        specialtyId: editSpecialtyId,
        licenseNo: editLicenseNo.trim(),
        bio: editBio.trim() || null,
      });

      triggerToast('success', response.data.message || 'Cập nhật thông tin bác sĩ thành công!');
      setIsEditOpen(false);
      setSelectedDoctor(null);

      // Tải lại dữ liệu trang hiện tại
      fetchDoctors(currentPage);
    } catch (error: any) {
      console.error('Error updating doctor:', error);
      setEditError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật bác sĩ!');
    } finally {
      setIsUpdating(false);
    }
  };

  // Hiển thị chi tiết hồ sơ
  const handleOpenDetail = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setIsDetailOpen(true);
  };

  // Định dạng ngày hiển thị dd/MM/yyyy
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa khai báo';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 relative">
      {/* Toast floating notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
            Quản lý Bác Sĩ
          </h1>
          <p className="text-slate-400 mt-1">Quản lý tài khoản chuyên môn bác sĩ, chỉ định chuyên khoa khám và phân quyền</p>
        </div>
        
        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-650/20 hover:shadow-indigo-600/30 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm Bác Sĩ</span>
        </button>
      </div>

      {/* Filter Control panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/20 p-4 border border-slate-800/50 rounded-2xl">
        {/* Tìm kiếm tên/giấy phép */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center md:col-span-2">
          <input
            type="text"
            placeholder="Tìm theo họ tên, email, giấy phép..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
          />
          <Search className="w-4.5 h-4.5 text-slate-500 absolute left-4" />
          <button type="submit" className="hidden">Tìm</button>
        </form>

        {/* Lọc chuyên khoa */}
        <select
          value={specialtyFilter}
          onChange={(e) => {
            setSpecialtyFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-350 outline-none transition-all cursor-pointer"
        >
          <option value="">Tất cả chuyên khoa</option>
          {specialties.map((spec) => (
            <option key={spec.id} value={spec.id}>{spec.name}</option>
          ))}
        </select>

        {/* Lọc trạng thái & Làm mới */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-350 outline-none transition-all cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm ngưng hoạt động</option>
          </select>

          <button
            onClick={() => fetchDoctors(currentPage)}
            disabled={isLoading}
            className="p-2.5 bg-slate-880 hover:bg-slate-750 active:scale-95 text-slate-400 hover:text-white rounded-xl border border-slate-700/60 transition-all disabled:opacity-50 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Doctors Table Grid */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden min-h-[350px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/60">
              <tr>
                <th className="px-6 py-4.5 w-[25%]">Bác sĩ</th>
                <th className="px-6 py-4.5 w-[20%]">Chuyên khoa</th>
                <th className="px-6 py-4.5 w-[20%]">Số Giấy Phép</th>
                <th className="px-6 py-4.5 w-[15%] text-center">Trạng thái</th>
                <th className="px-6 py-4.5 w-[20%] text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/40">
              {isLoading ? (
                // Skeleton UI
                Array.from({ length: meta.limit || 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-850"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-850 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-850 rounded w-1/2"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-850 rounded w-2/3"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-850 rounded w-1/2"></div></td>
                    <td className="px-6 py-5 text-center"><div className="h-5 bg-slate-850 rounded-full w-20 mx-auto"></div></td>
                    <td className="px-6 py-5 text-center"><div className="h-8 bg-slate-850 rounded-lg w-24 mx-auto"></div></td>
                  </tr>
                ))
              ) : doctors.length > 0 ? (
                doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/10 transition-colors group">
                    {/* Bác sĩ brief */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          <User className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-white tracking-wide truncate">{doc.user.fullName}</span>
                          <span className="text-xs text-slate-500 truncate">{doc.user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Chuyên khoa */}
                    <td className="px-6 py-4 text-slate-350">
                      <span className="inline-flex items-center gap-1 bg-slate-800/40 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-300 border border-slate-750">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        {doc.specialty.name}
                      </span>
                    </td>

                    {/* Số giấy phép */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {doc.licenseNo}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 border text-[11px] font-bold rounded-full uppercase tracking-wider ${
                        doc.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${doc.isActive ? 'bg-emerald-450' : 'bg-rose-450'}`}></span>
                        {doc.isActive ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Chi tiết */}
                        <button
                          onClick={() => handleOpenDetail(doc)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700/60 transition-all cursor-pointer"
                        >
                          Chi tiết
                        </button>

                        {/* Sửa */}
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Bật/Tắt hoạt động */}
                        <button
                          onClick={() => handleToggleStatus(doc.id, doc.isActive)}
                          disabled={actioningId === doc.id}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            doc.isActive 
                              ? 'text-rose-500 hover:text-rose-400 hover:bg-rose-950/15'
                              : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/15'
                          } disabled:opacity-30`}
                          title={doc.isActive ? 'Khóa hồ sơ bác sĩ' : 'Mở hoạt động bác sĩ'}
                        >
                          {actioningId === doc.id ? (
                            <div className="w-4 h-4 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin"></div>
                          ) : doc.isActive ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // Dữ liệu trống
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-500">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-white mb-1">Không tìm thấy bác sĩ nào</h3>
                      <p className="text-sm text-slate-500">Hãy thử nhập từ khóa tìm kiếm khác hoặc thay đổi bộ lọc chuyên khoa để tìm kiếm rộng hơn.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer phân trang */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4.5 border-t border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Hiển thị trang <strong className="text-slate-350">{meta.page}</strong> / <strong className="text-slate-350">{meta.totalPages}</strong> ({meta.total} bác sĩ)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, meta.totalPages))}
                disabled={currentPage === meta.totalPages || isLoading}
                className="p-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT BÁC SĨ */}
      {isDetailOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedDoctor(null);
              }}
              className="absolute top-5 right-5 text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg outline-none transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                Hồ Sơ Chi Tiết Bác Sĩ
              </h2>
              <p className="text-xs text-slate-500 mt-1">Thông tin hành nghề y khoa và tài khoản cá nhân của bác sĩ</p>
            </div>

            {/* Thông tin chính */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cột 1: Thông tin cá nhân */}
              <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-3.5">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-slate-800/60">Tài khoản & Liên hệ</h3>
                
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Họ và tên</span>
                    <span className="text-white font-medium">{selectedDoctor.user.fullName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Địa chỉ email</span>
                    <span className="text-white font-medium font-mono">{selectedDoctor.user.email}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Số điện thoại</span>
                    <span className="text-white font-medium">{selectedDoctor.user.phone || 'Chưa khai báo'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Ngày sinh</span>
                    <span className="text-white font-medium">{formatDate(selectedDoctor.user.birthDate)}</span>
                  </div>
                </div>
              </div>

              {/* Cột 2: Thông tin chuyên môn */}
              <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-3.5">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-slate-800/60">Hồ sơ chuyên môn</h3>
                
                <div className="flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Chuyên khoa trực thuộc</span>
                    <span className="text-white font-bold">{selectedDoctor.specialty.name}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Số giấy phép hành nghề</span>
                    <span className="text-indigo-300 font-bold font-mono">{selectedDoctor.licenseNo}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Thời điểm tạo lập</span>
                    <span className="text-white font-medium">{formatDate(selectedDoctor.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-slate-500 text-xs mt-0.5 shrink-0 block">Trạng thái:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                    selectedDoctor.isActive
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {selectedDoctor.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Phần Bio (Tóm tắt tiểu sử) */}
            <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-slate-800/60 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Tiểu sử / Quá trình công tác
              </h3>
              <p className="text-slate-350 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedDoctor.bio || 'Chưa cập nhật tiểu sử chi tiết.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedDoctor(null);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM MỚI BÁC SĨ */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg outline-none transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Thêm Bác Sĩ Mới
              </h2>
              <p className="text-xs text-slate-500 mt-1">Đăng ký thông tin tài khoản và chuyên môn cho bác sĩ mới tuyển dụng</p>
            </div>

            {createError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Nhóm 1: Tài khoản đăng nhập */}
              <div className="bg-slate-950/30 p-4 border border-slate-850/80 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider block">Tài khoản đăng nhập</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Địa chỉ Email <span className="text-rose-550">*</span></label>
                    <input
                      type="email"
                      required
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="bacsi@clinic.com"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Mật khẩu ban đầu <span className="text-rose-550">*</span></label>
                    <input
                      type="password"
                      required
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Hồ sơ cá nhân */}
              <div className="bg-slate-950/30 p-4 border border-slate-850/80 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider block">Hồ sơ cá nhân</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Họ và tên <span className="text-rose-550">*</span></label>
                    <input
                      type="text"
                      required
                      value={createFullName}
                      onChange={(e) => setCreateFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Số điện thoại</label>
                    <input
                      type="text"
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                      placeholder="Ví dụ: 0987xxxxxx"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Ngày sinh</label>
                    <input
                      type="date"
                      value={createBirthDate}
                      onChange={(e) => setCreateBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-300 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Thông tin chuyên môn */}
              <div className="bg-slate-950/30 p-4 border border-slate-850/80 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider block">Nghiệp vụ Y khoa</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Chuyên khoa khám <span className="text-rose-550">*</span></label>
                    <select
                      value={createSpecialtyId}
                      onChange={(e) => setCreateSpecialtyId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-300 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Chọn chuyên khoa...</option>
                      {specialties.map((spec) => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Số giấy phép hành nghề <span className="text-rose-550">*</span></label>
                    <input
                      type="text"
                      required
                      value={createLicenseNo}
                      onChange={(e) => setCreateLicenseNo(e.target.value)}
                      placeholder="Ví dụ: GPHN-12345/BYT"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Giới thiệu ngắn / Tiểu sử</label>
                  <textarea
                    value={createBio}
                    onChange={(e) => setCreateBio(e.target.value)}
                    placeholder="Mô tả tóm tắt kinh nghiệm làm việc, học vấn hoặc thế mạnh chuyên môn của bác sĩ..."
                    rows={3}
                    className="w-full p-4 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-650 to-indigo-650 hover:from-indigo-500 hover:to-indigo-550 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Tạo mới</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẬP NHẬT BÁC SĨ */}
      {isEditOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsEditOpen(false);
                setSelectedDoctor(null);
              }}
              className="absolute top-5 right-5 text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg outline-none transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                Cập Nhật Thông Tin Bác Sĩ
              </h2>
              <p className="text-xs text-slate-500 mt-1">Điều chỉnh hồ sơ cá nhân hoặc phân bố lại chuyên khoa khám của bác sĩ</p>
            </div>

            {editError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Nhóm 1: Hồ sơ cá nhân */}
              <div className="bg-slate-950/30 p-4 border border-slate-850/80 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider block">Hồ sơ cá nhân</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Họ và tên <span className="text-rose-550">*</span></label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Số điện thoại</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Ví dụ: 0987xxxxxx"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Ngày sinh</label>
                    <input
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-300 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Thông tin chuyên môn */}
              <div className="bg-slate-950/30 p-4 border border-slate-850/80 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider block">Nghiệp vụ Y khoa</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Chuyên khoa khám <span className="text-rose-550">*</span></label>
                    <select
                      value={editSpecialtyId}
                      onChange={(e) => setEditSpecialtyId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-300 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Chọn chuyên khoa...</option>
                      {specialties.map((spec) => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Số giấy phép hành nghề <span className="text-rose-550">*</span></label>
                    <input
                      type="text"
                      required
                      value={editLicenseNo}
                      onChange={(e) => setEditLicenseNo(e.target.value)}
                      placeholder="Ví dụ: GPHN-12345/BYT"
                      className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Giới thiệu ngắn / Tiểu sử</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Mô tả tóm tắt kinh nghiệm làm việc, học vấn hoặc thế mạnh chuyên môn của bác sĩ..."
                    rows={3}
                    className="w-full p-4 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedDoctor(null);
                  }}
                  className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-650 to-indigo-650 hover:from-indigo-500 hover:to-indigo-550 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
