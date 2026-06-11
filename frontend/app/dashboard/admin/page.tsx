'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Server, 
  Database, 
  Users, 
  Terminal, 
  Cpu, 
  HardDrive, 
  RefreshCw,
  Search,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  operator: string;
  role: string;
  target: string;
  time: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMockLogs = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLogs([
        { id: '1', action: 'UPDATE_PROFILE', operator: 'admin_sys', role: 'ADMIN', target: 'Bác sĩ Nguyễn Văn A', time: '11:45:22', status: 'SUCCESS' },
        { id: '2', action: 'CREATE_RECORD', operator: 'dr_minh', role: 'DOCTOR', target: 'Bệnh án bệnh nhân Trần B', time: '11:30:10', status: 'SUCCESS' },
        { id: '3', action: 'DELETE_SCHEDULE', operator: 'reception_lan', role: 'RECEPTIONIST', target: 'Slot khám ngày 05/06', time: '11:15:05', status: 'WARNING' },
        { id: '4', action: 'USER_LOGIN', operator: 'patient_hoang', role: 'PATIENT', target: 'Đăng nhập cổng Patient', time: '11:02:40', status: 'SUCCESS' },
        { id: '5', action: 'LOCK_ACCOUNT', operator: 'admin_sys', role: 'ADMIN', target: 'Tài khoản: test_hack@gmail.com', time: '10:50:18', status: 'FAILED' },
        { id: '6', action: 'BACKUP_DB', operator: 'SYSTEM_CRON', role: 'SYSTEM', target: 'Cơ sở dữ liệu PostgreSQL', time: '09:00:00', status: 'SUCCESS' },
      ]);
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchMockLogs();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* Header Title */}
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
          Bảng Quản trị Hệ thống
        </h1>
        <p className="text-slate-400 mt-1">Giám sát tài nguyên máy chủ, người dùng và nhật ký bảo mật y tế</p>
      </div>

      {/* Hardware / Service Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU Monitor */}
        <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Tải CPU Máy Chủ</span>
            <span className="text-3xl font-black text-white">24.8 %</span>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-1/4 h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"></div>
            </div>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* RAM Monitor */}
        <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Bộ nhớ RAM</span>
            <span className="text-3xl font-black text-white">1.4 GB / 4 GB</span>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[35%] h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"></div>
            </div>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* Database Connection */}
        <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Kết nối Cơ sở dữ liệu</span>
            <span className="text-3xl font-black text-emerald-400">Connected</span>
            <p className="text-slate-500 text-xs font-medium">Độ trễ truy vấn: 14ms (PostgreSQL)</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* User Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 bg-slate-900/20 border border-slate-800/60 rounded-2xl">
          <span className="text-xs text-slate-500 font-semibold block">Tổng Bệnh Nhân</span>
          <span className="text-2xl font-bold text-white mt-1 block">1,248</span>
        </div>
        <div className="p-5 bg-slate-900/20 border border-slate-800/60 rounded-2xl">
          <span className="text-xs text-slate-500 font-semibold block">Tổng Bác Sĩ</span>
          <span className="text-2xl font-bold text-white mt-1 block">42</span>
        </div>
        <div className="p-5 bg-slate-900/20 border border-slate-800/60 rounded-2xl">
          <span className="text-xs text-slate-500 font-semibold block">Tổng Lễ Tân</span>
          <span className="text-2xl font-bold text-white mt-1 block">8</span>
        </div>
        <div className="p-5 bg-slate-900/20 border border-slate-800/60 rounded-2xl">
          <span className="text-xs text-slate-500 font-semibold block">Phiên Đăng Nhập Hoạt Động</span>
          <span className="text-2xl font-bold text-indigo-400 mt-1 block">18</span>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-3xl shadow-xl overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Lịch sử thay đổi hệ thống (Audit Logs)</h2>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={fetchMockLogs} 
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-700/80 rounded-xl hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 rounded-xl hover:bg-indigo-500 text-white transition-all cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất báo cáo
            </button>
          </div>
        </div>

        {/* Live Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/60">
              <tr>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Người thực hiện</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Đối tượng tác động</th>
                <th className="px-6 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/40">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.time}</td>
                  <td className="px-6 py-4 font-semibold text-white">{log.operator}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${
                      log.role === 'ADMIN' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                      log.role === 'DOCTOR' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      log.role === 'RECEPTIONIST' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-slate-850 border-slate-700 text-slate-400'
                    }`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{log.action}</td>
                  <td className="px-6 py-4 text-slate-300">{log.target}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      log.status === 'SUCCESS' ? 'text-emerald-400' :
                      log.status === 'WARNING' ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'SUCCESS' ? 'bg-emerald-400' :
                        log.status === 'WARNING' ? 'bg-amber-400' :
                        'bg-rose-400'
                      }`}></span>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
