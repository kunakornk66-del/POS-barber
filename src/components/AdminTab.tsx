import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar, 
  Trash2, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  CalendarPlus, 
  Mail, 
  Store, 
  RefreshCw,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { CustomerSubscription } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { formatThaiDate, cleanUndefined } from '../utils';

export const ADMIN_EMAIL = 'kunakorn.k66@gmail.com';

interface AdminTabProps {
  currentEmail: string;
}

export default function AdminTab({ currentEmail }: AdminTabProps) {
  const isSuperAdmin = currentEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended' | 'expired'>('all');

  // New Email Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newShopName, setNewShopName] = useState<string>('');
  const [newMonths, setNewMonths] = useState<number>(1);
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Duration Modal State
  const [durationModalSub, setDurationModalSub] = useState<CustomerSubscription | null>(null);
  const [modalMonths, setModalMonths] = useState<number>(1);
  const [modalCustomDate, setModalCustomDate] = useState<string>('');

  // Delete Confirmation Modal State
  const [deleteModalSub, setDeleteModalSub] = useState<CustomerSubscription | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Helper: calculate Thai Date or Today string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper: Add N months to a date string YYYY-MM-DD
  const calculateNewExpiry = (baseDateStr: string, months: number): string => {
    const base = new Date(baseDateStr);
    if (isNaN(base.getTime())) {
      const now = new Date();
      now.setMonth(now.getMonth() + months);
      return now.toISOString().split('T')[0];
    }
    const result = new Date(base);
    result.setMonth(result.getMonth() + months);
    return result.toISOString().split('T')[0];
  };

  // 1. Real-time Subscriptions Sync from Firestore
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const subsColRef = collection(db, 'subscriptions');
    const unsubscribe = onSnapshot(
      subsColRef,
      (snapshot) => {
        const items: CustomerSubscription[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CustomerSubscription;
          const cleanEmail = docSnap.id.trim().toLowerCase();
          items.push({
            ...data,
            email: cleanEmail
          });
        });

        // Ensure the admin account itself is present in the list
        const hasAdminInList = items.some(i => i.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
        if (!hasAdminInList) {
          items.unshift({
            email: ADMIN_EMAIL,
            shopName: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
            status: 'approved',
            startDate: '2026-01-01',
            expiryDate: '2099-12-31',
            monthsAllowed: 999,
            notes: 'บัญชีผู้ดูแลระบบหลัก ไม่จำกัดระยะเวลา',
            createdAt: new Date().toISOString()
          });
        }

        setSubscriptions(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'subscriptions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSuperAdmin]);

  // Status check helper
  const getSubStatus = (sub: CustomerSubscription): 'pending' | 'active' | 'suspended' | 'expired' => {
    if (sub.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return 'active';
    if (sub.status === 'pending') return 'pending';
    if (sub.status === 'suspended') return 'suspended';
    const expiry = new Date(sub.expiryDate);
    const now = new Date();
    // Set time to end of expiry day for comparison
    expiry.setHours(23, 59, 59, 999);
    if (expiry < now) return 'expired';
    return 'active';
  };

  // Days remaining helper
  const getDaysRemaining = (expiryDateStr: string): number => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    expiry.setHours(23, 59, 59, 999);
    now.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        // Search term filter
        const query = searchTerm.trim().toLowerCase();
        const matchesQuery = 
          !query || 
          sub.email.toLowerCase().includes(query) || 
          (sub.shopName && sub.shopName.toLowerCase().includes(query)) ||
          (sub.notes && sub.notes.toLowerCase().includes(query));

        if (!matchesQuery) return false;

        // Status filter
        const currentStatus = getSubStatus(sub);
        if (statusFilter === 'all') return true;
        return currentStatus === statusFilter;
      })
      .sort((a, b) => {
        // Super admin always pinned first
        if (a.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return -1;
        if (b.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return 1;
        // Pending users pinned right after admin for urgent visibility
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        // Then sort by createdAt or lastActiveAt descending
        const dateA = a.updatedAt || a.lastActiveAt || a.createdAt || '';
        const dateB = b.updatedAt || b.lastActiveAt || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
  }, [subscriptions, searchTerm, statusFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    let active = 0;
    let pending = 0;
    let suspended = 0;
    let expired = 0;

    subscriptions.forEach((sub) => {
      const status = getSubStatus(sub);
      if (status === 'pending') pending++;
      else if (status === 'active') active++;
      else if (status === 'suspended') suspended++;
      else if (status === 'expired') expired++;
    });

    return {
      total: subscriptions.length,
      active,
      pending,
      suspended,
      expired
    };
  }, [subscriptions]);

  // 2. Add / Grant Email Subscription
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('กรุณากรอกอีเมลให้ถูกต้อง (เช่น name@gmail.com)');
      return;
    }

    if (newMonths < 1) {
      setFormError('กรุณาระบุจำนวนเดือนอย่างน้อย 1 เดือน');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDate = todayStr;
      const expiryDate = calculateNewExpiry(todayStr, newMonths);

      const newSubData: CustomerSubscription = {
        email: cleanEmail,
        shopName: newShopName.trim() || 'ร้านทำผม/บาร์เบอร์',
        status: 'approved',
        monthsAllowed: newMonths,
        startDate,
        expiryDate,
        notes: newNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, 'subscriptions', cleanEmail);
      await setDoc(docRef, cleanUndefined(newSubData));

      showToast(`✅ เพิ่มและกำหนดสิทธิ์ให้ ${cleanEmail} ใช้งานได้ ${newMonths} เดือน เรียบร้อยแล้ว`);
      setShowAddModal(false);
      setNewEmail('');
      setNewShopName('');
      setNewMonths(1);
      setNewNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `subscriptions/${cleanEmail}`);
      setFormError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Quick Extend Months (+1, +3, +6, +12)
  const handleQuickExtend = async (sub: CustomerSubscription, monthsToAdd: number) => {
    if (sub.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('ℹ️ บัญชีแอดมินสูงสุดใช้งานได้ตลอดชีพ ไม่จำเป็นต้องขยายเวลา');
      return;
    }

    try {
      // If currently expired, start from today. If active, extend from current expiry date.
      const currentStatus = getSubStatus(sub);
      const baseDate = (currentStatus === 'expired' || !sub.expiryDate) ? todayStr : sub.expiryDate;
      const newExpiry = calculateNewExpiry(baseDate, monthsToAdd);
      const updatedMonths = (sub.monthsAllowed || 0) + monthsToAdd;

      const docRef = doc(db, 'subscriptions', sub.email.toLowerCase());
      await setDoc(docRef, cleanUndefined({
        ...sub,
        status: 'approved', // reactivate if was expired
        expiryDate: newExpiry,
        monthsAllowed: updatedMonths,
        updatedAt: new Date().toISOString()
      }), { merge: true });

      showToast(`✅ ขยายเวลาให้ ${sub.email} เพิ่มอีก ${monthsToAdd} เดือน (ถึง ${formatThaiDate(newExpiry)})`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${sub.email}`);
      showToast('❌ ไม่สามารถขยายเวลาได้ กรุณาลองใหม่');
    }
  };

  // 4. Custom Set Duration / Expiry Date
  const handleSaveCustomDuration = async () => {
    if (!durationModalSub) return;
    const sub = durationModalSub;

    try {
      let finalExpiry = modalCustomDate;
      let finalMonths = modalMonths;

      if (!finalExpiry) {
        const baseDate = (getSubStatus(sub) === 'expired' || !sub.expiryDate) ? todayStr : sub.expiryDate;
        finalExpiry = calculateNewExpiry(baseDate, modalMonths);
      }

      const docRef = doc(db, 'subscriptions', sub.email.toLowerCase());
      await setDoc(docRef, cleanUndefined({
        ...sub,
        status: 'approved',
        expiryDate: finalExpiry,
        monthsAllowed: finalMonths,
        updatedAt: new Date().toISOString()
      }), { merge: true });

      showToast(`✅ บันทึกระยะเวลาของ ${sub.email} ถึงวันที่ ${formatThaiDate(finalExpiry)} สำเร็จ`);
      setDurationModalSub(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${sub.email}`);
      showToast('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // 4.5. Approve Pending User Access
  const handleApproveUser = async (sub: CustomerSubscription, months: number = 1) => {
    if (sub.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
    try {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);
      const expiryDate = expiry.toISOString().split('T')[0];

      const cleanData = cleanUndefined({
        ...sub,
        status: 'approved',
        startDate,
        expiryDate,
        monthsAllowed: months,
        updatedAt: now.toISOString()
      });

      const docRef = doc(db, 'subscriptions', sub.email.toLowerCase());
      await setDoc(docRef, cleanData, { merge: true });
      showToast(`✅ อนุมัติสิทธิ์ให้ ${sub.email} ใช้งานได้ ${months} เดือน (ถึง ${formatThaiDate(expiryDate)}) เรียบร้อยแล้ว`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${sub.email}`);
      showToast('❌ ไม่สามารถอนุมัติได้ กรุณาลองใหม่');
    }
  };

  // 5. Suspend / Unsuspend Email Account
  const handleToggleSuspend = async (sub: CustomerSubscription) => {
    if (sub.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('⚠️ ไม่สามารถระงับบัญชีผู้ดูแลระบบหลักได้');
      return;
    }

    const isCurrentlySuspended = sub.status === 'suspended';
    const newStatus = isCurrentlySuspended ? 'approved' : 'suspended';

    try {
      const docRef = doc(db, 'subscriptions', sub.email.toLowerCase());
      await setDoc(docRef, cleanUndefined({
        ...sub,
        status: newStatus,
        updatedAt: new Date().toISOString()
      }), { merge: true });

      if (isCurrentlySuspended) {
        showToast(`✅ ปลดระงับการใช้งาน ${sub.email} แล้ว (สามารถเข้าใช้งานได้ตามปกติ)`);
      } else {
        showToast(`🚫 ระงับการใช้งาน ${sub.email} แล้ว (ผู้ใช้นี้จะถูกบล็อกไม่ให้เข้าใช้งาน)`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${sub.email}`);
      showToast('❌ ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่');
    }
  };

  // 6. Delete Email Account with Confirmation Dialog
  const handleConfirmDelete = async () => {
    if (!deleteModalSub) return;
    const emailToDelete = deleteModalSub.email.trim().toLowerCase();

    if (emailToDelete === ADMIN_EMAIL.toLowerCase()) {
      showToast('⚠️ ไม่อนุญาตให้ลบบัญชีแอดมินหลัก');
      setDeleteModalSub(null);
      return;
    }

    setIsDeleting(true);
    try {
      const docRef = doc(db, 'subscriptions', emailToDelete);
      await deleteDoc(docRef);

      showToast(`🗑️ ลบข้อมูลบัญชี ${emailToDelete} ออกจากระบบเรียบร้อยแล้ว`);
      setDeleteModalSub(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `subscriptions/${emailToDelete}`);
      showToast('❌ ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่');
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if non-admin attempts access
  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-3xl border border-rose-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ (Admin)</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          ระบบ Admin สงวนสิทธิ์เฉพาะผู้ดูแลระบบหลัก (<span className="font-mono font-bold text-rose-600">{ADMIN_EMAIL}</span>) เท่านั้น
          <br />บัญชีปัจจุบันของคุณคือ: <span className="font-mono font-semibold text-slate-700">{currentEmail || 'ไม่ได้ระบุ'}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-3 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Admin Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white shrink-0">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  Super Admin Panel
                </span>
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-400" />
                  {ADMIN_EMAIL}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ระบบจัดการสิทธิ์ผู้ใช้งาน (Admin System)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                จัดการบัญชีอีเมลที่ Login เข้าใช้งาน กำหนดจำนวนเดือนที่อนุญาต ระงับการใช้งาน และลบข้อมูล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม / กำหนดสิทธิ์อีเมล</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approval Alert Banner */}
      {stats.pending > 0 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-400 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  มีอีเมลใหม่รอการอนุมัติ ({stats.pending} บัญชี)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider animate-pulse">
                  รออนุมัติ
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                อีเมลใหม่เหล่านี้จะยังไม่สามารถเข้าใช้งานระบบได้ จนกว่า Admin จะกดปุ่มอนุมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm cursor-pointer shrink-0 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Clock className="w-4 h-4" />
            <span>ดูเฉพาะรายการรออนุมัติ ({stats.pending})</span>
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Users */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            statusFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-800' : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wide ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>อีเมลทั้งหมด</span>
            <span className={`p-2 rounded-xl ${statusFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              <Mail className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
            {stats.total}
          </div>
          <p className={`text-[11px] font-medium ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>บัญชีที่บันทึกในระบบ</p>
        </div>

        {/* Pending Users */}
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-400'
              : stats.pending > 0
              ? 'bg-amber-50/80 border-amber-300 hover:border-amber-400 ring-1 ring-amber-300/40'
              : 'bg-white border-slate-200/90 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wide ${statusFilter === 'pending' ? 'text-slate-950' : 'text-amber-800'}`}>
              รออนุมัติ
            </span>
            <span className={`p-2 rounded-xl ${statusFilter === 'pending' ? 'bg-amber-600 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${statusFilter === 'pending' ? 'text-slate-950' : 'text-amber-700'}`}>
            {stats.pending}
          </div>
          <p className={`text-[11px] font-medium ${statusFilter === 'pending' ? 'text-slate-900' : 'text-amber-700/80'}`}>
            {stats.pending > 0 ? '⚠️ ต้องกดอนุมัติก่อน' : 'ไม่มีรายการค้างอนุมัติ'}
          </p>
        </div>

        {/* Active Users */}
        <div 
          onClick={() => setStatusFilter('active')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            statusFilter === 'active' ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500' : 'bg-white border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wide ${statusFilter === 'active' ? 'text-emerald-100' : 'text-emerald-700'}`}>ใช้งานได้ปกติ</span>
            <span className={`p-2 rounded-xl ${statusFilter === 'active' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-700'}`}>
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${statusFilter === 'active' ? 'text-white' : 'text-emerald-700'}`}>
            {stats.active}
          </div>
          <p className={`text-[11px] font-medium ${statusFilter === 'active' ? 'text-emerald-200' : 'text-emerald-600/80'}`}>ยังไม่หมดอายุและไม่ถูกระงับ</p>
        </div>

        {/* Expired Users */}
        <div 
          onClick={() => setStatusFilter('expired')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            statusFilter === 'expired' ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400' : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wide ${statusFilter === 'expired' ? 'text-amber-100' : 'text-amber-700'}`}>หมดอายุแล้ว</span>
            <span className={`p-2 rounded-xl ${statusFilter === 'expired' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${statusFilter === 'expired' ? 'text-white' : 'text-amber-700'}`}>
            {stats.expired}
          </div>
          <p className={`text-[11px] font-medium ${statusFilter === 'expired' ? 'text-amber-200' : 'text-amber-600/80'}`}>ต้องต่ออายุเพื่อเข้าใช้งาน</p>
        </div>

        {/* Suspended Users */}
        <div 
          onClick={() => setStatusFilter('suspended')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            statusFilter === 'suspended' ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500' : 'bg-white border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wide ${statusFilter === 'suspended' ? 'text-rose-100' : 'text-rose-700'}`}>ถูกระงับการใช้งาน</span>
            <span className={`p-2 rounded-xl ${statusFilter === 'suspended' ? 'bg-rose-800 text-rose-100' : 'bg-rose-100 text-rose-700'}`}>
              <UserX className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${statusFilter === 'suspended' ? 'text-white' : 'text-rose-700'}`}>
            {stats.suspended}
          </div>
          <p className={`text-[11px] font-medium ${statusFilter === 'suspended' ? 'text-rose-200' : 'text-rose-600/80'}`}>ถูกปิดกั้นสิทธิ์โดยแอดมิน</p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยอีเมล, ชื่อร้าน, หรือหมายเหตุ..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : stats.pending > 0
                  ? 'bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 border border-amber-300'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              ⏳ รออนุมัติ ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🟢 ปกติ ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'expired'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              🟡 หมดอายุ ({stats.expired})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              🔴 ระงับ ({stats.suspended})
            </button>
          </div>

        </div>
      </div>

      {/* User Accounts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <span>รายการบัญชีผู้ใช้ ({filteredSubscriptions.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            ระบบอัปเดตสถานะอัตโนมัติตลอดเวลา
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500 font-semibold">กำลังโหลดข้อมูลบัญชีผู้ใช้งาน...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-3">
            <Mail className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">ไม่พบบัญชีอีเมลตามเงื่อนไขที่ค้นหา</p>
            <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่ม / กำหนดสิทธิ์อีเมล" ด้านบน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubscriptions.map((sub) => {
              const currentStatus = getSubStatus(sub);
              const daysRemaining = getDaysRemaining(sub.expiryDate);
              const isSelfAdmin = sub.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={sub.email}
                  className={`bg-white p-4 sm:p-5 rounded-3xl border transition-all shadow-2xs hover:shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isSelfAdmin
                      ? 'border-indigo-300/80 bg-gradient-to-r from-indigo-50/50 via-white to-white'
                      : currentStatus === 'pending'
                      ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-300/60 shadow-amber-500/5'
                      : currentStatus === 'suspended'
                      ? 'border-rose-200 bg-rose-50/20'
                      : currentStatus === 'expired'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* User Profile Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-indigo-500" />
                        {sub.email}
                      </span>

                      {/* Status Badges */}
                      {isSelfAdmin ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white shadow-2xs">
                          ⭐ Super Admin (แอดมินสูงสุด)
                        </span>
                      ) : currentStatus === 'pending' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs animate-pulse">
                          <Clock className="w-3 h-3 text-amber-600" />
                          ⏳ รอแอดมินกดอนุมัติ (Pending)
                        </span>
                      ) : currentStatus === 'suspended' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <UserX className="w-3 h-3 text-rose-600" />
                          🚫 ระงับการใช้งาน
                        </span>
                      ) : currentStatus === 'expired' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          ⏳ หมดอายุแล้ว
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ✅ ใช้งานได้ปกติ
                        </span>
                      )}

                      {sub.shopName && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          <Store className="w-3 h-3 text-slate-400" />
                          {sub.shopName}
                        </span>
                      )}
                    </div>

                    {/* Expiry & Time details */}
                    <div className="text-xs text-slate-500 flex items-center gap-3 sm:gap-4 flex-wrap">
                      {!isSelfAdmin && (
                        <>
                          {currentStatus === 'pending' ? (
                            <div className="flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-100/70 px-2.5 py-1 rounded-xl border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>อีเมลนี้เข้าสู่ระบบแล้ว: <b>รอ Admin กดอนุมัติเปิดสิทธิ์</b></span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>หมดอายุ: <b>{formatThaiDate(sub.expiryDate)}</b></span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {currentStatus === 'suspended' ? (
                                  <span className="font-bold text-rose-600">ถูกระงับสิทธิ์</span>
                                ) : daysRemaining > 0 ? (
                                  <span className="font-bold text-emerald-600 font-mono">เหลืออีก {daysRemaining} วัน</span>
                                ) : (
                                  <span className="font-bold text-amber-600 font-mono">เลยกำหนดมาแล้ว {Math.abs(daysRemaining)} วัน</span>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {sub.lastActiveAt && (
                        <div className="text-slate-400 text-[11px]">
                          เข้าใช้งานล่าสุด: {new Date(sub.lastActiveAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}

                      {sub.notes && (
                        <div className="text-slate-500 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          📝 {sub.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Section */}
                  {!isSelfAdmin && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {currentStatus === 'pending' ? (
                        <>
                          {/* Approve 1 month primary button */}
                          <button
                            type="button"
                            onClick={() => handleApproveUser(sub, 1)}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                            title="กดอนุมัติสิทธิ์การใช้งาน 1 เดือนทันที"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>กดอนุมัติ (1 เดือน)</span>
                          </button>

                          {/* Quick alternative durations for approval */}
                          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-extrabold text-slate-400 px-1">หรือ:</span>
                            <button
                              type="button"
                              onClick={() => handleApproveUser(sub, 3)}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="อนุมัติ 3 เดือน"
                            >
                              +3 ด.
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveUser(sub, 6)}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="อนุมัติ 6 เดือน"
                            >
                              +6 ด.
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveUser(sub, 12)}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="อนุมัติ 1 ปี (12 เดือน)"
                            >
                              +12 ด.
                            </button>
                          </div>

                          {/* Custom Duration Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setDurationModalSub(sub);
                              setModalMonths(1);
                              setModalCustomDate(sub.expiryDate || '');
                            }}
                            className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                            title="กำหนดระยะเวลาอนุมัติเอง"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>กำหนดวัน</span>
                          </button>

                          {/* Suspend / Reject Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(sub)}
                            className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                            title="ปฏิเสธ / ระงับอีเมลนี้"
                          >
                            <UserX className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalSub(sub)}
                            className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer"
                            title="ลบข้อมูลบัญชีอีเมลนี้ออกจากระบบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Quick Extend Months */}
                          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
                            <span className="text-[10px] font-extrabold text-slate-400 px-1.5">ต่ออายุ:</span>
                            <button
                              type="button"
                              onClick={() => handleQuickExtend(sub, 1)}
                              className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="เพิ่มเวลาใช้งาน 1 เดือน"
                            >
                              +1 ด.
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickExtend(sub, 3)}
                              className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="เพิ่มเวลาใช้งาน 3 เดือน"
                            >
                              +3 ด.
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickExtend(sub, 6)}
                              className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="เพิ่มเวลาใช้งาน 6 เดือน"
                            >
                              +6 ด.
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickExtend(sub, 12)}
                              className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                              title="เพิ่มเวลาใช้งาน 12 เดือน (1 ปี)"
                            >
                              +12 ด.
                            </button>
                          </div>

                          {/* Custom Duration Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setDurationModalSub(sub);
                              setModalMonths(1);
                              setModalCustomDate(sub.expiryDate || '');
                            }}
                            className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                            title="กำหนดระยะเวลาเอง"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>กำหนดวัน</span>
                          </button>

                          {/* Suspend / Unsuspend Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(sub)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentStatus === 'suspended'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300'
                            }`}
                            title={currentStatus === 'suspended' ? 'คลิกเพื่อปลดระงับและให้ใช้งาน' : 'คลิกเพื่อระงับการใช้งานทันที'}
                          >
                            {currentStatus === 'suspended' ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>ปลดระงับ</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>ระงับการใช้งาน</span>
                              </>
                            )}
                          </button>

                          {/* Delete Button (with confirmation) */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalSub(sub)}
                            className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer"
                            title="ลบข้อมูลบัญชีอีเมลนี้ออกจากระบบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Add / Pre-register Email */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-400/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">เพิ่ม / กำหนดสิทธิ์อีเมลผู้ใช้งาน</h3>
                  <p className="text-xs text-indigo-200">ระบุอีเมลและระยะเวลาที่อนุญาตให้ใช้งานระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddSubscription} className="p-5 sm:p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>อีเมลที่ต้องการให้สิทธิ์ (Gmail / Email) *</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="เช่น barber.shop@gmail.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  เมื่ออีเมลนี้ล็อกอินเข้ามา จะได้รับสิทธิ์ตามระยะเวลาที่กำหนดนี้ทันที
                </p>
              </div>

              {/* Shop Name / Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ชื่อร้าน / ชื่อลูกค้า (ถ้ามี)</span>
                </label>
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="เช่น บาร์เบอร์ สาขา 1 / พี่เอก"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Duration in Months */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>กำหนดจำนวนเดือนที่ให้ใช้งาน *</span>
                </label>
                
                {/* Preset Pills */}
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewMonths(m)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        newMonths === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m} เดือน
                    </button>
                  ))}
                </div>

                {/* Custom Month Number */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">หรือระบุ:</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={newMonths}
                    onChange={(e) => setNewMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 text-center"
                  />
                  <span className="text-xs font-semibold text-slate-600">เดือน</span>
                </div>

                {/* Calculated Expiry Preview */}
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-center justify-between">
                  <span>วันหมดอายุที่คำนวณได้:</span>
                  <span className="font-bold font-mono text-indigo-700">
                    {formatThaiDate(calculateNewExpiry(todayStr, newMonths))}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="เช่น ชำระค่าบริการรายปีแล้ว / ทดลองใช้งาน"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>บันทึกและให้สิทธิ์</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Custom Duration / Expiry Date */}
      {durationModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarPlus className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-black text-white">กำหนดวันหมดอายุ</h3>
                  <p className="text-xs text-slate-300 font-mono">{durationModalSub.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDurationModalSub(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">เลือกวันหมดอายุโดยตรง (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={modalCustomDate}
                  onChange={(e) => setModalCustomDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
                />
              </div>

              <div className="text-center text-xs text-slate-400 font-semibold">— หรือเพิ่มจำนวนเดือนจากปัจจุบัน —</div>

              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const base = (getSubStatus(durationModalSub) === 'expired' || !durationModalSub.expiryDate) ? todayStr : durationModalSub.expiryDate;
                      setModalCustomDate(calculateNewExpiry(base, m));
                      setModalMonths(m);
                    }}
                    className="py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer text-center"
                  >
                    +{m} เดือน
                  </button>
                ))}
              </div>

              {modalCustomDate && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-semibold text-center">
                  วันหมดอายุใหม่: <b className="text-indigo-700 font-mono">{formatThaiDate(modalCustomDate)}</b>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDurationModalSub(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomDuration}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  บันทึกวันหมดอายุ
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation Dialog (ปุ่มลบยืนยันก่อนลบด้วย) */}
      {deleteModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden">
            
            <div className="p-5 bg-rose-600 text-white flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">ยืนยันการลบข้อมูลอีเมล</h3>
                <p className="text-xs text-rose-100">โปรดตรวจสอบก่อนดำเนินการ</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีอีเมลต่อไปนี้ออกจากระบบ?
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="font-mono font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-rose-600" />
                  {deleteModalSub.email}
                </div>
                {deleteModalSub.shopName && (
                  <div className="text-xs text-slate-500">
                    ชื่อร้าน: {deleteModalSub.shopName}
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  วันหมดอายุเดิม: {formatThaiDate(deleteModalSub.expiryDate)}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>⚠️ ผลกระทบหลังการลบ:</span>
                </p>
                <p>
                  ผู้ใช้อีเมลนี้จะถูกตัดสิทธิ์ทันที และจะไม่สามารถเข้าใช้งานระบบได้ จนกว่าแอดมินจะเพิ่มสิทธิ์ใหม่อีกครั้ง
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalSub(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก (ไม่ลบ)
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังลบ...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ยืนยันลบอีเมล</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
