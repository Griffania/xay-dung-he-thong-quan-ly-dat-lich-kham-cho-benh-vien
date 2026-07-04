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
      <div className="fallback-loader">
        <div className="spinner"></div>
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
    if (role === 'ADMIN') return <Shield style={{ width: '1.25rem', height: '1.25rem' }} className="text-primary" />;
    if (role === 'DOCTOR') return <Stethoscope style={{ width: '1.25rem', height: '1.25rem' }} className="text-success" />;
    return <User style={{ width: '1.25rem', height: '1.25rem' }} className="text-slate-400" />;
  };

  const getRoleBadgeClass = () => {
    if (role === 'ADMIN') return 'badge badge-admin';
    if (role === 'DOCTOR') return 'badge badge-doctor';
    if (role === 'RECEPTIONIST') return 'badge badge-receptionist';
    return 'badge badge-patient';
  };

  return (
    <div className="dashboard-layout">
      {/* MOBILE HEADER BAR */}
      <div className="mobile-header">
        <div className="logo-container">
          <div className="logo-square">
            C
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X style={{ width: '1.5rem', height: '1.5rem' }} /> : <Menu style={{ width: '1.5rem', height: '1.5rem' }} />}
        </button>
      </div>

      {/* SIDEBAR - DESKTOP & MOBILE DRAW RENDER */}
      <aside className={`dashboard-sidebar ${isMobileMenuOpen ? '' : 'collapsed'}`}>
        <div className="flex flex-col gap-6">
          {/* Logo Brand */}
          <div className="sidebar-logo">
            <div className="logo-square">
              C
            </div>
            <div>
              <span className="brand-name block" style={{ fontSize: '1.125rem', lineHeight: 1 }}> System</span>
            </div>
          </div>

          {/* User Brief Card */}
          <div className="user-brief-card">
            <div className="user-brief-icon">
              {getRoleIcon()}
            </div>
            <div className="user-brief-info">
              <span className="user-brief-name">{currentUser.fullName}</span>
              <span className="user-brief-email">{currentUser.email}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <span className="nav-section-title">Chức năng chính</span>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <Icon className="nav-icon" style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="sidebar-bottom">
          <div className="role-badge-row">
            <span className="role-badge-label">Vai trò</span>
            <span className={getRoleBadgeClass()}>
              {role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-secondary w-full"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut style={{ width: '1rem', height: '1rem' }} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="mobile-overlay"
        ></div>
      )}

      {/* MAIN CONTAINER */}
      <main className="dashboard-main">
        <div className="dashboard-content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}



