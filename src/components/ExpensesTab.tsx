import React, { useState } from 'react';
import { Expense, SaleRecord } from '../types';
import { formatBaht, formatThaiDate, formatThaiMonth } from '../utils';

const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalMonthString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};
import { 
  ArrowDownCircle, 
  PlusCircle, 
  Clock, 
  Trash2, 
  Plus, 
  BookmarkCheck, 
  DollarSign, 
  TrendingDown, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ExpensesTabProps {
  userEmail: string | null;
  expenses: Expense[];
  sales: SaleRecord[];
  onUpdateExpenses: (expenses: Expense[]) => void;
}

export function ExpensesTab({ userEmail, expenses, sales, onUpdateExpenses }: ExpensesTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthString());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');

  // New Expense Entry Form State
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('supplies');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseNotes, setExpenseNotes] = useState<string>('');
  const [expensePayee, setExpensePayee] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(getLocalDateString());
  const [expenseIsFromDrawer, setExpenseIsFromDrawer] = useState<boolean>(true);

  // Draft Expenses State
  const [draftExpenses, setDraftExpenses] = useState<Expense[]>([]);

  // Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Calculate Statistics
  const todayStr = getLocalDateString();
  const currentMonthStr = getLocalMonthString();

  const todayExpenses = expenses.filter(e => e.date === todayStr);
  const totalTodayAmount = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTodayFromDrawer = todayExpenses.filter(e => e.isFromDrawer !== false).reduce((sum, e) => sum + e.amount, 0);

  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));
  const totalMonthAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Today Cash Sales for Net Cash Leftover calculation
  const todaySales = sales.filter(s => s.date === todayStr);
  const todayCashSales = todaySales.reduce((sum, s) => {
    if (s.paymentMethod === 'cash') return sum + s.customerPaid;
    if (s.paymentMethod === 'split') return sum + (s.cashAmount || 0);
    return sum;
  }, 0);

  const netCashLeftoverToday = Math.max(0, todayCashSales - totalTodayFromDrawer);

  // Filtered Expenses for the Main Table
  const filteredExpenses = expenses.filter(exp => {
    // Date or Month match
    if (filterMode === 'date') {
      if (exp.date !== selectedDate) return false;
    } else {
      if (!exp.date.startsWith(selectedMonth)) return false;
    }

    // Category match
    if (categoryFilter !== 'all' && exp.category !== categoryFilter) {
      return false;
    }

    // Search query match
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchPayee = exp.payee && exp.payee.toLowerCase().includes(q);
      const matchNotes = exp.notes && exp.notes.toLowerCase().includes(q);
      const matchCat = exp.category.toLowerCase().includes(q);
      if (!matchPayee && !matchNotes && !matchCat) return false;
    }

    return true;
  });

  const filteredTotalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Handlers
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

    let catText = 'เบ็ดเตล็ด';
    if (expenseCategory === 'supplies') catText = 'ซื้อวัสดุ/อุปกรณ์';
    else if (expenseCategory === 'utilities') catText = 'ค่าน้ำ-ไฟ-อินเทอร์เน็ต';
    else if (expenseCategory === 'rent') catText = 'ค่าเช่าสถานที่';
    else if (expenseCategory === 'marketing') catText = 'ค่าทำโฆษณา';
    else if (expenseCategory === 'salary') catText = 'สวัสดิการ/ค่าแรงพิเศษ';
    else if (expenseCategory === 'loans') catText = 'เบิกถอนโดยเจ้าของร้าน';

    setConfirmDialog({
      isOpen: true,
      title: '📋 ยืนยันบันทึกรายจ่ายด่วน',
      message: `คุณแน่ใจหรือไม่ว่าต้องการบันทึกรายการรายจ่ายนี้ลงสู่ฐานข้อมูลทันที?\n\n• จำนวนเงิน: ${formatBaht(amountNum)}\n• หมวดหมู่: ${catText}\n• ผู้เบิก/ผู้รับเงิน: ${expensePayee || 'ไม่ระบุ'}\n• รายละเอียด: ${expenseNotes.trim()}\n• แหล่งเงินจ่าย: ${expenseIsFromDrawer ? '💵 หักออกจากลิ้นชัก (เก๊ะเงินสด)' : '💳 จ่ายผ่านบัญชีอื่น/ระบบหลัก'}`,
      confirmText: 'บันทึกรายจ่ายสด',
      onConfirm: () => {
        const newEntry: Expense = {
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          date: expenseDate,
          amount: amountNum,
          category: expenseCategory,
          notes: expenseNotes.trim(),
          payee: expensePayee.trim() || 'ทั่วไป',
          isFromDrawer: expenseIsFromDrawer
        };

        const updated = [newEntry, ...expenses];
        onUpdateExpenses(updated);

        // Reset form inputs
        setExpenseAmount('');
        setExpenseNotes('');
        setExpensePayee('');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

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

    const draftEntry: Expense = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      date: expenseDate,
      amount: amountNum,
      category: expenseCategory,
      notes: expenseNotes.trim(),
      payee: expensePayee.trim() || 'ทั่วไป',
      isFromDrawer: expenseIsFromDrawer
    };

    setDraftExpenses(prev => [...prev, draftEntry]);
    setExpenseAmount('');
    setExpenseNotes('');
  };

  const handleSaveAllDrafts = () => {
    if (draftExpenses.length === 0) return;

    const totalAmount = draftExpenses.reduce((sum, d) => sum + d.amount, 0);

    setConfirmDialog({
      isOpen: true,
      title: '💾 ยืนยันบันทึกรายการร่างทั้งหมด',
      message: `คุณต้องการบันทึกรายการรายจ่ายร่างทั้งหมดจำนวน ${draftExpenses.length} รายการลงสู่ฐานข้อมูลระบบใช่หรือไม่?\n\n- ยอดรวมทั้งหมด: ${formatBaht(totalAmount)}`,
      confirmText: 'บันทึกรายการร่างทั้งหมด',
      onConfirm: () => {
        const updated = [...draftExpenses, ...expenses];
        onUpdateExpenses(updated);
        setDraftExpenses([]);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ ยืนยันลบรายการรายจ่าย',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการรายจ่ายนี้? ยอดใช้จ่ายจะถูกคำนวณใหม่และอัปเดตลงฐานข้อมูลระบบทันที',
      confirmText: 'ลบรายการรายจ่าย',
      onConfirm: () => {
        const updated = expenses.filter(e => e.id !== id);
        onUpdateExpenses(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('ไม่พบข้อมูลรายจ่ายสำหรับส่งออกเป็นไฟล์ CSV');
      return;
    }

    const headers = ['ลำดับ', 'วันที่', 'หมวดหมู่', 'ผู้เบิก/ผู้รับเงิน', 'รายละเอียด/หมายเหตุ', 'จำนวนเงิน (บาท)', 'ตัดเงินจากเก๊ะ'];
    const rows = filteredExpenses.map((exp, idx) => {
      let catText = 'เบ็ดเตล็ด';
      if (exp.category === 'supplies') catText = 'ซื้อวัสดุ/อุปกรณ์';
      else if (exp.category === 'utilities') catText = 'ค่าน้ำ-ไฟ-อินเทอร์เน็ต';
      else if (exp.category === 'rent') catText = 'ค่าเช่าสถานที่';
      else if (exp.category === 'marketing') catText = 'ค่าทำโฆษณา';
      else if (exp.category === 'salary') catText = 'สวัสดิการ/ค่าแรงพิเศษ';
      else if (exp.category === 'loans') catText = 'เบิกถอนโดยเจ้าของร้าน';

      return [
        idx + 1,
        exp.date,
        catText,
        `"${exp.payee || '-'}"`,
        `"${exp.notes.replace(/"/g, '""')}"`,
        exp.amount,
        exp.isFromDrawer !== false ? 'ใช่ (หักเงินสดกะ)' : 'ไม่ใช่ (เงินโอน/บัญชีกลาง)'
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Expenses_Report_${filterMode === 'date' ? selectedDate : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* 1. Header Banner & High-Level Metric Cards */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center space-x-2.5">
              <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl shadow-2xs">
                <ArrowDownCircle className="w-6 h-6 animate-bounce" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  บัญชีควบคุมรายจ่ายและเบิกเงินหน้าร้าน
                </h1>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  ระบบบันทึกงบค่าใช้จ่าย ซื้ออุปกรณ์ การเบิกเงินทุนเจ้าของร้าน และสรุปเงินสดคงเหลือสุทธิ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>ส่งออกรายงาน CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today Expenses */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                รวมรายจ่ายวันนี้ ({formatThaiDate(todayStr)})
              </span>
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {formatBaht(totalTodayAmount)}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              บันทึกแล้ว {todayExpenses.length} รายการ
            </p>
          </div>

          {/* Card 2: Drawer Deductions Today */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                หักจ่ายเงินสดเก๊ะหน้าร้านวันนี้
              </span>
              <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {formatBaht(totalTodayFromDrawer)}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              หักจากยอดขายเงินสดประจำวัน
            </p>
          </div>

          {/* Card 3: Net Cash Remaining Today */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                เงินสดสดคงเหลือในเก๊ะวันนี้
              </span>
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {formatBaht(netCashLeftoverToday)}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              (ยอดขายเงินสด - รายจ่ายหักเก๊ะ)
            </p>
          </div>

          {/* Card 4: Month Total Expenses */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                ยอดรายจ่ายสะสมเดือนนี้ ({formatThaiMonth(currentMonthStr)})
              </span>
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-900 font-mono">
              {formatBaht(totalMonthAmount)}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              บันทึกแล้ว {monthExpenses.length} รายการในเดือนนี้
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid: Entry Form + Filterable Expenses Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Add Expense Entry Form */}
        <form onSubmit={handleAddExpense} className="lg:col-span-12 xl:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <PlusCircle className="w-4 h-4 text-rose-500" />
              <span>✍️ ลงบันทึกรายจ่ายใหม่ / Add Expense Entry</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              บันทึกด่วน
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">หมวดหมู่รายจ่าย *</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as any)}
                className="w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-sans cursor-pointer"
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
                <label className="block text-[11px] font-bold text-slate-700 mb-1">วันที่ทำรายการ *</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 font-mono text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  step="any"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="ใส่ตัวเลข เช่น 500 หรือ 10000"
                  className="w-full bg-slate-50 text-slate-800 font-mono font-bold text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-rose-700"
                  required
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">ผู้รับเงิน / ผู้เบิกถอนเงินสด (Payee)</label>
              <input
                type="text"
                value={expensePayee}
                onChange={(e) => setExpensePayee(e.target.value)}
                placeholder="เช่น ช่างเจ, บจก.โฮมโปร, เจ้าของร้านใหญ่"
                className="w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">รายละเอียดหมายเหตุ * (Audit Notes)</label>
              <textarea
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="เช่น ซื้อแชมพูสระผม 5 ขวดใหญ่, เบิกถอนปันส่วนไปเปิดสาขาใหม่"
                className="w-full h-20 bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 resize-none font-sans"
                required
              ></textarea>
            </div>

            <div className="flex items-center space-x-2.5 bg-rose-50/60 border border-rose-100 p-3 rounded-xl">
              <input
                type="checkbox"
                id="tabExpenseIsFromDrawer"
                checked={expenseIsFromDrawer}
                onChange={(e) => setExpenseIsFromDrawer(e.target.checked)}
                className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="tabExpenseIsFromDrawer" className="text-[11px] font-bold text-rose-950 cursor-pointer select-none flex flex-col font-sans">
                <span>💵 ถอน/จ่ายออกด้วยเงินสดจากลิ้นชัก (เก๊ะเงินหน้าร้าน)</span>
                <span className="text-[9.5px] text-rose-600/80 font-normal">ระบบจะหักลด "ยอดเงินสดคงในเก๊ะเครื่อง" ของวันนั้นให้อัตโนมัติ</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handlePushToDraft}
              className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shadow-2xs cursor-pointer font-sans"
              title="เพิ่มรายการนี้เข้าไปในรายการร่างชั่วคราวก่อน เพื่อบันทึกหลายรายการพร้อมกัน"
            >
              <Plus className="w-4 h-4" />
              <span>➕ เพิ่มเข้ารายการร่าง</span>
            </button>

            <button
              type="submit"
              className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shadow-sm hover:shadow-md cursor-pointer font-sans"
              title="ลงบันทึกรายการนี้เป็นรายจ่ายสดเข้าฐานข้อมูลทันที"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>💾 บันทึกด่วนทันที</span>
            </button>
          </div>

          {/* List of Drafted Items Pending Commit */}
          {draftExpenses.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1">
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
                    <div key={draft.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200/60 text-[11px] hover:border-amber-300 transition-colors">
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

        {/* Right Column: Filterable Expenses History Table */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4 text-left">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            
            {/* Filter Bar Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">
                  ประวัติรายการเบิกจ่ายของร้าน
                </h3>
              </div>

              {/* Mode Toggle & Date/Month Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterMode('date')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'date' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายวัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('month')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายเดือน
                  </button>
                </div>

                {filterMode === 'date' ? (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-50 text-slate-700 font-mono text-xs px-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 text-slate-700 font-mono text-xs px-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* Search and Category Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category Filter */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer font-sans"
                >
                  <option value="all">ทุกหมวดหมู่รายจ่าย</option>
                  <option value="supplies">🛒 ซื้อวัสดุ/อุปกรณ์เข้าร้าน</option>
                  <option value="utilities">⚡ ค่าน้ำ-ไฟ-อินเทอร์เน็ต</option>
                  <option value="rent">🏢 ค่าเช่าสถานที่</option>
                  <option value="marketing">📢 ค่าทำโฆษณา</option>
                  <option value="salary">🧑‍🔧 สวัสดิการ/ค่าแรงพิเศษ</option>
                  <option value="loans">💰 เบิกถอนโดยเจ้าของร้าน</option>
                  <option value="other">☕ อื่น ๆ / เบ็ดเตล็ด</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อผู้เบิก หรือ หมายเหตุ..."
                  className="w-full bg-transparent text-xs text-slate-700 outline-none font-sans"
                />
              </div>
            </div>

            {/* Expenses Table */}
            {filteredExpenses.length === 0 ? (
              <div className="p-10 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">🌱</span>
                <p className="text-xs font-semibold text-slate-600 font-sans">
                  ไม่พบรายการเบิกจ่ายเงินใน{filterMode === 'date' ? `วันที่ ${formatThaiDate(selectedDate)}` : `เดือน ${formatThaiMonth(selectedMonth)}`}
                </p>
                <p className="text-[10px] text-slate-400 font-sans max-w-sm">
                  เมื่อมีการซื้อของ ค่าน้ำไฟ หรือเบิกเงินทุน ให้บันทึกงบการเงินทางเมนูด้านซ้ายเพื่อตัดส่งกำไรอย่างถูกต้อง
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                        <th className="p-3.5 pl-4">วันที่ / หมวดหมู่</th>
                        <th className="p-3.5">ผู้เบิกถอน/รับเงิน</th>
                        <th className="p-3.5">บันทึกหมายเหตุ</th>
                        <th className="p-3.5 text-right">จำนวนเงิน</th>
                        <th className="p-3.5 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map((exp) => {
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
                          catText = "สวัสดิการ/ค่าแรง";
                        } else if (exp.category === 'loans') {
                          badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 font-bold";
                          catText = "เบิกถอนเจ้าของ 💸";
                        }

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5 pl-4 space-y-1">
                              <div className="text-[10px] text-slate-400 font-mono">{exp.date}</div>
                              <span className={`inline-block px-2 py-0.5 border text-[10px] rounded-lg font-bold ${badgeStyle}`}>
                                {catText}
                              </span>
                              {exp.isFromDrawer !== false && (
                                <span className="block text-[8px] text-rose-600 font-extrabold bg-rose-50 px-1 rounded border border-rose-100 max-w-[70px]">
                                  📥 หักในเก๊ะ
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-slate-800">{exp.payee || 'ทั่วไป'}</td>
                            <td className="p-3.5 text-slate-500 max-w-[160px] truncate" title={exp.notes}>
                              {exp.notes}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-rose-600 text-sm">
                              {formatBaht(exp.amount)}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Balance Footer Card */}
                <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-rose-900">
                      รวมยอดรายจ่ายของช่วงเวลาที่เลือก ({filteredExpenses.length} รายการ):
                    </span>
                    <p className="text-[10px] text-slate-500">
                      คำนวณและอัปเดตตรงตามฐานข้อมูลระบบแบบ Real-time
                    </p>
                  </div>
                  <div className="text-lg font-black text-rose-700 font-mono">
                    {formatBaht(filteredTotalAmount)}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5 text-left">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold text-slate-900">{confirmDialog.title}</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-sans bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                {confirmDialog.confirmText || 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
