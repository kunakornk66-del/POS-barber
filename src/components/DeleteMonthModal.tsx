import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  Download, 
  X, 
  CheckCircle2, 
  Lock, 
  RefreshCw, 
  FileSpreadsheet, 
  Receipt, 
  Coins, 
  ArrowDownCircle, 
  FileText, 
  AlertCircle,
  CheckSquare,
  Square
} from 'lucide-react';
import { SaleRecord, Expense, Payslip, ShopConfig } from '../types';
import { 
  formatBaht, 
  formatThaiDate, 
  formatThaiMonth, 
  downloadExcelReport,
  getSalePaymentBreakdown 
} from '../utils';

interface DeleteMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string;
  sales: SaleRecord[];
  expenses?: Expense[];
  payslips?: Payslip[];
  shopConfig?: ShopConfig;
  onDeleteMonth: (
    monthStr: string,
    options: {
      deleteSales: boolean;
      deleteExpenses: boolean;
      deletePayslips: boolean;
    }
  ) => Promise<{ deletedSalesCount: number; deletedExpensesCount: number; deletedPayslipsCount: number }>;
}

export default function DeleteMonthModal({
  isOpen,
  onClose,
  initialMonth,
  sales = [],
  expenses = [],
  payslips = [],
  shopConfig,
  onDeleteMonth
}: DeleteMonthModalProps) {
  // Extract all distinct months available in sales, expenses, and payslips
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    sales.forEach(s => {
      const d = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
      if (d && d.length >= 7) monthsSet.add(d.substring(0, 7));
    });

    expenses.forEach(e => {
      const d = e.date || '';
      if (d && d.length >= 7) monthsSet.add(d.substring(0, 7));
    });

    payslips.forEach(p => {
      if (p.month) monthsSet.add(p.month);
      else if (p.timestamp && p.timestamp.length >= 7) monthsSet.add(p.timestamp.substring(0, 7));
    });

    const nowMonth = new Date().toISOString().substring(0, 7);
    monthsSet.add(nowMonth);

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [sales, expenses, payslips]);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || availableMonths[0] || new Date().toISOString().substring(0, 7));
  const [deleteSales, setDeleteSales] = useState<boolean>(true);
  const [deleteExpenses, setDeleteExpenses] = useState<boolean>(true);
  const [deletePayslips, setDeletePayslips] = useState<boolean>(true);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    month: string;
    salesCount: number;
    expensesCount: number;
    payslipsCount: number;
  } | null>(null);

  // Sync initial month when modal opens or initialMonth changes
  useEffect(() => {
    if (isOpen) {
      if (initialMonth && availableMonths.includes(initialMonth)) {
        setSelectedMonth(initialMonth);
      } else if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
      }
      setIsConfirmed(false);
      setPinInput('');
      setPinError(null);
      setDeleteResult(null);
    }
  }, [isOpen, initialMonth, availableMonths]);

  // Calculate statistics for the currently selected month
  const monthStats = useMemo(() => {
    const monthSales = sales.filter(s => {
      const d = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
      return d && d.startsWith(selectedMonth);
    });

    const monthExpenses = expenses.filter(e => {
      const d = e.date || '';
      return d.startsWith(selectedMonth);
    });

    const monthPayslips = payslips.filter(p => {
      return p.month === selectedMonth || (p.timestamp && p.timestamp.startsWith(selectedMonth));
    });

    const totalGrossSales = monthSales.reduce((sum, s) => sum + (s.customerPaid || 0), 0);
    const totalShopRevenue = monthSales.reduce((sum, s) => sum + (s.shopTotalShare || 0), 0);
    const totalBarberPayout = monthSales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0);
    const totalExpensesAmount = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      monthSales,
      monthExpenses,
      monthPayslips,
      salesCount: monthSales.length,
      expensesCount: monthExpenses.length,
      payslipsCount: monthPayslips.length,
      totalGrossSales,
      totalShopRevenue,
      totalBarberPayout,
      totalExpensesAmount,
      totalRecords: monthSales.length + monthExpenses.length + monthPayslips.length
    };
  }, [sales, expenses, payslips, selectedMonth]);

  if (!isOpen) return null;

  // Handle Export Backup before deletion
  const handleBackupMonthData = () => {
    const title = `สำรองข้อมูลก่อนลบ_เดือน_${selectedMonth}_${shopConfig?.shopName || 'ร้าน'}`;
    const headers = ['ประเภทข้อมูล', 'วันที่/เวลา', 'รหัสอ้างอิง', 'รายการ/รายละเอียด', 'ยอดเงิน (บาท)', 'หมายเหตุ'];
    
    const rows: string[][] = [];

    // 1. Sales
    rows.push(['--- รายการบิลขาย (Sales Records) ---', '', '', '', '', '']);
    monthStats.monthSales.forEach(s => {
      rows.push([
        'บิลขาย',
        s.date || (s.timestamp ? s.timestamp.split('T')[0] : ''),
        s.id,
        `ช่าง: ${s.barberName} | ลูกค้า: ${s.customerName || 'ลูกค้าทั่วไป'}`,
        (s.customerPaid || 0).toString(),
        `ส่วนร้าน: ${s.shopTotalShare} | ส่วนช่าง: ${s.barberTotalShare} | ชำระ: ${s.paymentMethod}`
      ]);
    });

    // 2. Expenses
    rows.push([]);
    rows.push(['--- รายการรายจ่าย (Expenses) ---', '', '', '', '', '']);
    monthStats.monthExpenses.forEach(e => {
      rows.push([
        'รายจ่าย',
        e.date,
        e.id,
        `${e.notes || 'รายจ่าย'} (${e.category}) - ผู้รับ: ${e.payee || '-'}`,
        (e.amount || 0).toString(),
        e.notes || '-'
      ]);
    });

    // 3. Payslips
    rows.push([]);
    rows.push(['--- สลิปเงินเดือน (Payslips) ---', '', '', '', '', '']);
    monthStats.monthPayslips.forEach(p => {
      const comm = (p.haircutCommission || 0) + (p.chemicalCommission || 0) + (p.productCommission || 0);
      rows.push([
        'สลิปเงินเดือน',
        p.timestamp || p.month,
        p.id,
        `ช่าง: ${p.barberName} | รอบเดือน: ${p.month}`,
        (p.netPaid || 0).toString(),
        `ฐาน: ${p.baseSalary || 0} | ส่วนแบ่งรวม: ${comm} | ทิป: ${p.tips || 0} | รับสุทธิ: ${p.netPaid || 0}`
      ]);
    });

    downloadExcelReport(title, rows, headers);
  };

  const handleExecuteDelete = async () => {
    // PIN Validation if shop has pin protection active
    if (shopConfig?.isPinLocked && shopConfig?.pinCode) {
      if (pinInput.trim() !== shopConfig.pinCode.trim()) {
        setPinError('รหัสผ่าน PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        return;
      }
    }

    if (!deleteSales && !deleteExpenses && !deletePayslips) {
      alert('กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูลที่ต้องการลบ');
      return;
    }

    if (!isConfirmed) {
      alert('กรุณาทำเครื่องหมายยินยอมเพื่อยืนยันความปลอดภัย');
      return;
    }

    try {
      setIsDeleting(true);
      setPinError(null);

      const result = await onDeleteMonth(selectedMonth, {
        deleteSales,
        deleteExpenses,
        deletePayslips
      });

      setDeleteResult({
        success: true,
        month: selectedMonth,
        salesCount: result.deletedSalesCount,
        expensesCount: result.deletedExpensesCount,
        payslipsCount: result.deletedPayslipsCount
      });
    } catch (err: any) {
      console.error('Error deleting month data:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (err?.message || 'โปรดลองอีกครั้ง'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">ลบข้อมูลประจำเดือน (Delete Month Data)</h3>
              <p className="text-xs text-rose-100 font-medium">เลือกเดือนที่บันทึกข้อมูลไม่ครบหรือไม่ถูกต้องเพื่อลบออก</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
          
          {deleteResult?.success ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  ลบข้อมูลเดือน {formatThaiMonth(deleteResult.month)} สำเร็จเรียบร้อย!
                </h4>
                <p className="text-xs text-slate-500">
                  ระบบได้ทำการล้างข้อมูลออกจาก Cloud และฐานข้อมูลเรียบร้อยแล้ว
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto space-y-1.5 text-left font-medium">
                <div className="flex justify-between">
                  <span>🧾 บิลยอดขายที่ถูกลบ:</span>
                  <span className="font-bold text-rose-600">{deleteResult.salesCount} บิล</span>
                </div>
                <div className="flex justify-between">
                  <span>💸 รายการรายจ่ายที่ถูกลบ:</span>
                  <span className="font-bold text-rose-600">{deleteResult.expensesCount} รายการ</span>
                </div>
                <div className="flex justify-between">
                  <span>📄 ประวัติสลิปเงินเดือนที่ถูกลบ:</span>
                  <span className="font-bold text-rose-600">{deleteResult.payslipsCount} ฉบับ</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  ปิดหน้าต่างนี้ (เสร็จสิ้น)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Month */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span>1. เลือกเดือนที่ต้องการลบข้อมูล:</span>
                </label>

                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setIsConfirmed(false);
                    }}
                    disabled={isDeleting}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all cursor-pointer"
                  >
                    {availableMonths.map(m => {
                      const mSales = sales.filter(s => {
                        const d = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
                        return d && d.startsWith(m);
                      }).length;
                      const mExp = expenses.filter(e => (e.date || '').startsWith(m)).length;
                      const totalItems = mSales + mExp;

                      return (
                        <option key={m} value={m}>
                          {formatThaiMonth(m)} ({m}) {totalItems > 0 ? `— มีข้อมูล ${totalItems} รายการ` : '— ไม่มีข้อมูล'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Step 2: Summary of Data Found in Selected Month */}
              <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>สรุปข้อมูลที่พบในรอบเดือน {formatThaiMonth(selectedMonth)}</span>
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    รวม {monthStats.totalRecords} รายการ
                  </span>
                </div>

                {monthStats.totalRecords === 0 ? (
                  <div className="p-4 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    ไม่พบข้อมูลบิลขายหรือรายจ่ายที่บันทึกไว้ในเดือนนี้
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center font-sans">
                    {/* Sales Card */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">บิลยอดขาย</span>
                      <span className="text-base font-black text-slate-900 block font-mono">{monthStats.salesCount} บิล</span>
                      <span className="text-[10px] text-indigo-700 font-bold block">{formatBaht(monthStats.totalGrossSales)}</span>
                    </div>

                    {/* Expenses Card */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">รายจ่าย</span>
                      <span className="text-base font-black text-rose-700 block font-mono">{monthStats.expensesCount} รายการ</span>
                      <span className="text-[10px] text-rose-700 font-bold block">{formatBaht(monthStats.totalExpensesAmount)}</span>
                    </div>

                    {/* Payslips Card */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">สลิปเงินเดือน</span>
                      <span className="text-base font-black text-purple-700 block font-mono">{monthStats.payslipsCount} ฉบับ</span>
                      <span className="text-[10px] text-slate-500 font-bold block">{monthStats.payslipsCount > 0 ? 'บันทึกแล้ว' : '-'}</span>
                    </div>
                  </div>
                )}

                {/* Optional Export Backup */}
                {monthStats.totalRecords > 0 && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/80 text-xs">
                    <span className="text-[11px] text-slate-500">แนะนำ: สำรองข้อมูลเก็บไว้ก่อนลบ</span>
                    <button
                      type="button"
                      onClick={handleBackupMonthData}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ดาวน์โหลดสำรองเดือนนี้ (Excel)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Selection Checkboxes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  2. เลือกหมวดข้อมูลที่ต้องการลบ:
                </label>
                
                <div className="space-y-2">
                  {/* Delete Sales */}
                  <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    deleteSales ? 'bg-rose-50/60 border-rose-300 text-rose-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={deleteSales}
                        onChange={(e) => setDeleteSales(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs">ลบประวัติการขายและบิลทั้งหมดในเดือนนี้</span>
                        <span className="text-[11px] font-normal text-slate-500 block">
                          ({monthStats.salesCount} บิล • รวมยอด {formatBaht(monthStats.totalGrossSales)})
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Delete Expenses */}
                  <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    deleteExpenses ? 'bg-rose-50/60 border-rose-300 text-rose-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={deleteExpenses}
                        onChange={(e) => setDeleteExpenses(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs">ลบรายการรายจ่ายและใบเสร็จในเดือนนี้</span>
                        <span className="text-[11px] font-normal text-slate-500 block">
                          ({monthStats.expensesCount} รายการ • รวมยอด {formatBaht(monthStats.totalExpensesAmount)})
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Delete Payslips */}
                  <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    deletePayslips ? 'bg-rose-50/60 border-rose-300 text-rose-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={deletePayslips}
                        onChange={(e) => setDeletePayslips(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs">ลบประวัติใบแจ้งสลิปเงินเดือนช่างในเดือนนี้</span>
                        <span className="text-[11px] font-normal text-slate-500 block">
                          ({monthStats.payslipsCount} ฉบับ)
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 4: Security Verification */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-start space-x-2.5 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">คำเตือนความปลอดภัย:</span>
                    <span>
                      ข้อมูลของเดือน <strong className="text-rose-700 underline">{formatThaiMonth(selectedMonth)}</strong> ที่เลือกจะถูกลบออกจากระบบอย่างถาวร โดยข้อมูลของเดือนอื่นๆ และการตั้งค่าร้านค้า รายชื่อช่าง สินค้า จะไม่ได้รับผลกระทบใดๆ
                    </span>
                  </div>
                </div>

                {/* PIN Code Verification if enabled */}
                {shopConfig?.isPinLocked && shopConfig?.pinCode && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-700" />
                      <span>ใส่รหัสผ่าน PIN ร้านค้าเพื่อยืนยันสิทธิ์:</span>
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="ใส่รหัส PIN ร้านค้า"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError(null);
                      }}
                      className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono text-center tracking-widest focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                    {pinError && (
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{pinError}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Checkbox confirmation */}
                <label className="flex items-center space-x-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ฉันเข้าใจและยืนยันต้องการลบข้อมูลเดือน {formatThaiMonth(selectedMonth)}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting || !isConfirmed || (!deleteSales && !deleteExpenses && !deletePayslips) || monthStats.totalRecords === 0}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังลบข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>ลบข้อมูลเดือน {formatThaiMonth(selectedMonth)}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
