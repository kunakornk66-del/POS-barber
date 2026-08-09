import React, { useState } from 'react';
import { AlertTriangle, Download, Clock, X, CheckCircle, RefreshCw, FileSpreadsheet, ShieldAlert, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SaleRecord, Expense } from '../types';
import { downloadExcelReport, formatThaiDate, formatBaht } from '../utils';

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
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showConfirmResetNow, setShowConfirmResetNow] = useState(false);

  if (!isOpen) return null;

  // Calculate totals
  const totalIncome = sales.reduce((sum, s) => sum + (s.customerPaid || 0), 0);
  const totalBarberShare = sales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0);
  const totalShopShare = sales.reduce((sum, s) => sum + (s.shopTotalShare || 0), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalShopShare - totalExpensesAmount;

  const formattedFirstLogin = firstLoginDate
    ? formatThaiDate(firstLoginDate.split('T')[0])
    : 'ไม่ระบุ';

  // PDF Export
  const handleDownloadPdfReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const reportElem = document.getElementById('annual-pdf-report-target');
      if (!reportElem) {
        alert('เกิดข้อผิดพลาดในการโหลดองค์ประกอบรายงาน PDF');
        setIsGeneratingPdf(false);
        return;
      }

      const canvas = await html2canvas(reportElem, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - (margin * 2));

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - (margin * 2));
      }

      const cleanShopName = (shopName || 'Shop').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `รายงานครบรอบ1ปี_ร้าน${cleanShopName}_${new Date().toISOString().split('T')[0]}.pdf`;

      pdf.save(fileName);
      setDownloadSuccess('ดาวน์โหลดไฟล์รายงาน PDF เรียบร้อยแล้ว!');
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to export annual PDF report:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // CSV/Excel Export Backup Option
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
        s.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน/สแกน',
        (s.barberTotalShare || 0).toString(),
        (s.shopTotalShare || 0).toString(),
        (s.tip || 0).toString()
      ]);

      rows.push([]);
      rows.push(['--- สรุปยอดรวมผลประกอบการทั้งปี ---', '', '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['จำนวนบิลทั้งหมด', `${sales.length} รายการ`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ยอดรายรับรวมทั้งสิ้น', `${totalIncome.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ส่วนแบ่งช่างรวม', `${totalBarberShare.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ส่วนแบ่งร้านรวม', `${totalShopShare.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['ค่าใช้จ่ายร้านรวม', `${totalExpensesAmount.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['กำไรสุทธิร้าน', `${netProfit.toLocaleString()} บาท`, '', '', '', '', '', '', '', '', '', '', '']);

      const cleanShopName = (shopName || 'Shop').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `รายงานครบรอบ1ปี_รายได้ร้าน_${cleanShopName}_${new Date().toISOString().split('T')[0]}`;
      
      downloadExcelReport(fileName, rows, headers);
      setDownloadSuccess('ดาวน์โหลดไฟล์ CSV/Excel เรียบร้อยแล้ว!');
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to export annual CSV report:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์รายงาน CSV กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <>
      {/* Hidden PDF Printable Target */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }}>
        <div id="annual-pdf-report-target" className="bg-white p-8 font-sans text-slate-800">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {shopName || 'ร้านบาร์เบอร์'}
              </h1>
              <p className="text-sm font-bold text-amber-600 mt-0.5">
                รายงานสรุปผลประกอบการประจำปี (ครบรอบ 1 ปี)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                บัญชีผู้ใช้งาน: {userEmail} • เข้าใช้งานวันแรก: {formattedFirstLogin}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-bold text-slate-700">เอกสารทางการจากระบบ POS</p>
              <p>วันที่พิมพ์: {formatThaiDate(new Date().toISOString().split('T')[0])}</p>
            </div>
          </div>

          {/* Key Summary Boxes */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-semibold">ยอดขายรวมทั้งสิ้น</p>
              <p className="text-lg font-black text-emerald-600 mt-1">{formatBaht(totalIncome)}</p>
              <p className="text-[11px] text-slate-400">จาก {sales.length} รายการบิล</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-semibold">ส่วนแบ่งร้านรวม</p>
              <p className="text-lg font-black text-blue-600 mt-1">{formatBaht(totalShopShare)}</p>
              <p className="text-[11px] text-slate-400">รายได้เข้าบัญชีร้าน</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-semibold">กำไรสุทธิร้าน</p>
              <p className={`text-lg font-black mt-1 ${netProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                {formatBaht(netProfit)}
              </p>
              <p className="text-[11px] text-slate-400">หลังหักค่าใช้จ่ายร้าน {formatBaht(totalExpensesAmount)}</p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 mb-2 border-l-4 border-amber-500 pl-2">
              ตารางสรุปงบประมาณการเงินรายปี
            </h2>
            <table className="w-full text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2.5 text-left border-r border-slate-200">รายการสรุป</th>
                  <th className="p-2.5 text-right">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 border-r border-slate-200">ยอดรับชำระจากลูกค้าทั้งหมด (Gross Income)</td>
                  <td className="p-2.5 text-right font-semibold text-emerald-700">{formatBaht(totalIncome)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 border-r border-slate-200">ส่วนแบ่งค่าคอมมิชชั่นช่างตัดผมรวม (Barber Share)</td>
                  <td className="p-2.5 text-right font-semibold text-orange-600">-{formatBaht(totalBarberShare)}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-blue-50/50">
                  <td className="p-2.5 border-r border-slate-200 font-bold">รายรับส่วนของร้านคงเหลือ (Shop Gross Share)</td>
                  <td className="p-2.5 text-right font-bold text-blue-700">{formatBaht(totalShopShare)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 border-r border-slate-200">ค่าใช้จ่ายต้นทุนดำเนินงานร้านรวม (Shop Expenses)</td>
                  <td className="p-2.5 text-right font-semibold text-rose-600">-{formatBaht(totalExpensesAmount)}</td>
                </tr>
                <tr className="bg-emerald-50/80 font-black text-slate-900">
                  <td className="p-2.5 border-r border-slate-200">กำไรสุทธิร้านคงเหลือจริง (Net Shop Income)</td>
                  <td className="p-2.5 text-right text-emerald-800 text-sm">{formatBaht(netProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Top Recent Sales Records */}
          {sales.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-800 mb-2 border-l-4 border-slate-700 pl-2">
                ประวัติรายการรับชำระบิลล่าสุด (รวมทั้งหมด {sales.length} รายการ)
              </h2>
              <table className="w-full text-[11px] border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-2 text-left border-r border-slate-200">วันที่</th>
                    <th className="p-2 text-left border-r border-slate-200">เลขบิล</th>
                    <th className="p-2 text-left border-r border-slate-200">ช่างผู้ให้บริการ</th>
                    <th className="p-2 text-right border-r border-slate-200">ยอดชำระ</th>
                    <th className="p-2 text-right border-r border-slate-200">ส่วนแบ่งช่าง</th>
                    <th className="p-2 text-right">ส่วนแบ่งร้าน</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 15).map((s, idx) => (
                    <tr key={s.id || idx} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/50">
                      <td className="p-1.5 border-r border-slate-200">
                        {s.timestamp ? formatThaiDate(s.timestamp.split('T')[0]) : (s.date || '-')}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-mono">{s.id?.slice(-6) || '-'}</td>
                      <td className="p-1.5 border-r border-slate-200">{s.barberName || '-'}</td>
                      <td className="p-1.5 text-right border-r border-slate-200 font-medium">{formatBaht(s.customerPaid || 0)}</td>
                      <td className="p-1.5 text-right border-r border-slate-200 text-orange-600">{formatBaht(s.barberTotalShare || 0)}</td>
                      <td className="p-1.5 text-right text-blue-600 font-semibold">{formatBaht(s.shopTotalShare || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length > 15 && (
                <p className="text-[10px] text-slate-400 italic text-center mt-1">
                  * แสดง 15 รายการล่าสุดจากทั้งหมด {sales.length} รายการบิลในปีนี้
                </p>
              )}
            </div>
          )}

          {/* Footer Notice */}
          <div className="pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500">
            <p>เอกสารสร้างอัตโนมัติเนื่องในวาระการใช้งานระบบครบ 1 ปี เพื่อใช้ในการบันทึกบัญชีร้านค้า</p>
            <p>© {shopName || 'Barber POS'} System • ออกเอกสารเมื่อ: {new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>
      </div>

      {/* Main Visible Modal */}
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
                เพื่อประสิทธิภาพสูงสุดของระบบและเตรียมฐานข้อมูลสำหรับการใช้งานในปีถัดไป ระบบจะทำการ **Factory Reset ล้างข้อมูลทั้งหมดของบัญชีนี้อัตโนมัติ** เมื่อครบระยะเวลาผ่อนผัน 1 เดือน (30 วัน) หลังครบปีที่ 1
              </p>
              <div className="pl-7 text-xs font-medium text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200">
                💡 **ข้อแนะนำ**: กรุณากดดาวน์โหลดไฟล์ **PDF สรุปยอดขายรวมครบรอบ 1 ปี** เก็บไว้ในเครื่องหรืออุปกรณ์ของคุณเพื่อใช้เป็นหลักฐานบัญชีย้อนหลัง
              </div>
            </div>

            {/* Download Actions */}
            <div className="space-y-3 pt-1">
              {/* Primary PDF Download Button */}
              <button
                onClick={handleDownloadPdfReport}
                disabled={isGeneratingPdf}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:via-rose-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                <span>{isGeneratingPdf ? 'กำลังสร้างไฟล์ PDF...' : 'ดาวน์โหลดรายงานสรุปย้อนหลัง (ไฟล์ PDF)'}</span>
                <Download className="w-4 h-4 ml-auto" />
              </button>

              {/* Secondary Excel/CSV Backup Option */}
              <button
                onClick={handleDownloadExcelReport}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl border border-emerald-200 flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ดาวน์โหลดสำรองเป็นไฟล์ CSV / Excel</span>
              </button>

              {downloadSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{downloadSuccess}</span>
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
    </>
  );
}

