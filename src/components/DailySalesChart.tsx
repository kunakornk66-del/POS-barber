import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Cell
} from 'recharts';
import { ShopConfig } from '../types';
import { formatBaht, formatThaiDate, formatThaiMonth } from '../utils';
import { 
  TrendingUp, 
  Calendar, 
  Coins, 
  DollarSign, 
  ArrowDownCircle, 
  BarChart3, 
  Search, 
  Sliders, 
  Layers, 
  Check, 
  Sparkles,
  Award,
  Filter,
  Eye
} from 'lucide-react';

export interface DailyBreakdownItem {
  date: string;
  cashAmount: number;
  cashCount: number;
  transferAmount: number;
  transferCount: number;
  totalAmount: number;
  totalBills: number;
  expenseAmount: number;
  netCash: number;
}

interface DailySalesChartProps {
  monthlyDailyBreakdown: DailyBreakdownItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedMonth: string;
  shopConfig?: ShopConfig;
  className?: string;
}

export const DailySalesChart: React.FC<DailySalesChartProps> = ({
  monthlyDailyBreakdown,
  selectedDate,
  onSelectDate,
  selectedMonth,
  shopConfig,
  className = ''
}) => {
  // Chart visual style mode: stacked bars, grouped bars, or area trend
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped' | 'area'>('stacked');
  
  // Series visibility toggles for accountants
  const [seriesConfig, setSeriesConfig] = useState({
    showCash: true,
    showTransfer: true,
    showTotal: true,
    showExpenses: true,
    showNetProfit: true,
    showAverageLine: true
  });

  // Display filter: show all calendar days or only days with sales/expenses
  const [showOnlyActiveDays, setShowOnlyActiveDays] = useState<boolean>(false);

  // Today local date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  }, []);

  // Process and format data for Recharts
  const chartData = useMemo(() => {
    const list = monthlyDailyBreakdown.map((d) => {
      const parts = d.date.split('-');
      const dayNum = parseInt(parts[2], 10) || 1;
      const isSelected = d.date === selectedDate;
      const isToday = d.date === todayStr;
      const netProfit = d.totalAmount - d.expenseAmount;

      return {
        ...d,
        dayNum,
        dayLabel: `${dayNum}`,
        fullDateLabel: formatThaiDate(d.date),
        isSelected,
        isToday,
        netProfit,
      };
    });

    if (showOnlyActiveDays) {
      const activeList = list.filter(d => d.totalAmount > 0 || d.expenseAmount > 0);
      return activeList.length > 0 ? activeList : list;
    }

    return list;
  }, [monthlyDailyBreakdown, selectedDate, todayStr, showOnlyActiveDays]);

  // Accountant Analytical Summary Calculations
  const stats = useMemo(() => {
    const activeDays = monthlyDailyBreakdown.filter(d => d.totalBills > 0 || d.totalAmount > 0);
    const totalSales = monthlyDailyBreakdown.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalCash = monthlyDailyBreakdown.reduce((sum, d) => sum + d.cashAmount, 0);
    const totalTransfer = monthlyDailyBreakdown.reduce((sum, d) => sum + d.transferAmount, 0);
    const totalExpenses = monthlyDailyBreakdown.reduce((sum, d) => sum + d.expenseAmount, 0);
    const totalBills = monthlyDailyBreakdown.reduce((sum, d) => sum + d.totalBills, 0);
    const totalNetProfit = totalSales - totalExpenses;
    const totalNetCash = totalCash - totalExpenses;

    const daysCount = activeDays.length > 0 ? activeDays.length : 1;
    const avgDailySales = totalSales / daysCount;
    const avgDailyBills = totalBills / daysCount;

    // Best / Peak Sales Day
    let peakDay = { date: '', amount: 0, dayNum: 0, bills: 0 };
    monthlyDailyBreakdown.forEach(d => {
      if (d.totalAmount > peakDay.amount) {
        const parts = d.date.split('-');
        peakDay = {
          date: d.date,
          amount: d.totalAmount,
          dayNum: parseInt(parts[2], 10) || 0,
          bills: d.totalBills
        };
      }
    });

    const cashRatio = totalSales > 0 ? (totalCash / totalSales) * 100 : 0;
    const transferRatio = totalSales > 0 ? (totalTransfer / totalSales) * 100 : 0;

    return {
      totalSales,
      totalCash,
      totalTransfer,
      totalExpenses,
      totalBills,
      totalNetProfit,
      totalNetCash,
      activeDaysCount: activeDays.length,
      avgDailySales,
      avgDailyBills,
      peakDay,
      cashRatio,
      transferRatio
    };
  }, [monthlyDailyBreakdown]);

  // Selected Day Details for instant inspector header
  const currentSelectedDayData = useMemo(() => {
    return monthlyDailyBreakdown.find(d => d.date === selectedDate) || null;
  }, [monthlyDailyBreakdown, selectedDate]);

  // Custom Accountant Recharts Tooltip
  const CustomDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;

      const isCurrentSelected = data.date === selectedDate;
      const isToday = data.date === todayStr;

      return (
        <div className="bg-slate-950/95 text-white p-4 rounded-2xl border border-slate-700/80 shadow-2xl text-left font-sans text-xs space-y-2.5 backdrop-blur-md min-w-[260px] z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                <span>📅 {data.fullDateLabel}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {data.date} {isToday ? '• วันนี้' : ''}
              </span>
            </div>
            {isCurrentSelected && (
              <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
                กำลังเลือก
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {/* Total Revenue */}
            <div className="flex items-center justify-between space-x-4 bg-white/5 p-1.5 rounded-xl border border-white/5">
              <span className="flex items-center space-x-1.5 text-slate-200 font-sans text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>ยอดขายรวม ({data.totalBills} บิล):</span>
              </span>
              <span className="font-bold text-white text-xs">{formatBaht(data.totalAmount)}</span>
            </div>

            {/* Cash */}
            <div className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1.5 text-slate-400 font-sans text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>💵 เงินสด ({data.cashCount || 0} รายการ):</span>
              </span>
              <span className="font-bold text-emerald-400">{formatBaht(data.cashAmount)}</span>
            </div>

            {/* Transfer */}
            <div className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1.5 text-slate-400 font-sans text-[11px]">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span>📱 เงินโอน ({data.transferCount || 0} สลิป):</span>
              </span>
              <span className="font-bold text-sky-400">{formatBaht(data.transferAmount)}</span>
            </div>

            {/* Expenses */}
            {data.expenseAmount > 0 && (
              <div className="flex items-center justify-between space-x-4">
                <span className="flex items-center space-x-1.5 text-slate-400 font-sans text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>💸 รายจ่ายหน้าร้าน:</span>
                </span>
                <span className="font-bold text-rose-400">-{formatBaht(data.expenseAmount)}</span>
              </div>
            )}

            {/* Net Cash In Drawer */}
            <div className="flex items-center justify-between space-x-4 pt-1.5 border-t border-slate-800">
              <span className="flex items-center space-x-1.5 text-slate-300 font-sans text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>🏦 เงินสดคงเหลือนำส่ง:</span>
              </span>
              <span className={`font-bold text-xs ${data.netCash >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {formatBaht(data.netCash)}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center bg-slate-900/80 py-1 px-2 rounded-lg border border-slate-800 font-sans flex items-center justify-center space-x-1">
            <Search className="w-3 h-3 text-indigo-400" />
            <span>คลิกแท่งกราฟเพื่อเจาะลึกรายการของวันนี้</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-slate-200/90 p-5 sm:p-6 space-y-5 ${className}`}>
      
      {/* 1. Header & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/60 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-sans flex items-center space-x-2">
                <span>กราฟสรุปยอดขายและรายรับรายวัน (Daily Revenue & Cash Flow Chart)</span>
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                วิเคราะห์การเติบโตของรายได้รายวัน แยกยอดเงินสด เงินโอน รายจ่าย และยอดเงินสดคงเหลือนำส่ง ประจำเดือน <span className="font-bold text-slate-800">{formatThaiMonth(selectedMonth)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action / Mode Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Style Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                chartMode === 'stacked'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แสดงแท่งแบบเรียงซ้อน (เงินสด + เงินโอน = ยอดขายรวม)"
            >
              <span>📊 แท่งซ้อน (Stacked)</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                chartMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แสดงแท่งเปรียบเทียบแยกช่องทาง"
            >
              <span>📶 แท่งคู่ (Grouped)</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                chartMode === 'area'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แสดงกราฟพื้นที่และเส้นแนวโน้ม"
            >
              <span>📈 พื้นที่ (Area Trend)</span>
            </button>
          </div>

          {/* Active Days Filter */}
          <button
            type="button"
            onClick={() => setShowOnlyActiveDays(!showOnlyActiveDays)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
              showOnlyActiveDays
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showOnlyActiveDays ? 'เฉพาะวันที่มีบิล' : 'แสดงทุกวันในเดือน'}</span>
          </button>
        </div>
      </div>

      {/* 2. Accountant KPI Summary Cards (Compact 3-Card Insight Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
        
        {/* Metric 1: Total Sales */}
        <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-1">
          <span className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              <span>รายรับสะสมทั้งเดือน</span>
            </span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
              {stats.totalBills} บิล
            </span>
          </span>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
            {formatBaht(stats.totalSales)}
          </div>
          <span className="text-[11px] text-slate-500 font-sans block">
            เงินสด {formatBaht(stats.totalCash)} ({stats.cashRatio.toFixed(0)}%) • โอน {formatBaht(stats.totalTransfer)} ({stats.transferRatio.toFixed(0)}%)
          </span>
        </div>

        {/* Metric 2: Avg Daily Sales */}
        <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-1">
          <span className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>ยอดขายเฉลี่ยต่อวัน</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
              {stats.avgDailyBills.toFixed(1)} บิล/วัน
            </span>
          </span>
          <div className="text-xl font-black text-emerald-700 font-mono tracking-tight pt-0.5">
            {formatBaht(stats.avgDailySales)}
          </div>
          <span className="text-[11px] text-slate-500 font-sans block">
            คำนวณจาก {stats.activeDaysCount} วันที่มีการบันทึกรายการ
          </span>
        </div>

        {/* Metric 3: Peak Sales Day */}
        <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-1">
          <span className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>วันยอดขายสูงสุด (Peak Day)</span>
            </span>
            {stats.peakDay.dayNum > 0 && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-sans">
                วันที่ {stats.peakDay.dayNum}
              </span>
            )}
          </span>
          <div className="text-xl font-black text-amber-700 font-mono tracking-tight pt-0.5">
            {stats.peakDay.amount > 0 ? formatBaht(stats.peakDay.amount) : '-'}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold font-sans block truncate">
            {stats.peakDay.dayNum > 0 ? `บันทึกรายการขาย ${stats.peakDay.bills} บิล` : 'ยังไม่มีข้อมูลการขายในเดือนนี้'}
          </span>
        </div>

      </div>

      {/* 3. Series Toggle Bar & Currently Selected Date Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/60 p-3 rounded-2xl border border-slate-200/60">
        
        {/* Toggleable Series Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center space-x-1">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span>แสดงบนกราฟ:</span>
          </span>

          <button
            type="button"
            onClick={() => setSeriesConfig(prev => ({ ...prev, showCash: !prev.showCash }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              seriesConfig.showCash
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>💵 เงินสด</span>
          </button>

          <button
            type="button"
            onClick={() => setSeriesConfig(prev => ({ ...prev, showTransfer: !prev.showTransfer }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              seriesConfig.showTransfer
                ? 'bg-sky-50 border-sky-300 text-sky-800'
                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>📱 เงินโอน</span>
          </button>

          {chartMode !== 'stacked' && (
            <button
              type="button"
              onClick={() => setSeriesConfig(prev => ({ ...prev, showTotal: !prev.showTotal }))}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                seriesConfig.showTotal
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                  : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>💰 ยอดรับรวม</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSeriesConfig(prev => ({ ...prev, showExpenses: !prev.showExpenses }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              seriesConfig.showExpenses
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>💸 รายจ่ายหน้าร้าน</span>
          </button>

          <button
            type="button"
            onClick={() => setSeriesConfig(prev => ({ ...prev, showNetProfit: !prev.showNetProfit }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              seriesConfig.showNetProfit
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>📈 เส้นเงินสดคงเหลือสุทธิ</span>
          </button>

          <button
            type="button"
            onClick={() => setSeriesConfig(prev => ({ ...prev, showAverageLine: !prev.showAverageLine }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              seriesConfig.showAverageLine
                ? 'bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
            }`}
          >
            <span className="w-2 h-0.5 bg-slate-600"></span>
            <span>เส้นค่าเฉลี่ย</span>
          </button>
        </div>

        {/* Active Inspection Indicator */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-slate-500">
            วันที่เลือกตรวจ:
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-bold text-[11px] shadow-2xs flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{selectedDate}</span>
          </span>
        </div>
      </div>

      {/* 4. Interactive Recharts Canvas */}
      <div className="h-80 sm:h-96 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const clickedDate = state.activePayload[0].payload.date;
                if (clickedDate) {
                  onSelectDate(clickedDate);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="dayNum" 
              tick={({ x, y, payload }) => {
                const item = chartData.find(d => d.dayNum === payload.value);
                const isSelected = item?.isSelected;
                const isToday = item?.isToday;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={12}
                      textAnchor="middle"
                      fill={isSelected ? '#4f46e5' : isToday ? '#059669' : '#64748b'}
                      fontWeight={isSelected || isToday ? 'bold' : 'normal'}
                      fontSize={isSelected ? 11 : 10}
                      fontFamily="sans-serif"
                    >
                      {payload.value}
                    </text>
                    {isSelected && (
                      <circle cx={0} cy={18} r={2} fill="#4f46e5" />
                    )}
                  </g>
                );
              }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomDailyTooltip />} />

            {/* Average Reference Line */}
            {seriesConfig.showAverageLine && stats.avgDailySales > 0 && (
              <ReferenceLine 
                y={stats.avgDailySales} 
                stroke="#94a3b8" 
                strokeDasharray="4 4" 
                label={{ 
                  value: `เฉลี่ย ${formatBaht(stats.avgDailySales)}`, 
                  fill: '#64748b', 
                  fontSize: 10, 
                  position: 'insideTopRight' 
                }} 
              />
            )}

            {/* CHART MODE 1: STACKED (Cash + Transfer = Total) */}
            {chartMode === 'stacked' && (
              <>
                {seriesConfig.showCash && (
                  <Bar 
                    name="💵 ยอดเงินสด" 
                    dataKey="cashAmount" 
                    stackId="salesStack" 
                    fill="#10b981" 
                    radius={[0, 0, 0, 0]} 
                    maxBarSize={24}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-cash-${index}`} 
                        fill={entry.isSelected ? '#059669' : '#10b981'} 
                        stroke={entry.isSelected ? '#047857' : undefined}
                        strokeWidth={entry.isSelected ? 2 : 0}
                      />
                    ))}
                  </Bar>
                )}

                {seriesConfig.showTransfer && (
                  <Bar 
                    name="📱 ยอดเงินโอน" 
                    dataKey="transferAmount" 
                    stackId="salesStack" 
                    fill="#0284c7" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={24}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-transfer-${index}`} 
                        fill={entry.isSelected ? '#0369a1' : '#0284c7'} 
                        stroke={entry.isSelected ? '#075985' : undefined}
                        strokeWidth={entry.isSelected ? 2 : 0}
                      />
                    ))}
                  </Bar>
                )}

                {seriesConfig.showExpenses && (
                  <Bar 
                    name="💸 รายจ่ายหน้าร้าน" 
                    dataKey="expenseAmount" 
                    fill="#f43f5e" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={14}
                    cursor="pointer"
                  />
                )}

                {seriesConfig.showNetProfit && (
                  <Line 
                    name="🏦 เงินสดคงเหลือสุทธิ" 
                    type="monotone" 
                    dataKey="netCash" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1, fill: '#ffffff', stroke: '#f59e0b' }}
                    activeDot={{ r: 6, stroke: '#d97706', strokeWidth: 2 }}
                  />
                )}
              </>
            )}

            {/* CHART MODE 2: GROUPED BARS */}
            {chartMode === 'grouped' && (
              <>
                {seriesConfig.showTotal && (
                  <Bar 
                    name="💰 ยอดรับรวม" 
                    dataKey="totalAmount" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={16}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-total-${index}`} 
                        fill={entry.isSelected ? '#4338ca' : '#6366f1'} 
                      />
                    ))}
                  </Bar>
                )}

                {seriesConfig.showCash && (
                  <Bar 
                    name="💵 ยอดเงินสด" 
                    dataKey="cashAmount" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={14}
                    cursor="pointer"
                  />
                )}

                {seriesConfig.showTransfer && (
                  <Bar 
                    name="📱 ยอดเงินโอน" 
                    dataKey="transferAmount" 
                    fill="#0284c7" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={14}
                    cursor="pointer"
                  />
                )}

                {seriesConfig.showExpenses && (
                  <Bar 
                    name="💸 รายจ่าย" 
                    dataKey="expenseAmount" 
                    fill="#f43f5e" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={12}
                    cursor="pointer"
                  />
                )}

                {seriesConfig.showNetProfit && (
                  <Line 
                    name="🏦 เงินสดคงเหลือสุทธิ" 
                    type="monotone" 
                    dataKey="netCash" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1, fill: '#ffffff', stroke: '#f59e0b' }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </>
            )}

            {/* CHART MODE 3: AREA & TREND */}
            {chartMode === 'area' && (
              <>
                {seriesConfig.showTotal && (
                  <Area 
                    name="💰 ยอดรับรวม" 
                    type="monotone" 
                    dataKey="totalAmount" 
                    fill="#6366f1" 
                    fillOpacity={0.15} 
                    stroke="#6366f1" 
                    strokeWidth={2.5} 
                  />
                )}

                {seriesConfig.showCash && (
                  <Area 
                    name="💵 ยอดเงินสด" 
                    type="monotone" 
                    dataKey="cashAmount" 
                    fill="#10b981" 
                    fillOpacity={0.12} 
                    stroke="#10b981" 
                    strokeWidth={2} 
                  />
                )}

                {seriesConfig.showTransfer && (
                  <Area 
                    name="📱 ยอดเงินโอน" 
                    type="monotone" 
                    dataKey="transferAmount" 
                    fill="#0284c7" 
                    fillOpacity={0.12} 
                    stroke="#0284c7" 
                    strokeWidth={2} 
                  />
                )}

                {seriesConfig.showExpenses && (
                  <Line 
                    name="💸 รายจ่าย" 
                    type="monotone" 
                    dataKey="expenseAmount" 
                    stroke="#f43f5e" 
                    strokeWidth={2} 
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: '#f43f5e' }}
                  />
                )}

                {seriesConfig.showNetProfit && (
                  <Line 
                    name="🏦 เงินสดคงเหลือสุทธิ" 
                    type="monotone" 
                    dataKey="netCash" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 1, fill: '#ffffff', stroke: '#f59e0b' }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Drill-down Day Inspector Bar */}
      {currentSelectedDayData && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in font-sans">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>สรุปเจาะลึกวันที่เลือก:</span>
              </span>
              <span className="text-sm font-black text-white font-mono">
                {formatThaiDate(selectedDate)}
              </span>
              {selectedDate === todayStr && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  วันนี้
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              คลิกแท่งอื่นบนกราฟด้านบนเพื่อสลับดูข้อมูลรายวันของแต่ละวันได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-300 font-sans block">บิลขายรวม</span>
              <span className="font-bold text-white text-sm">{currentSelectedDayData.totalBills} บิล</span>
            </div>

            <div className="bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-300">
              <span className="text-[10px] text-emerald-400 font-sans block">💵 เงินสด</span>
              <span className="font-bold text-sm">{formatBaht(currentSelectedDayData.cashAmount)}</span>
            </div>

            <div className="bg-sky-500/20 px-3 py-1.5 rounded-xl border border-sky-500/30 text-sky-300">
              <span className="text-[10px] text-sky-400 font-sans block">📱 เงินโอน</span>
              <span className="font-bold text-sm">{formatBaht(currentSelectedDayData.transferAmount)}</span>
            </div>

            <div className="bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300">
              <span className="text-[10px] text-amber-400 font-sans block">💰 ยอดรับรวม</span>
              <span className="font-bold text-sm text-white">{formatBaht(currentSelectedDayData.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
