import React, { useState, useEffect } from 'react';
import { Barber, Product, ShareConfig, ShopConfig, Voucher, ChemicalPromo } from '../types';
import { formatBaht, formatThaiDate } from '../utils';
import { 
  THEME_PRESETS, 
  generateShade, 
  getShadePalette, 
  QUICK_BRAND_COLORS 
} from '../themes';
import { 
  Users, 
  Settings, 
  ShoppingBag, 
  Percent, 
  Gift, 
  Store, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Edit3, 
  Power,
  AlertCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Upload,
  Mail,
  Briefcase,
  DollarSign,
  Palette,
  Pipette,
  Copy,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
  Tag,
  RotateCcw,
  RefreshCw,
  Clock,
  Calendar,
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Download,
  FileText,
  Package,
  Database
} from 'lucide-react';

interface ConfigTabProps {
  userEmail?: string | null;
  barbers: Barber[];
  products: Product[];
  chemicalPromos?: ChemicalPromo[];
  shareConfig: ShareConfig;
  shopConfig: ShopConfig;
  vouchers: Voucher[];
  firstLoginDate?: string;
  annualDaysElapsed?: number;
  annualDaysRemaining?: number;
  onOpenAnnualModal?: () => void;
  onDownloadFullBackup?: () => void;
  onLockSettingsNow?: () => void;
  onUpdateBarbers: (barbers: Barber[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateChemicalPromos?: (promos: ChemicalPromo[]) => void;
  onUpdateShareConfig: (config: ShareConfig) => void;
  onUpdateShopConfig: (config: ShopConfig) => void;
  onUpdateVouchers: (vouchers: Voucher[]) => void;
  onClearSales?: () => void;
  onClearSalesOlderThanOneYear?: () => Promise<number>;
  onFullReset?: () => void;
  onOpenDeleteMonthModal?: (month?: string) => void;
}

export default function ConfigTab({
  userEmail,
  barbers,
  products,
  chemicalPromos,
  shareConfig,
  shopConfig,
  vouchers,
  firstLoginDate,
  annualDaysElapsed = 0,
  annualDaysRemaining = 30,
  onOpenAnnualModal,
  onDownloadFullBackup,
  onLockSettingsNow,
  onUpdateBarbers,
  onUpdateProducts,
  onUpdateChemicalPromos,
  onUpdateShareConfig,
  onUpdateShopConfig,
  onUpdateVouchers,
  onClearSales,
  onClearSalesOlderThanOneYear,
  onFullReset,
  onOpenDeleteMonthModal,
}: ConfigTabProps) {
  
  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Custom Alert Dialog State
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Re-ordering barbers
  const handleMoveBarberUp = (index: number) => {
    if (index === 0) return;
    const updated = [...barbers];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onUpdateBarbers(updated);
  };

  const handleMoveBarberDown = (index: number) => {
    if (index === barbers.length - 1) return;
    const updated = [...barbers];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onUpdateBarbers(updated);
  };

  // Re-ordering products
  const handleMoveProductUp = (index: number) => {
    if (index === 0) return;
    const updated = [...products];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onUpdateProducts(updated);
  };

  const handleMoveProductDown = (index: number) => {
    if (index === products.length - 1) return;
    const updated = [...products];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onUpdateProducts(updated);
  };

  // ==========================================
  // 1. SHOP IDENTITY & COLOR CONFIG
  // ==========================================
  const [shopNameInput, setShopNameInput] = useState<string>(shopConfig.shopName || 'ร้านบาร์เบอร์ของฉัน');
  const [shopLogoUrl, setShopLogoUrl] = useState<string>(shopConfig.logoUrl || '');
  const [billingCutoffDayInput, setBillingCutoffDayInput] = useState<number>(shopConfig.billingCutoffDay || 1);
  const [primaryColorInput, setPrimaryColorInput] = useState<string>(shopConfig.primaryColor || '#6366f1');
  const [themeInput, setThemeInput] = useState<string>(shopConfig.theme || 'indigo');
  const [enableCashCounterInput, setEnableCashCounterInput] = useState<boolean>(shopConfig.enableCashCounter !== false);
  const [enablePayslipsInput, setEnablePayslipsInput] = useState<boolean>(shopConfig.enablePayslips !== false);
  const [enableBookingsInput, setEnableBookingsInput] = useState<boolean>(shopConfig.enableBookings !== false);
  const [defaultBookingDurationInput, setDefaultBookingDurationInput] = useState<number>(shopConfig.defaultBookingDuration || 60);
  const [isShopSaved, setIsShopSaved] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);

  useEffect(() => {
    setShopNameInput(shopConfig.shopName || 'ร้านบาร์เบอร์ของฉัน');
    setShopLogoUrl(shopConfig.logoUrl || '');
    setBillingCutoffDayInput(shopConfig.billingCutoffDay || 1);
    setPrimaryColorInput(shopConfig.primaryColor || '#6366f1');
    setThemeInput(shopConfig.theme || 'indigo');
    setEnableCashCounterInput(shopConfig.enableCashCounter !== false);
    setEnablePayslipsInput(shopConfig.enablePayslips !== false);
    setEnableBookingsInput(shopConfig.enableBookings !== false);
    setDefaultBookingDurationInput(shopConfig.defaultBookingDuration || 60);
  }, [shopConfig]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setShopLogoUrl(compressedDataUrl);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบโลโก้ร้าน',
      message: 'คุณต้องการลบรูปภาพโลโก้ของร้านออกใช่หรือไม่?',
      type: 'warning',
      onConfirm: () => {
        setShopLogoUrl('');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetThemeDefault = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'รีเซ็ตธีมและโทนสีเป็นค่าเริ่มต้น?',
      message: 'คุณต้องการรีเซ็ตโทนสีและธีมของร้านกลับเป็นสีคราม (Indigo #6366f1) ค่าเริ่มต้นใช่หรือไม่?',
      type: 'warning',
      onConfirm: () => {
        setPrimaryColorInput('#6366f1');
        setThemeInput('indigo');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveShopConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateShopConfig({ 
      ...shopConfig,
      shopName: shopNameInput.trim() || 'ร้านบาร์เบอร์ของฉัน',
      logoUrl: shopLogoUrl,
      billingCutoffDay: billingCutoffDayInput,
      primaryColor: primaryColorInput,
      theme: themeInput,
      enableCashCounter: enableCashCounterInput,
      enablePayslips: enablePayslipsInput,
      enableBookings: enableBookingsInput,
      defaultBookingDuration: defaultBookingDurationInput
    });
    setIsShopSaved(true);
    setTimeout(() => setIsShopSaved(false), 3000);
  };

  // ==========================================
  // PIN LOCK SECURITY STATE
  // ==========================================
  const [pinCodeInput, setPinCodeInput] = useState<string>(shopConfig.pinCode || '1234');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [isPinLockedInput, setIsPinLockedInput] = useState<boolean>(shopConfig.isPinLocked ?? true);
  const [showPinCode, setShowPinCode] = useState<boolean>(false);
  const [pinStatusMsg, setPinStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setPinCodeInput(shopConfig.pinCode || '1234');
    setIsPinLockedInput(shopConfig.isPinLocked ?? true);
  }, [shopConfig.pinCode, shopConfig.isPinLocked]);

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPinLockedInput) {
      const cleanPin = pinCodeInput.trim();
      if (cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
        setPinStatusMsg({ type: 'error', text: 'กรุณาระบุรหัสผ่าน PIN เป็นตัวเลข 4 ถึง 6 หลักเท่านั้น' });
        return;
      }
      if (confirmPinInput && confirmPinInput !== cleanPin) {
        setPinStatusMsg({ type: 'error', text: 'รหัสยืนยัน PIN ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง' });
        return;
      }
      onUpdateShopConfig({
        ...shopConfig,
        pinCode: cleanPin,
        isPinLocked: true
      });
      setConfirmPinInput('');
      setPinStatusMsg({ type: 'success', text: `บันทึกรหัสผ่าน PIN (${cleanPin}) และเปิดใช้งานการล็อคหน้าตั้งค่าเรียบร้อยแล้ว!` });
      setTimeout(() => setPinStatusMsg(null), 4000);
    } else {
      onUpdateShopConfig({
        ...shopConfig,
        pinCode: '',
        isPinLocked: false
      });
      setPinCodeInput('');
      setConfirmPinInput('');
      setPinStatusMsg({ type: 'success', text: 'ปิดใช้งานการล็อค PIN เรียบร้อยแล้ว (สามารถเข้าหน้าตั้งค่าได้โดยไม่ต้องใส่รหัส)' });
      setTimeout(() => setPinStatusMsg(null), 4000);
    }
  };

