import React from 'react';
import { Compass, Phone, Mail, MapPin, MessageCircle, ShieldCheck, QrCode, Lock, Facebook } from 'lucide-react';
import { Language, AppSettings } from '../types';
import { translations } from '../data/translations';

interface FooterProps {
  currentLang: Language;
  settings: AppSettings;
  onNavigate: (view: 'home' | 'how-to-book' | 'about-me' | 'admin') => void;
}

export const Footer: React.FC<FooterProps> = ({ currentLang, settings, onNavigate }) => {
  const t = translations[currentLang];

  return (
    <footer className="bg-slate-900 text-slate-400 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-900">
                T
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                TRIP SEA <span className="text-blue-500">TOUR</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.tagline}
            </p>
            <div className="inline-flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-300">
              <QrCode className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">PromptPay QR Ready</span>
                <span className="text-[11px] text-slate-400">ชำระเงินตรง สะดวก ปลอดภัย 100%</span>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Menu
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-blue-400 text-left transition">
                  {t.home}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-to-book')} className="hover:text-blue-400 text-left transition">
                  {t.howToBook}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about-me')} className="hover:text-blue-400 text-left transition">
                  {t.aboutMe}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {t.contact}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-slate-300">
                    <span className="text-[10px] text-slate-400 block">เบอร์โทรหลัก:</span>
                    <a href="tel:0626816494" className="font-bold text-white hover:text-blue-400 transition font-mono">
                      062-681-6494
                    </a>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-[10px] text-slate-400 block">เบอร์สำรอง:</span>
                    <a href="tel:0979241399" className="font-bold text-white hover:text-blue-400 transition font-mono">
                      097-924-1399
                    </a>
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-2 pt-1">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{settings.contactEmail}</span>
              </li>
            </ul>
          </div>

          {/* Col 4: LINE Official & Verification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {t.lineOfficial}
            </h4>
            <p className="text-xs text-slate-400">
              ติดต่อสอบถามโปรแกรมทัวร์เพิ่มเติม หรือ ส่งสลิปโอนเงินผ่าน LINE OA ได้ตลอด 24 ชั่วโมง
            </p>
              <a
                href={`https://line.me/R/ti/p/${settings.lineOaId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-950"
              >
                <MessageCircle className="w-4 h-4" />
                <span>แอด LINE Official ({settings.lineOaId})</span>
              </a>

              <a
                href={settings.facebookMessengerUrl || 'https://m.me/tripseatoursphuket'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#0084FF] to-[#00C6FF] hover:opacity-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-950/40"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>💬 แชทผ่าน Facebook Messenger</span>
              </a>

              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-950/40"
                >
                  <Facebook className="w-4 h-4 text-blue-100 fill-current" />
                  <span>เยี่ยมชม Facebook Page</span>
                </a>
              )}
          </div>
        </div>

        {/* Bottom Call Hotline Banner */}
        <div className="my-6 p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">โทรสอบถาม / จองทัวร์ด่วนทางโทรศัพท์</div>
              <div className="text-[11px] text-slate-400">ติดต่อเจ้าหน้าที่ทริปซีทัวร์ได้ตลอด 24 ชั่วโมง</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
            <a
              href="tel:0626816494"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-950 font-mono"
            >
              <Phone className="w-4 h-4 text-blue-200" />
              <span>โทรเบอร์หลัก 062-681-6494</span>
            </a>

            <a
              href="tel:0979241399"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition border border-slate-600 font-mono"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>โทรเบอร์สำรอง 097-924-1399</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{t.copyright}</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              TAT License Verified 33/11100
            </span>

            {/* Hidden/Discrete Admin Button at Bottom Right */}
            <button
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition text-[11px] font-semibold py-1 px-2 rounded hover:bg-slate-800/80 border border-slate-800"
              title="เข้าสู่ระบบจัดการแอดมิน (Admin Only)"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>ผู้ดูแลระบบ (Admin)</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
