import React, { useState, useMemo } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { SaleRecord, Barber, ShareConfig, ShopConfig, Payslip, Expense } from '../types';
import { 
  formatBaht, 
  formatBahtWithDecimals,
  formatThaiDate, 
  formatThaiMonth, 
  downloadExcelReport, 
  downloadWordReport, 
  downloadPlainReport,
  generateDailyHtmlReport,
  generateMonthlyHtmlReport,
  getBillingCycleRange
} from '../utils';
import { 
  TrendingUp, 
  Users, 
  Coins, 
  Calendar, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  DollarSign, 
  FileSpreadsheet, 
  FileText, 
  Image as ImageIcon,
  Calculator,
  Clock,
  Printer,
  Trash2,
  Edit,
  BookmarkCheck,
  History,
  ArrowDownCircle,
  Plus,
  PlusCircle,
  Lock,
  Copy,
  Check,
  Scissors,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface DashboardTabProps {
  sales: SaleRecord[];
  barbers: Barber[];
  shareConfig: ShareConfig;
  shopConfig: ShopConfig;
  payslips?: Payslip[];
  onUpdatePayslips?: (payslips: Payslip[]) => void;
  onDeleteSale?: (saleId: string) => void;
  onUpdateSalePaymentMethod?: (saleId: string, newMethod: 'cash' | 'transfer') => void;
  onUpdateSale?: (saleId: string, updates: Partial<SaleRecord>) => void;
  expenses?: Expense[];
  onUpdateExpenses?: (expenses: Expense[]) => void;
}

export default function DashboardTab({ 
  sales, 
  barbers, 
  shareConfig, 
  shopConfig, 
  payslips = [], 
  onUpdatePayslips,
  onDeleteSale,
  onUpdateSalePaymentMethod,
  onUpdateSale,
  expenses = [],
  onUpdateExpenses
}: DashboardTabProps) {
  // Helpers to get dynamic local dates
  const getLocalDateString = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const getLocalMonthString = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0].substring(0, 7);
  };

  const recalculateSaleFinancials = (
    currentSale: SaleRecord,
    updates: {
      haircutPrice?: number;
      chemicalPrice?: number;
      productPrice?: number;
      tip?: number;
    }
  ): Partial<SaleRecord> => {
    const haircutPrice = updates.haircutPrice !== undefined ? updates.haircutPrice : currentSale.haircutPrice;
    const chemicalPrice = updates.chemicalPrice !== undefined ? updates.chemicalPrice : currentSale.chemicalPrice;
    const productPrice = updates.productPrice !== undefined ? updates.productPrice : currentSale.productPrice;
    const tip = updates.tip !== undefined ? updates.tip : currentSale.tip;

    const subtotal = haircutPrice + chemicalPrice + productPrice;

    // Recalculate chemical discount amount
    let chemicalDiscountAmount = 0;
    if (currentSale.chemicalDiscountValue && currentSale.chemicalDiscountValue > 0) {
      if (currentSale.chemicalDiscountType === 'percentage') {
        chemicalDiscountAmount = Math.round((chemicalPrice * currentSale.chemicalDiscountValue) / 100);
      } else {
        chemicalDiscountAmount = Math.min(chemicalPrice, currentSale.chemicalDiscountValue);
      }
    }

    const actualChemicalPrice = Math.max(0, chemicalPrice - chemicalDiscountAmount);

    const promoDiscountPct = shareConfig.promoDiscountPct ?? 10;
    const discount10Amount = currentSale.useDiscountPct10 ? Math.round((haircutPrice * promoDiscountPct) / 100) : 0;
    const voucherValue = currentSale.useVoucherValue || 0;

    const totalDiscounts = discount10Amount + voucherValue + chemicalDiscountAmount;
    const customerPaid = Math.max(0, subtotal - totalDiscounts) + tip;

    // Shares
    const barberHaircutShare = Math.round(haircutPrice * shareConfig.haircutBarberPct) / 100;
    const barberChemicalShare = Math.round(actualChemicalPrice * shareConfig.chemicalBarberPct) / 100;
    const barberProductShare = Math.round(productPrice * shareConfig.productBarberPct) / 100;
    const barberTotalShare = Math.round((barberHaircutShare + barberChemicalShare + barberProductShare + tip) * 100) / 100;
    const shopTotalShare = Math.round((Math.max(0, subtotal - totalDiscounts) - (barberHaircutShare + barberChemicalShare + barberProductShare)) * 100) / 100;

    return {
      haircutPrice,
      chemicalPrice,
      productPrice,
      tip,
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
  };

  // Current Selected Date for Daily Stats (Defaults to latest sale date or current date dynamically)
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  // Close Daily Sales Modal State
  const [isCloseSalesModalOpen, setIsCloseSalesModalOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopySummaryText = () => {
    const text = generateDailySummaryText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        alert("ไม่สามารถคัดลอกข้อความอัตโนมัติได้ กรุณาคัดลอกด้วยตนเองจากกล่องข้อความ");
      }
    } catch (err) {
      alert("ไม่สามารถคัดลอกข้อความอัตโนมัติได้ กรุณาคัดลอกด้วยตนเองจากกล่องข้อความ");
    }
    document.body.removeChild(textArea);
  };
  
  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmBtnClass?: string;
    isSave?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Custom Edit Payment Method Dialog State
  const [paymentEditSale, setPaymentEditSale] = useState<SaleRecord | null>(null);
  const [editPairSaleId, setEditPairSaleId] = useState<string>('');
  const [editGroupLabel, setEditGroupLabel] = useState<string>('');

  React.useEffect(() => {
    if (paymentEditSale) {
      setEditPairSaleId('');
      setEditGroupLabel(paymentEditSale.groupPaymentCode || '');
    } else {
      setEditPairSaleId('');
      setEditGroupLabel('');
    }
  }, [paymentEditSale]);
  
  // Current Selected Month for Monthly Stats (Defaults to current month dynamically)
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthString());

  // Chart toggles for monthly net profitability chart
  const [chartConfig, setChartConfig] = useState({
    showCustomerPaid: true,
    showShopRevenue: true,
    showExpenses: true,
    showNetProfit: true
  });

  // States for Store Expenses / Withdrawals Board
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<'supplies' | 'utilities' | 'rent' | 'marketing' | 'salary' | 'loans' | 'other'>('supplies');
  const [expenseNotes, setExpenseNotes] = useState<string>('');
  const [expensePayee, setExpensePayee] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(selectedDate);
  const [expenseIsFromDrawer, setExpenseIsFromDrawer] = useState<boolean>(true);
  const [draftExpenses, setDraftExpenses] = useState<Expense[]>([]);

  // Sync expenseDate when selectedDate changes in the dropdown
  React.useEffect(() => {
    setExpenseDate(selectedDate);
  }, [selectedDate]);

  // States for Professional Payslip Builder
  const [slipBarberId, setSlipBarberId] = useState<string>('');
  const [slipBaseSalary, setSlipBaseSalary] = useState<number>(0);
  const [slipOvertime, setSlipOvertime] = useState<number>(0);
  const [slipPositionAllowance, setSlipPositionAllowance] = useState<number>(0); // ค่าตำแหน่ง
  const [slipDeductions, setSlipDeductions] = useState<number>(0);
  const [slipSocialSecurity, setSlipSocialSecurity] = useState<number>(0);
  const [slipTaxRate, setSlipTaxRate] = useState<number>(0); // Standard 3% withholding tax in Thailand (Default to 0%)
  const [slipNote, setSlipNote] = useState<string>('');
  const [historySelectedMonth, setHistorySelectedMonth] = useState<string>('all');
  const [historySelectedBarberId, setHistorySelectedBarberId] = useState<string>('all');

  // Dynamic lists of archived months and barbers for historical search filters
  const archivedMonths = useMemo(() => {
    const list = Array.from(new Set(payslips.map(s => s.month)));
    return list.sort((a, b) => b.localeCompare(a));
  }, [payslips]);

  const archivedBarbers = useMemo(() => {
    const list = barbers.map(b => ({ id: b.id, name: b.name }));
    // include any historical barbers that might not be in currently active list
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

  // List of unique dates in sales records to easily pick
  const availableDates = useMemo(() => {
    const dates = sales.map(s => s.date);
    const today = getLocalDateString();
    if (!dates.includes(today)) dates.push(today);
    return Array.from(new Set(dates)).sort((a,b) => b.localeCompare(a));
  }, [sales]);

  // List of unique months YYYY-MM
  const availableMonths = useMemo(() => {
    const months = sales.map(s => s.date.substring(0, 7));
    const curMonth = getLocalMonthString();
    if (!months.includes(curMonth)) months.push(curMonth);
    return Array.from(new Set(months)).sort((a,b) => b.localeCompare(a));
  }, [sales]);

  // ==========================================
  // DAILY STATISTICS CALCULATION
  // ==========================================
  const dailySales = useMemo(() => {
    return sales.filter(s => s.date === selectedDate);
  }, [sales, selectedDate]);

  const sortedDailySales = useMemo(() => {
    return [...dailySales].sort((a, b) => {
      const cmp = b.timestamp.localeCompare(a.timestamp);
      if (cmp !== 0) return cmp;
      return b.id.localeCompare(a.id);
    });
  }, [dailySales]);

  const formatLocalTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (e) {
      return '--:--';
    }
  };

  const dailyBarberStats = useMemo(() => {
    return barbers.map(barber => {
      const barberSales = dailySlicesByBarber(dailySales, barber.id);
      const cutsCount = barberSales.filter(s => s.haircutPrice > 0).length;
      
      const haircutCom = barberSales.reduce((sum, s) => sum + s.barberHaircutShare, 0);
      const chemicalCom = barberSales.reduce((sum, s) => sum + s.barberChemicalShare, 0);
      const productCom = barberSales.reduce((sum, s) => sum + s.barberProductShare, 0);
      const tipTotal = barberSales.reduce((sum, s) => sum + s.tip, 0);
      const grandTotal = haircutCom + chemicalCom + productCom + tipTotal;

      return {
        id: barber.id,
        name: barber.name,
        cutsCount,
        haircutCom,
        chemicalCom,
        productCom,
        tipTotal,
        grandTotal
      };
    });
  }, [dailySales, barbers]);

  const dailyPaymentStats = useMemo(() => {
    const cashSales = dailySales.filter(s => s.paymentMethod === 'cash');
    const transferSales = dailySales.filter(s => s.paymentMethod === 'transfer');

    // Group-payment deduplication: count unique transfer transactions
    const seenGroupIds = new Set<string>();
    let transferCount = 0;
    transferSales.forEach(s => {
      if (s.groupPaymentId) {
        if (!seenGroupIds.has(s.groupPaymentId)) {
          seenGroupIds.add(s.groupPaymentId);
          transferCount++;
        }
      } else {
        transferCount++;
      }
    });

    return {
      cashAmount: cashSales.reduce((sum, s) => sum + s.customerPaid, 0),
      cashCount: cashSales.length,
      transferAmount: transferSales.reduce((sum, s) => sum + s.customerPaid, 0),
      transferCount,
      discountUsedCount: dailySales.filter(s => s.useDiscountPct10 || s.useVoucherValue > 0).length
    };
  }, [dailySales]);

  // Daily Expenses Memo Calculations
  const dailyExpenses = useMemo(() => {
    return expenses.filter(e => e.date === selectedDate);
  }, [expenses, selectedDate]);

  const totalDailyExpensesAmount = useMemo(() => {
    return dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [dailyExpenses]);

  // Get active billing cycle range based on cutoffDay
  const billingCycleRange = useMemo(() => {
    const cutoffDay = shopConfig?.billingCutoffDay || 1;
    return getBillingCycleRange(selectedMonth, cutoffDay);
  }, [selectedMonth, shopConfig?.billingCutoffDay]);

  // Monthly Expenses Memo Calculations
  const monthlyExpenses = useMemo(() => {
    const { startDate, endDate } = billingCycleRange;
    return expenses.filter(e => e.date >= startDate && e.date <= endDate);
  }, [expenses, billingCycleRange]);

  const totalMonthlyExpensesAmount = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);


  // ==========================================
  // MONTHLY STATISTICS CALCULATION
  // ==========================================
  const monthlySales = useMemo(() => {
    const { startDate, endDate } = billingCycleRange;
    return sales.filter(s => s.date >= startDate && s.date <= endDate);
  }, [sales, billingCycleRange]);

  const monthlyBarberStats = useMemo(() => {
    return barbers.map(barber => {
      const barberSales = dailySlicesByBarber(monthlySales, barber.id);
      const cutsCount = barberSales.filter(s => s.haircutPrice > 0).length;
      
      const haircutCom = barberSales.reduce((sum, s) => sum + s.barberHaircutShare, 0);
      const chemicalCom = barberSales.reduce((sum, s) => sum + s.barberChemicalShare, 0);
      const productCom = barberSales.reduce((sum, s) => sum + s.barberProductShare, 0);
      const tipTotal = barberSales.reduce((sum, s) => sum + s.tip, 0);
      const grandTotal = haircutCom + chemicalCom + productCom + tipTotal; // Monthly Salary / Total Payout per barber

      return {
        id: barber.id,
        name: barber.name,
        cutsCount,
        haircutCom,
        chemicalCom,
        productCom,
        tipTotal,
        grandTotal
      };
    });
  }, [monthlySales, barbers]);

  const selectedSlipBarberStats = useMemo(() => {
    const stats = monthlyBarberStats.find(b => b.id === slipBarberId);
    if (!stats) return null;
    return stats;
  }, [monthlyBarberStats, slipBarberId]);

  const selectedBarberForSlip = useMemo(() => {
    return barbers.find(b => b.id === slipBarberId);
  }, [barbers, slipBarberId]);

  const previewCalculation = useMemo(() => {
    if (!selectedSlipBarberStats) return null;
    const stats = selectedSlipBarberStats;
    const base = slipBaseSalary || 0;
    const ot = slipOvertime || 0;
    const posAllowance = slipPositionAllowance || 0;
    const tip = stats.tipTotal || 0;
    const haircutCom = stats.haircutCom || 0;
    const chemCom = stats.chemicalCom || 0;
    const prodCom = stats.productCom || 0;

    const totalSharesGenerated = haircutCom + chemCom + prodCom;
    const earnedIncome = Math.max(totalSharesGenerated, base);
    const topupBonus = totalSharesGenerated > base ? (totalSharesGenerated - base) : 0;
    const guaranteeSupplement = totalSharesGenerated < base ? (base - totalSharesGenerated) : 0;

    const totalEarnings = earnedIncome + tip + ot + posAllowance;
    const taxValue = Math.round(totalEarnings * (slipTaxRate / 100));
    const deductions = slipDeductions || 0;
    const soc = slipSocialSecurity || 0;
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
  }, [selectedSlipBarberStats, slipBaseSalary, slipOvertime, slipPositionAllowance, slipTaxRate, slipDeductions, slipSocialSecurity]);

  const monthlyOverallStats = useMemo(() => {
    const cashSales = monthlySales.filter(s => s.paymentMethod === 'cash');
    const transferSales = monthlySales.filter(s => s.paymentMethod === 'transfer');

    // Deduplicate monthly transfer count
    const seenGroupIds = new Set<string>();
    let transferCount = 0;
    transferSales.forEach(s => {
      if (s.groupPaymentId) {
        if (!seenGroupIds.has(s.groupPaymentId)) {
          seenGroupIds.add(s.groupPaymentId);
          transferCount++;
        }
      } else {
        transferCount++;
      }
    });
    
    // Total Shop Revenue (sum of shop's shares after subtracting barber commissions and absorbing discounts)
    const shopRevenue = monthlySales.reduce((sum, s) => sum + s.shopTotalShare, 0);
    const totalDiscountsCount = monthlySales.filter(s => s.useDiscountPct10 || s.useVoucherValue > 0).length;
    
    // Total income from customers without subtracting commissions (everything that customers paid)
    const totalCustomerPaid = monthlySales.reduce((sum, s) => sum + s.customerPaid, 0);

    // Unique days in this month that had sales
    const activeDays = Array.from(new Set(monthlySales.map(s => s.date)));
    const totalCuts = monthlySales.filter(s => s.haircutPrice > 0).length;
    const avgCutsPerDay = activeDays.length > 0 ? (totalCuts / activeDays.length) : 0;

    return {
      cashAmount: cashSales.reduce((sum, s) => sum + s.customerPaid, 0),
      cashCount: cashSales.length,
      transferAmount: transferSales.reduce((sum, s) => sum + s.customerPaid, 0),
      transferCount,
      shopRevenue,
      totalDiscountsCount,
      avgCutsPerDay,
      totalCuts,
      totalCustomerPaid
    };
  }, [monthlySales]);

  const dailyBreakdown = useMemo(() => {
    const haircutTotal = dailySales.reduce((sum, s) => sum + (s.haircutPrice || 0), 0);
    const chemicalTotal = dailySales.reduce((sum, s) => sum + (s.chemicalPrice || 0), 0);
    const productTotal = dailySales.reduce((sum, s) => sum + (s.productPrice || 0), 0);
    const combinedTotal = haircutTotal + chemicalTotal + productTotal;

    const haircutPct = combinedTotal > 0 ? (haircutTotal / combinedTotal) * 100 : 0;
    const chemicalPct = combinedTotal > 0 ? (chemicalTotal / combinedTotal) * 100 : 0;
    const productPct = combinedTotal > 0 ? (productTotal / combinedTotal) * 100 : 0;

    return {
      haircutTotal,
      chemicalTotal,
      productTotal,
      combinedTotal,
      haircutPct,
      chemicalPct,
      productPct
    };
  }, [dailySales]);

  const monthlyBreakdown = useMemo(() => {
    const haircutTotal = monthlySales.reduce((sum, s) => sum + (s.haircutPrice || 0), 0);
    const chemicalTotal = monthlySales.reduce((sum, s) => sum + (s.chemicalPrice || 0), 0);
    const productTotal = monthlySales.reduce((sum, s) => sum + (s.productPrice || 0), 0);
    const combinedTotal = haircutTotal + chemicalTotal + productTotal;

    const haircutPct = combinedTotal > 0 ? (haircutTotal / combinedTotal) * 100 : 0;
    const chemicalPct = combinedTotal > 0 ? (chemicalTotal / combinedTotal) * 100 : 0;
    const productPct = combinedTotal > 0 ? (productTotal / combinedTotal) * 100 : 0;

    return {
      haircutTotal,
      chemicalTotal,
      productTotal,
      combinedTotal,
      haircutPct,
      chemicalPct,
      productPct
    };
  }, [monthlySales]);

  // Daily Slices Helper
  function dailySlicesByBarber(records: SaleRecord[], barberId: string) {
    return records.filter(s => s.barberId === barberId);
  }

  // ==========================================
  // CHART DATA EXTRACTION (SVG CUSTOM GRAPH)
  // ==========================================
  // Extract daily stats for the selected month to render on visual scale
  const monthlyTimelineData = useMemo(() => {
    const daysInMonth = 31; // fallback max
    const dailyMap: { [day: number]: { revenue: number, customers: number } } = {};
    
    // Initialize empty days
    for (let d = 1; d <= 31; d++) {
      dailyMap[d] = { revenue: 0, customers: 0 };
    }

    // Populate from records
    monthlySales.forEach(s => {
      const parts = s.date.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        dailyMap[dayNum].revenue += s.customerPaid;
        if (s.haircutPrice > 0) {
          dailyMap[dayNum].customers += 1;
        }
      }
    });

    // We only output up to the current day in current month, or 30 days
    // Let's find max non-zero day for display limits
    let lastActiveDay = 1;
    for (let d = 31; d >= 1; d--) {
      if (dailyMap[d].revenue > 0 || dailyMap[d].customers > 0) {
        lastActiveDay = d;
        break;
      }
    }
    const finalDayLimit = Math.max(lastActiveDay, 9); // always show at least 9 days

    const chartItems = [];
    for (let d = 1; d <= finalDayLimit; d++) {
      chartItems.push({
        day: d,
        dayStr: `${d}`,
        revenue: dailyMap[d].revenue,
        customers: dailyMap[d].customers
      });
    }
    return chartItems;
  }, [monthlySales]);

  // Max value calculators for graph scaling
  const graphMaxRevenue = useMemo(() => {
    const maxVal = Math.max(...monthlyTimelineData.map(d => d.revenue));
    return maxVal > 0 ? maxVal * 1.15 : 1000;
  }, [monthlyTimelineData]);

  const graphMaxCustomers = useMemo(() => {
    const maxVal = Math.max(...monthlyTimelineData.map(d => d.customers));
    return maxVal > 0 ? maxVal + 1 : 5;
  }, [monthlyTimelineData]);

  const [activeChartTooltip, setActiveChartTooltip] = useState<{ day: number, revenue: number, customers: number } | null>(null);

  // Memoized Monthly Comparison Data for Recharts Bar Chart (Customer Paid, Shop Revenue, Expenses)
  const monthlyComparisonData = useMemo(() => {
    const dataMap: {
      [monthKey: string]: {
        month: string;
        customerPaid: number;
        shopRevenue: number;
        expenses: number;
      }
    } = {};

    // Keep track of active months
    const activeMonths = new Set<string>();

    // Add current month and last 5 months by default as fallback so the chart is never completely empty
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      activeMonths.add(`${yyyy}-${mm}`);
    }

    sales.forEach(s => {
      if (s.date && s.date.length >= 7) {
        activeMonths.add(s.date.substring(0, 7));
      }
    });

    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        activeMonths.add(e.date.substring(0, 7));
      }
    });

    // Initialize map
    const sortedMonths = Array.from(activeMonths).sort();
    sortedMonths.forEach(m => {
      dataMap[m] = {
        month: m,
        customerPaid: 0,
        shopRevenue: 0,
        expenses: 0
      };
    });

    // Aggregate Customer Paid and Shop Net Revenue from Sales records
    sales.forEach(s => {
      if (s.date && s.date.length >= 7) {
        const mKey = s.date.substring(0, 7);
        if (dataMap[mKey]) {
          dataMap[mKey].customerPaid += s.customerPaid || 0;
          dataMap[mKey].shopRevenue += s.shopTotalShare || 0;
        }
      }
    });

    // Aggregate Total Expenses from Expense records
    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        const mKey = e.date.substring(0, 7);
        if (dataMap[mKey]) {
          dataMap[mKey].expenses += e.amount || 0;
        }
      }
    });

    // Map to final format with Thai short labels and sorted chronologically
    return sortedMonths.map(mKey => {
      const item = dataMap[mKey];
      let displayLabel = mKey;
      try {
        const [y, m] = mKey.split('-');
        const monthNames = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        const monthIdx = parseInt(m, 10) - 1;
        const thYear = (parseInt(y, 10) + 543) % 100;
        displayLabel = `${monthNames[monthIdx]} ${String(thYear).padStart(2, '0')}`;
      } catch (err) {
        // Fallback to original
      }

      return {
        ...item,
        displayLabel,
        netProfit: item.shopRevenue - item.expenses
      };
    });
  }, [sales, expenses]);

  // Custom tooltips inside Recharts ComposedChart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const custPaidObj = payload.find((p: any) => p.dataKey === 'customerPaid');
      const shopRevObj = payload.find((p: any) => p.dataKey === 'shopRevenue');
      const expensesObj = payload.find((p: any) => p.dataKey === 'expenses');
      
      const shopRev = shopRevObj ? shopRevObj.value : 0;
      const expenses = expensesObj ? expensesObj.value : 0;
      const netProfit = shopRev - expenses;

      return (
        <div className="bg-slate-900/95 text-white p-4 rounded-2xl border border-slate-800 shadow-xl text-left font-sans text-xs space-y-2 backdrop-blur-xs">
          <p className="font-bold text-slate-300 text-sm border-b border-slate-800 pb-1.5">📊 สรุปยอดรอบเดือน: {label}</p>
          <div className="space-y-1">
            {custPaidObj && (
              <div className="flex items-center justify-between space-x-6">
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-[#6366f1]"></span>
                  <span>ยอดลูกค้าจ่ายทั้งหมด:</span>
                </span>
                <span className="font-mono font-bold text-indigo-300">{formatBaht(custPaidObj.value)}</span>
              </div>
            )}
            {shopRevObj && (
              <div className="flex items-center justify-between space-x-6">
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                  <span>รายได้เข้าร้านสุทธิ:</span>
                </span>
                <span className="font-mono font-bold text-amber-300">{formatBaht(shopRev)}</span>
              </div>
            )}
            {expensesObj && (
              <div className="flex items-center justify-between space-x-6">
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                  <span>ค่าใช้จ่าย/เบิกหน้าร้าน:</span>
                </span>
                <span className="font-mono font-bold text-rose-300">{formatBaht(expenses)}</span>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-800 mt-1 flex items-center justify-between space-x-6">
            <span className="flex items-center space-x-1.5 text-slate-300 font-bold">
              <span className={`w-2 h-2 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span>กำไรสุทธิของร้าน:</span>
            </span>
            <span className={`font-mono font-bold text-sm ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBaht(netProfit)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // ==========================================
  // STORE EXPENSES HANDLERS
  // ==========================================
  const handlePushToDraft = () => {
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('กรุณากรอกจำนวนเงินรายจ่ายที่ถูกต้องและมากกว่า 0');
      return;
    }
    if (!expenseNotes.trim()) {
      alert('กรุณากรอกรายละเอียดบันทึกรายจ่าย');
      return;
    }

    const tempExpense: Expense = {
      id: `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      date: expenseDate,
      amount: amountNum,
      category: expenseCategory,
      notes: expenseNotes.trim(),
      payee: expensePayee.trim() || 'ทางหักร้านทั่วไป',
      isFromDrawer: expenseIsFromDrawer
    };

    setDraftExpenses(prev => [...prev, tempExpense]);

    // Clear inputs except date & category
    setExpenseAmount('');
    setExpenseNotes('');
    setExpensePayee('');
  };

  const handleSaveAllDrafts = () => {
    if (draftExpenses.length === 0) return;
    
    const totalAmount = draftExpenses.reduce((sum, item) => sum + item.amount, 0);

    setConfirmDialog({
      isOpen: true,
      title: '📋 ยืนยันบันทึกรายการร่างทั้งหมด',
      message: `คุณต้องการบันทึกรายการรายจ่ายร่างทั้งหมดจำนวน ${draftExpenses.length} รายการลงสู่ฐานข้อมูลระบบใช่หรือไม่?\n\n- ยอดรวมทั้งหมด: ${formatBaht(totalAmount)}`,
      confirmText: 'บันทึกทั้งหมด',
      confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white',
      isSave: true,
      onConfirm: () => {
        const updatedExpenses = [...draftExpenses, ...expenses];
        if (onUpdateExpenses) {
          onUpdateExpenses(updatedExpenses);
        }
        setDraftExpenses([]);
        alert(`บันทึกรายการรายจ่ายและเบิกเงินสำเร็จรวดเดียว ${draftExpenses.length} รายการเรียบร้อยแล้ว!`);
      }
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('กรุณากรอกจำนวนเงินรายจ่ายที่ถูกต้องและมากกว่า 0');
      return;
    }
    if (!expenseNotes.trim()) {
      alert('กรุณากรอกรายละเอียดบันทึกรายจ่าย');
      return;
    }

    let catText = '';
    if (expenseCategory === 'supplies') catText = 'ซื้อของ/วัสดุอุปกรณ์ (Shop Supplies)';
    else if (expenseCategory === 'utilities') catText = 'ค่าน้ำ-ไฟ-เน็ต (Utilities)';
    else if (expenseCategory === 'rent') catText = 'ค่าเช่าสถานที่ (Shop Rent)';
    else if (expenseCategory === 'marketing') catText = 'ค่าโฆษณา (Marketing)';
    else if (expenseCategory === 'salary') catText = 'สวัสดิการ/ค่าแรงช่างพิเศษ (Wage)';
    else if (expenseCategory === 'loans') catText = 'เบิกถอนเงินเจ้าของ (Owner Outflow)';
    else catText = 'อื่น ๆ/เบ็ดเตล็ด (Miscellaneous)';

    const payeeName = expensePayee.trim() || 'ทางหักร้านทั่วไป';

    setConfirmDialog({
      isOpen: true,
      title: '📋 ยืนยันบันทึกรายจ่ายด่วน',
      message: `คุณแน่ใจหรือไม่ว่าต้องการบันทึกรายการรายจ่ายนี้ลงสู่ฐานข้อมูลทันที?\n\n• จำนวนเงิน: ${formatBaht(amountNum)}\n• หมวดหมู่: ${catText}\n• ผู้เบิก/ผู้รับเงิน: ${payeeName}\n• รายละเอียด: ${expenseNotes.trim()}\n• แหล่งเงินจ่าย: ${expenseIsFromDrawer ? '💵 หักออกจากลิ้นชัก (เก๊ะเงินสด)' : '💳 จ่ายผ่านบัญชีอื่น/ระบบหลัก'}`,
      confirmText: 'บันทึกรายจ่ายสด',
      confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white',
      isSave: true,
      onConfirm: () => {
        const newExpense: Expense = {
          id: `expense-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          date: expenseDate,
          amount: amountNum,
          category: expenseCategory,
          notes: expenseNotes.trim(),
          payee: payeeName,
          isFromDrawer: expenseIsFromDrawer
        };

        if (onUpdateExpenses) {
          onUpdateExpenses([newExpense, ...expenses]);
        }
        
        // Reset form
        setExpenseAmount('');
        setExpenseNotes('');
        setExpensePayee('');
        alert('บันทึกรายการรายจ่ายสำเร็จเรียบร้อยแล้ว!');
      }
    });
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันลบรายการรายจ่าย',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการรายจ่ายนี้? ยอดใช้จ่ายจะถูกคำนวณใหม่และอัปเดตลงฐานข้อมูลระบบทันที',
      onConfirm: () => {
        if (onUpdateExpenses) {
          onUpdateExpenses(expenses.filter(e => e.id !== id));
        }
      }
    });
  };

  // ==========================================
  // REPORT DOWNLOAD HANDLERS
  // ==========================================
  const generateDailySummaryText = () => {
    let summary = `==================================================\n`;
    summary += `รายงานสรุปยอดขายรายวัน: วันที่ ${formatThaiDate(selectedDate)}\n`;
    summary += `==================================================\n\n`;
    
    summary += `[รายชื่อช่างและส่วนแบ่งแยกตามผลงาน]\n`;
    dailyBarberStats.forEach(b => {
      summary += `- ช่าง${b.name}: ทำบริการตัดผม ${b.cutsCount} หัว\n`;
      summary += `  • ส่วนแบ่งตัดผม: ${formatBaht(b.haircutCom)}\n`;
      summary += `  • ส่วนแบ่งงานเคมี: ${formatBaht(b.chemicalCom)}\n`;
      summary += `  • ค่าคอมมิชชั่นสินค้า: ${formatBaht(b.productCom)}\n`;
      summary += `  • ทิปส่วนตัว: ${formatBaht(b.tipTotal)}\n`;
      summary += `  • ยอดรวมช่างได้รับของวันนี้: ${formatBaht(b.grandTotal)}\n\n`;
    });

    summary += `[สรุปช่องทางรับชำระเงินในวัน]\n`;
    summary += `- ยอดเงินสด: ${formatBaht(dailyPaymentStats.cashAmount)} (${dailyPaymentStats.cashCount} รายการ)\n`;
    summary += `- ยอดเงินโอน: ${formatBaht(dailyPaymentStats.transferAmount)} (${dailyPaymentStats.transferCount} รายการ)\n`;
    summary += `- ยอดรวมลูกค้าจ่ายวันนี้: ${formatBaht(dailyPaymentStats.cashAmount + dailyPaymentStats.transferAmount)}\n`;
    summary += `- มีลูกค้าใช้ส่วนลด/Gift Voucher: ${dailyPaymentStats.discountUsedCount} รายการ\n\n`;

    summary += `[สรุปรายการรายจ่าย/การเบิกเงินสดวันนี้]\n`;
    if (dailyExpenses.length === 0) {
      summary += `- ไม่มีบันทึกรายจ่ายหรือยอดเบิกเงินในวันนี้\n\n`;
    } else {
      dailyExpenses.forEach(e => {
        let catText = '';
        if (e.category === 'supplies') catText = 'ซื้ออุปกรณ์เข้าร้าน';
        else if (e.category === 'utilities') catText = 'ค่าน้ำ-ไฟ-เน็ต';
        else if (e.category === 'rent') catText = 'ค่าเช่าร้าน/สถานที่';
        else if (e.category === 'marketing') catText = 'ค่าทำโฆษณา/โปรโมท';
        else if (e.category === 'salary') catText = 'สวัสดิการ/ค่าแรงพิเศษ';
        else if (e.category === 'loans') catText = 'เบิกถอนเงินเจ้าของ';
        else catText = 'เบ็ดเตล็ดอื่น ๆ';
        summary += `- ${catText} จำนวน ${formatBaht(e.amount)} (ผู้เบิก: ${e.payee || 'ทางหักร้านทั่วไป'}) - หมายเหตุ: ${e.notes}\n`;
      });
      summary += `  • รวมยอดรายจ่ายหน้าร้านวันนี้: ${formatBaht(totalDailyExpensesAmount)}\n`;
      summary += `  • ยอดเงินสดหน้าร้านคงเหลือนำส่ง (Cash Remaining After Expenses): ${formatBaht(dailyPaymentStats.cashAmount - totalDailyExpensesAmount)}\n\n`;
    }
    
    summary += `จัดพิมพ์โดยแผนกบัญชี ณ วันที่ ${new Date().toLocaleString('th-TH')}`;
    return summary;
  };

  const handleDownloadDaily = (format: 'pdf' | 'excel' | 'word' | 'png') => {
    const title = `DAILY_REPORT_${selectedDate}`;
    const txt = generateDailySummaryText();

    if (format === 'excel') {
      const headers = ['ช่างตัดผม', 'จำนวนหัวที่ตัด', 'ส่วนแบ่งตัดผม (บาท)', 'ส่วนแบ่งเคมี (บาท)', 'ส่วนแบ่งสินค้า (บาท)', 'ทิป (บาท)', 'รวมช่างรับ'];
      const rows = dailyBarberStats.map(b => [
        b.name,
        b.cutsCount.toString(),
        b.haircutCom.toString(),
        b.chemicalCom.toString(),
        b.productCom.toString(),
        b.tipTotal.toString(),
        b.grandTotal.toString()
      ]);
      // Append payment stats to Excel rows
      rows.push([]);
      rows.push(['สรุปช่องทางการเงิน', 'จำนวนรายการ', 'ยอดเงินสุทธิ (บาท)', '', '', '', '']);
      rows.push(['เงินสด', dailyPaymentStats.cashCount.toString(), dailyPaymentStats.cashAmount.toString(), '', '', '', '']);
      rows.push(['เงินโอน', dailyPaymentStats.transferCount.toString(), dailyPaymentStats.transferAmount.toString(), '', '', '', '']);
      rows.push(['จำนวนรายการใช้ส่วนลดรวม', dailyPaymentStats.discountUsedCount.toString(), '', '', '', '', '']);
      
      // Append expense journals to Excel rows
      rows.push([]);
      rows.push(['บัญชีสรุปรายการเบิกจ่ายของร้านวันนี้', 'ประเภทหมวดหมู่', 'ผู้เบิก/ผู้รับเงิน', 'บันทึกหมายเหตุ', 'ยอดเงิน (บาท)', '', '']);
      dailyExpenses.forEach(e => {
        let catText = '';
        if (e.category === 'supplies') catText = 'ซื้ออุปกรณ์เข้าร้าน';
        else if (e.category === 'utilities') catText = 'ค่าน้ำ-ไฟ-เน็ต';
        else if (e.category === 'rent') catText = 'ค่าเช่าสถานที่';
        else if (e.category === 'marketing') catText = 'ค่าทำโฆษณา/โปรโมท';
        else if (e.category === 'salary') catText = 'ค่าจ้างช่างพิเศษ/สวัสดิการ';
        else if (e.category === 'loans') catText = 'เบิกถอนเงินเจ้าของ';
        else catText = 'อื่น ๆ';
        rows.push([`เบิกจ่าย ID: ${e.id}`, catText, e.payee, e.notes, e.amount.toString(), '', '']);
      });
      rows.push(['รวมรายจ่ายหน้าร้านวันนี้', '', '', '', totalDailyExpensesAmount.toString(), '', '']);
      rows.push(['เงินสดคงเหลือสุทธิหักจ่ายประจำวัน', '', '', '', (dailyPaymentStats.cashAmount - totalDailyExpensesAmount).toString(), '', '']);

      downloadExcelReport(title, rows, headers);
    } 
    else if (format === 'word') {
      const html = generateDailyHtmlReport(shopConfig.shopName, selectedDate, dailyBarberStats, dailyPaymentStats, sortedDailySales, dailyExpenses);
      downloadWordReport(title, html);
    } 
    else if (format === 'pdf') {
      // Trigger HTML printable standard invoice style
      const htmlContents = generateDailyHtmlReport(shopConfig.shopName, selectedDate, dailyBarberStats, dailyPaymentStats, sortedDailySales, dailyExpenses);
      downloadPlainReport(`รายงานรายวัน ${formatThaiDate(selectedDate)}`, txt, 'pdf', htmlContents, shopConfig.shopName);
    }
    else {
      // JPG/PNG output
      downloadPlainReport(`รายงานรายวัน ${formatThaiDate(selectedDate)}`, txt, 'png', undefined, shopConfig.shopName);
    }
  };


  const generateMonthlySummaryText = () => {
    let summary = `==================================================\n`;
    summary += `รายงานสรุปยอดขายรายเดือนประจำ: ${formatThaiMonth(selectedMonth)}\n`;
    summary += `==================================================\n\n`;
    
    summary += `[รายชื่อช่างและยอดรวมส่วนแบ่งสะสมทั้งเดือน]\n`;
    monthlyBarberStats.forEach(b => {
      summary += `- ช่าง${b.name}: ทำบริการตัดผมรวม ${b.cutsCount} หัว\n`;
      summary += `  • ส่วนแบ่งค่าตัดผม: ${formatBaht(b.haircutCom)}\n`;
      summary += `  • ส่วนแบ่งบริการเคมี: ${formatBaht(b.chemicalCom)}\n`;
      summary += `  • ส่วนแบ่งขายสินค้า: ${formatBaht(b.productCom)}\n`;
      summary += `  • ทิปสะสมได้รับเต็ม: ${formatBaht(b.tipTotal)}\n`;
      summary += `  • ยอดที่ต้องจ่ายจริง (เงินเดือนช่าง): ${formatBaht(b.grandTotal)}\n\n`;
    });

    summary += `[ยอดสรุปการเงินบัญชีของร้านค้าทางบัญชี]\n`;
    summary += `- ยอดรายรับสะสมทั้งหมดที่ลูกค้าจ่าย (ก่อนหักค่าคอม): ${formatBaht(monthlyOverallStats.totalCustomerPaid)}\n`;
    summary += `- ยอดเงินสดรวมทั้งเดือน: ${formatBaht(monthlyOverallStats.cashAmount)} (${monthlyOverallStats.cashCount} รายการ)\n`;
    summary += `- ยอดเงินโอนรวมทั้งเดือน: ${formatBaht(monthlyOverallStats.transferAmount)} (${monthlyOverallStats.transferCount} รายการ)\n`;
    summary += `- ส่วนต่างส่วนลดโปรโมชั่นที่ร้านค้าแบกรับไว้: ${monthlyOverallStats.totalDiscountsCount} รายการ\n`;
    summary += `- ค่าเฉลี่ยจำนวนลูกค้าที่มารับบริการประจำวัน: ${Math.ceil(monthlyOverallStats.avgCutsPerDay)} หัว/วัน\n`;
    summary += `- ยอดรายได้สุทธิของร้านตัดผม (ร้านหักค่าช่างแล้ว): ${formatBaht(monthlyOverallStats.shopRevenue)}\n`;
    summary += `- ยอดรวมรายจ่าย/การเงินเบิกสะสมของร้านเดือนนี้: ${formatBaht(totalMonthlyExpensesAmount)}\n`;
    summary += `- กำไรบริสุทธิ์สะสมของทางร้าน (Net Shop Profit): ${formatBaht(monthlyOverallStats.shopRevenue - totalMonthlyExpensesAmount)}\n\n`;
    
    summary += `จัดพิมพ์โดย แผนกตรวจสอบบัญชี ณ วันที่ ${new Date().toLocaleString('th-TH')}`;
    return summary;
  };

  const handleDownloadMonthly = (format: 'pdf' | 'excel' | 'word' | 'png') => {
    const title = `MONTHLY_REPORT_${selectedMonth}`;
    const txt = generateMonthlySummaryText();

    if (format === 'excel') {
      const headers = ['ช่างตัดผม', 'ยอดบริการสะสม (หัว)', 'ส่วนแบ่งตัดผมรวม (บาท)', 'ส่วนแบ่งเคมีรวม (บาท)', 'ส่วนแบ่งสินค้ารวม (บาท)', 'ทิปสะสม (บาท)', 'ยอดเงินเดือนที่ต้องจ่าย'];
      const rows = monthlyBarberStats.map(b => [
        b.name,
        b.cutsCount.toString(),
        b.haircutCom.toString(),
        b.chemicalCom.toString(),
        b.productCom.toString(),
        b.tipTotal.toString(),
        b.grandTotal.toString()
      ]);
      rows.push([]);
      rows.push(['บทวิเคราะห์ข้อมูลทางการร้านค้า', 'ยอดเงินและตัวชี้วัด', '', '', '', '', '']);
      rows.push(['รายรับสะสมทั้งหมดที่ลูกค้าจ่าย (ก่อนหักค่าช่าง)', monthlyOverallStats.totalCustomerPaid.toString(), '', '', '', '', '']);
      rows.push(['รายได้สุทธิส่วนทางร้าน (Net Shop Income)', monthlyOverallStats.shopRevenue.toString(), '', '', '', '', '']);
      rows.push(['ยอดเงินสดรวมทั้งเดือน', `${monthlyOverallStats.cashAmount.toString()} บาท (${monthlyOverallStats.cashCount} ยอด)`, '', '', '', '', '']);
      rows.push(['ยอดเงินโอนร่วมทั้งเดือน', `${monthlyOverallStats.transferAmount.toString()} บาท (${monthlyOverallStats.transferCount} ยอด)`, '', '', '', '', '']);
      rows.push(['ค่าเฉลี่ยลูกค้ามาตัดผมต่อวัน', monthlyOverallStats.avgCutsPerDay.toFixed(2), '', '', '', '', '']);
      rows.push(['ยอดจำนวนโปรโมชั่นที่ใช้', monthlyOverallStats.totalDiscountsCount.toString(), '', '', '', '', '']);
      rows.push(['รวมรายจ่ายหน้าร้านทั้งเดือนนี้', totalMonthlyExpensesAmount.toString(), '', '', '', '', '']);
      rows.push(['ยอดกำไรบริสุทธิ์สะสมหลังหักจ่าย', (monthlyOverallStats.shopRevenue - totalMonthlyExpensesAmount).toString(), '', '', '', '', '']);

      downloadExcelReport(title, rows, headers);
    } 
    else if (format === 'word') {
      const html = generateMonthlyHtmlReport(shopConfig.shopName, selectedMonth, monthlyBarberStats, monthlyOverallStats, monthlyExpenses);
      downloadWordReport(title, html);
    } 
    else if (format === 'pdf') {
      const htmlBody = generateMonthlyHtmlReport(shopConfig.shopName, selectedMonth, monthlyBarberStats, monthlyOverallStats, monthlyExpenses);
      downloadPlainReport(`รายงานรายเดือน ${formatThaiMonth(selectedMonth)}`, txt, 'pdf', htmlBody, shopConfig.shopName);
    }
    else {
      downloadPlainReport(`รายงานรายเดือน ${formatThaiMonth(selectedMonth)}`, txt, 'png', undefined, shopConfig.shopName);
    }
  };

  // Unified Generalized Payslip Printing Engine
  const printPayslipData = (data: {
    barberId: string;
    barberName: string;
    realName: string;
    position: string;
    month: string;
    baseSalary: number;
    overtime: number;
    positionAllowance?: number; // ค่าตำแหน่ง
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
    const taxValue = Math.round(totalEarnings * (taxRate / 100));
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
      baseSalary: slipBaseSalary,
      overtime: slipOvertime,
      positionAllowance: slipPositionAllowance,
      haircutCom: stats.haircutCom,
      chemicalCom: stats.chemicalCom,
      productCom: stats.productCom,
      tipTotal: stats.tipTotal,
      deductions: slipDeductions,
      soc: slipSocialSecurity,
      taxRate: slipTaxRate,
      note: slipNote
    });
  };

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const handleSaveCurrentPayslip = () => {
    if (!selectedSlipBarberStats || !onUpdatePayslips) return;
    const stats = selectedSlipBarberStats;
    
    const haircutCom = stats.haircutCom || 0;
    const chemicalCom = stats.chemicalCom || 0;
    const productCom = stats.productCom || 0;
    const tipTotal = stats.tipTotal || 0;
    const baseVal = slipBaseSalary || 0;
    const otVal = slipOvertime || 0;
    const decVal = slipDeductions || 0;
    const socVal = slipSocialSecurity || 0;
    const posAllowanceVal = slipPositionAllowance || 0;

    const totalSharesGenerated = haircutCom + chemicalCom + productCom;
    const earnedIncome = Math.max(totalSharesGenerated, baseVal);
    const totalEarnings = earnedIncome + tipTotal + otVal + posAllowanceVal;
    
    const taxValue = Math.round(totalEarnings * (slipTaxRate / 100));
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

    // Filter out historical duplicates for the exact same month & barber and append new snapshot
    const filteredSlips = payslips.filter(s => !(s.month === selectedMonth && s.barberId === stats.id));
    onUpdatePayslips([newSlip, ...filteredSlips]);

    setSaveSuccessMsg(`บันทึกประวัติสลิปเงินเดือนช่าง ${stats.name} รอบเดือน ${formatThaiMonth(selectedMonth)} ลงระบบเรียบร้อยแล้ว!`);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 4500);
  };

  const handleDeletePayslip = (slipId: string) => {
    if (!onUpdatePayslips) return;
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันลบประวัติสลิปเงินเดือน',
      message: 'คุณต้องการลบประวัติสลิปเงินเดือนใบนี้ออกจากระบบถาวรหรือไม่? การดำเนินการนี้นอกเหนือจากการพิมพ์ประวัติจะไม่สามารถกู้กลับคืนมาได้',
      onConfirm: () => {
        if (onUpdatePayslips) {
          onUpdatePayslips(payslips.filter(s => s.id !== slipId));
        }
      }
    });
  };

  const handleDownloadWordPayslip = () => {
    if (!selectedSlipBarberStats) return;
    const stats = selectedSlipBarberStats;
    const base = slipBaseSalary || 0;
    const ot = slipOvertime || 0;
    const tip = stats.tipTotal || 0;
    const haircutCom = stats.haircutCom || 0;
    const chemCom = stats.chemicalCom || 0;
    const prodCom = stats.productCom || 0;
    
    const posAllowance = slipPositionAllowance || 0;
    
    // Thai Barber Standard Salary Guarantee Rule
    const totalSharesGenerated = haircutCom + chemCom + prodCom;
    const earnedIncome = Math.max(totalSharesGenerated, base);
    const topupBonus = totalSharesGenerated > base ? (totalSharesGenerated - base) : 0;
    const guaranteeSupplement = totalSharesGenerated < base ? (base - totalSharesGenerated) : 0;
    
    const totalEarnings = earnedIncome + tip + ot + posAllowance;
    const taxValue = Math.round(totalEarnings * (slipTaxRate / 100));
    const deductions = slipDeductions || 0;
    const soc = slipSocialSecurity || 0;
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

        <div style="border: 1.5px solid #111111; background-color: #f8fafc; padding: 15px; text-align: center; margin-bottom: 25px;">
          <h3 style="margin: 0; color: #1e40af;">💵 จำนวนเงินโอนจ่ายสุทธิช่าง (NET PAYABLE TO BARBER): ${formatBaht(netPayable)}</h3>
        </div>

        ${slipNote ? `<p style="font-size: 11px; border: 1px solid #999; padding: 10px; line-height: 1.5; color: #333;"><b>📝 หมายเหตุท้ายเอกสาร / Memo Note:</b> ${slipNote}</p>` : ''}
        
        <table style="width: 100%; margin-top: 50px;">
          <tr>
            <td style="width: 50%; text-align: center; font-size: 12px;">
              ___________________________<br/>
              ลายชื่อพนักงานผู้รับเงิน / Recipient Signature<br/>
              วันที่ _________/_________/_________
            </td>
            <td style="width: 50%; text-align: center; font-size: 12px;">
              ___________________________<br/>
              ลายชื่อผู้อนุมัติแบ่งส่วน / Authorized representative<br/>
              ตำแหน่ง: ผู้แทนจัดทำบัญชี / ร้านบาร์เบอร์
            </td>
          </tr>
        </table>
      </div>
    `;
    downloadWordReport(`OFFICIAL_PAYSLIP_${stats.name}_${selectedMonth}`, docContent);
  };


  const editGroupOptions = React.useMemo(() => {
    if (!paymentEditSale) return { existingGroups: [], potentialSingles: [] };
    const dateStr = paymentEditSale.date;
    const sameDateTransfers = sales.filter(s => s.date === dateStr && s.paymentMethod === 'transfer' && s.id !== paymentEditSale.id);

    const groups: { id: string; label: string; totalAmount: number; count: number }[] = [];
    const seenGroupIds = new Set<string>();

    sameDateTransfers.forEach(s => {
      if (s.groupPaymentId && !seenGroupIds.has(s.groupPaymentId)) {
        seenGroupIds.add(s.groupPaymentId);
        const groupRecords = sales.filter(r => r.date === dateStr && r.paymentMethod === 'transfer' && r.groupPaymentId === s.groupPaymentId);
        const total = groupRecords.reduce((sum, r) => sum + r.customerPaid, 0);
        groups.push({
          id: s.groupPaymentId,
          label: s.groupPaymentCode || `กลุ่มโอนร่วม #${s.groupPaymentId.slice(-4)}`,
          totalAmount: total,
          count: groupRecords.length
        });
      }
    });

    const potentialSingles = sameDateTransfers.filter(s => !s.groupPaymentId);

    return {
      existingGroups: groups,
      potentialSingles: potentialSingles.map(s => ({
        id: s.id,
        label: `${s.customerName ? s.customerName : 'ลูกค้าช่าง' + s.barberName} (${formatBaht(s.customerPaid)})`,
        totalAmount: s.customerPaid,
        count: 1
      }))
    };
  }, [sales, paymentEditSale]);


  return (
    <div className="space-y-10" id="accounting-dashboard">
      
      {/* ========================================================== */}
      {/* QUICK ACCOUNTANT SUMMARY (BENTO GRID WIDGET) */}
      {/* ========================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-slate-700/50 space-y-5 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Calculator className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black tracking-tight font-sans text-white">แผงสรุปยอดด่วนรายวันสำหรับนักบัญชี</h2>
            </div>
            <p className="text-xs text-slate-300 font-sans">
              ข้อมูลสรุปตัวเลขสำคัญประจำวันที่ <span className="font-bold text-amber-300 font-mono underline decoration-dotted">{formatThaiDate(selectedDate)}</span> แสดงผลทันทีโดยไม่ต้องเปิดรายงานเต็ม
            </p>
          </div>
          
          <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
            <button
              onClick={() => setIsCloseSalesModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer mr-2 border border-amber-400/30"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ปิดยอดขายประจำวัน</span>
            </button>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">Accountant QuickView</span>
            {selectedDate === getLocalDateString() && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold animate-pulse">วันนี้ (Live)</span>
            )}
          </div>
        </div>

        {dailySales.length === 0 ? (
          <div className="p-6 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700/60 flex flex-col items-center justify-center space-y-2">
            <Coins className="w-8 h-8 text-slate-500 animate-bounce" />
            <p className="text-xs text-slate-300 font-sans font-medium">ไม่มีรายการรับเงินในวันที่ {formatThaiDate(selectedDate)}</p>
            <p className="text-[10px] text-slate-500 font-sans">ตรวจสอบการป้อนข้อมูลขายในระบบหรือเลือกวันอื่นเพื่อสรุปตัวเลข</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Metric 1: ยอดรับรวม (Gross Sales) */}
            <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">1. ยอดรับเงินรวม</span>
                <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg"><TrendingUp className="w-3.5 h-3.5" /></span>
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black text-white font-mono tracking-tight">
                  {formatBaht(dailyPaymentStats.cashAmount + dailyPaymentStats.transferAmount)}
                </div>
                <div className="text-[10px] text-indigo-300 font-sans">
                  รับจากลูกค้าจริงทั้งหมด
                </div>
              </div>
            </div>

            {/* Metric 2: ยอดเงินสดเข้าเก๊ะ */}
            <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">2. ยอดเงินสด (เก๊ะ)</span>
                <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg"><Coins className="w-3.5 h-3.5" /></span>
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black text-emerald-400 font-mono tracking-tight">
                  {formatBaht(dailyPaymentStats.cashAmount)}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  จำนวน {dailyPaymentStats.cashCount} บิลสด
                </div>
              </div>
            </div>

            {/* Metric 3: ยอดเงินโอนเข้าแบงก์ */}
            <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">3. ยอดเงินโอน (ธนาคาร)</span>
                <span className="p-1 bg-sky-500/20 text-sky-400 rounded-lg"><DollarSign className="w-3.5 h-3.5" /></span>
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black text-sky-400 font-mono tracking-tight">
                  {formatBaht(dailyPaymentStats.transferAmount)}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  จำนวน {dailyPaymentStats.transferCount} ธุรกรรมโอน
                </div>
              </div>
            </div>

            {/* Metric 4: ยอดรายจ่าย/เบิกหน้าร้าน */}
            <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">4. รายจ่าย/เบิกหน้าร้าน</span>
                <span className="p-1 bg-rose-500/20 text-rose-400 rounded-lg"><ArrowDownCircle className="w-3.5 h-3.5" /></span>
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black text-rose-400 font-mono tracking-tight">
                  {formatBaht(totalDailyExpensesAmount)}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  จำนวน {dailyExpenses.length} รายการจ่าย
                </div>
              </div>
            </div>

            {/* Metric 5: ส่วนแบ่งร้านค้าสุทธิ */}
            <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">5. รายได้เข้าร้านสุทธิ</span>
                <span className="p-1 bg-amber-500/20 text-amber-400 rounded-lg"><TrendingUp className="w-3.5 h-3.5" /></span>
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black text-amber-300 font-mono tracking-tight">
                  {formatBaht(dailySales.reduce((sum, s) => sum + (s.shopTotalShare || 0), 0))}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  หักค่าส่วนแบ่งช่างแล้ว
                </div>
              </div>
            </div>

            {/* Metric 6: เงินสดสุทธินำส่งร้าน */}
            <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">6. เงินสดหน้าร้านนำส่ง</span>
                <span className="p-1 bg-violet-500/20 text-violet-400 rounded-lg"><Coins className="w-3.5 h-3.5" /></span>
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black text-violet-300 font-mono tracking-tight">
                  {formatBaht(dailyPaymentStats.cashAmount - totalDailyExpensesAmount)}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  เงินสดหลังหักค่าใช้จ่าย
                </div>
              </div>
            </div>

          </div>
        )}

        {dailySales.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-400 gap-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>👥 จำนวนบิลขายรวม: <strong className="text-white font-mono">{dailySales.length}</strong> ใบเสร็จ</span>
              <span>💇‍♂️ ตัดผมทั้งหมด: <strong className="text-white font-mono">{dailySales.filter(s => s.haircutPrice > 0).length}</strong> หัว</span>
              <span>🏷️ ยอดส่วนแบ่งช่างสะสมรวม: <strong className="text-white font-mono">{formatBahtWithDecimals(dailyBarberStats.reduce((sum, b) => sum + b.grandTotal, 0))}</strong></span>
            </div>
            <div className="text-slate-500 italic font-sans text-[10px]">
              * อัปเดตข้อมูลแบบเรียลไทม์จากระบบ POS
            </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* SECTION 1: DAILY REPORT */}
      {/* ========================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        
        {/* Header containing dropdown to filter daily report */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-extrabold text-slate-800">1. ยอดขายและบัญชีรายวัน</h2>
            </div>
            <p className="text-xs text-slate-500">
              แจกแจงผลงานช่าง ช่องทางการเงิน และออกสรุปข้อมูลสรุปการเงินในรายวัน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCloseSalesModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-indigo-500/10"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ปิดยอดขายประจำวัน</span>
            </button>

            <span className="text-sm font-semibold text-slate-600">เลือกวันที่ตรวจสอบ:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl outline-none bg-white text-sm font-mono focus:ring-1 focus:ring-slate-800 focus:border-slate-800"
            >
              {availableDates.map(d => (
                <option key={d} value={d}>
                  {formatThaiDate(d)} {d === getLocalDateString() ? '(วันนี้)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display daily status banner */}
        {dailySales.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Calculator className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-semibold">ไม่พบข้อมูลยอดบันทึกขายในวันที่ {formatThaiDate(selectedDate)}</p>
            <p className="text-xs text-slate-400 mt-1">กรุณากลับไปที่แท็บหน้าแรกเพื่อทำการกรอกบันทึกบริการลูกค้า</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ยอดขายแบบแยกย่อย (Breakdown) รายวัน */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                    <span className="p-1 bg-indigo-500/10 text-indigo-600 rounded">
                      <Calculator className="w-4 h-4" />
                    </span>
                    <span>📊 สัดส่วนรายได้แยกประเภท (ยอดขายรายวัน)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">ยอดรวมสัดส่วนรายได้แยกตามบริการและสินค้าของวันที่ {formatThaiDate(selectedDate)}</p>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-xs">
                  ยอดรวมสัดส่วนรายได้: <span className="font-mono text-indigo-600 font-black">{formatBaht(dailyBreakdown.combinedTotal)}</span>
                </div>
              </div>

              {/* Progress Bar Proportion */}
              {dailyBreakdown.combinedTotal > 0 ? (
                <div className="space-y-4">
                  <div className="h-3.5 w-full bg-slate-200/50 rounded-full overflow-hidden flex shadow-inner border border-slate-100">
                    {dailyBreakdown.haircutTotal > 0 && (
                      <div 
                        style={{ width: `${dailyBreakdown.haircutPct}%` }} 
                        className="bg-indigo-600 h-full transition-all duration-500 hover:opacity-90" 
                        title={`ค่าตัดผม: ${formatBaht(dailyBreakdown.haircutTotal)} (${dailyBreakdown.haircutPct.toFixed(1)}%)`}
                      />
                    )}
                    {dailyBreakdown.chemicalTotal > 0 && (
                      <div 
                        style={{ width: `${dailyBreakdown.chemicalPct}%` }} 
                        className="bg-pink-500 h-full transition-all duration-500 hover:opacity-90" 
                        title={`งานเคมี: ${formatBaht(dailyBreakdown.chemicalTotal)} (${dailyBreakdown.chemicalPct.toFixed(1)}%)`}
                      />
                    )}
                    {dailyBreakdown.productTotal > 0 && (
                      <div 
                        style={{ width: `${dailyBreakdown.productPct}%` }} 
                        className="bg-amber-500 h-full transition-all duration-500 hover:opacity-90" 
                        title={`ขายสินค้า: ${formatBaht(dailyBreakdown.productTotal)} (${dailyBreakdown.productPct.toFixed(1)}%)`}
                      />
                    )}
                  </div>

                  {/* 3-Column Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Haircut Card */}
                    <div className="bg-white border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">ยอดรวมค่าตัดผม</p>
                          <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatBaht(dailyBreakdown.haircutTotal)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">{dailyBreakdown.haircutPct.toFixed(1)}%</span>
                    </div>

                    {/* Chemical Card */}
                    <div className="bg-white border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">ยอดบริการเคมี</p>
                          <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatBaht(dailyBreakdown.chemicalTotal)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md font-mono">{dailyBreakdown.chemicalPct.toFixed(1)}%</span>
                    </div>

                    {/* Product Card */}
                    <div className="bg-white border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">ยอดขายสินค้า</p>
                          <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatBaht(dailyBreakdown.productTotal)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-mono">{dailyBreakdown.productPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลสัดส่วนเนื่องจากยังไม่มียอดขายบันทึกไว้</p>
              )}
            </div>

            {/* Barber breakdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyBarberStats.map((barber) => (
                <div key={barber.id} className="border border-slate-100 hover:border-slate-200 bg-slate-50/40 rounded-2xl p-5 space-y-4 shadow-xs transition-all">
                  <div className="flex justify-between items-center bg-white p-2 px-3.5 rounded-xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-indigo-500" />
                      <span>ช่าง{barber.name}</span>
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold">
                      ผลงาน: {barber.cutsCount} หัว
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono text-slate-600">
                    <div className="flex justify-between">
                      <span>ส่วนแบ่งตัดผม:</span>
                      <span className="font-semibold text-slate-800">{formatBahtWithDecimals(barber.haircutCom)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ส่วนแบ่งเคมี:</span>
                      <span className="font-semibold text-slate-800">{formatBahtWithDecimals(barber.chemicalCom)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ค่าแนะนำสินค้าแชร์:</span>
                      <span className="font-semibold text-slate-800">{formatBahtWithDecimals(barber.productCom)}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>ทิปได้รับ:</span>
                      <span className="font-semibold">{formatBahtWithDecimals(barber.tipTotal)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200/50 text-sm font-bold font-sans text-indigo-700">
                      <span>ยอดสุทธิที่ช่างได้รับ:</span>
                      <span>{formatBahtWithDecimals(barber.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily payments metrics & counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100/50 text-left space-y-1">
                <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                  <span>💵 ยอดเงินสด</span>
                </span>
                <div className="text-2xl font-extrabold text-emerald-800 font-mono">
                  {formatBaht(dailyPaymentStats.cashAmount)}
                </div>
                <div className="text-[11px] text-emerald-600 font-sans">
                  ชำระทั้งหมด {dailyPaymentStats.cashCount} รายการ
                </div>
              </div>

              <div className="bg-sky-50/30 p-5 rounded-2xl border border-sky-100/50 text-left space-y-1">
                <span className="text-xs font-semibold text-sky-600 flex items-center space-x-1">
                  <span>📱 ยอดเงินโอน</span>
                </span>
                <div className="text-2xl font-extrabold text-sky-800 font-mono">
                  {formatBaht(dailyPaymentStats.transferAmount)}
                </div>
                <div className="text-[11px] text-sky-600 font-sans">
                  โอนผ่านสแกน {dailyPaymentStats.transferCount} รายการ
                </div>
              </div>

              <div className="bg-rose-50/20 p-5 rounded-2xl border border-rose-100/40 text-left space-y-1">
                <span className="text-xs font-semibold text-rose-600 flex items-center space-x-1">
                  <span>🔥 โปรโมชั่น/ส่วนลด</span>
                </span>
                <div className="text-2xl font-extrabold text-rose-700 font-mono">
                  {dailyPaymentStats.discountUsedCount} รายการ
                </div>
                <div className="text-[11px] text-rose-500 font-sans">
                  * ช่างส่วนแบ่งคงเดิมเต็มจำนวน
                </div>
              </div>

              <div className="bg-pink-50/40 p-5 rounded-2xl border border-pink-200/50 text-left space-y-1">
                <span className="text-xs font-semibold text-pink-600 flex items-center space-x-1">
                  <span>📉 ยอดจ่ายออก/เบิกเงิน</span>
                </span>
                <div className="text-2xl font-extrabold text-pink-800 font-mono">
                  {formatBaht(totalDailyExpensesAmount)}
                </div>
                <div className="text-[11px] text-pink-500 font-sans">
                  เบิกถอนหน้างาน {dailyExpenses.length} รายการ
                </div>
              </div>

              <div className="bg-violet-50/30 p-5 rounded-2xl border border-violet-100/50 text-left space-y-1">
                <span className="text-xs font-semibold text-violet-600 flex items-center space-x-1">
                  <span>💰 เงินสดคงเหลือส่งเงิน</span>
                </span>
                <div className="text-2xl font-extrabold text-violet-800 font-mono">
                  {formatBaht(dailyPaymentStats.cashAmount - totalDailyExpensesAmount)}
                </div>
                <div className="text-[11px] text-violet-500 font-sans">
                  * หลังหักค่าเบิกถอนรายวันแล้ว
                </div>
              </div>

            </div>

            {/* EXPORTS FOR DAILY BACKUP */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">สำรองข้อมูลสรุปประจำวัน (Backup Daily Report)</h4>
                <p className="text-[11px] text-slate-500">เลือกดาวน์โหลดไฟล์บัญชีเพื่อพิมพ์กระดาษ ส่งสำนักงานบัญชี หรือเก็บเข้าฐานข้อมูลส่วนกลาง</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownloadDaily('excel')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>MS Excel / CSV</span>
                </button>

                <button
                  onClick={() => handleDownloadDaily('word')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>MS Word</span>
                </button>

                <button
                  onClick={() => handleDownloadDaily('pdf')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <span className="w-3.5 h-3.5 font-bold text-[10px] bg-amber-100 text-amber-700 rounded flex items-center justify-center">PDF</span>
                  <span>พิมพ์รายงาน (PDF / HTML)</span>
                </button>

                <button
                  onClick={() => handleDownloadDaily('png')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>รูปภาพ (PNG / Graphic)</span>
                </button>
              </div>
            </div>

            {/* NEW SECTION: DAILY TRANSACTION LIST WITH PRECISE TIMESTAMPS FOR BANK SYNC */}
            <div className="space-y-4 pt-4 border-t border-slate-100/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>รายการธุรกรรมสำหรับการตรวจสอบเทียบแอปธนาคาร (Bank Comparison Sheet)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ตรวจสอบเวลาทำรายการ ความเข้ากันได้ของยอดเงินโอน และบริการที่ทำของแต่ละบิลย่อยแบบรายตัว
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  รวมทั้งหมด: {dailySales.length} ธุรกรรม
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-xs">
                <table className="w-full text-left border-collapse font-sans text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-[10px] font-bold font-sans tracking-wide border-b border-slate-100">
                      <th className="p-3 pl-5 w-16 text-center">ลำดับ</th>
                      <th className="p-3 text-left w-32 font-sans">🕒 เวลาโอน/จ่าย</th>
                      <th className="p-3 text-left w-32 font-sans">💈 ช่างผู้ให้บริการ / ลูกค้า</th>
                      <th className="p-3 text-left w-32 font-sans">💳 ช่องทาง</th>
                      <th className="p-3 text-left font-sans">🛒 รายละเอียดบริการ / สินค้า</th>
                      <th className="p-3 text-right pr-5 w-36 font-sans">💰 ยอดเงินลูกค้าจ่ายสุทธิ</th>
                      <th className="p-3 text-center w-40 font-sans">⚙️ จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 font-sans text-slate-700">
                    {sortedDailySales.map((sale, index) => {
                      const displayIndex = sortedDailySales.length - index;
                      const timeStr = formatLocalTime(sale.timestamp);
                      const isTransfer = sale.paymentMethod === 'transfer';
                      const jointSales = sale.groupPaymentId ? dailySales.filter(s => s.groupPaymentId === sale.groupPaymentId && s.id !== sale.id) : [];
                      
                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors font-sans">
                          {/* 1. Sequence */}
                          <td className="p-3 pl-5 text-center font-mono text-slate-400">
                            {displayIndex}
                          </td>
                          
                          {/* 2. Transaction Time */}
                          <td className="p-3 text-left font-mono font-bold text-slate-800 break-words">
                            <span className="inline-flex items-center space-x-1.5 text-[11px] bg-slate-100 text-indigo-950 px-2 py-0.5 rounded-lg border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              <span>{timeStr}</span>
                            </span>
                          </td>
                          
                          {/* 3. Barber Name */}
                          <td className="p-3 text-left font-medium text-slate-700">
                            <div className="font-bold">ช่าง{sale.barberName}</div>
                            {sale.customerName && (
                              <div className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5 w-max">
                                <span>👤 {sale.customerName}</span>
                              </div>
                            )}
                            {sale.groupPaymentId && (
                              <div className="text-[10px] text-sky-700 font-bold mt-1 flex flex-col gap-0.5 bg-sky-50 border border-sky-100/60 rounded p-1.5 max-w-xs" title={`รหัสกลุ่มโอนร่วม: ${sale.groupPaymentId}`}>
                                <span className="flex items-center gap-1 font-extrabold">
                                  🔗 โอนร่วม: "{sale.groupPaymentCode || 'โอนรวมกัน'}"
                                </span>
                                {jointSales.length > 0 && (
                                  <div className="text-[9px] text-slate-500 font-normal leading-tight pl-2 border-l border-sky-200 mt-0.5">
                                    ร่วมกับ: {jointSales.map(js => `ช่าง${js.barberName} ${js.customerName ? `(${js.customerName})` : ''} ฿${js.customerPaid}`).join(' + ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* 4. Payment Method */}
                          <td className="p-3 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                const nextMethod = isTransfer ? 'cash' : 'transfer';
                                if (onUpdateSale) {
                                  onUpdateSale(sale.id, {
                                    paymentMethod: nextMethod,
                                    groupPaymentId: nextMethod === 'cash' ? null as any : (sale.groupPaymentId || null as any),
                                    groupPaymentCode: nextMethod === 'cash' ? null as any : (sale.groupPaymentCode || null as any)
                                  });
                                } else if (onUpdateSalePaymentMethod) {
                                  onUpdateSalePaymentMethod(sale.id, nextMethod);
                                }
                              }}
                              className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                                isTransfer 
                                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200/80 hover:border-sky-300' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80 hover:border-emerald-300'
                              }`}
                              title="คลิกเพื่อแก้ไข/เลือกช่องทางชำระเงิน"
                            >
                              {isTransfer ? (
                                <span>📱 โอนเงินผ่านแบงก์</span>
                              ) : (
                                <span>💵 รับด้วยเงินสด</span>
                              )}
                              <span className="text-[10px] opacity-65 ml-0.5">🔄</span>
                            </button>
                          </td>
                          
                          {/* 5. Items breakdown */}
                          <td className="p-3 text-left max-w-xs sm:max-w-md">
                            <div className="flex flex-wrap gap-1">
                              {sale.haircutPrice > 0 && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100/60 font-sans">
                                  ตัดผม: {formatBaht(sale.haircutPrice)}
                                </span>
                              )}
                              {sale.chemicalPrice > 0 && (
                                <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-100/60 font-sans">
                                  งานเคมี: {sale.chemicalPromoName ? `${sale.chemicalPromoName} ` : ''}({formatBaht(sale.chemicalPrice)})
                                  {sale.chemicalDiscountAmount && sale.chemicalDiscountAmount > 0 ? ` (ลด -${formatBaht(sale.chemicalDiscountAmount)})` : ''}
                                </span>
                              )}
                              {sale.productName && sale.productPrice > 0 && (
                                <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-100/60 font-sans">
                                  สินค้า: {sale.productName} {sale.productQty && sale.productQty > 1 ? `(x${sale.productQty})` : ''} ({formatBaht(sale.productPrice)})
                                </span>
                              )}
                              {sale.tip > 0 && (
                                <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 font-semibold font-sans">
                                  ทิปช่าง: {formatBaht(sale.tip)}
                                </span>
                              )}
                              {sale.useDiscountPct10 && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-medium font-sans">
                                  ลด 10%
                                </span>
                              )}
                              {sale.useVoucherValue > 0 && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-medium font-sans">
                                  Voucher -{formatBaht(sale.useVoucherValue)}
                                </span>
                              )}
                            </div>
                            {sale.notes && (
                              <p className="text-[10px] text-slate-500 font-sans font-medium mt-1 leading-tight flex items-start gap-1 bg-amber-50/40 border border-amber-100/40 p-1 rounded-lg max-w-sm">
                                <span className="shrink-0 text-amber-600 font-bold">📝 หมายเหตุ:</span>
                                <span>{sale.notes}</span>
                              </p>
                            )}
                          </td>
                          
                          {/* 6. Amount Customer Paid */}
                          <td className="p-3 text-right pr-5 font-mono font-extrabold text-sm text-slate-950">
                            {formatBaht(sale.customerPaid)}
                          </td>

                          {/* 7. Action column */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setPaymentEditSale(sale);
                                }}
                                className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg hover:text-indigo-800 hover:shadow-xs font-semibold text-[11px] transition-all inline-flex items-center space-x-1 border border-indigo-200/50 cursor-pointer"
                                title="แก้ไขรายการขายนี้"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>แก้ไข</span>
                              </button>

                              <button
                                id={`delete-sale-${sale.id}`}
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    title: 'ยืนยันลบรายการขาย',
                                    message: `คุณต้องการลบรายการขายนี้ออกจากระบบใช่หรือไม่?\n\n- ยอดลูกค้าจ่าย: ${formatBaht(sale.customerPaid)}\n- ช่าง: ช่าง${sale.barberName}\n\nเมื่อยืนยัน ชาร์ตสถิติ ยอดคำนวณส่วนแบ่งช่าง และรายได้ของร้านสำหรับวันนี้และเดือนนี้จะปรับลดโดยทันที`,
                                    onConfirm: () => {
                                      onDeleteSale?.(sale.id);
                                    }
                                  });
                                }}
                                className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg hover:text-rose-700 hover:shadow-xs font-semibold text-[11px] transition-all inline-flex items-center space-x-1 border border-rose-200/50 cursor-pointer"
                                title="ลบรายการขายนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ลบ</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================== */}
      {/* SECTION 2: MONTHLY REPORT */}
      {/* ========================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        
        {/* Header containing month selection */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingUp className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-xl font-extrabold text-slate-800">2. ยอดขายและบัญชีสะสมรายเดือน (Real-time)</h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 mt-1">
              <p className="text-xs text-slate-500">
                สำรวจรายได้ของร้านตัดผมหลังหักส่วนแบ่งช่างและสรุปงบประมาณสะสม
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 self-start">
                📅 ช่วงรอบบิล: {formatThaiDate(billingCycleRange.startDate)} - {formatThaiDate(billingCycleRange.endDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-600">เลือกเดือน:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl outline-none bg-white text-sm font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatThaiMonth(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {monthlySales.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Calculator className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-semibold">ไม่พบข้อมูลยอดสะสมในรอบเดือน {formatThaiMonth(selectedMonth)}</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top KPIs Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-left relative overflow-hidden sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <div className="absolute right-3 top-3 opacity-15"><Coins className="w-10 h-10 text-emerald-400" /></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ยอดชำระสะสมรวม</span>
                <div className="text-lg font-extrabold text-emerald-400 mt-1 font-mono">
                  {formatBaht(monthlyOverallStats.totalCustomerPaid)}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  มูลค่ารวมก่อนแบ่งช่าง
                </div>
              </div>

              <div className="bg-indigo-950 text-white p-5 rounded-2xl border border-indigo-900 text-left relative overflow-hidden xl:col-span-1">
                <div className="absolute right-2 top-2 opacity-15"><TrendingUp className="w-10 h-10 text-amber-300" /></div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">รายได้สุทธิร้านสะสม</span>
                <div className="text-lg font-extrabold text-amber-300 mt-1 font-mono">
                  {formatBaht(monthlyOverallStats.shopRevenue)}
                </div>
                <div className="text-[9px] text-indigo-300 mt-0.5">
                  หักคอมค่าแรงแบ่งช่างแล้ว
                </div>
              </div>

              <div className="bg-rose-950 text-white p-5 rounded-2xl border border-rose-900 text-left relative overflow-hidden xl:col-span-1">
                <div className="absolute right-2 top-2 opacity-15 animate-bounce"><ArrowDownCircle className="w-10 h-10 text-pink-300" /></div>
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wide">รวมรายจ่ายทั้งเดือน</span>
                <div className="text-lg font-extrabold text-pink-300 mt-1 font-mono">
                  {formatBaht(totalMonthlyExpensesAmount)}
                </div>
                <div className="text-[9px] text-rose-300 mt-0.5">
                  เบิกจ่ายถอนสะสมรอบเดือน
                </div>
              </div>

              <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-900 text-left relative overflow-hidden xl:col-span-1">
                <div className="absolute right-2 top-2 opacity-15"><TrendingUp className="w-10 h-10 text-emerald-300 animate-pulse" /></div>
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">กำไรบริสุทธิ์ของร้าน</span>
                <div className="text-lg font-semibold text-emerald-400 mt-1 font-mono hover:text-emerald-300 transition-colors">
                  {formatBaht(monthlyOverallStats.shopRevenue - totalMonthlyExpensesAmount)}
                </div>
                <div className="text-[9px] text-emerald-300 mt-0.5">
                  กำไรสุทธิหลังหักจ่ายครบชุด
                </div>
              </div>

              <div className="bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-200 text-left xl:col-span-1 relative overflow-hidden shadow-sm scale-[1.02] ring-4 ring-indigo-50/50">
                <div className="absolute right-2 top-2 opacity-10"><Users className="w-8 h-8 text-indigo-600" /></div>
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">เฉลี่ยหัวต่อวัน (ปัดเศษขึ้น)</span>
                <div className="text-2xl font-black text-indigo-600 mt-1 font-mono flex items-baseline gap-1">
                  <span>{Math.ceil(monthlyOverallStats.avgCutsPerDay)}</span>
                  <span className="text-xs font-bold text-indigo-700">หัว/วัน</span>
                </div>
                <div className="mt-2 pt-1.5 border-t border-indigo-100">
                  <div className="text-[9px] text-slate-500 font-bold">จำนวนหัวที่ตัดรวมทั้งหมด: <span className="font-mono text-slate-700 font-bold">{monthlyOverallStats.totalCuts} หัว</span></div>
                </div>
              </div>

              <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 text-left xl:col-span-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">เงินสดสะสมรวม</span>
                <div className="text-lg font-extrabold text-emerald-800 mt-1 font-mono">
                  {formatBaht(monthlyOverallStats.cashAmount)}
                </div>
                <div className="text-[9px] text-emerald-600 mt-0.5">
                  รวม {monthlyOverallStats.cashCount} บิลเงินสด
                </div>
              </div>

              <div className="bg-sky-50/40 p-5 rounded-2xl border border-sky-100 text-left xl:col-span-1">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wide">เงินสดหักจ่ายคงถอน</span>
                <div className="text-lg font-extrabold text-sky-800 mt-1 font-mono">
                  {formatBaht(monthlyOverallStats.cashAmount - totalMonthlyExpensesAmount)}
                </div>
                <div className="text-[9px] text-sky-600 mt-0.5">
                  * หลังหักค่าเบิกจ่ายสะสม
                </div>
              </div>

            </div>

            {/* ยอดขายแบบแยกย่อย (Breakdown) รายเดือน */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                    <span className="p-1 bg-indigo-500/10 text-indigo-600 rounded">
                      <Calculator className="w-4 h-4" />
                    </span>
                    <span>📊 สัดส่วนรายได้แยกประเภท (ยอดสะสมรายเดือน)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">ยอดรวมและสัดส่วนรายได้สะสมประจำเดือน {formatThaiMonth(selectedMonth)}</p>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-xs">
                  ยอดสะสมรวม: <span className="font-mono text-indigo-600 font-black">{formatBaht(monthlyBreakdown.combinedTotal)}</span>
                </div>
              </div>

              {/* Progress Bar Proportion */}
              {monthlyBreakdown.combinedTotal > 0 ? (
                <div className="space-y-4">
                  <div className="h-3.5 w-full bg-slate-200/50 rounded-full overflow-hidden flex shadow-inner border border-slate-100">
                    {monthlyBreakdown.haircutTotal > 0 && (
                      <div 
                        style={{ width: `${monthlyBreakdown.haircutPct}%` }} 
                        className="bg-indigo-600 h-full transition-all duration-500 hover:opacity-90" 
                        title={`ค่าตัดผมสะสม: ${formatBaht(monthlyBreakdown.haircutTotal)} (${monthlyBreakdown.haircutPct.toFixed(1)}%)`}
                      />
                    )}
                    {monthlyBreakdown.chemicalTotal > 0 && (
                      <div 
                        style={{ width: `${monthlyBreakdown.chemicalPct}%` }} 
                        className="bg-pink-500 h-full transition-all duration-500 hover:opacity-90" 
                        title={`บริการเคมีสะสม: ${formatBaht(monthlyBreakdown.chemicalTotal)} (${monthlyBreakdown.chemicalPct.toFixed(1)}%)`}
                      />
                    )}
                    {monthlyBreakdown.productTotal > 0 && (
                      <div 
                        style={{ width: `${monthlyBreakdown.productPct}%` }} 
                        className="bg-amber-500 h-full transition-all duration-500 hover:opacity-90" 
                        title={`ขายสินค้าสะสม: ${formatBaht(monthlyBreakdown.productTotal)} (${monthlyBreakdown.productPct.toFixed(1)}%)`}
                      />
                    )}
                  </div>

                  {/* 3-Column Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Haircut Card */}
                    <div className="bg-white border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">ยอดสะสมค่าตัดผม</p>
                          <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatBaht(monthlyBreakdown.haircutTotal)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">{monthlyBreakdown.haircutPct.toFixed(1)}%</span>
                    </div>

                    {/* Chemical Card */}
                    <div className="bg-white border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">ยอดบริการเคมีสะสม</p>
                          <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatBaht(monthlyBreakdown.chemicalTotal)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md font-mono">{monthlyBreakdown.chemicalPct.toFixed(1)}%</span>
                    </div>

                    {/* Product Card */}
                    <div className="bg-white border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">ยอดขายสินค้าสะสม</p>
                          <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatBaht(monthlyBreakdown.productTotal)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-mono">{monthlyBreakdown.productPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลสัดส่วนเนื่องจากยังไม่มียอดขายบันทึกไว้ในเดือนนี้</p>
              )}
            </div>

            {/* Monthly Profitability Bar/Line Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span>📈 วิเคราะห์รายรับ รายจ่าย และกำไรสุทธิสะสมรายเดือน (Monthly Net Profitability Chart)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    เปรียบเทียบสถิติรวมของทุกเดือนเพื่อช่วยฝ่ายบัญชีประเมินกระแสเงินสด ค่าใช้จ่าย และยอดกำไรบริสุทธิ์หลังจัดแบ่งช่างเรียบร้อยแล้ว
                  </p>
                </div>
                
                {/* Chart Controls */}
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setChartConfig(prev => ({ ...prev, showCustomerPaid: !prev.showCustomerPaid }))}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                      chartConfig.showCustomerPaid 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>ยอดลูกค้าจ่ายทั้งหมด</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setChartConfig(prev => ({ ...prev, showShopRevenue: !prev.showShopRevenue }))}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                      chartConfig.showShopRevenue 
                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>รายได้สุทธิส่วนของร้าน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChartConfig(prev => ({ ...prev, showExpenses: !prev.showExpenses }))}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                      chartConfig.showExpenses 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>ค่าใช้จ่าย/เบิกหน้าร้าน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChartConfig(prev => ({ ...prev, showNetProfit: !prev.showNetProfit }))}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                      chartConfig.showNetProfit 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>กำไรสุทธิส่วนร้าน</span>
                  </button>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyComparisonData}
                    margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="displayLabel" 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {chartConfig.showCustomerPaid && (
                      <Bar 
                        name="ยอดลูกค้าจ่ายรวมทั้งหมด" 
                        dataKey="customerPaid" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={28}
                      />
                    )}
                    
                    {chartConfig.showShopRevenue && (
                      <Bar 
                        name="รายได้เข้าร้านสุทธิ" 
                        dataKey="shopRevenue" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={28}
                      />
                    )}

                    {chartConfig.showExpenses && (
                      <Bar 
                        name="รายจ่ายสะสม" 
                        dataKey="expenses" 
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={28}
                      />
                    )}

                    {chartConfig.showNetProfit && (
                      <Line 
                        name="กำไรบริสุทธิ์ส่วนของร้าน" 
                        type="monotone" 
                        dataKey="netProfit" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 1, fill: '#ffffff', stroke: '#10b981' }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Barber Salary Breakdown Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span>สรุปยอดเงินเดือนสะสมที่ต้องโอนจ่ายช่างตัดผม (Salary / Payout Sheet)</span>
              </h3>
              
              <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-bold font-sans tracking-wide">
                      <th className="p-4 pl-6">ช่างตัดผม</th>
                      <th className="p-4 text-center">ผลงานรวม (หัว)</th>
                      <th className="p-4 text-right">ส่วนแบ่งตัดผม (สะสม)</th>
                      <th className="p-4 text-right">ส่วนแบ่งเคมี (สะสม)</th>
                      <th className="p-4 text-right">ส่วนแบ่งสินค้าสะสม</th>
                      <th className="p-4 text-right text-rose-600">ทิปสะสมได้รับเต็ม</th>
                      <th className="p-4 text-right pr-6 bg-slate-100/40 text-slate-900">ยอดที่ต้องจ่ายจริง</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 font-mono text-slate-700">
                    {monthlyBarberStats.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-800 font-sans">ช่าง{b.name}</td>
                        <td className="p-4 text-center font-bold text-indigo-600">{b.cutsCount} หัว</td>
                        <td className="p-4 text-right">{formatBahtWithDecimals(b.haircutCom)}</td>
                        <td className="p-4 text-right">{formatBahtWithDecimals(b.chemicalCom)}</td>
                        <td className="p-4 text-right">{formatBahtWithDecimals(b.productCom)}</td>
                        <td className="p-4 text-right text-rose-500 font-semibold">{formatBahtWithDecimals(b.tipTotal)}</td>
                        <td className="p-4 text-right pr-6 font-extrabold text-indigo-700 bg-slate-50/40 text-sm">{formatBahtWithDecimals(b.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EXPORTS FOR MONTHLY BACKUP */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">ดาวน์โหลดสรุปวิเคราะห์ทางการเงินรายเดือน (Backup Monthly Balance Sheet)</h4>
                <p className="text-[11px] text-slate-500">เก็บสถิติตลอดทั้งเดือนในรูปแบบมาตรฐาน เพื่อนำส่งรายงานภาษีหรือปิดยอดปีอย่างเป็นทางการ</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadMonthly('excel')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>MS Excel / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMonthly('word')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>MS Word</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMonthly('pdf')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <span className="w-3.5 h-3.5 font-bold text-[10px] bg-amber-100 text-amber-700 rounded flex items-center justify-center">PDF</span>
                  <span>พิมพ์รายงาน (PDF / HTML)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMonthly('png')}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>รูปภาพ (PNG / Graphic)</span>
                </button>
              </div>
            </div>

            {/* ========================================================== */}
            {/* NEW SECTION 1.5: STORE EXPENSES & RETRIEVAL JOURNAL */}
            {/* ========================================================== */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
              
              {/* Header containing dropdown to filter daily report */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                      <ArrowDownCircle className="w-5 h-5 animate-bounce" />
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-800">บัญชีควบคุมรายจ่ายและเบิกเงินหน้าร้าน</h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    ลงบันทึกค่าใช้จ่าย ซื้ออุปกรณ์เช็ดถู หรือการเบิกเงินสดฉุกเฉินระดับแสน/ล้านของเจ้าของร้าน เพื่อระบบตัดส่งกำไรที่สมบูรณ์
                  </p>
                </div>
                <div className="text-xs text-rose-600 bg-rose-50 px-3 py-1 rounded-full font-bold">
                  ประจำวันที่เลือก: {formatThaiDate(selectedDate)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* L: Add Expense Form Panel */}
                <form onSubmit={handleAddExpense} className="lg:col-span-12 xl:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 text-left">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2 pb-2 border-b border-slate-200">
                    <PlusCircle className="w-4 h-4 text-rose-500" />
                    <span>✍️ ลงบันทึกรายจ่ายวันนี้ / Add Expense Entry</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่รายจ่าย *</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value as any)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-sans cursor-pointer"
                      >
                        <option value="supplies">🛒 ซื้อวัสดุ/อุปกรณ์เข้าร้าน (Shop Supplies)</option>
                        <option value="utilities">⚡ ค่าน้ำ-ไฟ-อินเทอร์เน็ต (Utilities)</option>
                        <option value="rent">🏢 ค่าเช่าสถานที่/ค่ามัดจำ (Shop Rent)</option>
                        <option value="marketing">📢 ค่าทำโฆษณา/โปรโมทเพจ (Marketing)</option>
                        <option value="salary">🧑‍🔧 สวัสดิการ/ค่าแรงช่างพิเศษ (Specialist Wage)</option>
                        <option value="loans">💰 เบิกถอนเงินโดยเจ้าของร้าน (Owner Cash Outflow)</option>
                        <option value="other">☕ อื่น ๆ / เบ็ดเตล็ดสัญจร (Miscellaneous)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">วันที่ทำรายการ *</label>
                        <input
                          type="date"
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="w-full bg-white text-slate-800 font-mono text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">จำนวนเงิน (บาท) *</label>
                        <input
                          type="number"
                          step="any"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          placeholder="ใส่ตัวเลข เช่น 500 หรือ 1000000"
                          className="w-full bg-white text-slate-800 font-mono font-bold text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-rose-700"
                          required
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">ผู้รับเงิน / ผู้เบิกถอนเงินสด (Payee)</label>
                      <input
                        type="text"
                        value={expensePayee}
                        onChange={(e) => setExpensePayee(e.target.value)}
                        placeholder="เช่น ช่างเจ, บจก.โฮมโปร, เจ้าของร้านใหญ่"
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">รายละเอียดหมายเหตุ * (Audit Notes)</label>
                      <textarea
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        placeholder="เช่น ซื้อแชมพูสระผม 5 ขวดใหญ่, เบิกถอนปันส่วนล้านไปเปิดสาขาใหม่"
                        className="w-full h-20 bg-white text-slate-800 text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 resize-none font-sans"
                        required
                      ></textarea>
                    </div>

                    <div className="flex items-center space-x-2 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl">
                      <input
                        type="checkbox"
                        id="expenseIsFromDrawer"
                        checked={expenseIsFromDrawer}
                        onChange={(e) => setExpenseIsFromDrawer(e.target.checked)}
                        className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                      />
                      <label htmlFor="expenseIsFromDrawer" className="text-[11px] font-bold text-rose-900 cursor-pointer select-none flex flex-col font-sans">
                        <span>💵 ถอน/จ่ายออกด้วยเงินสดจากลิ้นชัก (เก๊ะเงินหน้าร้าน)</span>
                        <span className="text-[9px] text-rose-600/75 font-normal">ระบบจะหักลด "ยอดเงินสดคงในเก๊ะเครื่อง" ของวันนั้นให้อัตโนมัติ</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-1">
                    <button
                      type="button"
                      onClick={handlePushToDraft}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer font-sans"
                      title="เพิ่มรายการนี้เข้าไปในรายการร่างชั่วคราวก่อน เพื่อบันทึกหลายรายการพร้อมกัน"
                    >
                      <Plus className="w-4 h-4" />
                      <span>➕ เพิ่มเข้ารายการร่าง</span>
                    </button>

                    <button
                      type="submit"
                      className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shadow-sm hover:shadow-md cursor-pointer font-sans"
                      title="ลงบันทึกรายการนี้เป็นรายจ่ายสดเข้าฐานข้อมูลทันที"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                      <span>💾 บันทึกด่วนทันที</span>
                    </button>
                  </div>

                  {/* List of Drafted Items Pending Commit */}
                  {draftExpenses.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-3 text-left">
                      <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                        <span className="text-xs font-bold text-amber-800 flex items-center space-x-1">
                          <span>📋 รายการร่างที่เตรียมบันทึก ({draftExpenses.length} รายการ)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftExpenses([])}
                          className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {draftExpenses.map((draft, idx) => {
                          let catText = '';
                          if (draft.category === 'supplies') catText = 'ซื้อของ';
                          else if (draft.category === 'utilities') catText = 'น้ำไฟเน็ต';
                          else if (draft.category === 'rent') catText = 'เช่าที่';
                          else if (draft.category === 'marketing') catText = 'โฆษณา';
                          else if (draft.category === 'salary') catText = 'ช่วยช่าง';
                          else if (draft.category === 'loans') catText = 'เบิกเจ้าของ';
                          else catText = 'เบ็ดเตล็ด';

                          return (
                            <div key={draft.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-200/50 text-[11px] hover:border-amber-300 transition-colors">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-800 flex items-center space-x-1 flex-wrap font-sans">
                                  <span className="text-[9px] px-1 bg-slate-100 text-slate-600 rounded">#{idx+1}</span>
                                  <span className="text-amber-700 font-bold">[{catText}]</span>
                                  <span className="font-mono text-xs">{formatBaht(draft.amount)}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 max-w-[180px] truncate" title={draft.notes}>
                                  {draft.notes} {draft.payee ? `(${draft.payee})` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDraftExpenses(prev => prev.filter(d => d.id !== draft.id))}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveAllDrafts}
                        className="w-full mt-1 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm hover:shadow-md cursor-pointer animate-pulse font-sans"
                      >
                        <BookmarkCheck className="w-4 h-4" />
                        <span>บันทึก {draftExpenses.length} รายการร่างลงฐานข้อมูลทั้งหมด</span>
                      </button>
                    </div>
                  )}
                </form>

                {/* R: Current Daily Expenses List Table */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-4 text-left">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>📋 รายการเบิกจ่ายของร้าน ประจำวันที่ {formatThaiDate(selectedDate)}</span>
                  </h3>

                  {dailyExpenses.length === 0 ? (
                    <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
                      <span className="text-2xl">🌱</span>
                      <p className="text-xs font-semibold text-slate-500 font-sans">ไม่พบรายการเบิกจ่ายเงินในวันนี้</p>
                      <p className="text-[10px] text-slate-400 font-sans">เมื่อมีการซื้อของ ค่าน้ำไฟ หรือเบิกเงินทุน ให้บันทึกงบการเงินทางเมนูด้านซ้ายเพื่อปิดกำไรที่ถูกต้อง</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-xs">
                        <table className="w-full text-left border-collapse text-xs font-sans">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                              <th className="p-3 pl-4">หมวดหมู่รายจ่าย</th>
                              <th className="p-3">ผู้เบิกถอน/รับ</th>
                              <th className="p-3">บันทึกหมายเหตุ</th>
                              <th className="p-3 text-right">จำนวนเงิน</th>
                              <th className="p-3 text-center">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dailyExpenses.map((exp) => {
                              let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                              let catText = "อื่น ๆ";
                              
                              if (exp.category === 'supplies') { 
                                badgeStyle = "bg-blue-50 text-blue-700 border-blue-100";
                                catText = "ซื้อของเข้าร้าน";
                              } else if (exp.category === 'utilities') {
                                badgeStyle = "bg-orange-50 text-orange-700 border-orange-100";
                                catText = "ค่าน้ำ-ไฟ-อินเทอร์เน็ต";
                              } else if (exp.category === 'rent') {
                                badgeStyle = "bg-purple-50 text-purple-700 border-purple-100";
                                catText = "ค่าเช่าสถานที่";
                              } else if (exp.category === 'marketing') {
                                badgeStyle = "bg-pink-50 text-pink-700 border-pink-100";
                                catText = "ค่าโฆษณาเพจ";
                              } else if (exp.category === 'salary') {
                                badgeStyle = "bg-teal-50 text-teal-700 border-teal-100";
                                catText = "สวัสดิการ/ค่าแรงพิเศษ";
                              } else if (exp.category === 'loans') {
                                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 font-bold";
                                catText = "เบิกถอนเจ้าของ 💸";
                              }

                              return (
                                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 pl-4">
                                    <span className={`inline-block px-2 py-0.5 border text-[10px] rounded-lg font-bold ${badgeStyle}`}>
                                      {catText}
                                    </span>
                                    {exp.isFromDrawer !== false && (
                                      <span className="block text-[8px] text-rose-600 font-extrabold mt-0.5 bg-rose-50 text-center px-1 rounded border border-rose-100 max-w-[70px]">
                                        📥 หักในเก๊ะ
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-800">{exp.payee || 'ทางหักร้านทั่วไป'}</td>
                                  <td className="p-3 text-slate-500 max-w-[160px] truncate" title={exp.notes}>
                                    {exp.notes}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-rose-600">
                                    {formatBaht(exp.amount)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="ลบรายการนี้"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Bottom Balance Card Sheet */}
                      <div className="grid grid-cols-2 gap-3 bg-rose-50/20 p-4 rounded-xl border border-rose-100/50">
                        <div className="space-y-0.5 text-left">
                          <div className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">รวมเงินเบิกจ่ายวันนี้ (Today Total Outflow)</div>
                          <div className="text-base font-extrabold text-rose-700 font-mono">
                            {formatBaht(totalDailyExpensesAmount)}
                          </div>
                        </div>
                        <div className="space-y-0.5 text-left border-l border-rose-200/40 pl-4">
                          <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider font-sans">ค่านำส่งสดจริงหน้าร้าน (Net Cash Leftover)</div>
                          <div className="text-base font-extrabold text-indigo-800 font-mono">
                            {formatBaht(Math.max(0, dailyPaymentStats.cashAmount - totalDailyExpensesAmount))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* HISTORICAL PAYSLIPS SECTION */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4 shadow-sm" id="historical-payslips-archive">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>แฟ้มข้อมูลประวัติใบแจ้งสลิปเงินเดือนสะสม (Historical Payslips Archive)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ค้นหา ตรวจสอบ และสั่งพิมพ์ใบสำคัญย้อนหลังได้ตลอดเวลา ค้ำประกันความถูกต้องทางยอดบัญชี
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Select month */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">งวดเดือน:</span>
                    <select
                      id="hist-payslip-month-select"
                      value={historySelectedMonth}
                      onChange={(e) => setHistorySelectedMonth(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs font-semibold focus:ring-1 focus:ring-slate-800 outline-none text-slate-700 min-w-[120px] cursor-pointer"
                    >
                      <option value="all">แสดงทุกงวดเดือน</option>
                      {archivedMonths.map(m => (
                        <option key={m} value={m}>{formatThaiMonth(m)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select barber */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">ช่างประจํา:</span>
                    <select
                      id="hist-payslip-barber-select"
                      value={historySelectedBarberId}
                      onChange={(e) => setHistorySelectedBarberId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs font-semibold focus:ring-1 focus:ring-slate-800 outline-none text-slate-700 min-w-[120px] cursor-pointer"
                    >
                      <option value="all">เลือกช่างทุกคน</option>
                      {archivedBarbers.map(b => (
                        <option key={b.id} value={b.id}>ช่าง{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Slips table */}
              {(() => {
                const filtered = payslips.filter(s => {
                  const matchMonth = historySelectedMonth === 'all' || s.month === historySelectedMonth;
                  const matchBarber = historySelectedBarberId === 'all' || s.barberId === historySelectedBarberId;
                  return matchMonth && matchBarber;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                      <div className="text-slate-400">📭 ยังไม่มีการบันทึกประวัติสลิปเงินเดือนช่างของช่วงเวลาที่เลือก</div>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                        ผู้ดูแลระบบสามารถเลือกช่าง กรอกรายการคำนวณเงินประกัน ค่าเบิกล่วงหน้า และกดปุ่ม <b>"💾 บันทึกประวัติสลิปเงินเดือนลงระบบ"</b> ด้านบน เพื่อจัดเก็บประวัติสลิปไว้ในสถิติถาวร
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold font-sans tracking-wide">
                          <th className="p-4 pl-6">รอบงวดเวลา</th>
                          <th className="p-4">ชื่อช่าง</th>
                          <th className="p-4 text-right">รายได้ขั้นต่ำสะสม</th>
                          <th className="p-4 text-right">ยอดหักจ่ายรวม</th>
                          <th className="p-4 text-right text-indigo-700">ยอดเงินจ่ายสุทธิ / Net Pay</th>
                          <th className="p-4 text-center pr-6">การกระทำ</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-100 font-mono text-slate-700">
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
                            <td className="p-4 text-right font-extrabold text-emerald-600 bg-emerald-50/30">
                              {formatBaht(s.netPaid)}
                            </td>
                            <td className="p-4 text-center pr-6 flex items-center justify-center space-x-2 font-sans">
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
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>พิมพ์ใบสำคัญย้อนหลัง</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleDeletePayslip(s.id)}
                                className="flex items-center space-x-1 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                title="ลบประวัติถาวร"
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

          </div>
        )}

      </div>

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start space-x-3">
                {confirmDialog.isSave ? (
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <BookmarkCheck className="w-6 h-6 animate-pulse" />
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-bold text-slate-900 font-sans leading-snug">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans whitespace-pre-line leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
               <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer ${
                  confirmDialog.confirmBtnClass || 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white'
                }`}
              >
                {confirmDialog.confirmText || 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Method Selector Modal */}
      {paymentEditSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-center space-y-1.5 border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 font-sans leading-snug">
                  ✏️ แก้ไขข้อมูลบันทึกบริการ
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  รหัสบิล: <span className="font-semibold text-slate-700">#{paymentEditSale.id.slice(-6)}</span> • ยอดชำระจริง: <span className="font-bold text-slate-800">{formatBaht(paymentEditSale.customerPaid)}</span>
                </p>
              </div>

              {/* 1. Barber Selection and Customer Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">💈 ช่างผู้ให้บริการ</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-sans text-slate-800 cursor-pointer"
                    value={paymentEditSale.barberId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const b = barbers.find(x => x.id === selectedId);
                      if (b) {
                        setPaymentEditSale(prev => prev ? {
                          ...prev,
                          barberId: selectedId,
                          barberName: b.name
                        } : null);
                      }
                    }}
                  >
                    {barbers.map(b => (
                      <option key={b.id} value={b.id}>ช่าง {b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">👤 ชื่อผู้ใช้บริการ</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-sans text-slate-800"
                    value={paymentEditSale.customerName || ''}
                    onChange={(e) => setPaymentEditSale(prev => prev ? { ...prev, customerName: e.target.value } : null)}
                    placeholder="ไม่ได้ระบุชื่อลูกค้า (ลูกค้าทั่วไป)"
                  />
                </div>
              </div>

              {/* 2. Prices & Tips 2x2 Grid */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="block text-xs font-bold text-slate-800">💰 รายการราคาและทิป (บาท)</span>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">ค่าตัดผม</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-mono text-slate-800"
                      value={paymentEditSale.haircutPrice}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        const calculated = recalculateSaleFinancials(paymentEditSale, { haircutPrice: val });
                        setPaymentEditSale(prev => prev ? { ...prev, ...calculated } : null);
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">ค่าบริการเคมี</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-mono text-slate-800"
                      value={paymentEditSale.chemicalPrice}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        const calculated = recalculateSaleFinancials(paymentEditSale, { chemicalPrice: val });
                        setPaymentEditSale(prev => prev ? { ...prev, ...calculated } : null);
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">ค่าสินค้า</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-mono text-slate-800"
                      value={paymentEditSale.productPrice}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        const calculated = recalculateSaleFinancials(paymentEditSale, { productPrice: val });
                        setPaymentEditSale(prev => prev ? { ...prev, ...calculated } : null);
                      }}
                    />
                  </div>

                  {paymentEditSale.productName && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">จำนวนสินค้า (ชิ้น)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-mono text-slate-800"
                        value={paymentEditSale.productQty || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setPaymentEditSale(prev => prev ? { ...prev, productQty: val } : null);
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">ทิปช่าง</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-mono text-slate-800"
                      value={paymentEditSale.tip}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        const calculated = recalculateSaleFinancials(paymentEditSale, { tip: val });
                        setPaymentEditSale(prev => prev ? { ...prev, ...calculated } : null);
                      }}
                    />
                  </div>
                </div>

                {/* Live calculation feedback preview badge */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px] font-sans">
                  <div className="text-slate-600 flex justify-between">
                    <span>ยอดรวมบริการ:</span>
                    <span className="font-semibold text-slate-800">{formatBaht(paymentEditSale.subtotal)}</span>
                  </div>
                  <div className="text-rose-600 flex justify-between">
                    <span>หักส่วนลด:</span>
                    <span className="font-semibold">-{formatBaht(paymentEditSale.discountAmount)}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>ช่างได้ส่วนแบ่ง:</span>
                    <span className="font-bold text-indigo-700">{formatBaht(paymentEditSale.barberTotalShare)}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>ร้านได้ส่วนแบ่ง:</span>
                    <span className="font-bold text-teal-700">{formatBaht(paymentEditSale.shopTotalShare)}</span>
                  </div>
                </div>
              </div>

              {/* Notes input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">📝 โน้ต/บันทึกช่วยจำ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400 font-sans text-slate-800"
                  value={paymentEditSale.notes || ''}
                  onChange={(e) => setPaymentEditSale(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="ไม่มีบันทึกข้อความ"
                />
              </div>

              {/* Selection blocks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">💰 ช่องชำระเงิน</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cash option block */}
                  <button
                    type="button"
                    onClick={() => setPaymentEditSale(prev => prev ? { ...prev, paymentMethod: 'cash' } : null)}
                    className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      paymentEditSale.paymentMethod === 'cash'
                        ? 'bg-emerald-50/75 border-emerald-500 text-emerald-800 shadow-xs font-semibold'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-100/50'
                    }`}
                  >
                    <span className="text-base">💵</span>
                    <span className="text-xs font-bold font-sans">รับด้วยเงินสด</span>
                  </button>

                  {/* Transfer option block */}
                  <button
                    type="button"
                    onClick={() => setPaymentEditSale(prev => prev ? { ...prev, paymentMethod: 'transfer' } : null)}
                    className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      paymentEditSale.paymentMethod === 'transfer'
                        ? 'bg-sky-50/75 border-sky-500 text-sky-800 shadow-xs font-semibold'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-100/50'
                    }`}
                  >
                    <span className="text-base">📱</span>
                    <span className="text-xs font-bold font-sans">โอนเงินผ่านแบงก์</span>
                  </button>
                </div>
              </div>

              {/* Joint Transfer section */}
              {paymentEditSale.paymentMethod === 'transfer' && (
                <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/80 space-y-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-sky-950 font-sans">
                      🔗 ตั้งค่าการโอนร่วมกัน (1 สลิปจ่ายรวมกันหลายบิล)
                    </span>
                  </div>

                  {paymentEditSale.groupPaymentId ? (
                    // Already in a group
                    <div className="space-y-3 bg-white p-3 rounded-xl border border-sky-100 shadow-xs">
                      <div className="p-2.5 bg-sky-50 rounded-lg text-xs text-sky-900 border border-sky-100">
                        <span className="font-bold block">🔗 บิลนี้กำลังเชื่อมโยงการโอนร่วมกัน</span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          บิลอื่นในกลุ่มเดียวกัน: {dailySales
                            .filter(s => s.groupPaymentId === paymentEditSale.groupPaymentId && s.id !== paymentEditSale.id)
                            .map(s => `ช่าง${s.barberName} - ${s.customerName || 'ทั่วไป'} (฿${s.customerPaid})`)
                            .join(', ') || 'ไม่มีบิลร่วมตัวอื่น'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">🏷️ แก้ไขชื่อ/ป้ายกำกับกลุ่มโอนร่วม</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-400 font-sans text-slate-800"
                          value={editGroupLabel}
                          onChange={(e) => setEditGroupLabel(e.target.value)}
                          placeholder="เช่น พ่อ+ลูก, โอนร่วมโต๊ะ 1"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentEditSale(prev => prev ? { ...prev, groupPaymentId: undefined, groupPaymentCode: undefined } : null);
                          setEditGroupLabel('');
                        }}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        ❌ ยกเลิกการโอนร่วม (แยกออกเป็นบิลโอนเดี่ยว)
                      </button>
                    </div>
                  ) : (
                    // Single transfer - show link options
                    <div className="space-y-3 bg-white p-3 rounded-xl border border-sky-100 shadow-xs">
                      {dailySales.filter(s => s.paymentMethod === 'transfer' && s.id !== paymentEditSale.id).length === 0 ? (
                        <p className="text-[11px] text-slate-500 font-medium">
                          💡 ไม่มีบิลโอนใบอื่นของวันที่ {formatThaiDate(paymentEditSale.date)} ในวันนี้เพื่อนำมาจัดกลุ่มโอนร่วมกัน
                        </p>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">🔗 เลือกบิลอื่นของวันนี้ที่จะจับคู่โอนร่วมกัน</label>
                            <div className="relative">
                              <select
                                value={editPairSaleId}
                                onChange={(e) => setEditPairSaleId(e.target.value)}
                                className="w-full pl-3 pr-8 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-400 font-sans text-slate-700 cursor-pointer appearance-none"
                              >
                                <option value="">-- โอนเดี่ยว (ไม่ได้โอนร่วมกับใคร) --</option>
                                {dailySales
                                  .filter(s => s.paymentMethod === 'transfer' && s.id !== paymentEditSale.id)
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      ช่าง{s.barberName} - {s.customerName || 'ลูกค้าทั่วไป'} ({formatBaht(s.customerPaid)}) {s.groupPaymentId ? `[กลุ่ม: ${s.groupPaymentCode}]` : ''}
                                    </option>
                                  ))}
                              </select>
                              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 text-[10px]">
                                ▼
                              </div>
                            </div>
                          </div>

                          {editPairSaleId && (
                            <div className="space-y-1 animate-fade-in">
                              <label className="text-[10px] font-bold text-slate-500 block">🏷️ ตั้งชื่อกลุ่มโอนร่วมกัน (ไม่บังคับ)</label>
                              <input
                                type="text"
                                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-400 font-sans text-slate-800"
                                value={editGroupLabel}
                                onChange={(e) => setEditGroupLabel(e.target.value)}
                                placeholder="เช่น คุณพ่อ+คุณลูก, สลิป 850 บาท"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-800 font-sans leading-relaxed text-center">
                ⚠️ หลังปรับปรุงระบบจะคำนวณเบี้ยส่วนแบ่งและสถิติรายรับของร้านและช่างใหม่เรียลไทม์ทันที
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentEditSale(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (paymentEditSale) {
                    let finalGroupId = paymentEditSale.groupPaymentId || null;
                    let finalGroupCode = paymentEditSale.groupPaymentCode || null;

                    if (paymentEditSale.paymentMethod === 'transfer') {
                      if (editPairSaleId) {
                        const pairedSale = dailySales.find(s => s.id === editPairSaleId);
                        if (pairedSale) {
                          if (pairedSale.groupPaymentId) {
                            finalGroupId = pairedSale.groupPaymentId;
                            finalGroupCode = editGroupLabel.trim() || pairedSale.groupPaymentCode || 'โอนร่วมกัน';
                          } else {
                            finalGroupId = `group-${Date.now()}-${Math.floor(Math.random() * 100)}`;
                            finalGroupCode = editGroupLabel.trim() || `โอนร่วมกัน ช่าง${paymentEditSale.barberName} + ช่าง${pairedSale.barberName}`;
                            
                            // Update the paired sale with the new group details too
                            if (onUpdateSale) {
                              onUpdateSale(pairedSale.id, {
                                groupPaymentId: finalGroupId,
                                groupPaymentCode: finalGroupCode
                              });
                            }
                          }
                        }
                      } else if (paymentEditSale.groupPaymentId) {
                        // Just updating the label/code for existing group
                        finalGroupCode = editGroupLabel.trim() || 'โอนร่วมกัน';
                        
                        // Update siblings
                        const siblings = dailySales.filter(s => s.groupPaymentId === paymentEditSale.groupPaymentId && s.id !== paymentEditSale.id);
                        siblings.forEach(sib => {
                          if (onUpdateSale) {
                            onUpdateSale(sib.id, {
                              groupPaymentCode: finalGroupCode || undefined
                            });
                          }
                        });
                      }
                    } else {
                      finalGroupId = null;
                      finalGroupCode = null;
                    }

                    const updates: Partial<SaleRecord> = {
                      customerName: paymentEditSale.customerName?.trim() || '',
                      paymentMethod: paymentEditSale.paymentMethod,
                      notes: paymentEditSale.notes?.trim() || '',
                      groupPaymentId: finalGroupId,
                      groupPaymentCode: finalGroupCode,
                      barberId: paymentEditSale.barberId,
                      barberName: paymentEditSale.barberName,
                      haircutPrice: paymentEditSale.haircutPrice,
                      chemicalPrice: paymentEditSale.chemicalPrice,
                      productPrice: paymentEditSale.productPrice,
                      productQty: paymentEditSale.productQty || null as any,
                      tip: paymentEditSale.tip,
                      subtotal: paymentEditSale.subtotal,
                      chemicalDiscountAmount: paymentEditSale.chemicalDiscountAmount,
                      discountAmount: paymentEditSale.discountAmount,
                      customerPaid: paymentEditSale.customerPaid,
                      barberHaircutShare: paymentEditSale.barberHaircutShare,
                      barberChemicalShare: paymentEditSale.barberChemicalShare,
                      barberProductShare: paymentEditSale.barberProductShare,
                      barberTotalShare: paymentEditSale.barberTotalShare,
                      shopTotalShare: paymentEditSale.shopTotalShare
                    };

                    if (paymentEditSale.paymentMethod === 'cash') {
                      updates.groupPaymentId = null;
                      updates.groupPaymentCode = null;
                    }

                    if (onUpdateSale) {
                      onUpdateSale(paymentEditSale.id, updates);
                    } else {
                      onUpdateSalePaymentMethod?.(paymentEditSale.id, paymentEditSale.paymentMethod);
                    }
                    setPaymentEditSale(null);
                  }
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Sales Closure Modal */}
      {isCloseSalesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col text-left text-white animate-fade-in">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>สรุปยอดและปิดบัญชีประจำวัน</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  ระบบช่วยคำนวณ ตรวจสอบ และออกสรุปรายงานประจำวันที่ {formatThaiDate(selectedDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseSalesModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800"
              >
                ✕ ปิด
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
              
              {/* Financial Metrics Mini-Bento Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold">💰 ยอดรับรวมทั้งสิ้น</span>
                  <div className="text-lg font-black text-indigo-400 font-mono">
                    {formatBaht(dailyPaymentStats.cashAmount + dailyPaymentStats.transferAmount)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    จำนวน {dailySales.length} บิลลูกค้า
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold">💵 เงินสดในเก๊ะ</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {formatBaht(dailyPaymentStats.cashAmount)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    {dailyPaymentStats.cashCount} บิลเงินสด
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold">📱 ยอดเงินโอนธนาคาร</span>
                  <div className="text-lg font-black text-sky-400 font-mono">
                    {formatBaht(dailyPaymentStats.transferAmount)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    {dailyPaymentStats.transferCount} ธุรกรรมโอน
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold">📉 ยอดค่าใช้จ่ายด่วน</span>
                  <div className="text-lg font-black text-rose-400 font-mono">
                    {formatBaht(totalDailyExpensesAmount)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    {dailyExpenses.length} รายการจ่ายออก
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1 col-span-2">
                  <span className="text-[10px] text-amber-400 font-bold">💼 เงินสดสุทธินำส่งร้าน (หลังหักค่าใช้จ่าย)</span>
                  <div className="text-lg font-black text-amber-300 font-mono">
                    {formatBaht(dailyPaymentStats.cashAmount - totalDailyExpensesAmount)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    * เงินสดหน้าร้านที่ต้องส่งมอบเมื่อปิดเก๊ะวันนี้
                  </div>
                </div>
              </div>

              {/* Textarea containing formatted copy-friendly text */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    <span>ข้อมูลสรุปยอดสำหรับ Export (คัดลอกเพื่อส่ง LINE / แชทกลุ่ม)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopySummaryText}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCopied 
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกข้อความสรุป'}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={generateDailySummaryText()}
                    rows={12}
                    className="w-full bg-slate-950 text-slate-200 text-xs px-4 py-3 border border-slate-800 rounded-2xl outline-none resize-none font-mono focus:border-slate-700 leading-relaxed scrollbar-thin"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <div className="absolute bottom-3 right-3 text-[9px] text-slate-500 pointer-events-none bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-900 font-mono">
                    * คลิกในกล่องข้อความเพื่อเลือกทั้งหมด
                  </div>
                </div>
              </div>

              {/* Quick backup alternatives inside modal */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl space-y-3">
                <span className="block text-[10.5px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-900 pb-1.5">
                  เครื่องมือสำรองข้อมูลสำมะโนบัญชีเพิ่มเติม
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownloadDaily('excel')}
                    className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>ดาวน์โหลด Excel</span>
                  </button>
                  <button
                    onClick={() => handleDownloadDaily('word')}
                    className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                    <span>ดาวน์โหลด Word</span>
                  </button>
                  <button
                    onClick={() => handleDownloadDaily('pdf')}
                    className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 font-black text-[9px] bg-amber-500/20 text-amber-400 rounded flex items-center justify-center">PDF</span>
                    <span>พิมพ์ใบเสร็จ PDF / HTML</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-mono">
                POS ACCOUNTING SYSTEM SECURED
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseSalesModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 transition-all cursor-pointer"
                >
                  ยกเลิก / ปิดหน้านี้
                </button>
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                    isCopied 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
                  }`}
                >
                  {isCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-indigo-200" />}
                  <span>{isCopied ? 'คัดลอกข้อความสรุปแล้ว!' : '💾 คัดลอกและนำส่งข้อมูล'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
