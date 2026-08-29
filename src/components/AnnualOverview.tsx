import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import { SaleRecord, Expense, ShareConfig, ShopConfig, Barber, Payslip } from '../types';
import { 
  formatBaht, 
  formatBahtWithDecimals, 
  formatThaiDate, 
  formatThaiMonth, 
  downloadExcelReport,
  getSalePaymentBreakdown 
} from '../utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  DollarSign, 
  Coins, 
  ArrowDownCircle, 
  Users, 
  Scissors, 
  Sparkles, 
  ShoppingBag, 
  Download, 
  Printer, 
  ChevronRight, 
  Award, 
  Calculator, 
  Check, 
  Layers, 
  SlidersHorizontal,
  CalendarDays,
  Clock,
  ArrowUpRight,
  Percent,
  FileText
} from 'lucide-react';
import ProfessionalAnnualPdfReport from './ProfessionalAnnualPdfReport';

export interface MonthlyFinancialSummary {
  monthKey: string; // "YYYY-MM"
  year: number;
  monthNum: number; // 1-12
  monthNameTh: string; // e.g. "มกราคม"
  shortMonthTh: string; // e.g. "ม.ค."
  label: string; // e.g. "ม.ค. 69"
  totalCustomerPaid: number;
  haircutRevenue: number;
  chemicalRevenue: number;
  productRevenue: number;
  discountTotal: number;
  tipTotal: number;
  barberHaircutShare: number;
  barberChemicalShare: number;
  barberProductShare: number;
  barberTotalPayout: number;
  shopRevenue: number;
  expenses: number;
  netProfit: number;
  billsCount: number;
  haircutCount: number;
  cashAmount: number;
  transferAmount: number;
  isCurrentMonth: boolean;
  isPeakRevenueMonth: boolean;
  isPeakProfitMonth: boolean;
  profitMarginPct: number;
}

