import React, { useState } from 'react';
import { Compass, Globe, ShieldCheck, UserCheck, Phone, Ticket, Check, Lock } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/translations';
import tripSeaLogo from '../assets/images/trip_sea_tour_logo_1786613886795.jpg';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (view: 'home' | 'tours' | 'reviews' | 'admin') => void;
  activeView: string;
  onOpenLookup: () => void;
  promptPayId: string;
  isAdminAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  onNavigate,
  activeView,
  onOpenLookup,
  isAdminAuthenticated = false
}) => {
  const t = translations[currentLang];
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'TH', label: 'TH', flag: '🇹🇭' },
    { code: 'EN', label: 'EN', flag: '🇬🇧' },
    { code: 'ZH', label: 'CN', flag: '🇨🇳' },
    { code: 'RU', label: 'RU', flag: '🇷🇺' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs font-medium border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              {t.bestServiceGuarantee}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
              ⚡ {t.instantConfirmation}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="tel:+66812345678"
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition"
            >
              <Phone className="w-3 h-3 text-blue-400" />
              <span>081-234-5678</span>
            </a>
            <span className="text-slate-700">|</span>
            <button
              onClick={onOpenLookup}
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
            >
              <Ticket className="w-3.5 h-3.5" />
              {t.checkStatus}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <img
            src={tripSeaLogo}
            alt="TRIP SEA Tour Logo"
            className="w-10 h-10 rounded-lg object-cover border border-slate-300 shadow-sm group-hover:scale-105 transition"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
              TRIP SEA <span className="text-blue-600">TOUR</span>
            </span>
            <p className="text-[10px] font-medium text-slate-500 -mt-1 hidden sm:block">
              PHUKET ISLAND HOPPING & PROMPTPAY QR
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeView === 'home'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.home}
          </button>
          <button
            onClick={() => onNavigate('tours')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeView === 'tours'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tours}
          </button>
          <button
            onClick={() => onNavigate('reviews')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeView === 'reviews'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.reviews}
          </button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Check Status Button for Customers */}
          <button
            onClick={onOpenLookup}
            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Ticket className="w-4 h-4 text-blue-600 shrink-0" />
            <span>เช็คสถานะการจอง</span>
          </button>

          {/* Language Switch Pill */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-3 py-1 text-xs font-bold border border-slate-200 transition"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentLang}</span>
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-2xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition ${
                      currentLang === lang.code
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {currentLang === lang.code && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
