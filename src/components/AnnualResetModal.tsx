import React, { useState } from 'react';
import { AlertTriangle, Download, Clock, X, CheckCircle, RefreshCw, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { SaleRecord, Expense } from '../types';
import { downloadExcelReport, formatThaiDate } from '../utils';

interface AnnualResetModalProps {
  isOpen: boolean;
  onCloseToday: () => void;
  firstLoginDate: string;
  daysElapsed: number;
  daysRemaining: number;
  userEmail: string;
  sales: SaleRecord[];
  expenses?: Expense[];
  shopName: string;
  onTriggerFactoryResetNow: () => void;
}

export default function AnnualResetModal({
  isOpen,
  onCloseToday,
  firstLoginDate,
  daysElapsed,
  daysRemaining,
  userEmail,
  sales,
  expenses = [],
  shopName,
  onTriggerFactoryResetNow
}: AnnualResetModalProps) {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showConfirmResetNow, setShowConfirmResetNow] = useState(false);

  if (!isOpen) return null;

  const handleDownloadReport = () => {
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
        s.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน/สแกน',
        (s.barberTotalShare || 0).toString(),
        (s.shopTotalShare || 0).toString(),
        (s.tip || 0).toString()
      ]);

      // Add summary row
      const totalIncome = sales.reduce((sum, s) => sum + (s.customerPaid || 0), 0);
      const totalBarberShare = sales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0);
      const totalShopShare = sales.reduce((sum, s) => sum + (s.shopTotalShare || 0), 0);

      rows.push([]);
      rows.push(['--- สรุปยอดรวมผลประกอบการทั้งปี ---', '', '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['จำนวนบิลทั้งหมด', `${sales.length} รายการ`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ยอดรายรับรวมทั้งสิ้น', `${totalIncome.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ส่วนแบ่งช่างรวม', `${totalBarberShare.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ส่วนแบ่งร้านรวม', `${totalShopShare.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);

      const cleanShopName = (shopName || 'Shop').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `รายงานครบรอบ1ปี_รายได้ร้าน_${cleanShopName}_${new Date().toISOString().split('T')[0]}`;
      
      downloadExcelReport(fileName, rows, headers);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to export annual report:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์รายงาน กรุณาลองใหม่อีกครั้ง');
    }
  };

  const formattedFirstLogin = firstLoginDate
    ? formatThaiDate(firstLoginDate.split('T')[0])
    : 'ไม่ระบุ';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200 my-8">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white text-center relative">
          <button
            onClick={onCloseToday}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
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
              เพื่อประสิทธิภาพสูงสุดของระบบและล้างฐานข้อมูลย้อนหลังสำหรับปีถัดไป ระบบจะทำการ **Factory Reset ล้างข้อมูลทั้งหมดของบัญชีนี้อัตโนมัติ** เมื่อครบระยะเวลาผ่อนผัน 1 เดือน (30 วัน) หลังครบปี 1
            </p>
            <div className="pl-7 text-xs font-medium text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200">
              💡 **ข้อแนะนำ**: กรุณากดดาวน์โหลดไฟล์ **Report สรุปยอดขายรวม** เก็บไว้ในเครื่องหรืออุปกรณ์ของคุณทันที เพื่อใช้เป็นหลักฐานบัญชีย้อนหลัง
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownloadReport}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>ดาวน์โหลดรายงานสรุปย้อนหลัง (ไฟล์ CSV / Excel)</span>
              <Download className="w-4 h-4 ml-auto" />
            </button>

            {downloadSuccess && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>ดาวน์โหลดไฟล์รายงาน CSV เรียบร้อยแล้ว! สามารถเปิดดูใน Excel ได้ทันที</span>
              </div>
            )}

            {!showConfirmResetNow ? (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onCloseToday}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm text-center"
                >
                  รับทราบ (ปิดการแจ้งเตือนสำหรับวันนี้)
                </button>
                <button
                  onClick={() => setShowConfirmResetNow(true)}
                  className="px-3 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs transition-colors border border-rose-200"
                  title="ทำการล้างข้อมูลทันที"
                >
                  Reset ทันที
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 space-y-2.5 animate-fade-in">
                <p className="text-xs font-bold text-rose-800 text-center">
                  ⚠️ ยืนยันการ Factory Reset ข้อมูลทั้งหมดของบัญชีนี้ทันที?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onTriggerFactoryResetNow}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> ยืนยัน Reset ทันที
                  </button>
                  <button
                    onClick={() => setShowConfirmResetNow(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
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
  );
}
