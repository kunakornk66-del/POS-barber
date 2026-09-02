import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { formatBaht, getSalePaymentBreakdown, renderHtml2CanvasSafely } from '../utils';
import { SaleRecord, Expense, CashCounterState } from '../types';
import { 
  Banknote, 
  Coins, 
  Trash2, 
  Copy, 
  Plus, 
  Minus, 
  Calculator, 
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Wallet,
  ShieldCheck,
  Receipt,
  Zap,
  Check
} from 'lucide-react';

interface Denomination {
  id: string;
  type: 'note' | 'coin';
  value: number;
  label: string;
  colorClass: string;
  badgeClass: string;
}

const DENOMINATIONS: Denomination[] = [
  // Banknotes
  { id: 'n1000', type: 'note', value: 1000, label: '1,000 บาท', colorClass: 'bg-slate-50 border-slate-300 text-slate-800', badgeClass: 'bg-gradient-to-r from-slate-800 to-indigo-900 text-white shadow-sm' },
  { id: 'n500', type: 'note', value: 500, label: '500 บาท', colorClass: 'bg-purple-50/70 border-purple-200 text-purple-800', badgeClass: 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-sm' },
  { id: 'n100', type: 'note', value: 100, label: '100 บาท', colorClass: 'bg-rose-50/70 border-rose-200 text-rose-800', badgeClass: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-sm' },
  { id: 'n50', type: 'note', value: 50, label: '50 บาท', colorClass: 'bg-sky-50/70 border-sky-200 text-sky-800', badgeClass: 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sm' },
  { id: 'n20', type: 'note', value: 20, label: '20 บาท', colorClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-800', badgeClass: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm' },
  
  // Coins
  { id: 'c10', type: 'coin', value: 10, label: '10 บาท', colorClass: 'bg-amber-50/70 border-amber-200 text-amber-900', badgeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' },
  { id: 'c5', type: 'coin', value: 5, label: '5 บาท', colorClass: 'bg-slate-100 border-slate-300 text-slate-800', badgeClass: 'bg-slate-600 text-white shadow-sm' },
  { id: 'c2', type: 'coin', value: 2, label: '2 บาท', colorClass: 'bg-yellow-50/70 border-yellow-200 text-yellow-900', badgeClass: 'bg-yellow-600 text-white shadow-sm' },
  { id: 'c1', type: 'coin', value: 1, label: '1 บาท', colorClass: 'bg-slate-50 border-slate-200 text-slate-700', badgeClass: 'bg-slate-500 text-white shadow-sm' }
];

const QUICK_MULTIPLIERS: Record<string, number[]> = {
  n1000: [0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 50, 100],
  n500: [0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 50],
  n100: [0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100],
  n50: [0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 50],
  n20: [0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100],
  c10: [0, 1, 2, 5, 10, 15, 20, 30, 50, 100],
  c5: [0, 1, 2, 5, 10, 15, 20, 30, 50, 100],
  c2: [0, 1, 2, 5, 10, 15, 20, 30, 50],
  c1: [0, 1, 2, 5, 10, 15, 20, 30, 50]
};

const getTodayDateString = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localTime = new Date(d.getTime() - tzOffset);
  return localTime.toISOString().split('T')[0];
};

const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
};

export default function CashCounterTab({ 
  userEmail,
  sales = [],
  expenses = [],
  cashCounter,
  onUpdateCashCounter
}: { 
  userEmail: string | null;
  sales?: SaleRecord[];
  expenses?: Expense[];
  cashCounter?: CashCounterState | null;
  onUpdateCashCounter?: (updatedCashCounter: CashCounterState) => void;
}) {
  const cacheKey = `barber_pos_cash_count_${userEmail || 'guest'}`;
  const todayDateStr = getTodayDateString();

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showQuickCountModal, setShowQuickCountModal] = useState(false);
  const [quickCounts, setQuickCounts] = useState<Record<string, number>>({});
  const [quickCountTab, setQuickCountTab] = useState<'all' | 'notes' | 'coins'>('all');
  const [copied, setCopied] = useState(false);

  // State mapping denomination ID to quantity (integer >= 0)
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    if (cashCounter?.counts) {
      return cashCounter.counts;
    }
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading cash counts cache', e);
    }
    
    const defaultCounts: Record<string, number> = {};
    DENOMINATIONS.forEach(d => {
      defaultCounts[d.id] = 0;
    });
    return defaultCounts;
  });

  // 1. Opening Cash Float / Fund in the register drawer (เงินทอนตั้งต้นตอนเปิดร้าน)
  const [openingFloat, setOpeningFloat] = useState<number>(() => {
    if (cashCounter && typeof cashCounter.openingFloat === 'number') {
      return cashCounter.openingFloat;
    }
    try {
      const stored = localStorage.getItem(`${cacheKey}_float`);
      if (stored) return parseFloat(stored) || 0;
    } catch (e) {}
    return 1000; // ค่าเริ่มต้นที่นิยมใช้มากที่สุด 1,000 บาท
  });

  // 2. Extra Manual cash taken OUT/withdrawn from drawer (เงินสดเบิกออกนอกระบบเพิ่มเติม)
  const [withdrawnAmount, setWithdrawnAmount] = useState<number>(() => {
    if (cashCounter && typeof cashCounter.withdrawnAmount === 'number') {
      return cashCounter.withdrawnAmount;
    }
    try {
      const stored = localStorage.getItem(`${cacheKey}_withdrawn`);
      if (stored) return parseFloat(stored) || 0;
    } catch (e) {}
    return 0;
  });

  // 3. Source selection of system cash sales ('today' | 'all' | 'custom')
  const [systemSalesSource, setSystemSalesSource] = useState<'today' | 'all' | 'custom'>(() => {
    if (cashCounter?.systemSalesSource) {
      return cashCounter.systemSalesSource;
    }
    try {
      const stored = localStorage.getItem(`${cacheKey}_sales_source`);
      if (stored === 'today' || stored === 'all' || stored === 'custom') {
        return stored;
      }
    } catch (e) {}
    return 'today';
  });

  // 4. Manual expected sales override
  const [customExpectedSales, setCustomExpectedSales] = useState<number>(() => {
    if (cashCounter && typeof cashCounter.customExpectedSales === 'number') {
      return cashCounter.customExpectedSales;
    }
    try {
      const stored = localStorage.getItem(`${cacheKey}_custom_sales`);
      if (stored) return parseFloat(stored) || 0;
    } catch (e) {}
    return 0;
  });

  // Synchronize with parent state when loaded or updated on another device
  useEffect(() => {
    if (cashCounter) {
      if (cashCounter.counts) setCounts(cashCounter.counts);
      if (typeof cashCounter.openingFloat === 'number') setOpeningFloat(cashCounter.openingFloat);
      if (typeof cashCounter.withdrawnAmount === 'number') setWithdrawnAmount(cashCounter.withdrawnAmount);
      if (cashCounter.systemSalesSource) setSystemSalesSource(cashCounter.systemSalesSource);
      if (typeof cashCounter.customExpectedSales === 'number') setCustomExpectedSales(cashCounter.customExpectedSales);
    }
  }, [cashCounter]);

  // Auto-save changes to parent state (Firestore)
  useEffect(() => {
    if (!onUpdateCashCounter) return;
    
    const timer = setTimeout(() => {
      const currentObjStr = JSON.stringify({
        counts,
        openingFloat,
        withdrawnAmount,
        systemSalesSource,
        customExpectedSales
      });
      const parentObjStr = JSON.stringify({
        counts: cashCounter?.counts,
        openingFloat: cashCounter?.openingFloat,
        withdrawnAmount: cashCounter?.withdrawnAmount,
        systemSalesSource: cashCounter?.systemSalesSource,
        customExpectedSales: cashCounter?.customExpectedSales
      });
      
      if (currentObjStr !== parentObjStr) {
        onUpdateCashCounter({
          counts,
          openingFloat,
          withdrawnAmount,
          systemSalesSource,
          customExpectedSales,
          updatedAt: new Date().toISOString()
        });
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [counts, openingFloat, withdrawnAmount, systemSalesSource, customExpectedSales, onUpdateCashCounter, cashCounter]);

  // Auto persist state variables to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem(cacheKey, JSON.stringify(counts));
  }, [counts, cacheKey]);

  useEffect(() => {
    localStorage.setItem(`${cacheKey}_float`, openingFloat.toString());
  }, [openingFloat, cacheKey]);

  useEffect(() => {
    localStorage.setItem(`${cacheKey}_withdrawn`, withdrawnAmount.toString());
  }, [withdrawnAmount, cacheKey]);

  useEffect(() => {
    localStorage.setItem(`${cacheKey}_sales_source`, systemSalesSource);
  }, [systemSalesSource, cacheKey]);

  useEffect(() => {
    localStorage.setItem(`${cacheKey}_custom_sales`, customExpectedSales.toString());
  }, [customExpectedSales, cacheKey]);

  const isSyncing = useMemo(() => {
    if (!cashCounter) return false;
    const currentObjStr = JSON.stringify({
      counts,
      openingFloat,
      withdrawnAmount,
      systemSalesSource,
      customExpectedSales
    });
    const parentObjStr = JSON.stringify({
      counts: cashCounter.counts,
      openingFloat: cashCounter.openingFloat,
      withdrawnAmount: cashCounter.withdrawnAmount,
      systemSalesSource: cashCounter.systemSalesSource,
      customExpectedSales: cashCounter.customExpectedSales
    });
    return currentObjStr !== parentObjStr;
  }, [counts, openingFloat, withdrawnAmount, systemSalesSource, customExpectedSales, cashCounter]);

  const handleSetCount = (id: string, val: string | number) => {
    const parsed = typeof val === 'number' ? val : parseInt(val, 10);
    setCounts(prev => ({
      ...prev,
      [id]: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const adjustCount = (id: string, delta: number) => {
    setCounts(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [id]: next
      };
    });
  };

  const confirmReset = () => {
    const cleared: Record<string, number> = {};
    DENOMINATIONS.forEach(d => {
      cleared[d.id] = 0;
    });
    setCounts(cleared);
    setOpeningFloat(1000);
    setWithdrawnAmount(0);
    setSystemSalesSource('today');
    setCustomExpectedSales(0);
    setShowResetConfirm(false);
  };

  // Quick Count Handlers & State Sync
  const openQuickCountModal = () => {
    setQuickCounts({ ...counts });
    setQuickCountTab('all');
    setShowQuickCountModal(true);
  };

  const handleSetQuickCount = (id: string, val: string | number) => {
    const parsed = typeof val === 'number' ? val : parseInt(val, 10);
    setQuickCounts(prev => ({
      ...prev,
      [id]: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const handleAdjustQuickCount = (id: string, delta: number) => {
    setQuickCounts(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [id]: next
      };
    });
  };

  const applyQuickCount = () => {
    setCounts({ ...quickCounts });
    setShowQuickCountModal(false);
  };

  const resetQuickCountToZero = () => {
    const zeroMap: Record<string, number> = {};
    DENOMINATIONS.forEach(d => { zeroMap[d.id] = 0; });
    setQuickCounts(zeroMap);
  };

  const reloadCurrentCountsToQuick = () => {
    setQuickCounts({ ...counts });
  };

  // 1. Math totals - Physical cash counted in drawer
  const totalNotes = DENOMINATIONS
    .filter(d => d.type === 'note')
    .reduce((sum, d) => sum + (counts[d.id] || 0) * d.value, 0);

  const totalCoins = DENOMINATIONS
    .filter(d => d.type === 'coin')
    .reduce((sum, d) => sum + (counts[d.id] || 0) * d.value, 0);

  const grandTotal = totalNotes + totalCoins; // Physical cash counted in drawer
  const totalPieces = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.id] || 0), 0);

  // 2. Math totals - System cash sales
  const targetDateForSales = systemSalesSource === 'today' ? todayDateStr : selectedDate;

  // Filter sales for the target date
  const filteredSales = (sales || []).filter(s => {
    if (systemSalesSource === 'all') return true;
    const saleDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
    return saleDate === targetDateForSales;
  });

  const selectedCashSales = filteredSales.reduce((sum, s) => {
    return sum + getSalePaymentBreakdown(s).cashAmount;
  }, 0);

  const cashSalesBillCount = filteredSales.filter(s => getSalePaymentBreakdown(s).cashAmount > 0).length;

  const activeCashSales = systemSalesSource === 'custom' ? customExpectedSales : selectedCashSales;

  // 3. System expenses paid from drawer cash
  const filteredExpenses = (expenses || []).filter(e => {
    if (systemSalesSource === 'all') return e.isFromDrawer !== false;
    return e.date === targetDateForSales && e.isFromDrawer !== false;
  });

  const systemWithdrawn = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Total cash out = System Expenses from drawer + Manual cash adjustments
  const totalCashOut = systemWithdrawn + withdrawnAmount;

  // Expected Cash in Drawer = Opening Float + System Cash Sales - Total Cash Out
  const expectedCashInDrawer = openingFloat + activeCashSales - totalCashOut;

  // Discrepancy comparison: Physical count minus expected count
  const discrepancy = grandTotal - expectedCashInDrawer;
  const isBalanced = Math.abs(discrepancy) < 0.01;
  const isSurplus = discrepancy > 0.01;
  const isShortage = discrepancy < -0.01;

  // Quick Count Modal live totals
  const quickTotalNotes = DENOMINATIONS
    .filter(d => d.type === 'note')
    .reduce((sum, d) => sum + (quickCounts[d.id] || 0) * d.value, 0);

  const quickTotalCoins = DENOMINATIONS
    .filter(d => d.type === 'coin')
    .reduce((sum, d) => sum + (quickCounts[d.id] || 0) * d.value, 0);

  const quickGrandTotal = quickTotalNotes + quickTotalCoins;
  const quickTotalPieces = DENOMINATIONS.reduce((sum, d) => sum + (quickCounts[d.id] || 0), 0);
  const quickDiscrepancy = quickGrandTotal - expectedCashInDrawer;
  const isQuickBalanced = Math.abs(quickDiscrepancy) < 0.01;
  const isQuickSurplus = quickDiscrepancy > 0.01;
  const isQuickShortage = quickDiscrepancy < -0.01;

  const handleCopyToClipboard = () => {
    const formattedDate = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'long',
      timeStyle: 'medium'
    }).format(new Date());

    let text = `💵 **รายงานผลสรุปการนับและตรวจสอบเงินสดในลิ้นชัก**\n`;
    text += `📅 ประจำวันที่: ${formattedDate}\n`;
    text += `------------------------------------\n`;
    text += `1️⃣ **เงินทอนเริ่มต้นตอนเช้า (Float)**: ${formatBaht(openingFloat)}\n`;
    text += `2️⃣ **ยอดขายรับเงินสดในระบบ**: +${formatBaht(activeCashSales)} (${cashSalesBillCount} บิล)\n`;
    if (systemWithdrawn > 0) {
      text += `3️⃣ **รายจ่ายเงินสดจากเก๊ะ**: -${formatBaht(systemWithdrawn)}\n`;
    }
    if (withdrawnAmount > 0) {
      text += `4️⃣ **เงินสดเบิกถอนเพิ่ม**: -${formatBaht(withdrawnAmount)}\n`;
    }
    text += `------------------------------------\n`;
    text += `📋 **ยอดเงินที่ควรมีในลิ้นชัก (Expected)**: ${formatBaht(expectedCashInDrawer)}\n`;
    text += `💰 **ยอดเงินที่นับได้จริง (Counted)**: ${formatBaht(grandTotal)} (${totalPieces} ชิ้น/ใบ)\n`;
    text += `   • แบงค์รวม: ${formatBaht(totalNotes)}\n`;
    text += `   • เหรียญรวม: ${formatBaht(totalCoins)}\n`;
    text += `------------------------------------\n`;
    
    if (isBalanced) {
      text += `✅ **ผลสรุป**: ยอดเงินตรงเป๊ะ 100% (Balanced)\n`;
    } else if (isSurplus) {
      text += `🟡 **ผลสรุป**: พบเงินเกินในเก๊ะ +${formatBaht(discrepancy)} (Surplus)\n`;
    } else {
      text += `🔴 **ผลสรุป**: พบเงินขาดจากเก๊ะ -${formatBaht(Math.abs(discrepancy))} (Shortage)\n`;
    }
    
    text += `------------------------------------\n`;
    text += `*ระบบตรวจสอบเงินสดร้าน Barber POS*`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    let currentShopName = "ระบบร้านบาร์เบอร์ POS";
    try {
      const suffix = userEmail ? `_${userEmail.toLowerCase().trim()}` : '';
      const local = localStorage.getItem(`barber_pos_shop_config${suffix}`);
      if (local) {
        const parsed = JSON.parse(local);
        currentShopName = parsed.shopName || "ระบบร้านบาร์เบอร์ POS";
      }
    } catch (e) {
      console.error(e);
    }

    const formattedDate = new Date().toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + " น.";

    const discrepancyStatusText = isBalanced 
      ? '✅ ยอดเงินตรงตามระบบสมบูรณ์ (Balanced 100%)' 
      : isSurplus 
        ? `⚠️ พบเงินเกินในเก๊ะ +${formatBaht(discrepancy)} (Surplus)` 
        : `🚨 พบเงินขาดจากเก๊ะ -${formatBaht(Math.abs(discrepancy))} (Shortage)`;

    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.top = '-9999px';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '794px';
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.padding = '35px 40px';
    printContainer.style.fontFamily = "'Prompt', 'Sarabun', -apple-system, sans-serif";
    printContainer.style.color = '#1e293b';

    printContainer.innerHTML = `
      <div style="border: 2px solid #e2e8f0; border-radius: 16px; padding: 25px; background: #ffffff;">
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0; color: #0f172a;">${currentShopName}</h1>
          <h2 style="font-size: 15px; font-weight: 700; color: #4338ca; margin: 0 0 4px 0;">ใบนับเงินสดและตรวจยอดลิ้นชักประจำวัน (Daily Cash Reconciliation)</h2>
          <p style="font-size: 11px; color: #64748b; margin: 0;">วันที่พิมพ์: ${formattedDate}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
            <p style="font-size: 11px; font-weight: 700; color: #64748b; margin: 0 0 6px 0;">1. ข้อมูลคำนวณตามระบบ (Expected)</p>
            <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>• เงินทอนเริ่มต้นเช้า:</span>
              <strong style="font-family: monospace;">${formatBaht(openingFloat)}</strong>
            </div>
            <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>• ยอดขายสดสะสม (+):</span>
              <strong style="font-family: monospace; color: #16a34a;">+${formatBaht(activeCashSales)}</strong>
            </div>
            <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>• รายจ่ายถอนจากเก๊ะ (-):</span>
              <strong style="font-family: monospace; color: #dc2626;">-${formatBaht(totalCashOut)}</strong>
            </div>
            <div style="border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 6px; font-size: 13px; display: flex; justify-content: space-between; font-weight: 800;">
              <span>ยอดเงินที่ควรมีในเก๊ะ:</span>
              <strong style="font-family: monospace; color: #0f172a;">${formatBaht(expectedCashInDrawer)}</strong>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
            <p style="font-size: 11px; font-weight: 700; color: #64748b; margin: 0 0 6px 0;">2. ยอดจากการนับจริง (Counted)</p>
            <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>• ยอดรวมธนบัตร (แบงค์):</span>
              <strong style="font-family: monospace;">${formatBaht(totalNotes)}</strong>
            </div>
            <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>• ยอดรวมเหรียญ:</span>
              <strong style="font-family: monospace;">${formatBaht(totalCoins)}</strong>
            </div>
            <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>• รวมชิ้น/ใบทั้งหมด:</span>
              <strong style="font-family: monospace;">${totalPieces} ชิ้น</strong>
            </div>
            <div style="border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 6px; font-size: 13px; display: flex; justify-content: space-between; font-weight: 800;">
              <span>ยอดนับได้จริงในเก๊ะ:</span>
              <strong style="font-family: monospace; color: #4338ca;">${formatBaht(grandTotal)}</strong>
            </div>
          </div>
        </div>

        <div style="background: ${isBalanced ? '#f0fdf4' : isSurplus ? '#fffbeb' : '#fef2f2'}; border: 1.5px solid ${isBalanced ? '#86efac' : isSurplus ? '#fde047' : '#fca5a5'}; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 14px; font-weight: 800; color: ${isBalanced ? '#15803d' : isSurplus ? '#a16207' : '#b91c1c'}; margin: 0 0 4px 0;">
            ${discrepancyStatusText}
          </p>
          <p style="font-size: 11px; color: #475569; margin: 0;">
            ${isBalanced ? 'ยอดเงินสดที่นับได้ตรงกับที่ระบบคำนวณไว้ทุกบาททุกสตางค์' : isSurplus ? `มีเงินในเก๊ะมากกว่ายอดคำนวณ +${formatBaht(discrepancy)}` : `เงินสดในเก๊ะน้อยกว่ายอดคำนวณ -${formatBaht(Math.abs(discrepancy))}`}
          </p>
        </div>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center; font-size: 11px;">
          <div style="width: 200px;">
            <div style="border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-weight: 700;">ลงชื่อผู้ตรวจนับเงินสด</p>
            <p style="margin: 0; color: #64748b; font-size: 10px;">( แคชเชียร์ / ผู้ปิดกะ )</p>
          </div>
          <div style="width: 200px;">
            <div style="border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-weight: 700;">ลงชื่อเจ้าของร้าน / ผู้จัดการ</p>
            <p style="margin: 0; color: #64748b; font-size: 10px;">( ผู้ตรวจสอบอนุมัติ )</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);

    try {
      const canvas = await renderHtml2CanvasSafely(printContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xOffset = (pageWidth - imgWidth) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, 15, imgWidth, imgHeight);
      pdf.save(`รายงานนับเงินสด_${getTodayDateString()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('⚠️ เกิดข้อผิดพลาดในการสร้างไฟล์ PDF โปรดลองใหม่อีกครั้ง');
    } finally {
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
      setIsGeneratingPdf(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 text-left font-sans"
      id="cash-counter-tab-container"
    >
      {/* 1. Header Banner with Clear Purpose & Cloud Status */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-7 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden border border-slate-800">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Cash Drawer Control
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-slate-200 backdrop-blur-xs">
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                  <span>กำลังซิงค์คลาวด์...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>บันทึกคลาวด์เรียลไทม์ (เปิดเครื่องไหนก็เห็นตรงกัน)</span>
                </>
              )}
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-400" />
            ตรวจนับเงินสดในลิ้นชัก (Cash Counter)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            ระบบช่วยตรวจนับเงินสดในเก๊ะตอนเปิดร้านและปิดร้าน เปรียบเทียบกับยอดขายเงินสดและรายจ่ายอัตโนมัติ เพื่อดูว่า <strong className="text-amber-300">"เงินสดในเก๊ะครบ ครบถ้วน พอดี หรือขาด/เกิน"</strong> ได้ใน 3 ขั้นตอนง่ายๆ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 z-10 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={openQuickCountModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ring-2 ring-amber-300/40"
            id="quick-count-header-btn"
          >
            <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
            <span>⚡ Quick Count (นับด่วน)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>💡 วิธีใช้งาน</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            title="ล้างจำนวนนับทั้งหมดกลับเป็นค่าเริ่มต้น"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>ล้างค่า</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกรายงาน</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Interactive 3-Step Visual Guide Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Step 1 Card */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
              1
            </div>
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-slate-900">เช้า (เปิดร้าน): กรอกเงินทอน</h4>
              <p className="text-[11px] text-slate-600 leading-snug">
                ใส่จำนวนเงินสดสำรองที่เตรียมไว้ในเก๊ะ เช่น <strong>1,000 บาท</strong>
              </p>
            </div>
          </div>

          {/* Step 2 Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
              2
            </div>
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-slate-900">ระหว่างวัน: ระบบคำนวณให้อัตโนมัติ</h4>
              <p className="text-[11px] text-slate-600 leading-snug">
                ดึงยอดขายเงินสดและหักรายจ่ายเงินสดออกให้ทันทีโดยไม่ต้องกดคำนวณเอง
              </p>
            </div>
          </div>

          {/* Step 3 Card */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                3
              </div>
              <div className="space-y-0.5 text-left">
                <h4 className="text-xs font-black text-slate-900">เย็น (ปิดร้าน): นับเงิน & ดูผล</h4>
                <p className="text-[11px] text-slate-600 leading-snug">
                  เปิดเก๊ะนับเงินจริง หรือใช้โหมดนับด่วน
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openQuickCountModal}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10.5px] font-black shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
            >
              <Zap className="w-3 h-3 fill-white" />
              <span>นับด่วน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Flow (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Denomination Counters (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: Opening Float Section with Calculation Examples */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>เงินทอนตั้งต้นตอนเปิดร้าน (Opening Cash Float)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เงินสดสำรองที่ใส่ไว้ในเก๊ะตอนเช้าไว้ทอนลูกค้า (ไม่ใช่ยอดขาย)
                  </p>
                </div>
              </div>

              {/* Number Input */}
              <div className="flex items-center space-x-2 bg-amber-50/70 px-3 py-1.5 rounded-xl border border-amber-200/80">
                <input
                  type="number"
                  min="0"
                  value={openingFloat === 0 ? '' : openingFloat}
                  onChange={(e) => setOpeningFloat(Math.max(0, parseFloat(e.target.value) || 0))}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="w-28 text-right font-mono font-black text-sm text-slate-900 bg-white border border-amber-300 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
                <span className="text-xs font-black text-amber-900">บาท</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">ปุ่มด่วนเลือกจำนวน:</span>
              {[0, 500, 1000, 1500, 2000, 3000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setOpeningFloat(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    openingFloat === val 
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {val === 0 ? '0 (ไม่ใส่เงินทอน)' : `${formatBaht(val)}`}
                </button>
              ))}
            </div>

            {/* Live Calculation Formula Box */}
            <div className="p-3.5 bg-gradient-to-br from-amber-50/80 via-indigo-50/40 to-slate-50 border border-amber-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black text-slate-900">สูตรและตัวอย่างการคำนวณเงินในเก๊ะ:</span>
                </div>
                <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  ยอดจริงร้านคุณตอนนี้
                </span>
              </div>

              {/* Dynamic Formula Display */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <div className="px-2.5 py-1 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-300/80 font-bold flex items-center gap-1 shadow-2xs">
                  <span>💰 เงินทอน:</span>
                  <strong className="font-black">{formatBaht(openingFloat)}</strong>
                </div>

                <span className="font-black text-slate-500 text-sm">+</span>

                <div className="px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-950 border border-emerald-300/80 font-bold flex items-center gap-1 shadow-2xs">
                  <span>🟢 ยอดขายสดจริง:</span>
                  <strong className="font-black">+{formatBaht(activeCashSales)}</strong>
                </div>

                {totalCashOut > 0 && (
                  <>
                    <span className="font-black text-slate-500 text-sm">-</span>
                    <div className="px-2.5 py-1 rounded-lg bg-rose-100/90 text-rose-950 border border-rose-300/80 font-bold flex items-center gap-1 shadow-2xs">
                      <span>🔴 รายจ่ายเก๊ะ:</span>
                      <strong className="font-black">-{formatBaht(totalCashOut)}</strong>
                    </div>
                  </>
                )}

                <span className="font-black text-slate-500 text-sm">=</span>

                <div className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold flex items-center gap-1 shadow-2xs">
                  <span>📋 ต้องมีในเก๊ะ:</span>
                  <strong className="font-black text-amber-300">{formatBaht(expectedCashInDrawer)}</strong>
                </div>
              </div>

              {/* Concrete Example Note */}
              <div className="text-[11.5px] text-slate-600 bg-white/80 border border-slate-200/80 rounded-xl p-2.5 leading-relaxed space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <span>💡 ตัวอย่างทำความเข้าใจ:</span>
                </p>
                <p>
                  • ถ้าตอนเช้าใส่เงินทอนไว้ <strong className="text-amber-700">500 บาท</strong> และระหว่างวันลูกค้าตัดผมจ่ายเงินสดจริง <strong className="text-emerald-700">1,200 บาท</strong>
                </p>
                <p>
                  • ตอนเย็นเมื่อเปิดเก๊ะนับเงิน จะต้องมีเงินสดรวมทั้งหมด <strong className="text-indigo-900">500 + 1,200 = 1,700 บาท</strong> (นับแบงค์กับเหรียญได้ 1,700 บาท = เงินครบเป๊ะ!)
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: Denomination Counter - Banknotes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-indigo-600" />
                    <span>นับธนบัตรในลิ้นชัก (Banknotes)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">นับจำนวนใบของแต่ละราคา หรือกดปุ่มบวกเร็ว</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={openQuickCountModal}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="เปิดโหมดเลือกตัวคูณธนบัตรด่วน"
                >
                  <Zap className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                  <span>นับด่วน</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...counts };
                    DENOMINATIONS.filter(d => d.type === 'note').forEach(d => { next[d.id] = 0; });
                    setCounts(next);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                >
                  ล้างแบงค์
                </button>
                <div className="px-3 py-1 bg-indigo-50 text-indigo-900 rounded-xl text-xs font-mono font-black border border-indigo-100">
                  {formatBaht(totalNotes)}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {DENOMINATIONS.filter(d => d.type === 'note').map((d) => {
                const count = counts[d.id] || 0;
                return (
                  <div 
                    key={d.id} 
                    className={`p-3 rounded-2xl border transition-all hover:shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 ${d.colorClass}`}
                  >
                    {/* Value label */}
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs shadow-xs ${d.badgeClass}`}>
                        ฿
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900 font-mono leading-tight">{d.label}</p>
                        <p className="text-[10.5px] text-slate-500">ใบละ {formatBaht(d.value)}</p>
                      </div>
                    </div>

                    {/* Stepper + Quick Increment Buttons */}
                    <div className="flex items-center flex-wrap gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, -1)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-700 active:scale-95 shadow-2xs"
                        title="ลด 1 ใบ"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={(e) => handleSetCount(d.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-16 h-8 text-center bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                      />

                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, 1)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-700 active:scale-95 shadow-2xs"
                        title="เพิ่ม 1 ใบ"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Rapid Multi-Increment Buttons */}
                      <div className="flex items-center space-x-1 pl-1">
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 5)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all text-slate-600 cursor-pointer shadow-2xs"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 10)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all text-slate-600 cursor-pointer shadow-2xs"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 20)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all text-slate-600 cursor-pointer shadow-2xs"
                        >
                          +20
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 100)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-indigo-100 border border-indigo-200 hover:bg-indigo-200 text-indigo-900 rounded-lg transition-all cursor-pointer shadow-2xs"
                          title="เพิ่ม 1 ปึก (100 ใบ)"
                        >
                          +100 (ปึก)
                        </button>
                        {count > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCount(d.id, 0)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            title="ล้างจำนวนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right w-full sm:w-28 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 flex sm:flex-col justify-between items-center sm:items-end">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                        {count} ใบ =
                      </p>
                      <p className="text-sm font-black text-slate-900 font-mono">
                        {formatBaht(count * d.value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Denomination Counter - Coins */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">นับเหรียญในลิ้นชัก (Coins)</h3>
                  <p className="text-[11px] text-slate-500">เหรียญ 10, 5, 2, 1 บาท</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={openQuickCountModal}
                  className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="เปิดโหมดเลือกตัวคูณเหรียญด่วน"
                >
                  <Zap className="w-3 h-3 fill-amber-600 text-amber-600" />
                  <span>นับด่วน</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...counts };
                    DENOMINATIONS.filter(d => d.type === 'coin').forEach(d => { next[d.id] = 0; });
                    setCounts(next);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                >
                  ล้างเหรียญ
                </button>
                <div className="px-3 py-1 bg-amber-50 text-amber-900 rounded-xl text-xs font-mono font-black border border-amber-100">
                  {formatBaht(totalCoins)}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {DENOMINATIONS.filter(d => d.type === 'coin').map((d) => {
                const count = counts[d.id] || 0;
                return (
                  <div 
                    key={d.id} 
                    className={`p-3 rounded-2xl border transition-all hover:shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 ${d.colorClass}`}
                  >
                    {/* Value label */}
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto shrink-0">
                      <div className="w-9 h-9 rounded-full border border-yellow-200 bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 font-extrabold text-xs shadow-xs">
                        🪙
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900 font-mono leading-tight">{d.label}</p>
                        <p className="text-[10.5px] text-slate-500">เหรียญละ {formatBaht(d.value)}</p>
                      </div>
                    </div>

                    {/* Stepper + Quick Increment Buttons */}
                    <div className="flex items-center flex-wrap gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, -1)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-700 active:scale-95 shadow-2xs"
                        title="ลด 1 เหรียญ"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={(e) => handleSetCount(d.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-16 h-8 text-center bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
                      />

                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, 1)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-700 active:scale-95 shadow-2xs"
                        title="เพิ่ม 1 เหรียญ"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Rapid Multi-Increment Buttons */}
                      <div className="flex items-center space-x-1 pl-1">
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 5)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 rounded-lg transition-all text-slate-600 cursor-pointer shadow-2xs"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 10)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 rounded-lg transition-all text-slate-600 cursor-pointer shadow-2xs"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 50)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 rounded-lg transition-all text-slate-600 cursor-pointer shadow-2xs"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustCount(d.id, 100)}
                          className="px-2 py-1 text-[10.5px] font-mono font-extrabold bg-amber-100 border border-amber-200 hover:bg-amber-200 text-amber-900 rounded-lg transition-all cursor-pointer shadow-2xs"
                          title="เพิ่ม 1 ถุง (100 เหรียญ)"
                        >
                          +100 (ถุง)
                        </button>
                        {count > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCount(d.id, 0)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            title="ล้างจำนวนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right w-full sm:w-28 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 flex sm:flex-col justify-between items-center sm:items-end">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                        {count} เหรียญ =
                      </p>
                      <p className="text-sm font-black text-slate-900 font-mono">
                        {formatBaht(count * d.value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Calculations & Real-time Reconciliation (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Calculation & Status Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">สรุปผลการตรวจนับเงินสด</h3>
                  <p className="text-[10.5px] text-slate-400">เปรียบเทียบยอดคำนวณกับยอดที่นับได้จริง</p>
                </div>
              </div>

              {/* Date / Filter Selection */}
              <div className="flex items-center gap-1">
                <select
                  value={systemSalesSource}
                  onChange={(e) => setSystemSalesSource(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="today">ยอดของวันนี้</option>
                  <option value="all">ยอดสะสมทั้งหมด</option>
                  <option value="custom">ระบุยอดเอง</option>
                </select>
              </div>
            </div>

            {/* If user wants to choose another date */}
            {systemSalesSource === 'today' && (
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-600 font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  วันที่ตรวจสอบ:
                </span>
                <span className="font-mono font-black text-slate-800">{formatThaiDate(todayDateStr)}</span>
              </div>
            )}

            {/* Custom Sales Input when Mode is 'custom' */}
            {systemSalesSource === 'custom' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                <label className="text-xs font-bold text-amber-900 block">
                  ป้อนยอดขายเงินสดที่ต้องการเปรียบเทียบเอง:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={customExpectedSales === 0 ? '' : customExpectedSales}
                    onChange={(e) => setCustomExpectedSales(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-sm font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-900">บาท</span>
                </div>
              </div>
            )}

            {/* 1. Expected Cash Flow Calculation (สูตรการคำนวณเงินในเก๊ะ) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                <span>สูตรคำนวณ: ยอดเงินสดที่ควรมีในเก๊ะ</span>
                <span className="font-mono text-slate-400">Step 1 + Step 2</span>
              </div>

              {/* Line 1: Opening Float */}
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-amber-500 font-bold">1.</span> เงินทอนเริ่มต้นเช้า (Float):
                </span>
                <span className="font-mono font-bold text-slate-900">{formatBaht(openingFloat)}</span>
              </div>

              {/* Line 2: Cash Sales in System */}
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-500 font-bold">+</span> ยอดขายรับเงินสด ({cashSalesBillCount} บิล):
                </span>
                <span className="font-mono font-bold text-emerald-700">+{formatBaht(activeCashSales)}</span>
              </div>

              {/* Line 3: System Expenses from drawer */}
              {systemWithdrawn > 0 && (
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-rose-500 font-bold">-</span> รายจ่ายเงินสดถอนจากเก๊ะ ({filteredExpenses.length} รายการ):
                  </span>
                  <span className="font-mono font-bold text-rose-600">-{formatBaht(systemWithdrawn)}</span>
                </div>
              )}

              {/* Line 4: Manual Withdrawal Cash Out */}
              <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-200/50">
                <span className="flex items-center gap-1 font-medium text-[11px] text-slate-500">
                  <span>-</span> เงินสดเบิกถอนเพิ่มเติมนอกระบบ:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={withdrawnAmount === 0 ? '' : withdrawnAmount}
                    onChange={(e) => setWithdrawnAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-20 text-right bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-rose-600 outline-none"
                  />
                  <span className="text-[10px] text-slate-400">บาท</span>
                </div>
              </div>

              {/* Expected Total */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-sm">
                <span className="text-slate-900">📋 เงินสดที่ควรมีในเก๊ะ:</span>
                <span className="font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-base">
                  {formatBaht(expectedCashInDrawer)}
                </span>
              </div>
            </div>

            {/* 2. Physical Counted Summary Box (ยอดที่นับได้จริง) */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 text-center space-y-1 relative shadow-sm">
              <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block">
                💰 ยอดเงินสดที่นับได้จริงในเก๊ะตอนนี้ (Counted)
              </span>
              <div className="text-3xl font-black text-white font-mono tracking-tight py-1">
                {formatBaht(grandTotal)}
              </div>
              <div className="text-[11px] text-slate-300 font-mono flex items-center justify-center gap-3 pt-1 border-t border-slate-800">
                <span>💵 แบงค์: {formatBaht(totalNotes)}</span>
                <span>•</span>
                <span>🪙 เหรียญ: {formatBaht(totalCoins)}</span>
                <span>•</span>
                <span>รวม {totalPieces} ชิ้น</span>
              </div>
            </div>

            {/* 3. FINAL AUDIT RESULT (สถานะเงิน ครบ/ขาด/เกิน) */}
            <div>
              {isBalanced ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                      ผลการตรวจสอบ (Reconciliation Status)
                    </span>
                    <h4 className="text-base font-black text-emerald-800">
                      ✅ ยอดเงินตรงเป๊ะ 100% (ไม่มีขาด/เกิน)
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      เงินสดที่นับได้จริงตรงกับยอดคำนวณในระบบทุกบาททุกสตางค์
                    </p>
                  </div>
                </div>
              ) : isSurplus ? (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-xs">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                      ผลการตรวจสอบ (Reconciliation Status)
                    </span>
                    <h4 className="text-base font-black text-amber-900">
                      ⚠️ มีเงินเกินในเก๊ะ <span className="font-mono text-lg font-black text-amber-700">+{formatBaht(discrepancy)}</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      สาเหตุที่เป็นไปได้: อาจมีลูกค้าจ่ายเงินสดแต่ลืมกดยิงบิลเข้าเครื่อง หรือทอนเงินขาด
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">
                      ผลการตรวจสอบ (Reconciliation Status)
                    </span>
                    <h4 className="text-base font-black text-rose-900">
                      🚨 พบเงินสดขาดไป <span className="font-mono text-lg font-black text-rose-700">-{formatBaht(Math.abs(discrepancy))}</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      สิ่งที่ควรตรวจสอบ: มีการทอนเงินเกิน หรือมีบิลรับเงินโอนแต่เผลอกดเป็นเงินสดหรือไม่
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Helper Note */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-left">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>ทริค:</strong> ตอนปิดร้าน แค่หยิบเงินทอนก้อนแรกออกไปเก็บ ส่วนที่เหลือคือ <strong className="text-emerald-700">"กำไรเงินสดประจำวัน"</strong> ที่สามารถนำฝากเข้าบัญชีธนาคารได้ทันที
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* 4. Full Interactive Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="cash-guide-modal">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 p-6 md:p-7 flex flex-col space-y-5 text-left max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center font-black">
                  💡
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">วิธีใช้งานระบบนับเงินสดแบบง่ายๆ</h3>
                  <p className="text-xs text-slate-500">คู่มือตรวจเงินในเก๊ะสำหรับร้านตัดผม</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Real World Example */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
              <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                ตัวอย่างการใช้งานจริงใน 1 วัน:
              </h4>
              <ul className="text-xs text-slate-700 space-y-1.5 font-medium pl-1">
                <li>• <strong>ตอนเช้า:</strong> ใส่เงินเตรียมไว้ทอนลูกค้าในเก๊ะ <strong>1,000 บาท</strong> ➔ กรอกช่อง <i>"เงินทอนเริ่มต้น"</i></li>
                <li>• <strong>ระหว่างวัน:</strong> ลูกค้ามาตัดผม จ่ายเงินสดรวม <strong>3,500 บาท</strong> ➔ <i>(ระบบดึงยอดขายให้อัตโนมัติ)</i></li>
                <li>• <strong>ระหว่างวัน:</strong> เบิกเงินสดในเก๊ะไปซื้อน้ำดื่ม <strong>100 บาท</strong> ➔ <i>(ระบบหักรายจ่ายให้อัตโนมัติ)</i></li>
                <li>• <strong>ตอนเย็น (ก่อนปิดร้าน):</strong> เงินที่ควรมีในเก๊ะ = 1,000 + 3,500 - 100 = <strong>4,400 บาท</strong></li>
                <li>• <strong>เริ่มตรวจนับ:</strong> เปิดเก๊ะนับแบงค์และเหรียญจริงได้ <strong>4,400 บาท</strong> ➔ ระบบจะขึ้น <strong className="text-emerald-700">"✅ ยอดเงินตรงเป๊ะ 100%"</strong></li>
              </ul>
            </div>

            {/* 3 Step Breakdown */}
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="text-xs font-black text-slate-900">ช่องเงินทอนตั้งต้นเริ่มวัน (Float) คืออะไร?</p>
                  <p className="text-[11px] text-slate-600">คือเงินสดที่คุณเตรียมไว้ตั้งแต่เช้า เพื่อไว้ทอนให้ลูกค้าคนแรกๆ ของวัน ถ้าไม่มีให้กดปุ่ม 0 บาท</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="text-xs font-black text-slate-900">ยอดขายเงินสดมาจากไหน?</p>
                  <p className="text-[11px] text-slate-600">ระบบจะกรองเฉพาะบิลที่รับชำระด้วย <strong>"เงินสด"</strong> ของวันนั้นมาคำนวณให้ทันที (ไม่รวมเงินโอน/QR Scan)</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="text-xs font-black text-slate-900">ถ้ายอดเงินขึ้นว่า "ขาด" หรือ "เกิน" ต้องทำอย่างไร?</p>
                  <p className="text-[11px] text-slate-600">ให้กดดูประวัติบิลวันนี้ในแท็บบันทึกการขาย เพื่อดูว่ามีบิลใดที่ลูกค้าโอนเงินแต่เผลอกดเป็นเงินสด หรือลืมบันทึกบิลหรือไม่</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              เข้าใจแล้ว เริ่มใช้งาน
            </button>

          </div>
        </div>
      )}

      {/* 5. Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="reset-counter-confirm-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center space-y-5">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">ล้างจำนวนเงินที่นับไว้?</h3>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                คุณต้องการล้างจำนวนธนบัตรและเหรียญที่นับไว้ทั้งหมดกลับเป็น 0 ใช่หรือไม่?
              </p>
            </div>
            
            <div className="flex w-full gap-3 font-sans">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                ยืนยันการล้าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Quick Count Modal (⚡ โหมดนับเงินด่วน) */}
      {showQuickCountModal && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in" 
          id="quick-count-modal"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] text-left">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">⚡ โหมดนับเงินด่วน (Quick Count)</h3>
                    <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                      Fast Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    แตะเลือกตัวคูณ (เช่น 1,000x5, 500x2) ระบบคำนวณยอดรวมปิดกะให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCountModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                ✕
              </button>
            </div>

            {/* Live Calculation Bar (Sticky Top) */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/80 space-y-3 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {/* Counted Total */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100">
                  <p className="text-[10.5px] font-bold text-indigo-700">💰 ยอดที่นับได้ตอนนี้</p>
                  <p className="text-base sm:text-lg font-mono font-black text-indigo-950">
                    {formatBaht(quickGrandTotal)}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-medium">รวม {quickTotalPieces} ชิ้น/ใบ</p>
                </div>

                {/* Target in Drawer */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                  <p className="text-[10.5px] font-bold text-amber-800">📋 ยอดที่ต้องมีในเก๊ะ</p>
                  <p className="text-base sm:text-lg font-mono font-black text-slate-900">
                    {formatBaht(expectedCashInDrawer)}
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium">เงินทอน + ขายสด - จ่าย</p>
                </div>

                {/* Status Indicator */}
                <div className={`col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-2xl border flex flex-col justify-center ${
                  isQuickBalanced 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : isQuickSurplus 
                      ? 'bg-amber-50 border-amber-200 text-amber-900' 
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <p className="text-[10.5px] font-bold">
                    {isQuickBalanced ? '✅ เงินตรงเป๊ะ 100%' : isQuickSurplus ? '⚠️ เงินเกินในเก๊ะ' : '🚨 เงินสดขาดไป'}
                  </p>
                  <p className="text-base font-mono font-black">
                    {isQuickBalanced ? 'ครบถ้วน' : isQuickSurplus ? `+${formatBaht(quickDiscrepancy)}` : `-${formatBaht(Math.abs(quickDiscrepancy))}`}
                  </p>
                </div>
              </div>

              {/* Filter Tabs & Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuickCountTab('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickCountTab === 'all' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    ทั้งหมด (9 ชนิด)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCountTab('notes')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickCountTab === 'notes' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    💵 ธนบัตร
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCountTab('coins')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickCountTab === 'coins' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    🪙 เหรียญ
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={resetQuickCountToZero}
                    className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all font-bold cursor-pointer"
                  >
                    ล้างเป็น 0
                  </button>
                  <button
                    type="button"
                    onClick={reloadCurrentCountsToQuick}
                    className="px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-all font-bold cursor-pointer"
                  >
                    ดึงค่านับเดิม
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Denomination Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-slate-100">
              {DENOMINATIONS
                .filter(d => quickCountTab === 'all' || (quickCountTab === 'notes' ? d.type === 'note' : d.type === 'coin'))
                .map((d) => {
                  const currentMultiplier = quickCounts[d.id] || 0;
                  const multipliers = QUICK_MULTIPLIERS[d.id] || [0, 1, 2, 3, 5, 10, 20];
                  const lineTotal = currentMultiplier * d.value;

                  return (
                    <div key={d.id} className="pt-3.5 first:pt-0 space-y-2">
                      {/* Top row: Label, formula, line total */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${d.badgeClass}`}>
                            ฿
                          </span>
                          <div>
                            <span className="text-sm font-black text-slate-900">{d.label}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">({d.type === 'note' ? 'ธนบัตร' : 'เหรียญ'})</span>
                          </div>
                        </div>

                        {/* Interactive Formula pill */}
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl font-mono text-xs font-black text-slate-800">
                          <span className="text-slate-500 font-bold">{d.value.toLocaleString()} ×</span>
                          <span className={`px-1.5 py-0.5 rounded-md ${currentMultiplier > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {currentMultiplier} {d.type === 'note' ? 'ใบ' : 'เหรียญ'}
                          </span>
                          <span className="text-slate-400">=</span>
                          <span className="text-indigo-900 font-black">{formatBaht(lineTotal)}</span>
                        </div>
                      </div>

                      {/* Multiplier Pills Grid */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {multipliers.map((m) => {
                          const isActive = currentMultiplier === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleSetQuickCount(d.id, m)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-slate-900 text-amber-300 ring-2 ring-amber-400 shadow-xs scale-105'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/60'
                              }`}
                            >
                              {m === 0 ? '0' : `×${m}`}
                            </button>
                          );
                        })}

                        {/* Manual Custom Stepper */}
                        <div className="flex items-center gap-1 ml-auto bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleAdjustQuickCount(d.id, -1)}
                            disabled={currentMultiplier <= 0}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentMultiplier === 0 ? '' : currentMultiplier}
                            onChange={(e) => handleSetQuickCount(d.id, e.target.value)}
                            placeholder="0"
                            className="w-10 text-center text-xs font-mono font-black text-slate-900 bg-transparent border-0 focus:ring-0 p-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustQuickCount(d.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Bottom Actions (Sticky) */}
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="text-slate-400">💵 แบงค์: </span>
                  <strong className="font-mono text-white">{formatBaht(quickTotalNotes)}</strong>
                </div>
                <span className="text-slate-600">|</span>
                <div>
                  <span className="text-slate-400">🪙 เหรียญ: </span>
                  <strong className="font-mono text-white">{formatBaht(quickTotalCoins)}</strong>
                </div>
                <span className="text-slate-600">|</span>
                <div>
                  <span className="text-amber-300 font-bold">รวม: </span>
                  <strong className="font-mono text-amber-300 text-sm font-black">{formatBaht(quickGrandTotal)}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowQuickCountModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={applyQuickCount}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                  id="apply-quick-count-btn"
                >
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>บันทึกและนำยอดไปใช้ ({formatBaht(quickGrandTotal)})</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </motion.div>
  );
}
