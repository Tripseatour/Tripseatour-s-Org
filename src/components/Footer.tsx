import React from 'react';
import { Compass, Phone, Mail, MapPin, MessageCircle, ShieldCheck, QrCode, Lock } from 'lucide-react';
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
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{settings.contactPhone}</span>
              </li>
              <li className="flex items-center gap-2">
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
              className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-950"
            >
              <MessageCircle className="w-4 h-4" />
              <span>แอด LINE Official ({settings.lineOaId})</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{t.copyright}</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              TAT License Verified 31/01824
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
