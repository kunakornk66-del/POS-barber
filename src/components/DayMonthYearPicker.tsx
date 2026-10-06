import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DayMonthYearPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  showToday?: boolean;
}

const THAI_MONTHS = [
  { value: 1, label: 'ม.ค. (มกราคม)' },
  { value: 2, label: 'ก.พ. (กุมภาพันธ์)' },
  { value: 3, label: 'มี.ค. (มีนาคม)' },
  { value: 4, label: 'เม.ย. (เมษายน)' },
  { value: 5, label: 'พ.ค. (พฤษภาคม)' },
  { value: 6, label: 'มิ.ย. (มิถุนายน)' },
  { value: 7, label: 'ก.ค. (กรกฎาคม)' },
  { value: 8, label: 'ส.ค. (สิงหาคม)' },
  { value: 9, label: 'ก.ย. (กันยายน)' },
  { value: 10, label: 'ต.ค. (ตุลาคม)' },
  { value: 11, label: 'พ.ย. (พฤศจิกายน)' },
  { value: 12, label: 'ธ.ค. (ธันวาคม)' },
];

export default function DayMonthYearPicker({
  value,
  onChange,
  className = '',
  size = 'md',
  showToday = false
}: DayMonthYearPickerProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const dateToParse = value || todayStr;
  const [yStr, mStr, dStr] = dateToParse.split('T')[0].split('-');
  const currentYear = parseInt(yStr, 10) || now.getFullYear();
  const currentMonth = parseInt(mStr, 10) || (now.getMonth() + 1);
  const currentDay = parseInt(dStr, 10) || now.getDate();

  // Days in selected month & year
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Years options: currentYear - 2 to currentYear + 3
  const baseYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => baseYear - 2 + i);

  const updateDate = (y: number, m: number, d: number) => {
    const maxDays = new Date(y, m, 0).getDate();
    const safeDay = Math.min(d, maxDays);
    const formatted = `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleOpenPicker = () => {
    if (!pickerRef.current) return;
    try {
      if (typeof pickerRef.current.showPicker === 'function') {
        pickerRef.current.showPicker();
      } else {
        pickerRef.current.focus();
      }
    } catch {
      pickerRef.current.focus();
    }
  };

  const isSmall = size === 'sm';
  const padClass = isSmall ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* 1. วัน (Day) */}
      <div className={`flex items-center bg-white border border-slate-200 rounded-xl ${padClass} focus-within:ring-2 focus-within:ring-indigo-500 shadow-2xs`}>
        <span className="text-[10px] font-bold text-slate-400 mr-1 select-none">วัน</span>
        <select
          value={currentDay}
          onChange={(e) => updateDate(currentYear, currentMonth, parseInt(e.target.value, 10))}
          className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
        >
          {daysOptions.map(day => (
            <option key={day} value={day}>
              {String(day).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>

      {/* 2. เดือน (Month) */}
      <div className={`flex items-center bg-white border border-slate-200 rounded-xl ${padClass} focus-within:ring-2 focus-within:ring-indigo-500 shadow-2xs`}>
        <span className="text-[10px] font-bold text-slate-400 mr-1 select-none">เดือน</span>
        <select
          value={currentMonth}
          onChange={(e) => updateDate(currentYear, parseInt(e.target.value, 10), currentDay)}
          className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
        >
          {THAI_MONTHS.map(m => (
            <option key={m.value} value={m.value}>
              {isSmall ? m.label.split(' ')[0] : m.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. ปี (Year) */}
      <div className={`flex items-center bg-white border border-slate-200 rounded-xl ${padClass} focus-within:ring-2 focus-within:ring-indigo-500 shadow-2xs`}>
        <span className="text-[10px] font-bold text-slate-400 mr-1 select-none">ปี</span>
        <select
          value={currentYear}
          onChange={(e) => updateDate(parseInt(e.target.value, 10), currentMonth, currentDay)}
          className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer font-mono"
        >
          {yearOptions.map(yr => (
            <option key={yr} value={yr}>
              {yr + 543} ({yr})
            </option>
          ))}
        </select>
      </div>

      {/* 4. Native Calendar trigger button */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleOpenPicker}
          className={`${isSmall ? 'p-1.5' : 'p-2'} bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200 shadow-2xs`}
          title="เปิดปฏิทินเลือกวันที่"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={dateToParse}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />
      </div>

      {/* 5. วันนี้ button (optional) */}
      {showToday && (
        <button
          type="button"
          onClick={() => onChange(todayStr)}
          className={`${padClass} rounded-xl font-bold transition-all cursor-pointer ${
            dateToParse === todayStr
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          วันนี้
        </button>
      )}
    </div>
  );
}
