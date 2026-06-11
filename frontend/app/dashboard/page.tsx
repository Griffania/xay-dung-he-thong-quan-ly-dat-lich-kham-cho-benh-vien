'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }
      try {
        const user = JSON.parse(userStr);
        const role = user?.role?.toLowerCase();
        
        // Chuyển hướng người dùng dựa vào vai trò
        if (role === 'admin' || role === 'doctor' || role === 'receptionist' || role === 'patient') {
          router.push(`/dashboard/${role}`);
        } else {
          router.push('/login');
        }
      } catch (e) {
        console.error('Error parsing user data in dashboard page:', e);
        router.push('/login');
      }
    }
  }, [router]);

  // Hiển thị vòng xoay tải trang trong thời gian chuyển hướng ngắn
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] text-slate-400">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium animate-pulse">Đang định tuyến đến bảng điều khiển của bạn...</p>
    </div>
  );
}
