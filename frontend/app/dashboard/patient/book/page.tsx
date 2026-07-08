'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { displayTimeRange } from '../../../../lib/utils/datetime';
import SearchableSelect from '../../../../components/ui/SearchableSelect';
import { PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';

// Số ngày tối đa được phép đặt lịch trước
const MAX_BOOKING_DAYS_AHEAD = 7;

export default function PatientBookAppointmentPage() {
  const [specialtiesList, setSpecialtiesList] = useState<{ id: string; name: string ; description:string}[]>([]);
  const [doctorsList, setDoctorsList] = useState<{ id: string; user: { fullName: string } ; licenseNo : string ;bio : string }[]>([]);
  const [slotsList, setSlotsList] = useState<{ id: string; startTime: string; endTime: string }[]>([]);

  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [successBooking, setSuccessBooking] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Tính chuỗi ngày YYYY-MM-DD theo giờ local (tránh lệch múi giờ khi dùng toISOString)
  const toDateInputValue = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = toDateInputValue(new Date());
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + MAX_BOOKING_DAYS_AHEAD);
  const maxDateStr = toDateInputValue(maxDateObj);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await api.get('/specialties?isActive=true&limit=100');
        setSpecialtiesList(response.data.data || response.data || []);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách chuyên khoa:', err);
      }
    };
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (!selectedSpecialtyId) return;
    const fetchDoctors = async () => {
      try {
        const response = await api.get(`/doctors?specialtyId=${selectedSpecialtyId}&isActive=true&limit=100`);
        setDoctorsList(response.data.data || response.data || []);
        setSelectedDoctorId('');
      } catch (err) {
        console.error('Lỗi khi lấy danh sách bác sĩ:', err);
      }
    };
    fetchDoctors();
  }, [selectedSpecialtyId]);

  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;
    const fetchSlots = async () => {
      try {
        const response = await api.get(`/doctors/${selectedDoctorId}/slots/available?date=${selectedDate}`);
        setSlotsList(response.data || []);
        setSelectedSlotId('');
      } catch (err) {
        console.error('Lỗi khi lấy danh sách slot khả dụng:', err);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  const handleDateChange = (value: string) => {
    // Chặn chọn ngày ngoài khoảng [today, today + 7 ngày] kể cả khi trình duyệt không hỗ trợ min/max
    if (value < todayStr) {
      setBookingError('Không thể đặt lịch khám cho ngày trong quá khứ.');
      return;
    }
    if (value > maxDateStr) {
      setBookingError(`Chỉ được đặt lịch khám trong vòng ${MAX_BOOKING_DAYS_AHEAD} ngày tới.`);
      return;
    }
    setBookingError(null);
    setSelectedDate(value);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    // Ràng buộc lần cuối phía client trước khi gửi request
    if (selectedDate < todayStr || selectedDate > maxDateStr) {
      setBookingError(`Chỉ được đặt lịch khám từ hôm nay đến trong vòng ${MAX_BOOKING_DAYS_AHEAD} ngày tới.`);
      return;
    }

    setIsBooking(true);
    setSuccessBooking(null);
    setBookingError(null);

    try {
      await api.post('/appointments', {
        slotId: selectedSlotId,
        symptoms: symptoms || undefined
      });

      const docName = doctorsList.find(d => d.id === selectedDoctorId)?.user.fullName || 'Bác sĩ';
      const chosenSlot = slotsList.find(s => s.id === selectedSlotId);
      const slotTimeStr = chosenSlot ? displayTimeRange(chosenSlot.startTime, chosenSlot.endTime) : '';

      setSuccessBooking(`Đăng ký thành công cuộc hẹn khám với ${docName} lúc ${slotTimeStr} ngày ${selectedDate.split('-').reverse().join('/')}. Vui lòng chờ xác nhận.`);

      setSelectedSpecialtyId('');
      setSelectedDoctorId('');
      setSelectedDate('');
      setSelectedSlotId('');
      setSymptoms('');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đặt lịch hẹn thất bại. Vui lòng kiểm tra lại!';
      setBookingError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-black text-slate-808" style={{ fontSize: '1.875rem' }}>
        Đặt lịch khám mới
      </h1>

      <div className="panel-card p-6 flex flex-col gap-4" style={{ maxWidth: '1040px' }}>
        <h2 className="panel-title flex items-center gap-2">
          <PlusCircle style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} />
          Đặt lịch hẹn khám trực tuyến
        </h2>

        {successBooking && (
          <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
            <CheckCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
            <span>{successBooking}</span>
          </div>
        )}

        {bookingError && (
          <div className="alert alert-error" style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
            <AlertCircle style={{ width: '1rem', height: '1rem', marginTop: '2px' }} />
            <span>{bookingError}</span>
          </div>
        )}

        <form onSubmit={handleBook} className="flex flex-col gap-4">
          {/* Specialty Select - có tìm kiếm */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label uppercase">Chọn chuyên khoa</label>
            <SearchableSelect
              options={specialtiesList.map((s) => ({ id: s.id, label: `${s.name} : (${s.description})`}))}
              value={selectedSpecialtyId}
              onChange={setSelectedSpecialtyId}
              placeholder="Chọn chuyên khoa khám"
              emptyText="Không tìm thấy chuyên khoa phù hợp"
            />
          </div>

          {/* Doctor Select - có tìm kiếm */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label uppercase">Chọn Bác sĩ phụ trách</label>
            <SearchableSelect
              options={doctorsList.map((d) => ({ id: d.id, label: `${d.user.fullName} - ${d.licenseNo} - ${d.bio}` }))}
              value={selectedDoctorId}
              onChange={setSelectedDoctorId}
              placeholder="Chọn bác sĩ khám bệnh"
              disabled={!selectedSpecialtyId}
              emptyText="Không tìm thấy bác sĩ phù hợp"
            />
          </div>

          {/* Date selection - giới hạn trong 7 ngày tới */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label uppercase">
              Ngày đăng ký khám
              <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
                (trong vòng {MAX_BOOKING_DAYS_AHEAD} ngày tới)
              </span>
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              min={todayStr}
              max={maxDateStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '1rem' }}
            />
          </div>

          {/* Slot select */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label uppercase">Chọn khung giờ khám trống</label>
            <select
              required
              disabled={!selectedDate || !selectedDoctorId}
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="select-control w-full"
            >
              <option value="" disabled>-- Chọn giờ khám --</option>
              {slotsList.map(s => (
                <option key={s.id} value={s.id}>
                  {displayTimeRange(s.startTime, s.endTime)}
                </option>
              ))}
              {selectedDate && selectedDoctorId && slotsList.length === 0 && (
                <option value="" disabled style={{ color: 'var(--color-warning)' }}>
                  Bác sĩ không có ca khám khả dụng ngày này
                </option>
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label uppercase">Mô tả triệu chứng bệnh lý</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Nhập triệu chứng của bạn (Ví dụ: đau họng, sốt nhẹ, đau đầu từ hôm qua...)"
              rows={2}
              className="emr-textarea"
            />
          </div>

          <button type="submit" disabled={isBooking || !selectedSlotId} className="btn btn-primary w-full" style={{ padding: '0.75rem' }}>
            {isBooking ? 'Đang gửi đăng ký...' : 'Xác nhận đặt lịch hẹn'}
          </button>
        </form>
      </div>
    </div>
  );
}