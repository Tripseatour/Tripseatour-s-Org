import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight, X, Mail, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '../types';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticateGoogle: (user: AdminUser) => void;
  onAuthenticatePin?: (pin: string) => boolean;
  authorizedEmails?: string[];
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticateGoogle,
  onAuthenticatePin,
  authorizedEmails = ['asmr9941@gmail.com', 'admin@tripseatour.com']
}) => {
  const [googleEmailInput, setGoogleEmailInput] = useState('asmr9941@gmail.com');
  const [pinInput, setPinInput] = useState('');
  const [authMode, setAuthMode] = useState<'google' | 'pin'>('google');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async (e?: React.FormEvent, selectedEmail?: string) => {
    if (e) e.preventDefault();
    const targetEmail = (selectedEmail || googleEmailInput).trim().toLowerCase();
    
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('กรุณากรอก Google Account Email ที่ถูกต้อง');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/verify-google-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: targetEmail.split('@')[0],
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetEmail)}&background=0D9488&color=fff`
        })
      });

      const data = await res.json();
      if (res.ok && data.authenticated && data.user) {
        onAuthenticateGoogle(data.user);
        onClose();
      } else {
        setErrorMsg(data.message || 'อีเมลนี้ไม่ได้รับสิทธิ์เข้าถึงระบบผู้ดูแล');
      }
    } catch (err) {
      // Fallback client-side verification
      const lowerAuth = authorizedEmails.map(a => a.trim().toLowerCase());
      if (lowerAuth.includes(targetEmail)) {
        const user: AdminUser = {
          email: targetEmail,
          name: targetEmail.split('@')[0],
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetEmail)}&background=0D9488&color=fff`,
          role: targetEmail === lowerAuth[0] ? 'superadmin' : 'admin',
          lastLogin: new Date().toISOString()
        };
        onAuthenticateGoogle(user);
        onClose();
      } else {
        setErrorMsg(`บัญชี Google (${targetEmail}) ไม่ได้รับสิทธิ์เข้าถึงหลังบ้าน กรุณาใช้อีเมลที่ได้รับอนุญาต`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านแอดมิน');
      return;
    }

    if (onAuthenticatePin) {
      const success = onAuthenticatePin(pinInput.trim());
      if (success) {
        setErrorMsg(null);
        setPinInput('');
        onClose();
      } else {
        setErrorMsg('รหัสผ่านแอดมินไม่ถูกต้อง โปรดตรวจสอบแล้วลองใหม่อีกครั้ง');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 relative my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-900">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-teal-400 block">
                ADMIN AUTHENTICATION
              </span>
              <h3 className="text-base font-extrabold text-white">เข้าสู่ระบบผู้ดูแลระบบ</h3>
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
          <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-950 leading-relaxed">
              <p className="font-bold mb-0.5">ระบบความปลอดภัย Google Account</p>
              <p className="text-teal-800">
                เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาตเพื่อจัดการคำสั่งจอง ปรับราคา ตอบรีวิว และตั้งค่าระบบ
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setAuthMode('google'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'google' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Google Account
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('pin'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'pin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              PIN Code
            </button>
          </div>

          {authMode === 'google' ? (
            <form onSubmit={handleGoogleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  เลือกหรือกรอกบัญชี Google ผู้ดูแลระบบ
                </label>
                
                {/* Fast select authorized accounts */}
                <div className="space-y-2 mb-3">
                  {authorizedEmails.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => {
                        setGoogleEmailInput(email);
                        handleGoogleLogin(undefined, email);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left text-xs ${
                        googleEmailInput === email
                          ? 'border-teal-500 bg-teal-50/50 font-bold text-teal-900'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-xs">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        </div>
                        <span className="font-mono">{email}</span>
                      </div>
                      {email === authorizedEmails[0] && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          Super Admin
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => {
                      setGoogleEmailInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="กรอก Google Email อื่นๆ..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
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
                  id="sign-in-google-admin-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-teal-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  รหัสผ่านสำรอง (Admin PIN)
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
                    placeholder="กรอกรหัสผ่าน เช่น 1234"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                  className="w-2/3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-teal-200 flex items-center justify-center gap-2"
                >
                  <span>เข้าสู่ระบบด้วย PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