interface AnnualOverviewProps {
  sales: SaleRecord[];
  expenses?: Expense[];
  shareConfig: ShareConfig;
  shopConfig: ShopConfig;
  barbers?: Barber[];
  payslips?: Payslip[];
  onSelectMonth?: (month: string) => void;
  firstLoginDate?: string;
  className?: string;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const AnnualOverview: React.FC<AnnualOverviewProps> = ({
  sales,
  expenses = [],
  shareConfig,
  shopConfig,
  barbers = [],
  payslips = [],
  onSelectMonth,
  firstLoginDate,
  className = ''
}) => {
  // Current local year string (YYYY)
  const currentYear = useMemo(() => {
    const now = new Date();
    return now.getFullYear();
  }, []);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0].substring(0, 7);
  }, []);

  // Compute available years from all data sources
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);

    if (firstLoginDate) {
      const flYear = parseInt(firstLoginDate.split('-')[0], 10);
      if (!isNaN(flYear)) yearsSet.add(flYear);
    }

    sales.forEach(s => {
      const d = s.timestamp || s.date;
      if (d) {
        const y = parseInt(d.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    expenses.forEach(e => {
      const d = e.timestamp || e.date;
      if (d) {
        const y = parseInt(d.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales, expenses, firstLoginDate, currentYear]);

  // Selected Year State (default to current year)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Year View Mode: 'calendar' (Jan-Dec) | 'fiscal' (Oct-Sep) | 'rolling' (Last 12 Months)
  const [yearMode, setYearMode] = useState<'calendar' | 'fiscal' | 'rolling'>('calendar');

  // Chart Mode: 'grouped' vs 'stacked'
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');

  // Series visibility toggles
  const [seriesConfig, setSeriesConfig] = useState({
    showTotalIncome: true,
    showShopRevenue: true,
    showExpenses: true,
    showNetProfit: true,
    showBarberPayout: false,
    showAverageLine: true
  });

  // Table filter: all months or only active months with sales/expenses
  const [showOnlyActiveMonths, setShowOnlyActiveMonths] = useState<boolean>(false);

  // 12-Month list definition based on selected year & mode
  const targetMonthsList = useMemo(() => {
    const list: { year: number; monthNum: number; monthKey: string }[] = [];

    if (yearMode === 'calendar') {
      // 12 months: Jan (1) -> Dec (12) of selectedYear
      for (let m = 1; m <= 12; m++) {
        const mStr = m.toString().padStart(2, '0');
        list.push({
          year: selectedYear,
          monthNum: m,
          monthKey: `${selectedYear}-${mStr}`
        });
      }
    } else if (yearMode === 'fiscal') {
      // Thai Fiscal Year: Oct (selectedYear-1) -> Sep (selectedYear)
      for (let m = 10; m <= 12; m++) {
        const prevYear = selectedYear - 1;
        const mStr = m.toString().padStart(2, '0');
        list.push({
          year: prevYear,
          monthNum: m,
          monthKey: `${prevYear}-${mStr}`
        });
      }
      for (let m = 1; m <= 9; m++) {
        const mStr = m.toString().padStart(2, '0');
        list.push({
          year: selectedYear,
          monthNum: m,
          monthKey: `${selectedYear}-${mStr}`
        });
      }
    } else {
      // Rolling 12 months ending at current month
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const mStr = m.toString().padStart(2, '0');
        list.push({
          year: y,
          monthNum: m,
          monthKey: `${y}-${mStr}`
        });
      }
    }

    return list;
  }, [selectedYear, yearMode]);

  // Aggregate monthly financial statistics for each of the 12 target months
  const monthlyData = useMemo<MonthlyFinancialSummary[]>(() => {
    // 1. Pre-group sales by monthKey
    const salesByMonth = new Map<string, SaleRecord[]>();
    sales.forEach(s => {
      const rawDate = s.timestamp || s.date;
      if (!rawDate) return;
      const mKey = rawDate.substring(0, 7);
      if (!salesByMonth.has(mKey)) {
        salesByMonth.set(mKey, []);
      }
      salesByMonth.get(mKey)!.push(s);
    });

    // 2. Pre-group expenses by monthKey
    const expensesByMonth = new Map<string, Expense[]>();
    expenses.forEach(e => {
      const rawDate = e.timestamp || e.date;
      if (!rawDate) return;
      const mKey = rawDate.substring(0, 7);
      if (!expensesByMonth.has(mKey)) {
        expensesByMonth.set(mKey, []);
      }
      expensesByMonth.get(mKey)!.push(e);
    });

    // 3. Build summary for each target month
    const summaries: MonthlyFinancialSummary[] = targetMonthsList.map(item => {
      const mSales = salesByMonth.get(item.monthKey) || [];
      const mExpenses = expensesByMonth.get(item.monthKey) || [];

      let totalCustomerPaid = 0;
      let haircutRevenue = 0;
      let chemicalRevenue = 0;
      let productRevenue = 0;
      let discountTotal = 0;
      let tipTotal = 0;
      let barberHaircutShare = 0;
      let barberChemicalShare = 0;
      let barberProductShare = 0;
      let barberTotalPayout = 0;
      let shopRevenue = 0;
      let haircutCount = 0;
      let cashAmount = 0;
      let transferAmount = 0;

      mSales.forEach(s => {
        const paid = s.customerPaid ?? 0;
        totalCustomerPaid += paid;
        haircutRevenue += s.haircutPrice ?? 0;
        chemicalRevenue += s.chemicalPrice ?? 0;
        productRevenue += s.productPrice ?? 0;
        discountTotal += s.discountAmount ?? 0;
        tipTotal += s.tip ?? 0;

        if (s.haircutPrice && s.haircutPrice > 0) {
          haircutCount++;
        }

        // Barber shares
        barberHaircutShare += s.barberHaircutShare ?? 0;
        barberChemicalShare += s.barberChemicalShare ?? 0;
        barberProductShare += s.barberProductShare ?? 0;
        barberTotalPayout += s.barberTotalShare ?? 0;

        // Shop share
        shopRevenue += s.shopTotalShare ?? 0;

        // Payment method breakdown
        const breakdown = getSalePaymentBreakdown(s);
        cashAmount += breakdown.cashAmount;
        transferAmount += breakdown.transferAmount;
      });

      const totalExpenses = mExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = shopRevenue - totalExpenses;
      const profitMarginPct = shopRevenue > 0 ? (netProfit / shopRevenue) * 100 : 0;

      const thShort = THAI_MONTH_SHORT[item.monthNum - 1] || `${item.monthNum}`;
      const thName = THAI_MONTH_NAMES[item.monthNum - 1] || `${item.monthNum}`;
      const yearShort = (item.year + 543).toString().substring(2);

      return {
        monthKey: item.monthKey,
        year: item.year,
        monthNum: item.monthNum,
        monthNameTh: thName,
        shortMonthTh: thShort,
        label: `${thShort} ${yearShort}`,
        totalCustomerPaid,
        haircutRevenue,
        chemicalRevenue,
        productRevenue,
        discountTotal,
        tipTotal,
        barberHaircutShare,
        barberChemicalShare,
        barberProductShare,
        barberTotalPayout,
        shopRevenue,
        expenses: totalExpenses,
        netProfit,
        billsCount: mSales.length,
        haircutCount,
        cashAmount,
        transferAmount,
        isCurrentMonth: item.monthKey === currentMonthKey,
        isPeakRevenueMonth: false,
        isPeakProfitMonth: false,
        profitMarginPct
      };
    });

    // Mark peak revenue and peak profit months
    let maxRev = -1;
    let maxProfit = -Infinity;
    summaries.forEach(s => {
      if (s.totalCustomerPaid > maxRev && s.totalCustomerPaid > 0) {
        maxRev = s.totalCustomerPaid;
      }
      if (s.netProfit > maxProfit && s.shopRevenue > 0) {
        maxProfit = s.netProfit;
      }
    });

    if (maxRev > 0) {
      summaries.forEach(s => {
        if (s.totalCustomerPaid === maxRev) s.isPeakRevenueMonth = true;
      });
    }

    if (maxProfit > 0) {
      summaries.forEach(s => {
        if (s.netProfit === maxProfit) s.isPeakProfitMonth = true;
      });
    }

    return summaries;
  }, [sales, expenses, targetMonthsList, currentMonthKey]);

  // Annual Totals & KPIs across all 12 months
  const annualTotals = useMemo(() => {
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.totalCustomerPaid, 0);
    const totalShopRevenue = monthlyData.reduce((sum, m) => sum + m.shopRevenue, 0);
    const totalBarberPayout = monthlyData.reduce((sum, m) => sum + m.barberTotalPayout, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
    const totalNetProfit = totalShopRevenue - totalExpenses;
    const totalBills = monthlyData.reduce((sum, m) => sum + m.billsCount, 0);
    const totalHaircuts = monthlyData.reduce((sum, m) => sum + m.haircutCount, 0);
    const totalTips = monthlyData.reduce((sum, m) => sum + m.tipTotal, 0);
    const totalHaircutRev = monthlyData.reduce((sum, m) => sum + m.haircutRevenue, 0);
    const totalChemicalRev = monthlyData.reduce((sum, m) => sum + m.chemicalRevenue, 0);
    const totalProductRev = monthlyData.reduce((sum, m) => sum + m.productRevenue, 0);
    const totalCash = monthlyData.reduce((sum, m) => sum + m.cashAmount, 0);
    const totalTransfer = monthlyData.reduce((sum, m) => sum + m.transferAmount, 0);

    const activeMonthsCount = monthlyData.filter(m => m.billsCount > 0 || m.expenses > 0).length || 1;
    const avgMonthlyIncome = totalIncome / activeMonthsCount;
    const avgMonthlyShopRevenue = totalShopRevenue / activeMonthsCount;
    const avgMonthlyExpenses = totalExpenses / activeMonthsCount;
    const avgMonthlyNetProfit = totalNetProfit / activeMonthsCount;
    const avgBillValue = totalBills > 0 ? totalIncome / totalBills : 0;
    const overallProfitMargin = totalShopRevenue > 0 ? (totalNetProfit / totalShopRevenue) * 100 : 0;

    // Peak and Lowest performing months
    const activeMonths = monthlyData.filter(m => m.totalCustomerPaid > 0);
    const peakMonth = activeMonths.length > 0 
      ? activeMonths.reduce((prev, curr) => curr.totalCustomerPaid > prev.totalCustomerPaid ? curr : prev, activeMonths[0]) 
      : null;
    const lowestMonth = activeMonths.length > 0
      ? activeMonths.reduce((prev, curr) => curr.totalCustomerPaid < prev.totalCustomerPaid ? curr : prev, activeMonths[0])
      : null;

    return {
      totalIncome,
      totalShopRevenue,
      totalBarberPayout,
      totalExpenses,
      totalNetProfit,
      totalBills,
      totalHaircuts,
      totalTips,
      totalHaircutRev,
      totalChemicalRev,
      totalProductRev,
      totalCash,
      totalTransfer,
      activeMonthsCount,
      avgMonthlyIncome,
      avgMonthlyShopRevenue,
      avgMonthlyExpenses,
      avgMonthlyNetProfit,
      avgBillValue,
      overallProfitMargin,
      peakMonth,
      lowestMonth
    };
  }, [monthlyData]);

  // Quarterly breakdown calculation (Q1, Q2, Q3, Q4)
  const quarterlyData = useMemo(() => {
    const quarters = [
      { qName: 'ไตรมาส 1 (Q1)', monthsLabel: 'ม.ค. - มี.ค.', months: monthlyData.slice(0, 3) },
      { qName: 'ไตรมาส 2 (Q2)', monthsLabel: 'เม.ย. - มิ.ย.', months: monthlyData.slice(3, 6) },
      { qName: 'ไตรมาส 3 (Q3)', monthsLabel: 'ก.ค. - ก.ย.', months: monthlyData.slice(6, 9) },
      { qName: 'ไตรมาส 4 (Q4)', monthsLabel: 'ต.ค. - ธ.ค.', months: monthlyData.slice(9, 12) }
    ];

    return quarters.map(q => {
      const income = q.months.reduce((sum, m) => sum + m.totalCustomerPaid, 0);
      const shopRev = q.months.reduce((sum, m) => sum + m.shopRevenue, 0);
      const expenses = q.months.reduce((sum, m) => sum + m.expenses, 0);
      const profit = shopRev - expenses;
      const bills = q.months.reduce((sum, m) => sum + m.billsCount, 0);
      const sharePct = annualTotals.totalIncome > 0 ? (income / annualTotals.totalIncome) * 100 : 0;

      return {
        ...q,
        income,
        shopRev,
        expenses,
        profit,
        bills,
        sharePct
      };
    });
  }, [monthlyData, annualTotals.totalIncome]);

  // Filtered list for table
  const tableMonths = useMemo(() => {
    if (showOnlyActiveMonths) {
      return monthlyData.filter(m => m.billsCount > 0 || m.expenses > 0);
    }
    return monthlyData;
  }, [monthlyData, showOnlyActiveMonths]);

  // Handler to export annual report to Excel
  const handleExportAnnualExcel = () => {
    const yearLabelTh = `${selectedYear + 543}`;
    const cleanShop = (shopConfig.shopName || 'BarberShop').replace(/[/\\?%*:|"<>]/g, '-');
    const title = `รายงานสรุปผลประกอบการรายปี_${cleanShop}_ปี_${yearLabelTh}`;

    const headers = [
      'รอบเดือน',
      'จำนวนบิลรวม',
      'ลูกค้าตัดผม (หัว)',
      'ยอดขายรวม (Gross THB)',
      'ค่าตัดผม (THB)',
      'ค่าเคมี (THB)',
      'ขายสินค้า (THB)',
      'ส่วนลดรวม (THB)',
      'ทิปรวม (THB)',
      'ส่วนแบ่งจ่ายช่าง (THB)',
      'รายได้ส่วนร้าน (Shop THB)',
      'รายจ่ายร้านค้า (Expense THB)',
      'กำไรสุทธิร้าน (Net Profit THB)',
      'อัตรากำไร (%)',
      'ยอดเงินสด (THB)',
      'ยอดเงินโอน (THB)'
    ];

    const rows: string[][] = monthlyData.map(m => [
      `${m.monthNameTh} ${m.year + 543}`,
      m.billsCount.toString(),
      m.haircutCount.toString(),
      m.totalCustomerPaid.toString(),
      m.haircutRevenue.toString(),
      m.chemicalRevenue.toString(),
      m.productRevenue.toString(),
      m.discountTotal.toString(),
      m.tipTotal.toString(),
      m.barberTotalPayout.toString(),
      m.shopRevenue.toString(),
      m.expenses.toString(),
      m.netProfit.toString(),
      `${m.profitMarginPct.toFixed(1)}%`,
      m.cashAmount.toString(),
      m.transferAmount.toString()
    ]);

    // Add Annual Totals Row
    rows.push([]);
    rows.push([
      `สรุปยอดรวมประจำปี พ.ศ. ${yearLabelTh}`,
      annualTotals.totalBills.toString(),
      annualTotals.totalHaircuts.toString(),
      annualTotals.totalIncome.toString(),
      annualTotals.totalHaircutRev.toString(),
      annualTotals.totalChemicalRev.toString(),
      annualTotals.totalProductRev.toString(),
      monthlyData.reduce((sum, m) => sum + m.discountTotal, 0).toString(),
      annualTotals.totalTips.toString(),
      annualTotals.totalBarberPayout.toString(),
      annualTotals.totalShopRevenue.toString(),
      annualTotals.totalExpenses.toString(),
      annualTotals.totalNetProfit.toString(),
      `${annualTotals.overallProfitMargin.toFixed(1)}%`,
      annualTotals.totalCash.toString(),
      annualTotals.totalTransfer.toString()
    ]);

    downloadExcelReport(title, rows, headers);
  };

  // Custom Chart Tooltip
  const CustomAnnualTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyFinancialSummary = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 text-xs font-sans space-y-3 min-w-[260px] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <span className="font-bold text-sm text-slate-100">{data.monthNameTh} {data.year + 543}</span>
            </div>
            {data.isCurrentMonth && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">
                เดือนปัจจุบัน
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-sans text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>ยอดขายรวมทั้งหมด:</span>
              </span>
              <span className="font-mono font-extrabold text-white text-xs">{formatBaht(data.totalCustomerPaid)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 pl-4 text-[10px]">
              <span>• ค่าตัดผม / เคมี / สินค้า:</span>
              <span className="font-mono">{formatBaht(data.haircutRevenue)} / {formatBaht(data.chemicalRevenue)} / {formatBaht(data.productRevenue)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>รายได้ส่วนร้าน:</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">{formatBaht(data.shopRevenue)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>ส่วนแบ่งช่าง & ทิป:</span>
              </span>
              <span className="font-mono font-bold text-purple-300">{formatBaht(data.barberTotalPayout)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>รายจ่ายหน้าร้าน:</span>
              </span>
              <span className="font-mono font-bold text-rose-400">{formatBaht(data.expenses)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 pl-4 text-[10px]">
              <span>• ชำระสด / สแกนโอน:</span>
              <span className="font-mono">{formatBaht(data.cashAmount)} / {formatBaht(data.transferAmount)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
            <span className="font-bold text-slate-200">กำไรสุทธิของร้าน:</span>
            <div className="text-right">
              <span className={`font-mono font-black text-sm ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatBaht(data.netProfit)}
              </span>
              <span className="block text-[9px] text-slate-400 font-mono">
                กำไรสุทธิ {data.profitMarginPct.toFixed(1)}% ({data.billsCount} บิล)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-8 ${className}`} id="annual-overview-component">
      
      {/* 1. Header & Fiscal Year Selector */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-5 border-b border-slate-100">
          
          {/* Title and description */}
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-sm">
                <TrendingUp className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    ภาพรวมรายได้ประจำปี (12-Month Annual Overview)
                  </h2>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold border border-amber-200">
                    ปี พ.ศ. {selectedYear + 543}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  วิเคราะห์แนวโน้มรายได้ รายจ่าย และกำไรสุทธิย้อนหลัง 12 เดือนเต็ม สำหรับการวางแผนการเงินและตรวจสอบบัญชี
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Year Selector, Mode, Export */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            
            {/* Year Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl shadow-2xs">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600">เลือกปี:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-mono font-extrabold text-xs text-slate-900 outline-none cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543} ({y}) {y === currentYear ? '★ ปีปัจจุบัน' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setYearMode('calendar')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  yearMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ปีปฏิทิน ม.ค. - ธ.ค."
              >
                ปฏิทิน (ม.ค.-ธ.ค.)
              </button>
              <button
                type="button"
                onClick={() => setYearMode('fiscal')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  yearMode === 'fiscal'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ปีงบประมาณ ต.ค. - ก.ย."
              >
                ปีงบฯ (ต.ค.-ก.ย.)
              </button>
              <button
                type="button"
                onClick={() => setYearMode('rolling')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  yearMode === 'rolling'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="12 เดือนย้อนหลังล่าสุด"
              >
                12 เดือนล่าสุด
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportAnnualExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="ดาวน์โหลดรายงานสรุป 12 เดือนเป็นไฟล์ Excel (.csv)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Professional Accountant PDF Report */}
            <ProfessionalAnnualPdfReport
              sales={sales}
              expenses={expenses}
              barbers={barbers}
              shopConfig={shopConfig}
              shareConfig={shareConfig}
              payslips={payslips}
              targetYear={selectedYear}
            />
          </div>
        </div>

        {/* 2. Executive Annual KPI Summary Cards (5 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Card 1: Annual Gross Income */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4.5 rounded-2xl border border-slate-700/80 space-y-2 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">ยอดขายรวมทั้งปี (Gross)</span>
              <span className="p-1.5 bg-indigo-500/30 text-indigo-300 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
              {formatBaht(annualTotals.totalIncome)}
            </div>
            <div className="text-[11px] text-slate-400 font-sans flex items-center justify-between pt-2 border-t border-slate-700/60">
              <span>{annualTotals.totalBills} บิล ({annualTotals.totalHaircuts} หัว)</span>
              <span className="text-indigo-300 font-bold">เฉลี่ย {formatBaht(annualTotals.avgMonthlyIncome)}/ด.</span>
            </div>
          </div>

          {/* Card 2: Shop Net Revenue */}
          <div className="bg-indigo-50/80 p-4.5 rounded-2xl border border-indigo-200/90 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">🏪 รายได้สุทธิส่วนร้าน</span>
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Coins className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-indigo-950">
              {formatBaht(annualTotals.totalShopRevenue)}
            </div>
            <div className="text-[11px] text-indigo-700 font-sans flex items-center justify-between pt-2 border-t border-indigo-200/60">
              <span>สด {formatBaht(annualTotals.totalCash)}</span>
              <span>โอน {formatBaht(annualTotals.totalTransfer)}</span>
            </div>
          </div>

          {/* Card 3: Barber Commission & Tips */}
          <div className="bg-purple-50/80 p-4.5 rounded-2xl border border-purple-200/90 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wide">✂️ ส่วนแบ่งช่างทั้งปี</span>
              <span className="p-1.5 bg-purple-100 text-purple-700 rounded-xl">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-purple-950">
              {formatBaht(annualTotals.totalBarberPayout)}
            </div>
            <div className="text-[11px] text-purple-700 font-sans flex items-center justify-between pt-2 border-t border-purple-200/60">
              <span>ทิปรวมสะสม</span>
              <span className="font-bold font-mono text-purple-900">{formatBaht(annualTotals.totalTips)}</span>
            </div>
          </div>

          {/* Card 4: Store Operational Expenses */}
          <div className="bg-rose-50/80 p-4.5 rounded-2xl border border-rose-200/90 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wide">💸 รายจ่ายร้านตลอดปี</span>
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
                <ArrowDownCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-950">
              {formatBaht(annualTotals.totalExpenses)}
            </div>
            <div className="text-[11px] text-rose-700 font-sans flex items-center justify-between pt-2 border-t border-rose-200/60">
              <span>เฉลี่ยต่อเดือน</span>
              <span className="font-bold font-mono text-rose-900">{formatBaht(annualTotals.avgMonthlyExpenses)}</span>
            </div>
          </div>

          {/* Card 5: Annual Net Profit */}
          <div className="bg-emerald-50/90 p-4.5 rounded-2xl border border-emerald-200/90 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">📈 กำไรสุทธิทั้งปี</span>
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              annualTotals.totalNetProfit >= 0 ? 'text-emerald-950' : 'text-rose-950'
            }`}>
              {formatBaht(annualTotals.totalNetProfit)}
            </div>
            <div className="text-[11px] text-emerald-800 font-sans flex items-center justify-between pt-2 border-t border-emerald-200/60">
              <span>อัตรากำไรสุทธิ</span>
              <span className="font-bold font-mono text-emerald-900">{annualTotals.overallProfitMargin.toFixed(1)}%</span>
            </div>
          </div>

        </div>

        {/* 3. Recharts 12-Month Revenue & Expenses Bar Chart Section */}
        <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-5">
          
          {/* Chart Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>กราฟแสดงแนวโน้มรายได้และรายจ่าย 12 เดือน (12-Month Financial Chart)</span>
              </h3>
              <p className="text-xs text-slate-500">
                เปรียบเทียบยอดขายรวม (Gross), รายได้ส่วนร้าน (Shop Share), รายจ่ายร้านค้า (Expenses) และกำไรสุทธิรายเดือน
              </p>
            </div>

            {/* Series Visibility Toggles & Stack Mode */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Stacked vs Grouped Toggle */}
              <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setChartMode('grouped')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    chartMode === 'grouped' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  แท่งแยก (Grouped)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('stacked')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    chartMode === 'stacked' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  แท่งซ้อน (Stacked)
                </button>
              </div>

              {/* Series Toggles */}
              <button
                type="button"
                onClick={() => setSeriesConfig(prev => ({ ...prev, showTotalIncome: !prev.showTotalIncome }))}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                  seriesConfig.showTotalIncome 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900' 
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>ยอดขายรวม</span>
              </button>

              <button
                type="button"
                onClick={() => setSeriesConfig(prev => ({ ...prev, showShopRevenue: !prev.showShopRevenue }))}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                  seriesConfig.showShopRevenue 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>ส่วนร้าน</span>
              </button>

              <button
                type="button"
                onClick={() => setSeriesConfig(prev => ({ ...prev, showExpenses: !prev.showExpenses }))}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                  seriesConfig.showExpenses 
                    ? 'bg-rose-50 border-rose-300 text-rose-900' 
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>รายจ่าย</span>
              </button>

              <button
                type="button"
                onClick={() => setSeriesConfig(prev => ({ ...prev, showNetProfit: !prev.showNetProfit }))}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                  seriesConfig.showNetProfit 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>กำไรสุทธิ</span>
              </button>
            </div>
          </div>

          {/* Recharts Bar Container */}
          <div className="h-80 sm:h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyData}
                margin={{ top: 15, right: 15, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `฿${(val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}`}
                />
                <Tooltip content={<CustomAnnualTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(value) => {
                    if (value === 'totalCustomerPaid') return <span className="text-xs font-bold text-slate-700">ยอดขายรวมทั้งหมด (Gross)</span>;
                    if (value === 'shopRevenue') return <span className="text-xs font-bold text-slate-700">รายได้สุทธิส่วนร้าน</span>;
                    if (value === 'expenses') return <span className="text-xs font-bold text-slate-700">รายจ่ายร้านค้า</span>;
                    if (value === 'netProfit') return <span className="text-xs font-bold text-slate-700">กำไรสุทธิ</span>;
                    if (value === 'barberTotalPayout') return <span className="text-xs font-bold text-slate-700">ส่วนแบ่งช่าง</span>;
                    return value;
                  }}
                />

                {/* Average Monthly Income Reference Line */}
                {seriesConfig.showAverageLine && annualTotals.avgMonthlyIncome > 0 && (
                  <ReferenceLine 
                    y={annualTotals.avgMonthlyIncome} 
                    stroke="#94a3b8" 
                    strokeDasharray="4 4"
                    label={{ 
                      value: `เฉลี่ย ฿${formatBaht(annualTotals.avgMonthlyIncome).replace('฿', '').trim()}`, 
                      fill: '#64748b', 
                      fontSize: 10,
                      position: 'right' 
                    }} 
                  />
                )}

                {/* Bar 1: Total Gross Income */}
                {seriesConfig.showTotalIncome && (
                  <Bar
                    dataKey="totalCustomerPaid"
                    name="totalCustomerPaid"
                    fill="#6366f1"
                    stackId={chartMode === 'stacked' ? 'revenue' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  >
                    {monthlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-income-${index}`} 
                        fill={entry.isPeakRevenueMonth ? '#4f46e5' : '#818cf8'} 
                      />
                    ))}
                  </Bar>
                )}

                {/* Bar 2: Shop Net Revenue */}
                {seriesConfig.showShopRevenue && (
                  <Bar
                    dataKey="shopRevenue"
                    name="shopRevenue"
                    fill="#10b981"
                    stackId={chartMode === 'stacked' ? 'shares' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                )}

                {/* Bar 3: Barber Payout (Optional) */}
                {seriesConfig.showBarberPayout && (
                  <Bar
                    dataKey="barberTotalPayout"
                    name="barberTotalPayout"
                    fill="#a855f7"
                    stackId={chartMode === 'stacked' ? 'shares' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                )}

                {/* Bar 4: Store Expenses */}
                {seriesConfig.showExpenses && (
                  <Bar
                    dataKey="expenses"
                    name="expenses"
                    fill="#f43f5e"
                    stackId={chartMode === 'stacked' ? 'costs' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                )}

                {/* Line: Net Profit Trend */}
                {seriesConfig.showNetProfit && (
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="netProfit"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#d97706' }}
                  />
                )}

              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Month & Highlights Badge */}
          {annualTotals.peakMonth && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-200/60 text-xs">
              <div className="flex items-center space-x-2 text-amber-900 font-bold">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  เดือนที่ทำยอดขายสูงสุด (Peak Month): <span className="text-slate-900 font-extrabold">{annualTotals.peakMonth.monthNameTh} {annualTotals.peakMonth.year + 543}</span> ({formatBaht(annualTotals.peakMonth.totalCustomerPaid)})
                </span>
              </div>
              <div className="text-slate-500 font-medium">
                รายได้เฉลี่ยต่อบิลตลอดปี: <span className="font-mono font-bold text-slate-800">{formatBaht(annualTotals.avgBillValue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Quarterly Breakdown Cards (Q1 - Q4) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span>ผลการดำเนินงานรายไตรมาส (Quarterly Performance Q1 - Q4)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {quarterlyData.map((q, idx) => (
              <div key={idx} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{q.qName}</h4>
                    <p className="text-[10px] text-slate-500">{q.monthsLabel}</p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
                    {q.sharePct.toFixed(1)}% ของปี
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[11px]">ยอดขาย:</span>
                    <span className="font-mono font-bold text-slate-900">{formatBaht(q.income)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[11px]">รายจ่าย:</span>
                    <span className="font-mono font-medium text-rose-600">{formatBaht(q.expenses)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-bold pt-1 border-t border-slate-200/40">
                    <span className="text-[11px]">กำไรสุทธิ:</span>
                    <span className={`font-mono ${q.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatBaht(q.profit)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. 12-Month Financial Statement Table */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>ตารางรายงานงบการเงินแยก 12 เดือน (12-Month Financial Breakdown Table)</span>
              </h3>
              <p className="text-xs text-slate-500">
                รายละเอียดตัวเลขรายรับ-รายจ่ายของแต่ละเดือน พร้อมปุ่มกดเพื่อเจาะลึกดูรายงานรายเดือน
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <label className="flex items-center space-x-1.5 text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyActiveMonths}
                  onChange={(e) => setShowOnlyActiveMonths(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>แสดงเฉพาะเดือนที่มีข้อมูล</span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
            <table className="w-full text-left border-collapse font-sans text-slate-700 text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-[10.5px] font-extrabold uppercase tracking-wide border-b border-slate-200">
                  <th className="p-3 pl-4">เดือน / ปี</th>
                  <th className="p-3 text-center">บิล</th>
                  <th className="p-3 text-right">ยอดขายรวม (Gross)</th>
                  <th className="p-3 text-right">ค่าตัดผม</th>
                  <th className="p-3 text-right">เคมี + สินค้า</th>
                  <th className="p-3 text-right">ส่วนแบ่งช่าง</th>
                  <th className="p-3 text-right">รายได้ส่วนร้าน</th>
                  <th className="p-3 text-right">รายจ่ายร้าน</th>
                  <th className="p-3 text-right">กำไรสุทธิ</th>
                  <th className="p-3 text-center">อัตรากำไร</th>
                  <th className="p-3 text-center pr-4">เจาะลึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableMonths.map((m) => (
                  <tr 
                    key={m.monthKey}
                    className={`hover:bg-slate-50 transition-colors ${
                      m.isCurrentMonth ? 'bg-amber-50/40 font-semibold' : ''
                    }`}
                  >
                    {/* Month Name */}
                    <td className="p-3 pl-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900">{m.monthNameTh} {m.year + 543}</span>
                        {m.isCurrentMonth && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-full">
                            ปัจจุบัน
                          </span>
                        )}
                        {m.isPeakRevenueMonth && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-full">
                            🏆 ยอดสูงสุด
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Bills Count */}
                    <td className="p-3 text-center font-mono text-slate-600">
                      {m.billsCount > 0 ? m.billsCount : '-'}
                    </td>

                    {/* Total Gross Income */}
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {m.totalCustomerPaid > 0 ? formatBaht(m.totalCustomerPaid) : '-'}
                    </td>

                    {/* Haircut Revenue */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {m.haircutRevenue > 0 ? formatBaht(m.haircutRevenue) : '-'}
                    </td>

                    {/* Chemical + Product */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {(m.chemicalRevenue + m.productRevenue) > 0 ? formatBaht(m.chemicalRevenue + m.productRevenue) : '-'}
                    </td>

                    {/* Barber Payout */}
                    <td className="p-3 text-right font-mono text-purple-700">
                      {m.barberTotalPayout > 0 ? formatBaht(m.barberTotalPayout) : '-'}
                    </td>

                    {/* Shop Revenue */}
                    <td className="p-3 text-right font-mono font-bold text-indigo-700">
                      {m.shopRevenue > 0 ? formatBaht(m.shopRevenue) : '-'}
                    </td>

                    {/* Store Expenses */}
                    <td className="p-3 text-right font-mono text-rose-600">
                      {m.expenses > 0 ? formatBaht(m.expenses) : '-'}
                    </td>

                    {/* Net Profit */}
                    <td className="p-3 text-right font-mono font-extrabold">
                      <span className={m.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {m.shopRevenue > 0 || m.expenses > 0 ? formatBaht(m.netProfit) : '-'}
                      </span>
                    </td>

                    {/* Margin % */}
                    <td className="p-3 text-center font-mono text-[11px] text-slate-600">
                      {m.shopRevenue > 0 ? `${m.profitMarginPct.toFixed(0)}%` : '-'}
                    </td>

                    {/* Drill down action button */}
                    <td className="p-3 text-center pr-4">
                      {onSelectMonth && (
                        <button
                          type="button"
                          onClick={() => onSelectMonth(m.monthKey)}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                          title={`เปิดหน้ารายงานรายเดือนของ ${m.monthNameTh}`}
                        >
                          <span>ดูเดือนนี้</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total Summary Footer Row */}
              <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="p-3 pl-4">รวมสะสมทั้งปี ({annualTotals.activeMonthsCount} เดือนที่เปิด)</td>
                  <td className="p-3 text-center font-mono">{annualTotals.totalBills}</td>
                  <td className="p-3 text-right font-mono font-black text-indigo-950">{formatBaht(annualTotals.totalIncome)}</td>
                  <td className="p-3 text-right font-mono">{formatBaht(annualTotals.totalHaircutRev)}</td>
                  <td className="p-3 text-right font-mono">{formatBaht(annualTotals.totalChemicalRev + annualTotals.totalProductRev)}</td>
                  <td className="p-3 text-right font-mono text-purple-800">{formatBaht(annualTotals.totalBarberPayout)}</td>
                  <td className="p-3 text-right font-mono font-black text-indigo-900">{formatBaht(annualTotals.totalShopRevenue)}</td>
                  <td className="p-3 text-right font-mono text-rose-700">{formatBaht(annualTotals.totalExpenses)}</td>
                  <td className="p-3 text-right font-mono font-black text-emerald-800">{formatBaht(annualTotals.totalNetProfit)}</td>
                  <td className="p-3 text-center font-mono">{annualTotals.overallProfitMargin.toFixed(0)}%</td>
                  <td className="p-3 text-center pr-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
