import React, { useState, useRef } from 'react';
import { Star, MessageSquare, Plus, ShieldCheck, Camera, X, Image as ImageIcon, UploadCloud, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { Review, Language, Tour } from '../types';
import { translations } from '../data/translations';

interface CustomerReviewSectionProps {
  currentLang: Language;
  reviews: Review[];
  tours: Tour[];
  onAddReview: (reviewData: { tourId: string; userName: string; rating: number; comment: string; photo?: string; photos?: string[] }) => void;
}

export const CustomerReviewSection: React.FC<CustomerReviewSectionProps> = ({
  currentLang,
  reviews,
  tours,
  onAddReview,
}) => {
  const t = translations[currentLang];
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [tourId, setTourId] = useState(tours[0]?.id || 'tour-1');
  const [userName, setUserName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image before saving to state (resize to max 1200px and compress to JPEG)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const maxDim = 1200;
          let width = image.width;
          let height = image.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(dataUrl);
          } else {
            resolve(readerEvent.target?.result as string);
          }
        };
        image.onerror = reject;
        image.src = readerEvent.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingImage(true);

    try {
      const maxAllowed = 4 - uploadedPhotos.length;
      if (maxAllowed <= 0) {
        alert('สามารถอัปโหลดรูปภาพได้สูงสุด 4 รูปต่อหนึ่งรีวิวครับ');
        setIsProcessingImage(false);
        return;
      }

      const filesToProcess = Array.from(files).slice(0, maxAllowed);
      const newImages: string[] = [];

      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file);
        newImages.push(compressed);
      }

      setUploadedPhotos((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error('Error processing photos:', err);
      alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddCustomUrl = () => {
    if (!customPhotoUrl.trim()) return;
    if (uploadedPhotos.length >= 4) {
      alert('สามารถใส่รูปภาพได้สูงสุด 4 รูปต่อหนึ่งรีวิวครับ');
      return;
    }
    setUploadedPhotos((prev) => [...prev, customPhotoUrl.trim()]);
    setCustomPhotoUrl('');
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setUploadedPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !comment.trim()) {
      alert('กรุณากรอกชื่อและข้อความรีวิวให้ครบถ้วนครับ');
      return;
    }

    onAddReview({
      tourId,
      userName: userName.trim(),
      rating,
      comment: comment.trim(),
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
      photo: uploadedPhotos[0] || undefined
    });

    setIsWriteModalOpen(false);
    setUserName('');
    setComment('');
    setUploadedPhotos([]);
    setCustomPhotoUrl('');
    alert('ส่งรีวิวพร้อมรูปถ่ายเรียบร้อยแล้ว ขอบพระคุณมากครับ!');
  };

  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1);

  return (
    <section className="py-12 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
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

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-200 shrink-0 transform active:scale-95"
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
                          className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 relative group/photo hover:ring-2 hover:ring-teal-500 transition shadow-xs"
                        >
                          <img
                            src={p}
                            alt="Customer review photo"
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

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 text-sm font-bold flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full transition"
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

      {/* Write Review & Upload Photos Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsWriteModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{t.writeReview}</h3>
                <p className="text-[11px] text-slate-500">แบ่งปันความประทับใจและรูปภาพจากการเดินทางกับเรา</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Tour Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">เลือกโปรแกรมทัวร์ที่ไปมา *</label>
                <select
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {tours.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title[currentLang] || tr.title.TH}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อหรือนามแฝงของคุณ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมชาย, คุณแนน"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Star Rating */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ให้คะแนนความพึงพอใจ (1-5 ดาว) *
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
                        className={`p-1.5 rounded-xl transition-all duration-200 transform hover:scale-125 active:scale-95 focus:outline-none ${
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

              {/* Comment Field */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">ความเห็นและความประทับใจ *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="บรรยากาศเป็นอย่างไร เรือ ไกด์ การบริการ อาหาร หรือจุดท่องเที่ยวที่ชอบ..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Real Photo Upload Section */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Camera className="w-4 h-4 text-teal-600" />
                    <span>อัปโหลดรูปถ่ายรีวิว (สูงสุด 4 รูป)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold font-mono">
                    {uploadedPhotos.length}/4 รูป
                  </span>
                </div>

                {/* Upload Box / Dropzone */}
                {uploadedPhotos.length < 4 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-teal-500 bg-teal-50/80 scale-[0.99]'
                        : 'border-slate-300 bg-slate-50 hover:bg-teal-50/30 hover:border-teal-400'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />

                    {isProcessingImage ? (
                      <div className="flex items-center gap-2 text-teal-700 py-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-bold text-xs">กำลังประมวลผลรูปภาพ...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-teal-600">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            แตะเพื่อเลือกรูป หรือ ถ่ายภาพจากมือถือ
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            รองรับไฟล์ JPG, PNG, WebP (รูปจะถูกปรับความคมชัดอัตโนมัติ)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Uploaded Photos Thumbnails Preview */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {uploadedPhotos.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 group bg-slate-100 shadow-xs"
                      >
                        <img
                          src={photoUrl}
                          alt={`Uploaded review photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(idx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition shadow-sm"
                          title="ลบรูปนี้"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional: Add via Image Link */}
                <div className="pt-2">
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="หรือวางลิงก์รูปภาพ (URL)..."
                      value={customPhotoUrl}
                      onChange={(e) => setCustomPhotoUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomUrl();
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-[11px] focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomUrl}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[11px] transition shrink-0"
                    >
                      เพิ่มรูป
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isProcessingImage}
                  className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-extrabold py-3.5 rounded-xl transition text-xs shadow-md shadow-teal-100 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ส่งรีวิวและรูปภาพประสบการณ์ของคุณ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

