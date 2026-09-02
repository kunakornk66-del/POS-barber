import React, { useState, useEffect, useMemo } from 'react';
import { Barber, Product, ShareConfig, SaleRecord, ShopConfig, Voucher, Payslip, Expense, ChemicalPromo, CashCounterState, Member, MemberPackage, Booking } from './types';
import { getThemePreset, generateShade, hexToHsl } from './themes';
import { 
  INITIAL_BARBERS, 
  INITIAL_PRODUCTS, 
  INITIAL_CHEMICAL_PROMOS,
  DEFAULT_SHARE_CONFIG, 
  DEFAULT_SHOP_CONFIG, 
  getSeededSales,
  INITIAL_MEMBERS,
  INITIAL_MEMBER_PACKAGES,
  INITIAL_BOOKINGS
} from './data';
import SalesTab from './components/SalesTab';
import DashboardTab from './components/DashboardTab';
import ConfigTab from './components/ConfigTab';
import CashCounterTab from './components/CashCounterTab';
import PayslipsTab from './components/PayslipsTab';
import BookingTab from './components/BookingTab';
import AnnualResetModal from './components/AnnualResetModal';
import DeleteMonthModal from './components/DeleteMonthModal';
import { ExpensesTab } from './components/ExpensesTab';
import { PinModal } from './components/PinModal';
import { 
  SystemBackupData, 
  exportFullSystemBackupJson, 
  downloadExcelReport, 
  formatThaiDate 
} from './utils';
import { 
  Scissors, 
  LayoutDashboard, 
  Settings, 
  Sparkles, 
  DollarSign, 
  UserCheck,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Briefcase,
  Share,
  MoreVertical,
  Plus,
  Store,
  KeyRound,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  Crown,
  Lock,
  Unlock,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowDownCircle,
  Download,
  FileText,
  Package,
  CalendarDays
} from 'lucide-react';
import { 
  db, 
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';

// Simple client-side JWT decoder for Google ID token
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return null;
  }
}

