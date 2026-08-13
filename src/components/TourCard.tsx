import React from 'react';
import { Star, Clock, MapPin, CheckCircle, QrCode, ArrowRight, Calendar } from 'lucide-react';
import { Tour, Language } from '../types';
import { translations } from '../data/translations';

interface TourCardProps {
  tour: Tour;
  currentLang: Language;
  onSelectTour: (tour: Tour) => void;
  onBookNow: (tour: Tour) => void;
  onViewItinerary?: (tour: Tour) => void;
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  currentLang,
  onSelectTour,
  onBookNow,
  onViewItinerary,
}) => {
  const t = translations[currentLang];

  const title = tour.title[currentLang] || tour.title.TH;
  const description = tour.description[currentLang] || tour.description.TH;
  const duration = tour.duration[currentLang] || tour.duration.TH;
  const highlights = tour.highlights[currentLang] || tour.highlights.TH;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Tour Image & Badges */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={tour.images[0]}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="bg-slate-900/90 text-blue-400 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-blue-500/30 uppercase tracking-wider">
            {tour.categoryLabel[currentLang] || tour.categoryLabel.TH}
          </span>
          {tour.originalPriceAdult && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
              {Math.round(((tour.originalPriceAdult - tour.priceAdult) / tour.originalPriceAdult) * 100)}% OFF
            </span>
          )}
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 text-slate-800 text-xs font-bold z-10 border border-slate-100">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{tour.rating}</span>
          <span className="text-[10px] text-slate-500 font-normal">({tour.reviewCount})</span>
        </div>

        {/* Location & Duration on Image bottom */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs z-10">
          <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium">
            <Clock className="w-3 h-3 text-blue-400" />
            {duration.split('(')[0]}
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium">
            <MapPin className="w-3 h-3 text-green-400" />
            {tour.location.split(',')[0]}
          </span>
        </div>
      </div>

      {/* Tour Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            {description}
          </p>

          {/* Highlights bullets */}
          <div className="space-y-1.5 mb-3">
            {highlights.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.from}</span>
              <div className="flex items-baseline gap-1.5">
                {tour.originalPriceAdult && (
                  <span className="text-xs text-slate-400 line-through font-medium">
                    ฿{tour.originalPriceAdult.toLocaleString()}
                  </span>
                )}
                <span className="text-2xl font-black text-slate-900">
                  ฿{tour.priceAdult.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">/{t.adult}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>PromptPay</span>
            </div>
          </div>

          {/* Itinerary Schedule Quick Button */}
          <button
            onClick={() => onViewItinerary ? onViewItinerary(tour) : onSelectTour(tour)}
            className="w-full bg-cyan-50 hover:bg-cyan-100/80 text-cyan-800 font-bold py-2 px-3 rounded-xl text-xs transition border border-cyan-200/80 flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span>📅 คลิกดูตารางการเดินทาง (Itinerary Timeline)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectTour(tour)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs transition text-center"
            >
              {t.viewDetails}
            </button>
            <button
              onClick={() => onBookNow(tour)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-md shadow-blue-200 text-center flex items-center justify-center gap-1 active:scale-95"
            >
              <span>{t.bookNow}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
