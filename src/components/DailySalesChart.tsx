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
  Sliders, 
  Check, 
  Sparkles,
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
  // Chart visual style mode: stacked or grouped bars
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  
  // Series visibility toggles
  const [seriesConfig, setSeriesConfig] = useState({
    showCash: true,
    showTransfer: true,
    showTotal: true,
    showExpenses: true,
    showNetProfit: true,
    showAverageLine: true
  });

  // Display filter: show all calendar days or only active days
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
        dayLabel: `ว.${dayNum}`,
        fullDateLabel: formatThaiDate(d.date),
        isSelected,
        isToday,
        netProfit
      };
    });

    if (showOnlyActiveDays) {
      return list.filter(d => d.totalAmount > 0 || d.expenseAmount > 0);
    }
    return list;
  }, [monthlyDailyBreakdown, selectedDate, todayStr, showOnlyActiveDays]);

  // High-level summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRev = monthlyDailyBreakdown.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalCash = monthlyDailyBreakdown.reduce((sum, d) => sum + d.cashAmount, 0);
    const totalTransfer = monthlyDailyBreakdown.reduce((sum, d) => sum + d.transferAmount, 0);
    const totalExp = monthlyDailyBreakdown.reduce((sum, d) => sum + d.expenseAmount, 0);
    const totalBills = monthlyDailyBreakdown.reduce((sum, d) => sum + d.totalBills, 0);
    const activeDays = monthlyDailyBreakdown.filter(d => d.totalAmount > 0).length;
    const avgDailyRev = activeDays > 0 ? Math.round(totalRev / activeDays) : 0;
    
    // Find best sales day
    let bestDay: DailyBreakdownItem | null = null;
    monthlyDailyBreakdown.forEach(d => {
      if (!bestDay || d.totalAmount > bestDay.totalAmount) {
        bestDay = d;
      }
    });

    return {
      totalRev,
      totalCash,
      totalTransfer,
      totalExp,
      totalBills,
      activeDays,
      avgDailyRev,
      bestDay
    };
  }, [monthlyDailyBreakdown]);

  const toggleSeries = (key: keyof typeof seriesConfig) => {
    setSeriesConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-5 shadow-xs ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>กราฟสรุปยอดขายและรายรับรายวัน</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  ({formatThaiMonth(selectedMonth)})
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                วิเคราะห์กระแสเงินสด เงินสด vs เงินโอน รายจ่าย และกำไรสุทธิรายวัน พร้อมคลิกแท่งกราฟเพื่อดูบิลวันนั้น
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Active Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แท่งซ้อน (Stacked)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แท่งคู่ (Grouped)
            </button>
          </div>

          {/* Filter: Only active days */}
          <button
            type="button"
            onClick={() => setShowOnlyActiveDays(!showOnlyActiveDays)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showOnlyActiveDays
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showOnlyActiveDays ? 'เฉพาะวันมียอด' : 'ทุกวันในเดือน'}</span>
          </button>
        </div>
      </div>

      {/* Series Toggles Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        <span className="text-xs text-slate-500 font-bold flex items-center gap-1 mr-1">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>แสดงข้อมูล:</span>
        </span>

        <button
          type="button"
          onClick={() => toggleSeries('showCash')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            seriesConfig.showCash
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>💵 เงินสด</span>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('showTransfer')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            seriesConfig.showTransfer
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          <span>📱 เงินโอน</span>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('showExpenses')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            seriesConfig.showExpenses
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>💸 รายจ่าย</span>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('showNetProfit')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            seriesConfig.showNetProfit
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
              : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span>📈 กำไรสุทธิ</span>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('showAverageLine')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            seriesConfig.showAverageLine
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>📊 เส้นเฉลี่ย ({formatBaht(summaryMetrics.avgDailyRev)}/วัน)</span>
        </button>
      </div>

      {/* Main Chart Area */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const itemDate = state.activePayload[0]?.payload?.date;
                if (itemDate) {
                  onSelectDate(itemDate);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="dayLabel" 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as DailyBreakdownItem & { isToday: boolean; isSelected: boolean; netProfit: number };
                  return (
                    <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-2 min-w-[200px] z-50">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{formatThaiDate(data.date)}</span>
                        </span>
                        {data.isToday && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                            วันนี้
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span className="text-emerald-400 font-sans">💵 เงินสด:</span>
                          <span className="font-bold">{formatBaht(data.cashAmount)} ({data.cashCount} บิล)</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-sky-400 font-sans">📱 เงินโอน:</span>
                          <span className="font-bold">{formatBaht(data.transferAmount)} ({data.transferCount} สลิป)</span>
                        </div>
                        {data.expenseAmount > 0 && (
                          <div className="flex justify-between text-rose-400">
                            <span className="font-sans">💸 รายจ่าย:</span>
                            <span className="font-bold">-{formatBaht(data.expenseAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t border-slate-800 text-indigo-300 text-xs font-sans font-bold">
                          <span>💰 ยอดรับรวม:</span>
                          <span className="font-mono text-white font-black">{formatBaht(data.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 text-xs font-sans font-bold">
                          <span>📈 กำไรสุทธิ:</span>
                          <span className="font-mono font-black">{formatBaht(data.netProfit)}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-800/80">
                        👉 คลิกแท่งกราฟเพื่อดูบิลของวันนี้
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Average Reference Line */}
            {seriesConfig.showAverageLine && summaryMetrics.avgDailyRev > 0 && (
              <ReferenceLine 
                y={summaryMetrics.avgDailyRev} 
                stroke="#f59e0b" 
                strokeDasharray="4 4"
                label={{ 
                  value: `เฉลี่ย: ${formatBaht(summaryMetrics.avgDailyRev)}`, 
                  fill: '#b45309', 
                  fontSize: 10, 
                  position: 'top',
                  fontWeight: 'bold'
                }} 
              />
            )}

            {/* Cash Bar */}
            {seriesConfig.showCash && (
              <Bar
                name="เงินสด"
                dataKey="cashAmount"
                stackId={chartMode === 'stacked' ? 'sales' : undefined}
                fill="#10b981"
                radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                maxBarSize={chartMode === 'stacked' ? 24 : 16}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cash-cell-${index}`} 
                    fill={entry.date === selectedDate ? '#059669' : '#10b981'}
                    opacity={entry.date === selectedDate ? 1 : 0.85}
                  />
                ))}
              </Bar>
            )}

            {/* Transfer Bar */}
            {seriesConfig.showTransfer && (
              <Bar
                name="เงินโอน"
                dataKey="transferAmount"
                stackId={chartMode === 'stacked' ? 'sales' : undefined}
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
                maxBarSize={chartMode === 'stacked' ? 24 : 16}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`transfer-cell-${index}`} 
                    fill={entry.date === selectedDate ? '#0284c7' : '#0ea5e9'}
                    opacity={entry.date === selectedDate ? 1 : 0.85}
                  />
                ))}
              </Bar>
            )}

            {/* Expenses Bar */}
            {seriesConfig.showExpenses && (
              <Bar
                name="รายจ่าย"
                dataKey="expenseAmount"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
                opacity={0.75}
              />
            )}

            {/* Net Profit Trend Line */}
            {seriesConfig.showNetProfit && (
              <Line
                name="กำไรสุทธิ"
                type="monotone"
                dataKey="netProfit"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#ffffff' }}
                activeDot={{ r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Mini KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex flex-col">
          <span className="text-slate-400 text-[10px] font-bold">ยอดรับสะสมเดือนนี้</span>
          <span className="text-sm font-black text-slate-800 font-mono">{formatBaht(summaryMetrics.totalRev)}</span>
        </div>

        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/50 flex flex-col">
          <span className="text-emerald-700 text-[10px] font-bold">เงินสดรับรวม</span>
          <span className="text-sm font-black text-emerald-800 font-mono">{formatBaht(summaryMetrics.totalCash)}</span>
        </div>

        <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-200/50 flex flex-col">
          <span className="text-sky-700 text-[10px] font-bold">เงินโอนรับรวม</span>
          <span className="text-sm font-black text-sky-800 font-mono">{formatBaht(summaryMetrics.totalTransfer)}</span>
        </div>

        <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50 flex flex-col">
          <span className="text-amber-700 text-[10px] font-bold">เฉลี่ยต่อวัน ({summaryMetrics.activeDays} วันมียอด)</span>
          <span className="text-sm font-black text-amber-900 font-mono">{formatBaht(summaryMetrics.avgDailyRev)}</span>
        </div>
      </div>
    </div>
  );
};
