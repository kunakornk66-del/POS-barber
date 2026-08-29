import React, { useState, useRef } from 'react';
import { SaleRecord, Expense, Barber, ShopConfig, ShareConfig, Payslip } from '../types';
import { formatBaht, formatThaiDate, getSalePaymentBreakdown, exportAsyncAnnualPdfReport, generateAnnualHtmlReport } from '../utils';
import { FileText, Printer, CheckCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export interface ProfessionalAnnualPdfProps {
  sales: SaleRecord[];
  expenses?: Expense[];
  barbers?: Barber[];
  shopConfig?: ShopConfig;
  shareConfig?: ShareConfig;
  payslips?: Payslip[];
  userEmail?: string;
  targetYear?: number;
  onSuccess?: (msg: string) => void;
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

export default function ProfessionalAnnualPdfReport({
  sales,
  expenses = [],
  barbers = [],
  shopConfig,
  shareConfig,
  userEmail = '',
  targetYear,
  onSuccess
}: ProfessionalAnnualPdfProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Determine target year (Default: most recent year in sales or current year)
  const currentYear = targetYear || (sales.length > 0
    ? Math.max(...sales.map(s => {
        const d = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
        return d ? parseInt(d.split('-')[0], 10) || new Date().getFullYear() : new Date().getFullYear();
      }))
    : new Date().getFullYear());

  const thaiBuddhistYear = currentYear + 543;
  const shopName = shopConfig?.shopName || 'ร้านบาร์เบอร์';

  // 1. Calculate 12 Months Data (January = month 1 to December = month 12)
  const monthlyData = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = idx + 1;
    const monthStr = `${currentYear}-${String(monthNum).padStart(2, '0')}`;

    // Filter sales for this month
    const monthSales = sales.filter(s => {
      const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
      return sDate && sDate.startsWith(monthStr);
    });

    // Filter expenses for this month
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
    const netProfit = shopShareTotal - expenseTotal;
    const grossSubtotal = haircutRevenue + chemicalRevenue + productRevenue;

    return {
      monthNum,
      monthNameTh: THAI_MONTH_NAMES_FULL[idx],
      shortMonthTh: THAI_MONTH_SHORT[idx],
      salesCount: monthSales.length,
      grossSubtotal,
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
      netProfit,
      tipTotal
    };
  });

  // Annual Aggregates
  const totalBills = monthlyData.reduce((sum, m) => sum + m.salesCount, 0);
  const totalGrossSubtotal = monthlyData.reduce((sum, m) => sum + m.grossSubtotal, 0);
  const totalHaircut = monthlyData.reduce((sum, m) => sum + m.haircutRevenue, 0);
  const totalChemical = monthlyData.reduce((sum, m) => sum + m.chemicalRevenue, 0);
  const totalProduct = monthlyData.reduce((sum, m) => sum + m.productRevenue, 0);
  const totalDiscounts = monthlyData.reduce((sum, m) => sum + m.discountTotal, 0);
  const totalCustomerPaid = monthlyData.reduce((sum, m) => sum + m.customerPaidTotal, 0);
  const totalCash = monthlyData.reduce((sum, m) => sum + m.cashTotal, 0);
  const totalTransfer = monthlyData.reduce((sum, m) => sum + m.transferTotal, 0);
  const totalBarberShare = monthlyData.reduce((sum, m) => sum + m.barberShareTotal, 0);
  const totalShopShare = monthlyData.reduce((sum, m) => sum + m.shopShareTotal, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenseTotal, 0);
  const totalNetProfit = totalShopShare - totalExpenses;
  const totalTips = monthlyData.reduce((sum, m) => sum + m.tipTotal, 0);

  const profitMarginPct = totalCustomerPaid > 0 ? (totalNetProfit / totalCustomerPaid) * 100 : 0;
  const avgMonthlyRevenue = totalCustomerPaid / 12;
  const avgMonthlyProfit = totalNetProfit / 12;

  // Barber breakdown for the year
  const yearSales = sales.filter(s => {
    const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
    return sDate && sDate.startsWith(String(currentYear));
  });

  const barberStats = barbers.map(b => {
    const bSales = yearSales.filter(s => s.barberId === b.id);
    const bHaircut = bSales.reduce((sum, s) => sum + (s.haircutPrice || 0), 0);
    const bChemical = bSales.reduce((sum, s) => sum + (s.chemicalPrice || 0), 0);
    const bProduct = bSales.reduce((sum, s) => sum + (s.productPrice || 0), 0);
    const bCommissions = bSales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0);
    const bTips = bSales.reduce((sum, s) => sum + (s.tip || 0), 0);
    const bCustomerPaid = bSales.reduce((sum, s) => sum + (s.customerPaid || 0), 0);

    return {
      barber: b,
      clientsCount: bSales.length,
      haircutTotal: bHaircut,
      chemicalTotal: bChemical,
      productTotal: bProduct,
      customerPaidTotal: bCustomerPaid,
      commissionTotal: bCommissions,
      tipTotal: bTips
    };
  }).filter(b => b.clientsCount > 0 || b.commissionTotal > 0);

  // Expense categories breakdown for the year
  const yearExpenses = expenses.filter(e => {
    const eDate = e.date || (e.timestamp ? e.timestamp.split('T')[0] : '');
    return eDate && eDate.startsWith(String(currentYear));
  });

  const expenseCategoryMap: { [cat: string]: { count: number; total: number } } = {};
  yearExpenses.forEach(e => {
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
    total: data.total,
    pct: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
  })).sort((a, b) => b.total - a.total);

  // Native Browser Print Fallback (100% Reliable Vector Output)
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

  // PDF Export Trigger
  const handleExportPdf = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setToastMessage('กำลังประมวลผลและสร้างไฟล์ PDF สรุป 12 เดือน...');

    try {
      await exportAsyncAnnualPdfReport(
        shopName,
        currentYear,
        sales,
        expenses,
        barbers,
        userEmail
      );
      
      const successMsg = `ดาวน์โหลดรายงาน PDF สรุปยอดขาย 12 เดือน (ม.ค. - ธ.ค. ${thaiBuddhistYear}) สำเร็จเรียบร้อย!`;
      setToastMessage(successMsg);
      if (onSuccess) {
        onSuccess(successMsg);
      }
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to export Accountant Annual PDF:', err);
      // Offer graceful fallback to native print
      const fallbackConfirm = confirm('ระบบสร้าง PDF อัตโนมัติติดขัด ต้องการเปิดหน้าต่างสั่งพิมพ์ (Print to PDF) เพื่อบันทึกเป็น PDF แทนหรือไม่?');
      if (fallbackConfirm) {
        handlePrintNative();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Download Action Button */}
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isGenerating}
          className="px-4 py-2.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
          title="ดาวน์โหลดรายงานสรุป 12 เดือน (มกราคม - ธันวาคม) ระดับมาตรฐานสำหรับนักบัญชีเป็นไฟล์ PDF"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>กำลังสร้างรายงาน PDF...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-rose-200" />
              <span>ดาวน์โหลด PDF นักบัญชี (12 เดือน)</span>
            </>
          )}
        </button>

        {/* Native Print / Save to PDF Button */}
        <button
          type="button"
          onClick={handlePrintNative}
          className="px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          title="เปิดหน้าต่างพิมพ์รายงาน A4 หรือบันทึกเป็น PDF ผ่านเบราว์เซอร์"
        >
          <Printer className="w-3.5 h-3.5 text-amber-400" />
          <span>พิมพ์ A4</span>
        </button>
      </div>

      {/* Toast / Status Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          {isGenerating ? (
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )}
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================== */}
      {/* HIDDEN PRINTABLE DOM TARGET FOR HIGH-RESOLUTION PDF        */}
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
              <span className="text-base font-black text-emerald-700 mt-0.5 block">{formatBaht(totalCustomerPaid)}</span>
              <span className="text-[10px] text-slate-500">{totalBills.toLocaleString()} รายการบิล</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. ส่วนแบ่งช่าง (ต้นทุน)</span>
              <span className="text-base font-black text-orange-600 mt-0.5 block">{formatBaht(totalBarberShare)}</span>
              <span className="text-[10px] text-slate-500">ค่าคอมมิชชั่นสะสม</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. ค่าใช้จ่ายดำเนินงานร้าน</span>
              <span className="text-base font-black text-rose-600 mt-0.5 block">{formatBaht(totalExpenses)}</span>
              <span className="text-[10px] text-slate-500">{yearExpenses.length} รายการจ่าย</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. กำไรสุทธิของร้าน</span>
              <span className={`text-base font-black mt-0.5 block ${totalNetProfit >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                {formatBaht(totalNetProfit)}
              </span>
              <span className="text-[10px] font-bold text-slate-600">Margin: {profitMarginPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* SECTION 1: STATEMENT OF COMPREHENSIVE INCOME (งบกำไรขาดทุนเบื้องต้นสำหรับทำบัญชี) */}
          <div className="mb-5 border border-slate-300 rounded-xl p-4 bg-slate-50/40">
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-300 pb-2 mb-3 flex items-center justify-between">
              <span>งบกำไรขาดทุนเบื้องต้น (Statement of Comprehensive Income)</span>
              <span className="text-[10px] font-normal text-slate-500">หน่วย: บาท (THB)</span>
            </h2>

            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Left Column: Revenues & Gross Profit */}
              <div className="space-y-1.5 border-r border-slate-200 pr-4">
                <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">I. รายได้จากการประกอบกิจการ (Revenues)</p>
                <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                  <span>- รายได้ค่าบริการตัดผม (Haircut Services)</span>
                  <span className="font-semibold">{formatBaht(totalHaircut)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                  <span>- รายได้ค่าบริการเคมี (Chemical Treatments)</span>
                  <span className="font-semibold">{formatBaht(totalChemical)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700 pl-2">
                  <span>- รายได้ขายผลิตภัณฑ์บำรุงผม (Retail Products)</span>
                  <span className="font-semibold">{formatBaht(totalProduct)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-rose-700 pl-2">
                  <span>- หัก: ส่วนลดการค้าและโปรโมชั่น (Sales Discounts)</span>
                  <span className="font-semibold">-{formatBaht(totalDiscounts)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 border-t border-slate-200 bg-emerald-50/60 px-2 rounded-md">
                  <span>รวมรายได้สุทธิจากลูกค้า (Gross Turnover)</span>
                  <span className="text-emerald-800">{formatBaht(totalCustomerPaid)}</span>
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

              {/* Right Column: Operating Expenses & Net Profit */}
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
                  <span className="text-rose-800">-{formatBaht(totalExpenses)}</span>
                </div>

                <div className="pt-2">
                  <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">IV. สรุปผลกำไรสุทธิประจำปี (Net Income)</p>
                  <div className="flex justify-between py-1.5 font-black text-sm border-2 border-slate-900 bg-slate-900 text-white px-3 rounded-lg mt-1">
                    <span>กำไรสุทธิก่อนภาษี (Net Profit Before Tax)</span>
                    <span className="text-amber-300">{formatBaht(totalNetProfit)}</span>
                  </div>
                </div>

                {/* Cash vs Bank Transfer Summary */}
                <div className="pt-1 text-[10px] text-slate-500 flex justify-between px-1">
                  <span>💵 รับเงินสด: <strong>{formatBaht(totalCash)}</strong> ({totalCustomerPaid > 0 ? ((totalCash / totalCustomerPaid) * 100).toFixed(1) : 0}%)</span>
                  <span>📲 รับเงินโอน/QR: <strong>{formatBaht(totalTransfer)}</strong> ({totalCustomerPaid > 0 ? ((totalTransfer / totalCustomerPaid) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: 12-MONTH DETAILED FINANCIAL TABLE (JANUARY - DECEMBER) */}
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
                  <td className="p-1.5 border-r border-slate-800 text-amber-300">{formatBaht(totalCustomerPaid)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalHaircut)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalChemical)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalProduct)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-rose-300">-{formatBaht(totalDiscounts)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalCash)}</td>
                  <td className="p-1.5 border-r border-slate-800">{formatBaht(totalTransfer)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-orange-300">{formatBaht(totalBarberShare)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-rose-300">{formatBaht(totalExpenses)}</td>
                  <td className="p-1.5 border-r border-slate-800 text-emerald-300">{formatBaht(totalNetProfit)}</td>
                  <td className="p-1.5 text-center font-mono">{totalBills}</td>
                </tr>

                {/* AVERAGE ROW */}
                <tr className="bg-slate-100 text-slate-800 font-bold text-right text-[9.5px]">
                  <td className="p-1 text-left border-r border-slate-300">เฉลี่ยต่อเดือน</td>
                  <td className="p-1 border-r border-slate-300 text-emerald-700">{formatBaht(avgMonthlyRevenue)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalHaircut / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalChemical / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalProduct / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-rose-600">-{formatBaht(totalDiscounts / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalCash / 12)}</td>
                  <td className="p-1 border-r border-slate-300">{formatBaht(totalTransfer / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-orange-700">{formatBaht(totalBarberShare / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-rose-700">{formatBaht(totalExpenses / 12)}</td>
                  <td className="p-1 border-r border-slate-300 text-teal-800">{formatBaht(avgMonthlyProfit)}</td>
                  <td className="p-1 text-center font-mono">{(totalBills / 12).toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 3: BARBER PERFORMANCE & COMMISSION AUDIT */}
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

          {/* SECTION 4: ACCOUNTING CERTIFICATION & SIGNATURE BLOCKS */}
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
              <span>หน้า 1 จาก 1 • ออกเอกสารเมื่อ {new Date().toLocaleString('th-TH')}</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
