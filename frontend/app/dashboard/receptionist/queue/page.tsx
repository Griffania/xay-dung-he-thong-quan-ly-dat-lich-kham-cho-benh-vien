'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../../../../lib/api';
import '../receptionist.css';

interface RoomQueue {
  doctorId: string;
  doctorName: string;
  specialtyName: string;
  waitingCount: number;
  inProgressCount: number;
}

export default function ReceptionistQueuePage() {
  const [roomQueues, setRoomQueues] = useState<RoomQueue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lấy mật độ hàng đợi các phòng khám
  const fetchRoomQueues = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const response = await api.get(`/queues/monitor?date=${todayStr}`);
      setRoomQueues(response.data || []);
    } catch (err) {
      console.error('Lỗi khi tải mật độ hàng đợi:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Tự động làm mới mỗi 10 giây
  useEffect(() => {
    fetchRoomQueues(true);

    const interval = setInterval(() => {
      fetchRoomQueues(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="receptionist-container no-print">
      {/* Header */}
      <div className="receptionist-header">
        <div>
          <h1 className="receptionist-title">
            Xếp Hàng & Điều Phối Phòng Khám
          </h1>
          <p className="receptionist-subtitle">Giám sát và điều phối mật độ hàng đợi tại các phòng chuyên khoa</p>
        </div>

        <div className="receptionist-actions">
          <button 
            onClick={() => fetchRoomQueues(true)}
            disabled={isLoading}
            className="btn btn-secondary receptionist-btn-refresh"
          >
            <RefreshCw className={`receptionist-btn-icon-lg ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="receptionist-grid">
        {/* Main Content Card: Clinic queues monitor */}
        <div className="receptionist-main-col" style={{ gridColumn: 'span 5' }}>
          <div className="panel-card p-6 receptionist-monitor-card">
            <h3 className="panel-title receptionist-monitor-title" style={{ fontSize: '1rem' }}>
              <Activity className="receptionist-monitor-icon" style={{ width: '1.25rem', height: '1.25rem' }} />
              Mật độ hàng đợi các phòng khám
            </h3>
            
            <div className="receptionist-monitor-list" style={{ marginTop: '1rem', gap: '1.5rem' }}>
              {isLoading && roomQueues.length === 0 ? (
                <div className="fallback-loader" style={{ minHeight: '20vh' }}>
                  <div className="spinner"></div>
                </div>
              ) : roomQueues.length === 0 ? (
                <p className="receptionist-monitor-empty" style={{ fontSize: '13px', padding: '3rem 0' }}>Chưa có phòng khám nào hoạt động hôm nay.</p>
              ) : (
                roomQueues.map(rq => (
                  <div key={rq.doctorId} className="clinic-density-item" style={{ gap: '0.5rem' }}>
                    <div className="clinic-density-header" style={{ fontSize: '0.875rem' }}>
                      <span className="receptionist-monitor-doctor-name" style={{ fontWeight: 700 }}>
                        {rq.doctorName} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({rq.specialtyName})</span>
                      </span>
                      <span className="receptionist-monitor-doctor-count" style={{ fontSize: '0.875rem' }}>
                        {rq.waitingCount} người chờ • Đang khám: {rq.inProgressCount}
                      </span>
                    </div>
                    <div className="clinic-density-bar-bg" style={{ height: '8px' }}>
                      <div 
                        className="clinic-density-bar-fill"
                        style={{ 
                          height: '100%',
                          width: `${Math.min(rq.waitingCount * 12.5, 100)}%`,
                          backgroundColor: rq.waitingCount > 8 ? 'var(--color-danger)' : rq.waitingCount > 4 ? 'var(--color-warning)' : 'var(--color-primary)'
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
