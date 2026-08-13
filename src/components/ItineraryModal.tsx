import React from 'react';
import { X, Clock, MapPin, Calendar, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Tour, Language } from '../types';
import { translations } from '../data/translations';

interface ItineraryModalProps {
  tour: Tour | null;
  currentLang: Language;
  onClose: () => void;
  onBookNow: (tour: Tour) => void;
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({
  tour,
  currentLang,
  onClose,
  onBookNow,
}) => {
  if (!tour) return null;

  const t = translations[currentLang];
  const title = tour.title[currentLang] || tour.title.TH;
  const duration = tour.duration[currentLang] || tour.duration.TH;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full border border-slate-700 shadow-2xl overflow-hidden my-auto relative">
        {/* Modal Header */}
        <div className="relative h-44 sm:h-52 overflow-hidden bg-slate-800">
          <img
            src={tour.images[0]}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-slate-950/70 hover:bg-slate-900 text-white rounded-full flex items-center justify-center transition border border-slate-700/80 z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title Banner */}
          <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>ตารางการเดินทางแบบละเอียด (ITINERARY)</span>
            </span>
            <h3 className="text-base sm:text-xl font-extrabold text-white leading-snug line-clamp-1">
              {title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{duration}</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>{tour.location}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="p-5 max-h-[55vh] overflow-y-auto space-y-5 text-xs">
          {tour.itinerary && tour.itinerary.length > 0 ? (
            <div className="relative border-l-2 border-cyan-500/40 ml-3 space-y-5 pl-5 py-1">
              {tour.itinerary.map((step, idx) => {
                const stepTitle = step.title[currentLang] || step.title.TH;
                const stepDesc = step.description ? (step.description[currentLang] || step.description.TH) : '';
                return (
                  <div key={idx} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-4 ring-slate-900 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl space-y-1 hover:border-cyan-500/50 transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-block bg-cyan-900/80 text-cyan-300 border border-cyan-700/80 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold">
                          ⏰ {step.time}
                        </span>
                        <span className="text-[10px] text-slate-400">ช่วงที่ {idx + 1}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white pt-1">{stepTitle}</h4>
                      {stepDesc && (
                        <p className="text-slate-300 leading-relaxed text-xs">{stepDesc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p>ไม่มีข้อมูลตารางเวลาสำหรับทัวร์นี้</p>
            </div>
          )}

          {/* Pickup Note Box */}
          <div className="bg-slate-800/60 border border-slate-700 p-3.5 rounded-2xl space-y-1">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>หมายเหตุการรับส่งโรงแรม:</span>
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              * เวลาการรับส่งโรงแรมขึ้นอยู่กับโซนที่พัก รถตู้จะไปรับถึงหน้าล็อบบี้โรงแรมฟรีในเขต หาดป่าตอง, หาดกะตะ, หาดกะรอน และ ตัวเมืองภูเก็ต
            </p>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 block">ราคาเริ่มต้น</span>
            <span className="text-lg font-black text-cyan-400">฿{tour.priceAdult.toLocaleString()}</span>
            <span className="text-xs text-slate-400"> / ท่าน</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={() => {
                onClose();
                onBookNow(tour);
              }}
              className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <span>จองทัวร์นี้ทันที</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
