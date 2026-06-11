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
  Stethoscope,
  FileText
} from 'lucide-react';
import api from '../../../../lib/api';

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export default function SpecialtiesAdminPage() {
  // State quản lý danh sách và phân trang
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [meta, setMeta] = useState<MetaData>({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);

  // State bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (Tất cả), 'true' (Đang hoạt động), 'false' (Tạm ngưng)
  const [currentPage, setCurrentPage] = useState(1);

  // State quản lý Toast Alert thông báo thành công/lỗi
  const [toast, setToast] = useState<Toast | null>(null);

  // State quản lý Modal thêm mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // State quản lý Modal cập nhật
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // State khóa/mở khóa nhanh để hiển thị spinner trên dòng
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Hàm trigger hiển thị Toast
  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Hàm gọi API lấy danh sách chuyên khoa
  const fetchSpecialties = useCallback(async (page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await api.get('/specialties', {
        params: {
          search: searchQuery || undefined,
          isActive: statusFilter !== '' ? statusFilter : undefined,
          page: page.toString(),
          limit: '5', // Giới hạn 5 dòng trên trang cho bố cục đẹp mắt
        }
      });
      setSpecialties(response.data.data);
      setMeta(response.data.meta);
      setCurrentPage(response.data.meta.page);
    } catch (error: any) {
      console.error('Error fetching specialties:', error);
      triggerToast('error', error.response?.data?.message || 'Không thể tải danh sách chuyên khoa!');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  // Tải dữ liệu khi thay đổi trang, từ khóa hoặc bộ lọc trạng thái
  useEffect(() => {
    fetchSpecialties(currentPage);
  }, [currentPage, statusFilter, fetchSpecialties]);

  // Xử lý khi nhấn nút tìm kiếm / Enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSpecialties(1);
  };

  // Thay đổi trạng thái chuyên khoa (Kích hoạt / Vô hiệu hóa)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setActioningId(id);
    const endpoint = currentStatus ? `/specialties/${id}/disable` : `/specialties/${id}/enable`;
    const actionName = currentStatus ? 'Vô hiệu hóa' : 'Kích hoạt lại';

    try {
      const response = await api.post(endpoint);
      triggerToast('success', response.data.message || `${actionName} chuyên khoa thành công!`);
      // Cập nhật local state ngay lập tức để UI mượt mà
      setSpecialties(prev => prev.map(s => s.id === id ? { ...s, isActive: !currentStatus } : s));
    } catch (error: any) {
      console.error(`Error toggling status for ${id}:`, error);
      triggerToast('error', error.response?.data?.message || `Không thể ${actionName.toLowerCase()} chuyên khoa!`);
    } finally {
      setActioningId(null);
    }
  };

  // Gửi biểu mẫu tạo mới chuyên khoa
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validate phía client
    if (!createName.trim()) {
      setCreateError('Tên chuyên khoa không được để trống!');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/specialties', {
        name: createName.trim(),
        description: createDesc.trim() || undefined
      });
      
      triggerToast('success', response.data.message || 'Thêm chuyên khoa mới thành công!');
      
      // Reset form & Close modal
      setCreateName('');
      setCreateDesc('');
      setIsCreateOpen(false);
      
      // Reload danh sách
      setCurrentPage(1);
      fetchSpecialties(1);
    } catch (error: any) {
      console.error('Error creating specialty:', error);
      setCreateError(error.response?.data?.message || 'Có lỗi xảy ra khi tạo chuyên khoa!');
    } finally {
      setIsCreating(false);
    }
  };

  // Mở modal sửa chuyên khoa và gán dữ liệu ban đầu
  const handleOpenEdit = (specialty: Specialty) => {
    setSelectedSpecialty(specialty);
    setEditName(specialty.name);
    setEditDesc(specialty.description || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  // Gửi biểu mẫu cập nhật chuyên khoa
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecialty) return;
    setEditError(null);

    // Validate client
    if (!editName.trim()) {
      setEditError('Tên chuyên khoa không được để trống!');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await api.patch(`/specialties/${selectedSpecialty.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || null
      });

      triggerToast('success', response.data.message || 'Cập nhật thông tin chuyên khoa thành công!');
      
      // Close modal
      setIsEditOpen(false);
      setSelectedSpecialty(null);

      // Reload dữ liệu trang hiện tại
      fetchSpecialties(currentPage);
    } catch (error: any) {
      console.error('Error updating specialty:', error);
      setEditError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật chuyên khoa!');
    } finally {
      setIsUpdating(false);
    }
  };

  // Định dạng ngày giờ hiển thị chuẩn Việt Nam
  const formatDate = (dateStr: string) => {
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
      {/* Toast Alert floating */}
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
            Quản lý Chuyên Khoa
          </h1>
          <p className="text-slate-400 mt-1">Cấu hình danh mục khoa khám bệnh phục vụ đặt lịch và phân bổ bác sĩ</p>
        </div>
        
        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-650/20 hover:shadow-indigo-600/30 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm Chuyên Khoa</span>
        </button>
      </div>

      {/* Filters Form controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/20 p-4 border border-slate-800/50 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-sm flex items-center">
          <input
            type="text"
            placeholder="Tìm kiếm chuyên khoa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
          />
          <Search className="w-4.5 h-4.5 text-slate-500 absolute left-4" />
          <button type="submit" className="hidden">Tìm</button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-300 outline-none transition-all cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm ngưng hoạt động</option>
          </select>

          {/* Làm mới dữ liệu */}
          <button
            onClick={() => fetchSpecialties(currentPage)}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-400 hover:text-white rounded-xl border border-slate-700/60 transition-all disabled:opacity-50 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Specialties Table Grid container */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden min-h-[300px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/60">
              <tr>
                <th className="px-6 py-4.5 w-[30%]">Tên chuyên khoa</th>
                <th className="px-6 py-4.5 w-[40%]">Mô tả chuyên môn</th>
                <th className="px-6 py-4.5 w-[15%]">Ngày tạo lập</th>
                <th className="px-6 py-4.5 w-[15%] text-center">Trạng thái</th>
                <th className="px-6 py-4.5 w-[10%] text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/40">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: meta.limit || 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6"><div className="h-4 bg-slate-850 rounded w-2/3"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-850 rounded w-11/12"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-850 rounded w-2/3"></div></td>
                    <td className="px-6 py-6 text-center"><div className="h-5 bg-slate-850 rounded-full w-20 mx-auto"></div></td>
                    <td className="px-6 py-6 text-center"><div className="h-8 bg-slate-850 rounded-lg w-16 mx-auto"></div></td>
                  </tr>
                ))
              ) : specialties.length > 0 ? (
                specialties.map((spec) => (
                  <tr key={spec.id} className="hover:bg-slate-800/10 transition-colors group">
                    {/* Tên chuyên khoa */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          <Stethoscope className="w-4.5 h-4.5" />
                        </div>
                        <span className="font-semibold text-white tracking-wide">{spec.name}</span>
                      </div>
                    </td>

                    {/* Mô tả */}
                    <td className="px-6 py-4 text-slate-400 text-sm max-w-md truncate" title={spec.description || ''}>
                      {spec.description ? (
                        spec.description
                      ) : (
                        <span className="text-slate-600 italic">Chưa có mô tả chi tiết...</span>
                      )}
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {formatDate(spec.createdAt)}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 border text-[11px] font-bold rounded-full uppercase tracking-wider ${
                        spec.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${spec.isActive ? 'bg-emerald-450' : 'bg-rose-450'}`}></span>
                        {spec.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Nút sửa */}
                        <button
                          onClick={() => handleOpenEdit(spec)}
                          className="p-1.5 hover:bg-slate-800 text-slate-450 hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Nút Khóa / Mở */}
                        <button
                          onClick={() => handleToggleStatus(spec.id, spec.isActive)}
                          disabled={actioningId === spec.id}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            spec.isActive 
                              ? 'text-rose-550 hover:text-rose-400 hover:bg-rose-950/15'
                              : 'text-emerald-550 hover:text-emerald-400 hover:bg-emerald-950/15'
                          } disabled:opacity-30`}
                          title={spec.isActive ? 'Vô hiệu hóa chuyên khoa' : 'Kích hoạt chuyên khoa'}
                        >
                          {actioningId === spec.id ? (
                            <div className="w-4 h-4 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin"></div>
                          ) : spec.isActive ? (
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
                // Empty state
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-550">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-500">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-white mb-1">Không tìm thấy chuyên khoa nào</h3>
                      <p className="text-sm text-slate-550">Thử thay đổi từ khóa tìm kiếm hoặc chọn lọc trạng thái khác để quét dữ liệu.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls footer */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4.5 border-t border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Hiển thị trang <strong className="text-slate-350">{meta.page}</strong> / <strong className="text-slate-350">{meta.totalPages}</strong> ({meta.total} chuyên khoa)
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

      {/* CREATE MODAL DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-6">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg outline-none transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Thêm Chuyên Khoa Mới
              </h2>
              <p className="text-xs text-slate-500 mt-1">Điền đầy đủ thông tin chuyên khoa mới để mở cửa khoa tiếp nhận bệnh</p>
            </div>

            {createError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Tên chuyên khoa <span className="text-rose-550">*</span></label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ví dụ: Khoa Nhi, Khoa Nội Tim Mạch..."
                  className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Mô tả chuyên môn / Giới thiệu</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt về phạm vi điều trị của khoa này..."
                  rows={4}
                  className="w-full p-4 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all resize-none"
                />
              </div>

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

      {/* EDIT MODAL DIALOG */}
      {isEditOpen && selectedSpecialty && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setIsEditOpen(false);
                setSelectedSpecialty(null);
              }}
              className="absolute top-5 right-5 text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg outline-none transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                Cập Nhật Chuyên Khoa
              </h2>
              <p className="text-xs text-slate-500 mt-1">Điều chỉnh thông tin hoặc mô tả của chuyên khoa đang hoạt động</p>
            </div>

            {editError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Tên chuyên khoa <span className="text-rose-550">*</span></label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ví dụ: Khoa Nhi, Khoa Nội Tim Mạch..."
                  className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Mô tả chuyên môn / Giới thiệu</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt về phạm vi điều trị của khoa này..."
                  rows={4}
                  className="w-full p-4 bg-slate-950/40 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedSpecialty(null);
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
