'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Chọn',
  disabled = false,
  emptyText = 'Không tìm thấy kết quả phù hợp',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase().trim())
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Ô hiển thị / trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="select-control w-full"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ color: selectedOption ? 'inherit' : 'var(--text-muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
      </button>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Ô tìm kiếm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <Search style={{ width: '0.875rem', height: '0.875rem', color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.8125rem',
                width: '100%',
                background: 'transparent',
              }}
            />
            {query && (
              <X
                style={{ width: '0.875rem', height: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setQuery('')}
              />
            )}
          </div>

          {/* Danh sách kết quả */}
          <div style={{ overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <p style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {emptyText}
              </p>
            ) : (
              filteredOptions.map((o) => (
                <div
                  key={o.id}
                  onClick={() => handleSelect(o.id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    backgroundColor: o.id === value ? 'var(--bg-light, #f1f5f9)' : 'transparent',
                    fontWeight: o.id === value ? 600 : 400,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-light, #f1f5f9)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = o.id === value ? 'var(--bg-light, #f1f5f9)' : 'transparent')
                  }
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}