import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, MoveVertical, Sparkles, CheckCircle2, Eye, EyeOff, MapPin, Loader2, Save } from 'lucide-react';
import { Tour } from '../types';

interface ReorderToursModalProps {
  isOpen: boolean;
  onClose: () => void;
  tours: Tour[];
  onSaveOrder: (reorderedTours: Tour[]) => Promise<boolean | void> | void;
}

export const ReorderToursModal: React.FC<ReorderToursModalProps> = ({
  isOpen,
  onClose,
  tours,
  onSaveOrder,
}) => {
  const [list, setList] = useState<Tour[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Sort copy of tours array by sortOrder if present, else keep original order
      const sorted = [...tours].sort((a, b) => {
        const orderA = a.sortOrder !== undefined ? a.sortOrder : 999;
        const orderB = b.sortOrder !== undefined ? b.sortOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });
      setList(sorted);
      setSaveSuccess(false);
    }
  }, [isOpen, tours]);

  if (!isOpen) return null;

  const handleMove = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (index < 0 || index >= list.length) return;
    const updated = [...list];

    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    } else if (direction === 'top' && index > 0) {
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
    } else if (direction === 'bottom' && index < updated.length - 1) {
      const [item] = updated.splice(index, 1);
      updated.push(item);
    }

    setList(updated);
  };

  const handlePositionChange = (currentIndex: number, newPosition1Based: number) => {
    const targetIdx = Math.max(0, Math.min(list.length - 1, newPosition1Based - 1));
    if (currentIndex === targetIdx) return;

    const updated = [...list];
    const [item] = updated.splice(currentIndex, 1);
    updated.splice(targetIdx, 0, item);
    setList(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Assign sortOrder explicitly to each tour (1, 2, 3...)
      const reordered = list.map((tour, idx) => ({
        ...tour,
        sortOrder: idx + 1
      }));

      await onSaveOrder(reordered);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving reordered tours:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <MoveVertical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>จัดลำดับการแสดงผลโปรแกรมทัวร์ (Tour Display Order)</span>
              </h3>
              <p className="text-xs text-slate-400">
                ลากหรือกดปุ่มลูกศรขึ้น-ลง เพื่อกำหนดลำดับโปรแกรมทัวร์ที่จะแสดงบนหน้าแรกของเว็บไซต์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {saveSuccess && (
          <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 mt-3 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>บันทึกและจัดลำดับโปรแกรมทัวร์หน้าร้านสำเร็จเรียบร้อยแล้ว!</span>
          </div>
        )}

        {/* Scrollable Tour Order List */}
        <div className="my-4 space-y-2.5 overflow-y-auto pr-1 flex-1">
          {list.map((tour, idx) => {
            const isVisible = tour.isVisible !== false && tour.isAvailable !== false;
            const isFirst = idx === 0;
            const isLast = idx === list.length - 1;

            return (
              <div
                key={tour.id || idx}
                className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isVisible
                    ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    : 'bg-rose-950/20 border-rose-900/40 opacity-75'
                }`}
              >
                {/* Left: Position Badge & Thumbnail & Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Position Badge */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black font-mono flex items-center justify-center shadow">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Image Thumbnail */}
                  <div className="w-14 h-11 rounded-lg bg-slate-950 overflow-hidden border border-slate-800 shrink-0 relative">
                    <img
                      src={tour.images && tour.images[0] ? tour.images[0] : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'}
                      alt={tour.title.TH}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Category Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                        {tour.title.TH}
                      </h4>
                      {isVisible ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold shrink-0 hidden sm:inline-block">
                          แสดงบนเว็บ
                        </span>
                      ) : (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-semibold shrink-0 hidden sm:inline-block">
                          ซ่อนไว้
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                      <span className="text-amber-400 font-bold font-mono">฿{tour.priceAdult.toLocaleString()}</span>
                      <span>•</span>
                      <span className="truncate">{tour.categoryLabel?.TH || tour.category}</span>
                      {tour.supplierName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 truncate">🏢 {tour.supplierName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Order Action Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  {/* Direct Position Input Number */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-medium">ลำดับที่:</span>
                    <input
                      type="number"
                      min={1}
                      max={list.length}
                      value={idx + 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) handlePositionChange(idx, val);
                      }}
                      className="w-10 bg-slate-950 border border-slate-700 rounded text-center text-amber-300 font-mono font-bold text-xs p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  {/* Quick Shift Up / Down Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'top')}
                      disabled={isFirst}
                      title="ย้ายไปอยู่บนสุด (อันดับ 1)"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700 transition disabled:opacity-30 disabled:hover:text-slate-300 cursor-pointer"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={isFirst}
                      title="ย้ายขึ้น 1 ลำดับ"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700 transition disabled:opacity-30 disabled:hover:text-slate-300 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={isLast}
                      title="ย้ายลง 1 ลำดับ"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700 transition disabled:opacity-30 disabled:hover:text-slate-300 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'bottom')}
                      disabled={isLast}
                      title="ย้ายไปอยู่ล่างสุด"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700 transition disabled:opacity-30 disabled:hover:text-slate-300 cursor-pointer"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            💡 เมื่อเรียบร้อยแล้ว กดปุ่ม "บันทึกการจัดลำดับทัวร์" ด้านขวาเพื่ออัปเดตหน้าร้าน
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl transition text-xs cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl transition text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>กำลังบันทึกลำดับ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>💾 บันทึกการจัดลำดับทัวร์ ({list.length} รายการ)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
