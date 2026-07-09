import React, { useState, useEffect, useMemo } from 'react';
import { Barber, Product, ShareConfig, SaleRecord, ShopConfig, Voucher, Payslip, Expense, ChemicalPromo, Booking, CashCounterState } from './types';
import { 
  INITIAL_BARBERS, 
  INITIAL_PRODUCTS, 
  INITIAL_CHEMICAL_PROMOS,
  DEFAULT_SHARE_CONFIG, 
  DEFAULT_SHOP_CONFIG, 
  getSeededSales 
} from './data';
import SalesTab from './components/SalesTab';
import DashboardTab from './components/DashboardTab';
import ConfigTab from './components/ConfigTab';
import CashCounterTab from './components/CashCounterTab';
import PayslipsTab from './components/PayslipsTab';
import BookingsTab from './components/BookingsTab';
import UserGuideModal from './components/UserGuideModal';
import { 
  Scissors, 
  LayoutDashboard, 
  Settings, 
  Calendar, 
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
  BookOpen,
  AlertTriangle,
  Trash2
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

// Helper functions for dynamic brand color generation
function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function generateShade(baseHex: string, targetLightness: number): string {
  try {
    const { h, s } = hexToHsl(baseHex);
    return `hsl(${h}, ${s}%, ${targetLightness}%)`;
  } catch (e) {
    return baseHex;
  }
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

  const [barbers, setBarbers] = useState<Barber[]>(INITIAL_BARBERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [chemicalPromos, setChemicalPromos] = useState<ChemicalPromo[]>(INITIAL_CHEMICAL_PROMOS);
  const [shareConfig, setShareConfig] = useState<ShareConfig>(DEFAULT_SHARE_CONFIG);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);

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
          chemicalDiscountAmount = Math.round((chemicalPrice * s.chemicalDiscountValue) / 100);
        } else {
          chemicalDiscountAmount = Math.min(chemicalPrice, s.chemicalDiscountValue);
        }
      }

      const actualChemicalPrice = Math.max(0, chemicalPrice - chemicalDiscountAmount);

      const promoDiscountPct = shareConfig.promoDiscountPct ?? 10;
      const discount10Amount = s.useDiscountPct10 ? Math.round((haircutPrice * promoDiscountPct) / 100) : 0;
      const voucherValue = s.useVoucherValue || 0;

      const totalDiscounts = discount10Amount + voucherValue + chemicalDiscountAmount;
      const customerPaid = Math.max(0, subtotal - totalDiscounts) + tip;

      // Shares with precise decimal rounding (e.g. 7% of 110 becomes 7.70 Baht)
      // Check if the record already has the calculated shares to prevent overriding historical commission settings
      const barberHaircutShare = s.barberHaircutShare !== undefined ? s.barberHaircutShare : Math.round(haircutPrice * shareConfig.haircutBarberPct) / 100;
      const barberChemicalShare = s.barberChemicalShare !== undefined ? s.barberChemicalShare : Math.round(actualChemicalPrice * shareConfig.chemicalBarberPct) / 100;
      const barberProductShare = s.barberProductShare !== undefined ? s.barberProductShare : Math.round(productPrice * shareConfig.productBarberPct) / 100;
      const barberTotalShare = s.barberTotalShare !== undefined ? s.barberTotalShare : Math.round((barberHaircutShare + barberChemicalShare + barberProductShare + tip) * 100) / 100;
      const shopTotalShare = s.shopTotalShare !== undefined ? s.shopTotalShare : Math.round((Math.max(0, subtotal - totalDiscounts) - (barberHaircutShare + barberChemicalShare + barberProductShare)) * 100) / 100;

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cashCounter, setCashCounter] = useState<CashCounterState | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'dashboard' | 'config' | 'cash' | 'payslips' | 'bookings'>('sales');
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
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
        const localBookings = localStorage.getItem(`barber_pos_bookings${suffix}`) || localStorage.getItem(`barber_pos_bookings_${userEmail}`);
        const localCashCounter = localStorage.getItem(`barber_pos_cash_counter${suffix}`) || localStorage.getItem(`barber_pos_cash_counter_${userEmail}`);

        if (localBarbers) setBarbers(JSON.parse(localBarbers));
        if (localProducts) setProducts(JSON.parse(localProducts));
        if (localChemicalPromos) setChemicalPromos(JSON.parse(localChemicalPromos));
        if (localShareConfig) setShareConfig(JSON.parse(localShareConfig));
        if (localShopConfig) {
          const parsed = JSON.parse(localShopConfig);
          setShopConfig({
            shopName: "ระบบร้านบาร์เบอร์ POS ของคุณ",
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
        if (localBookings) setBookings(JSON.parse(localBookings));
        if (localCashCounter) setCashCounter(JSON.parse(localCashCounter));
      } catch (err) {
        console.warn("⚠️ Failed to preload cached data:", err);
      }

      try {
        const salonDocRef = doc(db, "salons", userEmail);
        
        // 1. Initial existence & seeding check
        const salonSnap = await getDoc(salonDocRef);
        if (!salonSnap.exists()) {
          const isGuest = userEmail === "guest@gmail.com";
          const defaultSalon = {
            shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ระบบร้านบาร์เบอร์ POS ของคุณ",
            shareConfig: DEFAULT_SHARE_CONFIG,
            shopConfig: {
              shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ระบบร้านบาร์เบอร์ POS ของคุณ",
              pinCode: "",
              isPinLocked: false
            },
            barbers: isGuest ? INITIAL_BARBERS : [
              { id: "b-guide", name: "ช่างตัวอย่างสาธิต (Guide Barber)", isWorking: true, realName: "จิรภัทร รักสยาม", position: "Hairdresser" }
            ],
            products: isGuest ? INITIAL_PRODUCTS : [
              { id: "p-guide", name: "สินค้าวินเทจจัดทรงผม (Guide Product)", price: 120, isActive: true }
            ],
            chemicalPromos: INITIAL_CHEMICAL_PROMOS,
            vouchers: isGuest ? [
              { id: "v1", value: 20, isActive: true },
              { id: "v2", value: 50, isActive: true }
            ] : [
              { id: "v-guide", value: 50, isActive: true }
            ],
            payslips: [],
            expenses: [],
            bookings: [],
            lastResetDate: todayStr,
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

        // 2. Setup Real-time Snapshot on main Salon Document
        unsubSalon = onSnapshot(salonDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const salonData = docSnap.data();
            const lastResetDate = salonData.lastResetDate || "";
            let finalBarbers = salonData.barbers || [];

            // Add back default isWorking attribute if missing
            finalBarbers = finalBarbers.map((b: any) => ({
              ...b,
              isWorking: typeof b.isWorking === 'boolean' ? b.isWorking : true
            }));

            // Check Daily Reset
            if (lastResetDate !== todayStr) {
              console.log(`⏰ [Daily Reset] วันใหม่ล่วงเลยมาถึงแล้ว (${lastResetDate} -> ${todayStr}) ทำการรีเซ็ตสถานะช่างให้ 'มาทำงาน' ทุกคน (Online)`);
              finalBarbers = finalBarbers.map((b: any) => ({
                ...b,
                isWorking: true
              }));
              
              setDoc(salonDocRef, { 
                barbers: finalBarbers, 
                lastResetDate: todayStr, 
                updatedAt: new Date().toISOString() 
              }, { merge: true })
                .catch(err => console.error("🔴 [Daily Reset] บันทึกรีเซ็ตรายชื่อช่างไม่สำเร็จ:", err));
                
              localStorage.setItem(`barber_pos_last_reset_date_${userEmail}`, todayStr);
              localStorage.setItem(`barber_pos_barbers_${userEmail}`, JSON.stringify(finalBarbers));
            } else {
              localStorage.setItem(`barber_pos_last_reset_date_${userEmail}`, todayStr);
            }

            // Cleanup bookings
            const rawBookings = salonData.bookings || [];
            const activeBookings = rawBookings.filter((b: any) => b.date >= todayStr);
            if (activeBookings.length !== rawBookings.length) {
              console.log(`🧹 [Auto-Cleanup] ลบรายการจองคิวที่ล่วงเลยวันไปแล้ว (${rawBookings.length - activeBookings.length} รายการ)`);
              const cleanedData = cleanUndefined({ bookings: activeBookings, updatedAt: new Date().toISOString() });
              setDoc(salonDocRef, cleanedData, { merge: true }).catch(err => console.error("Auto cleanup error saving to firestore:", err));
            }

            // Update States
            setBarbers(finalBarbers);
            setProducts(salonData.products || []);
            setChemicalPromos(salonData.chemicalPromos || INITIAL_CHEMICAL_PROMOS);
            setShareConfig(salonData.shareConfig || DEFAULT_SHARE_CONFIG);
            setShopConfig({
              shopName: salonData.shopName || "ระบบร้านบาร์เบอร์ POS ของคุณ",
              pinCode: "",
              isPinLocked: false,
              logoUrl: "",
              ...(salonData.shopConfig || {})
            });
            setVouchers(salonData.vouchers || []);
            setPayslips(salonData.payslips || []);
            setExpenses(salonData.expenses || []);
            setBookings(activeBookings);
            setCashCounter(salonData.cashCounter || null);
            setIsLoading(false);
          }
        }, (err) => {
          console.error("🔴 [Firebase Client] Salon Snapshot Error:", err);
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
            const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            if (diff !== 0) return diff;
            return b.id.localeCompare(a.id);
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
                      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                      if (diff !== 0) return diff;
                      return b.id.localeCompare(a.id);
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
          console.error("🔴 [Firebase Client] Sales Snapshot Error:", err);
          handleFirestoreError(err, OperationType.LIST, `salons/${userEmail}/sales`);
        });

      } catch (err: any) {
        console.error("🔴 [Firebase Client] Setup real-time listeners failed:", err);
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
    if (!userEmail || isLoading) return;
    localStorage.setItem(`barber_pos_bookings_${userEmail}`, JSON.stringify(bookings));
  }, [bookings, userEmail, isLoading]);

  useEffect(() => {
    if (!userEmail || isLoading || !cashCounter) return;
    localStorage.setItem(`barber_pos_cash_counter_${userEmail}`, JSON.stringify(cashCounter));
  }, [cashCounter, userEmail, isLoading]);


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
    
    const fullyQualifiedRecord: SaleRecord = {
      ...newOmitRecord,
      id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: newOmitRecord.timestamp || now.toISOString(),
      date: newOmitRecord.date || formattedDate
    };

    // Clean undefined fields recursively so Firestore doesn't reject the save request
    const cleanRecord = cleanUndefined(fullyQualifiedRecord);

    // Optimistic state updates
    setSales((prev) => [cleanRecord, ...prev]);

    // Atomic insert doc on subcollection salons/{email}/sales
    const saleDocRef = doc(db, "salons", userEmail, "sales", cleanRecord.id);
    setDoc(saleDocRef, cleanRecord)
      .then(() => {
        console.log("🟢 [Firebase] บันทึกข้อมูลสำเร็จ (Saved record successfully) ID:", fullyQualifiedRecord.id);
      })
      .catch((err) => {
        console.error("🔴 [Firebase] บันทึกบิลเก็บเงินบนคลาวด์ขัดข้อง:", err);
        handleFirestoreError(err, OperationType.WRITE, `salons/${userEmail}/sales/${fullyQualifiedRecord.id}`);
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
        console.error("🔴 [Firebase] บันทึกประวัติบิลไม่ได้:", err);
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}/sales`);
      });
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
        console.error("🔴 [Firebase] การเขียนข้อมูลขัดข้อง ลบบิลปลายทางไม่พบคีย์:", err);
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}/sales/${saleId}`);
      });
  };

  const handleUpdateSalePaymentMethod = (saleId: string, newMethod: 'cash' | 'transfer') => {
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
        console.error("🔴 [Firebase] ปรับปรุงช่องทางชำระเงินขัดข้อง:", err);
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}/sales/${saleId}`);
      });
  };

  const handleUpdateSale = (saleId: string, updates: Partial<SaleRecord>) => {
    if (!userEmail) return;

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, ...updates } : s))
    );

    const docRef = doc(db, "salons", userEmail, "sales", saleId);
    setDoc(docRef, updates, { merge: true })
      .then(() => {
        console.log(`🟢 [Firebase] บันทึกการแก้ไขบิลสำเร็จ ID:`, saleId);
      })
      .catch((err) => {
        console.error("🔴 [Firebase] บันทึกการแก้ไขบิลขัดข้อง:", err);
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}/sales/${saleId}`);
      });
  };

  const handleFullReset = () => {
    setShowFullResetConfirm(true);
  };

  const confirmFullReset = () => {
    if (!userEmail) return;
    setShowFullResetConfirm(false);
    setIsLoading(true);
    
    const suffix = `_${userEmail}`;
    localStorage.removeItem(`barber_pos_barbers${suffix}`);
    localStorage.removeItem(`barber_pos_products${suffix}`);
    localStorage.removeItem(`barber_pos_chemical_promos${suffix}`);
    localStorage.removeItem(`barber_pos_share_config${suffix}`);
    localStorage.removeItem(`barber_pos_shop_config${suffix}`);
    localStorage.removeItem(`barber_pos_vouchers${suffix}`);
    localStorage.removeItem(`barber_pos_sales${suffix}`);
    localStorage.removeItem(`barber_pos_payslips${suffix}`);
    
    localStorage.removeItem(`barber_pos_barbers_${userEmail}`);
    localStorage.removeItem(`barber_pos_products_${userEmail}`);
    localStorage.removeItem(`barber_pos_chemical_promos_${userEmail}`);
    localStorage.removeItem(`barber_pos_share_config_${userEmail}`);
    localStorage.removeItem(`barber_pos_shop_config_${userEmail}`);
    localStorage.removeItem(`barber_pos_vouchers_${userEmail}`);
    localStorage.removeItem(`barber_pos_sales_${userEmail}`);
    localStorage.removeItem(`barber_pos_payslips_${userEmail}`);
    
    localStorage.removeItem('barber_pos_user_email');

    const isGuest = userEmail === "guest@gmail.com";
    const freshData = {
      shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ระบบร้านบาร์เบอร์ POS ของคุณ",
      shareConfig: DEFAULT_SHARE_CONFIG,
      shopConfig: {
        shopName: isGuest ? "ทองหล่อ บาร์เบอร์ สตูดิโอ" : "ระบบร้านบาร์เบอร์ POS ของคุณ",
        pinCode: "",
        isPinLocked: false
      },
      barbers: isGuest ? INITIAL_BARBERS : [
        { id: "b-guide", name: "ช่างตัวอย่างสาธิต (Guide Barber)", isWorking: true, realName: "จิรภัทร รักสยาม", position: "Hairdresser" }
      ],
      products: isGuest ? INITIAL_PRODUCTS : [
        { id: "p-guide", name: "สินค้าวินเทจจัดทรงผม (Guide Product)", price: 120, isActive: true }
      ],
      chemicalPromos: INITIAL_CHEMICAL_PROMOS,
      vouchers: isGuest ? [
        { id: "v1", value: 20, isActive: true },
        { id: "v2", value: 50, isActive: true }
      ] : [
        { id: "v-guide", value: 50, isActive: true }
      ],
      payslips: [],
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

        setUserEmail(null);
        setBarbers([]);
        setProducts([]);
        setSales([]);
        setPayslips([]);
        setIsLoading(false);
      } catch (err: any) {
        console.error("🔴 [Firebase] กระบวนการคืนค่าเริ่มต้นขัดข้อง:", err);
        handleFirestoreError(err, OperationType.DELETE, `salons/${userEmail}`);
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
        console.error("🔴 [Firebase] บันทึกรายชื่อช่างไม่สำเร็จ:", err);
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
        console.error("🔴 [Firebase] บันทึกรายการสินค้าขัดข้อง:", err);
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
        console.error("🔴 [Firebase] บันทึกรายการส่วนลดเคมีขัดข้อง:", err);
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
        console.error("🔴 [Firebase] บันทึกอัตราส่วนส่วนแบ่งรายได้ช่างล้มเหลว:", err);
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
        console.error("🔴 [Firebase] บันทึกชื่อและระบบป้องกันของหน้าร้านล้มเหลว:", err);
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
        console.error("🔴 [Firebase] การบันทึกปรับปรุงรหัสส่วนลดไม่สำเร็จ:", err);
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
        console.error("🔴 [Firebase] การทำรายการชาร์ทประวัติเบิกเงินเดสเพลย์ไม่ได้:", err);
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
        console.error("🔴 [Firebase] บันทึกรายจ่ายของหน้าร้านล้มเหลว:", err);
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
      });
  };

  const handleUpdateBookings = (updatedBookings: Booking[]) => {
    if (!userEmail) return;
    setBookings(updatedBookings);
    
    const docRef = doc(db, "salons", userEmail);
    const cleanedData = cleanUndefined({ bookings: updatedBookings, updatedAt: new Date().toISOString() });
    setDoc(docRef, cleanedData, { merge: true })
      .then(() => {
        console.log("🟢 [Firebase] บันทึกตารางคิวจองสำเร็จ (Set bookings successfully)");
      })
      .catch((err) => {
        console.error("🔴 [Firebase] บันทึกตารางคิวจองล้มเหลว:", err);
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
        console.error("🔴 [Firebase] บันทึกข้อมูลนับเงินสดล้มเหลว:", err);
        handleFirestoreError(err, OperationType.UPDATE, `salons/${userEmail}`);
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
    setShowLogoutConfirm(false);
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans antialiased py-12 px-4 selection:bg-indigo-500 selection:text-white" id="login-screen">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/50 space-y-8">
          
          {/* Minimalist Header */}
          <div className="text-center space-y-4">
            <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-400 shadow-sm mx-auto">
              <Scissors className="w-5.5 h-5.5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Barber POS</h1>
              <p className="text-xs text-slate-450 font-medium">กรุณากรอกบัญชีอีเมลร้านค้าเพื่อเข้าใช้งาน</p>
            </div>
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
                  placeholder="เช่น thonglor.barber@gmail.com"
                  className={`w-full px-4 py-3 border rounded-xl outline-none text-sm font-medium transition-all ${
                    isEmailFocused 
                      ? 'border-indigo-600 ring-2 ring-indigo-50/70 bg-white text-slate-900' 
                      : 'border-slate-200 bg-slate-50/50 text-slate-800 hover:border-slate-300 focus:bg-white'
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
              className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-300" />
              <span>เข้าสู่พื้นที่ร้านค้าของคุณ</span>
            </button>
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
            <p className="text-[11px] text-slate-500">ระบบฐานข้อมูลกำลังคัดสรรข้อมูลของบัญชี {userEmail}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      
      {/* Dynamic Brand Color Overrides */}
      {shopConfig?.primaryColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-indigo-50: ${generateShade(shopConfig.primaryColor, 97)};
            --color-indigo-100: ${generateShade(shopConfig.primaryColor, 92)};
            --color-indigo-200: ${generateShade(shopConfig.primaryColor, 84)};
            --color-indigo-300: ${generateShade(shopConfig.primaryColor, 72)};
            --color-indigo-400: ${generateShade(shopConfig.primaryColor, 60)};
            --color-indigo-500: ${generateShade(shopConfig.primaryColor, 50)};
            --color-indigo-600: ${shopConfig.primaryColor};
            --color-indigo-700: ${generateShade(shopConfig.primaryColor, 38)};
            --color-indigo-800: ${generateShade(shopConfig.primaryColor, 28)};
            --color-indigo-900: ${generateShade(shopConfig.primaryColor, 18)};
            --color-indigo-950: ${generateShade(shopConfig.primaryColor, 10)};
            
            --brand-primary: ${shopConfig.primaryColor};
            --brand-hover: ${generateShade(shopConfig.primaryColor, 38)};
          }
          
          /* Custom selections */
          ::selection {
            background-color: ${shopConfig.primaryColor} !important;
            color: #ffffff !important;
          }
          
          /* Custom overrides for input focus states */
          input:focus, select:focus, textarea:focus {
            border-color: ${shopConfig.primaryColor} !important;
            --tw-ring-color: ${shopConfig.primaryColor} !important;
            box-shadow: 0 0 0 2px ${generateShade(shopConfig.primaryColor, 90)}, 0 0 0 4px ${generateShade(shopConfig.primaryColor, 95)} !important;
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
            background: ${generateShade(shopConfig.primaryColor, 75)};
            border-radius: 999px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: ${shopConfig.primaryColor};
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
        `}} />
      )}
      
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
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50" title="ฐานข้อมูลและทุกเครื่องอัปเดตตรงกันเรียลไทม์ 100%">
                    <span className="relative flex h-1.5 w-1.5 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>เรียลไทม์ ซิงก์สด 🟢</span>
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
              <button
                onClick={() => setActiveTab('sales')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'sales'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Scissors className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>1. หน้าบันทึกการขาย</span>
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'bookings'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>2. ระบบจองคิว</span>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500" />
                <span>3. Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('cash')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'cash'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                <span>4. นับเงินสด</span>
              </button>

              <button
                onClick={() => setActiveTab('payslips')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'payslips'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>5. สลิปเงินเดือน</span>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'config'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-indigo-500" />
                <span>6. ตั้งค่า</span>
              </button>
            </nav>

            {/* Tenant details & Logout */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4 h-8 self-center">
              <div className="text-right">
                {firebaseStatus === 'connected' && (
                  <p className="text-[10px] text-emerald-600 font-mono flex items-center justify-end gap-1 font-bold" title="เชื่อมต่อกับ Cloud Firestore สำเร็จ ข้อมูลจะบันทึกและซิงก์สดทันที">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Wifi className="w-3 h-3 text-emerald-500 inline" />
                    <span>เรียลไทม์ ซิงก์สด 🟢</span>
                  </p>
                )}
                {firebaseStatus === 'checking' && (
                  <p className="text-[10px] text-amber-600 font-mono flex items-center justify-end gap-1 font-bold" title="กำลังเตรียมการและตรวจเช็คเครือข่ายความสมบูรณ์ฐานข้อมูล...">
                    <RefreshCw className="w-3 h-3 text-amber-500 animate-spin inline" />
                    <span>กำลังซิงก์ข้อมูล...</span>
                  </p>
                )}
                {firebaseStatus === 'error' && (
                  <p className="text-[10px] text-rose-600 font-mono flex items-center justify-end gap-1 font-bold" title={`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${firebaseErrorMessage}`}>
                    <WifiOff className="w-3 h-3 text-rose-500 inline animate-bounce" />
                    <span>ขัดข้องออฟไลน์ (ดู F12)</span>
                  </p>
                )}
                <p className="text-xs font-bold text-slate-700 max-w-[140px] truncate" title={userEmail}>
                  {userEmail}
                </p>
              </div>
              <button
                onClick={() => setShowUserGuide(true)}
                className="relative overflow-hidden group flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition-all duration-300 cursor-pointer shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0"
                title="คู่มือการใช้งานระบบและ POS อย่างละเอียด"
              >
                <BookOpen className="w-4 h-4 text-white animate-pulse" />
                <span className="font-sans">คู่มือระบบอัจฉริยะ</span>
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
                </span>
              </button>
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
              onSaveSale={handleSaveSale}
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
            />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="tab-content-enter">
            <ConfigTab
              barbers={barbers}
              products={products}
              chemicalPromos={chemicalPromos}
              shareConfig={shareConfig}
              shopConfig={shopConfig}
              vouchers={vouchers}
              salesCount={correctedSales.length}
              onUpdateBarbers={handleUpdateBarbers}
              onUpdateProducts={handleUpdateProducts}
              onUpdateChemicalPromos={handleUpdateChemicalPromos}
              onUpdateShareConfig={handleUpdateShareConfig}
              onUpdateShopConfig={handleUpdateShopConfig}
              onUpdateVouchers={handleUpdateVouchers}
              onClearSales={handleClearSales}
              onFullReset={handleFullReset}
            />
          </div>
        )}

        {activeTab === 'cash' && (
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

        {activeTab === 'payslips' && (
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

        {activeTab === 'bookings' && (
          <div className="tab-content-enter">
            <BookingsTab 
              bookings={bookings}
              barbers={barbers}
              onUpdateBookings={handleUpdateBookings}
              shareConfig={shareConfig}
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

      {/* 5. Complete Interactive User Guide Modal */}
      <UserGuideModal 
        isOpen={showUserGuide} 
        onClose={() => setShowUserGuide(false)} 
        shopConfig={shopConfig} 
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
                คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบสาขานี้? หากออกจากระบบแล้ว คุณจะต้องกรอกอีเมลเพื่อเข้าใช้บริการใหม่อีกครั้ง
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

    </div>
  );
}
