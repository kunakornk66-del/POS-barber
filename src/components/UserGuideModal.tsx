import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Settings, 
  Calendar, 
  Scissors, 
  LayoutDashboard, 
  DollarSign, 
  Briefcase, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  Info,
  HelpCircle,
  Printer,
  Calculator,
  TrendingUp,
  Coins,
  ShieldCheck,
  History,
  Users
} from 'lucide-react';
import { ShopConfig } from '../types';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopConfig?: ShopConfig;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  keywords: string[];
  content: React.ReactNode;
}

export default function UserGuideModal({ isOpen, onClose, shopConfig }: UserGuideModalProps) {
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const sections: GuideSection[] = [
    {
      id: 'intro',
      title: '📌 ภาพรวมระบบ & เมนูการใช้งาน',
      icon: BookOpen,
      keywords: ['ภาพรวม', 'ระบบ', 'เริ่มต้น', 'แนะนำ', 'menu', 'เมนู', 'ลิ้งก์', 'ลิงก์', 'pos', 'บาร์เบอร์', 'เบื้องต้น', 'หน้าตา'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl relative overflow-hidden border border-slate-800 shadow-lg">
            <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-1/3 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/30">
                PRO BARBER COMPANION v2.0
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold mt-3 mb-2 flex items-center gap-2">
                <span className="text-2xl animate-bounce">💈</span> 
                ระบบบริหารร้านบาร์เบอร์แบบครบวงจร
              </h3>
              <p className="text-slate-300 text-[11px] font-medium leading-relaxed max-w-2xl">
                ยินดีต้อนรับสู่โปรแกรมจัดการร้านตัดผมอัจฉริยะ! ระบบถูกพัฒนาขึ้นเพื่อควบคุมงานแคชเชียร์ บันทึกการขาย (POS) ตารางจองคิวล่วงหน้า (Real-time Queue) จัดทำบัญชีรายวัน ไปจนถึงการจัดสรรค่าแรงคอมมิชชั่นของช่างตัดผมอย่างรวดเร็วและแม่นยำ 100%
              </p>
            </div>
          </div>

          {/* Quick Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200/50 p-3.5 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-emerald-950">ข้อมูลเรียลไทม์ & คลาวด์</p>
                <p className="text-emerald-800 text-[10px] mt-0.5">เชื่อมต่อฐานข้อมูลระบบ Firestore ปลอดภัยสูง ข้อมูลไม่มีวันหายแม้เน็ตหลุด</p>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200/50 p-3.5 rounded-xl flex items-start gap-2.5">
              <History className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-indigo-950">คำนวณและปรับยอดทันที</p>
                <p className="text-indigo-800 text-[10px] mt-0.5">แก้ยอดเงิน เปลี่ยนช่าง หรือสลับโอน/สด ย้อนหลังได้ ระบบจะปรับบัญชีใหม่อัตโนมัติ</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl flex items-start gap-2.5">
              <Coins className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-950">ระบบทิป & ส่วนแบ่งสมบูรณ์</p>
                <p className="text-amber-800 text-[10px] mt-0.5">แบ่งตามเรท % ตัดผม เคมี และสินค้าแยกกัน โดยให้ทิปช่างเต็ม 100% ไม่มีหักตงร้าน</p>
              </div>
            </div>
          </div>

          {/* Core Tabs Explained */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
              ⚡ แนะนำโครงสร้างเมนูหลักทั้ง 6 แท็บการทำงาน
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white border border-slate-150 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all flex gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">1. บันทึกการขาย (Sales POS)</p>
                  <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                    ใช้เพื่อลงทะเบียนรับลูกค้า คิดเงิน ออกบิลค่าบริการ คีย์ยอดตัดผม งานเคมี และขายสินค้าแว็กซ์จัดแต่งทรง สามารถเลือกส่วนลด คูปอง กรอกทิป และเลือกวิธีจ่ายเงินได้รวดเร็ว
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-150 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all flex gap-3">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">2. แดชบอร์ดสรุป (Dashboard)</p>
                  <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                    หน้าสำคัญสำหรับเจ้าของร้านและฝ่ายบัญชี แสดงยอดขายรวม สัดส่วนช่องทางชำระ บาร์กราฟสัดส่วนรายได้แยกตามบริการ และประวัติรายการพร้อมปุ่ม **"แก้ไขยอดเงิน/เปลี่ยนช่างย้อนหลัง"**
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-150 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all flex gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">4. ลิ้นชักเงินสด (Cash Drawer)</p>
                  <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                    เครื่องมือบันทึกเงินกองกลางเงินทอนตอนเช้า บันทึกค่าใช้จ่ายยิบย่อยในวัน และนับเงินปิดยอดตอนเย็นเพื่อตรวจสอบหา "เงินขาดหรือเกิน" ป้องกันพนักงานทุจริตหรือคีย์เงินพลาด
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-150 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all flex gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">5. สลิปเงินช่าง (Payslips)</p>
                  <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                    ระบบคำนวณเงินค่าแรงช่างรวมรายเดือน แบ่งรายหัว แยกรายละเอียดชัดเจนคอมมิชชั่นบริการ ทิป ยอดรวม และมาพร้อมแบบพิมพ์จำลอง **"ใบสลิปความร้อน 58/80 มม."** ส่งให้ช่างทางไลน์ได้เลย
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-150 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all flex gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">6. ตั้งค่าระบบ (Config)</p>
                  <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                    ใช้ตั้งค่าชื่อร้านค้า, กำหนด % ส่วนแบ่งช่างตัดผม % งานเคมี % ขายของ, จัดการรายชื่อช่างหลัก, เพิ่ม/ลบสินค้าและงานโปรโมชั่นเคมี, และลงทะเบียนรหัสส่วนลดคูปอง
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'config',
      title: '⚙️ 1. ขั้นตอนเริ่มแรก: ตั้งค่าเปอร์เซ็นต์และพนักงาน',
      icon: Settings,
      keywords: ['ตั้งค่า', 'เปอร์เซ็นต์', 'ช่าง', 'เพิ่มช่าง', 'แก้ไขช่าง', 'ส่วนแบ่ง', 'คอมมิชชั่น', 'config', 'ตั้งต้น', 'เริ่มต้น', 'พนักงาน'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-slate-700">
              <p className="font-extrabold text-slate-900">คำเตือนสำหรับแอดมินหรือเจ้าของร้าน ⚠️</p>
              <p className="mt-1">
                ก่อนเริ่มลงบิลรายการแรกในระบบ ขอแนะนำอย่างยิ่งให้ตรวจสอบและตั้งค่า % คอมมิชชั่นของร้าน และรายชื่อช่างหลักให้ถูกต้อง เพราะระบบจะใช้เรทที่คุณระบุตรงนี้ไปคิดแยกส่วนสลิปเงินช่างทันทีหลังกดเซฟบิล
              </p>
            </div>
          </div>

          {/* Step 1: Revenue Share */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">1</span>
              การกำหนดเปอร์เซ็นต์ส่วนแบ่งช่าง (Revenue Share Setup)
            </h4>
            <p className="text-slate-600">
              ไปที่เมนู <strong>"6. ตั้งค่า"</strong> และดูที่การตั้งค่าทางด้านบน:
            </p>
            <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-2.5">
              <div className="flex justify-between border-b pb-1.5 border-slate-200/50">
                <span className="font-extrabold text-slate-800">✂️ ส่วนแบ่งช่างค่าตัดผม (Haircut %)</span>
                <span className="text-indigo-600 font-bold">ค่าเริ่มต้นทั่วไป: 50%</span>
              </div>
              <p className="text-slate-500 pl-4">คือเปอร์เซ็นต์ที่ช่างจะได้รับจากการตัดผมทรงต่างๆ (เช่น สระ ซอย เซ็ต หัวละ 300 บาท ช่างจะได้ 150 บาท ร้านค้าได้ 150 บาท)</p>

              <div className="flex justify-between border-b pb-1.5 pt-1 border-slate-200/50">
                <span className="font-extrabold text-slate-800">🧪 ส่วนแบ่งช่างงานเคมี (Chemical %)</span>
                <span className="text-indigo-600 font-bold">ค่าเริ่มต้นทั่วไป: 45%</span>
              </div>
              <p className="text-slate-500 pl-4">คือเปอร์เซ็นต์จ่ายให้ช่างสำหรับคอร์ส ดัด ทำสี ยืด ย้อม ยืดวอลลุ่ม ซึ่งมีต้นทุนน้ำยาเคมีสูง เปอร์เซ็นต์อาจต่ำกว่างานตัดเพื่อช่วยร้านคืนทุนค่าน้ำยา</p>

              <div className="flex justify-between border-b pb-1.5 pt-1 border-slate-200/50">
                <span className="font-extrabold text-slate-800">📦 ส่วนแบ่งช่างงานขายสินค้า (Product %)</span>
                <span className="text-indigo-600 font-bold">ค่าเริ่มต้นทั่วไป: 10%</span>
              </div>
              <p className="text-slate-500 pl-4">ค่าคอมมิชชั่นกระตุ้นยอดขาย เมื่อช่างปิดการขายน้ำยาจัดแต่งทรงผม แว็กซ์ โพเมด แชมพู ให้ลูกค้ากลับบ้าน</p>
            </div>
          </div>

          {/* Step 2: Barber Management */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">2</span>
              การจัดการสถานะและเพิ่มช่างตัดผม (Barber Roster)
            </h4>
            <p className="text-slate-600">
              ในตารางจัดการช่าง คุณสามารถเพิ่มช่างคนใหม่ ระบุชื่อ รูปถ่าย ลำดับการแสดง และตั้งค่า **สถานะพร้อมรับงาน (Working Status)** ได้:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-extrabold text-emerald-950">ทำงานอยู่ (Active / Working)</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  ชื่อของช่างจะแสดงอยู่ในตัวเลือกการบันทึกบิลขาย และแสดงในตารางคิวจองประวัน เพื่อให้ลูกค้าสามารถกดจองนัดหมายออนไลน์และออฟไลน์ได้ปกติ
                </p>
              </div>

              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="font-extrabold text-rose-950">หยุด/ไม่ว่าง (Inactive / Not Working)</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  เหมาะสำหรับวันที่ช่างลากิจ ลาพักผ่อน หรือไม่อยู่ร้าน ระบบจะทำการซ่อนชื่อช่างนี้จากช่องลงทะเบียนจองคิว เพื่อป้องกันพนักงานคีย์เวลาจองชนกันยามช่างไม่เข้าร้าน
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Catalogs */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">3</span>
              การจัดการสินค้า บริการเคมี และคูปอง
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-1">
              <li><strong>รายการสินค้า (Products Catalog):</strong> กำหนดรหัสสินค้า ชื่อ ราคาขายปกติ และราคาสำหรับตัดคอมมิชชั่น ช่วยประหยัดเวลาพิมพ์เลขราคาสินค้าหน้าร้าน</li>
              <li><strong>คอร์สบริการเคมี (Chemical Promos):</strong> ระบุชื่องานสี งานดัด และราคาอ้างอิงของร้าน</li>
              <li><strong>คูปองส่วนลด (Vouchers):</strong> กำหนดโค้ด (เช่น VIP100) ชนิดส่วนลด (หักเป็นบาท หรือหักเป็น %) เพื่อความไวตอนเก็บเงินลูกค้า</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'sales',
      title: '✂️ 2. ขั้นตอนลงบิลการขายหน้าร้าน (Sales & POS)',
      icon: Scissors,
      keywords: ['บันทึกขาย', 'ขาย', 'ออกบิล', 'บิล', 'คิดเงิน', 'ส่วนลด', 'โอนเงิน', 'ทิป', 'sales', 'กลุ่มโอน', 'แชร์ยอด', 'รวมยอด', 'คิดตังค์', 'ส่วนแบ่ง', 'pos'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          <div className="bg-indigo-50 border border-indigo-250 p-4 rounded-xl flex gap-3">
            <Calculator className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-indigo-950">ระบบบันทึกบริการหน้าร้าน POS อัตโนมัติ 🛒</p>
              <p className="mt-1">
                หน้านี้ทำหน้าที่เสมือนเครื่องแคชเชียร์หลักของร้าน แนะนำให้ทำทันทีหลังช่างให้บริการลูกค้าแต่ละหัวเสร็จสิ้น เพื่อสะสมยอดเข้าแดชบอร์ดแบบวินาทีต่อวินาที
              </p>
            </div>
          </div>

          {/* Step-by-Step Sale Entry */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1">⚡ 4 ขั้นตอนสั้นๆ ในการลงบิลคิดเงินลูกค้า</h4>
            <div className="relative border-l border-indigo-200 pl-5 ml-2.5 space-y-4">
              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[9px]">1</span>
                <p className="font-extrabold text-slate-900 text-[11px]">เลือกช่างผู้ให้บริการ</p>
                <p className="text-slate-500 mt-0.5">กดที่ปุ่มรูปช่างเพื่อผูกบิลนี้เข้ากับช่างคนนั้นเพื่อบันทึก % ส่วนแบ่งสะสม</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[9px]">2</span>
                <p className="font-extrabold text-slate-900 text-[11px]">บันทึกแยกหมวดหมู่รายรับบริการ</p>
                <p className="text-slate-500 mt-0.5">
                  ระบุราคาลงในช่องที่ตรงกับประเภทที่ทำจริง:
                </p>
                <ul className="list-disc list-inside text-slate-500 pl-2 mt-1 space-y-1">
                  <li><strong>ค่าตัดผม:</strong> สำหรับการตัด สระ ย้อมเซ็ต</li>
                  <li><strong>งานเคมี:</strong> คอร์สเคมี ดัด ยืด ทำสีทรีทเม้นท์</li>
                  <li><strong>ขายสินค้า:</strong> เลือกสินค้าหรือกรอกยอดราคาขายแว็กซ์ ครีม บำรุงผม</li>
                </ul>
              </div>

              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[9px]">3</span>
                <p className="font-extrabold text-slate-900 text-[11px]">ระบุทิปและส่วนลด</p>
                <p className="text-slate-500 mt-0.5">
                  - <strong>ทิปช่าง:</strong> ระบุได้อิสระ ยอดทิปนี้จะไหลไปเข้ากระเป๋าช่างคนนั้นเต็ม 100% ในใบสลิปโดยไม่หักเข้าเปอร์เซ็นต์ร้านเลย<br />
                  - <strong>ส่วนลด / คูปอง:</strong> ติ๊กรับส่วนลด 10% ของร้านค้า หรือเลือกใช้ Voucher สะสมแต้มที่ลงทะเบียนไว้ล่วงหน้าเพื่อลดราคา
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[9px]">4</span>
                <p className="font-extrabold text-slate-900 text-[11px]">เลือกช่องทางชำระเงิน (โอนเงิน / เงินสด / ⚡ ผสม)</p>
                <p className="text-slate-500 mt-0.5">
                  เลือกวิธีชำระเงินตามจริง:
                  <br />- 📱 <strong>เงินโอน:</strong> ลูกค้าสแกนจ่ายผ่าน QR Code หรือโอนผ่านแอป Mobile Banking
                  <br />- 💵 <strong>เงินสด:</strong> รับด้วยเงินสดกระดาษหรือเหรียญ
                  <br />- ⚡ <strong>ชำระแบบผสม (เงินสด + เงินโอนในบิลเดียว):</strong> ในกรณีที่ลูกค้ารายเดียวกันจ่ายเงินสดบางส่วน และโอนเงินอีกส่วนหนึ่ง เช่น ยอด 250 บาท ลูกค้าจ่ายสด 200 บาท และโอนเพิ่ม 50 บาท (อ่านวิธีใช้ละเอียดด้านล่าง)
                </p>
              </div>
            </div>
          </div>

          {/* New Split Payment Detailed Guide */}
          <div className="bg-indigo-900 text-white p-4 rounded-xl space-y-2.5">
            <h4 className="font-extrabold text-indigo-300 flex items-center gap-1.5 text-xs">
              <span className="p-1 bg-indigo-500/30 rounded">⚡</span>
              ฟีเจอร์ใหม่! วิธีบันทึกชำระแบบผสม (Split Payment: เงินสด + เงินโอน)
            </h4>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              เหมาะมากสำหรับหน้าร้านเมื่อลูกค้ามีเงินสดไม่พอชำระเต็มจำนวน เช่น ยอดรวม 250 บาท จ่ายเงินสด 200 บาท และขอโอนเพิ่มอีก 50 บาท
            </p>
            <div className="bg-indigo-950/80 p-3 rounded-lg border border-indigo-800/80 space-y-2 text-slate-300">
              <p className="font-bold text-white text-[11px]">⚙️ ขั้นตอนการใช้งานง่ายๆ 3 สเต็ป:</p>
              <p>1. ในหมวดช่องทางชำระเงิน ให้คลิกเลือกปุ่ม <strong>"⚡ ผสม (สด+โอน)"</strong></p>
              <p>2. กรอกจำนวนเงินสดที่รับมาในช่อง <strong>"💵 เงินสดที่รับ (บาท)"</strong> เช่น พิมพ์ 200 ระบบจะคำนวณเงินโอนที่เหลือให้อัตโนมัติในช่อง <strong>"📱 เงินโอนสแกนจ่าย (บาท)"</strong> เป็น 50 บาททันที (หรือจะพิมพ์ช่องเงินโอนก่อนก็ได้)</p>
              <p>3. ตรวจสอบป้ายแจ้งเตือนสีเขียว <strong>"🟢 ยอดรวมถูกต้อง"</strong> หากตรงตามจริงให้กดบันทึกออกบิลได้ทันที</p>
              <div className="p-2 bg-indigo-900/90 rounded border border-indigo-700 text-[10px] text-indigo-200 mt-1">
                💡 <strong>ผลลัพธ์ในระบบ:</strong> ยอดเงินสด 200 บาทจะวิ่งเข้าลิ้นชักนับเงิน (Cash Drawer) เพื่อกระทบยอดก้นเก๊ะ ส่วนยอดโอน 50 บาทจะวิ่งเข้าหมวดเงินโอนในแดชบอร์ด โดยที่ส่วนแบ่งค่าตัดผมของช่างและสถิติร้านค้ายึดตามยอดเต็ม 250 บาทอย่างถูกต้อง 100%!
              </div>
            </div>
          </div>

          {/* Group Transfer (โอนรวมหลายคน/หลายหัว สลิปเดียว) Guide */}
          <div className="bg-sky-900 text-white p-4 rounded-xl space-y-2.5">
            <h4 className="font-extrabold text-sky-300 flex items-center gap-1.5 text-xs">
              <span className="p-1 bg-sky-500/30 rounded">🔗</span>
              วิธีคีย์บิลกรณีลูกค้าโอนรวมหลายคน/หลายหัว (เช่น พ่อโอนรวมจ่ายให้ลูก 2-3 คนในสลิปเดียว)
            </h4>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              เมื่อมีลูกค้ามาเป็นกลุ่ม ครอบครัว หรือเพื่อน แล้วคนหนึ่งเป็นคนโอนเงินก้อนเดียวรวมทั้งหมด (เช่น พ่อตัดผม 300฿ + ลูกคนที่หนึ่ง 250฿ + ลูกคนที่สอง 250฿ = โอนสลิปเดียว 800฿) 
              <strong>ให้ทำการคีย์บันทึกแยกทีละคน (3 บิล)</strong> เพื่อให้ช่างแต่ละคนได้ส่วนแบ่งถูกต้อง และนับจำนวนหัวจริงตามขั้นตอนดังนี้:
            </p>
            <div className="bg-sky-950/80 p-3 rounded-lg border border-sky-800/80 space-y-2.5 text-slate-300">
              <div className="p-2 bg-sky-900/90 rounded border border-sky-700 text-[11px] text-sky-100">
                <strong>👨 บิลที่ 1 (คนแรก - เช่น คุณพ่อ 300 บาท):</strong>
                <ul className="list-disc list-inside mt-1 pl-1 space-y-0.5 text-[10.5px] text-sky-200">
                  <li>เลือกช่าง → ใส่ราคา 300 → ใส่ชื่อ "คุณพ่อ"</li>
                  <li>เลือกช่องชำระเงินเป็น <strong>"📱 เงินโอน"</strong></li>
                  <li>ติ๊กถูกช่อง <strong>"☑️ ลูกค้าโอนรวมหลายคน/หลายหัว"</strong></li>
                  <li>เลือก <strong>"✨ 1. สร้างกลุ่มสลิปใหม่"</strong> และพิมพ์ชื่อกลุ่ม เช่น <em>"พ่อ + ลูก 2 คน"</em></li>
                  <li>กด <strong>"บันทึกบริการ"</strong></li>
                </ul>
              </div>

              <div className="p-2 bg-sky-900/90 rounded border border-sky-700 text-[11px] text-sky-100">
                <strong>👦 บิลที่ 2 และ 3 (คนถัดไป - เช่น ลูกคนที่ 1 และ 2 คนละ 250 บาท):</strong>
                <ul className="list-disc list-inside mt-1 pl-1 space-y-0.5 text-[10.5px] text-sky-200">
                  <li>เลือกช่างที่ตัดให้ลูก → ใส่ราคา 250 → ใส่ชื่อ "ลูกคนที่ 1"</li>
                  <li>เลือกช่องชำระเงินเป็น <strong>"📱 เงินโอน"</strong></li>
                  <li>ติ๊กถูกช่อง <strong>"☑️ ลูกค้าโอนรวมหลายคน/หลายหัว"</strong></li>
                  <li>เลือก <strong>"🔗 2. ผูกเข้ากับกลุ่มเดิม"</strong> แล้วเลือกกลุ่ม <em>"พ่อ + ลูก 2 คน"</em> ที่สร้างไว้</li>
                  <li>ระบบจะคำนวณและแสดงยอดสะสมสลิปให้ทันที (เช่น 300 + 250 = 550 บาท) → กด <strong>"บันทึกบริการ"</strong></li>
                  <li>ทำซ้ำกับลูกคนที่ 2 เพื่อรวมยอดสลิปเป็น 800 บาท</li>
                </ul>
              </div>

              <div className="p-2 bg-emerald-950/90 rounded border border-emerald-700 text-[10px] text-emerald-200">
                ✅ <strong>ผลลัพธ์ในระบบแดชบอร์ด:</strong> ระบบจะแสดงป้ายกำกับ <strong>"🔗 โอนร่วม: พ่อ + ลูก 2 คน"</strong> ในตารางบันทึกประจำวัน ทำให้ยอดเงินโอนสลิปธนาคาร 800 บาทตรงเป๊ะกับรายการในบัญชี และช่างแต่ละคนได้ยอดส่วนแบ่งค่าแรงถูกต้องครบถ้วน 100%!
              </div>
            </div>
          </div>

          {/* System Notifications & Alerts Section */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2.5">
            <h4 className="font-extrabold text-amber-400 flex items-center gap-1.5 text-xs">
              <span className="p-1 bg-amber-400/20 rounded">🔔</span>
              การแจ้งเตือนและการเตือนข้อผิดพลาดในระบบ (System Alerts & Notifications)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
                <p className="font-bold text-emerald-400">🟢 แจ้งเตือนยอดรวมชำระถูกต้อง</p>
                <p className="text-slate-300 text-[10px] mt-0.5">แสดงเมื่อรวมยอดเงินสดและเงินโอนในการชำระแบบผสมเท่ากับยอดสุทธิของบิล สามารถกดบันทึกได้</p>
              </div>
              <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
                <p className="font-bold text-rose-400">🔴 เตือนยอดชำระไม่ตรงสุทธิ</p>
                <p className="text-slate-300 text-[10px] mt-0.5">ระบบจะล็อกไม่ให้เซฟและแสดงกล่องสีแดงกะพริบ หากผลรวมเงินสด + เงินโอน ไม่เท่ากับราคาบิลจริง</p>
              </div>
              <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
                <p className="font-bold text-sky-400">📱 แจ้งเตือนสถานะซิงค์คลาวด์</p>
                <p className="text-slate-300 text-[10px] mt-0.5">แสดงสถานะการเชื่อมต่อ Firestore เช่น "บันทึกแล้ว", "ออฟไลน์", หรือ "กำลังซิงค์ข้อมูล"</p>
              </div>
              <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
                <p className="font-bold text-amber-400">⚠️ เตือนจองเวลาคิวซ้อน</p>
                <p className="text-slate-300 text-[10px] mt-0.5">ระบบเตือนทันทีเมื่อเลือกเวลานัดหมายช่างชนกับคิวเดิมที่มีอยู่แล้ว เพื่อป้องกันการรับคิวซ้อน</p>
              </div>
            </div>
          </div>

          {/* Smart Group Payment Feature */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2.5">
            <h4 className="font-extrabold text-amber-400 flex items-center gap-1.5">
              <span className="p-1 bg-amber-400/20 rounded">📱</span>
              ระบบรวมยอดโอนเงินทางร้าน (Group Transfer Payment)
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ในกรณีที่ลูกค้ามาใช้บริการพร้อมกันเป็นกลุ่ม เช่น พ่อพาลูกชายมาตัดผม 2 คน หรือเพื่อนมาด้วยกัน 3 คน แล้วต้องการ **"โอนจ่ายทีเดียวรวมบิล"** แต่ช่างผู้ให้บริการตัดผมเป็นคนละคนกัน ระบบ POS ทั่วไปมักแยกเงินหรือระบุช่างไม่ได้ แต่ระบบของเราแก้ปัญหานี้ได้อย่างสมบูรณ์แบบ!
            </p>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2 text-slate-300">
              <p className="font-bold text-white text-[11px]">⚙️ วิธีใช้งานระบบโอนยอดกลุ่ม:</p>
              <p><strong>คนแรกของกลุ่ม:</strong> ลงรายการปกติ เลือกจ่ายเงินด้วย **"โอนเงินผ่านบัญชี"** จากนั้นติ๊กเลือก **"รวมยอดโอนร่วมกัน (Group Payment)"** แล้วกดเลือก **"สร้างกลุ่มโอนเงินใหม่"** (ระบบจะตั้งรหัสกลุ่มอัตโนมัติหรือพิมพ์ระบุเองก็ได้ เช่น "กลุ่มคุณสมชาย") บันทึกบิลแรก</p>
              <p><strong>คนถัดไปในกลุ่ม:</strong> ลงรายการตัดผมของช่างคนที่สอง เลือกจ่ายเงินด้วย **"โอนเงินผ่านบัญชี"** ติ๊กถูกเลือก **"รวมยอดโอนร่วมกัน (Group Payment)"** จากนั้นเปลี่ยนออปชั่นเป็น **"เชื่อมโยงเข้ากลุ่มโอนที่มีอยู่แล้ว"** และเลือกชื่อกลุ่มของคุณสมชาย บันทึกบิล</p>
              <p className="text-amber-300 font-bold">ผลลัพธ์: เงินโอนจะขึ้นสลิปรวมชิ้นเดียวกันในบัญชีร้าน เพื่อให้ตอนเย็นนำสลิปธนาคารใบเดียวมาเช็คได้ง่าย แต่ช่างทั้งสองคนจะได้ส่วนแบ่งแยกตามหัวที่ตัดจริงอย่างโปร่งใส!</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: '📊 3. แดชบอร์ด การเช็คยอด และวิธีแก้ไขบิลย้อนหลัง',
      icon: LayoutDashboard,
      keywords: ['แดชบอร์ด', 'แก้ไขบิล', 'แก้ไขย้อนหลัง', 'ลบบิล', 'เปลี่ยนยอดเงิน', 'แก้ช่าง', 'แก้รายการ', 'dashboard', 'รายงาน', 'ปริ้น', 'พิมพ์รายงาน', 'ส่งออก'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex gap-3">
            <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-indigo-950">แผงรายงานด่วนยอดขายและสัดส่วนประเภทเงินรับ 📊</p>
              <p className="mt-1">
                หน้านี้จะสรุปสถิติต่างๆ ในรูปแบบเรียลไทม์ ทั้งยอดขายทั้งหมด ยอดรับเงินสด ยอดเงินโอน ค่าเฉลี่ยหัวต่อคน และสถิติจำนวนลูกค้าที่ใช้บริการแยกรายคนเพื่อประเมินความฮิตของช่างแต่ละท่าน
              </p>
            </div>
          </div>

          {/* How to Edit / Correct Historical Bills */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">1</span>
              ขั้นตอนการแก้ไขหรือลบรายการบิลย้อนหลัง (Instant Re-calculating POS)
            </h4>
            <p className="text-slate-600">
              หากพนักงานคีย์ราคาสลับตัวเลข คีย์ชื่อช่างสลับกัน หรือเปลี่ยนความประสงค์ชำระเงิน คุณสามารถแก้ไขได้เองง่ายๆ ไม่ต้องบันทึกยอดชดเชยลบกลบตัวเลขให้ปวดหัว:
            </p>
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 text-slate-600">
              <p>1. เปิดเมนูหลักไปที่แท็บ <strong>"3. Dashboard"</strong></p>
              <p>2. เลื่อนหน้าจอลงไปข้างล่างสุดของแดชบอร์ด จะพบส่วน <strong className="text-slate-900">"ประวัติบริการในร้านค้าวันนี้"</strong></p>
              <p>3. มองหาแถวรายการบิลเจ้าปัญหา และกดปุ่ม <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100">"แก้ไขบริการ"</strong></p>
              <p>4. หน้าต่างแก้ไขบิลจะเด้งขึ้นมา ซึ่งคุณสามารถปรับแก้ได้ดังนี้:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 text-slate-500">
                <li><strong>สลับช่างผู้บริการ:</strong> เงินค่าแรงคอมมิชชั่นจะย้ายข้ามไปช่างคนใหม่ทันทีแบบเรียลไทม์</li>
                <li><strong>ปรับแก้ตัวเลขเงินสด:</strong> แก้ไขยอดตัดผม ยอดเคมี หรือสินค้าตามจริง</li>
                <li><strong>เปลี่ยนยอดทิปช่าง:</strong> ระบุหรือแก้ทิปที่พิมพ์ผิด</li>
                <li><strong>สลับช่องทางการรับเงิน:</strong> เปลี่ยนจาก "เงินโอน" ไปเป็น "เงินสด" เพื่อให้เงินก้นเก๊ะตรงตามนับจริง</li>
              </ul>
              <p>5. กด <strong>"💾 บันทึกและคำนวณใหม่"</strong> เพื่อให้ระบบเซฟขึ้น Cloud และอัปเดตเปอร์เซ็นต์ค่าคอมมิชชั่นในใบสลิปเงินเดือนช่างของเดือนนั้นๆ อัตโนมัติทันที!</p>
            </div>
          </div>

          {/* Daily vs Monthly View Toggle Documentation */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">2</span>
              การสลับโหมดดูข้อมูล "รายวัน" หรือ "รายเดือน" (Daily vs Monthly View Filter)
            </h4>
            <p className="text-slate-600">
              ผู้จัดการร้านและนักบัญชีสามารถสลับโหมดมุมมองข้อมูลยอดขายได้อย่างยืดหยุ่นบริเวณส่วนบนของหน้าแดชบอร์ด:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-1">
                <p className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px]">📅 โหมดรายวัน (Daily)</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  แสดงสถิติเฉพาะวันที่เลือก เลือกเปลี่ยนวันที่ย้อนหลังได้ แสดงยอดรวมขายสุทธิประจำวัน สัดส่วนเงินสด/เงินโอน/โหมดผสม และตารางประวัติรายการบริการทุกบิลของวันนั้น
                </p>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-1">
                <p className="font-extrabold text-purple-950 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px]">🗓️ โหมดรายเดือน (Monthly)</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  แสดงภาพรวมรายรับรวมตลอดทั้งเดือน กราฟแท่งเปรียบเทียบยอดขายรายวัน และตารางสรุปรายรับสะสมแต่ละวันในเดือนนั้น เหมาะสำหรับการทำบัญชีสรุปยอดสิ้นเดือน
                </p>
              </div>
            </div>
          </div>

          {/* Printing & Exporting Reports */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">3</span>
              การจัดทำและพิมพ์สรุปรายงาน (PDF / Image / HTML Report)
            </h4>
            <p className="text-slate-600">
              ระบบมีส่วนแบ่งปุ่มดาวน์โหลดรายงานอัตโนมัติทั้งแบบ <strong>"รายวัน"</strong> และ <strong>"รายเดือน"</strong> เพื่อใช้ตรวจสอบส่งต่อให้แอดมินหรือผู้สอบบัญชีร้านค้า:
            </p>
            <div className="p-3.5 bg-slate-900 text-slate-300 rounded-xl space-y-2">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-amber-400" />
                การออกเอกสารรายงานมาตรฐาน:
              </p>
              <p className="text-[11px] leading-relaxed">
                คลิกปุ่ม **"พิมพ์รายงาน (PDF / HTML)"** ในหัวข้อสรุป รายงานจะจำลองตารางแยกแยะสรุปค่าใช้จ่าย ค่ารายรับ ยอดขายของช่างแต่ละคน และรายละเอียดเงินสดคงเหลือเพื่อเปิดหน้านี้ในหน้าต่างพิมพ์ (Print Screen Dialog) สำหรับสั่งเซฟเป็นไฟล์ PDF หรือส่งออกเป็นกระดาษ A4 ได้ทันใจ
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cash',
      title: '💵 5. ระบบลิ้นชักเงินสดและการควบคุมบัญชีรายวัน',
      icon: DollarSign,
      keywords: ['เงินสด', 'ลิ้นชัก', 'เงินทอน', 'เบิกเงิน', 'จ่ายสด', 'ขาดเกิน', 'เงินก้นถุง', 'cash', 'เบิกจ่าย', 'ปิดเก๊ะ', 'ปิดร้าน'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          <p className="text-slate-600">
            ระบบลิ้นชักเงินสดทำหน้าที่ควบคุมยอดเงินก้นเก๊ะของทางร้าน และบันทึกบัญชีค่าใช้จ่ายสดเบ็ดเตล็ดประจำวัน เพื่อให้เจ้าของร้านสามารถตรวจเช็คความซื่อสัตย์ของการเก็บเงินสดได้แบบเหรียญต่อเหรียญ
          </p>

          {/* Cash Drawer Math Formula */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
            <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-indigo-600" />
              สมการคำนวณเงินสดกองกลาง
            </p>
            <div className="p-3 bg-slate-900 text-amber-400 rounded-lg font-mono text-[11px] space-y-1 leading-relaxed">
              <p className="text-white font-black">[ ยอดเงินสดในเก๊ะที่ควรจะมี (Expected Cash) ]</p>
              <p>  = (ยอดเงินสดกองกลางเปิดร้านตอนเช้า)</p>
              <p>  + (ยอดรวมเก็บเงินสด 💵 จากลูกค้าตลอดทั้งวัน)</p>
              <p>  - (ยอดเงินสดจ่ายเบ็ดเตล็ดที่หยิบออกจากร้าน)</p>
            </div>
          </div>

          {/* Cash Drawer Walkthrough */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1">⚙️ ลำดับขั้นตอนการจัดการหน้านับเงินส่งยอด</h4>
            <div className="relative border-l border-slate-200 pl-5 ml-2.5 space-y-4">
              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-slate-850 text-white rounded-full flex items-center justify-center font-bold text-[9px]">1</span>
                <p className="font-bold text-slate-900">ระบุยอดเงินเปิดเก๊ะตอนเช้า (Drawer Opening Cash)</p>
                <p className="text-slate-500 mt-0.5">ในช่อง "ยอดเงินเปิดลิ้นชัก" ให้พนักงานกรอกจำนวนเงินกองกลางที่ใส่ไว้สำหรับเป็นเงินทอน (เช่น 1,500 บาท)</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-slate-850 text-white rounded-full flex items-center justify-center font-bold text-[9px]">2</span>
                <p className="font-bold text-slate-900">บันทึกค่าใช้จ่ายระหว่างวัน (Petty Cash Expenses)</p>
                <p className="text-slate-500 mt-0.5">หากมีการหยิบเงินสดในลิ้นชักออกไปซื้อน้ำยาทำความสะอาด จ่ายค่าน้ำแข็ง ค่าอาหาร หรือซื้อใบมีดโกน ให้มากด **"เพิ่มรายการรายจ่ายสด"** ระบุรายละเอียดและยอดเงินทันทีเพื่อความแม่นยำ</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-slate-850 text-white rounded-full flex items-center justify-center font-bold text-[9px]">3</span>
                <p className="font-bold text-slate-900">นับเงินสดจริงตอนปิดร้าน (Evening Cash Audit)</p>
                <p className="text-slate-500 mt-0.5">เมื่อถึงเวลาปิดร้าน ให้เปิดเก๊ะนำธนบัตรและเหรียญทั้งหมดมานับจริงแบบละเอียด แล้วพิมพ์ยอดตัวเลขรวมลงในช่อง **"ยอดเงินสดนับจริง"**</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[27px] top-0 w-3.5 h-3.5 bg-slate-850 text-white rounded-full flex items-center justify-center font-bold text-[9px]">4</span>
                <p className="font-bold text-slate-900">ตรวจสอบความต่างเงินขาด/เงินเกิน (Discrepancy Check)</p>
                <p className="text-slate-500 mt-0.5">
                  ระบบจะทำการหักลบและแสดงค่าความต่างโดยอัตโนมัติ:<br />
                  - <span className="text-emerald-600 font-extrabold">ส่วนต่างยอดเป็น ฿0.00 (สีเขียว):</span> บัญชีร้านค้าถูกต้อง สมบูรณ์แบบ ไม่มีเงินตกหล่นหาย<br />
                  - <span className="text-rose-600 font-extrabold">ส่วนต่างยอดติดลบ -฿50.00 (สีแดง):</span> บ่งชี้ว่าเงินในเก๊ะหายน้อยกว่าระบบ ควรรีบไปเช็คกล้องวงจรปิดหรือตรวจสอบว่าพนักงานลืมคีย์รายการจ่ายเบ็ดเตล็ดหรือไม่
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'payslips',
      title: '📝 6. การคำนวณเงินค่าแรงและพิมพ์ใบสลิปจ่ายเงินช่าง',
      icon: Briefcase,
      keywords: ['สลิป', 'เงินเดือน', 'ค่าจ้าง', 'สรุปยอด', 'ใบเสร็จ', 'ความร้อน', 'สลิปเงินช่าง', 'payslips', 'สลิปพิมพ์', 'thermal', '58mm', '80mm'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          <p className="text-slate-600">
            ระบบจัดสลิปและเงินเดือนพนักงานนี้ ได้รับการออกแบบให้คำนวณและดึงข้อมูลยอดตัดผม คอร์สเคมี และการสอยขายสินค้าของช่างแต่ละรายมาคิดสัดส่วนรายได้ทันที เพื่อความสบายใจ ความโปร่งใส และลดภาระเวลาลงกระดาษสมุดทำมือยามสิ้นวันหรือสิ้นเดือน
          </p>

          {/* Commission Calculation Rules */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1">⚙️ กฎความโปร่งใสและหลักการคิดเงินช่าง</h4>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3 text-slate-600">
              <div className="flex gap-2.5">
                <Scissors className="w-5 h-5 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-extrabold text-slate-900">คอมมิชชั่นงานตัดผมและเคมี:</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">คิดแยกส่วนแบ่ง % ตามที่ตกลงกันไว้ในการตั้งค่า เช่น ราคาตัดผม 200 บาท (ส่วนแบ่งช่าง 50%) ช่างจะได้ 100 บาทสะสม ยอดจะเพิ่มทันทีหลังบันทึกบิล</p>
                </div>
              </div>

              <div className="flex gap-2.5 border-t border-slate-200/50 pt-2.5">
                <DollarSign className="w-5 h-5 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-extrabold text-slate-900">สิทธิรับทิปช่างเต็ม 100% (No Shop Cut):</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">ยอดทิปที่พิมพ์ลงในบิล POS ไม่ว่าจะโอนผ่านธนาคารหรือจ่ายด้วยเงินสด ระบบจะทำการบวกให้ช่างเจ้าของบิลแบบ 100% เสมอโดยไม่มีการหักตงเข้าทางร้านแต่อย่างใด</p>
                </div>
              </div>
            </div>
          </div>

          {/* Thermal Printer simulation */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1">🖨️ ขั้นตอนเปิดพิมพ์สลิปและส่งเอกสารให้ช่างตรวจสอบ</h4>
            <ol className="list-decimal list-inside space-y-2 pl-1 text-slate-600">
              <li>ไปที่เมนูหลัก <strong>"5. สลิปเงินเดือน"</strong></li>
              <li>เลือกช่วงเดือนประจำงวดบัญชี และกดที่ <strong>"ชื่อช่าง"</strong> ที่คุณประสงค์ต้องการออกใบสลิป</li>
              <li>ระบบจะคำนวณและแสดงรายละเอียดตารางการตัด แยกตามรายวันที่อย่างละเอียดถ้วนหน้าพร้อมแสดงสรุปยอดสุดท้าย</li>
              <li>หากต้องการส่งสลิปให้ช่างเพื่อเป็นหลักฐาน:
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-500">
                  <li>กดปุ่ม <strong>"พิมพ์สลิปเงินเดือน (สไตล์ร้านตัดผม)"</strong></li>
                  <li>ระบบจะสร้างภาพจำลองกระดาษสลิปใบเสร็จมาตรฐาน (Thermal Receipt Layout ขนาดกว้าง 80 มม.) ซึ่งมีความสวยงาม เป็นทางการ</li>
                  <li>สามารถกดพิมพ์เพื่อปริ้นท์ออกเครื่องพิมพ์ความร้อนติดหน้าร้าน หรือแคปหน้าจอรูปสลิปนี้ส่งต่อให้ช่างทาง Line ได้โดยตรง สะดวกสบายและทันสมัยสุดๆ</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'faqs',
      title: '❓ คำถามที่พบบ่อย & แก้ไขปัญหาเบื้องต้น (FAQs)',
      icon: HelpCircle,
      keywords: ['คำถาม', 'ปัญหา', 'ช่วย', 'เน็ตหลุด', 'ออฟไลน์', 'คิวหาย', 'ทำไม', 'ซ้อน', 'ความลับ', 'ความปลอดภัย', 'ลืมเซฟ', 'faqs'],
      content: (
        <div className="space-y-6 text-xs font-sans leading-relaxed">
          <div className="space-y-4">
            
            {/* FAQ 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5">
              <p className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="p-1 bg-indigo-100 text-indigo-700 rounded text-[10px]">Q</span>
                อะไรจะเกิดขึ้นถ้าร้านหลุดการเชื่อมต่ออินเทอร์เน็ตระหว่างทำงาน?
              </p>
              <div className="text-slate-600 pl-4 border-l-2 border-indigo-500 space-y-1">
                <p className="font-bold text-slate-800">A: ระบบสนับสนุนการทำงานแบบออฟไลน์อย่างสมบูรณ์แบบ (Offline-First POS) 🔌</p>
                <p>
                  ไม่ต้องตกใจ! หากอินเทอร์เน็ตของห้างสรรพสินค้าหรือร้านค้าเกิดดับลง คุณยังสามารถคีย์ข้อมูลบิลขาย ลงเวลาจองคิวใหม่ หรือเพิ่มรายจ่ายได้ตามปกติ โดยฐานข้อมูลจะถูกเก็บรักษาไว้ชั่วคราวในพื้นที่จำลองของเครื่องคอมพิวเตอร์ของคุณ (Local Storage) และทันทีที่ตรวจพบสัญญาณอินเทอร์เน็ตกลับมาใช้งานได้เป็นปกติ ระบบอัจฉริยะจะทำการซิงค์และบันทึกประวัติการขายทั้งหมดที่ค้างอยู่ขึ้นฐานข้อมูล Cloud Firestore โดยทันทีโดยคุณไม่ต้องกรอกซ้ำหรือกดปุ่มใดๆ ทั้งสิ้น!
                </p>
              </div>
            </div>

            {/* FAQ 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5">
              <p className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="p-1 bg-indigo-100 text-indigo-700 rounded text-[10px]">Q</span>
                ทำไมรายการจองคิวที่เคยลงไว้ของเมื่อวานถึงหายไปจากหน้ารับคิวในเช้าวันนี้?
              </p>
              <div className="text-slate-600 pl-4 border-l-2 border-indigo-500 space-y-1">
                <p className="font-bold text-slate-800">A: เป็นการจัดการพื้นที่เพื่อไม่ให้หน้าปฏิทินรกรุงรัง (Auto Cleanup Management) 🧹</p>
                <p>
                  ระบบจะล้างประวัติจองที่สิ้นสุดลงแล้วและล่วงเลยวันไปเพื่อไม่ให้เบียดบังพื้นที่แสดงคิวของลูกค้าในวันนี้ โดยประวัติการจองจะซ่อนออกไปจากปฏิทินโดยอัตโนมัติ เพื่อรักษาความสะอาด เรียบร้อย และรวดเร็วในการเปิดหน้าเว็บ อย่างไรก็ตาม ประวัติทางการเงินหรือรายรับยอดขายที่คุณบันทึกปิดดีลไปแล้วในส่วน POS จะยังคงได้รับการเก็บรักษาอย่างดีเยี่ยมถาวร สามารถเรียกดูย้อนหลังได้ตลอดเวลาในแท็บแดชบอร์ดและประวัติการเงิน!
                </p>
              </div>
            </div>

            {/* FAQ 3 */}
            <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5">
              <p className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="p-1 bg-indigo-100 text-indigo-700 rounded text-[10px]">Q</span>
                สามารถปิดใช้งานระบบตรวจเช็คเวลาคิวซ้อนของช่างได้หรือไม่?
              </p>
              <div className="text-slate-600 pl-4 border-l-2 border-indigo-500 space-y-1">
                <p className="font-bold text-slate-800">A: ไม่สามารถปิดได้ เนื่องจากถูกพัฒนาไว้เป็นระบบความปลอดภัยพื้นฐานของโครงสร้างคิว 🛡️</p>
                <p>
                  ระบบตรวจสอบการซ้อนคิวของช่างแต่ละคนเป็นหัวใจสำคัญเพื่อลดความขัดแย้งหน้างานและปกป้องคุณภาพบริการ หากต้องการลงนัดหมายในเวลาที่ใกล้เคียงกัน ขอแนะนำให้จองลูกค้ากระจายให้แก่ช่างท่านอื่นที่ยังว่างอยู่ หรือเปลี่ยนตัวเลือกเวลาเริ่มต้นให้ไม่ทับส้นกันเพื่อหลีกเลี่ยงระบบตัดปฏิเสธ
                </p>
              </div>
            </div>

          </div>
        </div>
      )
    }
  ];

  // Search filter implementation
  const filteredSections = sections.filter(section => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      section.title.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  // Display all sections as list if there are matches, otherwise show current selection
  const displayedSections = filteredSections.length > 0 ? filteredSections : sections;

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[94vh] flex flex-col animate-scale-up">
        
        {/* Top Header */}
        <div className="bg-slate-950 text-white px-6 py-5 flex items-center justify-between relative shrink-0 border-b border-slate-850">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-orange-500/10">
              📖
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-sans tracking-wide">คู่มือการใช้งานระบบร้านตัดผมอย่างละเอียด</h3>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-0.5">COMPLETE BARBER POS & QUEUE MANAGEMENT USER MANUAL</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer p-2 rounded-full hover:bg-slate-850 transition-all font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search Box */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-8" />
          <input 
            type="text"
            placeholder="🔍 ค้นหาเรื่องที่คุณต้องการทราบในคู่มือ เช่น 'รวมยอดโอน', 'นับเงินก้นเก๊ะ', 'ล้างคิวเมื่อวาน', 'แก้ไขบิลผิด'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans placeholder-slate-400 font-medium"
          />
        </div>

        {/* Main Sidebar & Content Container */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-[400px]">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-68 bg-slate-50 border-r border-slate-100 overflow-y-auto shrink-0 py-5 px-3 space-y-1.5">
            <p className="px-3 text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase mb-2">หัวข้อและโมดูลคู่มือ</p>
            {displayedSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-black text-left transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${activeSection === section.id ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="truncate">{section.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Workspace */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
            {sections.find(s => s.id === activeSection)?.content}
          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            เอกสารทางการระบุสิทธิ์: {shopConfig?.shopName || 'ระบบร้านตัดผมบาร์เบอร์ POS'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
          >
            ฉันเข้าใจการใช้งานแล้ว ปิดหน้าคู่มือ
          </button>
        </div>

      </div>
    </div>
  );
}
