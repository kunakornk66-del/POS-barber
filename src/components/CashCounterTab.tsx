import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { formatBaht } from '../utils';
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
  Download
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
  { id: 'n1000', type: 'note', value: 1000, label: '1,000 บาท', colorClass: 'bg-indigo-50 border-indigo-200 text-indigo-700', badgeClass: 'bg-indigo-600 text-white' },
  { id: 'n500', type: 'note', value: 500, label: '500 บาท', colorClass: 'bg-purple-50 border-purple-200 text-purple-700', badgeClass: 'bg-purple-600 text-white' },
  { id: 'n100', type: 'note', value: 100, label: '100 บาท', colorClass: 'bg-rose-50 border-rose-200 text-rose-700', badgeClass: 'bg-rose-600 text-white' },
  { id: 'n50', type: 'note', value: 50, label: '50 บาท', colorClass: 'bg-blue-50 border-blue-200 text-blue-700', badgeClass: 'bg-blue-600 text-white' },
  { id: 'n20', type: 'note', value: 20, label: '20 บาท', colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-700', badgeClass: 'bg-emerald-600 text-white' },
  
  // Coins
  { id: 'c10', type: 'coin', value: 10, label: '10 บาท', colorClass: 'bg-amber-50 border-amber-200 text-amber-800', badgeClass: 'bg-amber-600 text-white' },
  { id: 'c5', type: 'coin', value: 5, label: '5 บาท', colorClass: 'bg-slate-100 border-slate-200 text-slate-700', badgeClass: 'bg-slate-600 text-white' },
  { id: 'c1', type: 'coin', value: 1, label: '1 บาท', colorClass: 'bg-slate-50 border-slate-200 text-slate-600', badgeClass: 'bg-slate-500 text-white' },
];

