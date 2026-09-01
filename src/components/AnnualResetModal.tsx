import React, { useState, useRef } from 'react';
import { AlertTriangle, Download, Clock, X, CheckCircle, RefreshCw, FileSpreadsheet, ShieldAlert, FileText, Database, Package, Sparkles, Check, Printer } from 'lucide-react';
import { SaleRecord, Expense, Barber, Product, ChemicalPromo, ShareConfig, ShopConfig, Voucher, Member, MemberPackage, Payslip } from '../types';
import { downloadExcelReport, formatThaiDate, formatBaht, exportFullSystemBackupJson, SystemBackupData, getSalePaymentBreakdown, exportAsyncAnnualPdfReport, generateAnnualHtmlReport } from '../utils';

interface AnnualResetModalProps {
  isOpen: boolean;
  onCloseToday: () => void;
  firstLoginDate: string;
  daysElapsed: number;
  daysRemaining: number;
  userEmail: string;
  sales: SaleRecord[];
  expenses?: Expense[];
  barbers?: Barber[];
  products?: Product[];
  chemicalPromos?: ChemicalPromo[];
  shareConfig?: ShareConfig;
  shopConfig?: ShopConfig;
  vouchers?: Voucher[];
  members?: Member[];
  memberPackages?: MemberPackage[];
  payslips?: Payslip[];
  cashCounter?: any;
  shopName: string;
  onTriggerFactoryResetNow: () => void;
  onOpenDeleteMonthModal?: (month?: string) => void;
}

const THAI_MONTH_NAMES_FULL = [
  'มกราคม (January)',
  'กุมภาพันธ์ (February)',
  'มีนาคม (March)',
  'เมษายน (April)',
  'พฤษภาคม (May)',
  'มิถุนายน (June)',
  'กรกฎาคม (July)',
  'สิงหาคม (August)',
  'กันยายน (September)',
  'ตุลาคม (October)',
  'พฤศจิกายน (November)',
  'ธันวาคม (December)'
];

