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
      {/*header trang đăng nhập*/}
      <div className="auth-header">
        <div className="logo-box">
          <ShieldCheck className="text-primary" style={{ width: '1.75rem', height: '1.75rem' }} />
        </div>
        <h1 className="auth-title">
          ĐĂNG NHẬP
        </h1>
      </div>

      {/* Error Alert from Server */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="shrink-0 text-danger" style={{ width: '1.25rem', height: '1.25rem', marginTop: '2px' }} />
          <p>{error}</p>
        </div>
      )}

      {/* form đăng nhập */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* ô nhập vào email đăng nhập */}
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Mail style={{ width: '1.25rem', height: '1.25rem' }} />
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
              placeholder="...@clinic.com"
              className={`input-control ${emailError ? 'error' : ''}`}
            />
          </div>
          {emailError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.875rem', height: '0.875rem' }} /> {emailError}
            </p>
          )}
        </div>

        {/* ô nhập vào mật khẩu */}
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Mật khẩu
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Lock style={{ width: '1.25rem', height: '1.25rem' }} />
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
              className={`input-control ${passwordError ? 'error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="input-icon-right"
            >
              {showPassword ? <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} /> : <Eye style={{ width: '1.25rem', height: '1.25rem' }} />}
            </button>
          </div>
          {passwordError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.875rem', height: '0.875rem' }} /> {passwordError}
            </p>
          )}
        </div>

        {/* nút đăng nhập*/}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full mt-2"
        >
          {isLoading ? (
            <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', margin: 0 }}></div>
          ) : (
            <>
              <LogIn style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>Đăng nhập</span>
            </>
          )}
        </button>
      </form>

      {/* link tới trang đăng ký nếu như chưa có tài khoản */}
      <div className="text-center mt-6 text-slate-500" style={{ fontSize: '0.75rem' }}>
        Bạn là chưa có tài khoản?{' '}
        <a 
          href="/register" 
          className="link-btn"
        >
          Đăng ký tài khoản mới
        </a>
      </div>
    </>
  );
}