const getTodayDateString = () => {
  const d = new Date();
  // Calculate local date (Asia/Bangkok timezone offset equivalent)
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localTime = new Date(d.getTime() - tzOffset);
  return localTime.toISOString().split('T')[0];
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

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    
    // Default to empty
    const defaultCounts: Record<string, number> = {};
    DENOMINATIONS.forEach(d => {
      defaultCounts[d.id] = 0;
    });
    return defaultCounts;
  });

  // Opening Cash Float / Fund in the register drawer
  const [openingFloat, setOpeningFloat] = useState<number>(() => {
    if (cashCounter && typeof cashCounter.openingFloat === 'number') {
      return cashCounter.openingFloat;
    }
    try {
      const stored = localStorage.getItem(`${cacheKey}_float`);
      if (stored) return parseFloat(stored) || 0;
    } catch (e) {}
    return 0;
  });

  // Cash taken OUT/withdrawn from drawer (e.g. owners take some out, or pay cash expenses)
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

  // Source selection of system cash sales ('today' | 'all' | 'custom')
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

  // Manual expected sales override
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

  const [copied, setCopied] = useState(false);

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

  // Auto-save changes to the parent state (which writes to Firestore) debounced by 1 second
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
    }, 1000); // 1 second debounce
    
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

  const isSyncing = React.useMemo(() => {
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



  const handleSetCount = (id: string, val: string) => {
    const parsed = parseInt(val, 10);
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

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    const cleared: Record<string, number> = {};
    DENOMINATIONS.forEach(d => {
      cleared[d.id] = 0;
    });
    setCounts(cleared);
    setOpeningFloat(0);
    setWithdrawnAmount(0);
    setSystemSalesSource('today');
    setCustomExpectedSales(0);
    setShowResetConfirm(false);
  };

  // 1. Math totals - Physical counting
  const totalNotes = DENOMINATIONS
    .filter(d => d.type === 'note')
    .reduce((sum, d) => sum + (counts[d.id] || 0) * d.value, 0);

  const totalCoins = DENOMINATIONS
    .filter(d => d.type === 'coin')
    .reduce((sum, d) => sum + (counts[d.id] || 0) * d.value, 0);

  const grandTotal = totalNotes + totalCoins; // Physical cash counted in drawer

  const totalPieces = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.id] || 0), 0);

  // 2. Math totals - System matching
  // Find system sales paid in CASH
  const todayCashSales = (sales || [])
    .filter(s => s.date === todayDateStr && s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + (s.customerPaid || 0), 0);

  const allCashSales = (sales || [])
    .filter(s => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + (s.customerPaid || 0), 0);

  // Expected revenues matches selected source
  const selectedRevenue = 
    systemSalesSource === 'today' ? todayCashSales :
    systemSalesSource === 'all' ? allCashSales :
    customExpectedSales;

  // Find system expenses paid from register cash for the selected period
  const systemWithdrawn = (expenses || [])
    .filter(e => {
      const matchDate = systemSalesSource === 'today' ? e.date === todayDateStr : true;
      return matchDate && e.isFromDrawer !== false;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Total cash taken OUT/withdrawn from drawer: System Expenses Cash Out + Manual cash adjustments
  const totalWithdrawn = systemWithdrawn + withdrawnAmount;

  // Expected cash to be inside the drawer: Opening Float + System Revenues - Total Cash Out
  const expectedCashInDrawer = openingFloat + selectedRevenue - totalWithdrawn;

  // Discrepancy comparison: Physical count minus expected count
  const discrepancy = grandTotal - expectedCashInDrawer;

  const handleCopyToClipboard = () => {
    const formattedDate = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'long',
      timeStyle: 'medium'
    }).format(new Date());

    let text = `💵 **รายงานผลสรุปการนับและตรวจสอบเงินสดในเก๊ะ**\n`;
    text += `📅 ประจำวันที่: ${formattedDate}\n`;
    text += `------------------------------------\n\n`;
    
    text += `📊 **[1] หมวดธนบัตรที่นับได้ (รวม ${formatBaht(totalNotes)})\n`;
    DENOMINATIONS.filter(d => d.type === 'note').forEach(d => {
      const count = counts[d.id] || 0;
      if (count > 0) {
        text += `• แบงค์ ${d.value} บาท: ${count} ใบ (รวม ${formatBaht(count * d.value)})\n`;
      }
    });

    text += `\n🪙 **[2] หมวดเหรียญที่นับได้ (รวม ${formatBaht(totalCoins)})\n`;
    DENOMINATIONS.filter(d => d.type === 'coin').forEach(d => {
      const count = counts[d.id] || 0;
      if (count > 0) {
        text += `• เหรียญ ${d.value} บาท: ${count} เหรียญ (รวม ${formatBaht(count * d.value)})\n`;
      }
    });

    text += `\n------------------------------------\n`;
    text += `💰 **ยอดเงินสดแท้จริงจากการนับได้ (Physical Count)**: ${formatBaht(grandTotal)} (${totalPieces} ชิ้น/ใบ)\n`;
    text += `💸 **เงินทอนตั้งต้นเริ่มวัน (Opening Float)**: ${formatBaht(openingFloat)}\n`;
    
    const sourceLabel = systemSalesSource === 'today' ? 'ยอดขายสดวันนี้' : systemSalesSource === 'all' ? 'ยอดขายสดรวมทั้งหมด' : 'ยอดขายสดระบุเอง';
    text += `📈 **ยอดขายเงินรับเข้าสะสม (${sourceLabel})**: ${formatBaht(selectedRevenue)}\n`;
    text += `📤 **ยอดเงินสดเบิกจ่ายจากเก๊ะระบบ (System Exp Out)**: -${formatBaht(systemWithdrawn)}\n`;
    text += `📤 **ยอดเงินสดเบิกถอนเพิ่มเติมนอกระบบ (Manual Out)**: -${formatBaht(withdrawnAmount)}\n`;
    text += `📤 **รวมเงินสดหักถอนออกจากเก๊ะ (Total Cash Out)**: -${formatBaht(totalWithdrawn)}\n`;
    text += `------------------------------------\n`;
    text += `📋 **ยอดเงินที่คำนวณตามบัญชีที่ควรมี (Expected)**: ${formatBaht(expectedCashInDrawer)}\n`;
    
    if (Math.abs(discrepancy) < 0.01) {
      text += `✅ **ผลการตรวจสอบ**: ยอดเงินตรงกันสมบูรณ์ร้อยเปอร์เซ็นต์ (Balanced)\n`;
    } else if (discrepancy > 0) {
      text += `🔺 **ผลการตรวจสอบู**: ยอดเงินสดเกินบัญชีอยู่ +${formatBaht(discrepancy)} (Surplus)\n`;
    } else {
      text += `🔻 **ผลการตรวจสอบ**: ยอดเงินสดขาดบัญชีไป -${formatBaht(Math.abs(discrepancy))} (Shortage)\n`;
    }
    
    text += `------------------------------------\n`;
    text += `*สร้างโดยระบบตรวจสอบเงินสดอัจฉริยะ Barber POS*`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    let currentShopName = "ระบบร้านบาร์เบอร์ POS ของคุณ";
    try {
      const suffix = userEmail ? `_${userEmail.toLowerCase().trim()}` : '';
      const local = localStorage.getItem(`barber_pos_shop_config${suffix}`);
      if (local) {
        const parsed = JSON.parse(local);
        currentShopName = parsed.shopName || "ระบบร้านบาร์เบอร์ POS ของคุณ";
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
      minute: '2-digit',
      second: '2-digit'
    }) + " น.";

    const sourceLabel = 
      systemSalesSource === 'today' ? 'ยอดเงินสดวันนี้' :
      systemSalesSource === 'all' ? 'ยอดเงินสดสะสมรวมทั้งหมด' :
      'ระบุยอดด้วยตนเอง (Manual)';

    const isBalanced = Math.abs(discrepancy) < 0.01;
    const isSurplus = discrepancy > 0;

    const discrepancyStatusText = isBalanced 
      ? '✅ ยอดเงินตรงตามระบบสมบูรณ์ (Balanced)' 
      : isSurplus 
        ? '⚠️ พบยอดเงินเกินบัญชี (Cash Surplus)' 
        : '🚨 พบยอดเงินขาดบัญชี (Cash Shortage)';

    const discrepancySubLabel = isBalanced 
      ? 'ยอดเงินสดนับได้ตรงตามเก๊ะ ไม่มีขาด/เกิน' 
      : isSurplus 
        ? `มีเงินในเก๊ะเกินอยู่ +${formatBaht(discrepancy)}` 
        : `เงินสดสูญหาย/ขาดไป -${formatBaht(Math.abs(discrepancy))}`;

    const discrepancySign = isBalanced ? '' : (isSurplus ? '+' : '-');

    const auditNoteText = isBalanced
      ? "การตรวจนับเงินสดประจำรอบกะเสร็จสิ้นสมบูรณ์ ยอดเงินสดจากการนับจริงตรงกับยอดคาดการณ์ในระบบอย่างครบถ้วน ไม่พบข้อแตกต่างหรือความสูญเสียของเงิน"
      : isSurplus
        ? `ตรวจพบยอดเงินสดเกินจำนวน +${formatBaht(discrepancy)} แแนะนำให้ตรวจสอบประวัติบิลย้อนหลังเพื่อความโปร่งใส`
        : `ตรวจพบยอดเงินสดขาดหายไป -${formatBaht(Math.abs(discrepancy))} แนะนำให้ตรวจสอบการทอนเงินย้อนหลังหรือบิลการรับเงินและรายจ่ายระว่างวันอย่างละเอียด`;

    const discrepancyStyle = isBalanced 
      ? "color: #047857; background-color: #ecfdf5; border-color: #a7f3d0;" 
      : isSurplus 
        ? "color: #b45309; background-color: #fffbeb; border-color: #fde68a;" 
        : "color: #be123c; background-color: #fff1f2; border-color: #fecdd3;";

    const notesRowsHtml = DENOMINATIONS.filter(d => d.type === 'note')
      .map(d => {
        const count = counts[d.id] || 0;
        return `
          <tr style="border-bottom: 1px solid rgba(224, 231, 255, 0.5);">
            <td style="padding: 8px 10px; font-weight: 700; color: #334155;">💵 ธนบัตร ${d.label}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 700; font-family: monospace; color: #1e293b;">${count} ใบ</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #1e293b; font-family: monospace;">${formatBaht(count * d.value)}</td>
          </tr>
        `;
      }).join('');

    const coinsRowsHtml = DENOMINATIONS.filter(d => d.type === 'coin')
      .map(d => {
        const count = counts[d.id] || 0;
        return `
          <tr style="border-bottom: 1px solid rgba(254, 243, 199, 0.5);">
            <td style="padding: 8px 10px; font-weight: 700; color: #334155;">🪙 เหรียญ ${d.label}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 700; font-family: monospace; color: #1e293b;">${count} เหรียญ</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #1e293b; font-family: monospace;">${formatBaht(count * d.value)}</td>
          </tr>
        `;
      }).join('');

    // Dynamically create off-screen container styled with standard inline CSS for html2canvas
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '-9999px';
    printContainer.style.width = '794px'; // Multiplied width exact A4 aspect ratio helper
    printContainer.style.backgroundColor = '#ffffff';

    // Status colors
    const primaryStatusColor = isBalanced ? '#059669' : isSurplus ? '#d97706' : '#dc2626';
    const primaryStatusBg = isBalanced ? '#ecfdf5' : isSurplus ? '#fffbeb' : '#fef2f2';
    const primaryStatusBorder = isBalanced ? '#a7f3d0' : isSurplus ? '#fde68a' : '#fecdd3';

    // Seal HTML based on status
    const sealText = isBalanced ? 'AUDIT<br/>PASSED' : isSurplus ? 'SURPLUS<br/>REVIEW' : 'SHORTAGE<br/>ALERT';
    const sealColor = primaryStatusColor;

    // Simulated corporate barcode bars
    const barcodeHtml = `
      <div style="display: flex; align-items: stretch; height: 28px; gap: 1px; width: 140px;">
        <span style="background-color: #0f172a; width: 3px;"></span>
        <span style="background-color: #0f172a; width: 1px;"></span>
        <span style="background-color: transparent; width: 2px;"></span>
        <span style="background-color: #0f172a; width: 2px;"></span>
        <span style="background-color: #0f172a; width: 4px;"></span>
        <span style="background-color: transparent; width: 1px;"></span>
        <span style="background-color: #0f172a; width: 1px;"></span>
        <span style="background-color: #0f172a; width: 3px;"></span>
        <span style="background-color: transparent; width: 2px;"></span>
        <span style="background-color: #0f172a; width: 2px;"></span>
        <span style="background-color: #0f172a; width: 1px;"></span>
        <span style="background-color: transparent; width: 3px;"></span>
        <span style="background-color: #0f172a; width: 4px;"></span>
        <span style="background-color: #0f172a; width: 2px;"></span>
        <span style="background-color: transparent; width: 1px;"></span>
        <span style="background-color: #0f172a; width: 1px;"></span>
        <span style="background-color: #0f172a; width: 3px;"></span>
        <span style="background-color: transparent; width: 2px;"></span>
        <span style="background-color: #0f172a; width: 2px;"></span>
        <span style="background-color: #0f172a; width: 1px;"></span>
        <span style="background-color: transparent; width: 1px;"></span>
        <span style="background-color: #0f172a; width: 4px;"></span>
        <span style="background-color: #0f172a; width: 1px;"></span>
      </div>
    `;

    printContainer.innerHTML = `
      <div style="padding: 40px; background-color: #ffffff; color: #1e293b; display: flex; flex-direction: column; justify-content: space-between; width: 794px; min-height: 1040px; font-family: 'Inter', -apple-system, sans-serif; box-sizing: border-box;">
        
        <!-- Header Section with Corporate Dark Tone -->
        <div style="border-bottom: 3px solid #1e293b; padding-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="padding: 4px 10px; background-color: #1e293b; color: #fbbf24; font-weight: 800; border-radius: 4px; font-size: 11px; font-family: monospace; letter-spacing: 0.5px; text-transform: uppercase;">Barber POS Audit Ledger</span>
              <span style="font-size: 10px; color: #64748b; font-weight: 700; font-family: monospace;">SYS-REF: #${Math.floor(100000 + Math.random() * 900000)}</span>
            </div>
            <h1 style="text-align: left; font-size: 24px; font-weight: 850; color: #0f172a; margin: 4px 0 0 0; letter-spacing: -0.5px;">ใบรายงานสรุปผลการตรวจสอบเงินสดและพิสูจน์ยอดลิ้นชัก</h1>
            <p style="text-align: left; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 1px; font-family: monospace;">Official Drawer Cash Audit & Reconciliation Certificate</p>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <div style="font-size: 18px; font-weight: 900; color: #1e293b; margin: 0;">${currentShopName}</div>
            <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Corporate Headquarters Branch</div>
          </div>
        </div>

        <!-- Meta Grid Information -->
        <div style="display: flex; justify-content: space-between; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 11.5px;">
          <div style="width: 50%; text-align: left; display: flex; flex-direction: column; gap: 8px; border-right: 1px solid #e2e8f0; padding-right: 20px;">
            <div style="display: flex; justify-content: space-between;"><strong style="color: #64748b;">วันและเวลาตรวจสอบ:</strong> <strong style="color: #1e293b;">${formattedDate}</strong></div>
            <div style="display: flex; justify-content: space-between;"><strong style="color: #64748b;">เจ้าหน้าที่วิเคราะห์ยอด/ผู้ตรวจนับ:</strong> <strong style="color: #1e293b; font-family: monospace;">เจ้าหน้าที่ประจำร้าน</strong></div>
          </div>
          <div style="width: 46%; text-align: right; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; padding-left: 20px;">
            <div style="display: flex; justify-content: space-between; width: 100%;"><strong style="color: #64748b;">เกณฑ์แหล่งข้อมูล:</strong> <span style="color: #1e40af; font-weight: 700; background-color: #eff6ff; padding: 1px 8px; border-radius: 4px; font-size: 10px; border: 1px solid #bfdbfe;">${sourceLabel}</span></div>
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;"><strong style="color: #64748b; margin-right: 12px;">สถานะการตรวจสอบ:</strong> <span style="font-size: 10.5px; padding: 3px 10px; border-radius: 6px; border: 1px solid; font-weight: 850; padding-bottom: 4px; ${discrepancyStyle}">${discrepancyStatusText}</span></div>
          </div>
        </div>

        <!-- High Impact Metrics Cards -->
        <div style="display: flex; gap: 16px; margin: 0 0 20px 0;">
          <div style="flex: 1; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-top: 5px solid #2563eb; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <span style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">A. ยอดตรวจนับจริงทางกายภาพ<br/>(Physical Cash Total)</span>
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace; margin: 8px 0 4px 0;">${formatBaht(grandTotal)}</div>
            <p style="font-size: 9.5px; color: #64748b; margin: 0; font-weight: 600; background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; display: inline-block;">นับธนบัตร & เหรียญรวมกัน ${totalPieces} ชิ้น/ใบ</p>
          </div>
          <div style="flex: 1; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-top: 5px solid #475569; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <span style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">B. ยอดควรมีในลิ้นชักตามระบบ<br/>(System Expected Cash)</span>
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace; margin: 8px 0 4px 0;">${formatBaht(expectedCashInDrawer)}</div>
            <p style="font-size: 9.5px; color: #64748b; margin: 0; font-weight: 600; background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; display: inline-block;">สูตร: [ตั้งต้น + ยอดสด - ดึงเงินออก]</p>
          </div>
          <div style="flex: 1; background-color: ${primaryStatusBg}; border: 1.5px solid ${primaryStatusBorder}; border-top: 5px solid ${primaryStatusColor}; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); color: ${primaryStatusColor};">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">ผลต่างจากการตรวจนับบัญชี<br/>(Discrepancy Balance)</span>
            <div style="font-size: 22px; font-weight: 900; font-family: monospace; margin: 8px 0 4px 0;">${discrepancySign}${formatBaht(Math.abs(discrepancy))}</div>
            <p style="font-size: 9.5px; margin: 0; font-weight: 850; border-radius: 4px; background-color: #ffffff; border: 1px dashed ${primaryStatusBorder}; padding: 3px 8px; display: inline-block;">${discrepancySubLabel}</p>
          </div>
        </div>

        <!-- Section 1: Reconciliation Workflow Table -->
        <div style="margin-bottom: 22px;">
          <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; text-transform: uppercase; border-left: 4px solid #1e293b; padding-left: 8px; margin: 0 0 8px 0; letter-spacing: 0.3px;">1. ตารางบันทึกการกระทบยอดลิ้นชักเงินสด (Ledger Reconciliation Flow)</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-size: 11.5px; text-align: left;">
            <thead>
              <tr style="background-color: #1e293b; color: #ffffff; border-bottom: 2px solid #0f172a;">
                <th style="padding: 10px 12px; font-weight: 700; width: 68%;">ลำดับและคำชี้แจงขั้นตอนการตรวจสอบ (Audit Checklist & Descriptions)</th>
                <th style="padding: 10px 12px; font-weight: 700; text-align: right; width: 32%;">จำนวนเงินรวม (Amounts in Thai Baht)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
                <td style="padding: 9px 12px; color: #334155; font-weight: 550;">💵 ยอดเงินทอนตั้งต้นเริ่มเปิดกะหรือตั้งต้นวัน (Opening Cash Float)</td>
                <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #1e293b; font-family: monospace;">${formatBaht(openingFloat)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                <td style="padding: 9px 12px; color: #334155; font-weight: 550;">📈 บวก: ยอดขายหน้าร้านรวมที่รับชำระเป็นเงินรับสดสะสม (Cumulative Cash Sales Collected)</td>
                <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #1e40af; font-family: monospace;">+${formatBaht(selectedRevenue)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
                <td style="padding: 9px 12px; color: #334155; font-weight: 550;">📤 หัก: ยอดเงินสดที่ถอนออกจ่ายค่าใช้จ่ายตามระบบ (System Expense Cash Out)</td>
                <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #b91c1c; font-family: monospace;">-${formatBaht(systemWithdrawn)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                <td style="padding: 9px 12px; color: #334155; font-weight: 550;">📤 หัก: ยอดเงินสดที่ถอนออกเพิ่มเติมระบุเองนอกระบบ (Other Manual Cash Out)</td>
                <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #b91c1c; font-family: monospace;">-${formatBaht(withdrawnAmount)}</td>
              </tr>
              <!-- Special Classic Accounting Double Border Bottom Style for expected cash -->
              <tr style="background-color: #f1f5f9; border-top: 1.5px solid #475569;">
                <td style="padding: 12px; color: #0f172a; font-weight: 850;">📋 ผลลัพธ์: บัญชีเสมือนมีเงินสดสุทธิคงเหลือที่ควรจะเป็น (Expected Cash Balance in Drawer)</td>
                <td style="padding: 12px; text-align: right; font-family: monospace; font-size: 13.5px; color: #000000; font-weight: 900; border-bottom: 4px double #1e293b; border-top: 1px solid #1e293b;">${formatBaht(expectedCashInDrawer)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Section 2 & 3: Side-by-Side Panels for Notes & Coins -->
        <div style="display: flex; gap: 16px; margin-bottom: 22px;">
          
          <!-- Banknotes Panel -->
          <div style="flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 11.5px; font-weight: 900; color: #1e1b4b; border-left: 4px solid #4f46e5; padding-left: 8px; margin: 0 0 8px 0; uppercase;">2. รายละเอียดธนบัตร (Banknotes Breakdown)</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #c7d2fe; border-radius: 6px; overflow: hidden; font-size: 10.5px; text-align: left;">
              <thead>
                <tr style="background-color: #e0e7ff; color: #1e1b4b; font-weight: 750; border-bottom: 1.5px solid #a5b4fc;">
                  <th style="padding: 8px 10px;">ประเภทธนบัตร</th>
                  <th style="padding: 8px 10px; text-align: center;">จำนวนตวงนับ</th>
                  <th style="padding: 8px 10px; text-align: right;">มูลค่าเงินรวม</th>
                </tr>
              </thead>
              <tbody>
                ${notesRowsHtml}
                <tr style="background-color: #eef2ff; border-top: 1.5px solid #a5b4fc; font-weight: 800; color: #1e1b4b;">
                  <td style="padding: 8px 10px;" colspan="2">รวมกลุ่มธนบัตรทั้งหมด (Notes Total)</td>
                  <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; border-bottom: 3px double #1e1b4b;">${formatBaht(totalNotes)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Coins Panel -->
          <div style="flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 11.5px; font-weight: 900; color: #451a03; border-left: 4px solid #b45309; padding-left: 8px; margin: 0 0 8px 0; uppercase;">3. รายละเอียดเหรียญ (Coins Breakdown)</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #fde68a; border-radius: 6px; overflow: hidden; font-size: 10.5px; text-align: left;">
              <thead>
                <tr style="background-color: #fef3c7; color: #451a03; font-weight: 750; border-bottom: 1.5px solid #fcd34d;">
                  <th style="padding: 8px 10px;">ประเภทเหรียญกษาปณ์</th>
                  <th style="padding: 8px 10px; text-align: center;">จำนวนตวงนับ</th>
                  <th style="padding: 8px 10px; text-align: right;">มูลค่าเงินรวม</th>
                </tr>
              </thead>
              <tbody>
                ${coinsRowsHtml}
                <tr style="background-color: #fffbeb; border-top: 1.5px solid #fcd34d; font-weight: 800; color: #451a03;">
                  <td style="padding: 8px 10px;" colspan="2">รวมกลุ่มเหรียญกษาปณ์ทั้งหมด (Coins Total)</td>
                  <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; border-bottom: 3px double #451a03;">${formatBaht(totalCoins)}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- Section 4: Audit Assessment Remarks -->
        <div style="background-color: ${primaryStatusBg}; border: 1.5px solid ${primaryStatusBorder}; border-left: 6px solid ${primaryStatusColor}; border-radius: 8px; padding: 14px; font-size: 11px; line-height: 1.5; color: #334155; margin-bottom: 20px; text-align: left;">
          <strong style="color: #0f172a; font-weight: 850; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">📝 ความเห็นและคำวินิจฉัยจากคณะผู้ตรวจสอบ (Audit Assessment Findings)</strong>
          <span style="display: block; text-align: justify; line-height: 1.5; color: #334155;">${auditNoteText}</span>
        </div>

        <!-- Section 5: Signature Authorization Panel with Stamps and Barcode -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-top: 24px; border-top: 1.5px dashed #cbd5e1; margin-top: 5px; position: relative;">
          
          <!-- Cashier Signature Area -->
          <div style="width: 38%; text-align: center; display: flex; flex-direction: column; gap: 36px;">
            <p style="font-size: 10px; font-weight: 750; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">ผู้รับผิดชอบกะลิ้นชัก (Certified Custodian Signature)</p>
            <div>
              <div style="width: 180px; border-bottom: 1.5px solid #94a3b8; margin: 0 auto;"></div>
              <p style="font-size: 11.5px; font-weight: 750; color: #1e293b; margin: 5px 0 0 0;">( เจ้าหน้าที่ผู้รับผิดชอบกะ )</p>
              <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">วันที่เซ็น: ______ / ______ / 2569</p>
            </div>
          </div>

          <!-- Official Security Seal Container in Middle -->
          <div style="width: 22%; display: flex; flex-direction: column; align-items: center; justify-content: center; align-self: center;">
            <div style="border: 3px double ${sealColor}; color: ${sealColor}; border-radius: 50%; width: 85px; height: 85px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; transform: rotate(-8deg); text-transform: uppercase; text-align: center; font-family: monospace; line-height: 1.1; box-shadow: 0 0 0 4px #ffffff, 0 1px 4px rgba(0,0,0,0.06); background-color: #ffffff; cursor: default; user-select: none;">
              <span style="border-bottom: 1px solid ${sealColor}; width: 80%; padding-bottom: 2px; margin-bottom: 2px; font-size: 8px; letter-spacing: 0.5px;">SECURE CHECK</span>
              <span style="font-size: 10.5px; letter-spacing: -0.2px; font-weight: 950; text-shadow: 1px 1px 0px rgba(0,0,0,0.02);">${sealText}</span>
              <span style="border-top: 1px solid ${sealColor}; width: 80%; padding-top: 2px; margin-top: 2px; font-size: 7.5px; font-family: sans-serif; font-weight: 700;">BARBER-POS</span>
            </div>
          </div>

          <!-- Manager Approval Signature Area -->
          <div style="width: 38%; text-align: center; display: flex; flex-direction: column; gap: 36px;">
            <p style="font-size: 10px; font-weight: 750; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">ผู้อนุมัติความโปร่งใสประจำร้าน (Approved Store Controller)</p>
            <div>
              <div style="width: 180px; border-bottom: 1.5px solid #94a3b8; margin: 0 auto;"></div>
              <p style="font-size: 11.5px; font-weight: 750; color: #1e293b; margin: 5px 0 0 0;">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
              <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">วันที่เซ็น: ______ / ______ / 2569</p>
            </div>
          </div>

        </div>

        <!-- Corporate Security Compliance Footer Bar -->
        <div style="border-top: 2.5px solid #1e293b; padding-top: 14px; margin-top: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; font-family: monospace;">
          <div style="display: flex; flex-direction: column; gap: 2px; text-align: left;">
            <span>BARBER-POS LEDGER PROTOCOL v1.85 CERTIFIED</span>
            <span>SYSTEM SECURITY SECURED VIA WORKSPACE WORKFLOW</span>
          </div>
          
          <!-- Barcode Area -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
            ${barcodeHtml}
            <span style="font-size: 7.5px; color: #94a3b8; font-weight: 500; letter-spacing: 1px;">*CASH-AUDIT-RECON-ID-c5c98d9d*</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 2px; text-align: right;">
            <span>SYSTEM ASSURED & COMPLIANT</span>
            <span>DOCUMENT PRIVACY CLASSIFIED HIGH</span>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(printContainer);

    // Backup document.styleSheets
    const originalStyleSheets = document.styleSheets;
    
    // Temporarily mock styleSheets property on document so html2canvas doesn't crash on OKLCH definitions in styles
    Object.defineProperty(document, 'styleSheets', {
      value: [],
      writable: true,
      configurable: true
    });

    try {
      // 1. Snapshot the dynamic clean HTML element into a canvas
      const canvas = await html2canvas(printContainer, {
        scale: 2, // Gorgeous retina resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // 2. Setup standard A4 portrait PDF format
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      
      const imgWidth = 190; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const xOffset = (pageWidth - imgWidth) / 2;
      let yOffset = 10;
      if (imgHeight < (pageHeight - 20)) {
        yOffset = (pageHeight - imgHeight) / 2;
      }

      // 3. Draw image inside the PDF document
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

      // Save PDF output
      const dateStr = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      
      pdf.save(`รายงานตรวจสอบเงินสด_${dateStr}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('⚠️ เกิดข้อผิดพลาดทางเทคนิคในการดาวน์โหลด PDF โปรดลองอีกครั้ง');
    } finally {
      // Restore document.styleSheets
      try {
        Object.defineProperty(document, 'styleSheets', {
          value: originalStyleSheets,
          configurable: true,
          writable: true
        });
      } catch (e) {
        console.error(e);
      }

      // Clean up DOM!
      document.body.removeChild(printContainer);
      setIsGeneratingPdf(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 text-left selection:bg-indigo-500 selection:text-white font-sans"
      id="cash-counter-tab-container"
    >
      {/* Tab Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-slate-800 rounded-full opacity-30 pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] uppercase font-mono tracking-widest font-black px-2.5 py-1 rounded-full inline-block">
            4. Cash Drawer Counting Form & Control
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-400" />
            แบบฟอร์มนับเงินสด & ตรวจสอบยอดลิ้นชัก
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            ช่วยอำนวยความสะดวกในการตรวจสอบยอดเงินสดคงเหลือปลายกะ นับแยกประเภทเหรียญและธนบัตรได้อย่างแม่นยำ พร้อมคำนวณเงินทอนตั้งต้น บันทึกถอนถอยออก และเปรียบเทียบหาเงินขาด/เงินเกินโดยอัตโนมัติ
          </p>
          {/* Cloud Sync Status Badge */}
          <div className="pt-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-bold transition-all ${
              isSyncing 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            }`}>
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>กำลังซิงค์และบันทึกข้อมูลคลาวด์...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>บันทึกข้อมูลเรียลไทม์ขึ้นระบบคลาวด์แล้ว (เปิดจากเครื่องไหนก็เห็นตรงกัน)</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto z-10 shrink-0">
          <button
            onClick={handleReset}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>รีเซ็ตค่าทั้งหมด</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              isGeneratingPdf 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-505 text-white hover:bg-emerald-500'
            }`}
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span>กำลังสร้าง PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด PDF</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleCopyToClipboard}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {copied ? (
              <>
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>คัดลอกรายงานแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกรายงานสรุป</span>
              </>
            )}
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Denomination Counters (Grid span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Note Section */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </span>
                นับธนบัตร (Banknotes ในเก๊ะ)
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500">
                รวมธนบัตร: <span className="text-indigo-600 font-extrabold">{formatBaht(totalNotes)}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {DENOMINATIONS.filter(d => d.type === 'note').map((d) => {
                const count = counts[d.id] || 0;
                return (
                  <div key={d.id} className={`p-3 rounded-2xl border transition-all md:col-span-5 hover:shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 ${d.colorClass}`}>
                    
                    {/* Value label */}
                    <div className="flex items-center space-x-3 w-full md:w-1/3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-xs shadow-xs ${d.badgeClass}`}>
                        ฿
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-900 font-mono">{d.label}</p>
                        <p className="text-[10px] text-slate-400 font-sans">มูลค่าใบละ {d.value}</p>
                      </div>
                    </div>

                    {/* Controller Adjustment */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-600"
                        title="ลดทีละ 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={(e) => handleSetCount(d.id, e.target.value)}
                        placeholder="0"
                        className="w-16 h-8 text-center bg-white border border-slate-200 rounded-lg text-xs font-mono font-extrabold outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />

                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-600"
                        title="เพิ่มทีละ 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Rapid Increment helper badges */}
                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, 5)}
                        className="px-2 py-1 text-[10px] font-black bg-white/70 border border-slate-200 hover:bg-slate-100 rounded-md transition-all text-slate-500 cursor-pointer font-mono"
                      >
                        +5
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right w-full md:w-1/4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">รวมย่อย</p>
                      <p className="text-xs font-extrabold text-slate-800 font-mono">
                        {formatBaht(count * d.value)}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Coin Section */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </span>
                นับเหรียญ (Coins ในเก๊ะ)
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500">
                รวมเหรียญ: <span className="text-amber-600 font-extrabold">{formatBaht(totalCoins)}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {DENOMINATIONS.filter(d => d.type === 'coin').map((d) => {
                const count = counts[d.id] || 0;
                return (
                  <div key={d.id} className={`p-3 rounded-2xl border transition-all md:col-span-5 hover:shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 ${d.colorClass}`}>
                    
                    {/* Value label */}
                    <div className="flex items-center space-x-3 w-full md:w-1/3">
                      <div className="w-8 h-8 rounded-full border border-yellow-200 bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0 font-extrabold text-xs shadow-xs">
                        ฿
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-900 font-mono">{d.label}</p>
                        <p className="text-[10px] text-slate-400 font-sans">มูลค่าเหรียญละ {d.value.toFixed(2).replace('.00', '')} บาท</p>
                      </div>
                    </div>

                    {/* Controller Adjustment */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={(e) => handleSetCount(d.id, e.target.value)}
                        placeholder="0"
                        className="w-16 h-8 text-center bg-white border border-slate-200 rounded-lg text-xs font-mono font-extrabold outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />

                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer font-extrabold text-slate-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Rapid Increment helper badges */}
                      <button
                        type="button"
                        onClick={() => adjustCount(d.id, 10)}
                        className="px-2 py-1 text-[10px] font-black bg-white/70 border border-slate-200 hover:bg-slate-100 rounded-md transition-all text-slate-500 cursor-pointer font-mono"
                      >
                        +10
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right w-full md:w-1/4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">รวมย่อย</p>
                      <p className="text-xs font-extrabold text-slate-800 font-mono">
                        {formatBaht(count * d.value)}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Calculations & Display Invoice (Grid span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Calculation Receipt Paper Card */}
          <div 
            id="cash-receipt-pdf-target"
            className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[520px]"
          >
            {/* Design accents */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-amber-400 to-rose-500 animate-pulse"></div>
            
            <div className="space-y-6">
              
              {/* Receipt Header Style */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200 space-y-1">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Calculator className="w-5 h-5 mx-auto" />
                </div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight mt-2">ใบนับเงินสดและเปรียบเทียบยอดเก๊ะ</h3>
                <p className="text-[9px] font-mono font-bold text-slate-400 tracking-widest uppercase">CASH DRAWER RECONCILIATION SHEET</p>
              </div>

              {/* Subtotals breakdown in receipt table */}
              <div className="space-y-4 font-sans">
                
                {/* 1. Cash Counted Summary */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 text-center border border-slate-800 space-y-1 relative">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                    [A] ยอดเงินสดรวมจริงในเก๊ะ จากการนับ
                  </span>
                  <div className="text-2xl md:text-3.5xl font-black text-white font-mono tracking-tight">
                    {formatBaht(grandTotal)}
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono font-bold">
                    รวมทั้งสิ้น {totalPieces} ชิ้น (แบงค์: {formatBaht(totalNotes)} / เหรียญ: {formatBaht(totalCoins)})
                  </div>
                </div>

                {/* 1.5 itemized counts list breakdown */}
                <div className="space-y-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200/60 mb-1">
                    รายการตรวจนับละเอียด (Counted Breakdown)
                  </p>
                  {totalPieces === 0 ? (
                    <p className="text-[10.5px] text-slate-400 italic text-center py-1">ยังไม่มีรายการนับเงินสะสม</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-600">
                      {DENOMINATIONS.map(d => {
                        const count = counts[d.id] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={d.id} className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-400">{d.type === 'note' ? '💵' : '🪙'} {d.label.replace(' บาท', '')}:</span>
                            <span className="font-bold text-slate-700">{count} {d.type === 'note' ? 'ใบ' : 'เหรียญ'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Parameters inputs (Opening Float, Expected, Cash withdrawals) */}
                <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                  
                  {/* (1) Opening Float Input */}
                  <div className="flex items-center justify-between gap-2 p-1 bg-slate-50/50 rounded-lg">
                    <label htmlFor="openingFloat" className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                      💸 เงินทอนตั้งต้นเริ่มวัน (Float):
                    </label>
                    <div className="relative">
                      <input
                        id="openingFloat"
                        type="number"
                        min="0"
                        value={openingFloat === 0 ? '' : openingFloat}
                        onChange={(e) => setOpeningFloat(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                        className="w-24 text-right pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-extrabold outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  {/* (2) Expected Cash Sales Source Selection & computation */}
                  <div className="space-y-2 p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                        📈 [B] ยอดขายสดสะสมในระบบ:
                      </span>
                      <select
                        value={systemSalesSource}
                        onChange={(e) => setSystemSalesSource(e.target.value as any)}
                        className="bg-white border border-indigo-200/80 rounded-lg px-2 py-1 text-[11px] font-bold text-indigo-900 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="today">ยอดขายเงินสดวันนี้</option>
                        <option value="all">ยอดขายเงินสดรวมทั้งหมด</option>
                        <option value="custom">ระบุยอดเอง (Manual)</option>
                      </select>
                    </div>

                    {systemSalesSource === 'custom' ? (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-slate-500 font-semibold">ป้อนรายรับเงินสดเอง:</span>
                        <input
                          type="number"
                          min="0"
                          value={customExpectedSales === 0 ? '' : customExpectedSales}
                          onChange={(e) => setCustomExpectedSales(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0.00"
                          className="w-28 text-right pr-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-extrabold outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1 font-mono">
                        <span className="text-[11px] text-slate-400 font-bold">
                          {systemSalesSource === 'today' ? `ประจำวันที่ ${todayDateStr}` : 'จากการขายในระบบทั้งหมด'} :
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md">
                          {formatBaht(selectedRevenue)}
                        </span>
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 text-left font-sans">
                      * คัดกรองเฉพาะยอดขายที่มีเงื่อนไขรับชำระด้วย **"เงินสด (Cash)"** มาคำนวณเท่านั้น
                    </p>
                  </div>

                  {/* (3) Withdrawal/Cash Out Input */}
                  <div className="space-y-1.5 font-sans">
                    {/* (3a) System Cash Out Auto-Calculated */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-700 flex items-center gap-1 text-[11px] text-left shrink-0">
                        📥 [C1] รายจ่ายระบบถอนจ่ายจากเก๊ะ:
                      </span>
                      <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        -{formatBaht(systemWithdrawn)}
                      </span>
                    </div>

                    {/* (3b) Manual Cash Out Adjustment */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-rose-50/40 rounded-xl border border-rose-100/50">
                      <label htmlFor="withdrawnAmount" className="font-bold text-rose-950 flex items-center gap-1 text-[11px] text-left shrink-0">
                        📤 [C2] ถอนถอยนอกระบบเพิ่มเติม:
                      </label>
                      <div className="relative">
                        <input
                          id="withdrawnAmount"
                          type="number"
                          min="0"
                          value={withdrawnAmount === 0 ? '' : withdrawnAmount}
                          onChange={(e) => setWithdrawnAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0.00"
                          className="w-24 text-right pr-2 py-1 bg-white border border-rose-200 rounded-lg text-xs font-mono font-extrabold text-rose-700 outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal pl-1 text-left">
                    * ยอดรวมถอนออก [C1 + C2] = <strong className="text-rose-650 font-mono font-extrabold">{formatBaht(totalWithdrawn)}</strong> จะนำไปหักลดออกจากยอดบวกรอบกะเพื่อหาค่าสมดุลเครื่อง
                  </p>

                </div>

                {/* Dashed divider */}
                <div className="border-t border-dashed border-slate-200 py-1"></div>

                {/* 3. Expected Drawer Calculation Output */}
                <div className="flex justify-between items-center text-xs p-1">
                  <span className="text-slate-500 font-semibold text-left">
                    📋 ยอดเงินในบัญชีที่ควรมี [A + B - (C1 + C2)] :
                  </span>
                  <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {formatBaht(expectedCashInDrawer)}
                  </span>
                </div>

                {/* 4. REALTIME LIVE AUDIT STATUS (Surplus, Deficit, Balanced) */}
                <div className="pt-2">
                  {Math.abs(discrepancy) < 0.01 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                      <div className="text-left font-sans space-y-0.5">
                        <span className="text-[10px] font-black text-emerald-800 uppercase block tracking-wider">
                          ผลการตรวจสอบลิ้นชัก (Drawer Balanced)
                        </span>
                        <div className="text-md font-extrabold text-emerald-700">ยอดเงินตรงเป๊ะ 100% ไม่มีขาด/เกิน</div>
                        <p className="text-[10px] text-slate-500">
                          ยอดเงินจากการนับสอดคล้องกับเปิดลิ้นชักประกอบกับข้อมูลการชายเครื่องอย่างสมบูรณ์
                        </p>
                      </div>
                    </div>
                  ) : discrepancy > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-amber-500 shrink-0 animate-bounce" />
                      <div className="text-left font-sans space-y-0.5">
                        <span className="text-[10px] font-black text-amber-800 uppercase block tracking-wider">
                          พบยอดเงินเกินบัญชี (Cash Surplus)
                        </span>
                        <div className="text-md font-extrabold text-amber-700">
                          มีเงินในเก๊ะเกินอยู่ <span className="font-mono font-black text-lg">+{formatBaht(discrepancy)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          สาเหตุอาจมาจากการลืมสแกนบันทึกบิลตัดผมเข้าสู่ยอดขาย แต่ลูกค้าจ่ายเงินสดเรียบร้อยแล้ว
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
                      <AlertCircle className="w-8 h-8 text-rose-500 shrink-0 animate-pulse" />
                      <div className="text-left font-sans space-y-0.5">
                        <span className="text-[10px] font-black text-rose-800 uppercase block tracking-wider">
                          พบยอดเงินขาดจากบัญชี (Cash Deficit/Shortage)
                        </span>
                        <div className="text-md font-extrabold text-rose-600">
                          เงินสดสูญหาย/ขาด <span className="font-mono font-black text-lg">-{formatBaht(Math.abs(discrepancy))}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          ควรทำการตรวจสอบบิลย้อนหลังว่า มีบิลใดชำระเงินโอนแต่เผลอบันทึกเป็นเงินสด หรือมีการทอนเงินผิดพลาด
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Receipt Footer Info */}
            <div className="border-t border-slate-200 pt-4 mt-6 text-center space-y-1.5 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
              <p className="text-[9.5px] text-slate-400 font-sans leading-relaxed">
                ข้อมูลบันทึกเก็บในหน่วยความจำเครื่องของเบราว์เซอร์อย่างปลอดภัย แยกอิสระตามอีเมลไม่ปะปนกับผู้อื่น แม้รีเฟรชเบราว์เซอร์ข้อมูลเงินสดยังคงอยู่เหมือนเดิม
              </p>
              
              <div className="text-[8.5px] text-indigo-400 font-mono uppercase tracking-widest flex items-center justify-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Audited Cash Counter Engine v1.50</span>
              </div>
            </div>

          </div>

          {/* Quick Informational Tip Card */}
          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 flex gap-3 text-left">
            <span className="text-lg">💡</span>
            <div className="space-y-1 font-sans">
              <h4 className="text-xs font-bold text-slate-800">ขั้นตอนการสรุปยอดรอบกะการขาย</h4>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                1. กรอกยอดเงินสำรองเริ่มต้นที่คุณเหลือทิ้งไว้ในลิ้นชักตอนเช้า (ช่องเงินทอนตั้งต้นเริ่มวัน)<br />
                2. เลือกเป็น <strong>"ยอดขายเงินสดวันนี้"</strong> หรือตรวจทานหากมีเงินรับเข้าด้านอื่นให้เลือกแบบระบุเอง<br />
                3. บันทึกยอดเงินสดที่คุณนำติดตัวออกไปเพื่อจ่ายสะสางค่าใช้จ่ายหรือนำไปเก็บฝาก (ช่องเงินนำออก)<br />
                4. นับจำนวนธนบัตรและเหรียญที่ปรากฏในเก๊ะถัดไป และสังเกตผลกระทบเชิงต่าง หากมีเงินขาดให้รีบจับคู่บิลเพื่อหาข้อผิดพลาดก่อนปิดลิ้นชัก
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Custom Reset Cash Counter Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="reset-counter-confirm-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center space-y-5">
            
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold font-sans text-slate-900">ล้างเครื่องคำนวณเงินสด?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans px-2">
                คุณต้องการล้างจำนวนเงินที่นับไว้และข้อมูลการคำนวณทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่?
              </p>
            </div>
            
            <div className="flex w-full gap-3 font-sans">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/10"
              >
                ยืนยันการล้างข้อมูล
              </button>
            </div>
            
          </div>
        </div>
      )}

    </motion.div>
  );
}
