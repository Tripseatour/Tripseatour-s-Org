import React, { useState } from 'react';
import { X, Star, Clock, MapPin, CheckCircle, XCircle, Calendar, ShieldCheck, QrCode, ArrowRight, UserCheck, ShoppingCart, Check, AlertCircle, MessageCircle } from 'lucide-react';
import { Tour, Language, Review, AppSettings } from '../types';
import { translations } from '../data/translations';
import { getZoneDisplayName, getEffectivePickupZones } from '../utils/pickupZoneHelper';

interface TourDetailModalProps {
  tour: Tour | null;
  currentLang: Language;
  settings?: AppSettings;
  isInCart?: boolean;
  onClose: () => void;
  onBookNow: (tour: Tour) => void;
  onAddToCart?: (tour: Tour) => void;
  reviews: Review[];
}

export const TourDetailModal: React.FC<TourDetailModalProps> = ({
  tour,
  currentLang,
  settings,
  isInCart = false,
  onClose,
  onBookNow,
  onAddToCart,
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

  const effectiveZones = getEffectivePickupZones(tour);
  const freeZones = effectiveZones.filter(z => z.isFree || z.extraFee === 0);
  const paidZones = effectiveZones.filter(z => !z.isFree && z.extraFee > 0);

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
          {(() => {
            const tourImages = (Array.isArray(tour.images) && tour.images.length > 0)
              ? tour.images
              : [(tour as any).image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'];
            const currentImg = tourImages[activeImageIndex] || tourImages[0];
            return (
              <div className="space-y-3">
                <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 shadow-inner relative">
                  <img
                    src={currentImg}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{tour.rating || 4.9} ({tour.reviewCount || 128} {t.reviews})</span>
                  </div>
                </div>

                {/* Thumbnail Selectors */}
                {tourImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {tourImages.map((img, idx) => (
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
            );
          })()}

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
                <span className="font-bold text-emerald-700 text-xs truncate max-w-[200px] block" title={freeZones.map(z => getZoneDisplayName(z, currentLang)).join(', ')}>
                  {freeZones.length > 0
                    ? freeZones.slice(0, 3).map(z => getZoneDisplayName(z, currentLang)).join('/') + (freeZones.length > 3 ? '...' : '')
                    : t.hotelFreeZone}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-2">{t.tourDescriptionHeader}</h3>
            <p className="text-slate-600 leading-relaxed">{description}</p>
          </div>

          {/* Highlights */}
          <div className="bg-cyan-50/50 border border-cyan-100 p-4 rounded-2xl">
            <h4 className="font-bold text-cyan-900 text-sm mb-2.5">{t.tourHighlightsHeader}</h4>
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

          {/* Flexible Date Change & Weather Guarantee Banner */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white p-4 rounded-2xl border border-teal-700/60 shadow-md space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
              <h4 className="font-extrabold text-xs sm:text-sm text-teal-200">
                {currentLang === 'TH' ? 'การันตีจองสบายใจ: เลื่อนวันเดินทางฟรี & คืนเงินเต็มจำนวนกรณีมรสุม' :
                 currentLang === 'EN' ? 'Flexible Booking Guarantee: Free Date Change & 100% Monsoon Refund' :
                 currentLang === 'ZH' ? '灵活预订保障：免费改期 & 恶劣天气100%退款' : 'Гарантия гибкого бронирования: бесплатный перенос'}
              </h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
              {currentLang === 'TH' ? '• ชำระล่วงหน้าก่อนวันเดินทางไม่เกิน 1 วัน\n• เลื่อนวันเดินทางหรือยกเลิกได้ล่วงหน้าก่อนวันเดินทาง 1 วัน ไม่เกินเวลา 18:00 น. (หากเลยกำหนดงดคืนเงินทุกกรณี)\n• กรณีคลื่นลมมรสุมหรือเรือออกไม่ได้เนื่องจากสภาพอากาศ ทางบริษัทคืนเงินเต็มจำนวน 100% หรือเลื่อนวันเดินทางให้ทันที' :
               currentLang === 'EN' ? '• Advance payment required at least 1 day prior to travel date.\n• Reschedule or cancellation permitted up to 1 day prior before 18:00 (No refund past deadline).\n• 100% Full Refund or instant date change if boats cannot depart due to monsoon/severe weather.' :
               currentLang === 'ZH' ? '• 须在出行前至少1天完成预付。\n• 出行前1天 18:00 前可免费改期或取消（超过18:00概不退款）。\n• 如遇恶劣天气/风浪无法出海，100%全额退款或免费改期。' :
               '• Предоплата производится за 1 день до поездки.\n• Перенос или отмена до 18:00 за 1 день до поездки (после 18:00 возврат не производится).\n• 100% возврат средств при cancellation из-за шторма.'}
            </p>
          </div>

          {/* Pickup Zones */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{t.pickupZoneFreeTitle}</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {freeZones.length > 0 ? (
                  freeZones.map((z) => (
                    <span key={z.id || z.zoneName} className="bg-white border border-emerald-300 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <span>📍 {getZoneDisplayName(z, currentLang)}</span>
                      <span className="text-[9.5px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                        {currentLang === 'TH' ? 'ฟรี' : currentLang === 'ZH' ? '免费' : 'Free'}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-xs">-</span>
                )}
              </div>
            </div>

            {paidZones.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80">
                <h5 className="font-bold text-amber-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>
                    {currentLang === 'TH' ? 'พื้นที่นอกโซน (มีค่าบริการรถรับ-ส่งเพิ่มเติม):' :
                     currentLang === 'ZH' ? '跨区域接送 (需另加付接送费):' :
                     currentLang === 'RU' ? 'Дополнительные зоны трансфера (с доплатой):' :
                     'Out-of-zone areas (surcharge applies):'}
                  </span>
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {paidZones.map((z) => (
                    <span key={z.id || z.zoneName} className="bg-amber-50/80 border border-amber-300 text-amber-900 text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <span>📍 {getZoneDisplayName(z, currentLang)}</span>
                      <span className="text-[10px] bg-amber-200/90 text-amber-900 font-extrabold px-1.5 py-0.2 rounded font-mono">
                        +฿{z.extraFee} {currentLang === 'TH' ? '/ท่าน' : currentLang === 'ZH' ? '/人' : '/guest'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tour Reviews inside modal */}
          {tourReviews.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-3">{t.realUserReviews} ({tourReviews.length})</h3>
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
                        <span className="font-bold text-cyan-700">{t.adminReply}</span> {rev.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LINE Boat Seat Availability Warning Banner Before Booking */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50/80 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-slate-800 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-black text-xs sm:text-sm text-amber-950 leading-snug">
                  ⚠️ {t.checkSeatWarningNotice}
                </h4>
                <p className="text-[11px] text-amber-900/85 leading-relaxed">
                  {t.checkSeatSubNotice}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/80">
              <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                <span>LINE Official:</span>
                <span className="font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                  {settings?.lineOaId || '@056hxinu'}
                </span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://line.me/R/ti/p/${settings?.lineOaId || '@056hxinu'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-black px-3.5 py-2 rounded-xl text-xs transition shadow-md active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-white" />
                  <span>{t.addlineToCheckSeats}</span>
                </a>

                <a
                  href={settings?.facebookMessengerUrl || 'https://m.me/tripseatoursphuket'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#0084FF] to-[#00C6FF] hover:opacity-95 text-white font-black px-3.5 py-2 rounded-xl text-xs transition shadow-md active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-white" />
                  <span>{t.chatFacebookToCheckSeats}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Booking Sticky Bar */}
        {(() => {
          const isForeignLang = currentLang !== 'TH';
          const effAdult = isForeignLang && tour.priceForeignAdult ? tour.priceForeignAdult : tour.priceAdult;
          const effChild = isForeignLang && tour.priceForeignChild ? tour.priceForeignChild : tour.priceChild;
          return (
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>{t.priceSummary} ({t.adult})</span>
                  {isForeignLang && (
                    <span className="text-[9.5px] bg-sky-900/80 text-sky-200 border border-sky-500/40 px-1.5 py-0.5 rounded font-bold">
                      🌍 Foreigner Rate
                    </span>
                  )}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-extrabold text-cyan-400">
                    ฿{effAdult.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-300">/ {t.adult}</span>
                  <span className="text-xs text-slate-400 ml-2">({t.child} ฿{effChild.toLocaleString()})</span>
                </div>
              </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddToCart && onAddToCart(tour)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 border active:scale-95 ${
                isInCart
                  ? 'bg-teal-900/80 border-teal-500 text-teal-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
              }`}
            >
              {isInCart ? <Check className="w-4 h-4 text-teal-400" /> : <ShoppingCart className="w-4 h-4 text-teal-400" />}
              <span>{isInCart ? t.addedToCart : t.addToCart}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onBookNow(tour);
              }}
              className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold px-5 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-cyan-500/20 flex items-center gap-2 active:scale-95"
            >
              <span>{t.bookNow}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    })()}
      </div>
    </div>
  );
};