// Recursive helper to clean undefined properties from objects/arrays for Firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (obj instanceof Date) {
    return obj as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    // Check if URL search params forces a logout (e.g., ?action=logout or ?logout=true)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'logout' || urlParams.get('logout') === 'true') {
        localStorage.removeItem('barber_pos_user_email');
        // Clean URL parameter from the address bar
        window.history.replaceState(null, '', window.location.pathname);
        return null;
      }
    } catch (e) {
      console.error('Error parsing URL action query params:', e);
    }
    const rawEmail = localStorage.getItem('barber_pos_user_email');
    return rawEmail ? rawEmail.trim().toLowerCase() : null;
  });
  const [emailInput, setEmailInput] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Dynamically load & configure Google Identity Services if client ID is specified
  useEffect(() => {
    if (userEmail) return;
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.trim() === '') return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const googleObj = (window as any).google;
      if (googleObj?.accounts?.id) {
        googleObj.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            const decoded = decodeJwt(response.credential);
            if (decoded && decoded.email) {
              const cleanEmail = decoded.email.trim().toLowerCase();
              localStorage.setItem('barber_pos_user_email', cleanEmail);
              setUserEmail(cleanEmail);
            }
          },
        });
        const container = document.getElementById('google-signin-btn-container');
        if (container) {
          googleObj.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: '100%',
          });
        }
      }
    };

    return () => {
      try {
        document.body.removeChild(script);
      } catch (err) {}
    };
  }, [userEmail]);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [chemicalPromos, setChemicalPromos] = useState<ChemicalPromo[]>([]);
  const [shareConfig, setShareConfig] = useState<ShareConfig>(DEFAULT_SHARE_CONFIG);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salePrefill, setSalePrefill] = useState<{ barberId?: string; customerName?: string; haircutPrice?: number; chemicalPrice?: number; notes?: string } | null>(null);

  // Dynamically correct and sanitize any rounding issues or old-calculation discrepancies in sales records on-the-fly
  const correctedSales = useMemo(() => {
    return sales.map(s => {
      const haircutPrice = s.haircutPrice || 0;
      const chemicalPrice = s.chemicalPrice || 0;
      const productPrice = s.productPrice || 0;
      const tip = s.tip || 0;
      const subtotal = haircutPrice + chemicalPrice + productPrice;

      // Recalculate chemical discount amount
      let chemicalDiscountAmount = s.chemicalDiscountAmount ?? 0;
      if (s.chemicalDiscountValue && s.chemicalDiscountValue > 0) {
        if (s.chemicalDiscountType === 'percentage') {
          chemicalDiscountAmount = (chemicalPrice * s.chemicalDiscountValue) / 100;
        } else {
          chemicalDiscountAmount = Math.min(chemicalPrice, s.chemicalDiscountValue);
        }
      }

      const actualChemicalPrice = Math.max(0, chemicalPrice - chemicalDiscountAmount);

      const promoDiscountPct = shareConfig.promoDiscountPct ?? 10;
      const discount10Amount = s.useDiscountPct10 ? (haircutPrice * promoDiscountPct) / 100 : 0;
      const voucherValue = s.useVoucherValue || 0;

      const totalDiscounts = discount10Amount + voucherValue + chemicalDiscountAmount;
      const customerPaid = Math.max(0, subtotal - totalDiscounts) + tip;

      // Shares without rounding off decimals (keep exact calculated decimals)
      // Check if the record already has the calculated shares to prevent overriding historical commission settings
      const barberHaircutShare = s.barberHaircutShare !== undefined ? s.barberHaircutShare : (haircutPrice * shareConfig.haircutBarberPct) / 100;
      const barberChemicalShare = s.barberChemicalShare !== undefined ? s.barberChemicalShare : (actualChemicalPrice * shareConfig.chemicalBarberPct) / 100;
      const barberProductShare = s.barberProductShare !== undefined ? s.barberProductShare : (productPrice * shareConfig.productBarberPct) / 100;
      const barberTotalShare = s.barberTotalShare !== undefined ? s.barberTotalShare : (barberHaircutShare + barberChemicalShare + barberProductShare + tip);
      const shopTotalShare = s.shopTotalShare !== undefined ? s.shopTotalShare : (Math.max(0, subtotal - totalDiscounts) - (barberHaircutShare + barberChemicalShare + barberProductShare));

      return {
        ...s,
        subtotal,
        chemicalDiscountAmount,
        discountAmount: totalDiscounts,
        customerPaid,
        barberHaircutShare,
        barberChemicalShare,
        barberProductShare,
        barberTotalShare,
        shopTotalShare
      };
    });
  }, [sales, shareConfig]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashCounter, setCashCounter] = useState<CashCounterState | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'dashboard' | 'bookings' | 'expenses' | 'config' | 'cash' | 'payslips'>('sales');
  
  // Settings Security & PIN Unlock State
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  const handleSelectTab = (tabId: 'sales' | 'dashboard' | 'bookings' | 'expenses' | 'config' | 'cash' | 'payslips') => {
    if (tabId === 'config') {
      if (!isSettingsUnlocked) {
        setShowPinModal(true);
        return;
      }
    } else {
      // Re-lock settings when leaving config to protect sensitive shop data
      setIsSettingsUnlocked(false);
    }
    setActiveTab(tabId);
  };

  const handlePinSuccess = () => {
    setIsSettingsUnlocked(true);
    setActiveTab('config');
    setShowPinModal(false);
  };

  const handleLockSettingsNow = () => {
    setIsSettingsUnlocked(false);
    setActiveTab('sales');
    setShowPinModal(true);
  };

  // 1-Year Annual Reset Tracker State
  const [firstLoginDate, setFirstLoginDate] = useState<string>('');
  const [showAnnualResetModal, setShowAnnualResetModal] = useState<boolean>(false);
  const [annualDaysElapsed, setAnnualDaysElapsed] = useState<number>(0);
  const [annualDaysRemaining, setAnnualDaysRemaining] = useState<number>(30);
  
  // Delete Month Modal State
  const [deleteMonthModalState, setDeleteMonthModalState] = useState<{ isOpen: boolean; initialMonth?: string }>({
    isOpen: false,
    initialMonth: undefined
  });

  const handleOpenDeleteMonthModal = (month?: string) => {
    setDeleteMonthModalState({
      isOpen: true,
      initialMonth: month
    });
  };
  
  // Offline & Pending Sync State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  // Manual Trigger Sync Pass
  const triggerManualSync = async () => {
    if (!userEmail || isSyncing) return;
    setIsSyncing(true);
    try {
      const suffix = `_${userEmail}`;
      const localSalesStr = localStorage.getItem(`barber_pos_sales${suffix}`) || localStorage.getItem(`barber_pos_sales_${userEmail}`);
      if (localSalesStr) {
        const localSales: SaleRecord[] = JSON.parse(localSalesStr);
        if (Array.isArray(localSales) && localSales.length > 0) {
          const salesColRef = collection(db, "salons", userEmail, "sales");
          const snap = await getDocs(salesColRef);
          const serverDocIds = new Set(snap.docs.map(d => d.id));
          
          const unsyncedSales = localSales.filter(s => s && s.id && !serverDocIds.has(s.id));
          if (unsyncedSales.length > 0) {
            const batch = writeBatch(db);
            unsyncedSales.forEach(sale => {
              const sRef = doc(db, "salons", userEmail, "sales", sale.id);
              batch.set(sRef, cleanUndefined(sale));
            });
            await batch.commit();
            console.log(`🟢 [Manual Sync] ซิงก์ยอดขายออฟไลน์สำเร็จ ${unsyncedSales.length} รายการ`);
          }
        }
      }
      setPendingSyncCount(0);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Network Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerManualSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userEmail]);
  
  // Redirect away from disabled tabs if disabled in settings
  useEffect(() => {
    if (shopConfig?.enableCashCounter === false && activeTab === 'cash') {
      setActiveTab('sales');
    }
    if (shopConfig?.enablePayslips === false && activeTab === 'payslips') {
      setActiveTab('sales');
    }
  }, [shopConfig?.enableCashCounter, shopConfig?.enablePayslips, activeTab]);

  const [isLoading, setIsLoading] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearSalesConfirm, setShowClearSalesConfirm] = useState(false);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [installTab, setInstallTab] = useState<'ios' | 'android'>('ios');

  // Dynamically update document icon and apple-touch-icon with shop logo if configured
  useEffect(() => {
    if (shopConfig?.logoUrl) {
      // 1. Update standard shortcut icon / favicon
      let favIcon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favIcon) {
        favIcon = document.createElement('link');
        favIcon.rel = 'icon';
        document.head.appendChild(favIcon);
      }
      favIcon.href = shopConfig.logoUrl;

      // 2. Update iOS apple-touch-icon for Add to Home Screen logo
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = shopConfig.logoUrl;
      
      // 3. For complete coverage, support apple-touch-icon-precomposed too
      let applePrecomposed = document.querySelector('link[rel="apple-touch-icon-precomposed"]') as HTMLLinkElement;
      if (!applePrecomposed) {
        applePrecomposed = document.createElement('link');
        applePrecomposed.rel = 'apple-touch-icon-precomposed';
        document.head.appendChild(applePrecomposed);
      }
      applePrecomposed.href = shopConfig.logoUrl;
    }
  }, [shopConfig?.logoUrl]);

  // Dynamically generate web manifest so that Android/iOS PWA prompt uses shop logo & shop name
  useEffect(() => {
    const shopName = shopConfig?.shopName || "Barber POS";
    const logoUrl = shopConfig?.logoUrl || "";

    const manifestObj = {
      name: shopName,
      short_name: shopName,
      start_url: window.location.origin + window.location.pathname,
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#4f46e5",
      orientation: "any",
      icons: logoUrl ? [
        {
          src: logoUrl,
          sizes: "192x192",
          type: logoUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg"
        },
        {
          src: logoUrl,
          sizes: "512x512",
          type: logoUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg"
        }
      ] : []
    };

    const stringManifest = JSON.stringify(manifestObj);
    const blob = new Blob([stringManifest], { type: 'application/manifest+json' });
    const manifestUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    const oldUrl = manifestLink.href;
    manifestLink.href = manifestUrl;

    return () => {
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    };
  }, [shopConfig?.shopName, shopConfig?.logoUrl]);

  // Dynamically update document title and iOS app title with shop name if configured
  useEffect(() => {
    const shopName = shopConfig?.shopName || "Barber POS";
    
    // 1. Update the document title
    document.title = `${shopName} - ระบบคิดเงินและจัดการร้านตัดผมมืออาชีพ`;

    // 2. Update iOS web app title meta tag (used for Add to Home Screen name)
    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (!appleTitleMeta) {
      appleTitleMeta = document.createElement('meta');
      appleTitleMeta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appleTitleMeta);
    }
    appleTitleMeta.content = shopName;

    // 3. Update standard application-name meta tag
    let appNameMeta = document.querySelector('meta[name="application-name"]') as HTMLMetaElement;
    if (!appNameMeta) {
      appNameMeta = document.createElement('meta');
      appNameMeta.name = 'application-name';
      document.head.appendChild(appNameMeta);
    }
    appNameMeta.content = shopName;
  }, [shopConfig?.shopName]);

  // Connection & logging status for Firebase
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [firebaseErrorMessage, setFirebaseErrorMessage] = useState('');

  // 1. Connection Status Checking & Real-Time Sync from Cloud Document and Subcollections
  useEffect(() => {
    if (!userEmail) return;

    setIsLoading(true);
    setFirebaseStatus('checking');

    // Test real client connectivity first
    testConnection()
      .then((statusRes) => {
        if (statusRes.success) {
          setFirebaseStatus('connected');
          console.log('⚡ [Firebase Config] เชื่อมต่อสำเร็จ (Connected to Firebase Successfully)');
        } else {
          setFirebaseStatus('error');
          setFirebaseErrorMessage(statusRes.error || 'เครือข่ายออฟไลน์หรือไม่สามารถเชื่อมต่อคลาวด์ได้');
          console.error('⚡ [Firebase Config] ไม่สามารถเชื่อมต่อ Firebase ได้:', statusRes.error);
        }
      })
      .catch((err) => {
        setFirebaseStatus('error');
        setFirebaseErrorMessage(err?.message || 'การตรวจสอบล้มเหลว');
      });

    let unsubSalon: (() => void) | null = null;
    let unsubSales: (() => void) | null = null;
    let hasReconciled = false;

    const getTodayDateString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getTodayDateString();

    const setupRealtimeSync = async () => {
      const isGuest = userEmail === "guest@gmail.com";

      // Reset in-memory state cleanly before loading user data
      setSales([]);
      setPayslips([]);
      setExpenses([]);
      setCashCounter(null);
      if (!isGuest) {
        setBarbers([]);
        setProducts([]);
        setChemicalPromos([]);
        setVouchers([]);
        setBookings([]);
        setShopConfig({ shopName: "ร้านบาร์เบอร์ของฉัน", pinCode: "", isPinLocked: false });
        setShareConfig(DEFAULT_SHARE_CONFIG);
      } else {
        setBarbers(INITIAL_BARBERS);
        setProducts(INITIAL_PRODUCTS);
        setChemicalPromos(INITIAL_CHEMICAL_PROMOS);
        setBookings(INITIAL_BOOKINGS);
        setVouchers([
          { id: "v1", value: 20, isActive: true },
          { id: "v2", value: 50, isActive: true }
        ]);
        setShopConfig(DEFAULT_SHOP_CONFIG);
        setShareConfig(DEFAULT_SHARE_CONFIG);
      }

      // Preload from LocalStorage first for instant visual render
      const suffix = `_${userEmail}`;
      try {
        const localBarbers = localStorage.getItem(`barber_pos_barbers${suffix}`) || localStorage.getItem(`barber_pos_barbers_${userEmail}`);
        const localProducts = localStorage.getItem(`barber_pos_products${suffix}`) || localStorage.getItem(`barber_pos_products_${userEmail}`);
        const localChemicalPromos = localStorage.getItem(`barber_pos_chemical_promos${suffix}`) || localStorage.getItem(`barber_pos_chemical_promos_${userEmail}`);
        const localShareConfig = localStorage.getItem(`barber_pos_share_config${suffix}`) || localStorage.getItem(`barber_pos_share_config_${userEmail}`);
        const localShopConfig = localStorage.getItem(`barber_pos_shop_config${suffix}`) || localStorage.getItem(`barber_pos_shop_config_${userEmail}`);
        const localVouchers = localStorage.getItem(`barber_pos_vouchers${suffix}`) || localStorage.getItem(`barber_pos_vouchers_${userEmail}`);
        const localSales = localStorage.getItem(`barber_pos_sales${suffix}`) || localStorage.getItem(`barber_pos_sales_${userEmail}`);
        const localPayslips = localStorage.getItem(`barber_pos_payslips${suffix}`) || localStorage.getItem(`barber_pos_payslips_${userEmail}`);
        const localExpenses = localStorage.getItem(`barber_pos_expenses${suffix}`) || localStorage.getItem(`barber_pos_expenses_${userEmail}`);
        const localCashCounter = localStorage.getItem(`barber_pos_cash_counter${suffix}`) || localStorage.getItem(`barber_pos_cash_counter_${userEmail}`);
        const localMembers = localStorage.getItem(`barber_pos_members${suffix}`) || localStorage.getItem(`barber_pos_members_${userEmail}`);
        const localMemberPackages = localStorage.getItem(`barber_pos_member_packages${suffix}`) || localStorage.getItem(`barber_pos_member_packages_${userEmail}`);
        const localBookings = localStorage.getItem(`barber_pos_bookings${suffix}`) || localStorage.getItem(`barber_pos_bookings_${userEmail}`);

        if (localBarbers) setBarbers(JSON.parse(localBarbers));
        if (localProducts) setProducts(JSON.parse(localProducts));
        if (localChemicalPromos) setChemicalPromos(JSON.parse(localChemicalPromos));
        if (localShareConfig) setShareConfig(JSON.parse(localShareConfig));
        if (localShopConfig) {
          const parsed = JSON.parse(localShopConfig);
          setShopConfig({
            shopName: "ร้านบาร์เบอร์ของฉัน",
            pinCode: "",
            isPinLocked: false,
            logoUrl: "",
            ...parsed
          });
        }
        if (localVouchers) setVouchers(JSON.parse(localVouchers));
        if (localSales) setSales(JSON.parse(localSales));
        if (localPayslips) setPayslips(JSON.parse(localPayslips));
        if (localExpenses) setExpenses(JSON.parse(localExpenses));
        if (localCashCounter) setCashCounter(JSON.parse(localCashCounter));
        if (localMembers) setMembers(JSON.parse(localMembers));
        if (localMemberPackages) setMemberPackages(JSON.parse(localMemberPackages));
        if (localBookings) {
          const parsedBookings = JSON.parse(localBookings);
          if (Array.isArray(parsedBookings)) {
            // Automatically purge bookings from past days on preload
            const activeBookings = parsedBookings.filter((b: any) => b && b.date && b.date >= todayStr);
            setBookings(activeBookings);
          }
        }

        // If local cached data was loaded, unblock UI immediately so user never waits
        if (localShopConfig || localBarbers || localSales || localBookings) {
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("⚠️ Failed to preload cached data:", err);
      }

      // Safety fallback timer: guarantee isLoading is set to false within 2 seconds
      const fallbackTimer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);

      try {
        const salonDocRef = doc(db, "salons", userEmail);
        
        // 1. Initial existence & seeding check
        try {
          const salonSnap = await getDoc(salonDocRef);
          if (!salonSnap.exists()) {
            const defaultSalon = {
              shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ร้านบาร์เบอร์ของฉัน",
              shareConfig: DEFAULT_SHARE_CONFIG,
              shopConfig: {
                shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ร้านบาร์เบอร์ของฉัน",
                pinCode: "1234",
                isPinLocked: true
              },
              barbers: isGuest ? INITIAL_BARBERS : [],
              products: isGuest ? INITIAL_PRODUCTS : [],
              chemicalPromos: isGuest ? INITIAL_CHEMICAL_PROMOS : [],
              bookings: isGuest ? INITIAL_BOOKINGS : [],
              vouchers: isGuest ? [
                { id: "v1", value: 20, isActive: true },
                { id: "v2", value: 50, isActive: true }
              ] : [],
              payslips: [],
              expenses: [],
              lastResetDate: todayStr,
              firstLoginDate: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await setDoc(salonDocRef, defaultSalon);
            console.log(`🟢 [Firebase] ไม่พบบัญชีเดิม สร้างโปรไฟล์เริ่มต้นของ ${userEmail} ลงระบบฐานข้อมูลแล้ว`);
            
            if (isGuest) {
              const seededSales = getSeededSales();
              const batch = writeBatch(db);
              seededSales.forEach(sale => {
                const sRef = doc(db, "salons", userEmail, "sales", sale.id);
                batch.set(sRef, sale);
              });
              await batch.commit();
            }
          }
        } catch (initErr) {
          console.warn("⚠️ [Firebase] Initial salon fetch failed or took too long, proceeding with offline snapshot:", initErr);
          setIsLoading(false);
        }

        // 2. Setup Real-time Snapshot on main Salon Document
        unsubSalon = onSnapshot(salonDocRef, (docSnap) => {
          clearTimeout(fallbackTimer);
          setFirebaseStatus('connected');
          if (docSnap.exists()) {
            const salonData = docSnap.data();
            const lastResetDate = salonData.lastResetDate || "";
            let finalBarbers = salonData.barbers || [];

            // Add back default isWorking attribute if missing
            finalBarbers = finalBarbers.map((b: any) => ({
              ...b,
              isWorking: typeof b.isWorking === 'boolean' ? b.isWorking : true
            }));

            // Check Daily Reset & Past Bookings Purge
            const rawBookings: Booking[] = salonData.bookings || (isGuest ? INITIAL_BOOKINGS : []);
            const validBookings = rawBookings.filter((b: Booking) => b && b.date && b.date >= todayStr);
            const hadPastBookings = validBookings.length !== rawBookings.length;

            const localResetDate = localStorage.getItem(`barber_pos_last_reset_date_${userEmail}`);
            if (lastResetDate !== todayStr || localResetDate !== todayStr || hadPastBookings) {
              console.log(`⏰ [Daily Reset & Booking Purge] วันใหม่ล่วงเลยมาถึงแล้ว (${lastResetDate} -> ${todayStr}) รีเซ็ตสถานะช่างและล้างคิวเก่าที่พ้นวันแล้ว (${rawBookings.length - validBookings.length} คิว)`);
              finalBarbers = finalBarbers.map((b: any) => ({
                ...b,
                isWorking: true
              }));
              
              localStorage.setItem(`barber_pos_last_reset_date_${userEmail}`, todayStr);
              localStorage.setItem(`barber_pos_barbers_${userEmail}`, JSON.stringify(finalBarbers));
              localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(validBookings));

              setDoc(salonDocRef, { 
                barbers: finalBarbers, 
                bookings: validBookings,
                lastResetDate: todayStr, 
                updatedAt: new Date().toISOString() 
              }, { merge: true })
                .catch(err => console.warn("🟡 [Daily Reset] บันทึกรีเซ็ตคิวและรายชื่อช่างบนคลาวด์ไม่สำเร็จ:", err));
            } else {
              localStorage.setItem(`barber_pos_last_reset_date_${userEmail}`, todayStr);
            }

            // Update States
            setBarbers(finalBarbers);
            setProducts(salonData.products || []);
            setChemicalPromos(salonData.chemicalPromos || (isGuest ? INITIAL_CHEMICAL_PROMOS : []));
            setShareConfig(salonData.shareConfig || DEFAULT_SHARE_CONFIG);
            setShopConfig({
              shopName: salonData.shopName || (isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ร้านบาร์เบอร์ของฉัน"),
              pinCode: salonData.shopConfig?.pinCode || "1234",
              isPinLocked: salonData.shopConfig?.isPinLocked ?? true,
              logoUrl: "",
              ...(salonData.shopConfig || {})
            });
            setVouchers(salonData.vouchers || []);
            setPayslips(salonData.payslips || []);
            setExpenses(salonData.expenses || []);
            setCashCounter(salonData.cashCounter || null);
            setMembers(salonData.members || (isGuest ? INITIAL_MEMBERS : []));
            setMemberPackages(salonData.memberPackages || (isGuest ? INITIAL_MEMBER_PACKAGES : []));
            setBookings(validBookings);

            // First Login Date tracking & initialization
            let loginDate = salonData.firstLoginDate || salonData.shopConfig?.firstLoginDate || localStorage.getItem(`barber_pos_first_login_date_${userEmail}`);
            if (!loginDate) {
              loginDate = new Date().toISOString();
              localStorage.setItem(`barber_pos_first_login_date_${userEmail}`, loginDate);
              setDoc(salonDocRef, { firstLoginDate: loginDate }, { merge: true }).catch(() => {});
            } else {
              localStorage.setItem(`barber_pos_first_login_date_${userEmail}`, loginDate);
            }
            setFirstLoginDate(loginDate);

            setIsLoading(false);
          }
        }, (err) => {
          setIsLoading(false);
          handleFirestoreError(err, OperationType.GET, `salons/${userEmail}`);
        });

        // 3. Setup Real-time Snapshot on Sales Subcollection
        const salesColRef = collection(db, "salons", userEmail, "sales");
        unsubSales = onSnapshot(salesColRef, async (salesSnap) => {
          const fetchedSales: SaleRecord[] = [];
          salesSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              fetchedSales.push(docSnap.data() as SaleRecord);
            }
          });

          // Sort sales
          let reconciledSales = [...fetchedSales];
          reconciledSales.sort((a, b) => {
            const timeA = a && a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b && b.timestamp ? new Date(b.timestamp).getTime() : 0;
            const diff = (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            if (diff !== 0) return diff;
            return (b?.id || '').localeCompare(a?.id || '');
          });

          // Reconcile and Dual-Restore Offline Sales Data (Only do this once on first load)
          if (!hasReconciled) {
            hasReconciled = true;
            try {
              const suffix = `_${userEmail}`;
              const localSalesStr = localStorage.getItem(`barber_pos_sales${suffix}`) || localStorage.getItem(`barber_pos_sales_${userEmail}`);
              if (localSalesStr) {
                const localSales: SaleRecord[] = JSON.parse(localSalesStr);
                if (Array.isArray(localSales) && localSales.length > 0) {
                  const fetchedIds = new Set(fetchedSales.map(s => s.id));
                  const unsyncedSales = localSales.filter(s => s && s.id && !fetchedIds.has(s.id));
                  
                  if (unsyncedSales.length > 0) {
                    console.log(`⚠️ POS [Reconciliation] พบยอดขายออฟไลน์ยังไม่ได้เซฟขึ้น Cloud จำนวน ${unsyncedSales.length} รายการ. กำลังซิงค์ขึ้นเซิร์ฟเวอร์...`);
                    reconciledSales = [...unsyncedSales, ...reconciledSales];
                    reconciledSales.sort((a, b) => {
                      const timeA = a && a.timestamp ? new Date(a.timestamp).getTime() : 0;
                      const timeB = b && b.timestamp ? new Date(b.timestamp).getTime() : 0;
                      const diff = (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                      if (diff !== 0) return diff;
                      return (b?.id || '').localeCompare(a?.id || '');
                    });
                    
                    const batch = writeBatch(db);
                    unsyncedSales.forEach((sale) => {
                      const sRef = doc(db, "salons", userEmail, "sales", sale.id);
                      batch.set(sRef, sale);
                    });
                    await batch.commit();
                    console.log(`🟢 POS [Reconciliation] ซิงก์ประวัติออฟไลน์ ${unsyncedSales.length} รายการ สำเร็จปลอดภัย!`);
                  }
                }
              }
            } catch (reconcileErr) {
              console.error("🔴 POS [Reconciliation] Error restoring unsynced local data:", reconcileErr);
            }
          }

          setSales(reconciledSales);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, `salons/${userEmail}/sales`);
        });

      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, `salons/${userEmail}`);
        setFirebaseStatus('error');
        setFirebaseErrorMessage(err?.message || 'เชื่อมต่ออินเทอร์เน็ตล้มเหลวขณะติดต่อคลาวด์');
        setIsLoading(false);
      }
    };

    setupRealtimeSync();

    return () => {
      if (unsubSalon) unsubSalon();
      if (unsubSales) unsubSales();
    };
  }, [userEmail]);

  // 2. State Auto-Backup Sync triggers for offline failsafe integrity validation
  // Only execute when loading completes to prevent defaults overwriting
  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_barbers_${userEmail}`, JSON.stringify(barbers));
  }, [barbers, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_products_${userEmail}`, JSON.stringify(products));
  }, [products, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_chemical_promos_${userEmail}`, JSON.stringify(chemicalPromos));
  }, [chemicalPromos, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_share_config_${userEmail}`, JSON.stringify(shareConfig));
  }, [shareConfig, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_shop_config_${userEmail}`, JSON.stringify(shopConfig));
  }, [shopConfig, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_vouchers_${userEmail}`, JSON.stringify(vouchers));
  }, [vouchers, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_sales_${userEmail}`, JSON.stringify(sales));
  }, [sales, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_payslips_${userEmail}`, JSON.stringify(payslips));
  }, [payslips, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_expenses_${userEmail}`, JSON.stringify(expenses));
  }, [expenses, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading || !cashCounter) return;
    localStorage.setItem(`barber_pos_cash_counter_${userEmail}`, JSON.stringify(cashCounter));
  }, [cashCounter, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_members_${userEmail}`, JSON.stringify(members));
  }, [members, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_member_packages_${userEmail}`, JSON.stringify(memberPackages));
  }, [memberPackages, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(bookings));
  }, [bookings, userEmail, isLoading]);

  // Midnight & Day Transition Watcher: Automatically purge past-day bookings and reset barbers when a new day arrives
  useEffect(() => {
    if (!userEmail || isLoading) return;

    const checkDayTransition = () => {
      const d = new Date();
      const currentTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const recordedResetDate = localStorage.getItem(`barber_pos_last_reset_date_${userEmail}`) || '';

      // Check if day changed or if there are bookings from past days
      setBookings(prevBookings => {
        const activeBookings = prevBookings.filter(b => b && b.date && b.date >= currentTodayStr);
        const hasPastBookings = activeBookings.length !== prevBookings.length;
        const isNewDay = recordedResetDate !== currentTodayStr;

        if (hasPastBookings || isNewDay) {
          console.log(`⏰ [Midnight / Day Transition] ขึ้นวันใหม่ (${currentTodayStr}) ล้างคิวที่พ้นวันแล้ว (${prevBookings.length - activeBookings.length} คิว) และรีเซ็ตสถานะช่าง`);
          localStorage.setItem(`barber_pos_last_reset_date_${userEmail}`, currentTodayStr);
          localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(activeBookings));

          // Also set barbers to working = true
          setBarbers(prevBarbers => {
            const resetBarbers = prevBarbers.map(b => ({ ...b, isWorking: true }));
            localStorage.setItem(`barber_pos_barbers_${userEmail}`, JSON.stringify(resetBarbers));
            
            // Sync to Firestore
            const docRef = doc(db, "salons", userEmail);
            setDoc(docRef, {
              bookings: activeBookings,
              barbers: resetBarbers,
              lastResetDate: currentTodayStr,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});

            return resetBarbers;
          });

          return activeBookings;
        }
        return prevBookings;
      });
    };

    // Check periodically every 30 seconds and when the tab/window gains focus
    checkDayTransition();
    const timer = setInterval(checkDayTransition, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDayTransition();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkDayTransition);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkDayTransition);
    };
  }, [userEmail, isLoading]);

  // Evaluate 1-Year Annual Reset Cycle (365 days -> 30-day warning -> 395 days auto factory reset)
  useEffect(() => {
    if (!userEmail || !firstLoginDate) return;

    try {
      const firstLogin = new Date(firstLoginDate);
      if (isNaN(firstLogin.getTime())) return;

      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - firstLogin.getTime());
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      setAnnualDaysElapsed(diffDays);

      // 1. Exceeded 1 Year + 30 Days Warning Grace Period (diffDays >= 395)
      if (diffDays >= 395) {
        console.warn(`⏰ [Annual Reset System] ครบกำหนด 1 ปี + ผ่อนผัน 1 เดือน (${diffDays} วัน) ระบบทำการ Factory Reset อัตโนมัติ`);
        alert(`⏰ [แจ้งเตือนระบบ] ระบบได้ทำการ Factory Reset อัตโนมัติเรียบร้อยแล้ว\nเนื่องจากบัญชีของคุณ (${userEmail}) ครบรอบระยะเวลาใช้งาน 1 ปี + ผ่อนผันการแจ้งเตือน 1 เดือน (30 วัน)`);
        confirmFullReset();
        return;
      }

      // 2. Reached 1 Year (365 <= diffDays < 395) -> Daily warning popup
      if (diffDays >= 365) {
        const daysRem = Math.max(0, 395 - diffDays);
        setAnnualDaysRemaining(daysRem);

        const todayStr = now.toISOString().split('T')[0];
        const dismissedToday = localStorage.getItem(`barber_pos_annual_reset_dismissed_${userEmail}_${todayStr}`);
        if (!dismissedToday) {
          setShowAnnualResetModal(true);
        }
      }
    } catch (err) {
      console.error("Error evaluating annual reset schedule:", err);
    }
  }, [userEmail, firstLoginDate]);

  const handleCloseAnnualModalToday = () => {
    if (!userEmail) return;
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`barber_pos_annual_reset_dismissed_${userEmail}_${todayStr}`, 'true');
    setShowAnnualResetModal(false);
  };


  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (d: Date = new Date()): string => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  // 3. Client-Side Firestore Action Dispatchers (Replacing intermediate Node Server Endpoint routes)
  const handleSaveSale = (newOmitRecord: Omit<SaleRecord, 'id' | 'timestamp' | 'date'> & { timestamp?: string; date?: string }) => {
    if (!userEmail) return;
    const now = new Date();
    const formattedDate = getLocalDateString(now);
    
    const safeTimestamp = newOmitRecord.timestamp || now.toISOString();
    const safeDate = newOmitRecord.date || formattedDate;

    const fullyQualifiedRecord: SaleRecord = {
      barberId: newOmitRecord.barberId || 'unknown',
      barberName: newOmitRecord.barberName || 'ช่างตัดผม',
      customerName: newOmitRecord.customerName?.trim() || newOmitRecord.memberName?.trim() || (newOmitRecord.memberCode ? `สมาชิก (${newOmitRecord.memberCode})` : 'ลูกค้าทั่วไป'),
      haircutPrice: Number(newOmitRecord.haircutPrice) || 0,
      chemicalPrice: Number(newOmitRecord.chemicalPrice) || 0,
      productPrice: Number(newOmitRecord.productPrice) || 0,
      tip: Number(newOmitRecord.tip) || 0,
      paymentMethod: newOmitRecord.paymentMethod || 'cash',
      subtotal: Number(newOmitRecord.subtotal) || 0,
      discountAmount: Number(newOmitRecord.discountAmount) || 0,
      customerPaid: Number(newOmitRecord.customerPaid) || 0,
      barberHaircutShare: Number(newOmitRecord.barberHaircutShare) || 0,
      barberChemicalShare: Number(newOmitRecord.barberChemicalShare) || 0,
      barberProductShare: Number(newOmitRecord.barberProductShare) || 0,
      barberTotalShare: Number(newOmitRecord.barberTotalShare) || 0,
      shopTotalShare: Number(newOmitRecord.shopTotalShare) || 0,
      ...newOmitRecord,
      id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: safeTimestamp,
      date: safeDate
    };

    // Clean undefined fields recursively so Firestore doesn't reject the save request
    const cleanRecord = cleanUndefined(fullyQualifiedRecord);
    cleanRecord.date = safeDate;
    cleanRecord.timestamp = safeTimestamp;
    cleanRecord.id = cleanRecord.id || `sale-${Date.now()}`;

    // Optimistic state updates
    setSales((prev) => [cleanRecord, ...prev]);

    // Deduct member credit if memberId and memberCreditUsed > 0
    if (cleanRecord.memberId && cleanRecord.memberCreditUsed && cleanRecord.memberCreditUsed > 0) {
      setMembers(prevMembers => {
        const updated = prevMembers.map(m => {
          if (m.id === cleanRecord.memberId) {
            const newBal = Math.max(0, (m.creditBalance || 0) - cleanRecord.memberCreditUsed!);
            const usageLog = {
              id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              date: cleanRecord.timestamp || new Date().toISOString(),
              type: 'usage' as const,
              amount: cleanRecord.memberCreditUsed!,
              description: `ชำระค่าบริการหน้าร้าน (บิล ${cleanRecord.id})`,
              balanceAfter: newBal,
              saleRecordId: cleanRecord.id
            };
            return {
              ...m,
              creditBalance: newBal,
              usageHistory: [usageLog, ...(m.usageHistory || [])]
            };
          }
          return m;
        });
        
        // Persist updated members array to Firestore
        const docRef = doc(db, "salons", userEmail);
        setDoc(docRef, cleanUndefined({ members: updated, updatedAt: new Date().toISOString() }), { merge: true }).catch(() => {});
        return updated;
      });
    }

    // If offline, increment pending sync counter
    if (!navigator.onLine) {
      setPendingSyncCount((prev) => prev + 1);
    }

    // Atomic insert doc on subcollection salons/{email}/sales
    const saleDocRef = doc(db, "salons", userEmail, "sales", cleanRecord.id);
    setDoc(saleDocRef, cleanRecord)
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Saved record successfully) ID:", cleanRecord.id);
      })
      .catch((err) => {
        setPendingSyncCount((prev) => prev + 1);
        handleFirestoreError(err, OperationType.WRITE, `salons/${userEmail}/sales/${cleanRecord.id}`);
      });
  };

  const handleClearSales = () => {
    setShowClearSalesConfirm(true);
  };

  const confirmClearSales = () => {
    if (!userEmail) return;
    setShowClearSalesConfirm(false);
    setSales([]);

    // Query and atomic clear using Firebase client batch
    const salesColRef = collection(db, "salons", userEmail, "sales");
    getDocs(salesColRef)
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        return batch.commit();
      })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ - ล้างประวัติคำสั่งซื้อทั้งหมดแล้ว");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}/sales`);
      });
  };

  const handleClearSalesOlderThanOneYear = async (): Promise<number> => {
    if (!userEmail) return 0;
    
    // Calculate cutoff date (exactly 1 year / 365 days ago)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDateStr = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const oldSales = sales.filter((s) => {
      const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
      return sDate && sDate < cutoffDateStr;
    });

    if (oldSales.length === 0) {
      return 0;
    }

    const oldSaleIds = new Set(oldSales.map((s) => s.id));

    // Update in-memory state immediately for instant UI feedback
    setSales((prev) => prev.filter((s) => !oldSaleIds.has(s.id)));

    // Perform Firestore batch delete in chunks of 450 (Firestore limit is 500 per batch)
    try {
      const BATCH_SIZE = 450;
      for (let i = 0; i < oldSales.length; i += BATCH_SIZE) {
        const chunk = oldSales.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((sale) => {
          const sRef = doc(db, "salons", userEmail, "sales", sale.id);
          batch.delete(sRef);
        });
        await batch.commit();
      }
      console.log(`🟢 [Firebase] ล้างข้อมูลบิลขายเก่ากว่า 1 ปีสำเร็จ (${oldSales.length} รายการ)`);
      return oldSales.length;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}/sales`);
      throw err;
    }
  };

  const handleDeleteMonthData = async (
    monthStr: string,
    options: {
      deleteSales: boolean;
      deleteExpenses: boolean;
      deletePayslips: boolean;
    } = { deleteSales: true, deleteExpenses: true, deletePayslips: true }
  ): Promise<{ deletedSalesCount: number; deletedExpensesCount: number; deletedPayslipsCount: number }> => {
    if (!userEmail) return { deletedSalesCount: 0, deletedExpensesCount: 0, deletedPayslipsCount: 0 };

    const { deleteSales = true, deleteExpenses = true, deletePayslips = true } = options;

    // 1. Identify sales in target month
    const salesToDelete = deleteSales
      ? sales.filter((s) => {
          const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
          return sDate && sDate.startsWith(monthStr);
        })
      : [];

    // 2. Identify expenses in target month
    const expensesToDelete = deleteExpenses
      ? expenses.filter((e) => {
          const eDate = e.date || '';
          return eDate && eDate.startsWith(monthStr);
        })
      : [];

    // 3. Identify payslips in target month
    const payslipsToDelete = deletePayslips
      ? payslips.filter((p) => {
          return p.month === monthStr || (p.timestamp && p.timestamp.startsWith(monthStr));
        })
      : [];

    // Execute deletions:
    // A. Delete sales from React state and Firestore subcollection
    if (salesToDelete.length > 0) {
      const saleIdsToDelete = new Set(salesToDelete.map((s) => s.id));
      setSales((prev) => prev.filter((s) => !saleIdsToDelete.has(s.id)));

      try {
        const BATCH_SIZE = 450;
        for (let i = 0; i < salesToDelete.length; i += BATCH_SIZE) {
          const chunk = salesToDelete.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((sale) => {
            const sRef = doc(db, "salons", userEmail, "sales", sale.id);
            batch.delete(sRef);
          });
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}/sales`);
      }
    }

    // B. Delete expenses from React state and Firestore document
    if (deleteExpenses && expensesToDelete.length > 0) {
      const expenseIdsToDelete = new Set(expensesToDelete.map((e) => e.id));
      const remainingExpenses = expenses.filter((e) => !expenseIdsToDelete.has(e.id));
      setExpenses(remainingExpenses);

      try {
        const docRef = doc(db, "salons", userEmail);
        await setDoc(docRef, cleanUndefined({ expenses: remainingExpenses, updatedAt: new Date().toISOString() }), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      }
    }

    // C. Delete payslips from React state and Firestore document
    if (deletePayslips && payslipsToDelete.length > 0) {
      const payslipIdsToDelete = new Set(payslipsToDelete.map((p) => p.id));
      const remainingPayslips = payslips.filter((p) => !payslipIdsToDelete.has(p.id));
      setPayslips(remainingPayslips);

      try {
        const docRef = doc(db, "salons", userEmail);
        await setDoc(docRef, cleanUndefined({ payslips: remainingPayslips, updatedAt: new Date().toISOString() }), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      }
    }

    console.log(`🟢 [Firebase] ลบข้อมูลประจำเดือน ${monthStr} สำเร็จ (บิลขาย: ${salesToDelete.length}, รายจ่าย: ${expensesToDelete.length}, สลิป: ${payslipsToDelete.length})`);

    return {
      deletedSalesCount: salesToDelete.length,
      deletedExpensesCount: expensesToDelete.length,
      deletedPayslipsCount: payslipsToDelete.length
    };
  };

  const handleDeleteSale = (saleId: string) => {
    if (!userEmail) return;
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    
    const docRef = doc(db, "salons", userEmail, "sales", saleId);
    deleteDoc(docRef)
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Deleted record successfully) ID:", saleId);
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}/sales/${saleId}`);
      });
  };

  const handleUpdateSalePaymentMethod = (saleId: string, newMethod: 'cash' | 'transfer' | 'split') => {
    if (!userEmail) return;
    
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) return;
    if (targetSale.paymentMethod === newMethod) return;

    setSales((prev) => 
      prev.map((s) => (s.id === saleId ? { ...s, paymentMethod: newMethod } : s))
    );

    const docRef = doc(db, "salons", userEmail, "sales", saleId);
    setDoc(docRef, { paymentMethod: newMethod }, { merge: true })
      .then(() => {
        console.log(`🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Updated paymentMethod to ${newMethod}) ID:`, saleId);
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}/sales/${saleId}`);
      });
  };

  const handleUpdateSale = (saleId: string, updates: Partial<SaleRecord>) => {
    if (!userEmail) return;

    const cleanedUpdates = cleanUndefined(updates);

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, ...updates } : s))
    );

    const docRef = doc(db, "salons", userEmail, "sales", saleId);
    setDoc(docRef, cleanedUpdates, { merge: true })
      .then(() => {
        console.log(`🟢 [Firebase] บันทึกการแก้ไขบิลสำเร็จ ID:`, saleId);
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}/sales/${saleId}`);
      });
  };

  const handleDownloadFullBackupNow = () => {
    try {
      const totalIncome = correctedSales.reduce((sum, s) => sum + (s.customerPaid || 0), 0);
      const backupData: SystemBackupData = {
        version: '1.0.0',
        backupDate: new Date().toISOString(),
        backupType: '1-year-annual',
        userEmail: userEmail || 'unknown',
        shopName: shopConfig.shopName || 'ร้านบาร์เบอร์ของฉัน',
        firstLoginDate: firstLoginDate || undefined,
        daysActive: annualDaysElapsed,
        totalSalesCount: correctedSales.length,
        totalIncome,
        data: {
          shopConfig,
          shareConfig,
          barbers,
          products,
          chemicalPromos,
          vouchers,
          sales: correctedSales,
          expenses,
          payslips,
          cashCounter,
          members,
          memberPackages,
          bookings
        }
      };

      const cleanShop = (shopConfig.shopName || 'BarberPOS').replace(/[/\\?%*:|"<>]/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      
      // 1. Export JSON Full Backup
      exportFullSystemBackupJson(backupData, `สำรองข้อมูลระบบ1ปี_ร้าน${cleanShop}_${dateStr}.json`);

      // 2. Export Excel/CSV Sales Report
      const headers = [
        'วันที่ทำรายการ',
        'เลขที่บิล (ID)',
        'ชื่อช่างผู้ให้บริการ',
        'ชื่อลูกค้า / หมายเหตุ',
        'ค่าบริการตัดผม (บาท)',
        'ค่าบริการเคมี (บาท)',
        'สินค้า (บาท)',
        'ส่วนลดรวม (บาท)',
        'ยอดรับชำระจริง (บาท)',
        'ช่องทางชำระเงิน',
        'ส่วนแบ่งช่าง (บาท)',
        'ส่วนแบ่งร้าน (บาท)',
        'ทิป (บาท)'
      ];

      const rows: string[][] = correctedSales.map((s) => [
        s.timestamp ? formatThaiDate(s.timestamp.split('T')[0]) + ' ' + (s.timestamp.split('T')[1]?.substring(0, 5) || '') : (s.date || ''),
        s.id || '',
        s.barberName || '',
        s.customerName || s.notes || '-',
        (s.haircutPrice || 0).toString(),
        (s.chemicalPrice || 0).toString(),
        (s.productPrice || 0).toString(),
        (s.discountAmount || 0).toString(),
        (s.customerPaid || 0).toString(),
        s.paymentMethod === 'cash' ? 'เงินสด' : s.paymentMethod === 'transfer' ? 'เงินโอน/สแกน' : 'จ่ายผสม/เครดิต',
        (s.barberTotalShare || 0).toString(),
        (s.shopTotalShare || 0).toString(),
        (s.tip || 0).toString()
      ]);

      downloadExcelReport(`รายงานประวัติบิล1ปี_ร้าน_${cleanShop}_${dateStr}`, rows, headers);
    } catch (err) {
      console.error('Failed to trigger full backup:', err);
    }
  };

  const handleFullReset = () => {
    setShowFullResetConfirm(true);
  };

  const confirmFullReset = () => {
    if (!userEmail) return;
    setShowFullResetConfirm(false);

    // Automatically trigger full backup before destructive reset
    try {
      handleDownloadFullBackupNow();
    } catch (err) {
      console.warn("Could not auto-download backup before reset:", err);
    }

    setIsLoading(true);
    
    // Clear all local storage caches for this user
    Object.keys(localStorage).forEach((key) => {
      if (key.includes(userEmail) || key.startsWith('barber_pos_')) {
        localStorage.removeItem(key);
      }
    });

    const isGuest = userEmail === "guest@gmail.com";
    const freshLoginDate = new Date().toISOString();
    const freshData = {
      shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ร้านบาร์เบอร์ของฉัน",
      shareConfig: DEFAULT_SHARE_CONFIG,
      shopConfig: {
        shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ร้านบาร์เบอร์ของฉัน",
        pinCode: "",
        isPinLocked: false
      },
      barbers: isGuest ? INITIAL_BARBERS : [],
      products: isGuest ? INITIAL_PRODUCTS : [],
      chemicalPromos: isGuest ? INITIAL_CHEMICAL_PROMOS : [],
      vouchers: isGuest ? [
        { id: "v1", value: 20, isActive: true },
        { id: "v2", value: 50, isActive: true }
      ] : [],
      bookings: isGuest ? INITIAL_BOOKINGS : [],
      payslips: [],
      expenses: [],
      cashCounter: null,
      firstLoginDate: freshLoginDate,
      updatedAt: new Date().toISOString()
    };

    const runReset = async () => {
      try {
        const salonDocRef = doc(db, "salons", userEmail);
        await setDoc(salonDocRef, freshData);

        const salesColRef = collection(db, "salons", userEmail, "sales");
        const snap = await getDocs(salesColRef);
        const batch = writeBatch(db);
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        if (isGuest) {
          const seededSales = getSeededSales();
          seededSales.forEach(sale => {
            const sRef = doc(db, "salons", userEmail, "sales", sale.id);
            batch.set(sRef, sale);
          });
        }

        await batch.commit();
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Cloud database reset complete)");

        // Reset in-memory state immediately so UI updates cleanly
        setBarbers(isGuest ? INITIAL_BARBERS : []);
        setProducts(isGuest ? INITIAL_PRODUCTS : []);
        setChemicalPromos(isGuest ? INITIAL_CHEMICAL_PROMOS : []);
        setBookings(isGuest ? INITIAL_BOOKINGS : []);
        setVouchers(isGuest ? [
          { id: "v1", value: 20, isActive: true },
          { id: "v2", value: 50, isActive: true }
        ] : []);
        setShopConfig(isGuest ? DEFAULT_SHOP_CONFIG : { shopName: "ร้านบาร์เบอร์ของฉัน", pinCode: "1234", isPinLocked: true });
        setShareConfig(DEFAULT_SHARE_CONFIG);
        setSales([]);
        setPayslips([]);
        setExpenses([]);
        setCashCounter(null);
        setFirstLoginDate(freshLoginDate);
        setAnnualDaysElapsed(0);
        setAnnualDaysRemaining(30);

        setIsLoading(false);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}`);
        setIsLoading(false);
      }
    };

    runReset();
  };

  // Helper sync dispatchers writing directly to cloud
  const handleUpdateBarbers = (updatedBarbers: Barber[]) => {
    if (!userEmail) return;
    setBarbers(updatedBarbers);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ barbers: updatedBarbers, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set barbers successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateProducts = (updatedProducts: Product[]) => {
    if (!userEmail) return;
    setProducts(updatedProducts);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ products: updatedProducts, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set products successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateChemicalPromos = (updatedPromos: ChemicalPromo[]) => {
    if (!userEmail) return;
    setChemicalPromos(updatedPromos);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ chemicalPromos: updatedPromos, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set chemical promos successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateShareConfig = (updatedShareConfig: ShareConfig) => {
    if (!userEmail) return;
    setShareConfig(updatedShareConfig);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ shareConfig: updatedShareConfig, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set share config successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateShopConfig = (updatedShopConfig: ShopConfig) => {
    if (!userEmail) return;
    setShopConfig(updatedShopConfig);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ shopConfig: updatedShopConfig, shopName: updatedShopConfig.shopName, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set shop config successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateVouchers = (updatedVouchers: Voucher[]) => {
    if (!userEmail) return;
    setVouchers(updatedVouchers);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ vouchers: updatedVouchers, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set vouchers successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdatePayslips = (updatedPayslips: Payslip[]) => {
    if (!userEmail) return;
    setPayslips(updatedPayslips);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ payslips: updatedPayslips, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Set payslips successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateExpenses = (updatedExpenses: Expense[]) => {
    if (!userEmail) return;
    setExpenses(updatedExpenses);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ expenses: updatedExpenses, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกรายจ่ายสำเร็จ (Set expenses successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateCashCounter = (updatedCashCounter: CashCounterState) => {
    if (!userEmail) return;
    setCashCounter(updatedCashCounter);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ cashCounter: updatedCashCounter, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลนับเงินสดสำเร็จ (Set cash counter successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateMembers = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    if (!userEmail) return;
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ members: updatedMembers, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสมาชิกสำเร็จ (Set members successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateMemberPackages = (updatedPackages: MemberPackage[]) => {
    setMemberPackages(updatedPackages);
    if (!userEmail) return;
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ memberPackages: updatedPackages, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลแพ็กเกจสมาชิกสำเร็จ (Set member packages successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleSaveBooking = (newBooking: Booking) => {
    const updated = [newBooking, ...bookings];
    setBookings(updated);
    if (!userEmail) return;
    localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(updated));
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ bookings: updated, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลจองคิวสำเร็จ (Save booking successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateBooking = (updatedBooking: Booking) => {
    const updated = bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b);
    setBookings(updated);
    if (!userEmail) return;
    localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(updated));
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ bookings: updated, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] อัปเดตข้อมูลจองคิวสำเร็จ (Update booking successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleDeleteBooking = (bookingId: string) => {
    const updated = bookings.filter(b => b.id !== bookingId);
    setBookings(updated);
    if (!userEmail) return;
    localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(updated));
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ bookings: updated, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] ลบข้อมูลจองคิวสำเร็จ (Delete booking successfully)");
      })
      .catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleStartServiceSaleFromBooking = (booking: Booking) => {
    setSalePrefill({
      barberId: booking.barberId,
      customerName: booking.customerName + (booking.customerPhone ? ` (${booking.customerPhone})` : ''),
      haircutPrice: 350,
      chemicalPrice: 0,
      notes: `[คิวจอง ${booking.date} เวลา ${booking.startTime}-${booking.endTime}]${booking.notes ? ' - ' + booking.notes : ''}`
    });
    setActiveTab('sales');
  };

  const handleSellPackageToMember = (
    memberId: string, 
    pkg: MemberPackage, 
    barberId?: string, 
    paymentMethod: 'cash' | 'transfer' = 'transfer', 
    notes?: string
  ) => {
    const now = new Date().toISOString();
    let targetMemberName = '';
    let targetMemberCode = '';

    setMembers(prevMembers => {
      const targetMember = prevMembers.find(m => m.id === memberId);
      if (targetMember) {
        targetMemberName = targetMember.name;
        targetMemberCode = targetMember.memberCode;
      }

      const updatedMembers = prevMembers.map(m => {
        if (m.id === memberId) {
          const newBalance = (m.creditBalance || 0) + pkg.credit;
          const newPurchaseLog = {
            id: `pkg-pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            packageId: pkg.id,
            packageName: pkg.name,
            pricePaid: pkg.price,
            creditReceived: pkg.credit,
            purchaseDate: now,
            barberId,
            barberName: barbers.find(b => b.id === barberId)?.name,
            paymentMethod,
            notes
          };
          const newUsageLog = {
            id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: now,
            type: 'topup' as const,
            amount: pkg.credit,
            description: `เติมแพ็กเกจ ${pkg.name} (จ่าย ${pkg.price} ได้เครดิต ${pkg.credit})`,
            balanceAfter: newBalance
          };
          return {
            ...m,
            creditBalance: newBalance,
            totalTopUpAmount: (m.totalTopUpAmount || 0) + pkg.price,
            packagePurchases: [newPurchaseLog, ...(m.packagePurchases || [])],
            usageHistory: [newUsageLog, ...(m.usageHistory || [])]
          };
        }
        return m;
      });

      if (userEmail) {
        const docRef = doc(db, "salons", userEmail);
        const cleanedData = cleanUndefined({ members: updatedMembers, updatedAt: new Date().toISOString() });
        setDoc(docRef, cleanedData, { merge: true }).catch(() => {});
      }

      return updatedMembers;
    });

    // Record sale record so package sale revenue is accounted for in daily POS revenue!
    const targetBarber = barbers.find(b => b.id === barberId);
    handleSaveSale({
      barberId: barberId || 'shop',
      barberName: targetBarber ? targetBarber.name : 'หน้าร้าน/เจ้าของ',
      customerName: targetMemberName || 'ลูกค้าสมาชิก',
      haircutPrice: 0,
      chemicalPrice: 0,
      productPrice: pkg.price,
      productId: null,
      productName: `แพ็กเกจสมาชิก: ${pkg.name}`,
      tip: 0,
      useDiscountPct10: false,
      useVoucherValue: 0,
      paymentMethod,
      subtotal: pkg.price,
      discountAmount: 0,
      customerPaid: pkg.price,
      cashAmount: paymentMethod === 'cash' ? pkg.price : 0,
      transferAmount: paymentMethod === 'transfer' ? pkg.price : 0,
      barberHaircutShare: 0,
      barberChemicalShare: 0,
      barberProductShare: 0,
      barberTotalShare: 0,
      shopTotalShare: pkg.price,
      memberId: memberId,
      memberName: targetMemberName || undefined,
      memberCode: targetMemberCode || undefined,
      notes: `ขายแพ็กเกจสมาชิก ${pkg.name}${notes ? ` (${notes})` : ''}`
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setLoginError('กรุณากรอกรูปแบบอีเมล Gmail/Email ให้ถูกต้อง (เช่น custom@gmail.com)');
      return;
    }

    localStorage.setItem('barber_pos_user_email', cleanEmail);
    setUserEmail(cleanEmail);
    setEmailInput('');
    setLoginError('');
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('barber_pos_user_email');
    setUserEmail(null);
    setEmailInput('');
    setLoginError('');
    setShowLogoutConfirm(false);
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100/70 to-slate-50 flex flex-col items-center justify-center font-sans antialiased py-12 px-4 selection:bg-indigo-500 selection:text-white" id="login-screen">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl shadow-slate-200/50 space-y-8 animate-slide-up transition-all">
          
          {/* Minimalist Header */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-400 shadow-md mx-auto transform transition-transform hover:scale-105">
              <Scissors className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Barber POS</h1>
              <p className="text-xs text-slate-500 font-medium">กรุณากรอกบัญชีอีเมลร้านค้าเพื่อเข้าใช้งาน</p>
            </div>
          </div>

          {/* Cloud Sync Reassurance Banner */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-[11px] text-indigo-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-indigo-950">
              <Wifi className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>เข้าใช้งานได้จากทุกอุปกรณ์ (Multi-Device Cloud)</span>
            </div>
            <p className="text-indigo-800/80 leading-relaxed font-sans text-[10.5px]">
              ไม่ว่าจะเข้าจากเครื่องไหน สมาร์ตโฟน แท็บเล็ต หรือคอมพิวเตอร์ เพียงกรอกอีเมลร้านเดิม ก็จะเข้าถึงข้อมูลและยอดขายเดียวกันได้ทันทีแบบ Real-time!
            </p>
          </div>

          {/* Clean Input Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="relative">
                <input
                  id="user-email"
                  type="email"
                  required
                  value={emailInput}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="กรุณากรอกอีเมล"
                  className={`w-full px-4 py-3.5 border rounded-2xl outline-none text-sm font-medium transition-all duration-200 ${
                    isEmailFocused 
                      ? 'border-indigo-500 ring-4 ring-indigo-500/15 bg-white text-slate-900 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white focus:bg-white'
                  }`}
                />
              </div>
              {loginError && (
                <p className="text-xs text-rose-600 font-medium flex items-center space-x-1.5 pl-1 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-2xl text-xs font-bold transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.96] flex items-center justify-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-300" />
              <span>เข้าสู่พื้นที่ร้านค้าของคุณ</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4 font-sans">
              <div className="border-t border-slate-100 w-full"></div>
              <span className="absolute px-3 bg-white text-slate-400 text-xs font-semibold">หรือ</span>
            </div>

            {/* Google Sign-In Single Working Button */}
            <div className="space-y-3 font-sans">
              <button
                type="button"
                onClick={() => setShowGoogleChooser(true)}
                className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center justify-center space-x-2.5 cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>ลงชื่อเข้าใช้ด้วย Google / Gmail</span>
              </button>
            </div>
          </form>
        </div>

        {/* CHOOSE GOOGLE ACCOUNT SIMULATOR MODAL */}
        {showGoogleChooser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-100 shadow-2xl relative space-y-4 animate-scale-up">
              <div className="text-center space-y-1.5">
                <svg className="w-8 h-8 mx-auto" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <h2 className="text-sm font-black text-slate-900 leading-none">ลงชื่อเข้าใช้ด้วย Google</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">บัญชีอีเมลที่อนุญาตสิทธิ์</p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">เลือกบัญชีผู้ใช้ (Choose Account)</p>
                
                <div className="space-y-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      const email = 'guest@gmail.com';
                      localStorage.setItem('barber_pos_user_email', email);
                      setUserEmail(email);
                      setShowGoogleChooser(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">G</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-tight">ร้านบาร์เบอร์ POS ตัวอย่าง (Sandbox)</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tight">guest@gmail.com</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">เพื่อการทดลองระบบ</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">หรือ ใช้บัญชีอื่น (Use Another Gmail Account)</label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const clean = customGoogleEmail.trim().toLowerCase();
                    if (clean && clean.includes('@')) {
                      localStorage.setItem('barber_pos_user_email', clean);
                      setUserEmail(clean);
                      setShowGoogleChooser(false);
                    }
                  }}
                  className="flex space-x-2 font-sans"
                >
                  <input
                    type="email"
                    required
                    placeholder="ตัวอย่างเช่น shop@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    ยืนยัน
                  </button>
                </form>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoogleChooser(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer font-sans"
                >
                  ยกเลิก (Cancel)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans antialiased">
        <div className="p-8 text-center space-y-4 max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto shadow-xs"></div>
          <div className="space-y-1">
            <h1 className="text-sm font-extrabold text-slate-950 block">กำลังเชื่อมต่อคลาวด์...</h1>
            <p className="text-[11px] text-slate-500">ระบบฐานข้อมูลกำลังคัดสรรข้อมูลและซิงก์ระบบ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      
      {/* Dynamic Brand Color & Theme Overrides */}
      {(() => {
        const themePreset = getThemePreset(shopConfig?.theme);
        const activeColor = shopConfig?.primaryColor || themePreset.primaryColor;
        const bodyBg = themePreset.bodyBg;
        
        return (
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --color-indigo-50: ${generateShade(activeColor, 97)};
              --color-indigo-100: ${generateShade(activeColor, 92)};
              --color-indigo-200: ${generateShade(activeColor, 84)};
              --color-indigo-300: ${generateShade(activeColor, 72)};
              --color-indigo-400: ${generateShade(activeColor, 60)};
              --color-indigo-500: ${generateShade(activeColor, 50)};
              --color-indigo-600: ${activeColor};
              --color-indigo-700: ${generateShade(activeColor, 38)};
              --color-indigo-800: ${generateShade(activeColor, 28)};
              --color-indigo-900: ${generateShade(activeColor, 18)};
              --color-indigo-950: ${generateShade(activeColor, 10)};
              
              --brand-primary: ${activeColor};
              --brand-hover: ${generateShade(activeColor, 38)};
            }

            body, #root {
              background-color: ${bodyBg} !important;
            }
            
            /* Custom selections */
            ::selection {
              background-color: ${activeColor} !important;
              color: #ffffff !important;
            }
            
            /* Custom overrides for input focus states */
            input:focus, select:focus, textarea:focus {
              border-color: ${activeColor} !important;
              --tw-ring-color: ${activeColor} !important;
              box-shadow: 0 0 0 2px ${generateShade(activeColor, 90)}, 0 0 0 4px ${generateShade(activeColor, 95)} !important;
            }

            /* Beautiful custom modern scrollbars */
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 999px;
            }
            ::-webkit-scrollbar-thumb {
              background: ${generateShade(activeColor, 75)};
              border-radius: 999px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: ${activeColor};
            }

            /* General modern tab element transitions */
            button, nav button, input, select, .card {
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Gentle app entry fade-in animation */
            .tab-content-enter {
              animation: tabFadeIn 0.35s ease-out forwards;
            }

            @keyframes tabFadeIn {
              from {
                opacity: 0;
                transform: translateY(8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            ${themePreset.cssExtra || ''}
          ` }} />
        );
      })()}
      
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Logo and Title */}
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden text-amber-400 shadow-md">
              {shopConfig?.logoUrl ? (
                <img 
                  src={shopConfig.logoUrl} 
                  alt={shopConfig.shopName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <Scissors className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-none">
                  {shopConfig.shopName}
                </h1>
                {/* Clean Sync Pill next to the shop name */}
                {firebaseStatus === 'connected' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs" title="ฐานข้อมูลและทุกเครื่องอัปเดตตรงกันเรียลไทม์ 100%">
                    <span className="relative flex h-1.5 w-1.5 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>เรียลไทม์ ซิงก์สด</span>
                  </span>
                ) : firebaseStatus === 'checking' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-spin"></span>
                    <span>กำลังซิงก์...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1"></span>
                    <span>ออฟไลน์</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-1">
                SYSTEM INTERFACE • FINANCIAL POS PLATFORM
              </p>
            </div>
          </div>

          {/* Tab Controller Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <nav className="flex flex-wrap gap-y-1 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto justify-center">
              {[
                { id: 'sales' as const, label: 'หน้าบันทึกการขาย', icon: <Scissors className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> },
                { id: 'dashboard' as const, label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500" /> },
                ...(shopConfig?.enableBookings !== false ? [{ id: 'bookings' as const, label: 'จองคิวช่าง', icon: <CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> }] : []),
                { id: 'expenses' as const, label: 'ควบคุมรายจ่าย/เบิกเงิน', icon: <ArrowDownCircle className="w-3.5 h-3.5 text-rose-500" /> },
                ...(shopConfig?.enableCashCounter !== false ? [{ id: 'cash' as const, label: 'นับเงินสด', icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> }] : []),
                ...(shopConfig?.enablePayslips !== false ? [{ id: 'payslips' as const, label: 'สลิปเงินเดือน', icon: <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> }] : []),
                { 
                  id: 'config' as const, 
                  label: 'ตั้งค่า', 
                  icon: isSettingsUnlocked ? (
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  ),
                  isLocked: !isSettingsUnlocked
                },
              ].map((tab, idx) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span>{idx + 1}. {tab.label}</span>
                  {tab.id === 'config' && !isSettingsUnlocked && (
                    <span className="text-[10px] text-amber-600 ml-0.5 font-bold">🔒</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Tenant details & Logout */}
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4 h-8 self-center">
              {/* Cloud Status */}
              <div className="hidden lg:flex items-center text-right">
                <span className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
                  {firebaseStatus === 'connected' ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1" title="เชื่อมต่อกับ Cloud Firestore สำเร็จ ข้อมูลจะบันทึกและซิงก์สดทันที">
                      <Wifi className="w-3 h-3 text-emerald-500" />
                      <span>เชื่อมต่อเรียบร้อย</span>
                    </span>
                  ) : firebaseStatus === 'checking' ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                      <span>กำลังซิงก์...</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <WifiOff className="w-3 h-3 text-rose-500 animate-pulse" />
                      <span>ออฟไลน์</span>
                    </span>
                  )}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all border border-slate-100"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 1.1 Sticky 1-Year Warning Banner when 365 days elapsed */}
      {annualDaysElapsed >= 365 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white py-2.5 px-4 shadow-md sticky top-[72px] z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="p-1 bg-white/20 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </span>
              <div>
                <span className="font-extrabold">แจ้งเตือนครบรอบ 1 ปี:</span> บัญชีของคุณใช้งานครบ {annualDaysElapsed} วันแล้ว (เหลือเวลาผ่อนผัน {annualDaysRemaining} วัน ก่อนระบบเริ่มรอบปีถัดไป)
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleDownloadFullBackupNow}
                className="px-3 py-1 bg-white text-slate-900 font-extrabold rounded-lg text-xs hover:bg-amber-50 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>โหลดแบคอัพ 1 ปี</span>
              </button>
              <button
                onClick={() => setShowAnnualResetModal(true)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer border border-white/30"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>เปิดดูรายงานสรุป (Modal)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Content Module */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'sales' && (
          <div className="tab-content-enter">
            <SalesTab 
              sales={correctedSales}
              barbers={barbers}
              products={products}
              chemicalPromos={chemicalPromos}
              shareConfig={shareConfig}
              vouchers={vouchers}
              members={members}
              memberPackages={memberPackages}
              initialPrefill={salePrefill}
              onSaveSale={handleSaveSale}
              onSellPackageToMember={handleSellPackageToMember}
            />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="tab-content-enter">
            <DashboardTab
              sales={correctedSales}
              barbers={barbers}
              shareConfig={shareConfig}
              shopConfig={shopConfig}
              payslips={payslips}
              expenses={expenses}
              onUpdatePayslips={handleUpdatePayslips}
              onUpdateExpenses={handleUpdateExpenses}
              onDeleteSale={handleDeleteSale}
              onUpdateSalePaymentMethod={handleUpdateSalePaymentMethod}
              onUpdateSale={handleUpdateSale}
              onOpenDeleteMonthModal={handleOpenDeleteMonthModal}
            />
          </div>
        )}

        {activeTab === 'bookings' && shopConfig?.enableBookings !== false && (
          <div className="tab-content-enter">
            <BookingTab
              bookings={bookings}
              barbers={barbers}
              members={members}
              shopConfig={shopConfig}
              onSaveBooking={handleSaveBooking}
              onUpdateBooking={handleUpdateBooking}
              onDeleteBooking={handleDeleteBooking}
              onStartServiceSale={handleStartServiceSaleFromBooking}
              onUpdateShopConfig={handleUpdateShopConfig}
            />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="tab-content-enter">
            <ExpensesTab
              userEmail={userEmail}
              expenses={expenses}
              sales={correctedSales}
              onUpdateExpenses={handleUpdateExpenses}
              onOpenDeleteMonthModal={handleOpenDeleteMonthModal}
            />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="tab-content-enter">
            {isSettingsUnlocked ? (
              <ConfigTab 
                userEmail={userEmail}
                barbers={barbers}
                products={products}
                chemicalPromos={chemicalPromos}
                shareConfig={shareConfig}
                shopConfig={shopConfig}
                vouchers={vouchers}
                firstLoginDate={firstLoginDate}
                annualDaysElapsed={annualDaysElapsed}
                annualDaysRemaining={annualDaysRemaining}
                onOpenAnnualModal={() => setShowAnnualResetModal(true)}
                onOpenDeleteMonthModal={handleOpenDeleteMonthModal}
                onDownloadFullBackup={handleDownloadFullBackupNow}
                onLockSettingsNow={handleLockSettingsNow}
                onUpdateBarbers={handleUpdateBarbers}
                onUpdateProducts={handleUpdateProducts}
                onUpdateChemicalPromos={handleUpdateChemicalPromos}
                onUpdateShareConfig={handleUpdateShareConfig}
                onUpdateShopConfig={handleUpdateShopConfig}
                onUpdateVouchers={handleUpdateVouchers}
                onClearSales={handleClearSales}
                onClearSalesOlderThanOneYear={handleClearSalesOlderThanOneYear}
                onFullReset={handleFullReset}
              />
            ) : (
              <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mx-auto shadow-inner">
                  <Lock className="w-8 h-8 text-amber-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">
                    หน้าตั้งค่าถูกล็อคความปลอดภัย
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    หน้านี้สำหรับเจ้าของร้านเท่านั้น กรุณาใส่รหัสผ่าน PIN เพื่อเข้าถึงข้อมูลและการตั้งค่าระบบ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPinModal(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>ใส่รหัสผ่าน PIN เพื่อปลดล็อค</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ← กลับไปหน้าบันทึกการขาย (Sales)
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cash' && shopConfig?.enableCashCounter !== false && (
          <div className="tab-content-enter">
            <CashCounterTab 
              userEmail={userEmail} 
              sales={correctedSales} 
              expenses={expenses} 
              cashCounter={cashCounter}
              onUpdateCashCounter={handleUpdateCashCounter}
            />
          </div>
        )}

        {activeTab === 'payslips' && shopConfig?.enablePayslips !== false && (
          <div className="tab-content-enter">
            <PayslipsTab 
              sales={correctedSales}
              barbers={barbers}
              shareConfig={shareConfig}
              shopConfig={shopConfig}
              payslips={payslips}
              onUpdatePayslips={handleUpdatePayslips}
            />
          </div>
        )}
      </main>


      {/* 3. Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 {shopConfig.shopName}. ระดับบาร์เบอร์ชั้นนำของไทย สงวนลิขสิทธิ์</p>
          <div className="flex items-center space-x-1 font-mono text-[10px]">
            <span>STATUS: ONLINE &bull; SECURE MULTI-TENANCY ACTIVE</span>
          </div>
        </div>
      </footer>

      {/* 4. PWA Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button 
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer p-1 rounded-full hover:bg-slate-800 transition-all text-xl font-bold font-sans"
              >
                &times;
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500 rounded-2xl text-slate-950 shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-sans">วิธีนำไอคอนแอพร้านไปไว้ที่หน้าจอโฮม</h3>
                  <p className="text-[10px] text-slate-400 font-mono">INSTALLATION MANUAL • MOBILE PWA INTERFACE</p>
                </div>
              </div>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              
              {/* Logo Preview */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center space-x-4">
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden text-amber-400 shadow-md shrink-0 border-2 border-amber-400">
                  {shopConfig?.logoUrl ? (
                    <img 
                      src={shopConfig.logoUrl} 
                      alt={shopConfig.shopName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <Scissors className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900">{shopConfig.shopName}</h4>
                  <p className="text-[11px] text-slate-500">นี่คือโลโก้และชื่อร้านที่ระบบจะนำไปติดตั้งเป็นไอคอนบนโทรศัพท์ของคุณโดยอัตโนมัติ!</p>
                </div>
              </div>

              {/* In-App Browser Warning Block */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-rose-800 font-bold">
                  <span className="text-base">⚠️</span>
                  <span className="text-xs font-sans">สำคัญมาก: ห้ามทำในแชท LINE / Facebook!</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed font-sans">
                  หากคุณกดเข้าเว็บนี้มาจากห้องแชทใน LINE, Messenger, หรือ Facebook เมนู "เพิ่มไปยังหน้าจอโฮม" จะไม่ปรากฏขึ้น <strong>กรุณากดเปิดด้วย Safari (บน iPhone) หรือ Chrome (บน Android) เท่านั้น</strong>
                </p>
              </div>

              {/* OS Tabs */}
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setInstallTab('ios')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    installTab === 'ios'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  iPhone / iPad (iOS)
                </button>
                <button
                  onClick={() => setInstallTab('android')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    installTab === 'android'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Android (Chrome)
                </button>
              </div>

              {/* Step By Step Guide */}
              <div className="space-y-4 font-sans text-xs">
                {installTab === 'ios' ? (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="font-extrabold text-slate-900">เปิดแอปเบราว์เซอร์ Safari</p>
                        <p className="text-slate-500 mt-1">คัดลอก URL ของเว็บนี้ หรือหากเข้าผ่าน LINE ให้กดปุ่มแชร์ที่มุมขวาล่างแล้วกด <strong>"เปิดด้วย Safari" (Open in Safari)</strong></p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          กดปุ่ม <span className="p-1 bg-slate-100 rounded-md inline-block"><Share className="w-3.5 h-3.5 text-slate-700" /></span> แชร์ (Share) ด้านล่าง
                        </p>
                        <p className="text-slate-500 mt-1">มองหาปุ่มสี่เหลี่ยมที่มีลูกศรชี้ขึ้นตรงกึ่งกลางด้านล่างสุดของจอ Safari</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                      <div>
                        <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          เลื่อนลงมาแล้วเลือกเมนู <span className="font-bold text-slate-950 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Plus className="w-3 h-3" /> "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</span>
                        </p>
                        <p className="text-slate-500 mt-1">หากหาไม่เจอ ให้เลื่อนลงไปด้านล่างรายการแชร์ส่วนกลาง</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</span>
                      <div>
                        <p className="font-extrabold text-slate-900">กดปุ่ม "เพิ่ม" (Add) ที่มุมขวาบน</p>
                        <p className="text-slate-500 mt-1">หน้าจอจะพากลับไปหน้าโฮมของโทรศัพท์ และพบกับไอคอนโลโก้ร้านสุดหรูของคุณ กดปุ่มนั้นเพื่อเข้าใช้งานโปรแกรมได้ทันที!</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="font-extrabold text-slate-900">เปิดแอป Google Chrome</p>
                        <p className="text-slate-500 mt-1">ตรวจสอบให้แน่ใจว่าได้เปิดเว็บไซต์นี้ผ่านแอปเบราว์เซอร์หลัก Google Chrome แล้ว</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          กดปุ่ม <span className="p-1 bg-slate-100 rounded-md inline-block"><MoreVertical className="w-3.5 h-3.5 text-slate-700" /></span> เมนูสามจุดที่มุมขวาบน
                        </p>
                        <p className="text-slate-500 mt-1">มองหาปุ่มเมนูหลักของแอป Chrome ตรงมุมขวาบนสุดของหน้าจอ</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                      <div>
                        <p className="font-extrabold text-slate-900">
                          กดเลือก <span className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded">"เพิ่มลงในหน้าจอหลัก" (Add to Home screen)</span> หรือ <span className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded">"ติดตั้งแอป" (Install app)</span>
                        </p>
                        <p className="text-slate-500 mt-1">ปุ่มนี้จะทำให้โทรศัพท์มองเป็นแอปพลิเคชันอย่างสมบูรณ์แบบ</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</span>
                      <div>
                        <p className="font-extrabold text-slate-900">กดปุ่ม "เพิ่ม" (Add) เพื่อยืนยัน</p>
                        <p className="text-slate-500 mt-1">เสร็จสิ้น! ระบบจะสร้างไอคอนแอพพร้อมโลโก้ร้านไว้ที่หน้าจอหลัก สามารถลากจัดวางตำแหน่งได้ตามสะดวก</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                เข้าใจแล้ว (ปิดหน้าต่าง)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Annual Reset Modal (1 Year Popup Warning & Report Export) */}
      <AnnualResetModal
        isOpen={showAnnualResetModal}
        onCloseToday={handleCloseAnnualModalToday}
        firstLoginDate={firstLoginDate}
        daysElapsed={annualDaysElapsed}
        daysRemaining={annualDaysRemaining}
        userEmail={userEmail || ''}
        sales={correctedSales}
        expenses={expenses}
        barbers={barbers}
        products={products}
        chemicalPromos={chemicalPromos}
        shareConfig={shareConfig}
        shopConfig={shopConfig}
        vouchers={vouchers}
        members={members}
        memberPackages={memberPackages}
        payslips={payslips}
        cashCounter={cashCounter}
        shopName={shopConfig.shopName}
        onOpenDeleteMonthModal={handleOpenDeleteMonthModal}
        onTriggerFactoryResetNow={() => {
          setShowAnnualResetModal(false);
          confirmFullReset();
        }}
      />

      {/* Delete Specific Month Modal */}
      <DeleteMonthModal
        isOpen={deleteMonthModalState.isOpen}
        onClose={() => setDeleteMonthModalState({ isOpen: false, initialMonth: undefined })}
        initialMonth={deleteMonthModalState.initialMonth}
        sales={correctedSales}
        expenses={expenses}
        payslips={payslips}
        shopConfig={shopConfig}
        onDeleteMonth={handleDeleteMonthData}
      />

      {/* 6. Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="logout-confirm-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center space-y-5">
            
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
              <LogOut className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold font-sans text-slate-900">ยืนยันออกจากระบบ?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans px-2">
                เมื่อออกจากระบบแล้ว คุณจะกลับไปที่หน้ากรอกอีเมล (ข้อมูลร้านค้าและประวัติรายการของคุณจะถูกบันทึกไว้อย่างปลอดภัย ไม่สูญหาย)
              </p>
            </div>
            
            <div className="flex w-full gap-3 font-sans">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-500/10"
              >
                ออกจากระบบ
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 7. Custom Clear Sales Confirmation Modal */}
      {showClearSalesConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="clear-sales-confirm-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center space-y-5">
            
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold font-sans text-slate-900">ยืนยันลบประวัติบิลทั้งหมด?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans px-2">
                <strong>คำเตือน:</strong> คุณแน่ใจหรือไม่ที่จะลบประวัติบิลยอดขายทั้งหมดออก? ข้อมูลบนระบบคลาวด์จะถูกลบออกอย่างถาวรและไม่สามารถกู้คืนได้
              </p>
            </div>
            
            <div className="flex w-full gap-3 font-sans">
              <button
                onClick={() => setShowClearSalesConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmClearSales}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/10"
              >
                ลบประวัติทั้งหมด
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 8. Custom Factory Reset Confirmation Modal */}
      {showFullResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="full-reset-confirm-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center space-y-5">
            
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm animate-bounce">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold font-sans text-rose-600">🚨 คืนค่าเริ่มต้นจากโรงงาน?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans px-2">
                ระบบจะทำการล้างข้อมูลลูกค้า ช่างตัดผม รายการสินค้า และประวัติทั้งหมดของคุณออกจากระบบคลาวด์และถอนบัญชีออกอย่างสมบูรณ์
              </p>
            </div>
            
            <div className="flex w-full gap-3 font-sans">
              <button
                onClick={() => setShowFullResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmFullReset}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-600/10"
              >
                ยืนยันการคืนค่า
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 9. Floating Pending Sync Indicator (Corner of screen) */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowSyncModal(true)}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md text-xs font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer border ${
            !isOnline
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-amber-950/40'
              : isSyncing
              ? 'bg-indigo-950/90 text-indigo-200 border-indigo-500/50 shadow-indigo-950/40'
              : pendingSyncCount > 0
              ? 'bg-amber-900/90 text-amber-200 border-amber-500/50 shadow-amber-950/40 animate-pulse'
              : 'bg-slate-900/90 text-emerald-400 border-slate-700/80 hover:border-emerald-500/50 shadow-slate-950/40'
          }`}
          title="คลิกเพื่อตรวจสอบสถานะการบันทึกและซิงก์ข้อมูลออฟไลน์"
        >
          {!isOnline ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span className="font-mono">โหมดออฟไลน์</span>
              {pendingSyncCount > 0 && (
                <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  ค้าง {pendingSyncCount}
                </span>
              )}
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="font-mono">กำลังซิงก์...</span>
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="font-mono">รอซิงก์ {pendingSyncCount} รายการ</span>
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md text-[10px] font-black hover:bg-white transition-colors">
                ซิงก์ทันที
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500"></span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-slate-200 text-[11px]">ซิงก์คลาวด์ 100%</span>
            </>
          )}
        </button>
      </div>

      {/* 10. Sync Status Details Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="sync-status-modal">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-sans">สถานะการบันทึกและซิงก์ข้อมูล</h3>
                  <p className="text-[10px] text-slate-400 font-mono">OFFLINE-FIRST REAL-TIME CLOUD SYNC</p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-semibold">สัญญาณอินเทอร์เน็ต:</span>
                <span className={`font-extrabold font-mono px-3 py-1 rounded-full text-[11px] ${
                  isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {isOnline ? '🟢 ออนไลน์ (Online)' : '📡 ออฟไลน์ (Offline Mode)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-semibold">รายการรออัปโหลดเข้าคลาวด์ (Pending Sync):</span>
                <span className="font-extrabold font-mono text-slate-900 text-sm">
                  {pendingSyncCount} รายการ
                </span>
              </div>

              <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200/80 text-amber-900 space-y-1.5">
                <p className="font-bold text-xs flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ระบบบันทึกแบบ Offline-First ทำงานได้ 100%</span>
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  แม้เน็ตหลุด หลุดสัญญาณ หรือออฟไลน์ ระบบ POS จะบันทึกยอดขาย ตัดสต็อก คิดค่าคอมมิชชันลงในเครื่องทันที และจะอัปโหลดขี้นคลาวด์อัตโนมัติเมื่อเชื่อมต่อเน็ตสำเร็จ
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              {isOnline && (
                <button
                  onClick={triggerManualSync}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'กำลังซิงก์...' : 'กดสั่งซิงก์เข้าคลาวด์ทันที'}</span>
                </button>
              )}
              <button
                onClick={() => setShowSyncModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Security PIN Protection Modal for Settings */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          if (activeTab === 'config' && !isSettingsUnlocked) {
            setActiveTab('sales');
          }
        }}
        onSuccess={handlePinSuccess}
        correctPin={shopConfig?.pinCode || '1234'}
        shopName={shopConfig?.shopName || 'ร้านบาร์เบอร์'}
      />

    </div>
  );
}
