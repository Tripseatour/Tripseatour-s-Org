import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { Currency, CURRENCIES } from '../utils/currency';

interface CurrencySelectorProps {
  currentCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  className?: string;
  isCompact?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currentCurrency,
  onCurrencyChange,
  className = '',
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCurrency = CURRENCIES[currentCurrency] || CURRENCIES.THB;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        id="currency-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700 bg-white/90 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg shadow-sm transition-all duration-150 focus:outline-none"
        title="เปลี่ยนสกุลเงิน / Change Currency"
      >
        <span className="text-sm">{activeCurrency.flag}</span>
        <span className="font-bold tracking-tight">{activeCurrency.code}</span>
        {!isCompact && <span className="text-slate-400 font-normal">({activeCurrency.symbol})</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Globe className="w-3 h-3 text-teal-600" />
            <span>เลือกสกุลเงิน / Currency</span>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {Object.values(CURRENCIES).map((curr) => {
              const isSelected = curr.code === currentCurrency;
              return (
                <button
                  key={curr.code}
                  id={`currency-opt-${curr.code.toLowerCase()}`}
                  type="button"
                  onClick={() => {
                    onCurrencyChange(curr.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    isSelected ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{curr.flag}</span>
                    <div>
                      <span className="font-semibold">{curr.code}</span>
                      <span className="text-slate-400 text-[11px] ml-1">({curr.symbol})</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            * อัตราแลกเปลี่ยนโดยประมาณ
          </div>
        </div>
      )}
    </div>
  );
};
