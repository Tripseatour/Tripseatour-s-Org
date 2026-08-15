import React, { useState } from 'react';
import { Star, UserCheck, MessageSquare, Plus, ThumbsUp, Check, ShieldCheck, Camera, X, Image as ImageIcon } from 'lucide-react';
import { Review, Language, Tour } from '../types';
import { translations } from '../data/translations';

interface CustomerReviewSectionProps {
  currentLang: Language;
  reviews: Review[];
  tours: Tour[];
  onAddReview: (reviewData: { tourId: string; userName: string; rating: number; comment: string; photo?: string }) => void;
}

export const CustomerReviewSection: React.FC<CustomerReviewSectionProps> = ({
  currentLang,
  reviews,
  tours,
  onAddReview,
}) => {
  const t = translations[currentLang];
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [tourId, setTourId] = useState(tours[0]?.id || 'tour-1');
  const [userName, setUserName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Collect all photos from approved reviews
  const allReviewPhotos = reviews
    .filter((r) => r.isApproved !== false && r.photos && r.photos.length > 0)
    .flatMap((r) => (r.photos || []).map((photo) => ({ photo, userName: r.userName, date: r.date, tourId: r.tourId })));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !comment) {
      alert('กรุณากรอกชื่อและข้อความรีวิว');
      return;
    }
    onAddReview({
      tourId,
      userName,
      rating,
      comment,
      photo: photoUrl || undefined
    });
    setIsWriteModalOpen(false);
    setUserName('');
    setComment('');
    setPhotoUrl('');
    alert('ส่งรีวิวเรียบร้อยแล้ว ขอบพระคุณมากครับ!');
  };

  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1);

  return (
    <section className="py-12 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-amber-200/60">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
              <span>{avgRating} / 5.0 Rating จากลูกค้า {reviews.length} ท่าน</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.customerReviews}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              เสียงจากผู้ใช้บริการจริงที่จองทัวร์และเดินทางกับ Trip Sea Tour Phuket
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsGalleryModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition border border-slate-300 shadow-sm shrink-0"
            >
              <Camera className="w-4 h-4 text-teal-600" />
              <span>{currentLang === 'TH' ? 'แกลเลอรีรูปทริปจริง' : 'Real Trip Gallery'}</span>
            </button>

            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-200 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.writeReview}</span>
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews
            .filter((r) => r.isApproved !== false)
            .map((rev) => {
            const tour = tours.find(t => t.id === rev.tourId);
            return (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition group"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shadow-inner">
                        {rev.userName.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{rev.userName}</h4>
                        <span className="text-[10px] text-slate-400 block">{rev.date}</span>
                      </div>
                    </div>

                    {/* Interactive Hover Micro-Animation on Review Stars */}
                    <div className="flex text-amber-400 items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5 fill-amber-400 text-amber-400 transform group-hover:scale-110 transition-transform duration-200 ease-out"
                          style={{ transitionDelay: `${i * 40}ms` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tour title & verified badge */}
                  <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl text-[11px]">
                    <span className="font-semibold text-slate-700 truncate">
                      📍 {tour ? (tour.title[currentLang] || tour.title.TH) : 'ทัวร์ภูเก็ต'}
                    </span>
                    {rev.verifiedBooking && (
                      <span className="shrink-0 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {t.verifiedBooking}
                      </span>
                    )}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{rev.comment}"
                  </p>

                  {/* Attached Photos */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex gap-2 pt-1 overflow-x-auto">
                      {rev.photos.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhoto(p)}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 relative group/photo hover:ring-2 hover:ring-teal-500 transition"
                        >
                          <img
                            src={p}
                            alt="Review photo"
                            className="w-full h-full object-cover group-hover/photo:scale-110 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition flex items-center justify-center text-white">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Reply */}
                {rev.adminReply && (
                  <div className="bg-teal-50/80 border border-teal-100 p-3 rounded-xl text-[11px] text-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 flex items-center gap-1">
                        <span>💬 คำตอบจาก Trip Sea Tour</span>
                      </span>
                      {rev.adminReplyDate && (
                        <span className="text-[10px] text-teal-600">{rev.adminReplyDate}</span>
                      )}
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">{rev.adminReply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Trip Photo Gallery Modal */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {currentLang === 'TH' ? 'แกลเลอรีภาพถ่ายจริงจากผู้ใช้บริการ' : 'Real Customer Photo Gallery'}
                </h3>
              </div>
              <button
                onClick={() => setIsGalleryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allReviewPhotos.map((item, idx) => {
                const tour = tours.find(t => t.id === item.tourId);
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhoto(item.photo)}
                    className="group relative cursor-pointer aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 hover:shadow-lg transition"
                  >
                    <img
                      src={item.photo}
                      alt="Customer trip photo"
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-end text-white text-[10px]">
                      <span className="font-bold truncate">{item.userName}</span>
                      <span className="text-slate-300 text-[9px] truncate">📍 {tour?.title.TH || 'ทัวร์ภูเก็ต'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 text-sm font-bold flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full"
            >
              <X className="w-4 h-4" />
              <span>ปิด (Close)</span>
            </button>
            <img
              src={selectedPhoto}
              alt="Expanded view"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsWriteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-4">{t.writeReview}</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">เลือกโปรแกรมทัวร์</label>
                <select
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                >
                  {tours.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title[currentLang] || tr.title.TH}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อของคุณ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมชาย นามสมมติ"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                />
              </div>

              {/* Interactive Star Rating Selector with Micro Animations */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ให้คะแนนประสบการณ์ (1-5 ดาว)
                </label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className={`p-1.5 rounded-xl transition-all duration-200 transform hover:scale-130 active:scale-95 focus:outline-none ${
                          isFilled
                            ? 'text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-300 hover:text-amber-200'
                        }`}
                        title={`${star} ดาว`}
                      >
                        <Star
                          className={`w-7 h-7 transition-all duration-200 ${
                            isFilled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-extrabold text-amber-600 ml-2 font-mono">
                    {hoverRating !== null ? hoverRating : rating}.0 / 5.0
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ความเห็นและความประทับใจ</label>
                <textarea
                  required
                  rows={3}
                  placeholder="บรรยากาศเป็นอย่างไร การบริการเป็นอย่างไร..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ลิงก์รูปถ่ายประทับใจ (ถ้ามี)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-xs shadow-md shadow-blue-200"
              >
                ส่งรีวิวของคุณ
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
