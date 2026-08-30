import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, KeyRound, AlertCircle, X, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
  shopName?: string;
  title?: string;
  description?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
  shopName = 'ร้านบาร์เบอร์',
  title = 'ใส่รหัสผ่าน PIN เพื่อเข้าสู่หน้าตั้งค่า',
  description = 'หน้านี้ถูกล็อคความปลอดภัยโดยเจ้าของร้าน กรุณากรอกรหัสผ่าน PIN 4-6 หลักเพื่อเข้าถึงการตั้งค่า'
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsShaking(false);
      setIsSuccess(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const effectivePin = (correctPin && correctPin.trim().length >= 4) ? correctPin.trim() : '1234';
  const targetLength = Math.max(4, effectivePin.length);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
      if (newPin.length === effectivePin.length) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
    inputRef.current?.focus();
  };

  const verifyPin = (pinToTest: string) => {
    if (pinToTest === effectivePin) {
      setIsSuccess(true);
      setError(null);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 400);
    } else {
      setIsShaking(true);
      setError('❌ รหัสผ่าน PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
        inputRef.current?.focus();
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyPin(pin);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm select-none"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            x: isShaking ? [-12, 12, -8, 8, -4, 4, 0] : 0
          }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-center"
        >
          {/* Header Accent Band */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
              {isSuccess ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400 animate-bounce" />
              ) : (
                <Lock className="w-6 h-6 text-amber-400" />
              )}
            </div>

            <h3 className="text-base font-extrabold tracking-tight text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-300/90 font-medium mt-1 line-clamp-1">
              🏪 {shopName}
            </p>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {description}
            </p>

            {/* Hidden Input for Keyboard typing */}
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPin(val);
                setError(null);
                if (val.length === effectivePin.length) {
                  verifyPin(val);
                }
              }}
              className="sr-only"
              autoFocus
            />

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center space-x-3 py-2">
              {Array.from({ length: targetLength }).map((_, idx) => {
                const isFilled = idx < pin.length;
                const digit = pin[idx];
                return (
                  <div
                    key={idx}
                    className={`w-11 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-black font-mono transition-all duration-150 ${
                      isSuccess
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 scale-105'
                        : error
                        ? 'border-rose-400 bg-rose-50 text-rose-700 animate-pulse'
                        : isFilled
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs scale-105'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
                    }`}
                  >
                    {isFilled ? (
                      showNumbers ? digit : '●'
                    ) : (
                      '○'
                    )}
                  </div>
                );
              })}
            </div>

            {/* Toggle show/hide PIN */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowNumbers(!showNumbers)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                {showNumbers ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>ซ่อนตัวเลข PIN</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>แสดงตัวเลข PIN</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Numeric Keypad for Touch / Mouse Click */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-12 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 text-slate-800 rounded-2xl font-bold font-mono text-lg transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 rounded-2xl font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-12 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 text-slate-800 rounded-2xl font-bold font-mono text-lg transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-12 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 text-slate-600 rounded-2xl font-bold text-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                title="ลบตัวเลขล่าสุด"
              >
                ⌫
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => verifyPin(pin)}
                disabled={pin.length < 4}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>ปลดล็อค</span>
              </button>
            </div>

            {effectivePin === '1234' && (
              <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-800 text-[11px] font-medium leading-tight">
                💡 รหัสเริ่มต้นจากระบบคือ <strong className="font-mono font-bold text-amber-900">1234</strong> (สามารถเปลี่ยนรหัสได้ในหน้าตั้งค่า)
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