const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export default function AnnualResetModal({
  isOpen,
  onCloseToday,
  firstLoginDate,
  daysElapsed,
  daysRemaining,
  userEmail,
  sales,
  expenses = [],
  barbers = [],
  products = [],
  chemicalPromos = [],
  shareConfig,
  shopConfig,
  vouchers = [],
  members = [],
  memberPackages = [],
  payslips = [],
  cashCounter,
  shopName,
  onTriggerFactoryResetNow,
  onOpenDeleteMonthModal
}: AnnualResetModalProps) {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [showConfirmResetNow, setShowConfirmResetNow] = useState(false);
  const [confirmWipeChecked, setConfirmWipeChecked] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Determine current/most relevant year
  const currentYear = sales.length > 0
    ? Math.max(...sales.map(s => {
        const d = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
        return d ? parseInt(d.split('-')[0], 10) || new Date().getFullYear() : new Date().getFullYear();
      }))
    : new Date().getFullYear();
  const thaiBuddhistYear = currentYear + 543;

  // Calculate totals
  const totalIncome = sales.reduce((sum, s) => sum + (s.customerPaid || 0), 0);
  const totalBarberShare = sales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0);
  const totalShopShare = sales.reduce((sum, s) => sum + (s.shopTotalShare || 0), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalShopShare - totalExpensesAmount;

  // 12-Month Detailed Aggregates (January = 1 to December = 12)
  const monthlyData = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = idx + 1;
    const monthStr = `${currentYear}-${String(monthNum).padStart(2, '0')}`;

    const monthSales = sales.filter(s => {
      const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
      return sDate && sDate.startsWith(monthStr);
    });

    const monthExpenses = expenses.filter(e => {
      const eDate = e.date || (e.timestamp ? e.timestamp.split('T')[0] : '');
      return eDate && eDate.startsWith(monthStr);
    });

    let haircutRevenue = 0;
    let chemicalRevenue = 0;
    let productRevenue = 0;
    let discountTotal = 0;
    let customerPaidTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let barberShareTotal = 0;
    let shopShareTotal = 0;
    let tipTotal = 0;

    monthSales.forEach(s => {
      haircutRevenue += s.haircutPrice || 0;
      chemicalRevenue += s.chemicalPrice || 0;
      productRevenue += s.productPrice || 0;
      discountTotal += s.discountAmount || 0;
      customerPaidTotal += s.customerPaid || 0;
      barberShareTotal += s.barberTotalShare || 0;
      shopShareTotal += s.shopTotalShare || 0;
      tipTotal += s.tip || 0;

      const breakdown = getSalePaymentBreakdown(s);
      cashTotal += breakdown.cashAmount;
      transferTotal += breakdown.transferAmount;
    });

    const expenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const mNetProfit = shopShareTotal - expenseTotal;

    return {
      monthNum,
      monthNameTh: THAI_MONTH_NAMES_FULL[idx],
      shortMonthTh: THAI_MONTH_SHORT[idx],
      salesCount: monthSales.length,
      haircutRevenue,
      chemicalRevenue,
      productRevenue,
      discountTotal,
      customerPaidTotal,
      cashTotal,
      transferTotal,
      barberShareTotal,
      shopShareTotal,
      expenseTotal,
      netProfit: mNetProfit,
      tipTotal
    };
  });

  const totalYearHaircut = monthlyData.reduce((sum, m) => sum + m.haircutRevenue, 0);
  const totalYearChemical = monthlyData.reduce((sum, m) => sum + m.chemicalRevenue, 0);
  const totalYearProduct = monthlyData.reduce((sum, m) => sum + m.productRevenue, 0);
  const totalYearDiscounts = monthlyData.reduce((sum, m) => sum + m.discountTotal, 0);
  const totalYearCash = monthlyData.reduce((sum, m) => sum + m.cashTotal, 0);
  const totalYearTransfer = monthlyData.reduce((sum, m) => sum + m.transferTotal, 0);
  const profitMarginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Barber Performance Breakdown
  const barberStats = barbers.map(b => {
    const bSales = sales.filter(s => s.barberId === b.id);
    return {
      barber: b,
      clientsCount: bSales.length,
      haircutTotal: bSales.reduce((sum, s) => sum + (s.haircutPrice || 0), 0),
      chemicalTotal: bSales.reduce((sum, s) => sum + (s.chemicalPrice || 0), 0),
      productTotal: bSales.reduce((sum, s) => sum + (s.productPrice || 0), 0),
      commissionTotal: bSales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0),
      tipTotal: bSales.reduce((sum, s) => sum + (s.tip || 0), 0)
    };
  }).filter(b => b.clientsCount > 0 || b.commissionTotal > 0);

  // Expense Categories Breakdown
  const expenseCategoryMap: { [cat: string]: { count: number; total: number } } = {};
  expenses.forEach(e => {
    const cat = e.category || 'ค่าใช้จ่ายทั่วไป';
    if (!expenseCategoryMap[cat]) {
      expenseCategoryMap[cat] = { count: 0, total: 0 };
    }
    expenseCategoryMap[cat].count += 1;
    expenseCategoryMap[cat].total += (e.amount || 0);
  });

  const expenseCategoryList = Object.entries(expenseCategoryMap).map(([category, data]) => ({
    category,
    count: data.count,
    total: data.total
  })).sort((a, b) => b.total - a.total);

  const formattedFirstLogin = firstLoginDate
    ? formatThaiDate(firstLoginDate.split('T')[0])
    : 'ไม่ระบุ';

  // 1. JSON Full System Backup
  const handleDownloadJsonBackup = () => {
    try {
      const backupData: SystemBackupData = {
        version: '1.0.0',
        backupDate: new Date().toISOString(),
        backupType: '1-year-annual',
        userEmail: userEmail || 'unknown',
        shopName: shopName || 'ร้านบาร์เบอร์ของฉัน',
        firstLoginDate,
        daysActive: daysElapsed,
        totalSalesCount: sales.length,
        totalIncome,
        data: {
          shopConfig,
          shareConfig,
          barbers,
          products,
          chemicalPromos,
          vouchers,
          sales,
          expenses,
          payslips,
          cashCounter,
          members,
          memberPackages
        }
      };

      const cleanShop = (shopName || 'BarberPOS').replace(/[/\\?%*:|"<>]/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      exportFullSystemBackupJson(backupData, `สำรองข้อมูลระบบ1ปี_ฉบับเต็ม_${cleanShop}_${dateStr}.json`);
      setDownloadSuccess('ดาวน์โหลดไฟล์สำรองฐานข้อมูลระบบ (.json) เรียบร้อยแล้ว!');
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to export JSON backup:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ JSON กรุณาลองใหม่อีกครั้ง');
    }
  };

  // 2. CSV / Excel Sales History Export
  const handleDownloadExcelReport = () => {
    try {
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

      const rows: string[][] = sales.map((s) => [
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

      rows.push([]);
      rows.push(['--- สรุปยอดรวมผลประกอบการทั้งปี 12 เดือน (มกราคม - ธันวาคม) ---', '', '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['จำนวนบิลทั้งหมด', `${sales.length} รายการ`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ยอดรายรับรวมทั้งสิ้น', `${totalIncome.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ส่วนแบ่งช่างรวม (ต้นทุน)', `${totalBarberShare.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ส่วนแบ่งร้านรวม', `${totalShopShare.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ค่าใช้จ่ายร้านรวม', `${totalExpensesAmount.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['กำไรสุทธิร้าน', `${netProfit.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);

      const cleanShopName = (shopName || 'Shop').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `รายงานประวัติบิล1ปี_ร้าน_${cleanShopName}_${new Date().toISOString().split('T')[0]}`;
      
      downloadExcelReport(fileName, rows, headers);
      setDownloadSuccess('ดาวน์โหลดไฟล์ CSV / Excel สำรองข้อมูล 1 ปีเรียบร้อยแล้ว!');
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to export annual CSV report:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์รายงาน CSV กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Native Browser Print Fallback
  const handlePrintNative = () => {
    const htmlBody = generateAnnualHtmlReport(
      shopName,
      currentYear,
      sales,
      expenses,
      barbers,
      userEmail
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เบราว์เซอร์เปิดหน้าต่างป๊อปอัปเพื่อสั่งพิมพ์รายงาน');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>รายงานสรุปผลประกอบการประจำปี_${currentYear}_${shopName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${htmlBody}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // 3. Professional Accountant 12-Month PDF Export
  const handleDownloadPdfReport = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await exportAsyncAnnualPdfReport(
        shopName,
        currentYear,
        sales,
        expenses,
        barbers,
        userEmail
      );
      setDownloadSuccess('ดาวน์โหลดไฟล์รายงาน PDF สรุปยอดขาย 12 เดือน (ม.ค.-ธ.ค.) สำหรับนักบัญชีเรียบร้อยแล้ว!');
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to export annual PDF report:', err);
      const fallback = confirm('ระบบสร้าง PDF ติดขัด ต้องการเปิดหน้าต่างสั่งพิมพ์ (Print to PDF) เพื่อบันทึกเป็น PDF แทนหรือไม่?');
      if (fallback) {
        handlePrintNative();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 4. Download All-in-One 1-Year Backup Package
  const handleDownloadAllBackup = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    try {
      // 1. JSON
      handleDownloadJsonBackup();
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 2. CSV
      handleDownloadExcelReport();
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 3. PDF
      await exportAsyncAnnualPdfReport(
        shopName,
        currentYear,
        sales,
        expenses,
        barbers,
        userEmail
      );

      setDownloadSuccess('🎉 ดาวน์โหลดชุดสำรองข้อมูลย้อนหลัง 1 ปีครบทุกรูปแบบ (JSON, CSV, PDF สรุป 12 เดือน) สำเร็จสมบูรณ์!');
      setTimeout(() => setDownloadSuccess(null), 6000);
    } catch (err) {
      console.error('Failed to download complete package:', err);
      alert('⚠️ การดาวน์โหลด PDF รายงานประจำปีมีข้อขัดข้อง แต่ไฟล์ JSON และ CSV ได้ถูกดาวน์โหลดแล้ว');
    } finally {
      setIsDownloadingAll(false);
      setIsGeneratingPdf(false);
    }
  };

  // Safe Factory Reset with Auto-Backup
  const handleSafeReset = () => {
    if (!confirmWipeChecked) {
      alert('กรุณากดติ๊กถูกยืนยันว่าได้บันทึกไฟล์สำรองข้อมูลเรียบร้อยแล้วก่อนกด Reset');
      return;
    }
    // Automatically trigger JSON and CSV backups before wiping
    handleDownloadJsonBackup();
    setTimeout(() => {
      handleDownloadExcelReport();
      onTriggerFactoryResetNow();
    }, 800);
  };

  return (
    <>
      {/* ========================================================== */}
      {/* HIDDEN PDF PRINTABLE TARGET (ACCOUNTANT 12-MONTH STATEMENT) */}
      {/* ========================================================== */}
      <div 
        ref={reportRef}
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '840px', 
          opacity: 0, 
          pointerEvents: 'none', 
          zIndex: -9999, 
          backgroundColor: '#ffffff' 
        }}
      >
        <div id="accountant-annual-pdf-target" className="bg-white p-8 font-sans text-slate-900 leading-normal">
          
          {/* HEADER / OFFICIAL TAX & FINANCIAL AUDIT TITLE */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-md mb-1.5">
                  เอกสารทางการสำหรับทำบัญชี & ยื่นภาษี (Official Accounting Report)
                </span>
                <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">
                  {shopName}
                </h1>
                <p className="text-base font-bold text-amber-700 mt-0.5">
                  รายงานสรุปผลประกอบการและยอดขายประจำปี (รอบ 12 เดือน มกราคม – ธันวาคม)
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  ANNUAL FINANCIAL & SALES AUDIT STATEMENT • ประจำปี พ.ศ. {thaiBuddhistYear} (ค.ศ. {currentYear})
                </p>
              </div>

              <div className="text-right text-xs text-slate-600 space-y-0.5">
                <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">รอบระยะเวลาบัญชี (Fiscal Period)</p>
                  <p className="font-extrabold text-slate-900 text-xs">1 มกราคม – 31 ธันวาคม {thaiBuddhistYear}</p>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  รหัสบัญชีร้าน: <strong className="font-mono text-slate-700">{userEmail || 'POS-SYSTEM'}</strong>
                </p>
                <p className="text-[10px] text-slate-400">
                  วันที่จัดทำเอกสาร: <strong className="text-slate-700">{formatThaiDate(new Date().toISOString().split('T')[0])}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* 4 EXECUTIVE KPI SUMMARY BOXES */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. ยอดขายรวมทั้งปี</span>
              <span className="text-base font-black text-emerald-700 mt-0.5 block">{formatBaht(totalIncome)}</span>
              <span className="text-[10px] text-slate-500">{sales.length.toLocaleString()} รายการบิล</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. ส่วนแบ่งช่าง (ต้นทุน)</span>
              <span className="text-base font-black text-orange-600 mt-0.5 block">{formatBaht(totalBarberShare)}</span>
              <span className="text-[10px] text-slate-500">ค่าคอมมิชชั่นสะสม</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. ค่าใช้จ่ายดำเนินงานร้าน</span>
              <span className="text-base font-black text-rose-600 mt-0.5 block">{formatBaht(totalExpensesAmount)}</span>
              <span className="text-[10px] text-slate-500">{expenses.length} รายการจ่าย</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. กำไรสุทธิของร้าน</span>
              <span className={`text-base font-black mt-0.5 block ${netProfit >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                {formatBaht(netProfit)}
              </span>
              <span className="text-[10px] font-bold text-slate-600">Margin: {profitMarginPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* STATEMENT OF COMPREHENSIVE INCOME */}
          <div className="mb-5 border border-slate-300 rounded-xl p-4 bg-slate-50/40">
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-300 pb-2 mb-3 flex items-center justify-between">
              <span>งบกำไรขาดทุนเบื้องต้น (Statement of Comprehensive Income)</span>
              <span className="text-[10px] font-normal text-slate-500">หน่วย: บาท (THB)</span>
            </h2>

            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Left Column: Revenues */}
              <div className="space-y-1.5 border-r border-slate-200 pr-4">
                <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">I. รายได้จากการประกอบกิจการ (Revenues)</p>
                <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                  <span>- รายได้ค่าบริการตัดผม (Haircut Services)</span>
                  <span className="font-semibold">{formatBaht(totalYearHaircut)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                  <span>- รายได้ค่าบริการเคมี (Chemical Treatments)</span>
                  <span className="font-semibold">{formatBaht(totalYearChemical)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                  <span>- รายได้ขายผลิตภัณฑ์บำรุงผม (Retail Products)</span>
                  <span className="font-semibold">{formatBaht(totalYearProduct)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-rose-700 pl-2">
                  <span>- หัก: ส่วนลดการค้าและโปรโมชั่น (Sales Discounts)</span>
                  <span className="font-semibold">-{formatBaht(totalYearDiscounts)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 border-t border-slate-200 bg-emerald-50/60 px-2 rounded-md">
                  <span>รวมรายได้สุทธิจากลูกค้า (Gross Turnover)</span>
                  <span className="text-emerald-800">{formatBaht(totalIncome)}</span>
                </div>

                <div className="pt-2">
                  <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">II. ต้นทุนค่าบริการช่าง (Direct Labor Cost)</p>
                  <div className="flex justify-between py-0.5 text-orange-700 pl-2">
                    <span>- ค่าคอมมิชชั่น/ส่วนแบ่งช่างตัดผม (Barber Share)</span>
                    <span className="font-semibold">-{formatBaht(totalBarberShare)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-blue-900 border-t border-slate-200 bg-blue-50/60 px-2 rounded-md mt-1">
                    <span>กำไรขั้นต้นส่วนของร้าน (Shop Gross Revenue)</span>
                    <span className="text-blue-800">{formatBaht(totalShopShare)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Operating Expenses */}
              <div className="space-y-1.5 pl-2">
                <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">III. ค่าใช้จ่ายในการดำเนินงาน (Operating Expenses)</p>
                {expenseCategoryList.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex justify-between py-0.5 text-slate-700 pl-2">
                    <span>- {c.category} ({c.count} รายการ)</span>
                    <span className="font-semibold">-{formatBaht(c.total)}</span>
                  </div>
                ))}
                {expenseCategoryList.length > 4 && (
                  <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                    <span>- หมวดหมู่อื่นๆ ({expenseCategoryList.slice(4).reduce((s, x) => s + x.count, 0)} รายการ)</span>
                    <span className="font-semibold">-{formatBaht(expenseCategoryList.slice(4).reduce((s, x) => s + x.total, 0))}</span>
                  </div>
                )}
                {expenseCategoryList.length === 0 && (
                  <p className="text-[11px] text-slate-400 pl-2 italic py-1">ไม่มีบันทึกรายการค่าใช้จ่ายดำเนินงาน</p>
                )}

                <div className="flex justify-between py-1 font-bold text-rose-900 border-t border-slate-200 bg-rose-50/60 px-2 rounded-md">
                  <span>รวมค่าใช้จ่ายดำเนินงานทั้งสิ้น (Total Expenses)</span>
                  <span className="text-rose-800">-{formatBaht(totalExpensesAmount)}</span>
                </div>

                <div className="pt-2">
                  <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">IV. สรุปผลกำไรสุทธิประจำปี (Net Income)</p>
                  <div className="flex justify-between py-1.5 font-black text-sm border-2 border-slate-900 bg-slate-900 text-white px-3 rounded-lg mt-1">
                    <span>กำไรสุทธิก่อนภาษี (Net Profit Before Tax)</span>
                    <span className="text-amber-300">{formatBaht(netProfit)}</span>
                  </div>
                </div>

                {/* Cash vs Bank Transfer Summary */}
                <div className="pt-1 text-[10px] text-slate-500 flex justify-between px-1">
                  <span>💵 รับเงินสด: <strong>{formatBaht(totalYearCash)}</strong> ({totalIncome > 0 ? ((totalYearCash / totalIncome) * 100).toFixed(1) : 0}%)</span>
                  <span>📲 รับเงินโอน/QR: <strong>{formatBaht(totalYearTransfer)}</strong> ({totalIncome > 0 ? ((totalYearTransfer / totalIncome) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 12-MONTH MASTER FINANCIAL TABLE */}
          <div className="mb-5">
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
              <span>ตารางสรุปรายรับ-รายจ่ายรายเดือน 12 เดือน (มกราคม – ธันวาคม {thaiBuddhistYear})</span>
              <span className="text-[10px] font-normal text-slate-500">12-Month Master Accounting Schedule</span>
            </h2>

            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-800 text-white text-center font-bold">
                  <th className="p-1.5 text-left border border-slate-700">เดือน</th>
                  <th className="p-1.5 text-right border border-slate-700">ยอดขายรวม</th>
                  <th className="p-1.5 text-right border border-slate-700">ตัดผม</th>
                  <th className="p-1.5 text-right border border-slate-700">เคมี</th>
                  <th className="p-1.5 text-right border border-slate-700">สินค้า</th>
                  <th className="p-1.5 text-right border border-slate-700">ส่วนลด</th>
                  <th className="p-1.5 text-right border border-slate-700">เงินสด</th>
                  <th className="p-1.5 text-right border border-slate-700">เงินโอน</th>
                  <th className="p-1.5 text-right border border-slate-700">ส่วนแบ่งช่าง</th>
                  <th className="p-1.5 text-right border border-slate-700">รายจ่ายร้าน</th>
                  <th className="p-1.5 text-right border border-slate-700">กำไรสุทธิ</th>
                  <th className="p-1.5 text-center border border-slate-700">บิล</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, idx) => (
                  <tr 
                    key={m.monthNum} 
                    className={`border-b border-slate-300 text-right ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${m.salesCount === 0 && m.expenseTotal === 0 ? 'opacity-50' : ''}`}
                  >
                    <td className="p-1 text-left font-bold text-slate-900 border-r border-slate-300">
                      {idx + 1}. {m.shortMonthTh}
                    </td>
                    <td className="p-1 font-bold text-slate-900 border-r border-slate-300">
                      {m.customerPaidTotal > 0 ? formatBaht(m.customerPaidTotal) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-slate-700">
                      {m.haircutRevenue > 0 ? formatBaht(m.haircutRevenue) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-slate-700">
                      {m.chemicalRevenue > 0 ? formatBaht(m.chemicalRevenue) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-slate-700">
                      {m.productRevenue > 0 ? formatBaht(m.productRevenue) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-rose-600">
                      {m.discountTotal > 0 ? `-${formatBaht(m.discountTotal)}` : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-slate-700">
                      {m.cashTotal > 0 ? formatBaht(m.cashTotal) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-slate-700">
                      {m.transferTotal > 0 ? formatBaht(m.transferTotal) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-orange-700 font-medium">
                      {m.barberShareTotal > 0 ? formatBaht(m.barberShareTotal) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-300 text-rose-700 font-medium">
                      {m.expenseTotal > 0 ? formatBaht(m.expenseTotal) : '-'}
                    </td>
                    <td className={`p-1 font-bold border-r border-slate-300 ${m.netProfit >= 0 ? 'text-teal-800' : 'text-rose-800'}`}>
                      {m.customerPaidTotal > 0 || m.expenseTotal > 0 ? formatBaht(m.netProfit) : '-'}
                    </td>
                    <td className="p-1 text-center font-mono text-slate-600">
                      {m.salesCount > 0 ? m.salesCount : '-'}
                    </td>
                  </tr>
                ))}

                {/* TOTAL ROW */}
                <tr className="bg-slate-900 text-white font-black text-right border-t-2 border-slate-900">
                  <td className="p-1.5 text-left border-r border-slate-800 text-[10px]">รวมทั้งปี (12 เดือน)</td>
                  <td className="p-1.5 border-r border-slate-800 text-amber-300">{formatBaht(totalIncome)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalYearHaircut)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalYearChemical)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalYearProduct)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-rose-300">-{formatBaht(totalYearDiscounts)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalYearCash)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalYearTransfer)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-orange-300">{formatBaht(totalBarberShare)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-rose-300">{formatBaht(totalExpensesAmount)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-emerald-300">{formatBaht(netProfit)}</td>
                  <td className="p-1.5 text-center font-mono">{sales.length}</td>
                </tr>

                {/* AVERAGE ROW */}
                <tr className="bg-slate-100 text-slate-800 font-bold text-right text-[9.5px]">
                  <td className="p-1 text-left border-r border-slate-300">เฉลี่ยต่อเดือน</td>
                  <td className="p-1 border-r border-slate-300 text-emerald-700">{formatBaht(totalIncome / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalYearHaircut / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalYearChemical / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalYearProduct / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-rose-600">-{formatBaht(totalYearDiscounts / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalYearCash / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalYearTransfer / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-orange-700">{formatBaht(totalBarberShare / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-rose-700">{formatBaht(totalExpensesAmount / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-teal-800">{formatBaht(netProfit / 12)}</td>
                  <td className="p-1 text-center font-mono">{(sales.length / 12).toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BARBER PERFORMANCE & COMMISSION AUDIT */}
          {barberStats.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                <span>สรุปค่าคอมมิชชั่นและการให้บริการของช่างรายบุคคลตลอดปี (Barber Commission Audit)</span>
                <span className="text-[10px] font-normal text-slate-500">รวมช่าง {barberStats.length} ท่าน</span>
              </h2>

              <table className="w-full text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-1.5 text-left border-r border-slate-300">ชื่อช่าง</th>
                    <th className="p-1.5 text-left border-r border-slate-300">ตำแหน่ง</th>
                    <th className="p-1.5 text-center border-r border-slate-300">จำนวนลูกค้า (บิล)</th>
                    <th className="p-1.5 text-right border-r border-slate-300">ยอดตัดผม</th>
                    <th className="p-1.5 text-right border-r border-slate-300">ยอดเคมี</th>
                    <th className="p-1.5 text-right border-r border-slate-300">ยอดสินค้า</th>
                    <th className="p-1.5 text-right border-r border-slate-300">ส่วนแบ่งที่จ่ายจริง</th>
                    <th className="p-1.5 text-right">ทิปสะสม</th>
                  </tr>
                </thead>
                <tbody>
                  {barberStats.map((b, idx) => (
                    <tr key={b.barber.id || idx} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/60">
                      <td className="p-1 font-bold text-slate-900 border-r border-slate-300">{b.barber.name}</td>
                      <td className="p-1 text-slate-600 border-r border-slate-300">{b.barber.position || 'Hairdresser'}</td>
                      <td className="p-1 text-center font-mono font-bold text-slate-700 border-r border-slate-300">{b.clientsCount}</td>
                      <td className="p-1 text-right border-r border-slate-300">{formatBaht(b.haircutTotal)}</td>
                      <td className="p-1 text-right border-r border-slate-300">{formatBaht(b.chemicalTotal)}</td>
                      <td className="p-1 text-right border-r border-slate-300">{formatBaht(b.productTotal)}</td>
                      <td className="p-1 text-right font-bold text-orange-700 border-r border-slate-300">{formatBaht(b.commissionTotal)}</td>
                      <td className="p-1 text-right text-emerald-700">{formatBaht(b.tipTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ACCOUNTING CERTIFICATION & SIGNATURE BLOCKS */}
          <div className="border-t-2 border-slate-900 pt-4 mt-6">
            <div className="grid grid-cols-2 gap-8 text-xs text-center text-slate-700">
              <div className="p-4 border border-dashed border-slate-300 rounded-xl space-y-8 bg-slate-50/50">
                <p className="font-bold text-slate-900">ผู้จัดทำบัญชี / สมุห์บัญชี (Prepared by)</p>
                <div className="border-b border-slate-400 w-48 mx-auto"></div>
                <div>
                  <p>( .......................................................................... )</p>
                  <p className="text-[10px] text-slate-500 mt-1">วันที่ ........ / .................... / พ.ศ. ........</p>
                </div>
              </div>

              <div className="p-4 border border-dashed border-slate-300 rounded-xl space-y-8 bg-slate-50/50">
                <p className="font-bold text-slate-900">ผู้มีอำนาจลงนาม / เจ้าของกิจการ (Approved by)</p>
                <div className="border-b border-slate-400 w-48 mx-auto"></div>
                <div>
                  <p>( .......................................................................... )</p>
                  <p className="text-[10px] text-slate-500 mt-1">วันที่ ........ / .................... / พ.ศ. ........</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
              <span>รายงานนี้สร้างขึ้นโดยระบบ POS Barbershop Cloud • ข้อมูลผ่านการคำนวณและตรวจสอบความถูกต้องอัตโนมัติ</span>
              <span>ออกเอกสารเมื่อ {new Date().toLocaleString('th-TH')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================== */}
      {/* MAIN VISIBLE MODAL                                         */}
      {/* ========================================================== */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200 my-8">
          {/* Header Ribbon */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white text-center relative">
            <button
              onClick={onCloseToday}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="ปิดป๊อปอัปสำหรับวันนี้"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">
              <AlertTriangle className="w-10 h-10 text-white animate-bounce" />
            </div>
            
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              แจ้งเตือนใช้งานครบ 1 ปี (Annual Notice)
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold leading-tight">
              เตรียม Factory Reset ข้อมูลอัตโนมัติ
            </h2>
            <p className="text-amber-100 text-sm mt-1">
              บัญชีร้าน: {userEmail}
            </p>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-5 text-slate-700">
            {/* Status Badge & Countdown */}
            <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-amber-800 font-medium">เข้าใช้งานวันแรก: {formattedFirstLogin}</p>
                  <p className="text-sm font-bold text-amber-900">ใช้งานมาแล้ว: <span className="text-amber-700">{daysElapsed} วัน</span> (ครบ 1 ปี)</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-sm">
                <span className="block text-xs font-bold text-rose-500 uppercase tracking-wide">ผ่อนผันเหลือ</span>
                <span className="text-2xl font-black text-rose-600">{daysRemaining}</span>
                <span className="text-xs font-semibold text-rose-500"> วัน</span>
              </div>
            </div>

            {/* Description Instructions */}
            <div className="space-y-3 text-sm leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-2.5 text-slate-800 font-semibold">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>ทำไมถึงต้องมีการ Factory Reset อัตโนมัติ?</span>
              </div>
              <p className="text-slate-600 text-xs md:text-sm pl-7">
                เพื่อประสิทธิภาพสูงสุดของระบบและเตรียมฐานข้อมูลสำหรับการใช้งานในปีถัดไป ระบบจะทำการ **Factory Reset ล้างข้อมูลทั้งหมดของบัญชีนี้อัตโนมัติ** เมื่อครบระยะเวลาผ่อนผัน 1 เดือน (30 วัน) หลังครบปีที่ 1
              </p>
              <div className="pl-7 text-xs font-medium text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200">
                💡 **ข้อแนะนำ**: กรุณากดดาวน์โหลดไฟล์ **PDF สรุปยอดขาย 12 เดือน (ม.ค.-ธ.ค.)** เก็บไว้ในเครื่องหรืออุปกรณ์ของคุณเพื่อใช้ยื่นหรือส่งต่อนักบัญชีทำงบการเงิน
              </div>
            </div>

            {/* Download Actions */}
            <div className="space-y-3 pt-1">
              {/* All-in-One One-Click 1-Year Backup */}
              <button
                onClick={handleDownloadAllBackup}
                disabled={isDownloadingAll || isGeneratingPdf}
                className="w-full py-4 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-700 hover:via-orange-700 hover:to-rose-700 text-white font-black rounded-2xl shadow-xl shadow-orange-600/30 hover:shadow-orange-600/50 flex items-center justify-between gap-3 transition-all transform active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Package className={`w-5 h-5 text-white ${isDownloadingAll ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold flex items-center gap-1.5">
                      <span>ดาวน์โหลดชุดสำรองข้อมูล 1 ปีทั้งหมด</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" />
                    </div>
                    <p className="text-[11px] text-amber-100 font-medium">โหลดครบทั้ง JSON + CSV/Excel + PDF สรุป 12 เดือนในคลิกเดียว</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-white shrink-0" />
              </button>

              {/* Individual Download Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1. JSON Full Database Backup */}
                <button
                  onClick={handleDownloadJsonBackup}
                  className="p-3 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-950 rounded-2xl border border-indigo-200/80 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:shadow-sm cursor-pointer"
                >
                  <Database className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold">ฐานข้อมูล (.json)</span>
                  <span className="text-[10px] text-indigo-600/80 font-medium">สำรองครบ 100%</span>
                </button>

                {/* 2. CSV / Excel */}
                <button
                  onClick={handleDownloadExcelReport}
                  className="p-3 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 rounded-2xl border border-emerald-200/80 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold">ตาราง Excel (.csv)</span>
                  <span className="text-[10px] text-emerald-600/80 font-medium">เปิดดูใน Excel</span>
                </button>

                {/* 3. PDF Summary */}
                <button
                  onClick={handleDownloadPdfReport}
                  disabled={isGeneratingPdf}
                  className="p-3 bg-rose-50/80 hover:bg-rose-100/80 text-rose-950 rounded-2xl border border-rose-200/80 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-5 h-5 text-rose-600" />
                  <span className="text-xs font-bold">{isGeneratingPdf ? 'สร้าง PDF...' : 'PDF สรุป 12 เดือน'}</span>
                  <span className="text-[10px] text-rose-600/80 font-medium">ส่งให้นักบัญชี</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 p-3 rounded-2xl animate-fade-in shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{downloadSuccess}</span>
                </div>
              )}

              {/* Bottom Actions with 2-Step Confirmation */}
              {!showConfirmResetNow ? (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onCloseToday}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm text-center cursor-pointer"
                  >
                    รับทราบ (ปิดการแจ้งเตือนสำหรับวันนี้)
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmResetNow(true);
                      setConfirmWipeChecked(false);
                    }}
                    className="px-3.5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors border border-rose-200 cursor-pointer"
                    title="ทำการล้างข้อมูลทันที"
                  >
                    Reset ข้อมูลทันที
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50/90 rounded-2xl border-2 border-rose-300 space-y-3 animate-fade-in text-left">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-rose-950">
                        ยืนยันการ Factory Reset ข้อมูลทั้งหมดของบัญชีนี้?
                      </p>
                      <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                        ระบบจะทำการดาวน์โหลดไฟล์สำรองข้อมูล (.json & .csv) ให้อัตโนมัติก่อนเริ่มล้างข้อมูล เพื่อความปลอดภัยของข้อมูลคุณ
                      </p>
                    </div>
                  </div>

                  {/* Safety Checkbox */}
                  <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-rose-200 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmWipeChecked}
                      onChange={(e) => setConfirmWipeChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                    />
                    <span>ฉันเข้าใจและต้องการล้างข้อมูลเริ่มต้นปีใหม่ทันที</span>
                  </label>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSafeReset}
                      disabled={!confirmWipeChecked}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                        confirmWipeChecked
                          ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                          : 'bg-rose-300 text-white/80 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> ยืนยัน Reset ทันที (พร้อมเซฟไฟล์)
                    </button>
                    <button
                      onClick={() => setShowConfirmResetNow(false)}
                      className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Notice */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              ระบบจะแสดงการแจ้งเตือนนี้วันละ 1 ครั้ง เป็นเวลา 30 วัน จนกว่าจะถึงกำหนด Factory Reset อัตโนมัติ
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
