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
  Trash2,
  HardDrive,
  Database,
  PieChart,
  BarChart3,
  Server,
  Layers,
  Info
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import { CustomerSubscription } from '../types';

export interface StorageUsageInfo {
  usedBytes: number;
  mainDocBytes: number;
  salesDocBytes: number;
  salesCount: number;
  barbersCount: number;
  membersCount: number;
  productsCount: number;
  expensesCount: number;
  maxQuotaMB: number;
  lastCalculatedAt: string;
}

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

  // Cloud Storage Tracking State
  const [usageMap, setUsageMap] = useState<Record<string, StorageUsageInfo>>({});
  const [calculatingEmails, setCalculatingEmails] = useState<Record<string, boolean>>({});
  const [isCalculatingAll, setIsCalculatingAll] = useState(false);
  const [selectedStorageDetail, setSelectedStorageDetail] = useState<{
    email: string;
    shopName: string;
    usage: StorageUsageInfo;
  } | null>(null);

  // Storage calculation helpers
  const formatBytes = (bytes: number, decimals = 1): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const calculateStorageForStore = async (email: string) => {
    const targetEmail = email.toLowerCase();
    setCalculatingEmails(prev => ({ ...prev, [targetEmail]: true }));
    try {
      const salonDocRef = doc(db, "salons", targetEmail);
      const mainSnap = await getDoc(salonDocRef);

      let mainDocBytes = 0;
      let barbersCount = 0;
      let membersCount = 0;
      let productsCount = 0;
      let expensesCount = 0;

      if (mainSnap.exists()) {
        const data = mainSnap.data();
        mainDocBytes = new Blob([JSON.stringify(data)]).size;
        barbersCount = Array.isArray(data.barbers) ? data.barbers.length : 0;
        membersCount = Array.isArray(data.members) ? data.members.length : 0;
        productsCount = Array.isArray(data.products) ? data.products.length : 0;
        expensesCount = Array.isArray(data.expenses) ? data.expenses.length : 0;
      }

      // Subcollection sales
      const salesColRef = collection(db, "salons", targetEmail, "sales");
      const salesSnap = await getDocs(salesColRef);
      let salesDocBytes = 0;
      const salesCount = salesSnap.size;

      salesSnap.forEach((docSnap) => {
        const saleData = docSnap.data();
        salesDocBytes += new Blob([JSON.stringify(saleData)]).size;
      });

      const totalUsedBytes = mainDocBytes + salesDocBytes;

      const info: StorageUsageInfo = {
        usedBytes: totalUsedBytes,
        mainDocBytes,
        salesDocBytes,
        salesCount,
        barbersCount,
        membersCount,
        productsCount,
        expensesCount,
        maxQuotaMB: 100, // 100 MB limit per store
        lastCalculatedAt: new Date().toISOString()
      };

      setUsageMap(prev => ({ ...prev, [targetEmail]: info }));
      return info;
    } catch (err) {
      console.warn("Error calculating storage usage for store", targetEmail, err);
      return null;
    } finally {
      setCalculatingEmails(prev => ({ ...prev, [targetEmail]: false }));
    }
  };

  const calculateAllStoresStorage = async () => {
    setIsCalculatingAll(true);
    for (const sub of subscriptions) {
      await calculateStorageForStore(sub.email);
    }
    setIsCalculatingAll(false);
  };

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
            // Added to display list; setDoc will be called when admin modifies subscription status
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
      handleFirestoreError(err, OperationType.LIST, "subscriptions");
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
    const targetEmail = sub.email.toLowerCase();
    try {
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
      handleFirestoreError(err, OperationType.WRITE, `subscriptions/${targetEmail}`);
    }
  };

  // Quick extend subscription +30 days
  const handleQuickExtend = async (sub: CustomerSubscription, days = 30) => {
    const targetEmail = sub.email.toLowerCase();
    try {
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
      handleFirestoreError(err, OperationType.WRITE, `subscriptions/${targetEmail}`);
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
      handleFirestoreError(err, OperationType.WRITE, `subscriptions/${targetEmail}`);
    }
  };

  // Delete store and clear Firestore data safely without hanging
  const handleDeleteStore = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    const rawEmail = subToDelete.email;
    const targetEmail = rawEmail.toLowerCase();

    // 1. Optimistically update local UI state immediately so UI never hangs or spins
    setSubscriptions(prev => prev.filter(s => s.email.toLowerCase() !== targetEmail));
    
    try {
      // 2. Safely delete all subcollections under salons/{targetEmail}
      const subcollections = ['sales', 'members', 'barbers', 'products', 'chemicalPromos', 'packages', 'vouchers', 'expenses'];
      for (const subColName of subcollections) {
        try {
          const colRef = collection(db, "salons", targetEmail, subColName);
          const snap = await getDocs(colRef);
          if (!snap.empty) {
            // Delete in batches of max 400 docs
            const docs = snap.docs;
            for (let i = 0; i < docs.length; i += 400) {
              const chunk = docs.slice(i, i + 400);
              const batch = writeBatch(db);
              chunk.forEach((docSnap) => batch.delete(docSnap.ref));
              await batch.commit();
            }
          }
        } catch (subErr) {
          console.warn(`Could not clear subcollection ${subColName} for ${targetEmail}:`, subErr);
        }
      }

      // 3. Delete main salon documents (both lowercase and raw email if different)
      try { await deleteDoc(doc(db, "salons", targetEmail)); } catch (e) {}
      if (rawEmail !== targetEmail) {
        try { await deleteDoc(doc(db, "salons", rawEmail)); } catch (e) {}
      }

      // 4. Delete subscription documents
      try { await deleteDoc(doc(db, "subscriptions", targetEmail)); } catch (e) {}
      if (rawEmail !== targetEmail) {
        try { await deleteDoc(doc(db, "subscriptions", rawEmail)); } catch (e) {}
      }

      // 5. Clear local cache for both lowercase and raw email
      [targetEmail, rawEmail].forEach(emailKey => {
        const suffix = `_${emailKey}`;
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
      });
    } catch (err) {
      console.error('Error during store deletion:', err);
    } finally {
      setIsDeleting(false);
      setSubToDelete(null);
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
      handleFirestoreError(err, OperationType.WRITE, `subscriptions/${cleanEmail}`);
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={calculateAllStoresStorage}
              disabled={isCalculatingAll}
              className="px-3.5 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-indigo-400/30 cursor-pointer shadow-sm disabled:opacity-50"
              title="คำนวณการใช้พื้นที่ Cloud Firestore ของทุกบัญชีร้านค้า"
            >
              <HardDrive className={`w-4 h-4 text-amber-300 ${isCalculatingAll ? 'animate-bounce' : ''}`} />
              <span>{isCalculatingAll ? 'กำลังคำนวณพื้นที่...' : 'คำนวณพื้นที่ Cloud'}</span>
            </button>
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
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

        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">พื้นที่ Cloud รวม</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 space-y-0.5">
            <div className="text-xl font-black text-amber-300 font-mono">
              {formatBytes(Object.values(usageMap).reduce((sum, u) => sum + u.usedBytes, 0))}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              โควตาฟรีรวม 1,000 MB (1 GB)
            </p>
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
                  <th className="py-3.5 px-4">พื้นที่ Cloud & โควตา</th>
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

                      {/* Cloud Storage Usage Cell */}
                      <td className="py-4 px-4">
                        {(() => {
                          const targetEmail = sub.email.toLowerCase();
                          const usage = usageMap[targetEmail];
                          const isCalculating = calculatingEmails[targetEmail];

                          if (isCalculating) {
                            return (
                              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                <span>กำลังคำนวณ...</span>
                              </div>
                            );
                          }

                          if (!usage) {
                            return (
                              <button
                                onClick={() => calculateStorageForStore(sub.email)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 border border-slate-200"
                                title="คลิกเพื่อคำนวณการใช้พื้นที่ Cloud Firestore"
                              >
                                <HardDrive className="w-3 h-3 text-slate-500" />
                                <span>คำนวณพื้นที่</span>
                              </button>
                            );
                          }

                          // Calculated Usage Info
                          const maxBytes = (usage.maxQuotaMB || 100) * 1024 * 1024;
                          const percent = Math.min(100, Math.max(0.01, (usage.usedBytes / maxBytes) * 100));
                          let barColor = "bg-emerald-500";
                          if (percent > 80) barColor = "bg-rose-500";
                          else if (percent > 50) barColor = "bg-amber-500";

                          return (
                            <div className="space-y-1.5 max-w-[180px]">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="font-bold text-slate-800">{formatBytes(usage.usedBytes)}</span>
                                <span className="text-[10px] text-slate-400">/ {usage.maxQuotaMB} MB</span>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                                <div 
                                  className={`h-full ${barColor} transition-all duration-500 rounded-full`} 
                                  style={{ width: `${Math.max(2, percent)}%` }}
                                ></div>
                              </div>

                              {/* Breakdown snippet and Inspector Trigger */}
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans pt-0.5">
                                <span className="font-mono text-slate-600">({percent.toFixed(2)}%)</span>
                                <button
                                  onClick={() => setSelectedStorageDetail({ email: sub.email, shopName: sub.shopName || 'ร้านบาร์เบอร์ POS', usage })}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center space-x-0.5"
                                  title="คลิกเพื่อดูสถิติและโควตาพื้นที่เชิงลึก"
                                >
                                  <span>รายละเอียด</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}
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

      {/* Modal: Cloud Storage Usage Inspector */}
      {selectedStorageDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-slate-100 animate-slide-up font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">การใช้พื้นที่ Cloud & โควตาจัดเก็บ</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedStorageDetail.shopName} ({selectedStorageDetail.email})</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStorageDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const u = selectedStorageDetail.usage;
              const maxBytes = (u.maxQuotaMB || 100) * 1024 * 1024;
              const percent = Math.min(100, Math.max(0.01, (u.usedBytes / maxBytes) * 100));
              let statusBadge = { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "🟢 ปลอดภัยสูง" };
              if (percent > 80) statusBadge = { bg: "bg-rose-100 text-rose-800 border-rose-200", label: "🔴 ใกล้เต็มโควตา" };
              else if (percent > 50) statusBadge = { bg: "bg-amber-100 text-amber-800 border-amber-200", label: "🟡 ใช้งานปานกลาง" };

              return (
                <div className="space-y-5">
                  {/* Gauge Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">พื้นที่จัดเก็บสะสมบน Cloud</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-black text-amber-300 font-mono">
                        {formatBytes(u.usedBytes)} <span className="text-xs text-slate-400 font-sans font-normal">/ {u.maxQuotaMB} MB</span>
                      </div>
                      <span className="text-sm font-black text-indigo-300 font-mono">
                        {percent.toFixed(2)}%
                      </span>
                    </div>

                    {/* Big Bar */}
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, percent)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>คงเหลือใช้งานได้อีก: <strong className="text-white font-mono">{formatBytes(maxBytes - u.usedBytes)}</strong></span>
                      <span>อัปเดตล่าสุด: {new Date(u.lastCalculatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                    </div>
                  </div>

                  {/* Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>🧾 บิลยอดขาย</span>
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        {u.salesCount.toLocaleString()} บิล
                      </div>
                      <p className="text-[10px] text-slate-500">ขนาด {formatBytes(u.salesDocBytes)}</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>⚙️ ข้อมูลหลักร้านค้า</span>
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        {formatBytes(u.mainDocBytes)}
                      </div>
                      <p className="text-[10px] text-slate-500">ช่าง {u.barbersCount} คน | สินค้า {u.productsCount} รายการ</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>👥 ฐานข้อมูลสมาชิก</span>
                        <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        {u.membersCount.toLocaleString()} คน
                      </div>
                      <p className="text-[10px] text-slate-500">พร้อมระบบบันทึกแต้มสะสม</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>💸 รายจ่าย & สลิป</span>
                        <PieChart className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        {u.expensesCount.toLocaleString()} รายการ
                      </div>
                      <p className="text-[10px] text-slate-500">บันทึกเบิกเงินและรายจ่ายประจำ</p>
                    </div>
                  </div>

                  {/* Quota Policy Note */}
                  <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 flex items-start space-x-2 text-xs text-indigo-900">
                    <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-[11px] leading-relaxed">
                      <span className="font-bold">โควตาความจุ Firestore ต่อร้านค้า:</span>
                      <p className="text-indigo-700">จัดสรรพื้นที่ตั้งต้นให้อย่างจุใจที่ <strong>100 MB ต่อร้าน</strong> (รองรับข้อมูลการขายได้มากกว่า 100,000 บิล สามารถใช้งานได้ต่อเนื่องหลายปีโดยไม่ต้องกังวลเรื่องพื้นที่เต็ม)</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => calculateStorageForStore(selectedStorageDetail.email)}
                disabled={calculatingEmails[selectedStorageDetail.email.toLowerCase()]}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${calculatingEmails[selectedStorageDetail.email.toLowerCase()] ? 'animate-spin' : ''}`} />
                <span>คำนวณใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStorageDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