  const handleDisablePin = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ปิดใช้งานระบบล็อครหัสผ่าน PIN?',
      message: 'หากปิดใช้งาน ทุกคนจะสามารถเข้าถึงหน้าตั้งค่าเพื่อดูข้อมูล ปรับราคา หรือจัดการช่างได้โดยไม่ต้องใส่รหัสผ่าน ต้องการดำเนินการต่อใช่หรือไม่?',
      type: 'warning',
      onConfirm: () => {
        setIsPinLockedInput(false);
        setPinCodeInput('');
        setConfirmPinInput('');
        onUpdateShopConfig({
          ...shopConfig,
          pinCode: '',
          isPinLocked: false
        });
        setPinStatusMsg({ type: 'success', text: 'ปิดใช้งานระบบล็อครหัส PIN เรียบร้อยแล้ว' });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setTimeout(() => setPinStatusMsg(null), 4000);
      }
    });
  };

  // ==========================================
  // 2. COMMISSION SHARES (%)
  // ==========================================
  const [haircutPct, setHaircutPct] = useState<number>(shareConfig.haircutBarberPct);
  const [chemicalPct, setChemicalPct] = useState<number>(shareConfig.chemicalBarberPct);
  const [productPct, setProductPct] = useState<number>(shareConfig.productBarberPct);
  const [showPromoDiscount, setShowPromoDiscount] = useState<boolean>(shareConfig.showPromoDiscount !== false);
  const [promoDiscountPct, setPromoDiscountPct] = useState<number>(shareConfig.promoDiscountPct ?? 10);
  const [enableChemicalService, setEnableChemicalService] = useState<boolean>(shareConfig.enableChemicalService !== false);
  const [enableProductSales, setEnableProductSales] = useState<boolean>(shareConfig.enableProductSales !== false);
  const [isShareSaved, setIsShareSaved] = useState<boolean>(false);

  useEffect(() => {
    setHaircutPct(shareConfig.haircutBarberPct);
    setChemicalPct(shareConfig.chemicalBarberPct);
    setProductPct(shareConfig.productBarberPct);
    setShowPromoDiscount(shareConfig.showPromoDiscount !== false);
    setPromoDiscountPct(shareConfig.promoDiscountPct ?? 10);
    setEnableChemicalService(shareConfig.enableChemicalService !== false);
    setEnableProductSales(shareConfig.enableProductSales !== false);
  }, [shareConfig]);

  const handleResetShareToDefault = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'รีเซ็ตส่วนแบ่ง % เป็นค่าเริ่มต้น?',
      message: 'คุณต้องการรีเซ็ตเปอร์เซ็นต์ส่วนแบ่งช่าง (ตัดผม 50%, เคมี 40%, สินค้า 10%) กลับเป็นค่าเริ่มต้นมาตรฐานใช่หรือไม่?',
      type: 'warning',
      onConfirm: () => {
        setHaircutPct(50);
        setChemicalPct(40);
        setProductPct(10);
        setShowPromoDiscount(true);
        setPromoDiscountPct(10);
        setEnableChemicalService(true);
        setEnableProductSales(true);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveShareConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHaircut = Math.min(100, Math.max(0, haircutPct));
    const cleanChemical = Math.min(100, Math.max(0, chemicalPct));
    const cleanProduct = Math.min(100, Math.max(0, productPct));
    const cleanPromo = Math.min(100, Math.max(0, promoDiscountPct));

    setHaircutPct(cleanHaircut);
    setChemicalPct(cleanChemical);
    setProductPct(cleanProduct);
    setPromoDiscountPct(cleanPromo);

    onUpdateShareConfig({
      ...shareConfig,
      haircutBarberPct: cleanHaircut,
      chemicalBarberPct: cleanChemical,
      productBarberPct: cleanProduct,
      showPromoDiscount,
      promoDiscountPct: cleanPromo,
      enableChemicalService,
      enableProductSales
    });
    setIsShareSaved(true);
    setTimeout(() => setIsShareSaved(false), 3000);
  };

  // ==========================================
  // 3. BARBERS MANAGEMENT
  // ==========================================
  const [newBarberName, setNewBarberName] = useState<string>('');
  const [newBarberRealName, setNewBarberRealName] = useState<string>('');
  const [newBarberPosition, setNewBarberPosition] = useState<string>('Hairdresser');
  const [newBarberBaseSalary, setNewBarberBaseSalary] = useState<string>('');

  // Edit Barber States
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState<string>('');
  const [editRealName, setEditRealName] = useState<string>('');
  const [editPosition, setEditPosition] = useState<string>('Hairdresser');
  const [editBaseSalary, setEditBaseSalary] = useState<string>('');
  
  const handleAddBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim()) return;
    
    const newBarber: Barber = {
      id: `barber-${Date.now()}`,
      name: newBarberName.trim(),
      realName: newBarberRealName.trim() || undefined,
      position: newBarberPosition || 'Hairdresser',
      baseSalary: newBarberBaseSalary.trim() ? parseFloat(newBarberBaseSalary) || undefined : undefined,
      isWorking: true
    };
    
    onUpdateBarbers([...barbers, newBarber]);
    setNewBarberName('');
    setNewBarberRealName('');
    setNewBarberPosition('Hairdresser');
    setNewBarberBaseSalary('');
  };

  const handleStartEditBarber = (b: Barber) => {
    setEditingBarberId(b.id);
    setEditNickname(b.name);
    setEditRealName(b.realName || '');
    setEditPosition(b.position || 'Hairdresser');
    setEditBaseSalary(b.baseSalary !== undefined ? b.baseSalary.toString() : '');
  };

  const handleCancelEditBarber = () => {
    setEditingBarberId(null);
  };

  const handleSaveEditBarber = (id: string) => {
    if (!editNickname.trim()) return;
    const updated = barbers.map(b => b.id === id ? {
      ...b,
      name: editNickname.trim(),
      realName: editRealName.trim() || undefined,
      position: editPosition,
      baseSalary: editBaseSalary.trim() ? parseFloat(editBaseSalary) || undefined : undefined
    } : b);
    onUpdateBarbers(updated);
    setEditingBarberId(null);
  };

  const handleToggleWorking = (id: string) => {
    const updated = barbers.map(b => b.id === id ? { ...b, isWorking: !b.isWorking } : b);
    onUpdateBarbers(updated);
  };

  const handleDeleteBarber = (id: string) => {
    const barberName = barbers.find(b => b.id === id)?.name || '';
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบรายชื่อช่าง',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อ "ช่าง${barberName}" ออกจากระบบ?`,
      type: 'danger',
      onConfirm: () => {
        const updated = barbers.filter(b => b.id !== id);
        onUpdateBarbers(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ==========================================
  // 4. PRODUCTS MANAGEMENT
  // ==========================================
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');

  // Edit Product States
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState<string>('');
  const [editProductPrice, setEditProductPrice] = useState<string>('');

  const handleStartEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setEditProductName(p.name);
    setEditProductPrice(p.price.toString());
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
  };

  const handleSaveEditProduct = (id: string) => {
    if (!editProductName.trim() || !editProductPrice) return;
    const updated = products.map(p => p.id === id ? {
      ...p,
      name: editProductName.trim(),
      price: Math.max(0, parseFloat(editProductPrice) || 0)
    } : p);
    onUpdateProducts(updated);
    setEditingProductId(null);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice) return;
    
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProductName.trim(),
      price: Math.max(0, parseFloat(newProductPrice) || 0),
      isActive: true
    };

    onUpdateProducts([...products, newProd]);
    setNewProductName('');
    setNewProductPrice('');
  };

  const handleToggleProductActive = (id: string) => {
    const updated = products.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
    onUpdateProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const productName = products.find(p => p.id === id)?.name || '';
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบสินค้า/บริการ',
      message: `คุณต้องการลบรายการสินค้า "${productName}" ออกจากระบบใช่หรือไม่?`,
      type: 'danger',
      onConfirm: () => {
        const updated = products.filter(p => p.id !== id);
        onUpdateProducts(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ==========================================
  // 5. GIFT VOUCHERS MANAGEMENT
  // ==========================================
  const [newVoucherValue, setNewVoucherValue] = useState<string>('');

  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherValue) return;
    
    const newValue = Math.max(0, parseInt(newVoucherValue, 10) || 0);
    if (vouchers.some(v => v.value === newValue)) {
      setAlertDialog({
        isOpen: true,
        title: 'ข้อมูลซ้ำซ้อน',
        message: 'บัตรของขวัญ / Voucher มูลค่านี้มีอยู่แล้วในระบบ'
      });
      return;
    }

    const newVoucher: Voucher = {
      id: `voucher-${Date.now()}`,
      value: newValue,
      isActive: true
    };

    onUpdateVouchers([...vouchers, newVoucher]);
    setNewVoucherValue('');
  };

  const handleToggleVoucherActive = (id: string) => {
    const updated = vouchers.map(v => v.id === id ? { ...v, isActive: !v.isActive } : v);
    onUpdateVouchers(updated);
  };

  const handleDeleteVoucher = (id: string) => {
    const updated = vouchers.filter(v => v.id !== id);
    onUpdateVouchers(updated);
  };

  // ==========================================
  // 6. SYSTEM RESET & CLEAR DATA HANDLERS
  // ==========================================
  const [isClearingOldSales, setIsClearingOldSales] = useState<boolean>(false);

  const handleClearOldSalesClick = async () => {
    if (!onClearSalesOlderThanOneYear) return;
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันล้างประวัติบิลที่เก่ากว่า 1 ปี?',
      message: 'ระบบจะทำการค้นหาและลบบิลยอดขายที่มีอายุมากกว่า 365 วันออกอย่างถาวร เพื่อเพิ่มความเร็วและการประมวลผลของระบบ',
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setIsClearingOldSales(true);
          const count = await onClearSalesOlderThanOneYear();
          setAlertDialog({
            isOpen: true,
            title: 'ล้างข้อมูลสำเร็จ',
            message: count > 0 ? `ทำการลบบิลเก่ากว่า 1 ปีเรียบร้อยแล้ว จำนวน ${count} รายการ` : 'ไม่พบบิลยอดขายที่เก่ากว่า 1 ปีในระบบ'
          });
        } catch (err: any) {
          setAlertDialog({
            isOpen: true,
            title: 'เกิดข้อผิดพลาด',
            message: err?.message || 'ไม่สามารถล้างข้อมูลบิลเก่าได้'
          });
        } finally {
          setIsClearingOldSales(false);
        }
      }
    });
  };

  // Active Theme Primary Color Variable
  const currentPrimaryColor = primaryColorInput || '#6366f1';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans" id="config-settings">
      
      {/* 0. ACCOUNT INFO BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform"
            style={{ backgroundColor: currentPrimaryColor }}
          >
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400">ระบบตั้งค่าและการจัดการร้านค้า</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>เชื่อมต่อฐานข้อมูลเรียบร้อย</span>
              </span>
            </div>
            <p className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
              {shopConfig.shopName || 'ร้านบาร์เบอร์ของฉัน'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700/80">
          <Mail className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-300">บัญชี:</span>
          <span className="font-bold text-white font-mono">{userEmail || 'guest@gmail.com'}</span>
        </div>
      </div>

      {/* 1. GENERAL SHOP SETTINGS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                1. ข้อมูลร้านค้า & สีประจำร้าน (Shop Identity & Color Tone)
              </h3>
              <p className="text-xs text-slate-500">
                ตั้งค่าชื่อร้าน โลโก้ สีหลักประจำร้าน และการเปิด/ปิดแท็บเมนูการทำงาน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetThemeDefault}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="คืนค่าสีและธีมเริ่มต้น"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>คืนค่าสีเริ่มต้น</span>
          </button>
        </div>
        
        <form onSubmit={handleSaveShopConfig} className="space-y-6">
          
          {/* Logo & Shop Name Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Logo Upload Card */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">
                โลโก้ประจำร้าน (Shop Logo):
              </label>
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shadow-inner">
                    {shopLogoUrl ? (
                      <img 
                        src={shopLogoUrl} 
                        alt="Shop Logo" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <Store className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  {shopLogoUrl && (
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 shadow-md transition-all cursor-pointer"
                      title="ลบโลโก้ร้าน"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5" style={{ color: currentPrimaryColor }} />
                  <span>{shopLogoUrl ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    className="hidden" 
                  />
                </label>
                <span className="text-[10.5px] text-slate-400 leading-tight">
                  รองรับไฟล์ .jpg, .png (ย่อขนาดอัตโนมัติ)
                </span>
              </div>
            </div>

            {/* Shop Name & Billing Cutoff */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  ชื่อร้านบาร์เบอร์ / ซาลอนแต่งทรงผม <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={shopNameInput}
                  onChange={(e) => setShopNameInput(e.target.value)}
                  placeholder="กรุณากรอกชื่อร้าน..."
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-900 font-semibold focus:border-slate-400 focus:ring-2 focus:ring-slate-200 shadow-2xs transition-all"
                />
                <span className="text-[11px] text-slate-400">
                  ชื่อนี้จะปรากฏที่หัวบิลสลิปใบเสร็จ, รายงานเงินเดือน และแถบเมนูด้านบน
                </span>
              </div>

              {/* Billing Cycle Cutoff Day Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  รอบวันตัดยอดบัญชีรายเดือน (วันสิ้นสุดของรอบบิล):
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <select
                    value={billingCutoffDayInput}
                    onChange={(e) => setBillingCutoffDayInput(parseInt(e.target.value, 10))}
                    className="h-10 px-3 pr-8 border border-slate-200 rounded-xl bg-white font-mono text-xs font-bold focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value={1}>วันที่ 1 ของเดือน (เริ่มนับวันที่ 1 ของเดือน)</option>
                    {[...Array(27)].map((_, i) => (
                      <option key={i + 2} value={i + 2}>ทุกวันที่ {i + 2} ของเดือน (รอบเริ่มวันที่ {i + 3})</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    * เช่น หากตั้งเป็น <strong>ทุกวันที่ 25</strong> รอบบัญชีเดือนนี้จะเริ่มนับยอดตั้งแต่ 26 เดือนก่อนหน้า จนถึง 25 เดือนปัจจุบัน
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Primary Color & Theme Configuration */}
          <div className="space-y-4 border-t border-dashed border-slate-200 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                  <Palette className="w-4 h-4" style={{ color: currentPrimaryColor }} />
                  <span>สีหลักประจำร้าน (Primary Brand Color) & ปรับแต่งเฉดสีอัตโนมัติ</span>
                </h4>
                <p className="text-xs text-slate-500">
                  ระบบจะคำนวณเฉดสีที่เข้าชุด ปรับใช้กับปุ่ม แท็บเมนู และการ์ดทั้งระบบอย่างสวยงาม
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono flex items-center space-x-2 border border-slate-200 shadow-2xs">
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: currentPrimaryColor }} />
                  <span>{currentPrimaryColor.toUpperCase()}</span>
                </span>
              </div>
            </div>

            {/* Color Controls Container */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                
                {/* Visual Picker & Hex */}
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-2 ring-slate-200 hover:ring-slate-400 transition-all shrink-0 cursor-pointer group">
                    <div 
                      className="w-full h-full flex items-center justify-center text-white"
                      style={{ backgroundColor: currentPrimaryColor }}
                    >
                      <Pipette className="w-4 h-4 drop-shadow-md opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <input
                      type="color"
                      value={primaryColorInput.length === 7 ? primaryColorInput : '#6366f1'}
                      onChange={(e) => {
                        setPrimaryColorInput(e.target.value);
                        setThemeInput('custom');
                      }}
                      className="absolute inset-0 w-[200%] h-[200%] -translate-x-[25%] -translate-y-[25%] cursor-pointer border-0 p-0 opacity-0"
                      title="เลือกสีจากจานสี"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      รหัสสี HEX (พิมพ์แก้ไขได้):
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={primaryColorInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                            setPrimaryColorInput(val);
                            setThemeInput('custom');
                          }
                        }}
                        placeholder="#6366f1"
                        className="w-28 h-9 px-3 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none shadow-2xs"
                        maxLength={7}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(primaryColorInput);
                            setCopiedHex(true);
                            setTimeout(() => setCopiedHex(false), 2000);
                          }
                        }}
                        className="h-9 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center space-x-1 shadow-2xs cursor-pointer"
                        title="คัดลอกรหัสสี"
                      >
                        {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span className="text-[11px]">{copiedHex ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Swatches */}
                <div className="w-full lg:w-auto flex-1">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    หรือเลือกโทนสียอดนิยมสำหรับร้านบาร์เบอร์ / ซาลอน:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_BRAND_COLORS.map((col) => {
                      const isMatch = primaryColorInput.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => {
                            setPrimaryColorInput(col.hex);
                            setThemeInput('custom');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                            isMatch
                              ? 'bg-white border-slate-900 text-slate-900 shadow-xs ring-2 ring-slate-900/10 scale-105'
                              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <span 
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-2xs" 
                            style={{ backgroundColor: col.hex }} 
                          />
                          <span>{col.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Theme Presets Gallery */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-600" />
                    <span>หรือเลือกจากชุดธีมสไตล์สำเร็จรูป (Theme Presets):</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = themeInput === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setThemeInput(preset.id);
                          setPrimaryColorInput(preset.primaryColor);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer overflow-hidden flex flex-col justify-between space-y-2.5 ${
                          isSelected 
                            ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/10 scale-[1.01]' 
                            : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: preset.primaryColor }} />
                              <span>{preset.name}</span>
                            </span>
                            {isSelected && (
                              <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>เลือกใช้งาน</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-2">
                            {preset.description}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-100">
                          {preset.previewColors.map((col, idx) => (
                            <span 
                              key={idx} 
                              className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" 
                              style={{ backgroundColor: col }}
                              title={col}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Module Feature Toggles */}
          <div className="space-y-3 border-t border-dashed border-slate-200 pt-5">
            <span className="block text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4" style={{ color: currentPrimaryColor }} />
              <span>เปิด/ปิด เมนูฟังก์ชันบนแถบใช้งานหลัก (Toggle Main System Modules)</span>
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Cash Counter Toggle */}
              <div className={`p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${
                enableCashCounterInput 
                  ? 'bg-slate-50 border-slate-300 shadow-2xs' 
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  id="toggle-cash"
                  checked={enableCashCounterInput}
                  onChange={(e) => setEnableCashCounterInput(e.target.checked)}
                  className="w-5 h-5 rounded-md border-slate-300 bg-white mt-0.5 cursor-pointer shrink-0"
                />
                <label htmlFor="toggle-cash" className="cursor-pointer space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>1. ระบบนับเงินสด (Cash Counter)</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      enableCashCounterInput ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {enableCashCounterInput ? '● เปิดใช้งาน' : '○ ปิดใช้งาน'}
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500 leading-relaxed">
                    แสดงแท็บ "นับเงินสด" สำหรับตรวจนับธนบัตรและเหรียญในลิ้นชักประจำวัน
                  </span>
                </label>
              </div>

              {/* Payslips Toggle */}
              <div className={`p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${
                enablePayslipsInput 
                  ? 'bg-slate-50 border-slate-300 shadow-2xs' 
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  id="toggle-payslips"
                  checked={enablePayslipsInput}
                  onChange={(e) => setEnablePayslipsInput(e.target.checked)}
                  className="w-5 h-5 rounded-md border-slate-300 bg-white mt-0.5 cursor-pointer shrink-0"
                />
                <label htmlFor="toggle-payslips" className="cursor-pointer space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span>2. ระบบสลิปเงินเดือน (Payslips System)</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      enablePayslipsInput ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {enablePayslipsInput ? '● เปิดใช้งาน' : '○ ปิดใช้งาน'}
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500 leading-relaxed">
                    แสดงแท็บ "สลิปเงินเดือน" และคำนวณเงินประกัน ค่าเบิก หักภาษี ออกสลิปช่าง
                  </span>
                </label>
              </div>

              {/* Bookings & Appointments Toggle */}
              <div className={`p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${
                enableBookingsInput 
                  ? 'bg-slate-50 border-slate-300 shadow-2xs' 
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  id="toggle-bookings"
                  checked={enableBookingsInput}
                  onChange={(e) => setEnableBookingsInput(e.target.checked)}
                  className="w-5 h-5 rounded-md border-slate-300 bg-white mt-0.5 cursor-pointer shrink-0"
                />
                <label htmlFor="toggle-bookings" className="cursor-pointer space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />
                      <span>3. ระบบจองคิวช่าง (Barber Queue & Appointments)</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      enableBookingsInput ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {enableBookingsInput ? '● เปิดใช้งาน' : '○ ปิดใช้งาน'}
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500 leading-relaxed">
                    แสดงแท็บ "จองคิวช่าง" บันทึกนัดหมาย ระบุช่าง เวลาเริ่ม-สิ้นสุด และส่งเข้าคิดเงิน POS
                  </span>

                  {/* Booking Duration Default (30m vs 60m) */}
                  {enableBookingsInput && (
                    <div className="pt-3 mt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>เวลาตัดมาตรฐานต่อ 1 คิว:</span>
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {defaultBookingDurationInput} นาที / คิว
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDefaultBookingDurationInput(30)}
                          className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                            defaultBookingDurationInput === 30
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ⚡ 30 นาที
                          <span className="block text-[9.5px] opacity-80">ตัดไว / ซอยเร็ว</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDefaultBookingDurationInput(60)}
                          className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                            defaultBookingDurationInput === 60
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ⏱️ 60 นาที (1 ชม.)
                          <span className="block text-[9.5px] opacity-80">สระ ตัด เซ็ต (แนะนำ)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </label>
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer hover:opacity-90 active:scale-98"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกข้อมูลร้านค้า & ธีม</span>
            </button>
          </div>
        </form>

        {isShopSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>อัปเดตและบันทึกข้อมูลร้านค้าและโทนสีเรียบร้อยแล้ว</span>
          </div>
        )}
      </div>

      {/* 1.1 SECURITY & PIN LOCK SETTINGS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700 shrink-0 shadow-xs">
              {shopConfig.isPinLocked && shopConfig.pinCode ? (
                <Lock className="w-5 h-5 text-indigo-700" />
              ) : (
                <Unlock className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  ระบบความปลอดภัย & ล็อครหัส PIN หน้าตั้งค่า (PIN Lock Security)
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>เปิดล็อค PIN อยู่ ({showPinCode ? (shopConfig.pinCode || '1234') : '••••'})</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                ป้องกันไม่ให้พนักงานหรือบุคคลอื่นแอบดูยอดขาย เปลี่ยนราคา หรือแก้ไขข้อมูลร้านค้าโดยไม่ได้รับอนุญาต
              </p>
            </div>
          </div>

          {shopConfig.isPinLocked && shopConfig.pinCode && onLockSettingsNow && (
            <button
              type="button"
              onClick={onLockSettingsNow}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs active:scale-95"
              title="ล็อคหน้าตั้งค่าและออกจากหน้านี้ทันทีเพื่อทดสอบรหัส PIN"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ทดสอบล็อคหน้าตั้งค่าทันที</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSavePin} className="space-y-5">
          {/* Status and Toggle Switch */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-slate-800">
                  สถานะการป้องกันหน้าตั้งค่า:
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-3 h-3" />
                  <span>เปิดใช้งานแล้ว (รหัส: {showPinCode ? (shopConfig.pinCode || '1234') : '••••'})</span>
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                เมื่อเปิดใช้งาน ทุกครั้งที่จะกดเข้ามาที่แท็บ <strong>&quot;ตั้งค่า&quot;</strong> ระบบจะบังคับให้กรอกรหัส PIN 4-6 หลักก่อนเสมอ
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isPinLockedInput}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsPinLockedInput(checked);
                  if (!checked && shopConfig.isPinLocked) {
                    handleDisablePin();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-700">
                {isPinLockedInput ? 'เปิดล็อค PIN' : 'ปิดล็อค PIN'}
              </span>
            </label>
          </div>

          {/* PIN Setup Inputs when enabled */}
          {isPinLockedInput && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4.5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              {/* PIN Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-700">
                    รหัสผ่าน PIN (4 - 6 หลัก) <span className="text-rose-500">*</span>:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPinCode(!showPinCode)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showPinCode ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>ซ่อนรหัส</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>ดูรหัส</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPinCode ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={pinCodeInput}
                    onChange={(e) => setPinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="เช่น 1234 หรือ 888888"
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none font-mono text-sm font-black text-slate-900 tracking-wider focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                  />
                  <div className="absolute right-3 top-3 text-xs font-bold text-slate-400 font-mono">
                    {pinCodeInput.length}/6
                  </div>
                </div>
              </div>

              {/* Confirm PIN Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  ยืนยันรหัสผ่าน PIN อีกครั้ง <span className="text-rose-500">*</span>:
                </label>
                <input
                  type={showPinCode ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="กรอกรหัสเดิมเพื่อยืนยัน..."
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none font-mono text-sm font-black text-slate-900 tracking-wider focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {pinStatusMsg && (
            <div
              className={`p-3 rounded-2xl flex items-center space-x-2 text-xs font-bold ${
                pinStatusMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {pinStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{pinStatusMsg.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-400 font-medium">
              💡 แนะนำ: ใช้ตัวเลขจำง่าย เช่น เบอร์โทร หรือเลข 4 หลักที่คุณจำได้แม่นยำ
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {shopConfig.isPinLocked && shopConfig.pinCode && (
                <button
                  type="button"
                  onClick={handleDisablePin}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ปิดใช้งาน PIN
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>บันทึกรหัสผ่าน PIN</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. CHOOSE COMMISSION (%) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                2. โครงสร้างส่วนแบ่งรายได้ (% Commission Shares)
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดสัดส่วนรายได้ที่ช่างตัดผมจะได้รับจากงานตัดผม งานเคมี และการขายสินค้า
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetShareToDefault}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="คืนค่าอัตราส่วนแบ่งมาตรฐาน 50/40/10"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>คืนค่ามาตรฐาน (50/40/10)</span>
          </button>
        </div>

        <form onSubmit={handleSaveShareConfig} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Haircut share ratio */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2">
              <span className="block text-xs font-extrabold text-slate-700">ส่วนแบ่งค่าตัดผม (ช่าง):</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="0"
                  value={haircutPct === 0 ? '' : haircutPct}
                  onChange={(e) => setHaircutPct(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-slate-400 shadow-2xs"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium">
                ช่างได้รับ {haircutPct}% | ร้านได้รับ {100 - haircutPct}%
              </p>
            </div>

            {/* Chemical ratio */}
            <div className={`bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2 transition-all ${!enableChemicalService ? 'opacity-40 select-none' : ''}`}>
              <span className="block text-xs font-extrabold text-slate-700">ส่วนแบ่งงานเคมี (ช่าง):</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  disabled={!enableChemicalService}
                  placeholder="0"
                  value={chemicalPct === 0 ? '' : chemicalPct}
                  onChange={(e) => setChemicalPct(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-slate-400 disabled:bg-slate-100 shadow-2xs"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium">
                {enableChemicalService ? `ช่างได้รับ ${chemicalPct}% | ร้านได้รับ ${100 - chemicalPct}%` : 'ปิดใช้งานบริการเคมี'}
              </p>
            </div>

            {/* Merchandise ratio */}
            <div className={`bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2 transition-all ${!enableProductSales ? 'opacity-40 select-none' : ''}`}>
              <span className="block text-xs font-extrabold text-slate-700">ส่วนแบ่งขายสินค้า (ช่าง):</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  disabled={!enableProductSales}
                  placeholder="0"
                  value={productPct === 0 ? '' : productPct}
                  onChange={(e) => setProductPct(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-slate-400 disabled:bg-slate-100 shadow-2xs"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium">
                {enableProductSales ? `ช่างได้รับ ${productPct}% | ร้านได้รับ ${100 - productPct}%` : 'ปิดใช้งานการขายสินค้า'}
              </p>
            </div>

          </div>

          {/* Feature Toggles (Chemical, Products) */}
          <div className="border-t border-dashed border-slate-200 pt-5 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: currentPrimaryColor }} />
              <span>เปิด/ปิด บริการเสริมในหน้าคิดเงิน POS:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <div>
                  <span className="block text-xs font-bold text-slate-800">เปิดใช้งาน "ช่องใส่ค่าเคมี"</span>
                  <span className="block text-[11px] text-slate-500">แสดงการป้อนค่าเคมีและส่วนแบ่งในหน้าตัดบิล</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableChemicalService}
                  onChange={(e) => setEnableChemicalService(e.target.checked)}
                  className="w-5 h-5 bg-white border-slate-300 rounded cursor-pointer shrink-0 ml-2"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <div>
                  <span className="block text-xs font-bold text-slate-800">เปิดใช้งาน "ช่องรายการสินค้า"</span>
                  <span className="block text-[11px] text-slate-500">แสดงการเลือกสินค้าและตัดสต็อกในหน้าตัดบิล</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableProductSales}
                  onChange={(e) => setEnableProductSales(e.target.checked)}
                  className="w-5 h-5 bg-white border-slate-300 rounded cursor-pointer shrink-0 ml-2"
                />
              </label>

            </div>
          </div>

          {/* Promo Discount Settings */}
          <div className="border-t border-dashed border-slate-200 pt-5 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>ระบบส่วนลดโปรโมชั่นของร้าน (เฉพาะตัดผม):</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="block text-xs font-bold text-slate-800">เปิดระบบการให้ส่วนลดโปรโมชั่น</span>
                  <span className="block text-[11px] text-slate-500">หากติ๊กออก ปุ่มเลือกโปรโมชั่นจะไม่แสดงในหน้าตัดบิล</span>
                </div>
                <input
                  type="checkbox"
                  checked={showPromoDiscount}
                  onChange={(e) => setShowPromoDiscount(e.target.checked)}
                  className="w-5 h-5 bg-white border-slate-300 rounded cursor-pointer"
                />
              </label>

              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2">
                <span className="block text-xs font-bold text-slate-700">สัดส่วน % ส่วนลดที่ต้องการลด:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    disabled={!showPromoDiscount}
                    placeholder="0"
                    value={promoDiscountPct === 0 ? '' : promoDiscountPct}
                    onChange={(e) => setPromoDiscountPct(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-slate-400 disabled:bg-slate-100 shadow-2xs"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  ส่วนลด {promoDiscountPct}% สำหรับคิดลดเฉพาะค่าบริการตัดผมเท่านั้น
                </p>
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer hover:opacity-90 active:scale-98"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกโครงสร้างรายได้ (%)</span>
            </button>
          </div>
        </form>

        {isShareSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>อัปเดตและบันทึกโครงสร้างส่วนแบ่งรายได้สำเร็จแล้ว</span>
          </div>
        )}
      </div>

      {/* 3. BARBER LIST CONFIGURATION */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: currentPrimaryColor }}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              3. รายชื่อช่างตัดผมประจำร้าน (Barber Team Members)
            </h3>
            <p className="text-xs text-slate-500">
              เพิ่ม แก้ไขชื่อจริง ตำแหน่ง ฐานเงินเดือน และเปิด/ปิดสถานะการทำงานประจำวัน
            </p>
          </div>
        </div>

        {/* Add new barber form */}
        <form onSubmit={handleAddBarber} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4" style={{ color: currentPrimaryColor }} />
            <span>ลงทะเบียนเพิ่มช่างตัดผมคนใหม่</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ชื่อเล่นช่าง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น บอย, ต้อม, อาร์ม"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-slate-400 font-medium shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">ชื่อจริง - นามสกุล</label>
              <input
                type="text"
                placeholder="แสดงในสลิปเงินเดือน"
                value={newBarberRealName}
                onChange={(e) => setNewBarberRealName(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-slate-400 font-medium shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">ตำแหน่งการทำงาน (Position)</label>
              <select
                value={newBarberPosition}
                onChange={(e) => setNewBarberPosition(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-slate-400 font-medium shadow-2xs cursor-pointer"
              >
                <option value="Hairdresser">Hairdresser (ช่างตัดผมหลัก)</option>
                <option value="Branch Manager">Branch Manager (ผู้จัดการสาขา)</option>
                <option value="Junior Barber">Junior Barber (ช่างผู้ช่วย)</option>
                <option value="Senior Stylist">Senior Stylist (ช่างทำผมอาวุโส)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">ฐานเงินเดือน (บาท/เดือน)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="ใส่ 0 หรือเว้นว่าง"
                value={newBarberBaseSalary}
                onChange={(e) => setNewBarberBaseSalary(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-slate-400 font-medium shadow-2xs font-mono"
              />
            </div>
          </div>

          <div className="text-right pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm cursor-pointer hover:opacity-90 active:scale-98"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มช่างลงระบบ</span>
            </button>
          </div>
        </form>

        {/* Barbers list */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>รายชื่อช่างทั้งหมด ({barbers.length} คน):</span>
            <span>เรียงลำดับ / จัดการ</span>
          </div>

          <div className="space-y-2">
            {barbers.map((barber, idx) => {
              const isEditing = editingBarberId === barber.id;
              return (
                <div key={barber.id} className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 transition-all space-y-3 text-left">
                  {isEditing ? (
                    /* INLINE EDIT MODE FORM */
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" style={{ color: currentPrimaryColor }} />
                        <span>กำลังแก้ไขข้อมูลช่าง {barber.name}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ชื่อเล่นช่าง <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={editNickname}
                            onChange={(e) => setEditNickname(e.target.value)}
                            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ชื่อจริง - นามสกุล</label>
                          <input
                            type="text"
                            value={editRealName}
                            onChange={(e) => setEditRealName(e.target.value)}
                            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium"
                            placeholder="ยังไม่มีชื่อจริง"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ตำแหน่ง (Position)</label>
                          <select
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium cursor-pointer"
                          >
                            <option value="Hairdresser">Hairdresser</option>
                            <option value="Branch Manager">Branch Manager</option>
                            <option value="Junior Barber">Junior Barber</option>
                            <option value="Senior Stylist">Senior Stylist</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ฐานเงินเดือน (บาท/เดือน)</label>
                          <input
                            type="number"
                            min="0"
                            value={editBaseSalary}
                            onChange={(e) => setEditBaseSalary(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium font-mono"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2.5">
                        <button
                          type="button"
                          onClick={handleCancelEditBarber}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>ยกเลิก</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditBarber(barber.id)}
                          className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                          style={{ backgroundColor: currentPrimaryColor }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>บันทึกข้อมูล</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* DISPLAY MODE */
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Reorder Buttons */}
                        <div className="flex flex-row md:flex-col gap-0.5 items-center shrink-0 border-r border-slate-200 pr-2.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBarberUp(idx)}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:text-slate-200 transition-all ${idx === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === barbers.length - 1}
                            onClick={() => handleMoveBarberDown(idx)}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:text-slate-200 transition-all ${idx === barbers.length - 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs" style={{ color: currentPrimaryColor }}>
                          {barber.name.substring(0, 2)}
                        </div>

                        <div className="space-y-0.5 text-left">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-900">
                              ช่าง{barber.name}
                            </span>
                            <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                              {barber.position || 'Hairdresser'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                            <span>{barber.realName ? `ชื่อจริง: ${barber.realName}` : 'ยังไม่ได้ระบุชื่อจริง'}</span>
                            {barber.baseSalary ? (
                              <span className="font-mono text-emerald-700 font-bold">
                                ฐาน: {formatBaht(barber.baseSalary)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEditBarber(barber)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1 inline" />
                          <span>แก้ไข</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleWorking(barber.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-2xs ${
                            barber.isWorking 
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{barber.isWorking ? 'มาทำงาน (Online)' : 'หยุดงาน (Offline)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBarber(barber.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="ลบช่าง"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. PRODUCTS MANAGEMENT */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: currentPrimaryColor }}
          >
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              4. รายการสินค้าและบริการเสริม (Products & Retail Inventory)
            </h3>
            <p className="text-xs text-slate-500">
              เพิ่มและกำหนดราคาขายสินค้า เช่น แว็กซ์ เจล น้ำมันใส่ผม หรือบริการเสริม
            </p>
          </div>
        </div>

        {/* Add Product Form */}
        <form onSubmit={handleAddProduct} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4" style={{ color: currentPrimaryColor }} />
            <span>เพิ่มสินค้า / บริการเสริมใหม่</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ชื่อสินค้า / บริการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น Pomade Matte, Wax จัดทรง, เซรั่มบำรุงผม"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ราคาขายหน้าร้าน (บาท) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="0"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium shadow-2xs font-mono"
              />
            </div>
          </div>

          <div className="text-right pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm cursor-pointer hover:opacity-90 active:scale-98"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มสินค้าลงระบบ</span>
            </button>
          </div>
        </form>

        {/* Products Listing */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>รายการสินค้าทั้งหมด ({products.length} รายการ):</span>
            <span>เรียงลำดับ / จัดการ</span>
          </div>

          <div className="space-y-2">
            {products.map((item, idx) => {
              const isEditing = editingProductId === item.id;
              return (
                <div key={item.id} className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 transition-all space-y-3 text-left">
                  {isEditing ? (
                    /* INLINE EDIT PRODUCT FORM */
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" style={{ color: currentPrimaryColor }} />
                        <span>กำลังแก้ไขสินค้า {item.name}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ชื่อสินค้า <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={editProductName}
                            onChange={(e) => setEditProductName(e.target.value)}
                            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ราคาขาย (บาท) <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={editProductPrice}
                            onChange={(e) => setEditProductPrice(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2.5">
                        <button
                          type="button"
                          onClick={handleCancelEditProduct}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditProduct(item.id)}
                          className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                          style={{ backgroundColor: currentPrimaryColor }}
                        >
                          บันทึกข้อมูล
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* DISPLAY MODE */
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Reorder Buttons */}
                        <div className="flex flex-row md:flex-col gap-0.5 items-center shrink-0 border-r border-slate-200 pr-2.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveProductUp(idx)}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:text-slate-200 transition-all ${idx === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === products.length - 1}
                            onClick={() => handleMoveProductDown(idx)}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:text-slate-200 transition-all ${idx === products.length - 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-0.5 text-left">
                          <span className={`text-sm font-bold ${item.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                            {item.name}
                          </span>
                          <span className="block text-xs font-black font-mono" style={{ color: currentPrimaryColor }}>
                            {formatBaht(item.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEditProduct(item)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1 inline" />
                          <span>แก้ไข</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleProductActive(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-2xs ${
                            item.isActive
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {item.isActive ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>วางขายปกติ (In Stock)</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-amber-600" />
                              <span>สินค้าหมด (Out of Stock)</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. VOUCHERS MANAGEMENT */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: currentPrimaryColor }}
          >
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              5. บัตรกำนัล & คูปองส่วนลด (Gift Vouchers & Promos)
            </h3>
            <p className="text-xs text-slate-500">
              กำหนดมูลค่าบัตรกำนัลสำหรับให้ลูกค้าใช้ลดค่าบริการหน้าร้าน
            </p>
          </div>
        </div>

        {/* Add Voucher Form */}
        <form onSubmit={handleAddVoucher} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            เพิ่มมูลค่า Gift Voucher ใหม่:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number"
              required
              min="10"
              max="5000"
              placeholder="ระบุมูลค่าคูปอง เช่น 50, 100, 200, 500"
              value={newVoucherValue}
              onChange={(e) => setNewVoucherValue(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="flex-1 h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold shadow-2xs"
            />
            <button
              type="submit"
              className="px-6 h-10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer hover:opacity-90 active:scale-98 shrink-0"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม Voucher</span>
            </button>
          </div>
        </form>

        {/* Vouchers list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vouchers.map((v) => (
            <div 
              key={v.id} 
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between shadow-2xs ${
                v.isActive 
                  ? 'bg-slate-50 border-slate-200' 
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Tag className="w-4 h-4 text-slate-500" />
                <div>
                  <span className={`text-sm font-black font-mono ${v.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                    Voucher {formatBaht(v.value)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {v.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleToggleVoucherActive(v.id)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    v.isActive 
                      ? 'text-emerald-600 hover:bg-emerald-50' 
                      : 'text-slate-400 hover:bg-slate-200'
                  }`}
                  title={v.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                >
                  <Power className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteVoucher(v.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  title="ลบคูปอง"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. SYSTEM RESET & DATA MAINTENANCE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              6. การสำรองข้อมูล & รีเซ็ตระบบ (1-Year Backup & System Maintenance)
            </h3>
            <p className="text-xs text-slate-500">
              ระบบสำรองข้อมูลย้อนหลัง 1 ปี อัตโนมัติ และเครื่องมือจัดการข้อมูลร้านค้า
            </p>
          </div>
        </div>

        {/* 1-Year Backup & Lifecycle Banner Card */}
        <div className="p-5 bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50/50 rounded-2xl border border-amber-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">
                    สำรองข้อมูลย้อนหลัง 1 ปี (Annual 1-Year Data Backup)
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    annualDaysElapsed >= 365
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {annualDaysElapsed >= 365 ? `⚠️ ครบกำหนด 1 ปี (ผ่อนผัน ${annualDaysRemaining} วัน)` : '🟢 ปกติ (กำลังบันทึกข้อมูล)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  วันแรกที่เปิดใช้งาน: <span className="font-semibold text-slate-900">{firstLoginDate ? formatThaiDate(firstLoginDate.split('T')[0]) : 'วันนี้'}</span> • ใช้งานมาแล้ว <span className="font-bold text-amber-700">{annualDaysElapsed} วัน</span> (จากรอบ 365 วัน)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {onDownloadFullBackup && (
                <button
                  type="button"
                  onClick={onDownloadFullBackup}
                  className="px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-800 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>ดาวน์โหลดไฟล์แบคอัพ 1 ปี</span>
                </button>
              )}

              {onOpenAnnualModal && (
                <button
                  type="button"
                  onClick={onOpenAnnualModal}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ดูหน้าต่างสรุป 1 ปี (Modal)</span>
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-amber-900/90 bg-white/70 p-3 rounded-xl border border-amber-200/60 leading-relaxed space-y-1">
            <p className="font-bold text-amber-950 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>ระบบตรวจสอบอัตโนมัติเมื่อครบ 1 ปี:</span>
            </p>
            <p>
              เมื่อบัญชีร้านใช้งานครบ 365 วัน (1 ปี) ระบบจะแสดงหน้าต่างแจ้งเตือนและปุ่มให้ดาวน์โหลดไฟล์สำรองข้อมูลย้อนหลัง 1 ปี (JSON, CSV, PDF) ขึ้นมาเองโดยอัตโนมัติ โดยมีระยะเวลาผ่อนผัน 30 วันให้บันทึกไฟล์ ก่อนที่ระบบจะทำการล้างและเริ่มรอบปีถัดไป
            </p>
          </div>
        </div>

        {/* 4 Maintenance Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Option A: Clear Sales Records */}
          <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-sm">
                <Trash2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>1. ล้างประวัติบิลยอดขาย</span>
              </div>
              <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                ลบประวัติการขายและรายการบิลทั้งหมด เพื่อเริ่มต้นรอบยอดขายใหม่ โดยคงรายชื่อช่าง สินค้า และการตั้งค่าไว้ตามเดิม
              </p>
            </div>

            <button
              type="button"
              onClick={onClearSales}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตประวัติการขาย</span>
            </button>
          </div>

          {/* Option B: Clear Sales Older Than 1 Year */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                <span>2. ล้างบิลเก่ากว่า 1 ปี</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                ค้นหาและลบบิลยอดขายที่มีอายุเกิน 365 วันออกอย่างปลอดภัย ช่วยเพิ่มความเร็วและลดพื้นที่จัดเก็บ
              </p>
            </div>

            <button
              type="button"
              disabled={isClearingOldSales}
              onClick={handleClearOldSalesClick}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer active:scale-98"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isClearingOldSales ? 'animate-spin' : ''}`} />
              <span>{isClearingOldSales ? 'กำลังตรวจสอบ...' : 'ล้างบิลเก่ากว่า 1 ปี'}</span>
            </button>
          </div>

          {/* Option C: Delete Specific Month Data */}
          <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200/90 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-rose-950 font-extrabold text-sm">
                <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                <span>3. ลบข้อมูลรายเดือน (เลือกเดือน)</span>
              </div>
              <p className="text-xs text-rose-800/80 leading-relaxed font-medium">
                เลือกเฉพาะเดือนที่บันทึกข้อมูลไม่ครบหรือไม่ตรง เพื่อลบข้อมูลบิลและรายจ่ายออก โดยไม่กระทบกับข้อมูลเดือนอื่นๆ
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenDeleteMonthModal && onOpenDeleteMonthModal()}
              className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>เลือกลบข้อมูลรายเดือน...</span>
            </button>
          </div>

          {/* Option D: Factory Reset */}
          <div className="p-5 bg-red-50/60 rounded-2xl border border-red-200/90 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-red-950 font-extrabold text-sm">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>4. คืนค่าเริ่มต้นจากโรงงาน</span>
              </div>
              <p className="text-xs text-red-800/80 leading-relaxed font-medium">
                ล้างข้อมูลร้าน บิลขาย รายชื่อช่าง และสินค้าทั้งหมด คืนค่าระบบกลับสู่สถานะเริ่มต้นใหม่ทั้งหมด
              </p>
            </div>

            <button
              type="button"
              onClick={onFullReset}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer active:scale-98"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>รีเซ็ตระบบทั้งหมด (Reset All)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmDialog.type === 'danger' ? 'bg-rose-50 text-rose-600' :
                confirmDialog.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {confirmDialog.type === 'danger' ? <Trash2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-extrabold text-slate-950">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            
            <div className="flex space-x-2.5 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmDialog.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
                  confirmDialog.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                ยืนยันการทำรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900">{alertDialog.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{alertDialog.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
