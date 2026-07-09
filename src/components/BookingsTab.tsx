import React, { useState, useMemo, useEffect } from 'react';
import { Barber, Booking, ShareConfig } from '../types';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle,
  Search,
  SlidersHorizontal,
  PlusCircle,
  CheckCircle,
  CalendarDays,
  ShieldAlert,
  UserCheck,
  Sparkles,
  ChevronRight,
  Filter,
  CalendarX,
  Timer
} from 'lucide-react';

// Helper to format YYYY-MM-DD to "วัน เดือน ปี" format (เช่น 25 มิถุนายน 2569)
const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [yyyy, mm, dd] = parts;
  
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const monthIdx = parseInt(mm, 10) - 1;
  const thYear = parseInt(yyyy, 10) + 543;
  
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${parseInt(dd, 10)} ${monthNames[monthIdx]} พ.ศ. ${thYear}`;
  }
  return `${dd}/${mm}/${thYear}`; // Fallback DD/MM/YYYY in Buddhist Era
};

// Helper to calculate end time based on start time and duration in minutes
const calculateEndTime = (start: string, durationMinutes: number): string => {
  if (!start) return '';
  const [hoursStr, minutesStr] = start.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return '';
  
  let totalMinutes = hours * 60 + minutes + durationMinutes;
  totalMinutes = totalMinutes % (24 * 60);
  
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  const endHoursStr = String(endHours).padStart(2, '0');
  const endMinutesStr = String(endMinutes).padStart(2, '0');
  
  return `${endHoursStr}:${endMinutesStr}`;
};

interface BookingsTabProps {
  bookings?: Booking[];
  barbers: Barber[];
  onUpdateBookings: (bookings: Booking[]) => void;
  shareConfig?: ShareConfig;
}

export default function BookingsTab({ bookings = [], barbers = [], onUpdateBookings, shareConfig }: BookingsTabProps) {
  const [now, setNow] = useState<Date>(new Date());

  // Update current time every 10 seconds to keep the alert highlights fresh
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check if a booking is "almost time" (within 15 minutes before startTime on the same day)
  const checkBookingAlert = (bDate: string, bStart: string, bEnd: string, currentDate: Date) => {
    try {
      const offset = currentDate.getTimezoneOffset() * 60000;
      const todayStr = new Date(currentDate.getTime() - offset).toISOString().split('T')[0];
      
      if (bDate !== todayStr) {
        return { isAlmostTime: false, isOverdue: false, minutesDiff: 9999, isOngoing: false };
      }
      
      const [startH, startM] = bStart.split(':').map(Number);
      const [endH, endM] = bEnd.split(':').map(Number);
      
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      
      const currH = currentDate.getHours();
      const currM = currentDate.getMinutes();
      const currTotal = currH * 60 + currM;
      
      const minutesDiff = startTotal - currTotal;
      
      // isAlmostTime means start time is coming up in 15 minutes or less, and it hasn't started yet (or start total minutes is equal to current).
      const isAlmostTime = minutesDiff >= 0 && minutesDiff <= 15;
      
      // isOngoing means the current time is within the start and end time of the booking
      const isOngoing = currTotal >= startTotal && currTotal < endTotal;
      
      const isOverdue = currTotal >= endTotal;
      
      return { isAlmostTime, isOverdue, minutesDiff, isOngoing };
    } catch (e) {
      return { isAlmostTime: false, isOverdue: false, minutesDiff: 9999, isOngoing: false };
    }
  };

  // Input form states for creation (Left column)
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [recorderBarberId, setRecorderBarberId] = useState<string>('');

  // Filtering states
  const [filterDateMode, setFilterDateMode] = useState<'all' | 'today' | 'custom'>('today');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterBarberId, setFilterBarberId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edit Modal popup states
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editBarberId, setEditBarberId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('09:00');
  const [editEndTime, setEditEndTime] = useState<string>('10:00');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editRecorderId, setEditRecorderId] = useState<string>('');
  const [editErrorMsg, setEditErrorMsg] = useState<string>('');

  // Custom confirmation popup state
  const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<Booking | null>(null);
  const [inlineCancelId, setInlineCancelId] = useState<string | null>(null);

  // Active or working barbers
  const activeBarbers = barbers.filter(b => b.isWorking);
  // All barbers for selection list
  const allBarbersList = barbers;

  // Validation & feedback message states
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Reset Creation Form
  const resetForm = () => {
    setSelectedBarberId('');
    setStartTime('09:00');
    setEndTime('10:00');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setRecorderBarberId('');
    setErrorMsg('');
  };

  // Open Edit Modal with booking details populated
  const startEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setEditBarberId(booking.barberId);
    setEditDate(booking.date);
    setEditStartTime(booking.startTime);
    setEditEndTime(booking.endTime);
    setEditCustomerName(booking.customerName === 'ไม่ระบุชื่อ (ลูกค้าทั่วไป)' ? '' : booking.customerName);
    setEditCustomerPhone(booking.customerPhone === '-' ? '' : booking.customerPhone);
    setEditNotes(booking.notes);
    setEditRecorderId(booking.recorderBarberId);
    setEditErrorMsg('');
  };

  // Handle Form Submission for Creating a New Booking
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Field Validations
    if (!selectedBarberId) {
      setErrorMsg('กรุณาเลือกช่างที่ต้องการจองบริการ');
      return;
    }
    if (!bookingDate) {
      setErrorMsg('กรุณาระบุวันที่จอง');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMsg('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด');
      return;
    }
    if (startTime >= endTime) {
      setErrorMsg('เวลาเริ่มต้นต้องอยู่ก่อนหน้าเวลาสิ้นสุด');
      return;
    }
    if (!recorderBarberId) {
      setErrorMsg('กรุณาเลือกช่างผู้บันทึกรายการ');
      return;
    }

    // Collision (Overlap) Check
    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    const isOverlapping = bookings.some(b => {
      if (b.date === bookingDate && b.barberId === selectedBarberId) {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return startMin < bEnd && endMin > bStart;
      }
      return false;
    });

    if (isOverlapping) {
      setErrorMsg('ช่างที่เลือกติดคิวบริการลูกค้าท่านอื่นในช่วงเวลานี้อยู่แล้ว ไม่สามารถจองซ้ำซ้อนได้');
      return;
    }

    // Optional customer details with default values
    const finalCustomerName = customerName.trim() || 'ไม่ระบุชื่อ (ลูกค้าทั่วไป)';
    const finalCustomerPhone = customerPhone.trim() || '-';

    const chosenBarber = barbers.find(b => b.id === selectedBarberId);
    const recorderBarber = barbers.find(b => b.id === recorderBarberId);

    const barberName = chosenBarber ? chosenBarber.name : 'ไม่ระบุช่าง';
    const recorderBarberName = recorderBarber ? recorderBarber.name : 'ระบบ';

    // Create mode
    const newBooking: Booking = {
      id: `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      barberId: selectedBarberId,
      barberName,
      date: bookingDate,
      startTime,
      endTime,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      notes: notes.trim(),
      recorderBarberId,
      recorderBarberName,
      createdAt: new Date().toISOString()
    };

    onUpdateBookings([newBooking, ...bookings]);
    setSuccessMsg(`เพิ่มประวัติการจองลงระบบสำเร็จ!`);
    resetForm();

    // Auto clear success message
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Handle Form Submission for Editing a Booking via Popup Modal
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg('');

    if (!editBarberId) {
      setEditErrorMsg('กรุณาเลือกช่างที่ต้องการจอง');
      return;
    }
    if (!editDate) {
      setEditErrorMsg('กรุณาระบุวันที่จองคิว');
      return;
    }
    if (!editStartTime || !editEndTime) {
      setEditErrorMsg('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด');
      return;
    }
    if (editStartTime >= editEndTime) {
      setEditErrorMsg('เวลาเริ่มต้นต้องอยู่ก่อนหน้าเวลาสิ้นสุด');
      return;
    }
    if (!editRecorderId) {
      setEditErrorMsg('กรุณาเลือกช่างผู้บันทึกรายการ');
      return;
    }

    // Collision (Overlap) Check
    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const editStartMin = timeToMinutes(editStartTime);
    const editEndMin = timeToMinutes(editEndTime);

    const isEditOverlapping = bookings.some(b => {
      if (b.id === editingBooking?.id) return false;
      if (b.date === editDate && b.barberId === editBarberId) {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return editStartMin < bEnd && editEndMin > bStart;
      }
      return false;
    });

    if (isEditOverlapping) {
      setEditErrorMsg('ช่างที่เลือกติดคิวบริการลูกค้าท่านอื่นในช่วงเวลานี้อยู่แล้ว ไม่สามารถจองซ้ำซ้อนได้');
      return;
    }

    const finalCustomerName = editCustomerName.trim() || 'ไม่ระบุชื่อ (ลูกค้าทั่วไป)';
    const finalCustomerPhone = editCustomerPhone.trim() || '-';

    const chosenBarber = barbers.find(b => b.id === editBarberId);
    const recorderBarber = barbers.find(b => b.id === editRecorderId);

    const barberName = chosenBarber ? chosenBarber.name : 'ไม่ระบุช่าง';
    const recorderBarberName = recorderBarber ? recorderBarber.name : 'ระบบ';

    const updatedBookings = bookings.map((b) => {
      if (b.id === editingBooking?.id) {
        return {
          ...b,
          barberId: editBarberId,
          barberName,
          date: editDate,
          startTime: editStartTime,
          endTime: editEndTime,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          notes: editNotes.trim(),
          recorderBarberId: editRecorderId,
          recorderBarberName
        };
      }
      return b;
    });

    onUpdateBookings(updatedBookings);
    setSuccessMsg(`แก้ไขข้อมูลการจองเรียบร้อยแล้ว!`);
    setEditingBooking(null);

    // Auto clear success message
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Delete Booking Handler (With modern custom popup)
  const confirmDeleteBooking = () => {
    if (!deleteConfirmBooking) return;
    
    const updatedBookings = bookings.filter(b => b.id !== deleteConfirmBooking.id);
    onUpdateBookings(updatedBookings);
    setSuccessMsg(`ลบรายการจองคิวสำเร็จ`);
    setDeleteConfirmBooking(null);
    
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Helper date strings
  const todayStr = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  }, []);

  // Filter & Search Logic
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // 1. Date filter mode
      if (filterDateMode === 'today') {
        if (b.date !== todayStr) return false;
      } else if (filterDateMode === 'custom') {
        if (filterDate && b.date !== filterDate) return false;
      }
      
      // 2. Barber filter (from select dropdown)
      if (filterBarberId !== 'all' && b.barberId !== filterBarberId) {
        return false;
      }

      // 3. Search query filter (matches name, phone, or notes)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = b.customerName?.toLowerCase().includes(query);
        const matchPhone = b.customerPhone?.includes(query);
        const matchNotes = b.notes?.toLowerCase().includes(query);
        const matchBarber = b.barberName?.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchNotes && !matchBarber) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort primarily by date ascending
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      // Then sort by start time ascending
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      // Fallback: sort by creation date or id ascending (stable sorting)
      const dateCmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      if (dateCmp !== 0) return dateCmp;
      return a.id.localeCompare(b.id);
    });
  }, [bookings, filterDateMode, filterDate, filterBarberId, searchQuery, todayStr]);

  // Dynamic groups list of barbers
  const visibleGroups = useMemo(() => {
    const groups = [...barbers];
    
    // Add any other group IDs that might be in the bookings but not in the barbers array
    filteredBookings.forEach(b => {
      if (!groups.some(g => g.id === b.barberId)) {
        groups.push({
          id: b.barberId,
          name: b.barberName || 'ช่างทั่วไป',
          isWorking: false
        });
      }
    });

    if (filterBarberId === 'all') return groups;
    return groups.filter(g => g.id === filterBarberId);
  }, [barbers, filterBarberId, filteredBookings]);

  // Group bookings by date, and then group by hairdresser/barber
  const bookingsByDate = useMemo(() => {
    const map: { [dateStr: string]: Booking[] } = {};
    filteredBookings.forEach(b => {
      if (!map[b.date]) {
        map[b.date] = [];
      }
      map[b.date].push(b);
    });
    
    return Object.keys(map).sort().map(dateStr => {
      const dateBookings = map[dateStr];
      const barberMap: { [barberId: string]: { barberId: string; barberName: string; bookings: Booking[] } } = {};
      
      dateBookings.forEach(b => {
        const bId = b.barberId;
        if (!barberMap[bId]) {
          barberMap[bId] = {
            barberId: bId,
            barberName: b.barberName || 'ช่างทั่วไป',
            bookings: []
          };
        }
        barberMap[bId].bookings.push(b);
      });
      
      const barbersGroup = Object.values(barberMap).sort((a, b) => a.barberName.localeCompare(b.barberName));
      
      return {
        date: dateStr,
        barbers: barbersGroup,
        totalBookings: dateBookings.length
      };
    });
  }, [filteredBookings]);

  // Quick statistics for the header
  const bookingStats = useMemo(() => {
    const todayBookings = bookings.filter(b => b.date === todayStr);
    const activeNow = todayBookings.filter(b => {
      const alertInfo = checkBookingAlert(b.date, b.startTime, b.endTime, now);
      return alertInfo.isOngoing;
    }).length;

    return {
      totalToday: todayBookings.length,
      activeNow,
      totalAllTime: bookings.length
    };
  }, [bookings, todayStr, now]);

  // Clear all filters helper
  const clearFilters = () => {
    setFilterDateMode('all');
    setFilterDate('');
    setFilterBarberId('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800" id="bookings-tab">
      
      {/* 1. Elegant Header Banner with Animated Gradient Accent & Quick Statistics */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-slate-700/30">
        <div className="absolute right-0 top-0 opacity-[0.06] -translate-y-6 translate-x-6 pointer-events-none">
          <Calendar className="w-80 h-80" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold tracking-wider rounded-full uppercase border border-indigo-400/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-spin duration-1000" />
                Appointment Manager
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
              ระบบตารางนัดหมายและจองคิว
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
              เครื่องมือบริหารคิวลูกค้าอัจฉริยะแบบแยกตามช่าง ช่วยป้องกันการจองซ้ำซ้อน จัดตารางเวลาลงตัว และรองรับการติดตามสถานะแบบเรียลไทม์
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3.5 bg-slate-800/40 backdrop-blur-xs p-4 rounded-2xl border border-slate-700/20 max-w-sm w-full md:w-auto self-stretch md:self-center">
            <div className="text-center">
              <span className="block text-[10px] text-indigo-300 font-bold">คิววันนี้</span>
              <span className="text-lg font-black text-white font-mono">{bookingStats.totalToday}</span>
            </div>
            <div className="text-center border-x border-slate-700/50 px-2">
              <span className="block text-[10px] text-emerald-300 font-bold">กำลังรับบริการ</span>
              <span className="text-lg font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {bookingStats.activeNow}
              </span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] text-slate-300 font-bold font-sans">คิวทั้งหมด</span>
              <span className="text-lg font-black text-white font-mono">{bookingStats.totalAllTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center space-x-3 text-emerald-800 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Main Layout Grid: Form on Left, Queue view on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Modern Booking Form */}
        <div className="lg:col-span-4 space-y-6" id="booking-form-container">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/50 shadow-xs space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <PlusCircle className="w-4 h-4" />
                </span>
                <span className="font-sans font-extrabold uppercase tracking-wide">ลงทะเบียนจองคิวใหม่</span>
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              
              {/* Step 1: Barber Selection Cards */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold font-sans">
                  1. เลือกช่างที่ลูกค้าจองบริการ <span className="text-rose-500">*</span>
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  {barbers.map(barber => {
                    const isSelected = selectedBarberId === barber.id;
                    return (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => {
                          setSelectedBarberId(barber.id);
                          setErrorMsg('');
                        }}
                        className={`h-12 px-3 rounded-xl border-2 transition-all font-bold text-left flex items-center space-x-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs'
                            : 'bg-slate-50/50 border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full block ${barber.isWorking ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          {barber.isWorking && (
                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                          )}
                        </div>
                        <div className="truncate min-w-0">
                          <p className={`truncate text-[11px] ${isSelected ? 'text-indigo-950 font-extrabold' : 'text-slate-700'}`}>
                            ช่าง {barber.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-normal">
                            {barber.isWorking ? 'รับคิวอยู่' : 'ไม่ว่าง/หยุด'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Date Selector */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold font-sans">
                  2. วันที่รับบริการ <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center h-11">
                  <Calendar className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-full pl-10 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              {/* Step 3: Start and End Time - NORMALISED TO PIXEL-PERFECT ALIGNED ROW */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">
                    3. เวลาเริ่มต้น <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center h-11">
                    <Clock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setStartTime(newStart);
                        if (newStart) {
                          const autoEnd = calculateEndTime(newStart, shareConfig?.defaultBookingDuration ?? 60);
                          setEndTime(autoEnd);
                        }
                      }}
                      className="w-full h-full pl-10 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">
                    4. เวลาสิ้นสุด <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center h-11">
                    <Clock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-full pl-10 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Customer Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">
                    5. ชื่อลูกค้า <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                  </label>
                  <div className="relative flex items-center h-11">
                    <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="ลูกค้าทั่วไป"
                      className="w-full h-full pl-10 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:bg-white focus:border-indigo-600 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">
                    6. เบอร์โทรศัพท์ <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                  </label>
                  <div className="relative flex items-center h-11">
                    <Phone className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="เว้นว่างได้"
                      className="w-full h-full pl-10 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:bg-white focus:border-indigo-600 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Step 5: Remarks */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold font-sans">7. รายละเอียด / หมายเหตุนัดหมาย</label>
                <div className="relative flex items-start">
                  <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เช่น ตัดผมทรงวินเทจ, ย้อมสีผม หรือบริการอื่นๆ เพิ่มเติม..."
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:bg-white focus:border-indigo-600 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Step 6: Recorder Selector */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold font-sans">
                  8. พนักงานผู้บันทึกคิว <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center h-11">
                  <UserCheck className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={recorderBarberId}
                    onChange={(e) => setRecorderBarberId(e.target.value)}
                    className="w-full h-full pl-10 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-600 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">-- กรุณาเลือกผู้บันทึก --</option>
                    {allBarbersList.map(b => (
                      <option key={b.id} value={b.id}>
                        ช่าง {b.name} {b.realName ? `(${b.realName})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 pointer-events-none text-slate-400 font-sans text-lg">▾</div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-indigo-200 flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span className="font-sans">💾 บันทึกจองคิวใหม่</span>
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Modern List, Search Filters, and Separated Cards View */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/50 shadow-xs space-y-6">
            
            {/* Filter and Switchers Dashboard Banner */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-black text-slate-900 flex items-center space-x-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <span className="font-sans font-extrabold tracking-wide uppercase">กระดานตรวจสอบสถานะคิวจอง</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  คุณสามารถคัดกรองรายการเพื่อสะดวกต่อการเรียกคิว หรือสลับดูคิวที่กำลังจะเกิดขึ้นในชั่วโมงถัดๆ ไป
                </p>
              </div>
              
              {/* Reset filter control */}
              <div className="flex items-center space-x-2 self-start md:self-center">
                <button
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-100"
                >
                  🧹 ล้างเงื่อนไขค้นหา
                </button>
              </div>
            </div>

            {/* UPCOMING DATE SELECTOR TABS (Segmented style, clean and precise) */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">
                เลือกช่วงวันที่ที่ต้องการดูสถานะคิว
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setFilterDateMode('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 border-2 ${
                    filterDateMode === 'all'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 text-indigo-500" />
                  <span>📅 ทุกวันในระบบ (All)</span>
                </button>

                <button
                  onClick={() => setFilterDateMode('today')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 border-2 ${
                    filterDateMode === 'today'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0"></span>
                  <span>วันนี้ (Today)</span>
                </button>

                <button
                  onClick={() => {
                    setFilterDateMode('custom');
                    if (!filterDate) setFilterDate(todayStr);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 border-2 ${
                    filterDateMode === 'custom'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-400'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>🗓️ ระบุวันที่นัดเอง...</span>
                </button>
              </div>

              {/* Custom dynamic date input wrapper */}
              {filterDateMode === 'custom' && (
                <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-xs font-bold animate-fade-in border-t border-slate-200/50">
                  <span className="text-indigo-600 shrink-0">ระบุวันที่นัดหมาย:</span>
                  <div className="relative flex items-center h-9">
                    <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="h-full pl-8 pr-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg outline-none text-slate-800 font-medium"
                    />
                  </div>
                  <span className="text-slate-500 font-semibold text-[11px]">
                    ({formatThaiDate(filterDate)})
                  </span>
                </div>
              )}
            </div>

            {/* Secondary Quick Search Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
              
              {/* Barber Filter Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-indigo-500" /> กรองเฉพาะช่างที่จอง:
                </span>
                <div className="relative flex items-center h-10">
                  <select
                    value={filterBarberId}
                    onChange={(e) => setFilterBarberId(e.target.value)}
                    className="w-full h-full px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-600 cursor-pointer appearance-none"
                  >
                    <option value="all">💇‍♂️ แสดงคิวของช่างทุกคน</option>
                    {barbers.map(b => (
                      <option key={b.id} value={b.id}>ช่าง {b.name}</option>
                    ))}
                    <option value="unspecified">❓ คิวที่ไม่ระบุช่างเจาะจง</option>
                  </select>
                  <div className="absolute right-4 pointer-events-none text-slate-400 font-sans">▾</div>
                </div>
              </div>

              {/* Search Field */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-indigo-500" /> ค้นหาข้อมูลลูกค้า:
                </span>
                <div className="relative flex items-center h-10">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="พิมพ์ ค้นหาชื่อ เบอร์ หรือทรงผม..."
                    className="w-full h-full pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:bg-white focus:border-indigo-600 transition-all text-slate-700"
                  />
                </div>
              </div>

            </div>

            {/* DYNAMIC GRID QUEUE VIEW */}
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></span>
                  <span className="font-sans font-extrabold text-slate-900">กระดานคิวอัจฉริยะ ({filteredBookings.length} คิวรวม)</span>
                </span>
                {filterDateMode === 'today' && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 font-extrabold self-start sm:self-center">
                    🗓️ แสดงเฉพาะวันนี้: {formatThaiDate(todayStr)}
                  </span>
                )}
              </div>

              {bookingsByDate.length === 0 ? (
                <div className="py-14 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3.5">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <CalendarX className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-700 font-sans">ไม่พบรายการนัดหมายจองคิว</p>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      ไม่มีรายการจองคิวตามเงื่อนไขที่เลือก คุณสามารถลงบันทึกคิวบริการลูกค้าใหม่ได้ที่ช่องกรอกข้อมูลด้านซ้ายมือ
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {bookingsByDate.map((groupDate) => (
                    <div key={groupDate.date} className="space-y-3">
                      {/* 3. Grouped by Date Banner */}
                      <div className="border-l-4 border-indigo-600 bg-slate-100/80 rounded-r-2xl py-2 px-3 sm:px-4 flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-xs font-extrabold text-slate-900 font-sans">
                            {formatThaiDate(groupDate.date)}
                          </span>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-black border border-indigo-200/40">
                          รวม {groupDate.totalBookings} คิว
                        </span>
                      </div>

                      {/* 1. Grouped by Hairdresser Card inside 2-Column Responsive Layout */}
                      <div className="grid grid-cols-2 gap-3 items-start">
                        {groupDate.barbers.map((barberGroup) => (
                          <div 
                            key={barberGroup.barberId}
                            className="bg-slate-50/60 border border-slate-200/60 rounded-2xl p-2.5 sm:p-4 space-y-3 hover:shadow-xs transition-all duration-200"
                          >
                            {/* Barber Consolidation Header */}
                            <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                              <span className="text-[11px] font-black text-slate-900 truncate flex items-center gap-1 font-sans">
                                💇‍♂️ {barberGroup.barberId === 'unspecified' ? 'ช่างทั่วไป' : barberGroup.barberName}
                              </span>
                              <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                                {barberGroup.bookings.length} คิว
                              </span>
                            </div>

                            {/* 2. Compact Timeline UI inside the Barber Card */}
                            <div className="space-y-2">
                              {barberGroup.bookings.map((booking) => {
                                const alertInfo = checkBookingAlert(booking.date, booking.startTime, booking.endTime, now);
                                const isPendingCancel = inlineCancelId === booking.id;

                                return (
                                  <div
                                    key={booking.id}
                                    className={`p-2 sm:p-2.5 rounded-xl border-2 transition-all relative text-[10px] flex flex-col justify-between ${
                                      editingBooking?.id === booking.id
                                        ? 'bg-amber-50/70 border-amber-400'
                                        : alertInfo.isAlmostTime
                                        ? 'bg-amber-50/95 border-amber-500 animate-pulse'
                                        : alertInfo.isOngoing
                                        ? 'bg-emerald-50/60 border-emerald-500'
                                        : 'bg-white border-slate-200/70 hover:border-slate-300'
                                    }`}
                                  >
                                    {/* Left Accent indicator strip */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                                      editingBooking?.id === booking.id
                                        ? 'bg-amber-400'
                                        : alertInfo.isAlmostTime
                                        ? 'bg-amber-500'
                                        : alertInfo.isOngoing
                                        ? 'bg-emerald-500'
                                        : 'bg-indigo-500'
                                    }`} />

                                    {/* Booking Content Details */}
                                    <div className="pl-1.5 space-y-1.5">
                                      {/* Time Slots & Badges */}
                                      <div className="flex flex-wrap items-center justify-between gap-1">
                                        <span className="inline-flex items-center space-x-0.5 font-mono text-[9px] font-extrabold text-indigo-900 bg-indigo-50/85 px-1.5 py-0.5 rounded border border-indigo-100">
                                          <Clock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                          <span>{booking.startTime} - {booking.endTime}</span>
                                        </span>

                                        {alertInfo.isAlmostTime && (
                                          <span className="text-[8px] font-black text-amber-800 bg-amber-100 px-1 py-0.5 rounded animate-pulse">
                                            อีก {alertInfo.minutesDiff} น.
                                          </span>
                                        )}
                                        {alertInfo.isOngoing && (
                                          <span className="text-[8px] font-black text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded">
                                            บริการอยู่
                                          </span>
                                        )}
                                      </div>

                                      {/* Customer and Contact Details */}
                                      <div className="space-y-1">
                                        <div className="font-extrabold text-slate-800 truncate font-sans text-[10.5px]">
                                          👤 {booking.customerName.replace('ไม่ระบุชื่อ (ลูกค้าทั่วไป)', 'ลูกค้าทั่วไป')}
                                        </div>
                                        
                                        {booking.customerPhone && booking.customerPhone !== '-' && (
                                          <div className="flex items-center gap-1 font-mono text-[9px]">
                                            <span className="text-slate-400">📞</span>
                                            <a 
                                              href={`tel:${booking.customerPhone}`}
                                              className="text-indigo-600 hover:text-indigo-800 font-black hover:underline inline-flex items-center"
                                              title="โทรออกด่วน"
                                            >
                                              {booking.customerPhone} (โทร)
                                            </a>
                                          </div>
                                        )}
                                      </div>

                                      {/* Short Notes */}
                                      {booking.notes && (
                                        <p className="text-[9px] text-slate-500 italic bg-slate-50 p-1 rounded font-sans border border-slate-100 truncate" title={booking.notes}>
                                          📝 {booking.notes}
                                        </p>
                                      )}
                                    </div>

                                    {/* Action Row */}
                                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 mt-2 pt-1.5 pl-1.5">
                                      <button
                                        onClick={() => startEdit(booking)}
                                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition-all cursor-pointer"
                                        title="แก้ไขคิว"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <button
                                        onClick={() => setInlineCancelId(isPendingCancel ? null : booking.id)}
                                        className={`p-1 hover:bg-slate-100 rounded transition-all cursor-pointer ${
                                          isPendingCancel ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
                                        }`}
                                        title="ยกเลิกคิว"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* 4. Inline Cancellation Consent Form */}
                                    {isPendingCancel && (
                                      <div className="mt-2 p-1.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-1.5 text-[9px] animate-fade-in z-10 relative">
                                        <span className="font-bold text-rose-800 text-center">ต้องการลบคิวนี้หรือไม่?</span>
                                        <div className="flex justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = bookings.filter(b => b.id !== booking.id);
                                              onUpdateBookings(updated);
                                              setInlineCancelId(null);
                                              setSuccessMsg(`ลบรายการจองคิวสำเร็จ`);
                                              setTimeout(() => setSuccessMsg(''), 4000);
                                            }}
                                            className="px-2.5 py-1 bg-rose-600 text-white font-black rounded-lg hover:bg-rose-700 cursor-pointer text-[9px]"
                                          >
                                            ลบ
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setInlineCancelId(null);
                                            }}
                                            className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 cursor-pointer text-[9px]"
                                          >
                                            ไม่ลบ
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* EDIT BOOKING POPUP MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <div className="p-1.5 bg-indigo-50 rounded-xl">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="text-sm font-black text-slate-900 font-sans">แก้ไขรายละเอียดการจองคิว</h4>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editErrorMsg && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center space-x-2 text-rose-800 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-medium">
              
              {/* 1. Barber Selection */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold font-sans">ช่างที่ลูกค้าจองบริการ <span className="text-rose-500">*</span></label>
                
                <div className="grid grid-cols-2 gap-2">
                  {barbers.map(barber => (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => setEditBarberId(barber.id)}
                      className={`py-2.5 px-3 rounded-xl border transition-all font-bold text-[11px] text-left flex items-center space-x-2 cursor-pointer ${
                        editBarberId === barber.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${barber.isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
                      <span className="truncate font-sans">ช่าง {barber.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Date and Time Slots - NORMALISED ALIGNED INPUTS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">วันที่รับบริการ: <span className="text-rose-500">*</span></label>
                  <div className="h-10">
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full h-full px-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">เวลาเริ่มต้น: <span className="text-rose-500">*</span></label>
                  <div className="h-10">
                    <input
                      type="time"
                      required
                      value={editStartTime}
                      onChange={(e) => {
                        const newEditStart = e.target.value;
                        setEditStartTime(newEditStart);
                        if (newEditStart) {
                          const autoEditEnd = calculateEndTime(newEditStart, shareConfig?.defaultBookingDuration ?? 60);
                          setEditEndTime(autoEditEnd);
                        }
                      }}
                      className="w-full h-full px-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">เวลาสิ้นสุด: <span className="text-rose-500">*</span></label>
                  <div className="h-10">
                    <input
                      type="time"
                      required
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full h-full px-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Customer Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">ชื่อลูกค้า: <span className="text-slate-400 font-normal">(เว้นว่างหากไม่ระบุ)</span></label>
                  <div className="relative flex items-center h-10">
                    <User className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      placeholder="ลูกค้าทั่วไป / Walk-in"
                      className="w-full h-full pl-9 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all font-sans text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold font-sans">เบอร์โทรศัพท์: <span className="text-slate-400 font-normal">(เว้นว่างหากไม่มี)</span></label>
                  <div className="relative flex items-center h-10">
                    <Phone className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      placeholder="กรอกเบอร์โทรศัพท์"
                      className="w-full h-full pl-9 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Notes and remarks */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold font-sans">หมายเหตุเพิ่มเติม:</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติมทรงผม ความต้องการพิเศษ..."
                    rows={2}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* 5. Recorder */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold font-sans">ผู้แก้ไข / บันทึกรายการ: <span className="text-rose-500">*</span></label>
                <div className="relative flex items-center h-10">
                  <UserCheck className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={editRecorderId}
                    onChange={(e) => setEditRecorderId(e.target.value)}
                    className="w-full h-full pl-9 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-600 transition-all cursor-pointer font-bold appearance-none"
                  >
                    <option value="">-- กรุณาเลือกผู้บันทึก --</option>
                    {allBarbersList.map(b => (
                      <option key={b.id} value={b.id}>
                        ช่าง {b.name} {b.realName ? `(${b.realName})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 pointer-events-none text-slate-400">▾</div>
                </div>
              </div>

              {/* Submit / Cancel Button */}
              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-center font-sans text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-center shadow-xs font-sans text-xs"
                >
                  💾 บันทึกแก้ไขคิวจอง
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CUSTOM POPUP CONFIRMATION MODAL FOR DELETING */}
      {deleteConfirmBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-5 animate-scale-up">
            
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black font-sans">ยืนยันการลบรายการจองคิว</h4>
            </div>

            <div className="text-xs text-slate-600 space-y-2 font-sans">
              <p>คุณแน่ใจหรือไม่ที่จะลบรายการจองคิวนี้ออกจากระบบถาวร?</p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-1">
                <div className="font-bold text-slate-800">👤 ลูกค้า: คุณ {deleteConfirmBooking.customerName}</div>
                <div className="font-mono text-[11px] text-slate-500">📞 เบอร์โทร: {deleteConfirmBooking.customerPhone}</div>
                <div className="text-[11px] text-indigo-700 font-bold">💇‍♂️ ช่างผู้ให้บริการ: ช่าง {deleteConfirmBooking.barberName}</div>
                <div className="text-[11px] text-slate-500">📅 วันที่นัด: {formatThaiDate(deleteConfirmBooking.date)} ({deleteConfirmBooking.startTime} - {deleteConfirmBooking.endTime} น.)</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmBooking(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer font-sans"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteBooking}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs font-sans"
              >
                ยืนยันการลบ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
