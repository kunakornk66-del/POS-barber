import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, Barber, Member, ShopConfig } from '../types';
import { formatThaiDate, parseTimeToMinutes } from '../utils';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Scissors, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  PhoneCall, 
  Copy, 
  CalendarDays, 
  Sparkles, 
  MessageSquare, 
  RotateCcw, 
  CheckCircle2, 
  Clock4,
  Filter
} from 'lucide-react';

interface BookingTabProps {
  bookings: Booking[];
  barbers: Barber[];
  members?: Member[];
  shopConfig?: ShopConfig;
  onSaveBooking: (booking: Booking) => void;
  onUpdateBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
  onClearAllBookings?: () => void;
  onStartServiceSale?: (booking: Booking) => void;
  onUpdateShopConfig?: (config: ShopConfig) => void;
}

const THAI_TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const totalMins = 6 * 60 + i * 30; // 06:00 to 23:30 (every 30 mins)
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export default function BookingTab({
  bookings,
  barbers,
  members = [],
  shopConfig,
  onSaveBooking,
  onUpdateBooking,
  onDeleteBooking,
  onClearAllBookings,
  onStartServiceSale
}: BookingTabProps) {
  const formRef = useRef<HTMLDivElement>(null);

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  // Current real-time clock indicator (updates every 30s)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Duration setting (30 or 60 mins per queue)
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    return shopConfig?.defaultBookingDuration === 30 ? 30 : 60;
  });

  useEffect(() => {
    if (shopConfig?.defaultBookingDuration) {
      setDurationMinutes(shopConfig.defaultBookingDuration === 30 ? 30 : 60);
    }
  }, [shopConfig?.defaultBookingDuration]);

  // Helper to calculate end time from start time and duration
  const calcEndTime = (startTime: string, duration: number) => {
    if (!startTime) return '11:00';
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '11:00';
    const totalMins = h * 60 + m + duration;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Filters state
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active edit state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Form Fields
  const activeBarbers = useMemo(() => barbers.filter(b => b.isWorking), [barbers]);
  const defaultBarberId = activeBarbers.length > 0 ? activeBarbers[0].id : (barbers[0]?.id || '');

  const [formBarberId, setFormBarberId] = useState<string>(defaultBarberId);
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formStartTime, setFormStartTime] = useState<string>('10:00');
  const [formEndTime, setFormEndTime] = useState<string>(() => calcEndTime('10:00', durationMinutes));
  const [formCustomerName, setFormCustomerName] = useState<string>('');
  const [formCustomerPhone, setFormCustomerPhone] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formMemberId, setFormMemberId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');

  // UI Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handle start time input change (automatically calculates end time based on duration)
  const handleStartTimeChange = (newStartTime: string) => {
    setFormStartTime(newStartTime);
    setFormEndTime(calcEndTime(newStartTime, durationMinutes));
  };

  // Reset form to clean state
  const handleResetForm = () => {
    setEditingBooking(null);
    setFormBarberId(defaultBarberId);
    setFormDate(selectedDate === 'all' ? todayStr : (selectedDate || todayStr));
    setFormStartTime('10:00');
    setFormEndTime(calcEndTime('10:00', durationMinutes));
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormNotes('');
    setFormMemberId('');
    setFormStatus('pending');
  };

  // Populate form for editing
  const handleStartEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setFormBarberId(booking.barberId);
    setFormDate(booking.date);
    setFormStartTime(booking.startTime);
    setFormEndTime(booking.endTime);
    setFormCustomerName(booking.customerName);
    setFormCustomerPhone(booking.customerPhone || '');
    setFormNotes(booking.notes || '');
    setFormMemberId(booking.memberId || '');
    setFormStatus(booking.status || 'pending');
    
    showToast(`✏️ กำลังแก้ไขคิวคุณ ${booking.customerName}`);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Update status directly with 3 options: pending (กำลังรอ), in-progress (ดำเนินการ), completed (เสร็จสิ้นแล้ว)
  const handleUpdateStatus = (booking: Booking, newStatus: 'pending' | 'in-progress' | 'completed') => {
    if (booking.status === newStatus) return;
    const updated: Booking = {
      ...booking,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    onUpdateBooking(updated);

    const statusLabels: Record<string, string> = {
      'pending': 'กำลังรอ ⏳',
      'in-progress': 'ดำเนินการ ✂️',
      'completed': 'เสร็จสิ้นแล้ว ✅'
    };
    showToast(`ปรับสถานะคิวคุณ ${booking.customerName}: "${statusLabels[newStatus]}"`);
  };

  // Core function to actually persist the booking
  const executeSaveBooking = () => {
    const barberObj = barbers.find(b => b.id === formBarberId);
    const barberName = barberObj ? barberObj.name : 'ช่าง';

    if (editingBooking) {
      const updated: Booking = {
        ...editingBooking,
        barberId: formBarberId,
        barberName,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim(),
        notes: formNotes.trim(),
        memberId: formMemberId || undefined,
        status: formStatus,
        updatedAt: new Date().toISOString()
      };
      onUpdateBooking(updated);
      showToast(`✏️ อัปเดตคิวคุณ ${formCustomerName} เรียบร้อยแล้ว`);
      handleResetForm();
    } else {
      const newBooking: Booking = {
        id: `book-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barberId: formBarberId,
        barberName,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim(),
        notes: formNotes.trim(),
        memberId: formMemberId || undefined,
        status: formStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSaveBooking(newBooking);
      showToast(`🎉 บันทึกการจองคิวคุณ ${formCustomerName} สำเร็จแล้ว`);
      // Keep selected date and barber, clear customer fields
      setFormCustomerName('');
      setFormCustomerPhone('');
      setFormNotes('');
      setFormMemberId('');
      setFormStatus('pending');
    }
  };

  // Handle Form Submit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName.trim()) {
      alert('กรุณาระบุชื่อลูกค้า');
      return;
    }
    if (!formBarberId) {
      alert('กรุณาเลือกช่างประจำคิว');
      return;
    }
    if (!formDate) {
      alert('กรุณาระบุวันที่จอง');
      return;
    }

    const startA = parseTimeToMinutes(formStartTime);
    const endA = parseTimeToMinutes(formEndTime);

    if (startA >= 0 && endA >= 0 && startA >= endA) {
      alert('⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น (ภายในวันเดียวกัน)');
      return;
    }

    executeSaveBooking();
  };

  // Filtered & Sorted Bookings list (Chronological order by Date -> Start Time)
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Date filter
      if (selectedDate && selectedDate !== 'all' && b.date !== selectedDate) {
        return false;
      }
      // Barber filter
      if (selectedBarberFilter !== 'all' && b.barberId !== selectedBarberFilter) {
        return false;
      }
      // Status filter
      const bStatus = b.status || 'pending';
      if (statusFilter !== 'all' && bStatus !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.customerName?.toLowerCase().includes(q);
        const matchPhone = b.customerPhone?.toLowerCase().includes(q);
        const matchBarber = b.barberName?.toLowerCase().includes(q);
        const matchNotes = b.notes?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchBarber && !matchNotes) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // 1. Sort by Date
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      // 2. Sort by Start Time
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      // 3. Fallback to End Time
      return a.endTime.localeCompare(b.endTime);
    });
  }, [bookings, selectedDate, selectedBarberFilter, statusFilter, searchQuery]);

  // Statistics for selected date
  const dateStats = useMemo(() => {
    const list = selectedDate === 'all' ? bookings : bookings.filter(b => b.date === selectedDate);
    const total = list.length;
    const pendingCount = list.filter(b => (b.status || 'pending') === 'pending').length;
    const inProgressCount = list.filter(b => b.status === 'in-progress').length;
    const completedCount = list.filter(b => b.status === 'completed').length;
    return { total, pendingCount, inProgressCount, completedCount };
  }, [bookings, selectedDate]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 text-left"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-sm font-bold"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              ระบบรายการจองคิวช่าง (Queue & Appointments)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            บันทึกการนัดหมายและแสดงรายการคิวที่จองเข้ามาอย่างเป็นระเบียบ เรียบง่าย และสบายตา
          </p>
        </div>

        {/* Real-time Clock and Quick Today Status */}
        <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-amber-300 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>เวลาปัจจุบัน: {currentTimeStr} น.</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="text-white">📅 {formatThaiDate(todayStr)}</span>
          <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[11px] font-black">
            {bookings.filter(b => b.date === todayStr).length} คิว
          </span>
        </div>
      </div>

      {/* 2. Main 2-Column Grid: Left is Booking Form, Right is Clean Booked Appointments List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Direct Booking Form */}
        <div 
          ref={formRef}
          className={`lg:col-span-5 bg-white rounded-3xl border transition-all shadow-sm overflow-hidden sticky top-4 ${
            editingBooking ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg' : 'border-slate-200/90'
          }`}
        >
          {/* Form Header */}
          <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
            editingBooking 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400' 
              : 'bg-slate-900 text-white border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                editingBooking ? 'bg-slate-950 text-amber-400' : 'bg-amber-400 text-slate-950'
              }`}>
                {editingBooking ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black">
                  {editingBooking ? `แก้ไขคิว: คุณ${editingBooking.customerName}` : 'ลงรายการจองคิวใหม่'}
                </h3>
                <p className={`text-[11px] ${editingBooking ? 'text-amber-950 font-semibold' : 'text-slate-300'}`}>
                  {editingBooking ? 'ปรับปรุงข้อมูลและกดยืนยัน' : 'กรอกข้อมูลและบันทึกคิวได้ทันที'}
                </p>
              </div>
            </div>

            {editingBooking && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="ยกเลิกการแก้ไข"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ยกเลิก</span>
              </button>
            )}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmitForm} className="p-4 sm:p-5 space-y-3.5 text-xs">
            
            {/* 1. เลือกช่างประจำคิว */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                ✂️ 1. เลือกช่างประจำคิว <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {barbers.map((b) => {
                  const isSelected = formBarberId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setFormBarberId(b.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-amber-400 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {b.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black truncate">{b.name}</p>
                        <p className={`text-[9.5px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {b.isWorking ? '🟢 ทำงาน' : '⚪ หยุด'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. วันที่จอง */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                📅 2. วันที่จอง <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setFormDate(todayStr)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    formDate === todayStr ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  วันนี้
                </button>
              </div>
            </div>

            {/* 3. ช่วงเวลา (เริ่ม - สิ้นสุด) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700">
                  ⏰ 3. ช่วงเวลานัดหมาย <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  คิวละ {durationMinutes} นาที
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10.5px] font-bold text-slate-500 block mb-0.5">เวลาเริ่ม</span>
                  <select
                    value={formStartTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {!THAI_TIME_OPTIONS.includes(formStartTime) && (
                      <option value={formStartTime}>{formStartTime} น.</option>
                    )}
                    {THAI_TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t} น.
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-500 block mb-0.5">เวลาสิ้นสุด</span>
                  <select
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {!THAI_TIME_OPTIONS.includes(formEndTime) && (
                      <option value={formEndTime}>{formEndTime} น.</option>
                    )}
                    {THAI_TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t} น.
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. ชื่อลูกค้า */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700">
                👤 4. ชื่อลูกค้า <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น คุณเอก, คุณสมชาย"
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {/* Member auto-pick suggestions if available */}
              {members.length > 0 && !formCustomerName && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400">จากสมาชิก:</span>
                  {members.slice(0, 3).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setFormCustomerName(m.name);
                        setFormCustomerPhone(m.phone);
                        setFormMemberId(m.id);
                      }}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold cursor-pointer"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. เบอร์โทรลูกค้า */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700">
                📞 5. เบอร์โทรลูกค้า
              </label>
              <input
                type="tel"
                placeholder="เช่น 081-234-5678"
                value={formCustomerPhone}
                onChange={(e) => setFormCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 6. หมายเหตุเพิ่มเติม */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700">
                💬 6. หมายเหตุ / ทรงผมที่ต้องการ
              </label>
              <input
                type="text"
                placeholder="เช่น ตัดผมสั้น+กันหน้า, ดัดวอลลุ่ม"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 7. สถานะคิว */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                ⚡ 7. สถานะคิว
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormStatus('pending')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formStatus === 'pending'
                      ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock4 className="w-3.5 h-3.5" />
                  <span>กำลังรอ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus('in-progress')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formStatus === 'in-progress'
                      ? 'bg-sky-500 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>ดำเนินการ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus('completed')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formStatus === 'completed'
                      ? 'bg-emerald-500 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>เสร็จสิ้นแล้ว</span>
                </button>
              </div>
            </div>

            {/* Submit & Reset Buttons */}
            <div className="pt-2 flex items-center gap-2">
              {editingBooking && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ring-1 ring-amber-400"
                id="save-booking-submit-btn"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{editingBooking ? 'บันทึกการแก้ไขคิว' : '✨ ยืนยันบันทึกการจองคิว'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Clean Booked Appointments List */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter Bar & Controls */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            
            {/* Top row: Date Selector & Search Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Date Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <input
                    type="date"
                    value={selectedDate === 'all' ? '' : selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value || 'all')}
                    className="bg-white px-2 py-0.5 rounded-lg text-xs font-bold text-slate-900 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === todayStr 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  วันนี้
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === 'all' 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ดูทุกวัน ({bookings.length})
                </button>

                {onClearAllBookings && bookings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('ยืนยันการล้างรายการจองคิวทั้งหมดหรือไม่?')) {
                        onClearAllBookings();
                        showToast('🗑️ ล้างรายการจองคิวทั้งหมดเรียบร้อยแล้ว');
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="ล้างรายการจองคิวทั้งหมด"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ล้างคิวทั้งหมด</span>
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, ช่าง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom row: Status Filter Buttons + Barber Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทั้งหมด ({dateStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'pending' ? 'bg-amber-400 text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-amber-800'
                  }`}
                >
                  <Clock4 className="w-3 h-3" />
                  <span>กำลังรอ ({dateStats.pendingCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in-progress')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'in-progress' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600 hover:text-sky-800'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>ดำเนินการ ({dateStats.inProgressCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'completed' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>เสร็จสิ้นแล้ว ({dateStats.completedCount})</span>
                </button>
              </div>

              {/* Barber Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold">ช่าง:</span>
                <select
                  value={selectedBarberFilter}
                  onChange={(e) => setSelectedBarberFilter(e.target.value)}
                  className="bg-slate-50 px-2.5 py-1 rounded-xl font-bold text-slate-800 text-xs border border-slate-200 focus:ring-0 cursor-pointer"
                >
                  <option value="all">ช่างทุกคน ({barbers.length})</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>
                      ช่าง{b.name} {!b.isWorking ? '(หยุด)' : ''}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Clean Booked Queue List Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span>📋 รายการคิวที่จองเข้ามา</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                  {filteredBookings.length} คิว
                </span>
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {selectedDate === 'all' ? 'แสดงคิวทุกวัน' : `วันที่ ${formatThaiDate(selectedDate)}`}
            </span>
          </div>

          {/* Clean Booked Queue Cards List */}
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">
                    {selectedDate !== 'all' 
                      ? `ไม่มีรายการคิวจองในวันที่ ${formatThaiDate(selectedDate)}` 
                      : 'ยังไม่มีรายการคิวที่จองเข้ามา'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    สามารถใช้แบบฟอร์มด้านซ้ายเพื่อลงรายการจองคิวของลูกค้าได้ทันที
                  </p>
                </div>
              </div>
            ) : (
              filteredBookings.map((b) => {
                const currentStatus = b.status || 'pending';
                const isCompleted = currentStatus === 'completed';
                const isInProgress = currentStatus === 'in-progress';
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-3xl transition-all hover:shadow-md ${
                      isCompleted 
                        ? 'opacity-80 bg-slate-50/90 border border-slate-200' 
                        : isInProgress
                        ? 'bg-sky-50/40 border-2 border-sky-400 ring-2 ring-sky-200/50 shadow-sm'
                        : 'bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                    } ${editingBooking?.id === b.id ? 'border-amber-400 ring-2 ring-amber-300/40 bg-amber-50/20' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                      
                      {/* Left: Time & Customer Info */}
                      <div className="flex items-start gap-3.5">
                        
                        {/* Time pill */}
                        <div className={`flex flex-col items-center justify-center p-2.5 rounded-2xl min-w-[85px] shrink-0 text-center shadow-2xs ${
                          isCompleted 
                            ? 'bg-slate-200 text-slate-700' 
                            : isInProgress
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-900 text-white'
                        }`}>
                          <span className={`text-[10px] font-bold uppercase ${isCompleted ? 'text-slate-600' : isInProgress ? 'text-sky-100' : 'text-amber-300'}`}>
                            {formatThaiDate(b.date).split(' ')[0]} {formatThaiDate(b.date).split(' ')[1]}
                          </span>
                          <span className={`text-base font-mono font-black ${isCompleted ? 'line-through opacity-70' : 'text-white'}`}>
                            {b.startTime}
                          </span>
                          <span className={`text-[10px] font-mono ${isCompleted ? 'text-slate-500' : 'text-slate-200'}`}>
                            ถึง {b.endTime} น.
                          </span>
                        </div>

                        {/* Customer details */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-sm sm:text-base font-black ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {b.customerName}
                            </h4>
                            
                            {/* Barber Tag */}
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 px-2.5 py-0.5 rounded-lg font-bold text-xs border border-indigo-100">
                              <Scissors className="w-3 h-3 text-indigo-600" />
                              <span>ช่าง{b.barberName}</span>
                            </span>

                            {/* Status 3-Option Button Group */}
                            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b, 'pending')}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  currentStatus === 'pending'
                                    ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                                title="เลือก: กำลังรอ"
                              >
                                <Clock4 className="w-3 h-3" />
                                <span>กำลังรอ</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b, 'in-progress')}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  currentStatus === 'in-progress'
                                    ? 'bg-sky-500 text-white shadow-2xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                                title="เลือก: ดำเนินการ"
                              >
                                <Scissors className="w-3 h-3" />
                                <span>ดำเนินการ</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b, 'completed')}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  currentStatus === 'completed'
                                    ? 'bg-emerald-500 text-white shadow-2xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                                title="เลือก: เสร็จสิ้นแล้ว"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>เสร็จสิ้นแล้ว</span>
                              </button>
                            </div>
                          </div>

                          {/* Phone & Notes */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            {b.customerPhone ? (
                              <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                <Phone className="w-3 h-3 text-indigo-500" />
                                <span className="font-mono font-bold text-slate-800">{b.customerPhone}</span>
                                <a
                                  href={`tel:${b.customerPhone}`}
                                  className="p-0.5 text-indigo-600 hover:bg-indigo-100 rounded"
                                  title="โทรหาลูกค้า"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.customerPhone);
                                    showToast(`คัดลอกเบอร์ ${b.customerPhone} แล้ว`);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                  title="คัดลอกเบอร์โทร"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">ไม่ได้ระบุเบอร์โทร</span>
                            )}

                            {b.notes && (
                              <div className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                                <MessageSquare className="w-3 h-3 text-slate-400" />
                                <span>{b.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                        {onStartServiceSale && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => onStartServiceSale(b)}
                            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            title="นำข้อมูลไปเปิดบิลคิดเงินที่หน้าบันทึกการขาย"
                          >
                            <Scissors className="w-3 h-3" />
                            <span>คิดเงิน (POS)</span>
                          </button>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => handleStartEdit(b)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="แก้ไขข้อมูลคิว"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>แก้ไข</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-rose-200/80 cursor-pointer"
                          title="ลบคิวนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* 3. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">
                ยืนยันการลบรายการจองคิวนี้?
              </h4>
              <p className="text-xs text-slate-500">
                ข้อมูลการจองนี้จะถูกลบออกจากระบบ และไม่สามารถกู้คืนได้
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmId) {
                    onDeleteBooking(deleteConfirmId);
                    showToast('🗑️ ลบรายการจองคิวเรียบร้อยแล้ว');
                    setDeleteConfirmId(null);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
