import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, Barber, Member, ShopConfig } from '../types';
import { formatThaiDate, parseTimeToMinutes, normalizeDateString } from '../utils';
import { 
  Calendar, 
  Clock, 
  User, 
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
  CalendarRange,
  Sparkles, 
  LayoutGrid,
  Table,
  CreditCard,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  Clock4,
  GripVertical,
  ArrowUpDown,
  Filter,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers
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
  const totalMins = 6 * 60 + i * 30; // 06:00 to 23:30 (every 30 mins: .00 and .30 only)
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export const TIMELINE_TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00'
];

export const isBookingOverlappingSlot = (booking: Booking, slotStart: string, slotEnd: string) => {
  const bStart = parseTimeToMinutes(booking.startTime);
  const bEnd = parseTimeToMinutes(booking.endTime);
  const sStart = parseTimeToMinutes(slotStart);
  const sEnd = parseTimeToMinutes(slotEnd);
  if (bStart < 0 || bEnd < 0 || sStart < 0 || sEnd < 0) return false;
  return bStart < sEnd && bEnd > sStart;
};

export default function BookingTab({
  bookings,
  barbers,
  members = [],
  shopConfig,
  onSaveBooking,
  onUpdateBooking,
  onDeleteBooking,
  onClearAllBookings,
  onStartServiceSale,
  onUpdateShopConfig
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

  // Current real-time clock indicator (updates every minute)
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

  // Helper to format time in Thai 24-hour style
  const formatThaiTimeDisplay = (time: string) => {
    if (!time) return '';
    return `${time} น.`;
  };

  // Helper to format time range in Thai 24-hour style
  const formatThaiTimeRange = (start: string, end: string) => {
    if (!start && !end) return '';
    return `${start || ''} - ${end || ''} น.`;
  };

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'cards' | 'board'>('table');

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
  
  // Drag and Drop state
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<'pending' | 'completed' | null>(null);

  // UI Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handle start time input change (automatically calculates end time based on shopConfig duration)
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
  };

  // Load an existing booking into the form for editing
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
    
    // Smooth scroll to the form if on mobile/small screen
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Quick status toggle (รอดำเนินการ <-> เสร็จสิ้น)
  const handleToggleStatus = (booking: Booking, newStatus?: 'pending' | 'completed') => {
    const currentStatus = booking.status || 'pending';
    const targetStatus = newStatus || (currentStatus === 'completed' ? 'pending' : 'completed');
    const updated: Booking = {
      ...booking,
      status: targetStatus,
      updatedAt: new Date().toISOString()
    };
    onUpdateBooking(updated);
    showToast(targetStatus === 'completed' 
      ? `✅ ปรับสถานะคิวคุณ ${booking.customerName} เป็น "เสร็จสิ้น" แล้ว` 
      : `⏳ ปรับสถานะคิวคุณ ${booking.customerName} เป็น "รอดำเนินการ" แล้ว`
    );
  };

  // Drag and drop handler
  const handleDragStart = (e: React.DragEvent, bookingId: string) => {
    e.dataTransfer.setData('text/plain', bookingId);
    setDraggedBookingId(bookingId);
  };

  const handleDragEnd = () => {
    setDraggedBookingId(null);
    setDragOverStatus(null);
  };

  const handleDropOnStatus = (e: React.DragEvent, targetStatus: 'pending' | 'completed') => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('text/plain') || draggedBookingId;
    if (!bookingId) return;

    const targetBooking = bookings.find(b => b.id === bookingId);
    if (targetBooking && (targetBooking.status || 'pending') !== targetStatus) {
      handleToggleStatus(targetBooking, targetStatus);
    }
    setDraggedBookingId(null);
    setDragOverStatus(null);
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
        status: editingBooking.status || 'pending',
        updatedAt: new Date().toISOString()
      };
      onUpdateBooking(updated);
      showToast(`✏️ อัปเดตคิวคุณ ${formCustomerName} เรียบร้อยแล้ว`);
      handleResetForm();
    } else {
      const newBooking: Booking = {
        id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        barberId: formBarberId,
        barberName,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim(),
        notes: formNotes.trim(),
        memberId: formMemberId || undefined,
        status: 'pending',
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

    // Direct save without any blocking modals
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
    const completedCount = list.filter(b => b.status === 'completed').length;
    const uniqueBarbers = new Set(list.map(b => b.barberId)).size;
    return { total, pendingCount, completedCount, uniqueBarbers };
  }, [bookings, selectedDate]);

  // Calculate open time slots for selected barber on formDate for the booking form
  const formBarberSlots = useMemo(() => {
    if (!formBarberId || !formDate) return [];
    
    // Generate slots across operating hours
    return TIMELINE_TIME_SLOTS.slice(0, -1).map((slotStart) => {
      const slotEnd = calcEndTime(slotStart, durationMinutes);
      
      // Check if any booking overlaps with this time slot
      const overlapping = bookings.find(b => {
        if (b.barberId !== formBarberId || b.date !== formDate) return false;
        if (editingBooking && b.id === editingBooking.id) return false;
        return isBookingOverlappingSlot(b, slotStart, slotEnd);
      });

      return {
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !overlapping,
        booking: overlapping
      };
    });
  }, [formBarberId, formDate, bookings, durationMinutes, editingBooking]);

  const freeFormSlotsCount = useMemo(() => {
    return formBarberSlots.filter(s => s.isAvailable).length;
  }, [formBarberSlots]);

  // Target date for Timeline View
  const timelineDate = selectedDate === 'all' ? todayStr : selectedDate;

  // Timeline Matrix data for all barbers on timelineDate
  const timelineBarbersData = useMemo(() => {
    // Filter barbers if selectedBarberFilter is active
    const targetBarbers = selectedBarberFilter === 'all' 
      ? barbers 
      : barbers.filter(b => b.id === selectedBarberFilter);

    return targetBarbers.map(barber => {
      const barberBookings = bookings.filter(b => b.barberId === barber.id && b.date === timelineDate);
      
      const slots = TIMELINE_TIME_SLOTS.slice(0, -1).map((slotStart, idx) => {
        const slotEnd = TIMELINE_TIME_SLOTS[idx + 1] || calcEndTime(slotStart, 30);
        
        // Find if any booking overlaps this slot
        const booking = barberBookings.find(b => isBookingOverlappingSlot(b, slotStart, slotEnd));
        
        return {
          slotStart,
          slotEnd,
          isFree: !booking,
          booking
        };
      });

      const freeCount = slots.filter(s => s.isFree).length;
      const bookedCount = barberBookings.length;
      const totalSlots = slots.length;

      return {
        barber,
        barberBookings,
        slots,
        freeCount,
        bookedCount,
        totalSlots,
        occupancyPct: totalSlots > 0 ? Math.round(((totalSlots - freeCount) / totalSlots) * 100) : 0
      };
    });
  }, [barbers, bookings, timelineDate, selectedBarberFilter]);

  // Overall timeline stats for the day
  const timelineDayStats = useMemo(() => {
    let totalFree = 0;
    let totalSlots = 0;
    let totalBooked = 0;
    timelineBarbersData.forEach(d => {
      if (d.barber.isWorking) {
        totalFree += d.freeCount;
        totalSlots += d.totalSlots;
        totalBooked += d.barberBookings.length;
      }
    });
    return {
      totalFree,
      totalSlots,
      totalBooked,
      occupancyRate: totalSlots > 0 ? Math.round(((totalSlots - totalFree) / totalSlots) * 100) : 0
    };
  }, [timelineBarbersData]);

  // Date jumper helper
  const handleShiftTimelineDate = (days: number) => {
    const current = new Date(timelineDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const newDate = `${y}-${m}-${d}`;
    setSelectedDate(newDate);
    setFormDate(newDate);
  };

  // Select slot directly from Timeline grid
  const handleSelectSlotFromTimeline = (barberId: string, slotStartTime: string) => {
    setFormBarberId(barberId);
    setFormDate(timelineDate);
    handleStartTimeChange(slotStartTime);
    const barberObj = barbers.find(b => b.id === barberId);
    showToast(`✂️ เลือกช่าง${barberObj?.name || ''} เวลา ${slotStartTime} น. แล้ว กรอกชื่อลูกค้าได้ทันที`);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
              ระบบตารางจองคิวช่าง (Queue & Appointments)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            ดูตารางคิวแบบรวม จัดการคิวรวดเร็วด้วย Drag-and-Drop หรือปุ่มปรับสถานะ (รอดำเนินการ / เสร็จสิ้น)
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

      {/* 2. Drag & Drop Status Dropzones Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Dropzone: Pending */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverStatus('pending'); }}
          onDragLeave={() => setDragOverStatus(null)}
          onDrop={(e) => handleDropOnStatus(e, 'pending')}
          className={`p-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between ${
            dragOverStatus === 'pending'
              ? 'bg-amber-100 border-amber-500 scale-[1.01] shadow-md'
              : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Clock4 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-950">⏳ รอดำเนินการ (Pending)</p>
              <p className="text-[11px] text-amber-800">ลากรายการคิวมาปล่อยที่นี่เพื่อปรับเป็น "รอดำเนินการ"</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-200/70 text-amber-950 font-mono font-black text-sm rounded-xl">
            {dateStats.pendingCount} คิว
          </span>
        </div>

        {/* Dropzone: Completed */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverStatus('completed'); }}
          onDragLeave={() => setDragOverStatus(null)}
          onDrop={(e) => handleDropOnStatus(e, 'completed')}
          className={`p-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between ${
            dragOverStatus === 'completed'
              ? 'bg-emerald-100 border-emerald-500 scale-[1.01] shadow-md'
              : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950">✅ เสร็จสิ้นแล้ว (Completed)</p>
              <p className="text-[11px] text-emerald-800">ลากรายการคิวมาปล่อยที่นี่เพื่อปรับเป็น "เสร็จสิ้น"</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-200/70 text-emerald-950 font-mono font-black text-sm rounded-xl">
            {dateStats.completedCount} คิว
          </span>
        </div>
      </div>

      {/* 3. Main 2-Column Grid: Left is Form (Always Out), Right is Table & Queue Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Direct Booking Form (Always Open on Screen) */}
        <div 
          ref={formRef}
          className={`lg:col-span-4 bg-white rounded-3xl border transition-all shadow-sm overflow-hidden sticky top-4 ${
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
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-amber-400 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
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
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title="ตั้งค่าเวลาตัดต่อ 1 คิวได้ที่เมนู 'ตั้งค่าระบบ'">
                  คิวละ {durationMinutes} นาที
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10.5px] font-bold text-slate-500 block mb-0.5">เวลาเริ่ม (เวลาไทย)</span>
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

              {/* Visual Availability Slots Selector */}
              <div className="mt-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-black text-slate-800">
                      เวลาว่างของช่าง{barbers.find(b => b.id === formBarberId)?.name || ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 ว่าง {freeFormSlotsCount}/{formBarberSlots.length} สล็อต
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto pr-0.5 custom-scrollbar">
                  {formBarberSlots.map((slot) => {
                    const isSelected = formStartTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => {
                          handleStartTimeChange(slot.startTime);
                        }}
                        className={`py-1.5 px-1 rounded-lg text-[10.5px] font-mono font-black transition-all text-center cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs ring-2 ring-amber-400'
                            : slot.isAvailable
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200/60 line-through opacity-60'
                        }`}
                        title={
                          slot.isAvailable
                            ? `🟢 เวลาว่าง ${slot.startTime} - ${slot.endTime} น. (คลิกเพื่อเลือกเวลานี้)`
                            : `🔴 มีคิวแล้ว: คุณ${slot.booking?.customerName || ''} (${slot.booking?.startTime} - ${slot.booking?.endTime} น.)`
                        }
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9.5px] text-slate-400 text-center">
                  💡 คลิกที่ปุ่มเวลาสีเขียวเพื่อเลือกเวลาว่างได้ทันที
                </p>
              </div>
            </div>

            {/* 4. ชื่อลูกค้า & เบอร์โทร */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-700">
                  👤 4. ชื่อลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
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
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-700">
                  📞 5. เบอร์โทรลูกค้า
                </label>
                <input
                  type="tel"
                  placeholder=""
                  value={formCustomerPhone}
                  onChange={(e) => setFormCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 5. หมายเหตุเพิ่มเติม */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700">
                💬 6. หมายเหตุ / ทรงผมที่ต้องการ
              </label>
              <input
                type="text"
                placeholder=""
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
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

        {/* Right Column: Clean Table View & Filters */}
        <div className="lg:col-span-8 space-y-4">
          
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom row: Status Filter Buttons + Barber Selector + View Modes */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                  <span>รอดำเนินการ ({dateStats.pendingCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'completed' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>เสร็จสิ้น ({dateStats.completedCount})</span>
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

              {/* View Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table' 
                      ? 'bg-white text-slate-900 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แสดงผลแบบตารางสะอาดตา"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>ตารางคิว</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'timeline' 
                      ? 'bg-white text-slate-900 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="ดูไทม์ไลน์เวลาว่างของช่างทุกคน"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ไทม์ไลน์เวลาว่าง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cards' 
                      ? 'bg-white text-slate-900 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แสดงผลแบบการ์ด"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>การ์ดคิว</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'board' 
                      ? 'bg-white text-slate-900 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แยกคิวตามช่าง"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>แยกตามช่าง</span>
                </button>
              </div>

            </div>
          </div>

          {/* 4. Display Area (Timeline / Table / Cards / Board) */}
          {viewMode === 'timeline' ? (
            /* Visual Timeline Schedule Grid */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
              {/* Timeline Top Control & Stats Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Date Navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleShiftTimelineDate(-1)}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                    title="วันก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{formatThaiDate(timelineDate)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleShiftTimelineDate(1)}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                    title="วันถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayStr);
                      setFormDate(todayStr);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timelineDate === todayStr ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    วันนี้
                  </button>
                </div>

                {/* Availability Metrics */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>สล็อตว่าง: {timelineDayStats.totalFree} ช่วง</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center gap-1">
                    <Clock4 className="w-3 h-3 text-amber-700" />
                    <span>จองแล้ว: {timelineDayStats.totalBooked} คิว</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-200/80 text-slate-800 font-bold">
                    ความหนาแน่น: {timelineDayStats.occupancyRate}%
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 px-1 font-bold">
                <span className="text-slate-400">คำอธิบาย:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400" />
                  <span className="text-emerald-800">ช่องว่าง (คลิกเพื่อจองเวลา)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                  <span className="text-amber-950">รอดำเนินการ</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-600" />
                  <span className="text-white bg-emerald-600 px-1 rounded text-[10px]">เสร็จสิ้น</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200" />
                  <span className="text-slate-500">ช่างหยุดงาน</span>
                </span>
              </div>

              {/* Timeline Matrix Grid */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px]">
                      <th className="py-3 px-4 w-48 sticky left-0 z-20 bg-slate-900 border-r border-slate-800 shadow-xs">
                        ช่างประจำร้าน
                      </th>
                      {TIMELINE_TIME_SLOTS.slice(0, -1).map((slot) => (
                        <th key={slot} className="py-3 px-2 text-center font-mono border-r border-slate-800/80 min-w-[72px]">
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {timelineBarbersData.map(({ barber, slots, freeCount, totalSlots }) => {
                      return (
                        <tr key={barber.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Barber Info (Sticky Left Column) */}
                          <td className="py-3 px-3.5 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-2xs">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-black text-slate-900 text-xs truncate">
                                  ช่าง{barber.name}
                                </p>
                                <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-full ${
                                  barber.isWorking ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {barber.isWorking ? 'ทำงาน' : 'หยุด'}
                                </span>
                              </div>
                              {barber.isWorking && (
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                                  <span>ว่าง {freeCount}/{totalSlots} ช่วง</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormBarberId(barber.id);
                                      setFormDate(timelineDate);
                                      if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black cursor-pointer"
                                  >
                                    + ลงคิว
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Slots per Barber */}
                          {!barber.isWorking ? (
                            <td colSpan={TIMELINE_TIME_SLOTS.length - 1} className="py-4 px-3 text-center bg-slate-50/70 text-slate-400 italic text-[11px]">
                              ⚪ ช่างหยุดงานในวันนี้
                            </td>
                          ) : (
                            slots.map((slot) => {
                              const booking = slot.booking;
                              if (booking) {
                                const isCompleted = booking.status === 'completed';
                                return (
                                  <td
                                    key={slot.slotStart}
                                    className="p-1 border-r border-slate-100 align-top"
                                  >
                                    <div
                                      className={`p-1.5 rounded-xl border text-[10.5px] space-y-1 transition-all shadow-2xs ${
                                        isCompleted
                                          ? 'bg-emerald-500 text-white border-emerald-600'
                                          : 'bg-amber-400 text-slate-950 border-amber-500 font-bold'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono text-[9.5px] font-black leading-none">
                                          {booking.startTime}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleStatus(booking)}
                                          className={`text-[9px] font-black px-1 py-0.2 rounded cursor-pointer ${
                                            isCompleted ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                                          }`}
                                          title="คลิกเพื่อสลับสถานะ"
                                        >
                                          {isCompleted ? '✓ เสร็จ' : 'รอ'}
                                        </button>
                                      </div>
                                      <p className="font-black truncate text-[11px]" title={booking.customerName}>
                                        {booking.customerName}
                                      </p>
                                      <div className="flex items-center justify-between pt-0.5 opacity-90 text-[9.5px]">
                                        {booking.customerPhone ? (
                                          <a href={`tel:${booking.customerPhone}`} className="hover:underline truncate font-mono" title="โทร">
                                            {booking.customerPhone}
                                          </a>
                                        ) : (
                                          <span>-</span>
                                        )}
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleStartEdit(booking)}
                                            className="p-0.5 hover:opacity-100 cursor-pointer"
                                            title="แก้ไข"
                                          >
                                            <Edit3 className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeleteConfirmId(booking.id)}
                                            className="p-0.5 hover:opacity-100 cursor-pointer text-rose-800"
                                            title="ลบ"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              // Free slot
                              return (
                                <td
                                  key={slot.slotStart}
                                  className="p-1 border-r border-slate-100 align-middle"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectSlotFromTimeline(barber.id, slot.slotStart)}
                                    className="w-full h-14 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/90 text-emerald-800 hover:text-emerald-950 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer group shadow-2xs"
                                    title={`สล็อตว่าง ${slot.slotStart} - ${slot.slotEnd} น. (คลิกเพื่อลงคิวเวลานี้)`}
                                  >
                                    <span className="text-[10px] font-mono font-bold text-emerald-700 group-hover:scale-105 transition-transform">
                                      {slot.slotStart}
                                    </span>
                                    <span className="text-[9.5px] font-black text-emerald-600 group-hover:text-emerald-900 bg-white/80 px-1.5 py-0.2 rounded-md shadow-2xs">
                                      + ว่าง
                                    </span>
                                  </button>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                ไม่มีรายการจองคิวในเงื่อนไขที่เลือก
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {selectedDate !== 'all' ? `วันที่ ${formatThaiDate(selectedDate)} ยังไม่มีคิวจอง` : 'ยังไม่มีข้อมูลการจองคิว'} สามารถกรอกแบบฟอร์มด้านซ้ายเพื่อลงคิวได้ทันที
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Clean Table View with Drag Handle and Quick Status Toggle */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px] tracking-wider uppercase">
                      <th className="py-3 px-3 w-8 text-center"></th>
                      <th className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>เวลา / วันที่</span>
                        </div>
                      </th>
                      <th className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span>ชื่อลูกค้า / เบอร์โทร</span>
                        </div>
                      </th>
                      <th className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Scissors className="w-3.5 h-3.5 text-amber-400" />
                          <span>ช่างที่ดูแล</span>
                        </div>
                      </th>
                      <th className="py-3 px-3">หมายเหตุ</th>
                      <th className="py-3 px-3 text-center">สถานะคิว (คลิกสลับ)</th>
                      <th className="py-3 px-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBookings.map((b) => {
                      const isCompleted = b.status === 'completed';
                      const isCurrentlyActive = todayStr === b.date && currentTimeStr >= b.startTime && currentTimeStr <= b.endTime;
                      
                      return (
                        <tr
                          key={b.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, b.id)}
                          onDragEnd={handleDragEnd}
                          className={`transition-all hover:bg-slate-50/80 cursor-grab active:cursor-grabbing ${
                            isCompleted ? 'bg-slate-50/50 text-slate-500' : 'bg-white text-slate-800'
                          } ${editingBooking?.id === b.id ? 'bg-amber-50 ring-1 ring-amber-400' : ''}`}
                        >
                          {/* Drag Handle */}
                          <td className="py-3 px-2 text-center text-slate-300 hover:text-slate-600" title="ลากเพื่อย้ายสถานะ">
                            <GripVertical className="w-4 h-4 mx-auto cursor-grab" />
                          </td>

                          {/* Time & Date */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs ${
                                isCurrentlyActive 
                                  ? 'bg-amber-400 text-slate-950 animate-pulse ring-2 ring-amber-300'
                                  : isCompleted 
                                    ? 'bg-slate-100 text-slate-600 line-through' 
                                    : 'bg-slate-900 text-white'
                              }`}>
                                {b.startTime} - {b.endTime} น.
                              </span>
                              {selectedDate === 'all' && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  ({formatThaiDate(b.date).split(' ')[0]} {formatThaiDate(b.date).split(' ')[1]})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer Name & Phone */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <p className={`font-black text-xs ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {b.customerName}
                              </p>
                              {b.customerPhone ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                                  <span>{b.customerPhone}</span>
                                  <a
                                    href={`tel:${b.customerPhone}`}
                                    className="p-0.5 text-indigo-600 hover:bg-indigo-50 rounded"
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
                                    title="คัดลอกเบอร์"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">-</span>
                              )}
                            </div>
                          </td>

                          {/* Barber Tag */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 px-2.5 py-1 rounded-xl font-bold text-xs border border-indigo-100/80">
                              <Scissors className="w-3 h-3 text-indigo-600" />
                              <span>ช่าง{b.barberName}</span>
                            </span>
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-3 max-w-[180px] truncate">
                            {b.notes ? (
                              <span className="text-slate-600 text-xs inline-flex items-center gap-1" title={b.notes}>
                                <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{b.notes}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Quick Status Button */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(b)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              }`}
                              title="คลิกเพื่อสลับสถานะ"
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>เสร็จสิ้น</span>
                                </>
                              ) : (
                                <>
                                  <Clock4 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>รอดำเนินการ</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* POS Button */}
                              {onStartServiceSale && (
                                <button
                                  type="button"
                                  onClick={() => onStartServiceSale(b)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="นำไปคิดเงินที่หน้าขาย"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>คิดเงิน</span>
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(b)}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  editingBooking?.id === b.id
                                    ? 'bg-amber-400 text-slate-950 font-bold'
                                    : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600'
                                }`}
                                title="แก้ไขคิว"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(b.id)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all cursor-pointer"
                                title="ลบคิว"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* Cards Timeline View */
            <div className="space-y-2.5">
              {filteredBookings.map((b) => {
                const isCompleted = b.status === 'completed';
                return (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, b.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-3.5 sm:p-4 rounded-3xl bg-white border transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${
                      isCompleted ? 'opacity-75 bg-slate-50/80 border-slate-200' : 'border-slate-200/90 hover:border-slate-300'
                    } ${editingBooking?.id === b.id ? 'border-amber-400 ring-2 ring-amber-300/40 bg-amber-50/20' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Left block: Time Slot Badge & Customer Info */}
                      <div className="flex items-start gap-3">
                        {/* Time pill */}
                        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900 text-white min-w-[75px] shrink-0 text-center shadow-2xs">
                          <span className="text-[9.5px] text-amber-300 font-bold uppercase">
                            {formatThaiDate(b.date).split(' ')[0]} {formatThaiDate(b.date).split(' ')[1]}
                          </span>
                          <span className={`text-sm font-mono font-black text-white ${isCompleted ? 'line-through opacity-70' : ''}`}>
                            {b.startTime} น.
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-300">
                            ถึง {b.endTime} น.
                          </span>
                        </div>

                        {/* Customer details */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-sm font-black ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {b.customerName}
                            </h4>
                            {/* Barber Tag */}
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-lg font-bold text-[11px] border border-indigo-100">
                              <Scissors className="w-3 h-3 text-indigo-600" />
                              <span>ช่าง{b.barberName}</span>
                            </span>
                            {/* Status Pill Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(b)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {isCompleted ? '✅ เสร็จสิ้น' : '⏳ รอดำเนินการ'}
                            </button>
                          </div>

                          {/* Phone & Call Button */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            {b.customerPhone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-indigo-500" />
                                <span className="font-mono font-bold text-slate-800 text-[11px]">{b.customerPhone}</span>
                                <a
                                  href={`tel:${b.customerPhone}`}
                                  className="p-0.5 text-indigo-600 hover:bg-indigo-50 rounded"
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
                                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                                  title="คัดลอกเบอร์โทร"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[10.5px]">ไม่ได้ระบุเบอร์โทร</span>
                            )}

                            {b.notes && (
                              <span className="inline-flex items-center gap-1 text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                                <MessageSquare className="w-3 h-3 text-slate-400" />
                                <span>{b.notes}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right block: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                        {onStartServiceSale && (
                          <button
                            type="button"
                            onClick={() => onStartServiceSale(b)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="นำไปคิดเงินที่หน้าขาย"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>คิดเงิน (POS)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(b)}
                          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                            editingBooking?.id === b.id
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600'
                          }`}
                          title="แก้ไขข้อมูลในฟอร์ม"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all cursor-pointer"
                          title="ลบรายการจอง"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Board / Column View grouped by Barber */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {barbers
                .filter(barber => selectedBarberFilter === 'all' || barber.id === selectedBarberFilter)
                .map(barber => {
                  const barberBookings = filteredBookings.filter(b => b.barberId === barber.id);
                  return (
                    <div 
                      key={barber.id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden"
                    >
                      {/* Barber Column Header */}
                      <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                            {barber.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white">ช่าง{barber.name}</h4>
                            <p className="text-[10px] text-slate-300">
                              {barber.isWorking ? '🟢 ทำงาน' : '⚪ หยุด'} • {barberBookings.length} คิว
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormBarberId(barber.id);
                            if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-amber-300 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
                          title="เลือกช่างคนนี้ในฟอร์ม"
                        >
                          + ลงคิวช่างนี้
                        </button>
                      </div>

                      {/* Bookings within column */}
                      <div className="p-2.5 space-y-2 flex-1 overflow-y-auto max-h-[500px] bg-slate-50/50">
                        {barberBookings.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs">
                            ไม่มีคิวจองสำหรับช่าง{barber.name}
                          </div>
                        ) : (
                          barberBookings.map(b => {
                            const isCompleted = b.status === 'completed';
                            return (
                              <div
                                key={b.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, b.id)}
                                onDragEnd={handleDragEnd}
                                className={`p-2.5 rounded-2xl bg-white border transition-all text-xs space-y-1.5 shadow-2xs cursor-grab active:cursor-grabbing ${
                                  isCompleted ? 'opacity-70 bg-slate-50' : 'border-slate-200/90'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`font-mono font-black px-1.5 py-0.5 rounded text-[11px] ${
                                    isCompleted ? 'bg-slate-100 text-slate-500 line-through' : 'bg-slate-900 text-white'
                                  }`}>
                                    {b.startTime} - {b.endTime} น.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(b)}
                                    className={`text-[9.5px] font-black px-2 py-0.5 rounded-full cursor-pointer ${
                                      isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {isCompleted ? '✅ เสร็จสิ้น' : '⏳ รอดำเนินการ'}
                                  </button>
                                </div>
                                
                                <div>
                                  <p className={`font-black text-xs ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                    {b.customerName}
                                  </p>
                                  {b.customerPhone && (
                                    <p className="font-mono text-slate-500 text-[10.5px]">{b.customerPhone}</p>
                                  )}
                                  {b.notes && (
                                    <p className="text-slate-600 text-[10.5px] mt-0.5 bg-slate-50 p-1 rounded-md border border-slate-100">
                                      💬 {b.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Column Action Row */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  {onStartServiceSale && (
                                    <button
                                      type="button"
                                      onClick={() => onStartServiceSale(b)}
                                      className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                    >
                                      คิดเงิน (POS) ➔
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(b)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                      title="แก้ไข"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(b.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                      title="ลบ"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

        </div>

      </div>

      {/* 5. Delete Confirmation Modal */}
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
