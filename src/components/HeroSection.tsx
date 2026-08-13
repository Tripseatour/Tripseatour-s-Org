import React from 'react';
import { Search, Sparkles, QrCode, Anchor, Compass, Sun, MapPin } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/translations';

interface HeroSectionProps {
  currentLang: Language;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  currentLang,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onExploreClick,
}) => {
  const t = translations[currentLang];

  const categories = [
    { id: 'all', label: t.allCategories, icon: Compass },
    { id: 'island', label: t.islandTours, icon: Anchor },
    { id: 'sunset', label: t.sunsetCruises, icon: Sun },
    { id: 'yacht', label: t.luxuryYacht, icon: Sparkles },
    { id: 'eco', label: t.ecoWildlife, icon: MapPin },
    { id: 'sightseeing', label: t.sightseeing, icon: Compass },
  ];

  const quickTags = ['พีพี (Phi Phi)', 'เจมส์บอนด์ (James Bond)', 'สิมิลัน (Similan)', 'เรือยอชท์คาทามารัน'];

  return (
    <div className="relative bg-slate-900 text-white overflow-hidden pb-12 pt-8 sm:pt-12 border-b border-slate-800">
      {/* Background Tropical Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center mix-blend-luminosity scale-105 transform hover:scale-100 transition-transform duration-1000"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/90" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Title & Tagline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
          {currentLang === 'TH' ? (
            <>
              จองทัวร์เที่ยวเกาะภูเก็ต
            </>
          ) : (
            <>
              Phuket Island Tours <span className="text-blue-500">Direct Booking</span>
            </>
          )}
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 mb-8 leading-relaxed font-medium">
          {t.tagline}
        </p>

        {/* Search Bar Container */}
        <div className="max-w-3xl mx-auto bg-slate-800/90 border border-slate-700/80 p-2 sm:p-3 rounded-2xl shadow-2xl backdrop-blur-md mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-400 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 shrink-0 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>{t.searchPlaceholder.slice(0, 8)}...</span>
            </button>
          </div>

          {/* Quick Tag Pills */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 mr-1">คำค้นฮิต:</span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSearchChange(tag.split(' ')[0])}
                className="bg-slate-700/50 hover:bg-slate-700 text-blue-300 px-2.5 py-1 rounded-lg text-[11px] transition border border-slate-600/50 font-medium"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="max-w-5xl mx-auto flex items-center justify-center flex-wrap gap-2 pt-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
