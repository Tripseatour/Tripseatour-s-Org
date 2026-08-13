import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight, X } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (pin: string) => boolean;
  currentPin: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticate,
  currentPin
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านแอดมิน');
      return;
    }

    const success = onAuthenticate(pinInput.trim());
    if (success) {
      setErrorMsg(null);
      setPinInput('');
    } else {
      setErrorMsg('รหัสผ่านแอดมินไม่ถูกต้อง โปรดตรวจสอบแล้วลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 relative my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 block">
                ADMIN AUTHENTICATION
              </span>
              <h3 className="text-base font-extrabold text-white">ยืนยันตัวตนผู้ดูแลระบบ</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 leading-relaxed">
              <p className="font-bold mb-0.5">ระบบถูกล็อคป้องกันบุคคลภายนอก</p>
              <p className="text-blue-800">
                กรุณาใส่รหัสผ่านแอดมินเพื่อเข้าสู่ส่วนจัดการคำสั่งซื้อ ราคาโปรแกรมทัวร์ และการตั้งค่า
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                รหัสผ่านแอดมิน (Admin PIN / Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="กรอกรหัสผ่าน (เช่น 1234)"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                <span>💡 รหัสผ่านเริ่มต้น: <strong className="text-slate-700 font-mono">1234</strong></span>
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ระบบแอดมิน</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
