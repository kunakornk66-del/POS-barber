import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  Calendar, 
  Store, 
  Mail, 
  UserPlus, 
  AlertTriangle,
  ChevronRight,
  Power,
  Lock,
  Unlock,
  Plus,
  Trash2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import { CustomerSubscription } from '../types';

interface SuperAdminTabProps {
  currentAdminEmail: string;
}

export default function SuperAdminTab({ currentAdminEmail }: SuperAdminTabProps) {
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'suspended' | 'grace'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal for editing dates or adding custom subscription
  const [selectedSub, setSelectedSub] = useState<CustomerSubscription | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New store registration modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newDays, setNewDays] = useState(30);

  // Delete store modal state
  const [subToDelete, setSubToDelete] = useState<CustomerSubscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load subscriptions in real-time
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to subscriptions collection
    const subColRef = collection(db, "subscriptions");
    const unsubscribe = onSnapshot(subColRef, async (snapshot) => {
      const list: CustomerSubscription[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CustomerSubscription;
        list.push({
          ...data,
          email: docSnap.id
        });
      });

      // Also check salons collection to ensure any store that signed up before is included
      try {
        const salonsColRef = collection(db, "salons");
        const salonsSnap = await getDocs(salonsColRef);
        salonsSnap.forEach((salonDoc) => {
          const email = salonDoc.id.toLowerCase();
          // Skip if it's not a valid email or already in list
          if (email && email.includes('@') && !list.some(s => s.email.toLowerCase() === email)) {
            const salonData = salonDoc.data();
            const today = new Date().toISOString().split('T')[0];
            const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const newSub: CustomerSubscription = {
              email,
              shopName: salonData.shopName || salonData.shopConfig?.shopName || 'ร้านบาร์เบอร์ POS',
              status: email === 'guest@gmail.com' ? 'approved' : 'pending',
              startDate: today,
              expiryDate: nextMonth,
              lastActiveAt: salonData.updatedAt || new Date().toISOString(),
              createdAt: salonData.updatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            list.push(newSub);
            // Save to subscriptions collection so it becomes permanently tracked in firestore
            setDoc(doc(db, "subscriptions", email), newSub, { merge: true }).catch(e => console.warn(e));
          }
        });
      } catch (err) {
        console.warn("Could not sync salons collection:", err);
      }

      // Sort: Pending first, then by email
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return a.email.localeCompare(b.email);
      });

      setSubscriptions(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore snapshot error in SuperAdminTab:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const subColRef = collection(db, "subscriptions");
      const snap = await getDocs(subColRef);
      const list: CustomerSubscription[] = [];
      snap.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as CustomerSubscription), email: docSnap.id });
      });

      try {
        const salonsColRef = collection(db, "salons");
        const salonsSnap = await getDocs(salonsColRef);
        salonsSnap.forEach((salonDoc) => {
          const email = salonDoc.id.toLowerCase();
          if (email && email.includes('@') && !list.some(s => s.email.toLowerCase() === email)) {
            const salonData = salonDoc.data();
            const today = new Date().toISOString().split('T')[0];
            const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const newSub: CustomerSubscription = {
              email,
              shopName: salonData.shopName || salonData.shopConfig?.shopName || 'ร้านบาร์เบอร์ POS',
              status: email === 'guest@gmail.com' ? 'approved' : 'pending',
              startDate: today,
              expiryDate: nextMonth,
              lastActiveAt: salonData.updatedAt || new Date().toISOString(),
              createdAt: salonData.updatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            list.push(newSub);
            setDoc(doc(db, "subscriptions", email), newSub, { merge: true }).catch(e => console.warn(e));
          }
        });
      } catch (err) {}

      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return a.email.localeCompare(b.email);
      });

      setSubscriptions(list);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Helper to check if online (active within last 10 minutes)
  const isOnline = (sub: CustomerSubscription) => {
    if (sub.isOnline) return true;
    if (!sub.lastActiveAt) return false;
    const lastActive = new Date(sub.lastActiveAt).getTime();
    const now = Date.now();
    return (now - lastActive) < 10 * 60 * 1000; // 10 mins
  };

  // Helper to calculate subscription status details
  const getSubscriptionState = (sub: CustomerSubscription) => {
    const today = new Date().toISOString().split('T')[0];
    const expiry = sub.expiryDate || today;

    // Days diff
    const todayMs = new Date(today).getTime();
    const expiryMs = new Date(expiry).getTime();
    const diffDays = Math.floor((expiryMs - todayMs) / (1000 * 60 * 60 * 24));

    if (sub.status === 'suspended') {
      return { code: 'suspended', label: 'ถูกระงับสิทธิ์', color: 'bg-red-50 text-red-700 border-red-200', diffDays };
    }
    if (sub.status === 'pending') {
      return { code: 'pending', label: 'รอการอนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', diffDays };
    }

    if (diffDays >= 0) {
      return { code: 'active', label: `เหลือ ${diffDays} วัน`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', diffDays };
    } else if (diffDays >= -7) {
      // Within 7 days grace period
      const graceLeft = 7 + diffDays;
      return { code: 'grace', label: `ผ่อนผัน (เหลือ ${graceLeft} วัน)`, color: 'bg-orange-50 text-orange-700 border-orange-200', diffDays };
    } else {
      // Over 7 days expired
      return { code: 'expired', label: 'หมดอายุแล้ว', color: 'bg-rose-50 text-rose-700 border-rose-200', diffDays };
    }
  };

  // Toggle approval / suspension status
  const handleToggleStatus = async (sub: CustomerSubscription, targetStatus: 'approved' | 'suspended' | 'pending') => {
    try {
      const targetEmail = sub.email.toLowerCase();
      const docRef = doc(db, "subscriptions", targetEmail);
      const now = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      let nextExpiry = sub.expiryDate;
      // If setting to approved and expiryDate is in the past, auto set to +30 days from today
      if (targetStatus === 'approved') {
        const expiryMs = new Date(sub.expiryDate || today).getTime();
        const todayMs = new Date(today).getTime();
        if (expiryMs < todayMs) {
          const newExpDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          nextExpiry = newExpDate.toISOString().split('T')[0];
        }
      }

      const payload: Partial<CustomerSubscription> = {
        email: targetEmail,
        shopName: sub.shopName || 'ร้านบาร์เบอร์ POS',
        status: targetStatus,
        startDate: sub.startDate || today,
        expiryDate: nextExpiry,
        updatedAt: now
      };

      // Optimistic update
      setSubscriptions(prev => prev.map(s => s.email.toLowerCase() === targetEmail ? { ...s, ...payload } : s));

      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.error("Failed to update customer status:", err);
      alert("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์");
    }
  };

  // Quick extend subscription +30 days
  const handleQuickExtend = async (sub: CustomerSubscription, days = 30) => {
    try {
      const targetEmail = sub.email.toLowerCase();
      const today = new Date().toISOString().split('T')[0];
      const currentExpiry = (sub.expiryDate && sub.expiryDate > today) ? sub.expiryDate : today;
      const expDateObj = new Date(currentExpiry);
      expDateObj.setDate(expDateObj.getDate() + days);
      const newExpiryStr = expDateObj.toISOString().split('T')[0];
      const now = new Date().toISOString();

      const payload: Partial<CustomerSubscription> = {
        email: targetEmail,
        status: 'approved',
        expiryDate: newExpiryStr,
        updatedAt: now
      };

      // Optimistic update
      setSubscriptions(prev => prev.map(s => s.email.toLowerCase() === targetEmail ? { ...s, ...payload } : s));

      const docRef = doc(db, "subscriptions", targetEmail);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.error("Failed to extend subscription:", err);
      alert("เกิดข้อผิดพลาดในการขยายเวลา");
    }
  };

  // Save edited dates modal
  const handleSaveEditDates = async () => {
    if (!selectedSub) return;
    setIsSaving(true);
    
    const targetEmail = selectedSub.email.toLowerCase();
    const updatedRecord: CustomerSubscription = {
      ...selectedSub,
      startDate: editStartDate || selectedSub.startDate || new Date().toISOString().split('T')[0],
      expiryDate: editExpiryDate || selectedSub.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: editNotes || '',
      updatedAt: new Date().toISOString()
    };

    // 1. Optimistic update local state immediately
    setSubscriptions(prev => prev.map(s => s.email.toLowerCase() === targetEmail ? updatedRecord : s));

    // 2. Close modal immediately so UI doesn't hang
    setSelectedSub(null);
    setIsSaving(false);

    // 3. Sync to Firestore in background
    try {
      const docRef = doc(db, "subscriptions", targetEmail);
      await setDoc(docRef, {
        email: targetEmail,
        startDate: updatedRecord.startDate,
        expiryDate: updatedRecord.expiryDate,
        notes: updatedRecord.notes,
        updatedAt: updatedRecord.updatedAt
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save subscription dates to Firestore:", err);
    }
  };

  // Delete store and clear Firestore data
  const handleDeleteStore = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    const targetEmail = subToDelete.email.toLowerCase();

    try {
      // 1. Delete sales subcollection under salons/{targetEmail}/sales
      const salesColRef = collection(db, "salons", targetEmail, "sales");
      const salesSnap = await getDocs(salesColRef);
      const batch = writeBatch(db);
      salesSnap.forEach((saleDoc) => {
        batch.delete(saleDoc.ref);
      });
      await batch.commit();

      // 2. Delete main salon document
      await deleteDoc(doc(db, "salons", targetEmail));

      // 3. Delete subscription document
      await deleteDoc(doc(db, "subscriptions", targetEmail));

      // 4. Clear local cache if any
      const suffix = `_${targetEmail}`;
      localStorage.removeItem(`barber_pos_barbers${suffix}`);
      localStorage.removeItem(`barber_pos_products${suffix}`);
      localStorage.removeItem(`barber_pos_chemical_promos${suffix}`);
      localStorage.removeItem(`barber_pos_share_config${suffix}`);
      localStorage.removeItem(`barber_pos_shop_config${suffix}`);
      localStorage.removeItem(`barber_pos_vouchers${suffix}`);
      localStorage.removeItem(`barber_pos_sales${suffix}`);
      localStorage.removeItem(`barber_pos_payslips${suffix}`);
      localStorage.removeItem(`barber_pos_expenses${suffix}`);
      localStorage.removeItem(`barber_pos_cash_counter${suffix}`);

      // 5. Update state
      setSubscriptions(prev => prev.filter(s => s.email.toLowerCase() !== targetEmail));
      setSubToDelete(null);
    } catch (err) {
      console.error("Failed to delete store from Firestore:", err);
      alert("เกิดข้อผิดพลาดในการลบข้อมูลร้านค้าออกจากระบบ Cloud");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add new customer store
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const expDate = new Date(Date.now() + newDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const docRef = doc(db, "subscriptions", cleanEmail);
      await setDoc(docRef, {
        email: cleanEmail,
        shopName: newShopName.trim() || 'ร้านบาร์เบอร์ POS',
        status: 'approved',
        startDate: today,
        expiryDate: expDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setShowAddModal(false);
      setNewEmail('');
      setNewShopName('');
      setNewDays(30);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเพิ่มบัญชีลูกค้าได้");
    }
  };

  // Filter list
  const filteredList = subscriptions.filter(sub => {
    const searchMatch = 
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.shopName && sub.shopName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!searchMatch) return false;

    const state = getSubscriptionState(sub);

    if (statusFilter === 'pending') return sub.status === 'pending';
    if (statusFilter === 'approved') return sub.status === 'approved' && state.code === 'active';
    if (statusFilter === 'suspended') return sub.status === 'suspended' || state.code === 'expired';
    if (statusFilter === 'grace') return state.code === 'grace';

    return true;
  });

  // Calculate statistics
  const totalCount = subscriptions.length;
  const pendingCount = subscriptions.filter(s => s.status === 'pending').length;
  const approvedCount = subscriptions.filter(s => s.status === 'approved' && getSubscriptionState(s).code === 'active').length;
  const graceCount = subscriptions.filter(s => getSubscriptionState(s).code === 'grace').length;
  const suspendedCount = subscriptions.filter(s => s.status === 'suspended' || getSubscriptionState(s).code === 'expired').length;
  const onlineCount = subscriptions.filter(s => isOnline(s)).length;

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      
      {/* Super Admin Top Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Super Admin Management Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ระบบอนุมัติ & จัดการสิทธิ์รายเดือน
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
              ควบคุมการเข้าใช้งานของลูกค้าทุกร้านค้า กําหนดวันเริ่มและสิ้นสุดแพ็กเกจ
              พร้อมระบบตัดสิทธิ์และผ่อนผัน 7 วันโดยอัตโนมัติ
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className={`px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border border-slate-700 cursor-pointer ${isRefreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>อัปเดตข้อมูล</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มร้านค้าใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ร้านค้าทั้งหมด</span>
            <Store className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {onlineCount} ออนไลน์
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">รอการอนุมัติ</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">อนุมัติแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-600">ผ่อนผัน 7 วัน</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-orange-600">{graceCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">ถูกระงับ / หมดอายุ</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-600">{suspendedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามอีเมล หรือ ชื่อร้านค้า..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            ทั้งหมด ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending' 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            รออนุมัติ ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'approved' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            อนุมัติแล้ว ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('grace')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'grace' 
                ? 'bg-orange-500 text-white shadow-xs' 
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            ผ่อนผัน ({graceCount})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'suspended' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            ระงับสิทธิ์ ({suspendedCount})
          </button>
        </div>
      </div>

      {/* Main Customers List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">กำลังดึงข้อมูลร้านค้าสิทธิ์ผู้ใช้งาน...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">ไม่พบข้อมูลร้านค้าตามเงื่อนไข</p>
            <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">สถานะ / บัญชีร้านค้า</th>
                  <th className="py-3.5 px-4">วันเริ่ม - วันหมดอายุ</th>
                  <th className="py-3.5 px-4">สิทธิ์การใช้งาน</th>
                  <th className="py-3.5 px-4 text-right">การจัดการสิทธิ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredList.map((sub) => {
                  const online = isOnline(sub);
                  const subState = getSubscriptionState(sub);
                  const isExpiringSoon = (subState.diffDays <= 7) || subState.code === 'grace' || subState.code === 'expired';

                  return (
                    <tr key={sub.email} className={`transition-colors ${isExpiringSoon ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'}`}>
                      {/* Customer Email & Presence */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-start space-x-3">
                          {/* Online Indicator Badge */}
                          <div className="relative mt-1">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                              online ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-red-500'
                            }`}></div>
                            {online && (
                              <span className="absolute -inset-0.5 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{sub.shopName || 'ร้านบาร์เบอร์ POS'}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                online ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {online ? '🟢 ออนไลน์' : '🔴 ออฟไลน์'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 font-mono text-[11px] flex-wrap gap-y-1">
                              <Mail className={`w-3 h-3 ${isExpiringSoon ? 'text-rose-600' : 'text-slate-400'}`} />
                              <span className={isExpiringSoon ? 'text-rose-600 font-black' : 'text-slate-500'}>
                                {sub.email}
                              </span>
                              {isExpiringSoon && (
                                <span className="bg-rose-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-xs animate-pulse inline-flex items-center gap-1">
                                  <span>⚠️</span>
                                  <span>{subState.diffDays < 0 ? 'หมดอายุแล้ว' : `ใกล้หมดอายุ (เหลือ ${subState.diffDays} วัน)`}</span>
                                </span>
                              )}
                            </div>
                            {sub.notes && (
                              <p className="text-[10px] text-slate-400 italic">หมายเหตุ: {sub.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Package Dates */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.startDate || '-'} ถึง {sub.expiryDate || '-'}</span>
                          </div>
                          <div className="inline-block">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${subState.color}`}>
                              {subState.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {sub.status === 'pending' ? (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>รอการอนุมัติ (Pending)</span>
                            </div>
                          ) : sub.status === 'suspended' ? (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
                              <Lock className="w-3.5 h-3.5" />
                              <span>ถูกระงับสิทธิ์ (Suspended)</span>
                            </div>
                          ) : subState.code === 'expired' ? (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>หมดอายุแพ็กเกจ</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
                              <Unlock className="w-3.5 h-3.5" />
                              <span>อนุมัติใช้งาน (Approved)</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons & Toggle Switch */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          
                          {/* Status Toggle Switch */}
                          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              onClick={() => handleToggleStatus(sub, 'approved')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                sub.status === 'approved' 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="อนุมัติการใช้งาน (Approved)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(sub, 'suspended')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                sub.status === 'suspended' 
                                  ? 'bg-rose-600 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="ระงับการใช้งาน (Suspended)"
                            >
                              <Lock className="w-3 h-3" />
                              <span>ระงับ</span>
                            </button>
                          </div>

                          {/* Quick Extend +30 Days */}
                          <button
                            onClick={() => handleQuickExtend(sub, 30)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all text-[11px] font-bold cursor-pointer"
                            title="เพิ่มวันใช้งานอีก 30 วัน"
                          >
                            +30 วัน
                          </button>

                          {/* Edit Dates Modal Trigger */}
                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setEditStartDate(sub.startDate || new Date().toISOString().split('T')[0]);
                              setEditExpiryDate(sub.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                              setEditNotes(sub.notes || '');
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all text-xs font-bold cursor-pointer"
                            title="แก้ไขวันเริ่มต้นและสิ้นสุด"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>

                          {/* Delete Store Data Button */}
                          <button
                            onClick={() => setSubToDelete(sub)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all text-xs font-bold cursor-pointer border border-rose-200/80 active:scale-95"
                            title="ลบข้อมูลร้านค้านี้ออกจาก Cloud / Firestore ถาวร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Edit Subscription Dates */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-slate-100 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">ปรับแต่งวันใช้งานของร้านค้า</h3>
              </div>
              <button 
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <p className="text-xs font-bold text-slate-800">{selectedSub.shopName || 'ร้านบาร์เบอร์ POS'}</p>
                <p className="text-[11px] font-mono text-slate-500">{selectedSub.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">วันเริ่มใช้งาน</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">วันสิ้นสุดใช้งาน</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">บันทึกเพิ่มเติม (Notes)</label>
                <input
                  type="text"
                  placeholder="เช่น ชำระค่าบริการรายปีแล้ว / ทดลองใช้งาน 14 วัน"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>เกณฑ์ผ่อนผัน 7 วัน:</span>
                </p>
                <p className="text-slate-600">
                  เมื่อเกินวันสิ้นสุดใช้งาน ระบบยังไม่ตัดสิทธิ์ทันที แต่จะเข้าสู่ช่วงผ่อนผัน 7 วัน เพื่อเปิดโอกาสให้ร้านค้าชำระเงินต่ออายุ
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEditDates}
                disabled={isSaving}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Store */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateCustomer} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-slate-100 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">เพิ่มบัญชีร้านค้าล่วงหน้า</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">อีเมลร้านค้า (Google Account / Email)</label>
                <input
                  type="email"
                  required
                  placeholder="เช่น barbershop@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ชื่อร้านค้า</label>
                <input
                  type="text"
                  placeholder="เช่น บาร์เบอร์คลับ สาขา 1"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ระยะเวลาให้ใช้งานเริ่มต้น (วัน)</label>
                <select
                  value={newDays}
                  onChange={(e) => setNewDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value={30}>30 วัน (1 เดือน)</option>
                  <option value={90}>90 วัน (3 เดือน)</option>
                  <option value={180}>180 วัน (6 เดือน)</option>
                  <option value={365}>365 วัน (1 ปี)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                สร้างบัญชีอนุมัติสิทธิ์
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Confirm Delete Store & Cloud Data */}
      {subToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-slate-100 animate-slide-up">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">ยืนยันลบข้อมูลร้านค้าออกจาก Cloud?</h3>
                <p className="text-[11px] text-slate-500 font-normal">คืนพื้นที่ Cloud / Firestore และลบข้อมูลถาวร</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200/80 space-y-1">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <Store className="w-4 h-4 text-rose-600" />
                  <span>{subToDelete.shopName || 'ร้านบาร์เบอร์ POS'}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{subToDelete.email}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-slate-600 leading-relaxed space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>ข้อมูลที่จะถูกลบออกจาก Firestore ถาวร:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                  <li>ข้อมูลร้านค้าและการตั้งค่าส่วนแบ่งช่าง (Shop Config)</li>
                  <li>รายชื่อช่างตัดผม สินค้า บริการ และโปรโมชั่น</li>
                  <li>ประวัติรายการขาย สลิปเงินเดือน และรายรับ-รายจ่ายทั้งหมด</li>
                  <li>ข้อมูลสิทธิ์และสถานะบัญชีรายเดือน (Subscription Record)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100 font-sans">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteStore}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังลบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบข้อมูลถาวร</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
