import React, { useState } from 'react';
import { Globe, Check, Sparkles, X, ArrowRight, ShieldCheck, Waves } from 'lucide-react';
import { Language } from '../types';
import { Currency } from '../utils/currency';
import tripSeaLogo from '../assets/images/trip_sea_tour_logo_1786613886795.jpg';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  welcomeText: string;
  tagline: string;
  defaultCurrency: Currency;
  currencyLabel: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'TH',
    name: 'Thai',
    nativeName: 'ภาษาไทย',
    flag: '🇹🇭',
    welcomeText: 'ยินดีต้อนรับสู่ ทริปซีทัวร์ ภูเก็ต',
    tagline: 'สัมผัสประสบการณ์เที่ยวเกาะอันดามันราคาพิเศษ จองง่ายผ่านพร้อมเพย์',
    defaultCurrency: 'THB',
    currencyLabel: 'THB (฿ บาทไทย)'
  },
  {
    code: 'EN',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    welcomeText: 'Welcome to TripSea Tour Phuket',
    tagline: 'Premier Andaman island speedboats, catamarans & sunset yacht cruises',
    defaultCurrency: 'USD',
    currencyLabel: 'USD ($ US Dollar)'
  },
  {
    code: 'ZH',
    name: 'Chinese',
    nativeName: '简体中文',
    flag: '🇨🇳',
    welcomeText: '欢迎来到普吉岛携海之旅 TripSea',
    tagline: '精选皮皮岛、斯米兰、皇帝岛快艇与双体帆船，中文导游贴心服务',
    defaultCurrency: 'CNY',
    currencyLabel: 'CNY (¥ 人民币)'
  },
  {
    code: 'RU',
    name: 'Russian',
    nativeName: 'Русский язык',
    flag: '🇷🇺',
    welcomeText: 'Добро пожаловать в TripSea Tour',
    tagline: 'Морские экскурсии на острова Пхи-Пхи, Симиланы и закатные яхты',
    defaultCurrency: 'RUB',
    currencyLabel: 'RUB (₽ Рубль)'
  }
];

interface LanguageSelectionModalProps {
  isOpen: boolean;
  currentLang: Language;
  currentCurrency?: Currency;
  onSelectLanguage: (lang: Language, currency?: Currency) => void;
  onClose: () => void;
}

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  currentLang,
  currentCurrency = 'THB',
  onSelectLanguage,
  onClose,
}) => {
  const [selectedLang, setSelectedLang] = useState<Language>(currentLang || 'TH');
  const [autoSetCurrency, setAutoSetCurrency] = useState<boolean>(true);
  const [rememberChoice, setRememberChoice] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentOption = LANGUAGE_OPTIONS.find(l => l.code === selectedLang) || LANGUAGE_OPTIONS[0];

  const handleConfirm = (langToUse?: Language) => {
    const targetLang = langToUse || selectedLang;
    const option = LANGUAGE_OPTIONS.find(l => l.code === targetLang) || LANGUAGE_OPTIONS[0];
    const targetCurrency = autoSetCurrency ? option.defaultCurrency : undefined;

    try {
      sessionStorage.setItem('tst_language_prompted_session', 'true');
    } catch {}

    if (rememberChoice) {
      try {
        localStorage.setItem('tst_current_lang', targetLang);
        if (targetCurrency) {
          localStorage.setItem('tst_current_currency', targetCurrency);
        }
      } catch (err) {
        console.error('Failed to save language preference:', err);
      }
    }

    onSelectLanguage(targetLang, targetCurrency);
  };

  const handleQuickSelect = (lang: Language) => {
    setSelectedLang(lang);
    handleConfirm(lang);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950 border border-slate-700/80 text-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative my-auto overflow-hidden ring-1 ring-white/10">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer z-10 border border-slate-700"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Section */}
        <div className="text-center space-y-3 pt-1 pb-4 relative z-10">
          <div className="inline-flex items-center justify-center p-1.5 rounded-2xl bg-cyan-950/70 border border-cyan-500/30 shadow-lg shadow-cyan-950/50">
            <img
              src={tripSeaLogo}
              alt="TripSea Tour Phuket"
              className="w-12 h-12 rounded-xl object-cover"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Language & Currency Selection</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              เลือกภาษา / Select Language
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
              กรุณาเลือกภาษาที่ต้องการใช้งานเพื่อรับประสบการณ์ที่ดีที่สุด
              <br />
              <span className="text-slate-400 text-[11px]">
                Please select your preferred language to explore our Andaman island tours.
              </span>
            </p>
          </div>
        </div>

        {/* Language Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 my-4">
          {LANGUAGE_OPTIONS.map((item) => {
            const isSelected = selectedLang === item.code;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleQuickSelect(item.code)}
                className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-400/50 scale-[1.01]'
                    : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-500 hover:shadow-md'
                }`}
              >
                {/* Active selection glow pill */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-2xl leading-none filter drop-shadow-sm select-none">{item.flag}</span>
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                        <span>{item.nativeName}</span>
                        {item.name !== item.nativeName && (
                          <span className="text-[11px] font-normal text-slate-400">({item.name})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-cyan-300 font-medium">
                        สกุลเงิน: {item.currencyLabel}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                    {item.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className={`font-bold transition ${isSelected ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-300'}`}>
                    คลิกเพื่อเลือกทันที
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 transition group-hover:translate-x-1 ${isSelected ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Options & Settings */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 relative z-10 text-xs">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSetCurrency}
              onChange={(e) => setAutoSetCurrency(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
            />
            <span>ปรับสกุลเงินให้ตรงกับภาษาโดยอัตโนมัติ (Auto-set matching currency)</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
            />
            <span>จดจำตัวเลือกนี้สำหรับการเข้าชมครั้งต่อไป (Remember my choice)</span>
          </label>
        </div>

        {/* Bottom CTA / Confirmation Button */}
        <div className="mt-5 space-y-2 relative z-10">
          <button
            type="button"
            onClick={() => handleConfirm()}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3 rounded-2xl text-sm transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>เข้าสู่เว็บไซต์ ({currentOption.nativeName})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>สามารถเปลี่ยนภาษาได้ตลอดเวลาจากเมนูด้านบน</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              ข้ามไปก่อน (Skip)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
