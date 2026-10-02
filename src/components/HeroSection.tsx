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

  const quickTags = currentLang === 'TH' 
    ? ['พีพี (Phi Phi)', 'เจมส์บอนด์ (James Bond)', 'สิมิลัน (Similan)', 'เรือยอชท์คาทามารัน']
    : currentLang === 'ZH'
    ? ['皮皮岛 (Phi Phi)', '007岛 (James Bond)', '斯米兰 (Similan)', '双体日落帆船']
    : currentLang === 'RU'
    ? ['Пхи-Пхи (Phi Phi)', 'Джеймс Бонд', 'Симиланы', 'Закатная яхта']
    : ['Phi Phi Islands', 'James Bond Island', 'Similan Islands', 'Sunset Catamaran'];

  return (
    <div className="relative bg-gradient-to-b from-sky-950 via-cyan-950 to-slate-900 text-white overflow-hidden pb-14 pt-8 sm:pt-14 border-b border-cyan-800/40">
      {/* Background Tropical Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-25 bg-cover bg-center mix-blend-overlay scale-105 transform hover:scale-100 transition-transform duration-1000"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      
      {/* Tropical Ocean Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-950/90 via-cyan-950/95 to-slate-900" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Title & Tagline */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 border border-cyan-400/30 text-cyan-200 px-3.5 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{t.heroDirectBadge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
          {currentLang === 'TH' ? (
            <>
              จองทัวร์เที่ยวเกาะ <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-300 bg-clip-text text-transparent">ทะเลภูเก็ต</span>
            </>
          ) : currentLang === 'ZH' ? (
            <>
              预订海岛一日游 <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-300 bg-clip-text text-transparent">普吉直营</span>
            </>
          ) : currentLang === 'RU' ? (
            <>
              Морские Экскурсии <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-300 bg-clip-text text-transparent">Пхукет</span>
            </>
          ) : (
            <>
              Phuket Island Tours <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-300 bg-clip-text text-transparent">Direct Booking</span>
            </>
          )}
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-cyan-100/90 mb-8 leading-relaxed font-medium">
          {t.tagline}
        </p>

        {/* Search Bar Container */}
        <div className="max-w-3xl mx-auto bg-slate-900/90 border border-cyan-500/40 p-2 sm:p-3 rounded-2xl shadow-2xl shadow-cyan-950/80 backdrop-blur-md mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex-1">
              <Search className="w-5 h-5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-slate-950/90 border border-cyan-900/80 text-white placeholder-slate-400 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
              />
            </div>
            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-500/30 shrink-0 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{t.searchTourButton || 'Search'}</span>
            </button>
          </div>

          {/* Quick Tag Pills */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300 mr-1">{t.popularSearch}</span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSearchChange(tag.split(' ')[0])}
                className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 px-2.5 py-1 rounded-lg text-[11px] transition border border-cyan-700/50 font-medium"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white border border-cyan-300/40 shadow-md shadow-cyan-500/30 scale-105'
                    : 'bg-slate-900/80 text-cyan-100/80 hover:text-white hover:bg-cyan-950/80 border border-cyan-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-cyan-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
