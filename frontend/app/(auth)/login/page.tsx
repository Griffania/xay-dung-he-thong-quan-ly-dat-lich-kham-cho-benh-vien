'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError('Email không được để trống!');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Email không đúng định dạng!');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Mật khẩu không được để trống!');
      return false;
    }
    if (val.length < 6) {
      setPasswordError('Mật khẩu phải có tối thiểu 6 ký tự!');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user } = response.data;

      // Lưu trữ thông tin đăng nhập vào localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Thiết lập cookie chứa access token cho middleware kiểm tra (phía server)
      document.cookie = `accessToken=${accessToken}; path=/; max-age=900; SameSite=Lax;`;

      // Chuyển hướng thông minh dựa trên vai trò người dùng (Role Redirect)
      const role = user?.role?.toUpperCase();
      let targetPath = '/dashboard';
      if (role === 'ADMIN') {
        targetPath = '/dashboard/admin';
      } else if (role === 'DOCTOR') {
        targetPath = '/dashboard/doctor';
      } else if (role === 'RECEPTIONIST') {
        targetPath = '/dashboard/receptionist';
      } else if (role === 'PATIENT') {
        targetPath = '/dashboard/patient';
      }

      router.push(targetPath);
      router.refresh();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
          <ShieldCheck className="w-7 h-7 text-indigo-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
          Hệ thống Y tế Clinic
        </h1>
        <p className="text-slate-400 text-sm mt-1.5 font-medium">Đăng nhập cổng quản trị viên & nhân viên</p>
      </div>

      {/* Error Alert from Server */}
      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-rose-200 text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email field */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300 block" htmlFor="email">
            Địa chỉ Email
          </label>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              placeholder="bacsi@clinic.com"
              className={`w-full pl-11 pr-4 py-3 bg-slate-950/40 border ${
                emailError ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-slate-800/80 focus:border-indigo-500 focus:ring-indigo-500/20'
              } focus:ring-4 rounded-2xl text-white placeholder-slate-600 outline-none transition-all duration-200`}
            />
          </div>
          {emailError && (
            <p className="text-rose-400 text-xs mt-1 flex items-center gap-1 animate-in fade-in duration-200">
              <AlertCircle className="w-3.5 h-3.5" /> {emailError}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300 block" htmlFor="password">
            Mật khẩu
          </label>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(e.target.value);
              }}
              onBlur={(e) => validatePassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full pl-11 pr-11 py-3 bg-slate-950/40 border ${
                passwordError ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-slate-800/80 focus:border-indigo-500 focus:ring-indigo-500/20'
              } focus:ring-4 rounded-2xl text-white placeholder-slate-600 outline-none transition-all duration-200`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-rose-400 text-xs mt-1 flex items-center gap-1 animate-in fade-in duration-200">
              <AlertCircle className="w-3.5 h-3.5" /> {passwordError}
            </p>
          )}
        </div>

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between text-sm pt-1">
          <label className="flex items-center gap-2.5 text-slate-400 select-none cursor-pointer group hover:text-slate-300 transition-colors">
            <input
              type="checkbox"
              className="w-4.5 h-4.5 rounded-lg border-slate-800 bg-slate-950/40 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 outline-none cursor-pointer"
            />
            <span className="text-sm font-medium">Ghi nhớ đăng nhập</span>
          </label>
          <a href="#" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-all font-semibold">
            Quên mật khẩu?
          </a>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-200 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Đăng nhập hệ thống</span>
            </>
          )}
        </button>
      </form>
    </>
  );
}
