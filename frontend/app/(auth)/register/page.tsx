'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, Calendar, ArrowLeft, AlertCircle, CheckCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  
  // Trạng thái biểu mẫu
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Trạng thái xử lý & lỗi
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Trạng thái kiểm tra lỗi đầu vào (Client-side validation)
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);

  const validateFullName = (val: string) => {
    if (!val.trim()) {
      setFullNameError('Họ và tên không được để trống!');
      return false;
    }
    setFullNameError(null);
    return true;
  };

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

  const validatePhone = (val: string) => {
    if (val) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(val)) {
        setPhoneError('Số điện thoại phải gồm 10 hoặc 11 chữ số!');
        return false;
      }
    }
    setPhoneError(null);
    return true;
  };

  const validateBirthDate = (val: string) => {
    if (val) {
      const selected = new Date(val);
      const today = new Date();
      if (selected > today) {
        setBirthDateError('Ngày sinh không được vượt quá ngày hiện tại!');
        return false;
      }
    }
    setBirthDateError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const isNameValid = validateFullName(fullName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isPhoneValid = validatePhone(phone);
    const isBirthDateValid = validateBirthDate(birthDate);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isPhoneValid || !isBirthDateValid) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        fullName,
        email,
        password,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
      });

      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng về trang đăng nhập...');
      
      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setBirthDate('');

      // Chuyển hướng về login sau 2 giây
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại!';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* header trang đăng ký */}
      <div className="auth-header">
        <div className="logo-box">
          <ShieldCheck className="text-primary" style={{ width: '1.5rem', height: '1.5rem' }} />
        </div>
        <h1 className="auth-title" style={{ fontSize: '1.125rem' }}>
          Đăng ký
        </h1>
      </div>

      {/* thông báo tạo tài khoản thành công */}
      {success && (
        <div className="alert alert-success">
          <CheckCircle className="shrink-0 text-success" style={{ width: '1.25rem', height: '1.25rem', marginTop: '2px' }} />
          <p>{success}</p>
        </div>
      )}

      {/* thông báo tạo tài khoản ko thành công */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="shrink-0 text-danger" style={{ width: '1.25rem', height: '1.25rem', marginTop: '2px' }} />
          <p>{error}</p>
        </div>
      )}

      {/* form đăng ký */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* ô chứa tên người dùng */}
        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label className="form-label font-bold text-slate-700" htmlFor="fullName">
            Họ và tên <span className="text-danger">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <User style={{ width: '1.125rem', height: '1.125rem' }} />
            </span>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fullNameError) validateFullName(e.target.value);
              }}
              onBlur={(e) => validateFullName(e.target.value)}
              placeholder="Họ tên"
              className={`input-control ${fullNameError ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          {fullNameError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} /> {fullNameError}
            </p>
          )}
        </div>

        {/* ô chứa email người dùng */}
        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label className="form-label font-bold text-slate-700" htmlFor="email">
            Địa chỉ Email <span className="text-danger">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Mail style={{ width: '1.125rem', height: '1.125rem' }} />
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
              placeholder="...@gmail.com"
              className={`input-control ${emailError ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          {emailError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} /> {emailError}
            </p>
          )}
        </div>

        {/* ô chứa mật khẩu người dùng */}
        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label className="form-label font-bold text-slate-700" htmlFor="password">
            Mật khẩu <span className="text-danger">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Lock style={{ width: '1.125rem', height: '1.125rem' }} />
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
              style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="input-icon-right"
            >
              {showPassword ? <EyeOff style={{ width: '1.125rem', height: '1.125rem' }} /> : <Eye style={{ width: '1.125rem', height: '1.125rem' }} />}
            </button>
          </div>
          {passwordError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} /> {passwordError}
            </p>
          )}
        </div>

        {/* ô chứa số điện thoại người dùng */}
        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label className="form-label font-bold text-slate-700" htmlFor="phone">
            Số điện thoại <span className="text-slate-400 font-normal">(Tùy chọn)</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Phone style={{ width: '1.125rem', height: '1.125rem' }} />
            </span>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) validatePhone(e.target.value);
              }}
              onBlur={(e) => validatePhone(e.target.value)}
              placeholder="0844342445"
              className={`input-control ${phoneError ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          {phoneError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} /> {phoneError}
            </p>
          )}
        </div>

        {/* ngày sinh của người dùng */}
        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label className="form-label font-bold text-slate-700" htmlFor="birthDate">
            Ngày sinh <span className="text-slate-400 font-normal">(Tùy chọn)</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Calendar style={{ width: '1.125rem', height: '1.125rem' }} />
            </span>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                if (birthDateError) validateBirthDate(e.target.value);
              }}
              onBlur={(e) => validateBirthDate(e.target.value)}
              className={`input-control ${birthDateError ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          {birthDateError && (
            <p className="form-error-msg">
              <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} /> {birthDateError}
            </p>
          )}
        </div>

        {/* nút đăng ký */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full mt-3"
          style={{ fontSize: '0.875rem' }}
        >
          {isLoading ? (
            <div className="spinner" style={{ width: '1rem', height: '1rem', margin: 0 }}></div>
          ) : (
            <span>Đăng ký</span>
          )}
        </button>
      </form>

      {/* trở về trang đăng nhập khi đăng ký thành công */}
      <div className="text-center mt-6" style={{ fontSize: '0.75rem' }}>
        <a 
          href="/login" 
          className="link-btn flex items-center justify-center gap-1.5"
          style={{ color: '#64748b' }}
        >
          <ArrowLeft style={{ width: '0.875rem', height: '0.875rem' }} />
          Quay lại Đăng nhập
        </a>
      </div>
    </>
  );
}
