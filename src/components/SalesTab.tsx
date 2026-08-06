import React, { useState, useEffect } from 'react';
import { Barber, Product, ShareConfig, SaleRecord, Voucher, ChemicalPromo } from '../types';
import { formatBaht } from '../utils';
import { Check, ClipboardList, Scissors, Sparkles, ShoppingBag, Gift, Heart, CreditCard, Landmark, Percent, Calendar, Clock, Coins, Link as LinkIcon } from 'lucide-react';

interface SalesTabProps {
  sales?: SaleRecord[];
  barbers: Barber[];
  products: Product[];
  chemicalPromos: ChemicalPromo[];
  shareConfig: ShareConfig;
  vouchers: Voucher[];
  onSaveSale: (record: Omit<SaleRecord, 'id' | 'timestamp' | 'date'> & { timestamp?: string; date?: string }) => void;
}

export default function SalesTab({ sales = [], barbers, products, chemicalPromos, shareConfig, vouchers, onSaveSale }: SalesTabProps) {
  // Helper to get local date ISO string YYYY-MM-DDTHH:mm
  const getLocalISODateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Local active state
  const activeBarbers = barbers.filter(b => b.isWorking);
  
  // Input states
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [haircutInput, setHaircutInput] = useState<string>('');
  const [chemicalInput, setChemicalInput] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productQtyInput, setProductQtyInput] = useState<number>(1);
  const [selectedChemicalPromoId, setSelectedChemicalPromoId] = useState<string>('');
  const [tipInput, setTipInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
  const [useDiscount10, setUseDiscount10] = useState<boolean>(false);
  const [useVoucherId, setUseVoucherId] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  
  // Group Payment Option States
  const [isGroupPayment, setIsGroupPayment] = useState<boolean>(false);
  const [groupPaymentOption, setGroupPaymentOption] = useState<'new' | 'link'>('new');
  const [newGroupCode, setNewGroupCode] = useState<string>('');
  const [selectedGroupLink, setSelectedGroupLink] = useState<string>('');

  // chemical service discount state additions
  const [applyChemicalDiscount, setApplyChemicalDiscount] = useState<boolean>(false);
  const [chemicalDiscountValueInput, setChemicalDiscountValueInput] = useState<string>('');
  const [chemicalDiscountType, setChemicalDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  
  const [customDateTime, setCustomDateTime] = useState<string>(getLocalISODateTime());
  const [mobileTab, setMobileTab] = useState<'items' | 'summary'>('items');

  // Sync chemical default discount when user ticks the option on POS
  useEffect(() => {
    if (applyChemicalDiscount) {
      if (shareConfig.defaultChemicalDiscountValue !== undefined && shareConfig.defaultChemicalDiscountValue !== null) {
        setChemicalDiscountValueInput(shareConfig.defaultChemicalDiscountValue.toString());
      } else {
        setChemicalDiscountValueInput('');
      }
      if (shareConfig.defaultChemicalDiscountType) {
        setChemicalDiscountType(shareConfig.defaultChemicalDiscountType);
      } else {
        setChemicalDiscountType('percentage');
      }
    } else {
      setChemicalDiscountValueInput('');
    }
  }, [applyChemicalDiscount, shareConfig.defaultChemicalDiscountValue, shareConfig.defaultChemicalDiscountType]);

  // Sync selected barber only if the previously selected barber is no longer working/active in the system
  useEffect(() => {
    if (selectedBarberId) {
      const exists = activeBarbers.some(b => b.id === selectedBarberId);
      if (!exists) {
        setSelectedBarberId('');
      }
    }
  }, [activeBarbers, selectedBarberId]);

  // Derived calculations
  const selectedDateStr = customDateTime.split('T')[0];

  const activeGroups = React.useMemo(() => {
    const groups: { id: string; label: string; totalAmount: number; count: number }[] = [];
    const seenGroupIds = new Set<string>();
    
    // Find today's transfers
    const todayTransfers = sales.filter(s => s.date === selectedDateStr && s.paymentMethod === 'transfer');
    
    // 1. Gather existing groups
    todayTransfers.forEach(s => {
      if (s.groupPaymentId && !seenGroupIds.has(s.groupPaymentId)) {
        seenGroupIds.add(s.groupPaymentId);
        const groupRecords = todayTransfers.filter(r => r.groupPaymentId === s.groupPaymentId);
        const total = groupRecords.reduce((sumVal, r) => sumVal + r.customerPaid, 0);
        groups.push({
          id: s.groupPaymentId,
          label: s.groupPaymentCode || `กลุ่มโอนร่วม #${s.groupPaymentId.slice(-4)}`,
          totalAmount: total,
          count: groupRecords.length
        });
      }
    });

    // 2. Gather individual transfer transactions of today that have no group ID yet (potential groups)
    const potentialSingles = todayTransfers.filter(s => !s.groupPaymentId);

    return {
      existingGroups: groups,
      potentialSingles: potentialSingles.map(s => ({
        id: s.id, // can serve as group UID directly
        label: `${s.customerName ? s.customerName : 'ลูกค้าช่าง' + s.barberName} (${formatBaht(s.customerPaid)})`,
        count: 1,
        totalAmount: s.customerPaid
      }))
    };
  }, [sales, selectedDateStr]);

  const haircutPrice = Math.max(0, parseFloat(haircutInput) || 0);
  const chemicalPrice = shareConfig.enableChemicalService !== false ? (Math.max(0, parseFloat(chemicalInput) || 0)) : 0;
  
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const productPrice = (shareConfig.enableProductSales !== false && selectedProduct && selectedProduct.isActive) ? (selectedProduct.price * productQtyInput) : 0;
  const tipAmount = Math.max(0, parseFloat(tipInput) || 0);

  // Subtotal before any discounts
  const subtotal = haircutPrice + chemicalPrice + productPrice;

  // Configurable discount percentage and toggle from shareConfig (default to 10% and shown)
  const showPromoDiscount = shareConfig.showPromoDiscount !== false;
  const promoDiscountPct = shareConfig.promoDiscountPct ?? 10;

  // Calculate chemical discount amount based on user input
  const chemicalDiscountValue = Math.max(0, parseFloat(chemicalDiscountValueInput) || 0);
  const chemicalDiscountAmount = React.useMemo(() => {
    if (!applyChemicalDiscount || chemicalPrice <= 0 || chemicalDiscountValue <= 0) return 0;
    if (chemicalDiscountType === 'percentage') {
      return (chemicalPrice * chemicalDiscountValue) / 100;
    } else {
      return Math.min(chemicalPrice, chemicalDiscountValue);
    }
  }, [applyChemicalDiscount, chemicalPrice, chemicalDiscountValue, chemicalDiscountType]);

  const actualChemicalPrice = Math.max(0, chemicalPrice - chemicalDiscountAmount);

  // Calculate discounts
  // Discount is calculated ONLY on the haircut price as requested
  const discount10Amount = useDiscount10 ? (haircutPrice * promoDiscountPct) / 100 : 0;
  
  const selectedVoucher = vouchers.find(v => v.id === useVoucherId);
  const voucherValue = (selectedVoucher && selectedVoucher.isActive) ? selectedVoucher.value : 0;

  // Total discounts includes haircut regular discount, vouchers, and chemical service discount
  const totalDiscounts = discount10Amount + voucherValue + chemicalDiscountAmount;
  // Customer paid = subtotal plus tip minus total discounts (cap at 0 representing customer paying 0 minimum before tip, then add tip)
  const payableAmount = Math.max(0, subtotal - totalDiscounts) + tipAmount;

  // Backend Calculations (shown only back-of-house/dashboard, not on checkout UI)
  // Barber Haircut Share: calculated on full haircut price (shop absorbs discount)
  const devBarberHaircutShare = (haircutPrice * shareConfig.haircutBarberPct) / 100;
  // Barber Chemical Share: "ช่างก็จะได้ส่วนแบ่งตามราคาที่ลดจริงด้วย" -> calculated based on actualChemicalPrice after discount!
  const devBarberChemicalShare = (actualChemicalPrice * shareConfig.chemicalBarberPct) / 100;
  const devBarberProductShare = (productPrice * shareConfig.productBarberPct) / 100;
  const devBarberTotalShare = devBarberHaircutShare + devBarberChemicalShare + devBarberProductShare + tipAmount;
  // Shop Total Share retains remaining from actual customer payment minus barber shares
  const devShopTotalShare = Math.max(0, subtotal - totalDiscounts) - (devBarberHaircutShare + devBarberChemicalShare + devBarberProductShare);

  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<any>(null);

  const handleReset = () => {
    setSelectedBarberId('');
    setHaircutInput('');
    setChemicalInput('');
    setSelectedProductId('');
    setProductQtyInput(1);
    setSelectedChemicalPromoId('');
    setTipInput('');
    setUseDiscount10(false);
    setUseVoucherId('');
    setApplyChemicalDiscount(false);
    setChemicalDiscountValueInput('');
    setChemicalDiscountType('percentage');
    setNotesInput('');
    setCustomerNameInput('');
    setCustomDateTime(getLocalISODateTime());
    setPaymentMethod('transfer');
    setIsGroupPayment(false);
    setGroupPaymentOption('new');
    setNewGroupCode('');
    setSelectedGroupLink('');
    setMobileTab('items');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarberId) {
      alert('กรุณาเลือกช่างตัดผม');
      return;
    }
    if (subtotal === 0 && tipAmount === 0) {
      alert('กรุณากรอกราคาค่าบริการอย่างน้อย 1 รายการ');
      return;
    }

    const selectedBarber = barbers.find(b => b.id === selectedBarberId);
    
    let timestampToPass: string;
    let dateToPass: string;

    if (customDateTime && customDateTime.includes('T')) {
      const selected = new Date(customDateTime);
      timestampToPass = selected.toISOString();
      dateToPass = customDateTime.split('T')[0]; // YYYY-MM-DD
    } else {
      const now = new Date();
      timestampToPass = now.toISOString();
      const offset = now.getTimezoneOffset() * 60000;
      dateToPass = new Date(now.getTime() - offset).toISOString().split('T')[0];
    }

    const selectedPromo = chemicalPromos.find(c => c.id === selectedChemicalPromoId);

    // Group payment resolving logic
    let finalGroupPaymentId: string | undefined = undefined;
    let finalGroupPaymentCode: string | undefined = undefined;

    if (paymentMethod === 'transfer' && isGroupPayment) {
      if (groupPaymentOption === 'new') {
        const generatedId = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        finalGroupPaymentId = generatedId;
        finalGroupPaymentCode = newGroupCode.trim() || 'กลุ่มโอนทางร้าน';
      } else if (groupPaymentOption === 'link' && selectedGroupLink) {
        const existingGrp = activeGroups.existingGroups.find(g => g.id === selectedGroupLink);
        if (existingGrp) {
          finalGroupPaymentId = existingGrp.id;
          finalGroupPaymentCode = existingGrp.label;
        } else {
          const singleGrp = activeGroups.potentialSingles.find(s => s.id === selectedGroupLink);
          if (singleGrp) {
            finalGroupPaymentId = singleGrp.id;
            // Also let's keep original label
            finalGroupPaymentCode = `โอนร่วมกับ ${singleGrp.label.split(' (')[0]}`;
          }
        }
      }
    }

    const saleData = {
      barberId: selectedBarberId,
      barberName: selectedBarber ? selectedBarber.name : 'ไม่ระบุ',
      customerName: customerNameInput.trim() || undefined,
      haircutPrice,
      chemicalPrice,
      productId: selectedProductId || null,
      productName: selectedProduct ? selectedProduct.name : null,
      productPrice,
      productQty: selectedProductId ? productQtyInput : undefined,
      chemicalPromoId: selectedChemicalPromoId || null,
      chemicalPromoName: selectedPromo ? selectedPromo.name : null,
      tip: tipAmount,
      paymentMethod,
      useDiscountPct10: useDiscount10,
      useVoucherValue: voucherValue,
      chemicalDiscountValue,
      chemicalDiscountType,
      chemicalDiscountAmount,
      notes: notesInput.trim() || undefined,
      subtotal,
      discountAmount: totalDiscounts,
      customerPaid: payableAmount,
      barberHaircutShare: devBarberHaircutShare,
      barberChemicalShare: devBarberChemicalShare,
      barberProductShare: devBarberProductShare,
      barberTotalShare: devBarberTotalShare,
      shopTotalShare: devShopTotalShare,
      timestamp: timestampToPass,
      date: dateToPass,
      groupPaymentId: finalGroupPaymentId,
      groupPaymentCode: finalGroupPaymentCode
    };

    // 1. Persist the last saved record reference, raise success toast, and reset local form inputs immediately
    setLastSavedRecord(saleData);
    setShowSuccessToast(true);
    handleReset();

    // 2. Wrap parent state save-action in try-catch to completely isolate local form resets
    // from any downstream React calculation or parent rendering exceptions (e.g. inside Dashboard charts)
    try {
      onSaveSale(saleData);
    } catch (err) {
      console.error("🔴 Parent save sale handler failed:", err);
    }
    
    // Auto hide success feedback after 5 seconds
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4" id="sales-register">
      {/* Saved Success Toast Dialog */}
      {showSuccessToast && lastSavedRecord && (
        <div className="bg-emerald-500 text-white rounded-2xl shadow-lg p-5 border border-emerald-600/20 relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex items-start space-x-3">
            <div className="p-1 w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold">บันทึกยอดชำระสำเร็จแล้ว!</h4>
              <p className="text-xs text-emerald-50 font-sans">
                บิลของ <strong>{lastSavedRecord.barberName}</strong> ยอดสุทธิ {formatBaht(lastSavedRecord.customerPaid)} ได้อัปเดตลงรายงานเรียบร้อยแล้ว
              </p>
              <div className="pt-2 text-[10px] text-emerald-100 flex flex-wrap gap-2 leading-none">
                <span>ช่างได้รับ: {formatBaht(lastSavedRecord.barberTotalShare)}</span>
                <span>•</span>
                <span>ร้านได้รับสุทธิ: {formatBaht(lastSavedRecord.shopTotalShare)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Stack Switcher Bar (Visible on mobile only md:hidden) */}
      <div className="md:hidden flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs sticky top-2 z-20 backdrop-blur-md bg-slate-100/90">
        <button
          type="button"
          onClick={() => setMobileTab('items')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            mobileTab === 'items'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scissors className="w-4 h-4 text-amber-300" />
          <span>1. เลือกรายการ</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('summary')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            mobileTab === 'summary'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>2. สรุปชำระเงิน</span>
          {payableAmount > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500 text-white font-mono rounded-full font-extrabold ml-1 shadow-xs">
              {formatBaht(payableAmount)}
            </span>
          )}
        </button>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-6">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-50">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">บันทึกบริการและรายการขาย</h2>
            <p className="text-xs text-slate-500">เลือกช่าง กรอกค่าบริการ และเลือกส่วนลดเพื่อคำนวณยอดชำระเงิน</p>
          </div>
        </div>

        {/* SECTION 1: Item & Service Selection (Always visible on desktop md:block, toggled by mobileTab === 'items' on mobile) */}
        <div className={`space-y-6 ${mobileTab === 'items' ? 'block' : 'hidden md:block'}`}>
          {/* 1. Barber Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">ช่างผู้ให้บริการ</label>
            {activeBarbers.length === 0 ? (
              <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-sm">
                ขณะนี้ไม่มีช่างลงทะเบียนเข้าทำงาน กรุณาไปที่แท็บ 'ตั้งค่า Config' เพื่อตั้งค่าสถานะมาทำงาน
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeBarbers.map((barber) => (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setSelectedBarberId(barber.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedBarberId === barber.id
                        ? 'border-slate-800 bg-slate-50 text-slate-900 shadow-sm font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-full ${selectedBarberId === barber.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Scissors className="w-4 h-4" />
                      </div>
                      <span className="text-sm">ช่าง{barber.name}</span>
                    </div>
                    {selectedBarberId === barber.id && (
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div className="space-y-2 animate-in fade-in duration-300">
            <label className="block text-sm font-semibold text-slate-700">ชื่อลูกค้า (ถ้ามี)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">👤</span>
              <input
                id="pos-customer-name-field"
                type="text"
                placeholder="ระบุชื่อลูกค้า"
                value={customerNameInput}
                onChange={(e) => setCustomerNameInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all text-sm font-sans"
              />
            </div>
          </div>

          {/* 2. Prices & Chemical Work */}
          <div className={`grid grid-cols-1 ${shareConfig.enableChemicalService !== false ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">ค่าบริการตัดผม (บาท)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">฿</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={haircutInput}
                  onChange={(e) => setHaircutInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            {shareConfig.enableChemicalService !== false && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 font-sans">ค่าบริการเคมี (ยืด,ดัด,ทำสี) (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">฿</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={chemicalInput}
                    onChange={(e) => {
                      setChemicalInput(e.target.value);
                      setSelectedChemicalPromoId('');
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all font-mono"
                  />
                </div>

                {/* Quick Chemical Promotion Selector */}
                {chemicalPromos.filter(c => c.isActive).length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 font-sans">
                      เลือกโปรโมชั่นเคมีสำเร็จรูป (ลดอัตโนมัติ)
                    </label>
                    <select 
                      value={selectedChemicalPromoId}
                      onChange={(e) => {
                        const promoId = e.target.value;
                        setSelectedChemicalPromoId(promoId);
                        if (promoId) {
                          const selected = chemicalPromos.find(c => c.id === promoId);
                          if (selected) {
                            setChemicalInput(selected.originalPrice.toString());
                            setApplyChemicalDiscount(true);
                            setChemicalDiscountValueInput((selected.originalPrice - selected.discountedPrice).toString());
                            setChemicalDiscountType('fixed');
                          }
                        } else {
                          setSelectedChemicalPromoId('');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 text-xs focus:ring-1 focus:ring-slate-800 transition-all cursor-pointer outline-none"
                    >
                      <option value="">-- ไม่ใช้โปรโมชั่น / กรอกเองอิสระ --</option>
                      {chemicalPromos.filter(c => c.isActive).map(promo => (
                        <option key={promo.id} value={promo.id}>
                          🏷️ {promo.name} (จาก {promo.originalPrice}฿ เหลือ {promo.discountedPrice}฿)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Inline Chemical Discount Configuration */}
                {chemicalPrice > 0 && shareConfig.showChemicalDiscountInPos !== false && (
                  <div className="mt-2 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <input
                        id="pos-chem-discount-tick"
                        type="checkbox"
                        checked={applyChemicalDiscount}
                        onChange={(e) => setApplyChemicalDiscount(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-semibold font-sans">ระบุส่วนลดค่าบริการเคมีเพิ่มเติม (ช่างและร้านร่วมแบกรับ)</span>
                    </label>
                  </div>
                )}

                {chemicalPrice > 0 && shareConfig.showChemicalDiscountInPos !== false && applyChemicalDiscount && (
                  <div className="bg-indigo-50/50 border border-indigo-100/80 p-3 rounded-2xl mt-2.5 space-y-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1">
                        <Percent className="w-3 h-3 text-indigo-600" />
                        <span>โปรโมชั่นส่วนลดเคมี (ช่างคิดตามราคาลดจริง)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans italic">บิลเคมีช่างร่วมสัดส่วน</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input
                          id="pos-chem-discount-value"
                          type="number"
                          min="0"
                          placeholder="ใส่ตัวเลขส่วนลดที่นี่"
                          value={chemicalDiscountValueInput}
                          onChange={(e) => setChemicalDiscountValueInput(e.target.value)}
                          className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-semibold">
                          {chemicalDiscountType === 'percentage' ? '%' : '฿'}
                        </span>
                      </div>

                      <div className="flex bg-slate-200/50 p-0.5 rounded-xl border border-slate-200">
                        <button
                          id="pos-chem-discount-type-pct"
                          type="button"
                          onClick={() => setChemicalDiscountType('percentage')}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            chemicalDiscountType === 'percentage'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          %
                        </button>
                        <button
                          id="pos-chem-discount-type-fixed"
                          type="button"
                          onClick={() => setChemicalDiscountType('fixed')}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            chemicalDiscountType === 'fixed'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          บาท
                        </button>
                      </div>
                    </div>

                    {chemicalDiscountAmount > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 bg-white/80 px-2.5 py-1.5 rounded-xl border border-indigo-100/50">
                        <span>ส่วนลดเคมี: -{formatBaht(chemicalDiscountAmount)}</span>
                        <span className="text-emerald-700 font-extrabold">ยอดเก็บหน้าเคาน์เตอร์: {formatBaht(actualChemicalPrice)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Products Dropdown */}
          {shareConfig.enableProductSales !== false && products.filter(p => p.isActive).length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">ขายสินค้าในร้าน</label>
              <div className="flex gap-3">
                <div className="relative flex-grow">
                  <ShoppingBag className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      if (!e.target.value) {
                        setProductQtyInput(1);
                      }
                    }}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl appearance-none bg-white outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all text-slate-700 text-sm"
                  >
                    <option value="">-- ไม่ซื้อสินค้า --</option>
                    {products
                      .filter(p => p.isActive)
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - ({formatBaht(product.price)})
                        </option>
                      ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>

                {selectedProductId && (
                  <div className="w-28 shrink-0 flex flex-col justify-end animate-in fade-in slide-in-from-right-2 duration-200">
                    <input
                      type="number"
                      min="1"
                      value={productQtyInput}
                      onChange={(e) => setProductQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 font-mono text-center text-sm"
                      placeholder="จำนวน"
                    />
                  </div>
                )}
              </div>
              {selectedProductId && selectedProduct && (
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  * ราคาต่อหน่วย: {formatBaht(selectedProduct.price)} × {productQtyInput} ชิ้น = <span className="font-bold text-slate-700">{formatBaht(productPrice)}</span>
                </p>
              )}
            </div>
          )}

          {/* 4. Tips */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">ค่าทิปให้ช่างเป็นพิเศษ (บาท)</label>
            <div className="relative">
              <Heart className="absolute left-3 top-2.5 text-red-400 w-5 h-5 fill-red-100" />
              <input
                type="number"
                min="0"
                placeholder="0"
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all font-mono"
              />
            </div>
          </div>

          {/* 5. Discounts & Vouchers */}
          {(showPromoDiscount || vouchers.filter(v => v.isActive).length > 0) && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                <span>โปรโมชั่นและบัตรเงินสดส่วนลด</span>
              </h3>

              <div className={`grid grid-cols-1 ${showPromoDiscount && vouchers.filter(v => v.isActive).length > 0 ? 'sm:grid-cols-2' : ''} gap-4 pt-1`}>
                {/* Promotion Checkbox */}
                {showPromoDiscount && (
                  <label className={`flex items-start space-x-3 p-3 bg-white border rounded-xl cursor-pointer transition-all ${
                    useDiscount10 ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={useDiscount10}
                      onChange={(e) => setUseDiscount10(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 text-emerald-600 bg-gray-100 rounded border-gray-300 focus:ring-emerald-500 outline-none cursor-pointer"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-700">ส่วนลดโปรโมชั่น {promoDiscountPct}% (เฉพาะค่าตัดผม)</span>
                      <span className="text-xs text-slate-500">คำนวณส่วนลด {promoDiscountPct}% จากยอดค่าบริการตัดผมเท่านั้น</span>
                    </div>
                  </label>
                )}

                {/* Voucher Dropdown */}
                {vouchers.filter(v => v.isActive).length > 0 && (
                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-600">เลือกใช้ Gift Voucher บัตรของขวัญ</span>
                    <div className="relative">
                      <Gift className="absolute left-3 top-2.5 text-emerald-600 w-4.5 h-4.5" />
                      <select
                        value={useVoucherId}
                        onChange={(e) => setUseVoucherId(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl appearance-none bg-white outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs cursor-pointer"
                      >
                        <option value="">-- ไม่ใช้ Voucher --</option>
                        {vouchers
                          .filter(v => v.isActive)
                          .map((voc) => (
                            <option key={voc.id} value={voc.id}>
                              ใช้ บัตรกำนัล {voc.value} บาท
                            </option>
                          ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Bottom Navigation Button to Next Step */}
          <div className="md:hidden pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              ล้างข้อมูล
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedBarberId) {
                  alert('กรุณาเลือกช่างตัดผมก่อนดำเนินการต่อ');
                  return;
                }
                if (subtotal === 0 && tipAmount === 0) {
                  alert('กรุณากรอกราคาค่าบริการอย่างน้อย 1 รายการ');
                  return;
                }
                setMobileTab('summary');
              }}
              className={`flex-1 py-3 font-bold rounded-xl text-xs text-white flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                !selectedBarberId || (subtotal === 0 && tipAmount === 0)
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-md active:scale-[0.98]'
              }`}
            >
              <span>ไปที่สรุปชำระเงิน ({formatBaht(payableAmount)})</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: Payment Summary & Checkout (Always visible on desktop md:block, toggled by mobileTab === 'summary' on mobile) */}
        <div className={`space-y-6 ${mobileTab === 'summary' ? 'block' : 'hidden md:block'}`}>
          {/* Mobile Back Button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileTab('items')}
              className="w-full py-2.5 px-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>← ย้อนกลับไปเลือก/แก้ไขรายการ</span>
            </button>
          </div>

          {/* Itemized Bill Summary Preview */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span>สรุปรายการบริการในบิลนี้ (Bill Summary)</span>
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {selectedBarberId ? `ช่าง${barbers.find(b => b.id === selectedBarberId)?.name}` : '⚠️ ยังไม่เลือกช่าง'}
              </span>
            </div>

            {customerNameInput && (
              <div className="text-xs text-slate-600 flex justify-between items-center">
                <span>ลูกค้า:</span>
                <span className="font-bold text-slate-800">{customerNameInput}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              {haircutPrice > 0 && (
                <div className="flex justify-between items-center text-slate-700">
                  <span>ค่าบริการตัดผม:</span>
                  <span className="font-mono font-bold">{formatBaht(haircutPrice)}</span>
                </div>
              )}

              {chemicalPrice > 0 && (
                <div className="flex justify-between items-center text-slate-700">
                  <span>ค่าบริการเคมี:</span>
                  <span className="font-mono font-bold">{formatBaht(chemicalPrice)}</span>
                </div>
              )}

              {selectedProduct && productPrice > 0 && (
                <div className="flex justify-between items-center text-slate-700">
                  <span>สินค้า ({selectedProduct.name} x{productQtyInput}):</span>
                  <span className="font-mono font-bold">{formatBaht(productPrice)}</span>
                </div>
              )}

              {tipAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-semibold">
                  <span>ทิปพนักงาน:</span>
                  <span className="font-mono font-bold">+{formatBaht(tipAmount)}</span>
                </div>
              )}

              {totalDiscounts > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-semibold">
                  <span>รวมส่วนลดทั้งหมด:</span>
                  <span className="font-mono font-bold">-{formatBaht(totalDiscounts)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm text-slate-900">
                <span>ยอดสุทธิที่ต้องชำระ:</span>
                <span className="font-mono text-emerald-600 text-base">{formatBaht(payableAmount)}</span>
              </div>
            </div>
          </div>

          {/* 6. Payment method */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">ช่องทางการชำระเงิน</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('transfer');
                }}
                className={`flex items-center justify-center space-x-2 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'border-slate-800 bg-slate-50 text-slate-900 shadow-sm font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-5 h-5 text-sky-600" />
                <span>เงินโอนผ่านธนาคาร</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash');
                  setIsGroupPayment(false);
                }}
                className={`flex items-center justify-center space-x-2 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-slate-800 bg-slate-50 text-slate-900 shadow-sm font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>เงินสด</span>
              </button>
            </div>
          </div>

          {/* 7. Date & Time adjustment */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>ระบุวันที่/เวลา บันทึกบิล</span>
            </label>
            <div>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all font-mono text-sm bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                * ระบบตั้งค่าเวลาปัจจุบันให้อัตโนมัติ หากต้องการบันทึกบิลย้อนหลังหรือเทียบสลิปโมบายแบงก์กิ้งเพื่อลงบันทึกเวลาที่ถูกต้อง สามารถแก้ไขเวลาตรงนี้ได้เลย
              </p>
            </div>
          </div>

          {/* 8. Notes / Remarks */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span>หมายเหตุ (ถ้ามี)</span>
            </label>
            <div>
              <textarea
                id="pos-sale-notes-textarea"
                placeholder="ใส่รายละเอียดหรือหมายเหตุเพิ่มเติม เช่น สระผมเพิ่ม ทำเคมีสีสูตรพิเศษ หรืออื่นๆ"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all text-sm bg-white resize-y"
              />
            </div>
          </div>

          {/* Grand Total Indicator */}
          <div className="bg-white text-slate-900 rounded-2xl p-5 border-2 border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-2 opacity-10">
              <Coins className="w-24 h-24 text-emerald-600" />
            </div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-extrabold block">ยอดชำระสุทธิ (ลูกค้าจ่าย)</span>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2 font-mono leading-none">
                  {formatBaht(payableAmount)}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full font-bold shadow-xs">
                  <span className="text-slate-600">ช่องทางชำระ:</span>
                  <span className={paymentMethod === 'transfer' ? 'text-sky-600' : 'text-emerald-600'}>
                    {paymentMethod === 'transfer' ? '📱 เงินโอน' : '💵 เงินสด'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-1/3 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              ล้างข้อมูล
            </button>
            <button
              type="submit"
              disabled={!selectedBarberId || (subtotal === 0 && tipAmount === 0)}
              className={`w-2/3 py-3 font-semibold rounded-xl text-sm transition-all text-white flex items-center justify-center space-x-2 cursor-pointer ${
                !selectedBarberId || (subtotal === 0 && tipAmount === 0)
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.98] shadow-md'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>บันทึกยอดพนักงานและปิดบิล ({formatBaht(payableAmount)})</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
