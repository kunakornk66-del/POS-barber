import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Copy, MoreVertical, Share, Scissors } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  shopName?: string;
  logoUrl?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  shopName = 'Barber POS',
  logoUrl = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hide when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const appUrl = window.location.origin;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer shrink-0"
        title="ติดตั้งโปรแกรมไว้บนหน้าจอหลักแท็บเล็ต/มือถือ พร้อมไอคอนโลโก้ร้านของคุณ"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>ติดตั้งแอป</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={shopName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">
                    วิธีเอาโปรแกรมไว้หน้าจอแท็บเล็ต
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    ไอคอนหน้าจอจะแสดงตามโลโก้และชื่อร้านของคุณอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              {/* Live Icon Preview Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center gap-3.5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-400 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={shopName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Scissors className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    ตัวอย่างไอคอนที่จะแสดงบนหน้าจอแท็บเล็ต
                  </div>
                  <div className="text-sm font-black text-white truncate mt-0.5">
                    {shopName}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {logoUrl
                      ? '✅ ใช้รูปโลโก้ของเจ้าของร้านที่ตั้งค่าไว้'
                      : '💡 เปลี่ยนรูปโลโก้ร้านได้ที่เมนู "6. ตั้งค่า" ก่อนกดเพิ่มลงหน้าจอ'}
                  </div>
                </div>
              </div>

              {/* Direct Install Button if supported */}
              {isInstallable && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <p className="font-extrabold text-emerald-900">
                    ✨ อุปกรณ์ของคุณรองรับการติดตั้งลงหน้าจอทันที:
                  </p>
                  <button
                    type="button"
                    onClick={install}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>กดที่นี่เพื่อติดตั้งแอป ({shopName}) ทันที</span>
                  </button>
                </div>
              )}

              {/* Step 1: Copy Link to open in Chrome */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-black">
                    1
                  </span>
                  <span>เปิดลิงก์นี้ในแอป Google Chrome บนแท็บเล็ต</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Android Tablet Instructions */}
              {!isIOS ? (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] flex items-center justify-center font-black">
                      2
                    </span>
                    <span>สำหรับแท็บเล็ต Android (Google Chrome)</span>
                  </div>
                  <ol className="space-y-2 pl-2 text-slate-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-black text-amber-700">1.</span>
                      <span>
                        เข้าสู่ระบบด้วยอีเมลร้านของคุณให้เรียบร้อย (เพื่อให้ระบบดึงโลโก้ร้านของคุณ)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-amber-700">2.</span>
                      <span>
                        แตะปุ่มเมนู <b>จุด 3 จุด</b>{' '}
                        <MoreVertical className="w-3.5 h-3.5 inline text-slate-800" /> ที่มุมขวาบนของจอ Chrome
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-amber-700">3.</span>
                      <span>
                        เลือกเมนู <b>&ldquo;เพิ่มลงในหน้าจอหลัก&rdquo; (Add to Home screen)</b> หรือ{' '}
                        <b>&ldquo;ติดตั้งแอป&rdquo; (Install app)</b>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-amber-700">4.</span>
                      <span>
                        กดปุ่ม <b>&ldquo;ติดตั้ง&rdquo; (Install)</b> หรือ <b>&ldquo;เพิ่ม&rdquo; (Add)</b>{' '}
                        ไอคอนรูปโลโก้ร้านจะไปอยู่บนหน้าจอแท็บเล็ตทันที
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-black">
                      2
                    </span>
                    <span>สำหรับ iPad / iPhone (ผ่านแอป Safari)</span>
                  </div>
                  <ol className="space-y-2 pl-2 text-slate-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-black text-indigo-700">1.</span>
                      <span>
                        แตะปุ่ม <b>แชร์ (Share)</b>{' '}
                        <Share className="w-3.5 h-3.5 inline text-indigo-600" /> บนแถบด้านบนหรือด้านล่างของ Safari
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-indigo-700">2.</span>
                      <span>
                        เลื่อนลงมาแล้วแตะ <b>&ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo; (Add to Home Screen)</b>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-indigo-700">3.</span>
                      <span>
                        แตะ <b>&ldquo;เพิ่ม&rdquo; (Add)</b> ที่มุมขวาบน
                      </span>
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
