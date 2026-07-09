import React, { useState } from 'react';
import { Barber, Product, ShareConfig, ShopConfig, Voucher, ChemicalPromo } from '../types';
import { formatBaht } from '../utils';
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
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
  KeyRound,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Upload,
  Image,
  Clock
} from 'lucide-react';

interface ConfigTabProps {
  barbers: Barber[];
  products: Product[];
  chemicalPromos: ChemicalPromo[];
  shareConfig: ShareConfig;
  shopConfig: ShopConfig;
  vouchers: Voucher[];
  salesCount: number;
  onUpdateBarbers: (barbers: Barber[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateChemicalPromos: (promos: ChemicalPromo[]) => void;
  onUpdateShareConfig: (config: ShareConfig) => void;
  onUpdateShopConfig: (config: ShopConfig) => void;
  onUpdateVouchers: (vouchers: Voucher[]) => void;
  onClearSales: () => void;
  onFullReset: () => void;
}

export default function ConfigTab({
  barbers,
  products,
  chemicalPromos,
  shareConfig,
  shopConfig,
  vouchers,
  salesCount,
  onUpdateBarbers,
  onUpdateProducts,
  onUpdateChemicalPromos,
  onUpdateShareConfig,
  onUpdateShopConfig,
  onUpdateVouchers,
  onClearSales,
  onFullReset,
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

  // ==========================================
  // PIN LOCK SECURITY ENGINE
  // ==========================================
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Security config states inside the rendered tab
  const [isPinLockedInput, setIsPinLockedInput] = useState<boolean>(shopConfig.isPinLocked || false);
  const [pinCodeInput, setPinCodeInput] = useState<string>(shopConfig.pinCode || '');
  const [showPinInput, setShowPinInput] = useState<boolean>(false);

  // Sync state values on shopConfig update from props
  React.useEffect(() => {
    setIsPinLockedInput(shopConfig.isPinLocked || false);
    setPinCodeInput(shopConfig.pinCode || '');
  }, [shopConfig]);

  const handlePinKeyPress = (num: string) => {
    const targetLength = shopConfig.pinCode?.length || 4;
    if (enteredPin.length >= targetLength) return;
    
    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);
    setPinError('');
    
    if (nextPin.length === targetLength) {
      if (nextPin === shopConfig.pinCode) {
        setIsUnlocked(true);
        setPinError('');
      } else {
        setTimeout(() => {
          setPinError('รหัส PIN ไม่ถูกต้อง พยายามอีกครั้ง');
          setEnteredPin('');
        }, 150);
      }
    }
  };

  const handlePinDelete = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  const handlePinClear = () => {
    setEnteredPin('');
    setPinError('');
  };

  // Physical Keyboard listener for interactive touch/typing UX
  React.useEffect(() => {
    if (!shopConfig.isPinLocked || isUnlocked) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinDelete();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        handlePinClear();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enteredPin, shopConfig.isPinLocked, isUnlocked, shopConfig.pinCode]);

  // Confirmation popup states for safe deletion & systems resets
  const [showClearSalesConfirm, setShowClearSalesConfirm] = useState<boolean>(false);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState<boolean>(false);

  // Re-ordering and sorting rank list assistants
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
  // BARBERS MANAGEMENT
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
      isWorking: true // comes in active by default
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
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อ "ช่าง${barberName}" ออกจากระบบอย่างถาวร? การลบนี้ไม่สามารถย้อนกลับได้`,
      type: 'danger',
      onConfirm: () => {
        const updated = barbers.filter(b => b.id !== id);
        onUpdateBarbers(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };


  // ==========================================
  // SHARE CONFIGS (%)
  // ==========================================
  const [haircutPct, setHaircutPct] = useState<number>(shareConfig.haircutBarberPct);
  const [chemicalPct, setChemicalPct] = useState<number>(shareConfig.chemicalBarberPct);
  const [productPct, setProductPct] = useState<number>(shareConfig.productBarberPct);
  const [showPromoDiscount, setShowPromoDiscount] = useState<boolean>(shareConfig.showPromoDiscount !== false);
  const [promoDiscountPct, setPromoDiscountPct] = useState<number>(shareConfig.promoDiscountPct ?? 10);
  const [defaultChemDiscountValue, setDefaultChemDiscountValue] = useState<string>(shareConfig.defaultChemicalDiscountValue?.toString() || '');
  const [defaultChemDiscountType, setDefaultChemDiscountType] = useState<'fixed' | 'percentage'>(shareConfig.defaultChemicalDiscountType || 'percentage');
  const [showChemicalDiscountInPos, setShowChemicalDiscountInPos] = useState<boolean>(shareConfig.showChemicalDiscountInPos !== false);
  const [defaultBookingDuration, setDefaultBookingDuration] = useState<number>(shareConfig.defaultBookingDuration ?? 60);
  const [enableChemicalService, setEnableChemicalService] = useState<boolean>(shareConfig.enableChemicalService !== false);
  const [enableProductSales, setEnableProductSales] = useState<boolean>(shareConfig.enableProductSales !== false);
  const [isShareSaved, setIsShareSaved] = useState<boolean>(false);

  // Synchronize local states when the fetched shareConfig props change
  React.useEffect(() => {
    setHaircutPct(shareConfig.haircutBarberPct);
    setChemicalPct(shareConfig.chemicalBarberPct);
    setProductPct(shareConfig.productBarberPct);
    setShowPromoDiscount(shareConfig.showPromoDiscount !== false);
    setPromoDiscountPct(shareConfig.promoDiscountPct ?? 10);
    setDefaultChemDiscountValue(shareConfig.defaultChemicalDiscountValue?.toString() || '');
    setDefaultChemDiscountType(shareConfig.defaultChemicalDiscountType || 'percentage');
    setShowChemicalDiscountInPos(shareConfig.showChemicalDiscountInPos !== false);
    setDefaultBookingDuration(shareConfig.defaultBookingDuration ?? 60);
    setEnableChemicalService(shareConfig.enableChemicalService !== false);
    setEnableProductSales(shareConfig.enableProductSales !== false);
  }, [shareConfig]);

  const handleSaveShareConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHaircut = Math.min(100, Math.max(0, haircutPct));
    const cleanChemical = Math.min(100, Math.max(0, chemicalPct));
    const cleanProduct = Math.min(100, Math.max(0, productPct));
    const cleanPromo = Math.min(100, Math.max(0, promoDiscountPct));
    const cleanChemVal = defaultChemDiscountValue === '' ? undefined : Math.max(0, parseFloat(defaultChemDiscountValue) || 0);

    setHaircutPct(cleanHaircut);
    setChemicalPct(cleanChemical);
    setProductPct(cleanProduct);
    setPromoDiscountPct(cleanPromo);

    onUpdateShareConfig({
      haircutBarberPct: cleanHaircut,
      chemicalBarberPct: cleanChemical,
      productBarberPct: cleanProduct,
      showPromoDiscount,
      promoDiscountPct: cleanPromo,
      defaultChemicalDiscountValue: cleanChemVal,
      defaultChemicalDiscountType: defaultChemDiscountType,
      showChemicalDiscountInPos: showChemicalDiscountInPos,
      defaultBookingDuration: defaultBookingDuration,
      enableChemicalService: enableChemicalService,
      enableProductSales: enableProductSales
    });
    setIsShareSaved(true);
    setTimeout(() => setIsShareSaved(false), 3000);
  };


  // ==========================================
  // PRODUCTS MANAGEMENT
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
      message: `คุณต้องการลบรายการสินค้า/บริการ "${productName}" ออกจากระบบอย่างถาวรใช่หรือไม่?`,
      type: 'danger',
      onConfirm: () => {
        const updated = products.filter(p => p.id !== id);
        onUpdateProducts(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };


  // ==========================================
  // SHOP GENERAL CONFIG
  // ==========================================
  const [shopNameInput, setShopNameInput] = useState<string>(shopConfig.shopName);
  const [shopLogoUrl, setShopLogoUrl] = useState<string>(shopConfig.logoUrl || '');
  const [billingCutoffDayInput, setBillingCutoffDayInput] = useState<number>(shopConfig.billingCutoffDay || 1);
  const [primaryColorInput, setPrimaryColorInput] = useState<string>(shopConfig.primaryColor || '#6366f1');
  const [enableBookingsInput, setEnableBookingsInput] = useState<boolean>(shopConfig.enableBookings !== false);
  const [isShopSaved, setIsShopSaved] = useState<boolean>(false);

  // Synchronize local states when the fetched shopConfig props change
  React.useEffect(() => {
    setShopNameInput(shopConfig.shopName);
    setShopLogoUrl(shopConfig.logoUrl || '');
    setBillingCutoffDayInput(shopConfig.billingCutoffDay || 1);
    setPrimaryColorInput(shopConfig.primaryColor || '#6366f1');
    setEnableBookingsInput(shopConfig.enableBookings !== false);
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

  const handleSaveShopConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPinLockedInput && (!pinCodeInput || pinCodeInput.length < 4)) {
      setAlertDialog({
        isOpen: true,
        title: 'รหัสผ่านสั้นเกินไป',
        message: 'รหัส PIN จะต้องมีตัวเลขอย่างน้อย 4 หลัก เพื่อความปลอดภัยที่เพียงพอ'
      });
      return;
    }
    onUpdateShopConfig({ 
      shopName: shopNameInput.trim(),
      isPinLocked: isPinLockedInput,
      pinCode: pinCodeInput,
      logoUrl: shopLogoUrl,
      billingCutoffDay: billingCutoffDayInput,
      primaryColor: primaryColorInput,
      enableBookings: enableBookingsInput
    });
    setIsShopSaved(true);
    setTimeout(() => setIsShopSaved(false), 3000);
  };


  // ==========================================
  // GIFT VOUCHERS MANAGEMENT
  // ==========================================
  const [newVoucherValue, setNewVoucherValue] = useState<string>('');

  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherValue) return;
    
    const newValue = Math.max(0, parseInt(newVoucherValue, 10) || 0);
    // Avoid duplicates
    if (vouchers.some(v => v.value === newValue)) {
      setAlertDialog({
        isOpen: true,
        title: 'ข้อมูลซ้ำซ้อน',
        message: 'บัตรของขวัญ/Voucher มูลค่านี้มีอยู่แล้วในระบบ'
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
  // CHEMICAL PROMOTIONS MANAGEMENT
  // ==========================================
  const [newPromoName, setNewPromoName] = useState<string>('');
  const [newPromoOriginalPrice, setNewPromoOriginalPrice] = useState<string>('');
  const [newPromoDiscountedPrice, setNewPromoDiscountedPrice] = useState<string>('');

  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editPromoName, setEditPromoName] = useState<string>('');
  const [editPromoOriginalPrice, setEditPromoOriginalPrice] = useState<string>('');
  const [editPromoDiscountedPrice, setEditPromoDiscountedPrice] = useState<string>('');

  const handleAddChemicalPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoName.trim() || !newPromoOriginalPrice || !newPromoDiscountedPrice) return;

    const op = Math.max(0, parseFloat(newPromoOriginalPrice) || 0);
    const dp = Math.max(0, parseFloat(newPromoDiscountedPrice) || 0);

    const newPromo: ChemicalPromo = {
      id: `chem-promo-${Date.now()}`,
      name: newPromoName.trim(),
      originalPrice: op,
      discountedPrice: dp,
      isActive: true
    };

    onUpdateChemicalPromos([...chemicalPromos, newPromo]);
    setNewPromoName('');
    setNewPromoOriginalPrice('');
    setNewPromoDiscountedPrice('');
  };

  const handleTogglePromoActive = (id: string) => {
    const updated = chemicalPromos.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
    onUpdateChemicalPromos(updated);
  };

  const handleDeletePromo = (id: string) => {
    const promoName = chemicalPromos.find(c => c.id === id)?.name || '';
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบโปรโมชั่นเคมี',
      message: `คุณต้องการลบรายการโปรโมชั่นเคมี "${promoName}" ออกจากระบบใช่หรือไม่?`,
      type: 'danger',
      onConfirm: () => {
        const updated = chemicalPromos.filter(c => c.id !== id);
        onUpdateChemicalPromos(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleStartEditPromo = (promo: ChemicalPromo) => {
    setEditingPromoId(promo.id);
    setEditPromoName(promo.name);
    setEditPromoOriginalPrice(promo.originalPrice.toString());
    setEditPromoDiscountedPrice(promo.discountedPrice.toString());
  };

  const handleCancelEditPromo = () => {
    setEditingPromoId(null);
  };

  const handleSaveEditPromo = (id: string) => {
    if (!editPromoName.trim()) return;
    const op = Math.max(0, parseFloat(editPromoOriginalPrice) || 0);
    const dp = Math.max(0, parseFloat(editPromoDiscountedPrice) || 0);

    const updated = chemicalPromos.map(c => c.id === id ? {
      ...c,
      name: editPromoName.trim(),
      originalPrice: op,
      discountedPrice: dp
    } : c);

    onUpdateChemicalPromos(updated);
    setEditingPromoId(null);
  };

  const handleMovePromoUp = (index: number) => {
    if (index === 0) return;
    const updated = [...chemicalPromos];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onUpdateChemicalPromos(updated);
  };

  const handleMovePromoDown = (index: number) => {
    if (index === chemicalPromos.length - 1) return;
    const updated = [...chemicalPromos];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onUpdateChemicalPromos(updated);
  };


  if (shopConfig.isPinLocked && !isUnlocked && shopConfig.pinCode) {
    const targetLen = shopConfig.pinCode.length;
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 p-8 shadow-md space-y-6 text-center py-12" id="pin-lock-screen">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        
        <div className="space-y-1.5">
          <h2 className="text-base font-extrabold text-slate-900">ระบุรหัส PIN เพื่อแยกสิทธิ์ความปลอดภัย</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto px-4">
            หน้าจอนี้ถูกจำกัดการเข้าถึงเฉพาะผู้จัดการร้าน กรุณาระบุรหัส PIN {targetLen} หลักเพื่อควบคุมการตั้งค่า
          </p>
        </div>

        {/* PIN Indicators Dots */}
        <div className="flex justify-center items-center space-x-3.5 py-1">
          {Array.from({ length: targetLen }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                idx < enteredPin.length
                  ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-sm'
                  : 'bg-slate-50 border-slate-300'
              }`}
            />
          ))}
        </div>

        {pinError ? (
          <p className="text-xs text-rose-600 font-extrabold flex items-center justify-center space-x-1 animate-bounce">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{pinError}</span>
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">PROTECTED SYSTEM BLOCK</p>
        )}

        {/* On-screen Keypad */}
        <div className="grid grid-cols-3 gap-3.5 max-w-[210px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handlePinKeyPress(num)}
              className="w-12 h-12 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-black transition-all border border-slate-100 flex items-center justify-center active:scale-95 cursor-pointer select-none"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handlePinClear}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer select-none"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => handlePinKeyPress('0')}
            className="w-12 h-12 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-black transition-all border border-slate-100 flex items-center justify-center active:scale-95 cursor-pointer select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handlePinDelete}
            className="w-12 h-12 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer select-none"
          >
            ลบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="config-settings">
      
      {/* 1. GENERAL SHOP SETTINGS & SECURITY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Store className="w-5 h-5 text-indigo-500" />
            <span>แก้ไขตั้งค่าทั่วไปและรหัสความปลอดภัย</span>
          </h3>
          {shopConfig.isPinLocked && (
            <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <Unlock className="w-3.5 h-3.5" />
              <span>รหัสผ่านถูกต้อง ( unlocked )</span>
            </span>
          )}
        </div>
        
        <form onSubmit={handleSaveShopConfig} className="space-y-4">
          {/* Shop Logo upload segment */}
          <div className="border-b border-dashed border-slate-100 pb-4 space-y-2">
            <span className="block text-xs font-semibold text-slate-700">โลโก้หรือรูปโปรไฟล์ประจำร้าน (Shop Logo):</span>
            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shadow-inner">
                  {shopLogoUrl ? (
                    <img 
                      src={shopLogoUrl} 
                      alt="Shop Logo Preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <Store className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                {shopLogoUrl && (
                  <button
                    type="button"
                    onClick={handleClearLogo}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-md transition-all duration-150 cursor-pointer"
                    title="ลบโลโก้ร้าน"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Upload interface */}
              <div className="text-left space-y-1 w-full max-w-sm">
                <label className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>เลือกไฟล์รูปภาพ (.jpg, .png)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    className="hidden" 
                  />
                </label>
                <p className="text-[10px] text-slate-400 font-sans">
                  * แนะนำรูปภาพสี่เหลี่ยมด้านเท่า ระบบจะช่วยจัดขนาดและย่อไฟล์รูปภาพให้อัตโนมัติ (ขนาดเล็ก คุ้มค่า ปลอดภัยต่อฐานข้อมูล)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 w-full">
              <span className="block text-xs font-semibold text-slate-600">ชื่อร้านบาร์เบอร์แต่งทรงผม:</span>
              <input
                type="text"
                value={shopNameInput}
                onChange={(e) => setShopNameInput(e.target.value)}
                placeholder="กรุณากรอกชื่อร้าน..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* PIN Settings Panel */}
            <div className="space-y-1.5 w-full">
              <span className="block text-xs font-semibold text-slate-600">สิทธิ์พนักงาน (PIN ล็อคป้องกันหน้านี้):</span>
              <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-xl border border-slate-200 h-[38px]">
                <label className="flex items-center space-x-2 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={isPinLockedInput}
                    onChange={(e) => {
                      setIsPinLockedInput(e.target.checked);
                      if (e.target.checked && !pinCodeInput) {
                        setPinCodeInput('1234'); // Default PIN
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 rounded bg-white"
                  />
                  <span className="text-xs font-bold text-slate-700">เปิดใช้งานรหัสผ่าน PIN เพื่อเข้าแก้ไขตั้งค่า</span>
                </label>
              </div>
            </div>

            {/* Primary Brand Color Selection */}
            <div className="space-y-1.5 w-full md:col-span-2 border-t border-dashed border-slate-100 pt-4 mt-2">
              <span className="block text-xs font-semibold text-slate-700">สีหลักของแบรนด์ร้านค้า (Primary Brand Color):</span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 shadow-sm shrink-0">
                    <input
                      type="color"
                      value={primaryColorInput}
                      onChange={(e) => setPrimaryColorInput(e.target.value)}
                      className="absolute inset-0 w-[200%] h-[200%] -translate-x-[25%] -translate-y-[25%] cursor-pointer border-0 p-0 bg-transparent"
                      id="brand-color-picker"
                    />
                  </div>
                  <input
                    type="text"
                    value={primaryColorInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setPrimaryColorInput(val);
                      }
                    }}
                    placeholder="#6366f1"
                    className="w-24 px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    maxLength={7}
                  />
                </div>
                
                {/* Standard presets for quick selection */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">โทนสียอดนิยม:</span>
                  {[
                    { hex: '#6366f1', name: 'Indigo' },
                    { hex: '#10b981', name: 'Emerald' },
                    { hex: '#3b82f6', name: 'Blue' },
                    { hex: '#ec4899', name: 'Pink' },
                    { hex: '#f59e0b', name: 'Amber' },
                    { hex: '#0f172a', name: 'Slate' },
                    { hex: '#dc2626', name: 'Red' },
                    { hex: '#8b5cf6', name: 'Purple' },
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setPrimaryColorInput(preset.hex)}
                      className={`h-7 px-2.5 rounded-full border text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer hover:scale-105 ${
                        primaryColorInput.toLowerCase() === preset.hex.toLowerCase()
                          ? 'border-slate-800 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                      title={preset.name}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed pl-1">
                * เลือกสีที่ตรงกับเอกลักษณ์ของร้านคุณ ปุ่มเมนู ยอดขาย แถบเมนู ไฮไลท์การทำธุรกรรม คิวจอง และองค์ประกอบทั้งหมดจะถูกปรับเปลี่ยนไปตามชุดสีนี้แบบไดนามิกเรียลไทม์
              </p>
            </div>

            {/* Billing Cycle Cutoff Day Input */}
            <div className="space-y-1.5 w-full md:col-span-2">
              <span className="block text-xs font-semibold text-slate-600">รอบวันตัดยอดบัญชีรายเดือน (วันสิ้นสุดของรอบบิล):</span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/60">
                <div className="relative shrink-0 w-full sm:w-auto">
                  <select
                    value={billingCutoffDayInput}
                    onChange={(e) => setBillingCutoffDayInput(parseInt(e.target.value, 10))}
                    className="w-full sm:w-auto pl-3 pr-8 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={1}>วันที่ 1 ของเดือน (เริ่มนับ 1 ของเดือน)</option>
                    {[...Array(27)].map((_, i) => (
                      <option key={i + 2} value={i + 2}>ทุกวันที่ {i + 2} ของเดือน (รอบเริ่มวันที่ {i + 3})</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-indigo-950 font-sans leading-relaxed">
                  * เช่น หากตั้งเป็น <strong>ทุกวันที่ 25 ของเดือน</strong> รอบบัญชีเดือนมิถุนายน (2026-06) จะเริ่มนับยอดเงินสะสมตั้งแต่วันที่ 26 พฤษภาคม จนถึงวันที่ 25 มิถุนายน ของทุกปี ระบบจะทำการคำนวณและกรองรายงานให้ตรงกันโดยอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Additional Modules: Booking System Toggle */}
            <div className="space-y-1.5 w-full md:col-span-2 border-t border-dashed border-slate-100 pt-4 mt-2">
              <span className="block text-xs font-semibold text-slate-700">ระบบฟังก์ชันเสริม (Additional Modules):</span>
              <div className="flex items-center space-x-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                <label className="flex items-start space-x-3 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={enableBookingsInput}
                    onChange={(e) => setEnableBookingsInput(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 bg-white mt-0.5"
                  />
                  <div>
                    <span className="block text-xs font-extrabold text-slate-900">เปิดใช้งานระบบจองคิว / ตารางจองคิว (Enable Booking System)</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      หากต้องการปิดฟังก์ชันนี้ (เช่น ไม่ต้องการรับคิวล่วงหน้า หรือไม่ต้องการให้รบกวนหน้าจอหลัก) สามารถติ๊กออกเพื่อซ่อนแถบเมนู "ระบบจองคิว" ออกจากหน้าจอใช้งาน POS ได้ทันที
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {isPinLockedInput && (
            <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-amber-800 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>ระบุรหัส PIN ป้องกันเฉพาะผู้รู้ (4 หรือ 6 หลัก)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">กรุณาจำรหัสนี้ให้ถูกต้อง เพื่อเข้าถึงหน้านี้ภายภาคหน้า</p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type={showPinInput ? 'text' : 'password'}
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pinCodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPinCodeInput(val);
                    }}
                    placeholder="เลข PIN (4-6 หลัก)"
                    className="w-36 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center tracking-widest focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinInput(!showPinInput)}
                    className="text-xs font-bold text-indigo-600 hover:underline px-1"
                  >
                    {showPinInput ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกความปลอดภัย</span>
            </button>
          </div>
        </form>
        {isShopSaved && (
          <p className="text-xs text-emerald-600 font-semibold font-sans">✓ อัปเดตและบันทึกข้อมูลทั่วไปเรียบร้อยแล้ว</p>
        )}
      </div>

      {/* 2. CHOOSE COMMISSION (%) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <span>ปันส่วนแบ่งช่างและทางร้าน (% ส่วนแบ่งช่างตัดผม)</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          * กำหนดรายได้ที่จะถูกนำไปคำนวณเบื้องหลังเพื่อจัดแจงบัญชีเงินเดือนช่างแต่ละคน ฝ่ายบัญชีสามารถปรับการแบ่งสัดส่วนได้ตลอดเวลา
        </p>

        <form onSubmit={handleSaveShareConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Haircut share ratio */}
            <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-2">
              <span className="block text-xs font-semibold text-slate-600">อัตราส่วนแบ่งค่าตัดผมช่าง:</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={haircutPct}
                  onChange={(e) => setHaircutPct(parseInt(e.target.value, 10) || 0)}
                  className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl bg-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                ช่างได้รับ {haircutPct}% | ร้านได้รับ {100 - haircutPct}%
              </p>
            </div>

            {/* Chemical ratio */}
            <div className={`bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-2 transition-all ${!enableChemicalService ? 'opacity-40 select-none' : ''}`}>
              <span className="block text-xs font-semibold text-slate-600">อัตราส่วนแบ่งงานเคมีช่าง:</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={!enableChemicalService}
                  value={chemicalPct}
                  onChange={(e) => setChemicalPct(parseInt(e.target.value, 10) || 0)}
                  className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl bg-white font-mono text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                {enableChemicalService ? `ช่างได้รับ ${chemicalPct}% | ร้านได้รับ ${100 - chemicalPct}%` : 'ปิดใช้งานบริการเคมี'}
              </p>
            </div>

            {/* Merchandise ratio */}
            <div className={`bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-2 transition-all ${!enableProductSales ? 'opacity-40 select-none' : ''}`}>
              <span className="block text-xs font-semibold text-slate-600">ส่วนแบ่งค่าขายของในร้านช่าง:</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={!enableProductSales}
                  value={productPct}
                  onChange={(e) => setProductPct(parseInt(e.target.value, 10) || 0)}
                  className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl bg-white font-mono text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                {enableProductSales ? `ช่างได้รับ ${productPct}% | ร้านได้รับ ${100 - productPct}%` : 'ปิดใช้งานการขายสินค้า'}
              </p>
            </div>

          </div>

          {/* Divider and Feature Toggles (Chemical & Products) */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>เปิด/ปิดการแสดงช่องในระบบคิดเงิน (ค่าเคมี & สินค้า)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chemical Services Toggle */}
              <label className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                <div>
                  <span className="block text-xs font-semibold text-slate-700">เปิดใช้งาน "ช่องใส่ค่าเคมี"</span>
                  <span className="block text-[10px] text-slate-500">แสดงการป้อนค่าเคมีและระบบจัดส่วนแบ่งเคมีในหน้าคิดเงิน</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableChemicalService}
                  onChange={(e) => setEnableChemicalService(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </label>

              {/* Product Sales Toggle */}
              <label className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                <div>
                  <span className="block text-xs font-semibold text-slate-700">เปิดใช้งาน "ช่องรายการสินค้า"</span>
                  <span className="block text-[10px] text-slate-500">แสดงการเลือกสินค้าและระบบตัดสต็อก/ปันส่วนสินค้าในหน้าคิดเงิน</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableProductSales}
                  onChange={(e) => setEnableProductSales(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Divider and Promo Settings */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตั้งค่าระบบส่วนลดโปรโมชั่นของร้าน (เฉพาะตัดผม)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Show Promo Discount Toggle Checkbox */}
              <label className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 cursor-pointer">
                <div>
                  <span className="block text-xs font-semibold text-slate-700">เปิดระบบการให้ส่วนลดโปรโมชั่น</span>
                  <span className="block text-[10px] text-slate-500">หากติ๊กออก ปุ่มเลือกโปรโมชั่นจะไม่แสดงในหน้าตัดบิล</span>
                </div>
                <input
                  type="checkbox"
                  checked={showPromoDiscount}
                  onChange={(e) => setShowPromoDiscount(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </label>

              {/* Promo Discount Percentage */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-2">
                <span className="block text-xs font-semibold text-slate-600">สัดส่วน % ส่วนลดที่ต้องการลด:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={!showPromoDiscount}
                    value={promoDiscountPct}
                    onChange={(e) => setPromoDiscountPct(parseInt(e.target.value, 10) || 0)}
                    className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl bg-white font-mono text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-500 font-sans">
                  ส่วนลด {promoDiscountPct}% สำหรับคิดลดเฉพาะค่าบริการตัดผมเท่านั้น (ไม่กระทบรายได้ช่าง)
                </p>
              </div>
            </div>
          </div>

          {/* Divider and Booking Settings */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>ตั้งค่าระบบการคำนวณเวลาจองอัตโนมัติ (Booking Auto-calculation)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-2">
                <span className="block text-xs font-semibold text-slate-600">ระยะเวลาการบริการตั้งต้น:</span>
                <select
                  value={defaultBookingDuration}
                  onChange={(e) => setDefaultBookingDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer font-sans font-medium"
                >
                  <option value={30}>30 นาที (0.5 ชม.)</option>
                  <option value={60}>60 นาที (1.0 ชม.)</option>
                  <option value={90}>90 นาที (1.5 ชม.)</option>
                  <option value={120}>120 นาที (2.0 ชม.)</option>
                </select>
                <p className="text-[10px] text-slate-500 font-sans">
                  เมื่อคุณระบุเวลาเริ่มจอง ระบบจะคำนวณและระบุเวลาสิ้นสุดให้อัตโนมัติด้วยระยะเวลานี้
                </p>
              </div>
            </div>
          </div>



          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              บันทึกโครงสร้างรายได้ (%)
            </button>
          </div>
        </form>
        {isShareSaved && (
          <p className="text-xs text-emerald-600 font-semibold font-sans mt-1">✓ อัปเดตและเปลี่ยนโครงสร้างรายได้ใหม่สำเร็จแล้ว</p>
        )}
      </div>

      {/* 3. BARBER LIST CONFIGURATION */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <span>รายชื่อช่างประจําสาขา (แก้ไขชื่อจริง-ตำแหน่ง และสถานะการทำงาน)</span>
        </h3>

        {/* Add new barber form */}
        <form onSubmit={handleAddBarber} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <p className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>➕ ลงทะเบียนช่างตัดผมในระบบคนใหม่</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-700">ชื่อเล่นช่าง <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                placeholder="ระบุชื่อเล่น"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans transition-all font-medium shadow-xs"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-700">ชื่อจริง - นามสกุล</label>
              <input
                type="text"
                placeholder="แสดงในสลิปทางการ (ถ้ามี)"
                value={newBarberRealName}
                onChange={(e) => setNewBarberRealName(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans transition-all font-medium shadow-xs"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-700">ตำแหน่งการทำงาน (Position)</label>
              <select
                value={newBarberPosition}
                onChange={(e) => setNewBarberPosition(e.target.value)}
                className="w-full h-10 px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans transition-all font-medium shadow-xs cursor-pointer"
              >
                <option value="Hairdresser">Hairdresser (ช่างตัดผมหลัก)</option>
                <option value="Branch Manager">Branch Manager (ผู้จัดการสาขา)</option>
                <option value="Junior Barber">Junior Barber (ช่างผู้ช่วย)</option>
                <option value="Senior Stylist">Senior Stylist (ช่างทำผมอาวุโส)</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-700">ฐานเงินเดือน (บาท/เดือน)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="ใส่ 0 หรือเว้นว่างหากไม่มี"
                value={newBarberBaseSalary}
                onChange={(e) => setNewBarberBaseSalary(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans transition-all font-medium shadow-xs"
              />
            </div>
          </div>

          <div className="text-right pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1 shadow-xs cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มช่างลงระบบ</span>
            </button>
          </div>
        </form>

        {/* Barbers list */}
        <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-2 pt-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/20">
          {barbers.map((barber, idx) => {
            const isEditing = editingBarberId === barber.id;
            return (
              <div key={barber.id} className="p-4 bg-white rounded-2xl border border-slate-150 transition-all space-y-3 shadow-xs text-left">
                {isEditing ? (
                  /* INLINE EDIT MODE FORM */
                  <div className="space-y-4">
                    <p className="text-[11px] font-extrabold text-indigo-600">✍️ กำลังแก้ไขข้อมูลช่าง {barber.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-indigo-100">
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-slate-700">ชื่อเล่นช่าง <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition-all shadow-xs"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-slate-700">ชื่อจริง - นามสกุล</label>
                        <input
                          type="text"
                          value={editRealName}
                          onChange={(e) => setEditRealName(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition-all shadow-xs"
                          placeholder="ยังไม่มีชื่อจริง"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-slate-700">ตำแหน่งการทำงาน (Position)</label>
                        <select
                          value={editPosition}
                          onChange={(e) => setEditPosition(e.target.value)}
                          className="w-full h-10 px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition-all shadow-xs cursor-pointer"
                        >
                          <option value="Hairdresser">Hairdresser</option>
                          <option value="Branch Manager">Branch Manager</option>
                          <option value="Junior Barber">Junior Barber</option>
                          <option value="Senior Stylist">Senior Stylist</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="block text-xs font-bold text-slate-700">ฐานเงินเดือน (บาท/เดือน)</label>
                        <input
                          type="number"
                          min="0"
                          value={editBaseSalary}
                          onChange={(e) => setEditBaseSalary(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition-all shadow-xs"
                          placeholder="ยังไม่มีฐานเงินเดือน"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2.5">
                      <button
                        type="button"
                        onClick={handleCancelEditBarber}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>ยกเลิก</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditBarber(barber.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>บันทึกข้อมูล</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* DISPLAY MODE */
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Reorder Buttons */}
                      <div className="flex flex-row md:flex-col gap-0.5 items-center shrink-0 border-r border-slate-100 pr-2">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveBarberUp(idx)}
                          className={`p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:text-slate-150 disabled:hover:bg-transparent transition-all ${idx === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          title="เลื่อนอันดับขึ้น / Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === barbers.length - 1}
                          onClick={() => handleMoveBarberDown(idx)}
                          className={`p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:text-slate-150 disabled:hover:bg-transparent transition-all ${idx === barbers.length - 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          title="เลื่อนอันดับลง / Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 text-left">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-sm font-extrabold text-slate-800">ช่าง{barber.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            barber.isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {barber.isWorking ? '● ทำงานวันนี้' : '○ ลา/ปกติ'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{barber.position || 'Hairdresser'}</span>
                        </div>
                        
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 flex-wrap gap-y-1.5 font-sans">
                          <span className="font-bold text-slate-600">ชื่อจริง:</span>
                          <span className="bg-indigo-50/70 border border-indigo-100/40 text-indigo-800 px-2.5 py-0.5 rounded-md font-medium">
                            {barber.realName ? barber.realName : `(ยังไม่กำหนดชื่อจริง - ใช้ "ช่าง${barber.name}" บรรเทาแทน)`}
                          </span>
                          <span className="font-bold text-slate-600 ml-1">ฐานเงินเดือน:</span>
                          <span className="bg-emerald-50/70 border border-emerald-100/40 text-emerald-800 px-2.5 py-0.5 rounded-md font-medium">
                            {barber.baseSalary !== undefined && barber.baseSalary > 0 ? `${formatBaht(barber.baseSalary)}` : 'ไม่มี (คิดตามส่วนแบ่ง)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEditBarber(barber)}
                        className="px-2.5 py-1.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                        title="แก้ไขรายละเอียดช่าง"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูล</span>
                      </button>

                      {/* Working Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleWorking(barber.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                          barber.isWorking
                            ? 'bg-emerald-100/50 hover:bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100/50 hover:bg-rose-100 text-rose-800'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{barber.isWorking ? 'เวรมาทำงาน' : 'สถานะลางาน'}</span>
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBarber(barber.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="ลบรายชื่อช่าง"
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

      {/* 4. PRODUCTS LIST CONFIGURATION */}
      {shareConfig.enableProductSales !== false && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            <span>จัดแจงบริการและสินค้าหน้าร้าน (แก้ไข หรือ ปิดสถานะสินค้าหมด)</span>
          </h3>

          {/* Add Product Form */}
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="ชื่อสินค้าเซ็ตผม / แชมพูสระ"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="sm:col-span-2 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs"
            />
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="0"
                placeholder="ราคา (บาท)"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs font-mono"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center h-full whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-0.5" />
                <span>เพิ่มสินค้า</span>
              </button>
            </div>
          </form>

          {/* Products Listing with Out of Stock toggle */}
          <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-2 pt-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/20">
            {products.map((item, idx) => {
              const isEditing = editingProductId === item.id;
              return (
                <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-150 transition-all space-y-3 shadow-xs text-left">
                  {isEditing ? (
                    /* INLINE EDIT PRODUCT FORM */
                    <div className="space-y-4 animate-fadeIn">
                      <p className="text-[11px] font-extrabold text-emerald-600">✍️ กำลังแก้ไขข้อมูลสินค้า {item.name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ชื่อสินค้า/บริการ <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={editProductName}
                            onChange={(e) => setEditProductName(e.target.value)}
                            className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-sans focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium transition-all shadow-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">ราคาปกติ (บาท) <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={editProductPrice}
                            onChange={(e) => setEditProductPrice(e.target.value)}
                            className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium transition-all shadow-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2.5">
                        <button
                          type="button"
                          onClick={handleCancelEditProduct}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>ยกเลิก</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditProduct(item.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>บันทึกข้อมูล</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* DISPLAY MODE */
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Reorder Buttons */}
                        <div className="flex flex-row md:flex-col gap-0.5 items-center shrink-0 border-r border-slate-100 pr-2">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveProductUp(idx)}
                            className={`p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:text-slate-150 disabled:hover:bg-transparent transition-all ${idx === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            title="เลื่อนอันดับขึ้น / Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === products.length - 1}
                            onClick={() => handleMoveProductDown(idx)}
                            className={`p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:text-slate-150 disabled:hover:bg-transparent transition-all ${idx === products.length - 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            title="เลื่อนอันดับลง / Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-0.5 text-left">
                          <span className={`text-sm font-bold ${item.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                            {item.name}
                          </span>
                          <span className="block text-xs font-semibold text-slate-500 font-mono">
                            {formatBaht(item.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditProduct(item)}
                          className="px-2.5 py-1.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                          title="แก้ไขรายละเอียดสินค้า"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไขข้อมูล</span>
                        </button>

                        {/* Active Toggle (ปิดสถานะสินค้าในกรณีของหมด) */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductActive(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-3xs ${
                            item.isActive
                              ? 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/50'
                              : 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-700 border-amber-200/50'
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
                              <span>ของหมด / ปิดสถานะสินค้า (Out)</span>
                            </>
                          )}
                        </button>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="ลบสินค้า"
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
      )}

      {/* 5. CHEMICAL PROMOTIONS CONFIGURATION */}
      {shareConfig.enableChemicalService !== false && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Percent className="w-5 h-5 text-indigo-500" />
            <span>จัดการโปรโมชั่นงานเคมี (ดัด ยืด ทำสี)</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            * กำหนดค่าบริการเคมี และส่วนลดพิเศษหน้าร้าน โดยส่วนแบ่งระหว่างช่างและร้านค้า จะถูกคิดจาก <b>"ราคาคงเหลือหลังหักส่วนลดจริง"</b> เสมอ
          </p>

          {/* Add Chemical Promo Form */}
          <form onSubmit={handleAddChemicalPromo} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2">
            <input
              type="text"
              required
              placeholder="ชื่อโปรโมชั่นเคมี เช่น ยืดผม+ดัดลอน"
              value={newPromoName}
              onChange={(e) => setNewPromoName(e.target.value)}
              className="sm:col-span-2 md:col-span-5 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs"
            />
            <input
              type="number"
              required
              min="0"
              placeholder="ราคาปกติ (บาท)"
              value={newPromoOriginalPrice}
              onChange={(e) => setNewPromoOriginalPrice(e.target.value)}
              className="md:col-span-2 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs font-mono"
            />
            <input
              type="number"
              required
              min="0"
              placeholder="ราคาลดเหลือ (บาท)"
              value={newPromoDiscountedPrice}
              onChange={(e) => setNewPromoDiscountedPrice(e.target.value)}
              className="md:col-span-2 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs font-mono"
            />
            <button
              type="submit"
              className="sm:col-span-2 md:col-span-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center whitespace-nowrap cursor-pointer h-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>เพิ่มโปรร้าน</span>
            </button>
          </form>

          {/* List of Chemical Promos */}
          <div className="grid grid-cols-1 gap-2 pt-2">
            {chemicalPromos.map((promo, index) => {
              const isEditing = editingPromoId === promo.id;
              return (
                <div key={promo.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-3">
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                      <input
                        type="text"
                        className="px-3 py-1 border border-slate-200 rounded-lg text-xs"
                        value={editPromoName}
                        onChange={(e) => setEditPromoName(e.target.value)}
                        placeholder="ชื่อโปรโมชั่น"
                      />
                      <input
                        type="number"
                        className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                        value={editPromoOriginalPrice}
                        onChange={(e) => setEditPromoOriginalPrice(e.target.value)}
                        placeholder="ราคาปกติ"
                      />
                      <input
                        type="number"
                        className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                        value={editPromoDiscountedPrice}
                        onChange={(e) => setEditPromoDiscountedPrice(e.target.value)}
                        placeholder="ราคาพิเศษ"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-sans ${promo.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {promo.name}
                        </span>
                        {!promo.isActive && (
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold font-sans">ปิดใช้งาน</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-sans mt-0.5">
                        <span>ราคาปกติ: </span>
                        <span className="line-through font-mono">{formatBaht(promo.originalPrice)}</span>
                        <span>→</span>
                        <span className="text-emerald-700 font-extrabold font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">ลดเหลือ: {formatBaht(promo.discountedPrice)}</span>
                        <span className="text-indigo-600 font-bold font-mono">(ประหยัดไป: {formatBaht(promo.originalPrice - promo.discountedPrice)})</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-1.5 self-end sm:self-center">
                    {/* Sorting Buttons */}
                    <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => handleMovePromoUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all border-b border-slate-100 cursor-pointer"
                        title="เลื่อนขึ้น"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePromoDown(index)}
                        disabled={index === chemicalPromos.length - 1}
                        className="p-1 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                        title="เลื่อนลง"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>

                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEditPromo(promo.id)}
                          className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all text-xs font-bold cursor-pointer"
                          title="บันทึก"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditPromo}
                          className="p-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all text-xs cursor-pointer"
                          title="ยกเลิก"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEditPromo(promo)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="แก้ไขโปรโมชั่น"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePromoActive(promo.id)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            promo.isActive 
                              ? 'text-emerald-600 hover:bg-emerald-50' 
                              : 'text-slate-400 hover:bg-slate-200'
                          }`}
                          title={promo.isActive ? 'ปิดส่วนลดชั่วคราว' : 'เปิดสถานะส่วนลด'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="ลบโปรโมชั่นเคมีนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. VOUCHERS MANAGEMENT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <Gift className="w-5 h-5 text-rose-500" />
          <span>จัดการ Gift Voucher และคูปองบัตรสะสมสมนาคุณ</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          * เพิ่มหรือถอนราคาคูปอง โดยลูกค้าที่นำคูปองมาใช้ ยอดเงินจะถูกลดไป แต่เปอร์เซ็นต์ปันผลของช่างตัดผมจะคงที่ตามราคาปกติหน้าร้าน
        </p>

        {/* Add Voucher Form */}
        <form onSubmit={handleAddVoucher} className="flex gap-2">
          <input
            type="number"
            required
            min="10"
            max="1000"
            placeholder="ระบุราคาบัตร บัตรกำนัล เช่น 20 , 50 , 100"
            value={newVoucherValue}
            onChange={(e) => setNewVoucherValue(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-xs font-mono"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่ม Voucher ใหม่</span>
          </button>
        </form>

        {/* Vouchers list with toggling options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          {vouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-150">
              <span className={`text-sm font-bold font-mono ${v.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                Gift Voucher {v.value} บาท
              </span>

              <div className="flex items-center space-x-1">
                {/* Active Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleVoucherActive(v.id)}
                  className={`p-1.5 rounded-lg transition-all ${
                    v.isActive 
                      ? 'text-emerald-600 hover:bg-emerald-50' 
                      : 'text-slate-400 hover:bg-slate-200'
                  }`}
                  title={v.isActive ? 'เปิดสถานะคูปอง' : 'ปิดสถานะคูปอง'}
                >
                  <Power className="w-4 h-4" />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteVoucher(v.id)}
                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. RESET SYSTEM & DATA CLEAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-rose-500" />
          <span>จัดการฐานข้อมูลระบบ (ล้างข้อมูล & เริ่มต้นใช้งานจริง)</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          หากท่านต้องการเริ่มใช้งานจริงในวันนี้ และต้องการล้างยอดขายตัวอย่างเดิมทั้งหมดออก สามารถเลือกล้างฐานข้อมูลได้จากปุ่มด้านล่างนี้ (เมื่อล้างแล้วไม่สามารถกู้คืนได้):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Option 1: Clear Sales Data only */}
          <div className="p-4 border border-rose-100 bg-rose-50/10 rounded-2xl space-y-3">
            <div>
              <span className="block text-xs font-bold text-rose-700">ล้างประวัติการขายตัวอย่าง (แนะนำเมื่อเริ่มเปิดร้านจริง)</span>
              <span className="block text-[10px] text-slate-500 mt-1">ลบประวัติบิลการขายเก่าทั้งหมดออก เพื่อให้ยอดขายสะสมเป็น 0 บาท แต่ยังคงชื่อช่างตัดผม รายการสินค้า และรหัสคูปองไว้ครบถ้วนเหมือนเดิม</span>
            </div>
            
            {showClearSalesConfirm ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <span className="block text-xs font-bold text-rose-800 flex items-center gap-1">
                  ⚠️ ยืนยันการล้างประวัติการขายหรือไม่?
                </span>
                <p className="text-[11px] text-rose-600 leading-relaxed font-semibold">
                  ข้อมูลประวัติบิลการขายเก่าทั้งหมดจะถูกลบออกอย่างถาวรเป็น 0 บิล และไม่สามารถกู้คืนกลับมาใหม่ประการใด
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearSalesConfirm(false)}
                    className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearSales();
                      setShowClearSalesConfirm(false);
                      setAlertDialog({
                        isOpen: true,
                        title: 'ล้างข้อมูลสำเร็จ',
                        message: 'ล้างข้อมูลการขายสำเร็จ! ตอนนี้ประวัติการขายของคุณว่างเปล่า พร้อมสำหรับเริ่มต้นบริการวันนี้แล้วครับ'
                      });
                    }}
                    className="flex-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    ยืนยันล้างสถิติ
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearSalesConfirm(true)}
                className="w-full px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ล้างเฉพาะประวัติการขาย (มี {salesCount} รายการ)</span>
              </button>
            )}
          </div>

          {/* Option 2: Full System Reset */}
          <div className="p-4 border border-slate-200 bg-slate-50/30 rounded-2xl space-y-3">
            <div>
              <span className="block text-xs font-bold text-slate-700">รวมคืนค่าเริ่มต้นระบบทั้งหมด (Factory Reset)</span>
              <span className="block text-[10px] text-slate-500 mt-1">รีเซ็ตชุดข้อมูลในเครื่องทั้งหมด ทั้งรายชื่อช่างตัดผม, รายการสินค้าขาย, อัตราส่วนและเงินปันผล และคูปองกลับไปยังค่าตั้งต้นโรงงานเดิม</span>
            </div>

            {showFullResetConfirm ? (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl space-y-3">
                <span className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  ⚠️ คำเตือน: ยืนยันการคืนค่าโรงงาน?
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  นี่คือการล้างระบบใหม่ทั้งหมด! รายชื่อช่างที่เปลี่ยนใหม่ สินค้า คูปองสะสม และข้อมูลบิลสะสมทั้งหมดจะกลับไปเป็นค่าเริ่มต้นเสมือนเพิ่งติดตั้งแอป
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFullResetConfirm(false)}
                    className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFullReset();
                      setShowFullResetConfirm(false);
                      setAlertDialog({
                        isOpen: true,
                        title: 'รีเซ็ตสำเร็จ',
                        message: 'คืนค่าเริ่มต้นระบบทั้งหมดเสร็จสมบูรณ์เรียบร้อยแล้ว!'
                      });
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    ยืนยันล้างระบบทั้งหมด
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFullResetConfirm(true)}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Power className="w-4 h-4" />
                <span>คืนค่าเริ่มต้นคืนสภาพโรงงานใหม่ทั้งหมด</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-start space-x-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmDialog.type === 'danger' ? 'bg-rose-50 text-rose-600' :
                confirmDialog.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {confirmDialog.type === 'danger' ? <Trash2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-extrabold text-slate-950 font-sans">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">{confirmDialog.message}</p>
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
                className={`px-4.5 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmDialog.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-100' :
                  confirmDialog.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100'
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center animate-scaleUp">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 font-sans">{alertDialog.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">{alertDialog.message}</p>
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
