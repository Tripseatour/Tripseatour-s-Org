import React from 'react';
import { Star, Clock, MapPin, CheckCircle, QrCode, ArrowRight, Calendar, ShoppingCart, Check } from 'lucide-react';
import { Tour, Language } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import { translations } from '../data/translations';

interface TourCardProps {
  tour: Tour;
  currentLang: Language;
  currentCurrency?: Currency;
  isInCart?: boolean;
  onSelectTour: (tour: Tour) => void;
  onBookNow: (tour: Tour) => void;
  onAddToCart?: (tour: Tour) => void;
  onViewItinerary?: (tour: Tour) => void;
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  currentLang,
  currentCurrency = 'THB',
  isInCart = false,
  onSelectTour,
  onBookNow,
  onAddToCart,
  onViewItinerary,
}) => {
  const t = translations[currentLang];

  const title = tour.title[currentLang] || tour.title.TH;
  const description = tour.description[currentLang] || tour.description.TH;
  const duration = tour.duration[currentLang] || tour.duration.TH;
  const highlights = tour.highlights[currentLang] || tour.highlights.TH;

  return (
    <div className="group bg-white rounded-2xl border border-sky-100/80 hover:border-cyan-300 shadow-sm hover:shadow-xl hover:shadow-cyan-900/10 transition-all duration-300 flex flex-col justify-between overflow-hidden hover:-translate-y-1">
      {/* Tour Image & Badges */}
      <div>
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
          <img
            src={tour.images[0]}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-950/85 via-slate-900/25 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <span className="bg-gradient-to-r from-cyan-600 to-sky-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-cyan-400/40 shadow-sm uppercase tracking-wider">
              {tour.categoryLabel[currentLang] || tour.categoryLabel.TH}
            </span>
            {tour.originalPriceAdult && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
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
            <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium border border-cyan-500/20">
              <Clock className="w-3 h-3 text-cyan-300" />
              {duration.split('(')[0]}
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium border border-cyan-500/20">
              <MapPin className="w-3 h-3 text-cyan-400" />
              {tour.location.split(',')[0]}
            </span>
          </div>
        </div>

        {/* Tour Content */}
        <div className="p-5">
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-cyan-600 transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            {description}
          </p>

          {/* Highlights bullets */}
          <div className="space-y-1.5 mb-3">
            {highlights.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-sky-100 flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.from}</span>
              <div className="flex items-baseline gap-1.5">
                {tour.originalPriceAdult && (
                  <span className="text-xs text-slate-400 line-through font-medium">
                    {formatPrice(tour.originalPriceAdult, currentCurrency as Currency)}
                  </span>
                )}
                <span className="text-2xl font-black text-sky-950">
                  {formatPrice(tour.priceAdult, currentCurrency as Currency)}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">/{t.adult}</span>
                {currentCurrency !== 'THB' && (
                  <span className="text-[10px] text-slate-400 ml-1">
                    (฿{tour.priceAdult.toLocaleString()})
                  </span>
                )}
              </div>
            </div>

            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-900 bg-cyan-50 border border-cyan-200/80 px-2.5 py-1 rounded-lg">
              <QrCode className="w-3.5 h-3.5 text-cyan-600" />
              <span>PromptPay</span>
            </div>
          </div>

          {/* Itinerary Schedule Quick Button */}
          <button
            onClick={() => onViewItinerary ? onViewItinerary(tour) : onSelectTour(tour)}
            className="w-full bg-gradient-to-r from-sky-50 to-cyan-50 hover:from-sky-100 hover:to-cyan-100 text-cyan-950 font-bold py-2 px-3 rounded-xl text-xs transition border border-cyan-200/80 flex items-center justify-center gap-1.5 shadow-xs active:scale-98 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span>{t.viewItineraryTimeline || '📅 View Itinerary'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectTour(tour)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-2 rounded-xl text-xs transition text-center"
            >
              {t.viewDetails}
            </button>
            <button
              onClick={() => onAddToCart && onAddToCart(tour)}
              className={`w-full font-bold py-2.5 px-2 rounded-xl text-xs transition text-center flex items-center justify-center gap-1 border active:scale-95 ${
                isInCart
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-extrabold'
                  : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-900'
              }`}
            >
              {isInCart ? <Check className="w-3.5 h-3.5 text-cyan-600" /> : <ShoppingCart className="w-3.5 h-3.5 text-cyan-600" />}
              <span>{isInCart ? t.addedToCart : t.addToCart}</span>
            </button>
          </div>

          <button
            onClick={() => onBookNow(tour)}
            className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition shadow-md shadow-cyan-500/25 text-center flex items-center justify-center gap-1 active:scale-95"
          >
            <span>{t.bookNow}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
