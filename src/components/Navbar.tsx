import React, { useState } from 'react';
import { Compass, Globe, ShieldCheck, Phone, Ticket, Check, Menu, X, Home, BookOpen, User, Sparkles, ShoppingCart } from 'lucide-react';
import { Language } from '../types';
import { Currency } from '../utils/currency';
import { CurrencySelector } from './CurrencySelector';
import { translations } from '../data/translations';
import tripSeaLogo from '../assets/images/trip_sea_tour_logo_1786613886795.jpg';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onNavigate: (view: 'home' | 'how-to-book' | 'about-me' | 'admin') => void;
  activeView: string;
  onOpenLookup: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
  promptPayId?: string;
  isAdminAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  currentCurrency,
  onCurrencyChange,
  onNavigate,
  activeView,
  onOpenLookup,
  cartCount = 0,
  onOpenCart,
  isAdminAuthenticated = false
}) => {
  const t = translations[currentLang];
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'TH', label: 'TH', flag: '🇹🇭' },
    { code: 'EN', label: 'EN', flag: '🇬🇧' },
    { code: 'ZH', label: 'CN', flag: '🇨🇳' },
    { code: 'RU', label: 'RU', flag: '🇷🇺' }
  ];

  const handleNavClick = (view: 'home' | 'how-to-book' | 'about-me' | 'admin') => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-slate-300 px-3 sm:px-4 py-1.5 text-xs font-medium border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-teal-400 font-bold text-[10.5px] sm:text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{t.bestServiceGuarantee}</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 text-xs">
              ⚡ {t.instantConfirmation}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 text-[11px]">
            <a
              href="tel:+66626816494"
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition font-medium"
            >
              <Phone className="w-3 h-3 text-teal-400" />
              <span>062-681-6494</span>
            </a>
            <span className="text-slate-700">|</span>
            <button
              onClick={onOpenLookup}
              className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-bold"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>{t.checkStatus}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <img
            src={tripSeaLogo}
            alt="TRIP SEA Tour Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-slate-300 shadow-xs group-hover:scale-105 transition"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-1 leading-tight">
              TRIP SEA <span className="text-teal-600">TOUR</span>
            </span>
            <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 hidden sm:block">
              PHUKET ISLAND HOPPING & PROMPTPAY QR
            </p>
          </div>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'home'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.home}</span>
          </button>
          <button
            onClick={() => handleNavClick('how-to-book')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'how-to-book'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.howToBook}</span>
          </button>
          <button
            onClick={() => handleNavClick('about-me')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'about-me'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.aboutMe}</span>
          </button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black transition shadow-xs active:scale-95 border border-slate-700"
            title="ดูตะกร้าสินค้า"
          >
            <ShoppingCart className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="hidden sm:inline">{t.cart}</span>
            {cartCount > 0 && (
              <span className="bg-teal-400 text-slate-950 font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Currency Switcher */}
          <CurrencySelector
            currentCurrency={currentCurrency}
            onCurrencyChange={onCurrencyChange}
          />

          {/* Prominent Check Status Button for Customers (Desktop) */}
          <button
            onClick={onOpenLookup}
            className="hidden sm:inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
          >
            <Ticket className="w-4 h-4 text-teal-600 shrink-0" />
            <span>เช็คตั๋ว</span>
          </button>

          {/* Language Switch Pill */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold border border-slate-200 transition"
            >
              <Globe className="w-3.5 h-3.5 text-teal-600" />
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
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {currentLang === lang.code && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center justify-center ml-0.5"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Dedicated Mobile Navigation Sub-Bar (Always visible on mobile screens) */}
      <div className="md:hidden bg-slate-100/90 border-t border-slate-200/90 px-1.5 py-1.5">
        <nav className="grid grid-cols-5 gap-1">
          <button
            onClick={() => handleNavClick('home')}
            className={`py-2 px-0.5 rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
              activeView === 'home'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/70'
            }`}
          >
            <Home className={`w-3.5 h-3.5 ${activeView === 'home' ? 'text-teal-200' : 'text-slate-500'}`} />
            <span className="truncate w-full text-center leading-none">{t.home}</span>
          </button>

          <button
            onClick={() => handleNavClick('how-to-book')}
            className={`py-2 px-0.5 rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
              activeView === 'how-to-book'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/70'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${activeView === 'how-to-book' ? 'text-teal-200' : 'text-slate-500'}`} />
            <span className="truncate w-full text-center leading-none">{t.howToBook}</span>
          </button>

          <button
            onClick={() => handleNavClick('about-me')}
            className={`py-2 px-0.5 rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
              activeView === 'about-me'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/70'
            }`}
          >
            <User className={`w-3.5 h-3.5 ${activeView === 'about-me' ? 'text-teal-200' : 'text-slate-500'}`} />
            <span className="truncate w-full text-center leading-none">{t.aboutMe}</span>
          </button>

          <button
            onClick={() => {
              if (onOpenCart) onOpenCart();
              setIsMobileMenuOpen(false);
            }}
            className="relative py-2 px-0.5 rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center gap-0.5 bg-slate-900 text-white hover:bg-slate-800 transition active:scale-95"
          >
            <div className="relative">
              <ShoppingCart className="w-3.5 h-3.5 text-teal-400" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-teal-400 text-slate-950 font-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="truncate w-full text-center leading-none">{t.cart}</span>
          </button>

          <button
            onClick={() => {
              onOpenLookup();
              setIsMobileMenuOpen(false);
            }}
            className="py-2 px-0.5 rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center gap-0.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition active:scale-95"
          >
            <Ticket className="w-3.5 h-3.5 text-teal-600" />
            <span className="truncate w-full text-center leading-none">เช็คตั๋ว</span>
          </button>
        </nav>
      </div>

      {/* Expanded Mobile Menu Drawer (When hamburger is tapped) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-xl px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <button
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition ${
                activeView === 'home'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-teal-600" />
                <span>{t.home} (หน้าแรก)</span>
              </span>
              {activeView === 'home' && <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-mono">ACTIVE</span>}
            </button>

            <button
              onClick={() => handleNavClick('how-to-book')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition ${
                activeView === 'how-to-book'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>{t.howToBook} (วิธีการจอง & ชำระเงิน)</span>
              </span>
              {activeView === 'how-to-book' && <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-mono">ACTIVE</span>}
            </button>

            <button
              onClick={() => handleNavClick('about-me')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition ${
                activeView === 'about-me'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-teal-600" />
                <span>{t.aboutMe} (เกี่ยวกับเรา & ใบอนุญาต ททท.)</span>
              </span>
              {activeView === 'about-me' && <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-mono">ACTIVE</span>}
            </button>

            <button
              onClick={() => {
                if (onOpenCart) onOpenCart();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition text-slate-700 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4 text-teal-600" />
                <span>{t.cart} (ตะกร้าจองทัวร์)</span>
              </span>
              {cartCount > 0 && (
                <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                  {cartCount} ทริป
                </span>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <a
              href="tel:+66626816494"
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              <span>โทร 062-681-6494</span>
            </a>

            <button
              onClick={() => {
                onOpenLookup();
                setIsMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>ค้นหาตั๋วของฉัน</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
