import React, { useState, useMemo } from 'react';
import { SaleRecord, Barber, ShareConfig, ShopConfig, Payslip } from '../types';
import { 
  formatBaht, 
  formatThaiMonth, 
  formatThaiDate,
  downloadWordReport 
} from '../utils';
import { 
  Printer, 
  Trash2, 
  BookmarkCheck, 
  History, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  Plus, 
  Search, 
  ChevronRight,
  Info,
  Pencil,
  Calendar,
  CalendarDays,
  Filter,
  Sparkles,
  Scissors,
  Clock
} from 'lucide-react';

interface PayslipsTabProps {
  sales: SaleRecord[];
  barbers: Barber[];
  shareConfig: ShareConfig;
  shopConfig: ShopConfig;
  payslips?: Payslip[];
  onUpdatePayslips?: (payslips: Payslip[]) => void;
}

export default function PayslipsTab({
  sales = [],
  barbers = [],
  shareConfig,
  shopConfig,
  payslips = [],
  onUpdatePayslips
}: PayslipsTabProps) {

  // Dynamic native helpers for date/month
  const getLocalMonthString = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0].substring(0, 7);
  };

  const getTodayDateString = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const get26thLastMonthDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const prevMonth26 = new Date(year, month - 1, 26);
    const offset = prevMonth26.getTimezoneOffset() * 60000;
    return new Date(prevMonth26.getTime() - offset).toISOString().split('T')[0];
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthString());
  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(get26thLastMonthDateString());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayDateString());
  const [slipBarberId, setSlipBarberId] = useState<string>('');

  // Quick presets for custom date range
  const handleSetPreset26to25 = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    let startObj: Date;
    let endObj: Date;

    if (date >= 26) {
      startObj = new Date(year, month, 26);
      endObj = new Date(year, month + 1, 25);
    } else {
      startObj = new Date(year, month - 1, 26);
      endObj = new Date(year, month, 25);
    }

    const startISO = new Date(startObj.getTime() - startObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endISO = new Date(endObj.getTime() - endObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    setCustomStartDate(startISO);
    setCustomEndDate(endISO);
  };

  const handleSetPresetCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startISO = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endISO = new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    setCustomStartDate(startISO);
    setCustomEndDate(endISO);
  };

  const handleSetPresetLastMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const startISO = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endISO = new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    setCustomStartDate(startISO);
    setCustomEndDate(endISO);
  };

  const handleSetPresetLastDays = (days: number) => {
    const endObj = new Date();
    const startObj = new Date();
    startObj.setDate(endObj.getDate() - (days - 1));

    const startISO = new Date(startObj.getTime() - startObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endISO = new Date(endObj.getTime() - endObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    setCustomStartDate(startISO);
    setCustomEndDate(endISO);
  };
  
  // States for Professional Payslip Builder
  const [slipBaseSalary, setSlipBaseSalary] = useState<number | ''>('');
  const [slipOvertime, setSlipOvertime] = useState<number | ''>('');
  const [slipPositionAllowance, setSlipPositionAllowance] = useState<number | ''>(''); // ค่าตำแหน่ง
  const [slipDeductions, setSlipDeductions] = useState<number | ''>('');
  const [slipSocialSecurity, setSlipSocialSecurity] = useState<number | ''>('');
  const [slipTaxRate, setSlipTaxRate] = useState<number>(0); // Standard 3% withholding tax in Thailand (Default to 0%)
  const [slipNote, setSlipNote] = useState<string>('');

  // States for manual override of commission fields
  const [slipHaircutCom, setSlipHaircutCom] = useState<number | ''>('');
  const [slipChemicalCom, setSlipChemicalCom] = useState<number | ''>('');
  const [slipProductCom, setSlipProductCom] = useState<number | ''>('');
  const [slipTipTotal, setSlipTipTotal] = useState<number | ''>('');

  // Helper to handle numeric inputs with support for empty strings
  const handleNumberInput = (value: string, setter: (val: number | '') => void) => {
    if (value === '') {
      setter('');
    } else {
      setter(Math.max(0, parseFloat(value) || 0));
    }
  };
  
  // Historical search filters
  const [historySelectedMonth, setHistorySelectedMonth] = useState<string>('all');
  const [historySelectedBarberId, setHistorySelectedBarberId] = useState<string>('all');
  
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Edit Payslip Modal States
  const [editSlip, setEditSlip] = useState<Payslip | null>(null);
  const [editSlipBaseSalary, setEditSlipBaseSalary] = useState<number | ''>('');
  const [editSlipOvertime, setEditSlipOvertime] = useState<number | ''>('');
  const [editSlipPositionAllowance, setEditSlipPositionAllowance] = useState<number | ''>('');
  const [editSlipHaircutCom, setEditSlipHaircutCom] = useState<number | ''>('');
  const [editSlipChemicalCom, setEditSlipChemicalCom] = useState<number | ''>('');
  const [editSlipProductCom, setEditSlipProductCom] = useState<number | ''>('');
  const [editSlipTipTotal, setEditSlipTipTotal] = useState<number | ''>('');
  const [editSlipDeductions, setEditSlipDeductions] = useState<number | ''>('');
  const [editSlipSocialSecurity, setEditSlipSocialSecurity] = useState<number | ''>('');
  const [editSlipTaxRate, setEditSlipTaxRate] = useState<number>(0);
  const [editSlipNote, setEditSlipNote] = useState<string>('');

  const handleOpenEditSlip = (slip: Payslip) => {
    setEditSlip(slip);
    setEditSlipBaseSalary(slip.baseSalary !== undefined ? slip.baseSalary : '');
    setEditSlipOvertime(slip.overtime !== undefined ? slip.overtime : '');
    setEditSlipPositionAllowance(slip.positionAllowance !== undefined ? slip.positionAllowance : '');
    setEditSlipHaircutCom(slip.haircutCommission !== undefined ? slip.haircutCommission : '');
    setEditSlipChemicalCom(slip.chemicalCommission !== undefined ? slip.chemicalCommission : '');
    setEditSlipProductCom(slip.productCommission !== undefined ? slip.productCommission : '');
    setEditSlipTipTotal(slip.tips !== undefined ? slip.tips : '');
    setEditSlipDeductions(slip.deductions !== undefined ? slip.deductions : '');
    setEditSlipSocialSecurity(slip.socialSecurity !== undefined ? slip.socialSecurity : '');
    setEditSlipTaxRate(slip.taxRate ?? 0);
    setEditSlipNote(slip.note ?? '');
  };

  const editSlipCalculation = useMemo(() => {
    if (!editSlip) return null;
    const base = Number(editSlipBaseSalary) || 0;
    const ot = Number(editSlipOvertime) || 0;
    const posAllowance = Number(editSlipPositionAllowance) || 0;
    const haircutCom = Number(editSlipHaircutCom) || 0;
    const chemCom = Number(editSlipChemicalCom) || 0;
    const prodCom = Number(editSlipProductCom) || 0;
    const tip = Number(editSlipTipTotal) || 0;

    const totalSharesGenerated = haircutCom + chemCom + prodCom;
    const earnedIncome = Math.max(totalSharesGenerated, base);
    const topupBonus = totalSharesGenerated > base ? (totalSharesGenerated - base) : 0;
    const guaranteeSupplement = totalSharesGenerated < base ? (base - totalSharesGenerated) : 0;

    const totalEarnings = earnedIncome + tip + ot + posAllowance;
    const taxValue = (totalEarnings * editSlipTaxRate) / 100;
    const deductions = Number(editSlipDeductions) || 0;
    const soc = Number(editSlipSocialSecurity) || 0;
    const totalDeductions = deductions + soc + taxValue;
    const netPayable = totalEarnings - totalDeductions;

    return {
      totalSharesGenerated,
      earnedIncome,
      topupBonus,
      guaranteeSupplement,
      totalEarnings,
      taxValue,
      totalDeductions,
      netPayable
    };
  }, [
    editSlip,
    editSlipBaseSalary,
    editSlipOvertime,
    editSlipPositionAllowance,
    editSlipHaircutCom,
    editSlipChemicalCom,
    editSlipProductCom,
    editSlipTipTotal,
    editSlipDeductions,
    editSlipSocialSecurity,
    editSlipTaxRate
  ]);

  const handleSaveEditedPayslip = () => {
    if (!editSlip || !onUpdatePayslips || !editSlipCalculation) return;

    const updatedSlip: Payslip = {
      ...editSlip,
      baseSalary: Number(editSlipBaseSalary) || 0,
      overtime: Number(editSlipOvertime) || 0,
      positionAllowance: Number(editSlipPositionAllowance) || 0,
      haircutCommission: Number(editSlipHaircutCom) || 0,
      chemicalCommission: Number(editSlipChemicalCom) || 0,
      productCommission: Number(editSlipProductCom) || 0,
      tips: Number(editSlipTipTotal) || 0,
      deductions: Number(editSlipDeductions) || 0,
      socialSecurity: Number(editSlipSocialSecurity) || 0,
      taxRate: editSlipTaxRate,
      note: editSlipNote,
      totalEarnings: editSlipCalculation.totalEarnings,
      totalDeductions: editSlipCalculation.totalDeductions,
      netPaid: editSlipCalculation.netPayable,
      timestamp: new Date().toISOString()
    };

    onUpdatePayslips(payslips.map(s => s.id === editSlip.id ? updatedSlip : s));
    setEditSlip(null);

    setSaveSuccessMsg(`แก้ไขข้อมูลสลิปเงินเดือนช่าง ${editSlip.barberName} รอบเดือน ${formatThaiMonth(editSlip.month)} เรียบร้อยแล้ว!`);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 4500);
  };

  // Dynamic list of sales record months
  const availableMonths = useMemo(() => {
    const months = sales.map(s => s.date.substring(0, 7));
    const curMonth = getLocalMonthString();
    if (!months.includes(curMonth)) months.push(curMonth);
    return Array.from(new Set(months)).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  // Dynamic lists of archived months and barbers for historical search filters
  const archivedMonths = useMemo(() => {
    const list = Array.from(new Set(payslips.map(s => s.month)));
    return list.sort((a, b) => b.localeCompare(a));
  }, [payslips]);

  const archivedBarbers = useMemo(() => {
    const list = barbers.map(b => ({ id: b.id, name: b.name }));
    payslips.forEach(s => {
      if (!list.some(item => item.id === s.barberId)) {
        list.push({ id: s.barberId, name: s.barberName });
      }
    });
    return list;
  }, [barbers, payslips]);

  // Auto-select first barber as default slip recipient when loaded
  React.useEffect(() => {
    if (barbers.length > 0 && !slipBarberId) {
      setSlipBarberId(barbers[0].id);
    }
  }, [barbers, slipBarberId]);

  // Fetch sales of selected month or custom date range automatically
  const periodSales = useMemo(() => {
    if (dateFilterMode === 'month') {
      return sales.filter(s => s.date && s.date.startsWith(selectedMonth));
    } else {
      if (!customStartDate && !customEndDate) return sales;
      if (customStartDate && customEndDate) {
        return sales.filter(s => s.date && s.date >= customStartDate && s.date <= customEndDate);
      } else if (customStartDate) {
        return sales.filter(s => s.date && s.date >= customStartDate);
      } else if (customEndDate) {
        return sales.filter(s => s.date && s.date <= customEndDate);
      }
      return sales;
    }
  }, [sales, dateFilterMode, selectedMonth, customStartDate, customEndDate]);

  // Calculate selected barber's statistics for the selected period (month or custom range)
  const periodBarberStats = useMemo(() => {
    return barbers.map(barber => {
      const barberSales = periodSales.filter(s => s.barberId === barber.id);
      const cutsCount = barberSales.filter(s => s.haircutPrice > 0).length;
      
      const haircutCom = barberSales.reduce((sum, s) => sum + s.barberHaircutShare, 0);
      const chemicalCom = barberSales.reduce((sum, s) => sum + s.barberChemicalShare, 0);
      const productCom = barberSales.reduce((sum, s) => sum + s.barberProductShare, 0);
      const tipTotal = barberSales.reduce((sum, s) => sum + s.tip, 0);
      const grandTotal = haircutCom + chemicalCom + productCom + tipTotal;
      const grossRevenue = barberSales.reduce((sum, s) => sum + (s.haircutPrice + Math.max(0, s.chemicalPrice - (s.chemicalDiscountAmount || 0)) + s.productPrice), 0);

      return {
        id: barber.id,
        name: barber.name,
        realName: barber.realName || barber.name,
        position: barber.position || 'ช่างตัดผม',
        cutsCount,
        haircutCom,
        chemicalCom,
        productCom,
        tipTotal,
        grandTotal,
        grossRevenue,
        salesCount: barberSales.length
      };
    });
  }, [periodSales, barbers]);

  const periodOverallStats = useMemo(() => {
    const totalCuts = periodBarberStats.reduce((sum, b) => sum + b.cutsCount, 0);
    const totalHaircutCom = periodBarberStats.reduce((sum, b) => sum + b.haircutCom, 0);
    const totalChemicalCom = periodBarberStats.reduce((sum, b) => sum + b.chemicalCom, 0);
    const totalProductCom = periodBarberStats.reduce((sum, b) => sum + b.productCom, 0);
    const totalCommissions = totalHaircutCom + totalChemicalCom + totalProductCom;
    const totalTips = periodBarberStats.reduce((sum, b) => sum + b.tipTotal, 0);
    const grandTotalEarned = periodBarberStats.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalGrossRevenue = periodBarberStats.reduce((sum, b) => sum + b.grossRevenue, 0);

    return {
      salesCount: periodSales.length,
      totalCuts,
      totalHaircutCom,
      totalChemicalCom,
      totalProductCom,
      totalCommissions,
      totalTips,
      grandTotalEarned,
      totalGrossRevenue
    };
  }, [periodBarberStats, periodSales]);

  const selectedSlipBarberStats = useMemo(() => {
    const stats = periodBarberStats.find(b => b.id === slipBarberId);
    if (!stats) return null;
    return stats;
  }, [periodBarberStats, slipBarberId]);

  const handleApplyBarberPeriodStatsToSlip = (barberId: string) => {
    setSlipBarberId(barberId);
    
    // Clear manual overrides so defaults from period stats take effect
    setSlipHaircutCom('');
    setSlipChemicalCom('');
    setSlipProductCom('');
    setSlipTipTotal('');

    // Smooth scroll to the Interactive Payslip Builder
    const element = document.getElementById('professional-payslips-generator');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const selectedBarberForSlip = useMemo(() => {
    return barbers.find(b => b.id === slipBarberId);
  }, [barbers, slipBarberId]);

  // Auto-set base salary when selected barber changes
  React.useEffect(() => {
    if (selectedBarberForSlip) {
      setSlipBaseSalary(selectedBarberForSlip.baseSalary || '');
    } else {
      setSlipBaseSalary('');
    }
  }, [selectedBarberForSlip]);

  // Reset manual override states to empty strings by default so they start as empty fields for the user to type
  React.useEffect(() => {
    setSlipHaircutCom('');
    setSlipChemicalCom('');
    setSlipProductCom('');
    setSlipTipTotal('');
    setSlipOvertime('');
    setSlipPositionAllowance('');
    setSlipDeductions('');
    setSlipSocialSecurity('');
  }, [selectedSlipBarberStats]);

  // Calculate live preview formulas
  const previewCalculation = useMemo(() => {
    if (!selectedSlipBarberStats) return null;
    const stats = selectedSlipBarberStats;
    const base = Number(slipBaseSalary) || 0;
    const ot = Number(slipOvertime) || 0;
    const posAllowance = Number(slipPositionAllowance) || 0;
    const tip = slipTipTotal === '' ? stats.tipTotal : (Number(slipTipTotal) || 0);
    const haircutCom = slipHaircutCom === '' ? stats.haircutCom : (Number(slipHaircutCom) || 0);
    const chemCom = slipChemicalCom === '' ? stats.chemicalCom : (Number(slipChemicalCom) || 0);
    const prodCom = slipProductCom === '' ? stats.productCom : (Number(slipProductCom) || 0);

    const totalSharesGenerated = haircutCom + chemCom + prodCom;
    const earnedIncome = Math.max(totalSharesGenerated, base);
    const topupBonus = totalSharesGenerated > base ? (totalSharesGenerated - base) : 0;
    const guaranteeSupplement = totalSharesGenerated < base ? (base - totalSharesGenerated) : 0;

    const totalEarnings = earnedIncome + tip + ot + posAllowance;
    const taxValue = (totalEarnings * slipTaxRate) / 100;
    const deductions = Number(slipDeductions) || 0;
    const soc = Number(slipSocialSecurity) || 0;
    const totalDeductions = deductions + soc + taxValue;
    const netPayable = totalEarnings - totalDeductions;

    return {
      totalSharesGenerated,
      earnedIncome,
      topupBonus,
      guaranteeSupplement,
      totalEarnings,
      taxValue,
      deductions,
      soc,
      totalDeductions,
      netPayable
    };
  }, [selectedSlipBarberStats, slipBaseSalary, slipOvertime, slipPositionAllowance, slipTaxRate, slipDeductions, slipSocialSecurity, slipHaircutCom, slipChemicalCom, slipProductCom, slipTipTotal]);

  // General Unified Payslip Printing Engine (Safe hex codes, no oklch to prevent PDF compiling error)
  const printPayslipData = (data: {
    barberId: string;
    barberName: string;
    realName: string;
    position: string;
    month: string;
    baseSalary: number;
    overtime: number;
    positionAllowance?: number;
    haircutCom: number;
    chemicalCom: number;
    productCom: number;
    tipTotal: number;
    deductions: number;
    soc: number;
    taxRate: number;
    note: string;
  }) => {
    const {
      barberId,
      barberName,
      realName,
      position,
      month,
      baseSalary,
      overtime,
      positionAllowance = 0,
      haircutCom,
      chemicalCom,
      productCom,
      tipTotal,
      deductions,
      soc,
      taxRate,
      note
    } = data;

    const totalSharesGenerated = haircutCom + chemicalCom + productCom;
    const earnedIncome = Math.max(totalSharesGenerated, baseSalary);
    const topupBonus = totalSharesGenerated > baseSalary ? (totalSharesGenerated - baseSalary) : 0;
    const guaranteeSupplement = totalSharesGenerated < baseSalary ? (baseSalary - totalSharesGenerated) : 0;
    const posAllowance = positionAllowance || 0;
    
    const totalEarnings = earnedIncome + tipTotal + overtime + posAllowance;
    const taxValue = (totalEarnings * taxRate) / 100;
    const totalDeductions = deductions + soc + taxValue;
    const netPayable = totalEarnings - totalDeductions;
    const thMonth = formatThaiMonth(month);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้ระบบเปิดหน้าต่างใหม่ (Popups) เพื่อทำการพิมพ์สลิปเงินเดือน');
      return;
    }

    const htmlContent = `
      <html>
      <head>
        <title>สลิปส่วนแบ่งเงินเดือนช่าง_${barberName}_${month}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-family: 'Sarabun', 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #0f172a;
            background-color: #f8fafc;
          }

          /* Print styling resets */
          @media print {
            body {
              padding: 0;
              background-color: #ffffff;
            }
            .payslip-container {
              border: 1px solid #cbd5e1 !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 24px !important;
              border-radius: 0 !important;
            }
            .payslip-container {
              page-break-inside: avoid;
            }
          }

          .payslip-container {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 32px;
            max-width: 800px;
            margin: 0 auto;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            position: relative;
            overflow: hidden;
          }

          /* Watermark Background Stamp */
          .background-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-12deg);
            font-size: 56px;
            font-weight: 800;
            color: rgba(15, 23, 42, 0.025);
            letter-spacing: 4px;
            pointer-events: none;
            white-space: nowrap;
            z-index: 0;
            text-transform: uppercase;
            text-align: center;
          }

          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 24px;
            position: relative;
            z-index: 10;
          }

          .shop-info-wrapper {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .shop-logo {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid #f1f5f9;
          }

          .shop-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
          }

          .shop-name {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }

          .shop-sub {
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }

          .header-badge {
            background-color: #e0e7ff;
            color: #4338ca;
            font-size: 11px;
            font-weight: 800;
            padding: 6px 12px;
            border-radius: 8px;
            text-transform: uppercase;
          }

          /* Meta Details Matrix */
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 20px;
            margin-bottom: 24px;
            position: relative;
            z-index: 10;
          }

          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            text-align: left;
          }

          .meta-label {
            font-size: 9px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .meta-value {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }

          .meta-value-highlight {
            color: #4f46e5;
          }

          /* Content Layout */
          .columns-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 24px;
            position: relative;
            z-index: 10;
          }

          .column {
            display: flex;
            flex-direction: column;
            gap: 12px;
            text-align: left;
          }

          .column-border-right {
            border-right: 1px solid #f1f5f9;
            padding-right: 16px;
          }

          .col-header {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 8px;
          }

          .col-header.earnings {
            color: #4338ca;
            border-color: #e0e7ff;
          }

          .col-header.deductions {
            color: #be123c;
            border-color: #ffe4e6;
          }

          .row-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11.5px;
            color: #334155;
          }

          .row-item-sub {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
            padding-left: 12px;
          }

          .row-item-sub-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-left: 2px solid #cbd5e1;
            padding-left: 10px;
            margin-left: 4px;
            margin-top: 4px;
            margin-bottom: 8px;
          }

          .font-mono-val {
            font-family: 'Inter', monospace;
            font-weight: 600;
          }

          .highlight-success {
            color: #059669;
            font-weight: 700;
          }

          .highlight-indigo {
            color: #4f46e5;
            font-weight: 700;
          }

          .highlight-purple {
            color: #7c3aed;
            font-weight: 700;
          }

          .highlight-danger {
            color: #e11d48;
            font-weight: 700;
          }

          .totals-divider {
            border-top: 1px solid #e2e8f0;
            margin-top: 8px;
            padding-top: 8px;
          }

          .column-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
          }

          /* Net Commission Footer Section */
          .net-banner {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            position: relative;
            z-index: 10;
          }

          .net-label-wrapper {
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
          }

          .net-title {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .net-subtitle {
            font-size: 9px;
            color: #64748b;
            font-weight: 500;
          }

          .net-amount {
            font-family: 'Inter', sans-serif;
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
          }

          /* Note Banner */
          .note-container {
            background-color: #fdf2f8;
            border: 1px dashed #fbcfe8;
            border-radius: 8px;
            padding: 12px;
            font-size: 11px;
            color: #9d174d;
            line-height: 1.5;
            margin-bottom: 24px;
            position: relative;
            z-index: 10;
            text-align: left;
          }

          /* Signatures layout */
          .signatures-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            border-top: 1px solid #f1f5f9;
            padding-top: 32px;
            position: relative;
            z-index: 10;
          }

          .signature-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .sig-line {
            width: 200px;
            border-bottom: 1px solid #94a3b8;
            margin-bottom: 8px;
            height: 40px;
          }

          .sig-title {
            font-size: 10.5px;
            font-weight: 700;
            color: #475569;
          }

          .sig-date {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 4px;
          }

          /* Bottom Info Status Bar */
          .bottom-info-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
            margin-top: 32px;
            font-size: 8.5px;
            color: #94a3b8;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            position: relative;
            z-index: 10;
          }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <div class="background-watermark">OFFICIAL PAYSLIP</div>
          
          <div class="header-section">
            <div class="shop-info-wrapper">
              ${shopConfig.logoUrl ? `<img src="${shopConfig.logoUrl}" alt="shop logo" class="shop-logo" referrerPolicy="no-referrer" />` : ''}
              <div class="shop-details">
                <h5 class="shop-name">${shopConfig.shopName}</h5>
                <p class="shop-sub">Bilingual Employee Pay Slip</p>
              </div>
            </div>
            <div>
              <span class="header-badge">สัญญายืนยันรายรับใบสะสม</span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">ชื่อผู้มีสิทธิ์เสียภาษี / Employee Client:</span>
              <span class="meta-value">${realName}</span>
            </div>
            <div class="meta-item" style="text-align: right;">
              <span class="meta-label">รอบวัฏจักรบัญชี / Cycle Period:</span>
              <span class="meta-value">${thMonth}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">ตำแหน่งหน้าที่เฉพาะ / Employee Position:</span>
              <span class="meta-value meta-value-highlight">${position}</span>
            </div>
            <div class="meta-item" style="text-align: right;">
              <span class="meta-label">วันที่กำหนดจ่าย / Issue Date:</span>
              <span class="meta-value">${new Date().toLocaleDateString('th-TH')}</span>
            </div>
          </div>

          <div class="columns-grid">
            <!-- Earnings Column -->
            <div class="column column-border-right">
              <div class="col-header earnings">
                <span>รายการฝั่งรายได้ (EARNINGS)</span>
                <span>บาท (THB)</span>
              </div>

              <div class="row-item" style="color: #64748b; font-style: italic; font-size: 10px;">
                <span>สถิติวอลุ่มยอดสะสมช่างจริง:</span>
                <span class="font-mono-val">${formatBaht(totalSharesGenerated)}</span>
              </div>

              <div class="row-item-sub-list">
                <div class="row-item-sub">
                  <span>• ตัดผม (Haircut Part)</span>
                  <span class="font-mono-val">${formatBaht(haircutCom)}</span>
                </div>
                <div class="row-item-sub">
                  <span>• สระดัดเคมี (Chemical Part)</span>
                  <span class="font-mono-val">${formatBaht(chemicalCom)}</span>
                </div>
                <div class="row-item-sub">
                  <span>• ส่วนเสริมสินค้า (Products Part)</span>
                  <span class="font-mono-val">${formatBaht(productCom)}</span>
                </div>
                <div class="row-item-sub" style="color: #4338ca;">
                  <span>• ยอดสะสมทิป (Tips Total)</span>
                  <span class="font-mono-val">${formatBaht(tipTotal)}</span>
                </div>
              </div>

              <div class="row-item">
                <span>เกณฑ์ขั้นรับค้ำประกันช่าง:</span>
                <span class="font-mono-val">${formatBaht(baseSalary)}</span>
              </div>

              ${guaranteeSupplement > 0 ? `
              <div class="row-item highlight-indigo">
                <span>🎯 ชดเชยวออเชอร์ค้ำประกัน:</span>
                <span class="font-mono-val">+${formatBaht(guaranteeSupplement)}</span>
              </div>
              ` : ''}

              ${topupBonus > 0 ? `
              <div class="row-item highlight-success">
                <span>🚀 ส่วนขยายเกินขั้นรับประกัน:</span>
                <span class="font-mono-val">+${formatBaht(topupBonus)}</span>
              </div>
              ` : ''}

              ${posAllowance > 0 ? `
              <div class="row-item highlight-purple">
                <span>🎖️ ค่าตำแหน่งทางการงาน:</span>
                <span class="font-mono-val">+${formatBaht(posAllowance)}</span>
              </div>
              ` : ''}

              ${overtime > 0 ? `
              <div class="row-item" style="color: #475569;">
                <span>เบี้ยขยันพิเศษ / เงิน OT:</span>
                <span class="font-mono-val">+${formatBaht(overtime)}</span>
              </div>
              ` : ''}

              <div class="totals-divider">
                <div class="column-total-row">
                  <span>รวมรายได้สะสมพึงประเมิน:</span>
                  <span class="font-mono-val" style="color: #312e81;">${formatBaht(totalEarnings)}</span>
                </div>
              </div>
            </div>

            <!-- Deductions Column -->
            <div class="column">
              <div class="col-header deductions">
                <span>รายการหักรายงวด (DEDUCTIONS)</span>
                <span>บาท (THB)</span>
              </div>

              <div class="row-item">
                <span>หักภาษี ณ ที่จ่ายตามใบรับ (${taxRate}%):</span>
                <span class="font-mono-val">-${formatBaht(taxValue)}</span>
              </div>

              <div class="row-item">
                <span>หักสวัสดิการรวม / รอยเบิกล่วงหน้า:</span>
                <span class="font-mono-val">-${formatBaht(deductions)}</span>
              </div>

              <div class="row-item">
                <span>หักสะสมเงินประกันของช่าง:</span>
                <span class="font-mono-val">-${formatBaht(soc)}</span>
              </div>

              <div class="totals-divider" style="margin-top: auto;">
                <div class="column-total-row">
                  <span>รวมยอดหักเงินทั้งหมด:</span>
                  <span class="font-mono-val" style="color: #9f1239;">-${formatBaht(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="net-banner">
            <div class="net-label-wrapper">
              <span class="net-title">ยอดรับเงินโอนสุทธิ (NET COMMISSION PAYABLE)</span>
              <span class="net-subtitle">บันทึกยอดเงินค้ำประกันสะสมคงประเมินเรียบร้อยแล้ว</span>
            </div>
            <div class="net-amount">
              ${formatBaht(netPayable)}
            </div>
          </div>

          ${note ? `
          <div class="note-container">
            💡 <b>รายละเอียดเพิ่มเติม / System note:</b> ${note}
          </div>
          ` : ''}

          <div class="signatures-section">
            <div class="signature-box">
              <div class="sig-line"></div>
              <span class="sig-title">ลายชื่อพนักงานผู้รับเงิน / Recipient Signature</span>
              <span class="sig-date">วันที่ _________/__/_________</span>
            </div>
            <div class="signature-box">
              <div class="sig-line"></div>
              <span class="sig-title">ลายชื่อผู้อนุมัติแบ่งส่วน / Authorized representative</span>
              <span class="sig-date">ตำแหน่ง: ผู้แทนจัดทำบัญชี / ร้านบาร์เบอร์</span>
            </div>
          </div>

          <div class="bottom-info-bar">
            <span>SYSTEM GUIDED PAYROLL • SECURITY STATUS ONLINE</span>
            <span>CONFIDENTIAL OFFICE STATEMENT</span>
          </div>
        </div>

        <script>
          function startPrint() {
            window.print();
          }
          window.addEventListener('load', function() {
            var imgs = document.getElementsByTagName('img');
            var loadedCount = 0;
            if (imgs.length === 0) {
              setTimeout(startPrint, 300);
            } else {
              for (var i = 0; i < imgs.length; i++) {
                if (imgs[i].complete) {
                  loadedCount++;
                  if (loadedCount === imgs.length) {
                    setTimeout(startPrint, 300);
                  }
                } else {
                  imgs[i].addEventListener('load', function() {
                    loadedCount++;
                    if (loadedCount === imgs.length) {
                      setTimeout(startPrint, 300);
                    }
                  });
                  imgs[i].addEventListener('error', function() {
                    loadedCount++;
                    if (loadedCount === imgs.length) {
                      setTimeout(startPrint, 300);
                    }
                  });
                }
              }
            }
          });
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintPayslip = () => {
    if (!selectedSlipBarberStats) return;
    const stats = selectedSlipBarberStats;
    printPayslipData({
      barberId: stats.id,
      barberName: stats.name,
      realName: selectedBarberForSlip?.realName || stats.name,
      position: selectedBarberForSlip?.position || "Hairdresser",
      month: selectedMonth,
      baseSalary: Number(slipBaseSalary) || 0,
      overtime: Number(slipOvertime) || 0,
      positionAllowance: Number(slipPositionAllowance) || 0,
      haircutCom: slipHaircutCom === '' ? stats.haircutCom : (Number(slipHaircutCom) || 0),
      chemicalCom: slipChemicalCom === '' ? stats.chemicalCom : (Number(slipChemicalCom) || 0),
      productCom: slipProductCom === '' ? stats.productCom : (Number(slipProductCom) || 0),
      tipTotal: slipTipTotal === '' ? stats.tipTotal : (Number(slipTipTotal) || 0),
      deductions: Number(slipDeductions) || 0,
      soc: Number(slipSocialSecurity) || 0,
      taxRate: slipTaxRate,
      note: slipNote
    });
  };

  const handleSaveCurrentPayslip = () => {
    if (!selectedSlipBarberStats || !onUpdatePayslips) return;
    const stats = selectedSlipBarberStats;
    
    const haircutCom = slipHaircutCom === '' ? stats.haircutCom : (Number(slipHaircutCom) || 0);
    const chemicalCom = slipChemicalCom === '' ? stats.chemicalCom : (Number(slipChemicalCom) || 0);
    const productCom = slipProductCom === '' ? stats.productCom : (Number(slipProductCom) || 0);
    const tipTotal = slipTipTotal === '' ? stats.tipTotal : (Number(slipTipTotal) || 0);
    const baseVal = Number(slipBaseSalary) || 0;
    const otVal = Number(slipOvertime) || 0;
    const decVal = Number(slipDeductions) || 0;
    const socVal = Number(slipSocialSecurity) || 0;
    const posAllowanceVal = Number(slipPositionAllowance) || 0;

    const totalSharesGenerated = haircutCom + chemicalCom + productCom;
    const earnedIncome = Math.max(totalSharesGenerated, baseVal);
    const totalEarnings = earnedIncome + tipTotal + otVal + posAllowanceVal;
    
    const taxValue = (totalEarnings * slipTaxRate) / 100;
    const totalDeductions = decVal + socVal + taxValue;
    const netPayable = totalEarnings - totalDeductions;

    const newSlip: Payslip = {
      id: `slip-${Date.now()}`,
      timestamp: new Date().toISOString(),
      month: selectedMonth,
      barberId: stats.id,
      barberName: stats.name,
      baseSalary: baseVal,
      overtime: otVal,
      positionAllowance: posAllowanceVal,
      deductions: decVal,
      socialSecurity: socVal,
      taxRate: slipTaxRate,
      note: slipNote,
      haircutCommission: haircutCom,
      chemicalCommission: chemicalCom,
      productCommission: productCom,
      tips: tipTotal,
      totalEarnings,
      totalDeductions,
      netPaid: netPayable
    };

    // Filter duplicates and append
    const filteredSlips = payslips.filter(s => !(s.month === selectedMonth && s.barberId === stats.id));
    onUpdatePayslips([newSlip, ...filteredSlips]);

    setSaveSuccessMsg(`บันทึกประวัติสลิปเงินเดือนช่าง ${stats.name} รอบเดือน ${formatThaiMonth(selectedMonth)} สำเร็จยอดสะสมแล้ว!`);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 4500);
  };

  const handleDownloadWordPayslip = () => {
    if (!selectedSlipBarberStats) return;
    const stats = selectedSlipBarberStats;
    const base = Number(slipBaseSalary) || 0;
    const ot = Number(slipOvertime) || 0;
    const posAllowance = Number(slipPositionAllowance) || 0;
    const haircutCom = slipHaircutCom === '' ? stats.haircutCom : (Number(slipHaircutCom) || 0);
    const chemCom = slipChemicalCom === '' ? stats.chemicalCom : (Number(slipChemicalCom) || 0);
    const prodCom = slipProductCom === '' ? stats.productCom : (Number(slipProductCom) || 0);
    const tip = slipTipTotal === '' ? stats.tipTotal : (Number(slipTipTotal) || 0);
    
    const totalSharesGenerated = haircutCom + chemCom + prodCom;
    const earnedIncome = Math.max(totalSharesGenerated, base);
    const topupBonus = totalSharesGenerated > base ? (totalSharesGenerated - base) : 0;
    const guaranteeSupplement = totalSharesGenerated < base ? (base - totalSharesGenerated) : 0;
    
    const totalEarnings = earnedIncome + tip + ot + posAllowance;
    const taxValue = (totalEarnings * slipTaxRate) / 100;
    const deductions = Number(slipDeductions) || 0;
    const soc = Number(slipSocialSecurity) || 0;
    const totalDeductions = deductions + soc + taxValue;
    const netPayable = totalEarnings - totalDeductions;
    const thMonth = formatThaiMonth(selectedMonth);

    const resolvedRealName = selectedBarberForSlip?.realName || stats.name;
    const resolvedPosition = selectedBarberForSlip?.position || "Hairdresser";

    const docContent = `
      <div style="max-width: 650px; margin: 0 auto; padding: 20px; font-family: Sarabun, Helvetica, Arial, sans-serif;">
        <h2 style="text-align: center; color: #0a192f; margin-bottom: 2px;">${shopConfig.shopName}</h2>
        <p style="text-align: center; font-size: 12px; color: #555555; margin-top: 0; margin-bottom: 20px;">สลิปเงินเดือน / PAYSLIP & COMMISSION STATEMENT</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 5px 0; font-size: 13px;"><b>รอบปิดงวดสะสม / Period:</b> ${thMonth}</td>
            <td style="padding: 5px 0; font-size: 13px; text-align: right;"><b>วันที่จัดทำ / Print Date:</b> ${new Date().toLocaleDateString('th-TH')}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 13px;"><b>ชื่อพนักงานผู้รับเงิน / Employee:</b> ${resolvedRealName} (ตำแหน่ง: ${resolvedPosition})</td>
            <td style="padding: 5px 0; font-size: 13px; text-align: right;"><b>สาขาร้านตัดผม / Shop Anchor:</b> ${shopConfig.shopName}</td>
          </tr>
        </table>
        
        <table style="width: 100%; border: 1px solid #111111; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="border: 1px solid #111111; padding: 8px; font-size: 13px; width: 50%; text-align: left;">🔹 รายได้ / EARNINGS</th>
            <th style="border: 1px solid #111111; padding: 8px; font-size: 13px; width: 50%; text-align: left;">🔸 รายหัก / DEDUCTIONS</th>
          </tr>
          <tr>
            <td style="border: 1px solid #111111; padding: 12px; font-size: 12px; vertical-align: top; line-height: 1.7;">
              <b>1. ยอดสะสมผลงานช่างรวมทิป (Actual Shares & Tips)</b><br/>
              &nbsp;&nbsp; - ส่วนแบ่งตัดผม: ${formatBaht(haircutCom)}<br/>
              &nbsp;&nbsp; - ส่วนแบ่งเคมีทำสีดัด: ${formatBaht(chemCom)}<br/>
              &nbsp;&nbsp; - ส่วนแบ่งขายสินค้าเสริม: ${formatBaht(prodCom)}<br/>
              &nbsp;&nbsp; - ทิปร้านเก็บสะสม (Tips): ${formatBaht(tip)}<br/>
              <b>&nbsp;&nbsp; รวมส่วนยอดสะสมจริง: ${formatBaht(totalSharesGenerated)}</b><br/>
              <hr style="border-top:1px dashed #666; margin: 8px 0;"/>
              <b>2. เกณฑ์ประกันรายได้ขั้นต่ำ: ${formatBaht(base)}</b><br/>
              ${guaranteeSupplement > 0 ? `<b>🎯 ได้รับเงินช่วยเหลือประกันเพิ่ม: +${formatBaht(guaranteeSupplement)}</b><br/>` : ''}
              ${topupBonus > 0 ? `<b>🚀 ได้รับคอมมิชชั่นส่วนเหนือประกัน: +${formatBaht(topupBonus)}</b><br/>` : ''}
              ${posAllowance > 0 ? `<b>🎖️ ค่าตำแหน่ง: +${formatBaht(posAllowance)}</b><br/>` : ''}
              - เบี้ยพิเศษและเงินล่วงเวลา (OT): ${formatBaht(ot)}<br/>
              <hr style="border-top:1px dashed #666; margin: 8px 0;"/>
              <b>รวมเงินได้ประเมินสุทธิ: ${formatBaht(totalEarnings)}</b>
            </td>
            <td style="border: 1px solid #111111; padding: 12px; font-size: 12px; vertical-align: top; line-height: 1.7;">
              - ภาษีหัก ณ ที่จ่าย (${slipTaxRate}%): ${formatBaht(taxValue)}<br/>
              - หักเบิกจ่ายล่วงหน้า: ${formatBaht(deductions)}<br/>
              - หักค้ำประกันความเสียหาย: ${formatBaht(soc)}<br/>
              <hr style="border-top:1px dashed #666; margin: 8px 0;"/>
              <b>รวมยอดหักสุทธิ: ${formatBaht(totalDeductions)}</b>
            </td>
          </tr>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 12px; border: 1px solid #111111; font-size: 14px; font-weight: bold; width: 60%;">💰 ยอดรับโอนเงินพนักงานสุทธิ (NET PAYABLE)</td>
            <td style="padding: 12px; border: 1px solid #111111; font-size: 16px; font-weight: bold; text-align: right; color: #1e40af;">${formatBaht(netPayable)}</td>
          </tr>
        </table>

        ${slipNote ? `<p style="font-size: 11px; color: #555555; background: #f8fafc; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">💡 <b>หมายเหตุสลิป</b>: ${slipNote}</p>` : ''}
        
        <div style="margin-top: 50px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; text-align: center;">
          <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; font-weight: bold; color: #555555;">
            ลงชื่อผู้รับพนักงานช่างตัดผม / Receiver
          </div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; font-weight: bold; color: #555555;">
            ลงชื่อฝ่ายอนุมัติทางการเงิน / Manager
          </div>
        </div>
      </div>
    `;

    downloadWordReport(`OFFICIAL_PAYSLIP_${stats.name}_${selectedMonth}`, docContent);
  };

  const handleDeletePayslip = (slipId: string) => {
    if (!onUpdatePayslips) return;
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันลบประวัติสลิปเงินเดือน',
      message: 'คุณต้องการลบประวัติสลิปเงินเดือนใบนี้ออกจากระบบคลาวด์ถาวรเกณฑ์บัญชีหรือไม่? การลบนี้จะไม่สามารถย้อนคืนได้',
      onConfirm: () => {
        if (onUpdatePayslips) {
          onUpdatePayslips(payslips.filter(s => s.id !== slipId));
        }
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in" id="payslips-tab-module">
      
      {/* Overview Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Briefcase className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 font-sans tracking-tight">
              ระบบสลิปส่วนแบ่งและเงินเดือนพนักงาน (Payroll POS System)
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-sans pl-11">
            เครื่องมือบริหารจัดการค่าตอบแทนพนักงานรายบุคคลอย่างเป็นมืออาชีพ ออกสลิปแจกพนักงานในรูปแบบสากล คู่คำนวณเบี้ยประกันรายได้ขั้นต่ำและการหักภาษีค้ําประกันครบวงจร
          </p>
        </div>

        {/* Quick parameters status */}
        <div className="flex items-center gap-4 border-t border-slate-50 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto">
          <div className="bg-slate-50 p-3 rounded-2xl text-center min-w-[120px] border border-slate-100">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">บันทึกสลิปสะสม</span>
            <span className="text-lg font-mono font-black text-slate-800">{payslips.length} ใบ</span>
          </div>
          <div className="bg-indigo-50/50 p-3 rounded-2xl text-center min-w-[120px] border border-indigo-100/30">
            <span className="block text-[9px] uppercase tracking-wider text-indigo-500 font-bold">ช่างตัดผมสังกัด</span>
            <span className="text-lg font-mono font-black text-indigo-700">{barbers.length} ท่าน</span>
          </div>
        </div>
      </div>

      {/* NEW: Custom Date Range Barber Earnings Summary Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
                <CalendarDays className="w-5 h-5" />
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-sans tracking-tight">
                สรุปรายได้รวมช่างตัดผมตามช่วงเวลา (Barber Earnings Summary)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-sans pl-11">
              คำนวณยอดบริการ สัดส่วนคอมมิชชั่น และทิปสะสมของช่างแต่ละคนในแต่ละช่วงเวลาได้อย่างยืดหยุ่น เพื่อความสะดวกในการคำนวณเงินเดือน
            </p>
          </div>

          {/* Mode Selector Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl self-start md:self-auto border border-slate-200/60">
            <button
              type="button"
              onClick={() => setDateFilterMode('month')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'month'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>รอบปฏิทินเดือน</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('custom')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'custom'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>กำหนดช่วงวันที่เอง</span>
            </button>
          </div>
        </div>

        {/* Date Selector Bar */}
        {dateFilterMode === 'month' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">รอบประจำเดือน:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white text-slate-800 text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold cursor-pointer shadow-2xs"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatThaiMonth(m)}</option>
                ))}
              </select>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              ช่วงเวลาคำนวณ: <span className="font-bold text-indigo-600 font-mono">{formatThaiMonth(selectedMonth)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Date pickers */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700">ตั้งแต่วันที่:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white text-slate-800 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-mono font-bold cursor-pointer shadow-2xs"
                  />
                </div>
                <span className="text-slate-400 font-bold hidden sm:inline">-</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700">ถึงวันที่:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white text-slate-800 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-mono font-bold cursor-pointer shadow-2xs"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">ทางเลือกด่วน:</span>
                <button
                  type="button"
                  onClick={handleSetPreset26to25}
                  className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1"
                >
                  <Scissors className="w-3 h-3 text-indigo-500" />
                  <span>ตัดวิก (26 - 25)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetCurrentMonth}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetLastMonth}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                >
                  เดือนที่แล้ว
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetLastDays(15)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                >
                  15 วันล่าสุด
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetLastDays(7)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                >
                  7 วันล่าสุด
                </button>
              </div>
            </div>

            <div className="text-xs text-indigo-900 font-medium flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                กำลังคำนวณผลงานช่างจากช่วงวันที่{' '}
                <strong className="font-mono text-indigo-700">{formatThaiDate(customStartDate)}</strong> ถึง{' '}
                <strong className="font-mono text-indigo-700">{formatThaiDate(customEndDate)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Overall Period KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">จำนวนบริการสะสม</span>
            <span className="text-base font-black font-mono text-slate-800">{periodOverallStats.salesCount} บิล ({periodOverallStats.totalCuts} หัว)</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ยอดขายร้านรวม</span>
            <span className="text-base font-black font-mono text-slate-800">{formatBaht(periodOverallStats.totalGrossRevenue)}</span>
          </div>
          <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/50">
            <span className="block text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">รวมคอมมิชชั่นช่างทุกส่วน</span>
            <span className="text-base font-black font-mono text-indigo-700">{formatBaht(periodOverallStats.totalCommissions)}</span>
          </div>
          <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/50">
            <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">รวมเงินที่ช่างได้รับสุทธิ</span>
            <span className="text-base font-black font-mono text-emerald-700">{formatBaht(periodOverallStats.grandTotalEarned)}</span>
          </div>
        </div>

        {/* Barbers Breakdown Grid / Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              สรุปรายได้แยกตามรายชื่อช่าง ({periodBarberStats.length} ท่าน):
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {periodBarberStats.map((barber) => (
              <div 
                key={barber.id}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between space-y-3 ${
                  slipBarberId === barber.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs font-sans">
                        {barber.name.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-sans">{barber.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">{barber.realName} ({barber.position})</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold font-mono rounded-full">
                      {barber.cutsCount} หัว
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>คอมตัดผม ({shareConfig.haircutBarberPct}%):</span>
                      <span className="font-mono font-bold">{formatBaht(barber.haircutCom)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>คอมทำสี/เคมี ({shareConfig.chemicalBarberPct}%):</span>
                      <span className="font-mono font-bold">{formatBaht(barber.chemicalCom)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>คอมขายสินค้า ({shareConfig.productBarberPct}%):</span>
                      <span className="font-mono font-bold">{formatBaht(barber.productCom)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>ทิปสะสม:</span>
                      <span className="font-mono font-bold">{formatBaht(barber.tipTotal)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
                      <span>รวมรายรับสะสมช่วงนี้:</span>
                      <span className="font-mono text-indigo-600 text-sm">{formatBaht(barber.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyBarberPeriodStatsToSlip(barber.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    slipBarberId === barber.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>ใช้ยอดช่าง{barber.name}ทำสลิปเงินเดือน</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main calculation workspace */}
      <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 border border-slate-900 space-y-6 shadow-xl" id="professional-payslips-generator">
        <div className="space-y-1 border-b border-slate-900 pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black text-white tracking-wide uppercase font-sans">
              1. โปรปรับแต่งและออกสลิปพนักงานรายบุคคล (Official Interactive Payslip Builder)
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            ระบุตัวเลขรายรับที่ต้องการเพิ่มเติม หรือค่าหักเก็บเงินกู้ยืม/ค้ำประกัน ระบบจะใช้ระบบคำนวณอัตโนมัติควบคู่กับสัญญาสัดส่วนค่าแชร์คอมมิชชั่นประจำงวดเดือน
          </p>
        </div>

        {/* Form Selector Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-900">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              {dateFilterMode === 'custom' ? 'โหมดช่วงเวลาที่ใช้คำนวณ / CUSTOM DATE RANGE:' : 'เลือกช่วงเดือนยอดสะสม / SELECT CALENDAR CYCLE:'}
            </label>
            {dateFilterMode === 'custom' ? (
              <div className="flex items-center justify-between bg-slate-950 text-indigo-300 text-xs px-3 py-2.5 border border-indigo-900/80 rounded-xl font-bold">
                <span>📆 {formatThaiDate(customStartDate)} - {formatThaiDate(customEndDate)}</span>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('month')}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  สลับเป็นรอบเดือน
                </button>
              </div>
            ) : (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 border border-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-bold"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>งวดผลงานผลรวม: {formatThaiMonth(m)}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">เลือกช่างฝีมือผู้รับเงิน / SELECT SPECIALIST CLIENT:</label>
            <select
              value={slipBarberId}
              onChange={(e) => setSlipBarberId(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 border border-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-bold"
            >
              {barbers.map(b => (
                <option key={b.id} value={b.id}>ช่าง{b.name} ({b.realName || 'ไม่ระบุชื่อจริง'})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedSlipBarberStats ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-slate-900 pt-4">
            
            {/* Left controller parameters panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-sans">📝 รายละเอียดฐานบัญชีและส่วนปรับแต่ง</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">บิลเลเบล: ช่าง{selectedSlipBarberStats.name}</span>
              </div>

              {/* Overridable Performance Shares & Tips Grid */}
              <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">
                    ยอดส่วนแบ่งผลงานและทิป (แก้ไขพิมพ์ใหม่ได้อิสระ)
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ค่าตัดผมสะสม (Haircut Share):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={slipHaircutCom}
                        onChange={(e) => handleNumberInput(e.target.value, setSlipHaircutCom)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder={selectedSlipBarberStats.haircutCom.toFixed(2)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">สระดัดเคมีสะสม (Chemical Share):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={slipChemicalCom}
                        onChange={(e) => handleNumberInput(e.target.value, setSlipChemicalCom)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder={selectedSlipBarberStats.chemicalCom.toFixed(2)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ส่วนเสริมสินค้า (Products Share):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={slipProductCom}
                        onChange={(e) => handleNumberInput(e.target.value, setSlipProductCom)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder={selectedSlipBarberStats.productCom.toFixed(2)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ยอดทิปสะสม (Tips):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={slipTipTotal}
                        onChange={(e) => handleNumberInput(e.target.value, setSlipTipTotal)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder={selectedSlipBarberStats.tipTotal.toFixed(2)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 1: Basic Money */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">เงินจ้างประกันรายได้ขั้นต้น (Floor Guarantee):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                    <input
                      type="number"
                      value={slipBaseSalary}
                      onChange={(e) => handleNumberInput(e.target.value, setSlipBaseSalary)}
                      className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                      placeholder="เช่น 15000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">ค่าตำแหน่งพนักงาน (Position Salary):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                    <input
                      type="number"
                      value={slipPositionAllowance}
                      onChange={(e) => handleNumberInput(e.target.value, setSlipPositionAllowance)}
                      className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                      placeholder="เช่น 2000"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 2: Extra benefits & Advances */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">เงินพิเศษตกเบิก / ค่าล่วงเวลา (OT):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                    <input
                      type="number"
                      value={slipOvertime}
                      onChange={(e) => handleNumberInput(e.target.value, setSlipOvertime)}
                      className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                      placeholder="เช่น 500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">หักเบิกเงินยืมล่วงหน้า (Salary Advance):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                    <input
                      type="number"
                      value={slipDeductions}
                      onChange={(e) => handleNumberInput(e.target.value, setSlipDeductions)}
                      className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                      placeholder="เช่น 1000"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 3: Care hold & Withholding tax */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">หักประกันภัย / วงเงินค้ำประกันสะสม:</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                    <input
                      type="number"
                      value={slipSocialSecurity}
                      onChange={(e) => handleNumberInput(e.target.value, setSlipSocialSecurity)}
                      className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                      placeholder="เช่น 300"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">หักภาษี ณ ที่จ่าย % (Withholding Tax):</label>
                  <select
                    value={slipTaxRate}
                    onChange={(e) => setSlipTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 text-white text-xs px-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold cursor-pointer h-[34px]"
                  >
                    <option value={0}>ภาษี 0% (ไม่หักภาษี ณ ที่จ่าย)</option>
                    <option value={1}>ภาษี 1% (บุคคลธรรมดารับจ้างทั่วไป)</option>
                    <option value={3}>ภาษี 3% (อัตรามาตรฐานพานิชย์)</option>
                    <option value={5}>ภาษี 5% (อัตราสมบูรณ์ของธุรกิจ)</option>
                  </select>
                </div>
              </div>

              {/* Remarks Note */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">หมายเหตุบนสลิปเงินเดือน (Memo Remarks):</label>
                <textarea
                  value={slipNote}
                  onChange={(e) => setSlipNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all resize-none font-sans"
                  placeholder="เช่น โอนเงินตรงเข้าบัญชีธนาคารกสิกรไทย / คณะกรรมการตรวจสอบแล้ว"
                />
              </div>

              {/* Action operations buttons */}
              <div className="flex flex-col gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={handlePrintPayslip}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>สั่งพิมพ์กระดาษ / บันทึก PDF ใบสลิปความน่าเชื่อถือ</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentPayslip}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <BookmarkCheck className="w-4 h-4 text-emerald-300" />
                  <span>💾 บันทึกสถิติมูลค่านี้ ลงสู่คลาวด์ถาวรระบบ</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadWordPayslip}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-800 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>ดาวน์โหลดใบสำคัญรับเงินเป็นสัญญาสมบูรณ์ Word (.doc)</span>
                </button>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-950/80 text-emerald-300 rounded-xl border border-emerald-800 text-[11px] font-bold select-none animate-pulse text-center leading-relaxed font-sans">
                    {saveSuccessMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Right live statement preview panel */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">👁️ พรีวิวใบพิมพ์จริงระดับวิสาหชีพ (Official Statement Live Preview)</span>
                <span className="text-[9px] bg-slate-900 text-emerald-400 font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">A4 STABLE LAYOUT</span>
              </div>

              {/* Deeply stylized physical paper slip stub container using SAFE Hex styling */}
              <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 shadow-sm font-sans text-xs space-y-4 relative overflow-hidden">
                
                {/* background stamp */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 select-none opacity-[0.03] pointer-events-none text-slate-900 font-extrabold text-[40px] tracking-widest text-center">
                  OFFICIAL BARBERSHOP PAYROLL
                </div>

                {/* Banner Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="flex items-center space-x-3 text-left">
                    {shopConfig.logoUrl && (
                      <img 
                        src={shopConfig.logoUrl} 
                        alt="shop logo" 
                        className="w-10 h-10 rounded-xl object-cover border border-slate-100" 
                        referrerPolicy="no-referrer" 
                      />
                    )}
                    <div>
                      <h5 className="font-extrabold text-slate-950 uppercase text-sm leading-tight">{shopConfig.shopName}</h5>
                      <p className="text-[9px] text-slate-400 font-medium font-sans uppercase tracking-widest">Bilingual Employee Pay Slip</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md">สัญญายืนยันรายรับใบสะสม</span>
                  </div>
                </div>

                {/* Meta details table block */}
                <div className="grid grid-cols-2 gap-4 text-[10.5px] border-b border-dashed border-slate-200 pb-4 text-slate-700">
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase tracking-wider">ชื่อผู้มีสิทธิ์เสียภาษี / Employee Client:</span>
                      <span className="font-bold text-slate-900">
                        {selectedBarberForSlip?.realName || selectedSlipBarberStats.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase tracking-wider">ตำแหน่งหน้าที่เฉพาะ / Employee Position:</span>
                      <span className="font-semibold text-indigo-700 font-mono text-[9.5px]">
                        {selectedBarberForSlip?.position || "Hairdresser"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase tracking-wider">รอบวัฏจักรบัญชี / Cycle Period:</span>
                      <span className="font-bold text-slate-900">{formatThaiMonth(selectedMonth)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase tracking-wider">วันที่กำหนดจ่าย / Issue Date:</span>
                      <span className="font-bold text-slate-900">{new Date().toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </div>

                {/* Earnings vs Deductions table */}
                <div className="grid grid-cols-2 gap-6 pb-2 text-[11px]">
                  {/* Earnings column */}
                  <div className="space-y-2">
                    <h6 className="font-bold text-indigo-700 text-[10px] uppercase border-b border-indigo-100 pb-1.5 flex justify-between">
                      <span>รายการฝั่งรายได้ (EARNINGS)</span>
                      <span>บาท (THB)</span>
                    </h6>
                    
                    <div className="flex justify-between text-slate-500 text-[9.5px] italic">
                      <span>สถิติวอลุ่มยอดสะสมช่างจริง:</span>
                      <span className="font-mono">{formatBaht(previewCalculation?.totalSharesGenerated)}</span>
                    </div>
                    
                    <div className="pl-2 border-l border-slate-200 text-slate-400 text-[9px] space-y-0.5 font-mono">
                      <div className="flex justify-between">
                        <span>• ตัดผม (Haircut Part):</span>
                        <span>{formatBaht(slipHaircutCom === '' ? selectedSlipBarberStats.haircutCom : (Number(slipHaircutCom) || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• สระดัดเคมี (Chemical Part):</span>
                        <span>{formatBaht(slipChemicalCom === '' ? selectedSlipBarberStats.chemicalCom : (Number(slipChemicalCom) || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• ส่วนเสริมสินค้า (Products Part):</span>
                        <span>{formatBaht(slipProductCom === '' ? selectedSlipBarberStats.productCom : (Number(slipProductCom) || 0))}</span>
                      </div>
                      <div className="flex justify-between text-indigo-500">
                        <span>• ยอดสะสมทิป (Tips Total):</span>
                        <span>{formatBaht(slipTipTotal === '' ? selectedSlipBarberStats.tipTotal : (Number(slipTipTotal) || 0))}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-slate-600 font-medium pt-1 border-t border-slate-100">
                      <span>เกณฑ์ขั้นรับคำประกันช่าง:</span>
                      <span className="font-mono">{formatBaht(Number(slipBaseSalary) || 0)}</span>
                    </div>

                    {previewCalculation && previewCalculation.guaranteeSupplement > 0 && (
                      <div className="flex justify-between text-indigo-600 font-bold">
                        <span>🎯 ชดเชยวออเชอร์ค้ำประกัน:</span>
                        <span className="font-mono">+{formatBaht(previewCalculation.guaranteeSupplement)}</span>
                      </div>
                    )}

                    {previewCalculation && previewCalculation.topupBonus > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>🚀 ส่วนขยายเกินขั้นรับประกัน:</span>
                        <span className="font-mono">+{formatBaht(previewCalculation.topupBonus)}</span>
                      </div>
                    )}

                    {slipPositionAllowance > 0 && (
                      <div className="flex justify-between text-purple-700 font-bold">
                        <span>🎖️ ค่าตำแหน่งทางการงาน:</span>
                        <span className="font-mono">+{formatBaht(slipPositionAllowance)}</span>
                      </div>
                    )}

                    {slipOvertime > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>เบี้ยขยันพิเศษ / เงิน OT:</span>
                        <span className="font-mono">+{formatBaht(slipOvertime)}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-800 text-[11px] font-sans">
                      <span>รวมรายได้สะสมพึงประเมิน:</span>
                      <span className="font-mono text-indigo-800">
                        {formatBaht(previewCalculation?.totalEarnings)}
                      </span>
                    </div>
                  </div>

                  {/* Deductions column */}
                  <div className="space-y-2 border-l border-slate-100 pl-4">
                    <h6 className="font-bold text-rose-700 text-[10px] uppercase border-b border-rose-100 pb-1.5 flex justify-between">
                      <span>รายการหักรายงวด (DEDUCTIONS)</span>
                      <span>บาท (THB)</span>
                    </h6>

                    <div className="flex justify-between text-slate-600 font-medium font-sans">
                      <span>หักภาษี ณ ที่จ่ายตามใบรับ ({slipTaxRate}%):</span>
                      <span className="font-mono text-slate-800">
                        -{formatBaht(previewCalculation?.taxValue)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-sans">
                      <span>หักสวัสดิการรวม / รอยเบิกล่วงหน้า:</span>
                      <span className="font-mono text-slate-800">-{formatBaht(slipDeductions)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-sans">
                      <span>หักสะสมเงินประกันของช่าง:</span>
                      <span className="font-mono text-slate-800">-{formatBaht(slipSocialSecurity)}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-800 text-[11px] font-sans mt-auto">
                      <span>รวมยอดหักเงินทั้งหมด:</span>
                      <span className="font-mono text-rose-800">
                        {formatBaht(previewCalculation?.totalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net income bar */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">ยอดรับเงินโอนสุทธิ (NET COMMISSION PAYABLE)</p>
                    <p className="text-[9px] text-slate-400 font-medium">บันทึกยอดเงินค้ำประกันสะสมคงประเมินเรียบร้อยแล้ว</p>
                  </div>
                  <div className="font-mono font-black text-slate-900 text-lg">
                    {formatBaht(previewCalculation?.netPayable)}
                  </div>
                </div>

                {slipNote && (
                  <p className="text-[9.5px] text-slate-400 italic bg-slate-50 px-3 py-2 rounded-lg leading-relaxed border border-slate-100">
                    💡 <b>รายละเอียดเพิ่มเติม / System note</b>: {slipNote}
                  </p>
                )}

                {/* Statement signature guide */}
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[8.5px] text-slate-400 tracking-wider uppercase font-mono">
                  <span>SYSTEM GUIDED PAYROLL • SECURITY STATUS ONLINE</span>
                  <span>CONFIDENTIAL OFFICE STATEMENT</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400">กรุณาลงทะเบียนพนักงานช่างตัดผมในระบบเพื่อให้สามารถจัดพิมพ์ใบแจ้งเงินส่วนแบ่ง</p>
          </div>
        )}
      </div>

      {/* Historical archival list section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-6 shadow-xs" id="historical-payslips-archive">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
              <History className="w-4 h-4 text-slate-600" />
              <span>แฟ้มเก็บบันทึกประวัติใบสลิปเงินเดือนช่างสะสม (Payroll Archive Records)</span>
            </h3>
            <p className="text-xs text-slate-500">
              แฟ้มเก็บรวบรวมประวัติใบสลิปของพนักงานช่างที่เคยสั่งบันทึกไว้ในสถิติข้อมูลของทางร้าน สะดวกในการเรียกตรวจสอบหรือการสั่งพิมพ์ออกใบฉบับจริงในภายหลัง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter 1 */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">งวดเดือน:</span>
              <select
                value={historySelectedMonth}
                onChange={(e) => setHistorySelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 min-w-[120px] cursor-pointer"
              >
                <option value="all">แสดงรายงานทุกงวด</option>
                {archivedMonths.map(m => (
                  <option key={m} value={m}>{formatThaiMonth(m)}</option>
                ))}
              </select>
            </div>

            {/* Filter 2 */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">กรองตามช่าง:</span>
              <select
                value={historySelectedBarberId}
                onChange={(e) => setHistorySelectedBarberId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 min-w-[120px] cursor-pointer"
              >
                <option value="all">ช่างทุกคน</option>
                {archivedBarbers.map(b => (
                  <option key={b.id} value={b.id}>ช่าง{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(() => {
          const filtered = payslips.filter(s => {
            const matchMonth = historySelectedMonth === 'all' || s.month === historySelectedMonth;
            const matchBarber = historySelectedBarberId === 'all' || s.barberId === historySelectedBarberId;
            return matchMonth && matchBarber;
          });

          if (filtered.length === 0) {
            return (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
                <p className="text-slate-400 text-sm">📭 ยังไม่มีประวัติการออกสลิปเงินเดือนจัดเก็บในช่วงเวลานี้</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  เมื่อฝ่ายบัญชีทำการกดบันทึก <b>"💾 บันทึกสถิติมูลค่านี้ ลงสู่คลาวด์ถาวรระบบ"</b> ด้านบน ข้อมูลยอดสะสมจะถูกเก็บลงตารางแฟ้มถาวรนี้ทันที
                </p>
              </div>
            );
          }

          return (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-bold font-sans tracking-wide border-b border-slate-100">
                    <th className="p-4 pl-6">งวดเดือนบัญชี</th>
                    <th className="p-4">ช่างตัดผม</th>
                    <th className="p-4 text-right">รายได้พึงจ่ายสะสมก่อนหัก</th>
                    <th className="p-4 text-right">ยอดหักจ่ายหน้าบัญชี</th>
                    <th className="p-4 text-right text-indigo-700">ยอดเงินจ่ายสุทธิ / NET PAY</th>
                    <th className="p-4 text-center pr-6">เครื่องมือกระทำ</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 font-mono text-slate-700 font-semibold">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-600 font-sans">
                        {formatThaiMonth(s.month)}
                      </td>
                      <td className="p-4 font-bold text-slate-800 font-sans">
                        ช่าง{s.barberName}
                      </td>
                      <td className="p-4 text-right">
                        {formatBaht(s.totalEarnings)}
                      </td>
                      <td className="p-4 text-right text-rose-500">
                        -{formatBaht(s.totalDeductions)}
                      </td>
                      <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50/30">
                        {formatBaht(s.netPaid)}
                      </td>
                      <td className="p-4 text-center pr-6 flex items-center justify-center space-x-2 font-sans font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            printPayslipData({
                              barberId: s.barberId,
                              barberName: s.barberName,
                              realName: barbers.find(b => b.id === s.barberId)?.realName || s.barberName,
                              position: barbers.find(b => b.id === s.barberId)?.position || 'Hairdresser',
                              month: s.month,
                              baseSalary: s.baseSalary,
                              overtime: s.overtime,
                              positionAllowance: s.positionAllowance,
                              haircutCom: s.haircutCommission,
                              chemicalCom: s.chemicalCommission,
                              productCom: s.productCommission,
                              tipTotal: s.tips,
                              deductions: s.deductions,
                              soc: s.socialSecurity,
                              taxRate: s.taxRate,
                              note: s.note
                            });
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>เปิดพิมพ์ฉบับจริง</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditSlip(s)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleDeletePayslip(s.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                          title="ลบเพื่อแก้ไขประวัติโยกย้าย"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Edit Payslip Modal */}
      {editSlip && editSlipCalculation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col text-left">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-500" />
                  <span>แก้ไขข้อมูลสลิปเงินเดือนพนักงาน</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  ช่าง{editSlip.barberName} • รอบบัญชีเดือน {formatThaiMonth(editSlip.month)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditSlip(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800"
              >
                ✕ ปิด
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Earnings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    <span>ฝั่งรายได้สะสม (Earnings)</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ฐานค้ำประกันเงินเดือนขั้นต่ำ (Base Salary):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipBaseSalary}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipBaseSalary)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ส่วนแบ่งตัดผม (Haircut Commission):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipHaircutCom}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipHaircutCom)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ส่วนแบ่งเคมี/สี/ดัด (Chemical Commission):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipChemicalCom}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipChemicalCom)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ส่วนแบ่งขายสินค้า (Product Commission):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipProductCom}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipProductCom)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">เบี้ยขยันพิเศษ / OT (Overtime):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipOvertime}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipOvertime)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ค่าตำแหน่งความรับผิดชอบ (Position Allowance):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipPositionAllowance}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipPositionAllowance)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ยอดสะสมทิป (Tips Total):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipTipTotal}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipTipTotal)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                </div>

                {/* Right Column: Deductions & live summary */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    <span>ฝั่งรายการหักจ่าย (Deductions)</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">หักเบิกเงินจ่ายล่วงหน้า (Deductions):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipDeductions}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipDeductions)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">หักค้ำประกันความเสียหายสะสม (Social Security):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        value={editSlipSocialSecurity}
                        onChange={(e) => handleNumberInput(e.target.value, setEditSlipSocialSecurity)}
                        className="w-full bg-slate-950 text-white text-xs pl-7 pr-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">ภาษีหัก ณ ที่จ่าย (Withholding Tax Rate):</label>
                    <select
                      value={editSlipTaxRate}
                      onChange={(e) => setEditSlipTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 text-white text-xs px-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none cursor-pointer font-bold font-sans"
                    >
                      <option value={0}>ภาษี 0% (ไม่คำนวณหักภาษี)</option>
                      <option value={3}>ภาษี 3% (อัตรามาตรฐานพานิชย์)</option>
                      <option value={5}>ภาษี 5% (อัตราสมบูรณ์ของธุรกิจ)</option>
                    </select>
                  </div>

                  {/* Sleek billing receipt mock for live edit calculation */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 font-sans">
                    <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-900 pb-1">
                      สรุปพรีวิวยอดคำนวณเงินสุทธิหลังบันทึก
                    </span>
                    
                    <div className="space-y-1 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">รวมสถิติผลงานจริง:</span>
                        <span>{formatBaht(editSlipCalculation.totalSharesGenerated)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-400">
                        <span className="text-slate-500">ฐานประกันขั้นต่ำ:</span>
                        <span>{formatBaht(Number(editSlipBaseSalary) || 0)}</span>
                      </div>
                      {editSlipCalculation.guaranteeSupplement > 0 && (
                        <div className="flex justify-between text-indigo-400 font-bold">
                          <span>ชดเชยค้ำประกัน:</span>
                          <span>+{formatBaht(editSlipCalculation.guaranteeSupplement)}</span>
                        </div>
                      )}
                      {editSlipCalculation.topupBonus > 0 && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>ส่วนเกินค้ำประกัน:</span>
                          <span>+{formatBaht(editSlipCalculation.topupBonus)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t border-slate-900 pt-1.5 text-xs text-white">
                        <span>รวมรายได้พึงประเมิน:</span>
                        <span>{formatBaht(editSlipCalculation.totalEarnings)}</span>
                      </div>
                      <div className="flex justify-between text-rose-400 border-b border-dashed border-slate-900 pb-1.5">
                        <span className="text-slate-500">รวมยอดหักทั้งสิ้น:</span>
                        <span>-{formatBaht(editSlipCalculation.totalDeductions)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400 font-black pt-1">
                        <span className="text-xs">ยอดโอนจ่ายสุทธิ:</span>
                        <span className="text-sm font-bold">{formatBaht(editSlipCalculation.netPayable)}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Memo Note */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">หมายเหตุบนสลิปเงินเดือน (Memo Remarks):</label>
                <textarea
                  value={editSlipNote}
                  onChange={(e) => setEditSlipNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none transition-all resize-none font-sans"
                  placeholder="รายละเอียดหมายเหตุอ้างอิง..."
                />
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditSlip(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEditedPayslip}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4 text-emerald-300" />
                <span>💾 บันทึกการแก้ไขข้อมูล</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal Box */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5">
              <div className="flex items-start space-x-3 text-left">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {confirmDialog.title}
                  </h4>
                  <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold border border-slate-200 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
