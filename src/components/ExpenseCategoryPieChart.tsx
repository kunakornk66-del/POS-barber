import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector
} from 'recharts';
import { Expense } from '../types';
import { formatBaht } from '../utils';
import { EXPENSE_CATEGORIES } from './ExpensesTab';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  RotateCcw,
  Info
} from 'lucide-react';

interface ExpenseCategoryPieChartProps {
  expenses: Expense[];
  periodLabel: string;
  totalAmount: number;
  selectedCategory: string;
  onSelectCategory: (categoryKey: string) => void;
}

export function ExpenseCategoryPieChart({
  expenses,
  periodLabel,
  totalAmount,
  selectedCategory,
  onSelectCategory
}: ExpenseCategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Group and calculate expenses per category
  const data = EXPENSE_CATEGORIES.map(cat => {
    const matched = expenses.filter(e => e.category === cat.key);
    const amount = matched.reduce((sum, e) => sum + (e.amount || 0), 0);
    const count = matched.length;
    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    
    return {
      categoryKey: cat.key,
      name: cat.shortLabel,
      fullName: cat.label,
      value: amount,
      count,
      percentage,
      color: cat.hexColor || '#64748b',
      icon: cat.icon,
      badgeClass: cat.badgeClass,
      colorClass: cat.colorClass,
      bgLightClass: cat.bgLightClass,
      borderClass: cat.borderClass
    };
  }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

  // Drawer cash vs other
  const drawerAmount = expenses
    .filter(e => e.isFromDrawer !== false)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const drawerCount = expenses.filter(e => e.isFromDrawer !== false).length;
  const nonDrawerAmount = totalAmount - drawerAmount;
  const nonDrawerCount = expenses.length - drawerCount;
  const drawerPct = totalAmount > 0 ? (drawerAmount / totalAmount) * 100 : 0;

  // Active slice info for center of donut
  const activeItem = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;
  const topCategory = data.length > 0 ? data[0] : null;

  // Active sector renderer for recharts
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.15))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 11}
          fill={fill}
        />
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs font-sans space-y-1.5 z-50">
          <div className="flex items-center space-x-2 border-b border-slate-700 pb-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-white text-sm">{item.fullName}</span>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <span className="text-slate-400">จำนวนเงิน:</span>
            <span className="font-black font-mono text-emerald-400 text-sm">{formatBaht(item.value)}</span>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <span className="text-slate-400">สัดส่วนรายจ่าย:</span>
            <span className="font-bold text-amber-300">{item.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <span className="text-slate-400">จำนวนรายการ:</span>
            <span className="font-bold text-slate-200">{item.count} รายการ</span>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 text-center italic">
            คลิกเพื่อกรองเฉพาะหมวดหมู่นี้ในตาราง
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-2xs">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 font-sans">
                แผนภูมิสัดส่วนรายจ่าย (Expense Distribution Chart)
              </h2>
              {topCategory && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  จ่ายมากสุด: {topCategory.name} ({topCategory.percentage.toFixed(0)}%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-sans">
              สัดส่วนค่าใช้จ่าย {periodLabel} • รวม {expenses.length} รายการ ({formatBaht(totalAmount)})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {selectedCategory !== 'all' ? (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border border-rose-200 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>แสดงทั้งหมด</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>คลิกที่ส่วนของแผนภูมิเพื่อกรอง</span>
            </span>
          )}
        </div>
      </div>

      {totalAmount === 0 || data.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-4 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700 font-sans">
            ยังไม่มีบันทึกรายการรายจ่ายใน{periodLabel}
          </p>
          <p className="text-[11px] text-slate-400 font-sans max-w-sm">
            เมื่อมีการบันทึกรายจ่าย เช่น ค่าวัสดุ ค่าน้ำไฟ หรือค่าแรง แผนภูมิวงกลมจะคำนวณและแสดงสัดส่วนให้โดยอัตโนมัติ
          </p>
        </div>
      ) : (
        /* Chart & Breakdown Side-by-Side */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left / Center: Interactive Donut Chart */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center justify-center relative">
            <div className="w-full h-64 sm:h-72 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    {...({
                      activeIndex: activeIndex !== null ? activeIndex : undefined,
                      activeShape: renderActiveShape
                    } as any)}
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(entry: any) => {
                      if (entry && entry.categoryKey) {
                        onSelectCategory(selectedCategory === entry.categoryKey ? 'all' : entry.categoryKey);
                      }
                    }}
                    cursor="pointer"
                    animationDuration={600}
                  >
                    {data.map((entry) => {
                      const isFiltered = selectedCategory !== 'all' && selectedCategory !== entry.categoryKey;
                      return (
                        <Cell
                          key={`cell-${entry.categoryKey}`}
                          fill={entry.color}
                          opacity={isFiltered ? 0.35 : 1}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Dynamic Content */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
                style={{ width: '100%', height: '100%' }}
              >
                {activeItem ? (
                  <div className="animate-in fade-in zoom-in duration-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {activeItem.name}
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-slate-900 block leading-tight">
                      {formatBaht(activeItem.value)}
                    </span>
                    <span 
                      className="inline-block text-[10px] font-extrabold px-1.5 py-0.2 rounded-md mt-0.5"
                      style={{ 
                        backgroundColor: `${activeItem.color}18`, 
                        color: activeItem.color 
                      }}
                    >
                      {activeItem.percentage.toFixed(1)}% ({activeItem.count} รายการ)
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ยอดรวมรายจ่าย
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-slate-900 block leading-tight">
                      {formatBaht(totalAmount)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      {expenses.length} รายการ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Hint */}
            <div className="text-[10px] text-slate-400 text-center font-medium mt-1">
              {activeIndex !== null ? '👉 เลื่อนเมาส์ออกเพื่อดูยอดรวม' : '👆 แตะหรือวางเมาส์บนส่วนต่าง ๆ เพื่อดูรายละเอียด'}
            </div>
          </div>

          {/* Right / Breakdown Legend & Source Metrics */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            
            {/* Category Bars List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {data.map((item, idx) => {
                const isSelected = selectedCategory === item.categoryKey;
                const isHovered = activeIndex === idx;

                return (
                  <button
                    key={item.categoryKey}
                    type="button"
                    onClick={() => onSelectCategory(selectedCategory === item.categoryKey ? 'all' : item.categoryKey)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${item.bgLightClass} ${item.borderClass} ring-2 ring-indigo-500/40 shadow-xs`
                        : isHovered
                        ? 'bg-slate-50 border-slate-300 shadow-2xs'
                        : 'bg-white hover:bg-slate-50/80 border-slate-100'
                    }`}
                  >
                    {/* Left: Color Pill + Category Name */}
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-md shrink-0 flex items-center justify-center text-white"
                        style={{ backgroundColor: item.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                          <span>{item.fullName}</span>
                          {isSelected && (
                            <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-md">
                              เลือกอยู่
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {item.count} รายการบันทึก
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Percent Bar */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold font-mono text-slate-900">
                        {formatBaht(item.value)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, item.percentage)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold font-mono text-slate-600 min-w-[32px] text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Mini Metrics: Cash Drawer vs External Account */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {/* Drawer Deducted */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center space-x-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                    💵 หักเงินสดเก๊ะร้าน ({drawerPct.toFixed(0)}%)
                  </div>
                  <div className="text-xs font-black font-mono text-amber-900 truncate">
                    {formatBaht(drawerAmount)}
                  </div>
                  <div className="text-[9px] text-amber-700/80">
                    {drawerCount} รายการจ่ายสด
                  </div>
                </div>
              </div>

              {/* Bank / Main Account */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/60 flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-tight">
                    💳 บัญชีร้าน/อื่น ๆ ({(100 - drawerPct).toFixed(0)}%)
                  </div>
                  <div className="text-xs font-black font-mono text-indigo-900 truncate">
                    {formatBaht(nonDrawerAmount)}
                  </div>
                  <div className="text-[9px] text-indigo-700/80">
                    {nonDrawerCount} รายการโอน/ทุน
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
