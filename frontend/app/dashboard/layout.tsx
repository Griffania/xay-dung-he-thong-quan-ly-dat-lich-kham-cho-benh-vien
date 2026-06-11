'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LogOut, 
  User, 
  Menu, 
  X, 
  Shield, 
  Stethoscope, 
  ClipboardList, 
  Calendar, 
  Activity, 
  History, 
  Users, 
  Settings,
  HeartHandshake
} from 'lucide-react';
import api from '../../lib/api';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }
      setCurrentUser(JSON.parse(userStr));
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      
      router.push('/login');
      router.refresh();
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const role = currentUser.role?.toUpperCase();

  // Định nghĩa menu điều hướng động theo vai trò (Role-based Navigation)
  const getSidebarItems = (): SidebarItem[] => {
    switch (role) {
      case 'ADMIN':
        return [
          { label: 'Tổng quan Hệ thống', href: '/dashboard/admin', icon: Shield },
          { label: 'Quản lý Tài khoản', href: '/dashboard/admin#users', icon: Users },
          { label: 'Quản lý Bác sĩ', href: '/dashboard/admin/doctors', icon: User },
          { label: 'Quản lý Chuyên khoa', href: '/dashboard/admin/specialties', icon: Stethoscope },
          { label: 'Nhật ký Hoạt động', href: '/dashboard/admin#logs', icon: ClipboardList },
          { label: 'Cấu hình Hệ thống', href: '/dashboard/admin#settings', icon: Settings },
        ];
      case 'DOCTOR':
        return [
          { label: 'Lịch khám bệnh', href: '/dashboard/doctor', icon: Calendar },
          { label: 'Hàng đợi khám', href: '/dashboard/doctor#queue', icon: Activity },
          { label: 'Hồ sơ bệnh án', href: '/dashboard/doctor#records', icon: ClipboardList },
        ];
      case 'RECEPTIONIST':
        return [
          { label: 'Quầy tiếp đón', href: '/dashboard/receptionist', icon: HeartHandshake },
          { label: 'Xếp hàng & Điều phối', href: '/dashboard/receptionist#queue', icon: Activity },
          { label: 'Đặt lịch hẹn mới', href: '/dashboard/receptionist#bookings', icon: Calendar },
        ];
      case 'PATIENT':
        return [
          { label: 'Lịch hẹn của tôi', href: '/dashboard/patient', icon: Calendar },
          { label: 'Đặt lịch khám mới', href: '/dashboard/patient#book', icon: HeartHandshake },
          { label: 'Lịch sử khám bệnh', href: '/dashboard/patient#history', icon: History },
        ];
      default:
        return [];
    }
  };

  const menuItems = getSidebarItems();

  const getRoleIcon = () => {
    if (role === 'ADMIN') return <Shield className="w-5 h-5 text-indigo-400" />;
    if (role === 'DOCTOR') return <Stethoscope className="w-5 h-5 text-emerald-400" />;
    return <User className="w-5 h-5 text-purple-400" />;
  };

  const getRoleBadgeColor = () => {
    if (role === 'ADMIN') return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300';
    if (role === 'DOCTOR') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
    if (role === 'RECEPTIONIST') return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
    return 'bg-pink-500/10 border-pink-500/20 text-pink-300'; // Patient
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/25">
            C
          </div>
          <span className="font-bold text-lg text-white">Clinic System</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR - DESKTOP & MOBILE DRAW RENDER */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/60 p-6 flex flex-col justify-between transition-transform duration-300 transform
        md:translate-x-0 md:static md:h-screen md:bg-slate-900/20
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white shadow-xl shadow-indigo-600/20">
              C
            </div>
            <div>
              <span className="font-bold text-lg text-white block leading-none">Clinic System</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Hospital Portal</span>
            </div>
          </div>

          {/* User Brief Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800/60 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              {getRoleIcon()}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="font-semibold text-white text-sm block truncate">{currentUser.fullName}</span>
              <span className="text-[11px] text-slate-400 block truncate">{currentUser.email}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase pl-3 block mb-2">Chức năng chính</span>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-4 pt-6 border-t border-slate-800/60">
          <div className="flex justify-between items-center px-2">
            <span className="text-xs text-slate-500 font-medium">Vai trò</span>
            <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full uppercase tracking-wider ${getRoleBadgeColor()}`}>
              {role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800/80 hover:bg-rose-950/10 hover:border-rose-900/35 hover:text-rose-400 active:scale-98 text-slate-400 font-semibold rounded-2xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden animate-fade-in"
        ></div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        <div className="flex-1 p-6 md:p-10 lg:p-12 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
