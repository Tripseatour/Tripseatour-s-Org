import React, { useState } from 'react';
import { X, Star, Clock, MapPin, CheckCircle, XCircle, Calendar, ShieldCheck, QrCode, ArrowRight, UserCheck } from 'lucide-react';
import { Tour, Language, Review } from '../types';
import { translations } from '../data/translations';

interface TourDetailModalProps {
  tour: Tour | null;
  currentLang: Language;
  onClose: () => void;
  onBookNow: (tour: Tour) => void;
  reviews: Review[];
}

export const TourDetailModal: React.FC<TourDetailModalProps> = ({
  tour,
  currentLang,
  onClose,
  onBookNow,
  reviews,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!tour) return null;

  const t = translations[currentLang];

  const title = tour.title[currentLang] || tour.title.TH;
  const description = tour.description[currentLang] || tour.description.TH;
  const duration = tour.duration[currentLang] || tour.duration.TH;
  const highlights = tour.highlights[currentLang] || tour.highlights.TH;
  const included = tour.included[currentLang] || tour.included.TH;

  const tourReviews = reviews.filter(r => r.tourId === tour.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <span className="text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-full">
              {tour.categoryLabel[currentLang] || tour.categoryLabel.TH}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 line-clamp-1">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 shadow-inner relative">
              <img
                src={tour.images[activeImageIndex] || tour.images[0]}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{tour.rating} ({tour.reviewCount} {t.reviews})</span>
              </div>
            </div>

            {/* Thumbnail Selectors */}
            {tour.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tour.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      activeImageIndex === idx ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key Facts Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-cyan-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">{t.duration}</span>
                <span className="font-bold text-slate-800 text-xs">{duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">{t.location}</span>
                <span className="font-bold text-slate-800 text-xs">{tour.location}</span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">{t.pickupIncluded}</span>
                <span className="font-bold text-emerald-700 text-xs">โซนหลักภูเก็ต ฟรี!</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-2">รายละเอียดโปรแกรมทัวร์</h3>
            <p className="text-slate-600 leading-relaxed">{description}</p>
          </div>

          {/* Highlights */}
          <div className="bg-cyan-50/50 border border-cyan-100 p-4 rounded-2xl">
            <h4 className="font-bold text-cyan-900 text-sm mb-2.5">จุดเด่นไฮไลท์ที่ไม่ควรพลาด</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {highlights.map((hl, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-cyan-800">
                  <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-2.5">{t.includedItems}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {included.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Itinerary Timeline */}
          {tour.itinerary && tour.itinerary.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-3">{t.itineraryTimeline}</h3>
              <div className="relative border-l-2 border-cyan-200 ml-3 space-y-4 pl-4 py-1">
                {tour.itinerary.map((step, idx) => {
                  const stepTitle = step.title[currentLang] || step.title.TH;
                  const stepDesc = step.description ? (step.description[currentLang] || step.description.TH) : '';
                  return (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-4 ring-white" />
                      <div className="font-bold text-xs text-cyan-700">{step.time}</div>
                      <div className="font-semibold text-slate-800 text-sm">{stepTitle}</div>
                      {stepDesc && <div className="text-xs text-slate-500 mt-0.5">{stepDesc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pickup Zones */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs">โซนโรงแรมที่มีบริการรถรับ-ส่งฟรี:</h4>
            <div className="flex flex-wrap gap-1.5">
              {tour.pickupAreas.map((zone) => (
                <span key={zone} className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                  📍 {zone}
                </span>
              ))}
            </div>
          </div>

          {/* Tour Reviews inside modal */}
          {tourReviews.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-3">รีวิวจากผู้ใช้บริการจริง ({tourReviews.length})</h3>
              <div className="space-y-3">
                {tourReviews.map((rev) => (
                  <div key={rev.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{rev.userName}</span>
                        {rev.verifiedBooking && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                            <UserCheck className="w-3 h-3" />
                            {t.verifiedBooking}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{rev.comment}</p>
                    {rev.adminReply && (
                      <div className="mt-2 bg-white p-2 rounded-xl text-[11px] border border-cyan-100 text-slate-700">
                        <span className="font-bold text-cyan-700">ตอบกลับจากแอดมิน:</span> {rev.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Booking Sticky Bar */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] text-slate-400 block">{t.priceSummary} ({t.adult})</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-cyan-400">
                ฿{tour.priceAdult.toLocaleString()}
              </span>
              <span className="text-xs text-slate-300">/ {t.adult}</span>
              <span className="text-xs text-slate-400 ml-2">(เด็ก ฿{tour.priceChild.toLocaleString()})</span>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onBookNow(tour);
            }}
            className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-2xl text-sm transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <span>{t.bookNow}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
