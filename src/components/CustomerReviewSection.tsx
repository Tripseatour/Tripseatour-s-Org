import React, { useState } from 'react';
import { Star, UserCheck, MessageSquare, Plus, ThumbsUp, Check, ShieldCheck } from 'lucide-react';
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

  const [tourId, setTourId] = useState(tours[0]?.id || 'tour-1');
  const [userName, setUserName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

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
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{avgRating} / 5.0 Rating จากลูกค้า {reviews.length} ท่าน</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.customerReviews}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              เสียงจากผู้ใช้บริการจริงที่จองทัวร์และเดินทางกับ Trip Sea Tour Phuket
            </p>
          </div>

          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-200 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t.writeReview}</span>
          </button>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => {
            const tour = tours.find(t => t.id === rev.tourId);
            return (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs">
                        {rev.userName.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{rev.userName}</h4>
                        <span className="text-[10px] text-slate-400 block">{rev.date}</span>
                      </div>
                    </div>

                    <div className="flex text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
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
                    <div className="flex gap-2 pt-1">
                      {rev.photos.map((p, idx) => (
                        <img
                          key={idx}
                          src={p}
                          alt="Review photo"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Reply */}
                {rev.adminReply && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-[11px] text-slate-700 space-y-1">
                    <span className="font-bold text-blue-800 block">💬 การตอบกลับจากแอดมิน:</span>
                    <p>{rev.adminReply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

              <div>
                <label className="font-bold text-slate-700 block mb-1">ให้คะแนนประสบการณ์ (1-5 ดาว)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-xl border font-bold transition ${
                        rating >= star ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
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
