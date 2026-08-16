import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, CheckSquare, Square, Clock, Sparkles, MapPin, DollarSign, Image as ImageIcon, Calendar, ListChecks } from 'lucide-react';
import { Tour, TourItinerary, Language } from '../types';

interface EditTourModalProps {
  tour: Tour | null; // null = adding new, object = editing existing
  isOpen: boolean;
  onClose: () => void;
  onSave: (tourData: Partial<Tour>) => Promise<void> | void;
}

const COMMON_INCLUDES_TH = [
  'รถตู้รับ-ส่งโรงแรมฟรี (เขตหาดป่าตอง/กะตะ/กะรอน/ตัวเมือง)',
  'อาหารเช้าเบาๆ และ อาหารกลางวันแบบบุฟเฟต์',
  'เสื้อชูชีพ และ อุปกรณ์ดำน้ำตื้น (Snorkel & Mask)',
  'ประกันอุบัติเหตุการเดินทาง คุ้มครองสูงสุด 1,000,000 บาท',
  'ไกด์นำเที่ยวผู้เชี่ยวชาญ คอยดูแลตลอดทริป',
  'รวมค่าธรรมเนียมอุทยานแห่งชาติแล้ว',
  'เครื่องดื่ม ผลไม้สด และน้ำดื่มบริการฟรีตลอดทริป',
  'เรือคายัค / เสื้อชูชีพ และอุปกรณ์ทางน้ำ'
];

export const EditTourModal: React.FC<EditTourModalProps> = ({
  tour,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(tour);

  // Tour Form State
  const [titleTH, setTitleTH] = useState('');
  const [titleEN, setTitleEN] = useState('');
  const [category, setCategory] = useState<'island' | 'sunset' | 'yacht' | 'eco' | 'sightseeing'>('island');
  const [durationTH, setDurationTH] = useState('');
  const [durationEN, setDurationEN] = useState('');
  const [location, setLocation] = useState('');
  const [priceAdult, setPriceAdult] = useState(1500);
  const [priceChild, setPriceChild] = useState(1000);
  const [costAdult, setCostAdult] = useState(1000);
  const [costChild, setCostChild] = useState(650);
  const [originalPriceAdult, setOriginalPriceAdult] = useState(2200);
  const [originalPriceChild, setOriginalPriceChild] = useState(1500);
  const [imageUrl, setImageUrl] = useState('');
  const [descTH, setDescTH] = useState('');
  const [descEN, setDescEN] = useState('');

  // Included Items Checklist State
  const [includedItemsTH, setIncludedItemsTH] = useState<string[]>([]);
  const [customIncludeInput, setCustomIncludeInput] = useState('');

  // Itinerary Steps State
  const [itinerarySteps, setItinerarySteps] = useState<TourItinerary[]>([]);

  // Highlights State
  const [highlightsTH, setHighlightsTH] = useState<string[]>([]);
  const [customHighlightInput, setCustomHighlightInput] = useState('');

  // Load existing tour data if editing
  useEffect(() => {
    if (tour) {
      setTitleTH(tour.title?.TH || '');
      setTitleEN(tour.title?.EN || '');
      setCategory(tour.category || 'island');
      setDurationTH(tour.duration?.TH || 'เต็มวัน (08:00 - 17:00)');
      setDurationEN(tour.duration?.EN || 'Full Day (08:00 - 17:00)');
      setLocation(tour.location || 'ภูเก็ต');
      setPriceAdult(tour.priceAdult || 0);
      setPriceChild(tour.priceChild || 0);
      setCostAdult(tour.costAdult !== undefined ? tour.costAdult : Math.round((tour.priceAdult || 0) * 0.65));
      setCostChild(tour.costChild !== undefined ? tour.costChild : Math.round((tour.priceChild || 0) * 0.65));
      setOriginalPriceAdult(tour.originalPriceAdult || Math.round(tour.priceAdult * 1.3));
      setOriginalPriceChild(tour.originalPriceChild || Math.round(tour.priceChild * 1.3));
      setImageUrl(tour.images && tour.images[0] ? tour.images[0] : '');
      setDescTH(tour.description?.TH || '');
      setDescEN(tour.description?.EN || '');
      setIncludedItemsTH(tour.included?.TH || []);
      setItinerarySteps(tour.itinerary ? JSON.parse(JSON.stringify(tour.itinerary)) : []);
      setHighlightsTH(tour.highlights?.TH || []);
    } else {
      // Default initial state for new tour
      setTitleTH('');
      setTitleEN('');
      setCategory('island');
      setDurationTH('เต็มวัน (08:00 - 17:00)');
      setDurationEN('Full Day (08:00 - 17:00)');
      setLocation('ภูเก็ต / เกาะพีพี');
      setPriceAdult(1500);
      setPriceChild(1000);
      setOriginalPriceAdult(2200);
      setOriginalPriceChild(1500);
      setImageUrl('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1000');
      setDescTH('สัมผัสความงดงามของท้องทะเลอันดามัน พร้อมกิจกรรมดำน้ำและบริการระดับพรีเมียม');
      setDescEN('Experience the beauty of the Andaman sea with snorkeling and premium service.');
      setIncludedItemsTH([
        COMMON_INCLUDES_TH[0],
        COMMON_INCLUDES_TH[1],
        COMMON_INCLUDES_TH[2],
        COMMON_INCLUDES_TH[3],
        COMMON_INCLUDES_TH[4],
        COMMON_INCLUDES_TH[6]
      ]);
      setItinerarySteps([
        {
          time: '07:30 - 08:30',
          title: { TH: 'รถรับจากโรงแรมที่พัก มุ่งสู่ท่าเรือ', EN: 'Hotel pickup and transfer to pier', ZH: '酒店接送', RU: 'Трансфер из отеля' },
          description: { TH: 'เช็คอิน รับอุปกรณ์ดำน้ำ รับประทานอาหารเช้าเบาๆ ชา กาแฟ', EN: 'Check-in, collect snorkeling gear, light breakfast', ZH: '登记并享用早餐', RU: 'Регистрация и легкий завтрак' }
        },
        {
          time: '09:00',
          title: { TH: 'ออกเดินทางมุ่งหน้าสู่เกาะเป้าหมาย', EN: 'Depart from pier to destination island', ZH: '出发前往岛屿', RU: 'Отправление к острову' },
          description: { TH: 'กัปตันและทีมงานแนะนำข้อปฏิบัติเพื่อความปลอดภัย', EN: 'Safety briefing by captain and crew', ZH: '安全讲解', RU: 'Инструктаж по безопасности' }
        },
        {
          time: '12:00',
          title: { TH: 'รับประทานอาหารกลางวันแบบบุฟเฟต์ริมหาด', EN: 'Beachside buffet lunch', ZH: '享用海边自助午餐', RU: 'Обед "шведский стол" на пляже', },
          description: { TH: 'พักผ่อนตามอัธยาศัย ถ่ายรูป พักผ่อนบนหาดทรายขาว', EN: 'Free time for relaxing, photos and swimming', ZH: '自由活动', RU: 'Свободное время' }
        },
        {
          time: '16:30 - 17:30',
          title: { TH: 'เดินทางกลับถึงท่าเรือ และส่งกลับโรงแรมโดยสวัสดิภาพ', EN: 'Return to pier and transfer back to hotel', ZH: '返回码头并送回酒店', RU: 'Возвращение в отель' },
          description: { TH: 'จบทริปด้วยความประทับใจ', EN: 'End of memorable trip', ZH: '行程结束', RU: 'Завершение экскурсии' }
        }
      ]);
      setHighlightsTH(['ดำน้ำชมปะการังน้ำใส', 'ชมหาดทรายขาวละเอียด', 'รับประทานอาหารอร่อยริมทะเล']);
    }
  }, [tour, isOpen]);

  if (!isOpen) return null;

  // Category map labels
  const categoryLabelsMap: Record<string, { TH: string; EN: string }> = {
    island: { TH: 'ทัวร์เกาะ', EN: 'Island Tour' },
    sunset: { TH: 'ล่องเรือยอชท์', EN: 'Sunset Yacht' },
    yacht: { TH: 'เรือยอชท์คาทามารัน', EN: 'Yacht Catamaran' },
    eco: { TH: 'ปางช้าง / เชิงอนุรักษ์', EN: 'Eco & Elephant' },
    sightseeing: { TH: 'เที่ยวเมือง / ซิตี้ทัวร์', EN: 'City Sightseeing' }
  };

  // Toggle included item
  const toggleIncludedItem = (itemStr: string) => {
    if (includedItemsTH.includes(itemStr)) {
      setIncludedItemsTH(includedItemsTH.filter(i => i !== itemStr));
    } else {
      setIncludedItemsTH([...includedItemsTH, itemStr]);
    }
  };

  // Add custom included item
  const handleAddCustomInclude = () => {
    if (!customIncludeInput.trim()) return;
    if (!includedItemsTH.includes(customIncludeInput.trim())) {
      setIncludedItemsTH([...includedItemsTH, customIncludeInput.trim()]);
    }
    setCustomIncludeInput('');
  };

  // Itinerary step management
  const handleAddStep = () => {
    setItinerarySteps([
      ...itinerarySteps,
      {
        time: '14:00',
        title: { TH: 'กิจกรรมช่วงบ่าย', EN: 'Afternoon activity', ZH: '下午活动', RU: 'Дневная программа' },
        description: { TH: 'ดำน้ำจุดที่ 2 หรือ เล่นน้ำพักผ่อน', EN: 'Second snorkeling spot or relaxation', ZH: '第二次浮潜', RU: 'Вторая остановка для снорклинга' }
      }
    ]);
  };

  const handleUpdateStep = (index: number, field: 'time' | 'titleTH' | 'titleEN' | 'descTH' | 'descEN', val: string) => {
    const updated = [...itinerarySteps];
    const curr = updated[index];
    if (field === 'time') {
      curr.time = val;
    } else if (field === 'titleTH') {
      curr.title = { ...curr.title, TH: val, EN: curr.title?.EN || val };
    } else if (field === 'titleEN') {
      curr.title = { ...curr.title, EN: val };
    } else if (field === 'descTH') {
      curr.description = { ...(curr.description || { TH: '', EN: '', ZH: '', RU: '' }), TH: val };
    } else if (field === 'descEN') {
      curr.description = { ...(curr.description || { TH: '', EN: '', ZH: '', RU: '' }), EN: val };
    }
    setItinerarySteps(updated);
  };

  const handleDeleteStep = (index: number) => {
    setItinerarySteps(itinerarySteps.filter((_, i) => i !== index));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === itinerarySteps.length - 1)) return;
    const updated = [...itinerarySteps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setItinerarySteps(updated);
  };

  // Save submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const catLabel = categoryLabelsMap[category] || { TH: 'ทัวร์ภูเก็ต', EN: 'Phuket Tour' };

    const payload: Partial<Tour> = {
      ...(tour ? { id: tour.id, slug: tour.slug } : {}),
      title: { TH: titleTH, EN: titleEN || titleTH, ZH: titleTH, RU: titleTH },
      category,
      categoryLabel: { TH: catLabel.TH, EN: catLabel.EN, ZH: catLabel.EN, RU: catLabel.EN },
      description: { TH: descTH, EN: descEN || descTH, ZH: descTH, RU: descTH },
      duration: { TH: durationTH, EN: durationEN || durationTH, ZH: durationTH, RU: durationTH },
      location,
      priceAdult: Number(priceAdult),
      priceChild: Number(priceChild),
      costAdult: Number(costAdult),
      costChild: Number(costChild),
      originalPriceAdult: Number(originalPriceAdult),
      originalPriceChild: Number(originalPriceChild),
      images: [imageUrl || 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1000'],
      included: {
        TH: includedItemsTH,
        EN: includedItemsTH,
        ZH: includedItemsTH,
        RU: includedItemsTH
      },
      itinerary: itinerarySteps,
      highlights: {
        TH: highlightsTH.length ? highlightsTH : [titleTH],
        EN: highlightsTH.length ? highlightsTH : [titleEN || titleTH],
        ZH: highlightsTH,
        RU: highlightsTH
      },
      pickupAreas: ['หาดป่าตอง', 'หาดกะตะ', 'หาดกะรอน', 'ตัวเมืองภูเก็ต'],
      rating: tour?.rating || 4.9,
      reviewCount: tour?.reviewCount || 35,
      tags: [catLabel.TH, 'ภูเก็ต', 'ดำน้ำ']
    };

    await onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {isEditing ? `แก้ไขโปรแกรมทัวร์: ${tour?.title?.TH}` : 'เพิ่มโปรแกรมทัวร์ใหม่'}
              </h3>
              <p className="text-xs text-slate-400">กำหนดข้อมูล ตารางเวลาเดินทาง และสิ่งที่รวมในราคาทัวร์</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6 text-xs overflow-y-auto pr-1 pt-4 flex-1">
          {/* SECTION 1: Basic Information */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>1. ข้อมูลทั่วไปของโปรแกรมทัวร์</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">ชื่อโปรแกรมทัวร์ (ภาษาไทย) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ทัวร์เกาะพีพี อ่าวมาหยา สปีดโบ๊ท"
                  value={titleTH}
                  onChange={(e) => setTitleTH(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ชื่อโปรแกรมทัวร์ (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  placeholder="e.g. Phi Phi Island Speedboat Day Tour"
                  value={titleEN}
                  onChange={(e) => setTitleEN(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">หมวดหมู่โปรแกรมทัวร์ *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="island">🏝️ ทัวร์เกาะ (Island Tour)</option>
                  <option value="sunset">🌅 ล่องเรือยอชท์ (Sunset Yacht)</option>
                  <option value="yacht">🛥️ เรือยอชท์คาทามารัน (Catamaran)</option>
                  <option value="eco">🐘 ปางช้าง / เชิงอนุรักษ์ (Eco & Elephant)</option>
                  <option value="sightseeing">🏙️ เที่ยวเมือง / ซิตี้ทัวร์ (Sightseeing)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ระยะเวลาเดินทาง (ไทย)</label>
                <input
                  type="text"
                  placeholder="เช่น เต็มวัน (08:00 - 17:00)"
                  value={durationTH}
                  onChange={(e) => setDurationTH(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">สถานที่ท่องเที่ยวหลัก</label>
                <input
                  type="text"
                  placeholder="เช่น ภูเก็ต / เกาะพีพี / อ่าวพังงา"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-emerald-400 block mb-1">ราคาผู้ใหญ่ (THB) *</label>
                <input
                  type="number"
                  required
                  value={priceAdult}
                  onChange={(e) => setPriceAdult(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2.5 text-emerald-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-cyan-400 block mb-1">ราคาเด็ก (THB) *</label>
                <input
                  type="number"
                  required
                  value={priceChild}
                  onChange={(e) => setPriceChild(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl p-2.5 text-cyan-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-amber-400 block mb-1">🏭 ทุนเอเยนต์ ผู้ใหญ่ (Net)</label>
                <input
                  type="number"
                  required
                  value={costAdult}
                  onChange={(e) => setCostAdult(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-amber-400 block mb-1">🏭 ทุนเอเยนต์ เด็ก (Net)</label>
                <input
                  type="number"
                  required
                  value={costChild}
                  onChange={(e) => setCostChild(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">ราคาปกติผู้ใหญ่ (ขีดฆ่า)</label>
                <input
                  type="number"
                  value={originalPriceAdult}
                  onChange={(e) => setOriginalPriceAdult(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">ราคาปกติเด็ก (ขีดฆ่า)</label>
                <input
                  type="number"
                  value={originalPriceChild}
                  onChange={(e) => setOriginalPriceChild(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-400"
                />
              </div>

              <div className="col-span-2 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">กำไรคาดการณ์/ตั๋ว (Estimated Profit):</span>
                <span className="font-extrabold text-emerald-400">
                  ผู้ใหญ่ ฿{(priceAdult - costAdult).toLocaleString()} / เด็ก ฿{(priceChild - costChild).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">รูปภาพหลัก (Image URL)</label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">รายละเอียดทัวร์สังเขป</label>
              <textarea
                rows={2}
                value={descTH}
                onChange={(e) => setDescTH(e.target.value)}
                placeholder="คำอธิบายสั้นๆ ไฮไลท์การท่องเที่ยว..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          {/* SECTION 2: Included Items Checkboxes */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-emerald-400" />
              <span>2. รายการที่รวมในราคาทัวร์แล้ว (Included Items Checkboxes)</span>
            </h4>
            <p className="text-[11px] text-slate-400">ติ๊กเลือกบริการและสิ่งอำนวยความสะดวกที่รวมในแพ็กเกจนี้:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {COMMON_INCLUDES_TH.map((item, idx) => {
                const isChecked = includedItemsTH.includes(item);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIncludedItem(item)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition select-none ${
                      isChecked
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <span className="text-xs font-medium leading-tight">{item}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected items list display */}
            {includedItemsTH.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 block mb-1.5 font-bold">รายการที่รวมแล้วทั้งหมด ({includedItemsTH.length} รายการ):</span>
                <div className="flex flex-wrap gap-1.5">
                  {includedItemsTH.map((inc, i) => (
                    <span
                      key={i}
                      className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      <span>✅ {inc}</span>
                      <button
                        type="button"
                        onClick={() => toggleIncludedItem(inc)}
                        className="text-emerald-400 hover:text-rose-400 ml-1 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Include Input */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="ระบุสิ่งรวมเพิ่มเติม เช่น สระว่ายน้ำ ผ้าเช็ดตัว..."
                value={customIncludeInput}
                onChange={(e) => setCustomIncludeInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
              />
              <button
                type="button"
                onClick={handleAddCustomInclude}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition"
              >
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* SECTION 3: Editable Itinerary Timeline */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>3. ตารางเวลาการเดินทาง (Editable Itinerary Timeline)</span>
              </h4>

              <button
                type="button"
                onClick={handleAddStep}
                className="bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มช่วงเวลา</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">แก้ไขช่วงเวลา ชื่อกิจกรรม และคำอธิบายของแต่ละจุดแวะพัก:</p>

            <div className="space-y-3 pt-1">
              {itinerarySteps.map((step, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2 relative group">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <span className="font-mono text-cyan-400 font-bold text-xs flex items-center gap-1">
                      <span>ช่วงที่ {idx + 1}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        title="ย้ายขึ้น"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === itinerarySteps.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        title="ย้ายลง"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(idx)}
                        className="p-1 text-rose-400 hover:text-rose-300"
                        title="ลบช่วงเวลานี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">เวลา (Time)</label>
                      <input
                        type="text"
                        value={step.time}
                        onChange={(e) => handleUpdateStep(idx, 'time', e.target.value)}
                        placeholder="เช่น 08:30 - 09:00"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-cyan-300 text-xs font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">กิจกรรม / สถานที่ (หัวข้อ)</label>
                      <input
                        type="text"
                        value={step.title?.TH || ''}
                        onChange={(e) => handleUpdateStep(idx, 'titleTH', e.target.value)}
                        placeholder="เช่น ดำน้ำเกาะไข่ ชมปลาการ์ตูน"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
                    <input
                      type="text"
                      value={step.description?.TH || ''}
                      onChange={(e) => handleUpdateStep(idx, 'descTH', e.target.value)}
                      placeholder="เช่น มีชูชีพให้บริการ พักถ่ายรูป 45 นาที..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-[2] bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold py-3 rounded-xl transition text-xs shadow-lg shadow-cyan-500/20"
            >
              {isEditing ? '💾 บันทึกการแก้ไขโปรแกรมทัวร์' : '✨ สร้างโปรแกรมทัวร์ใหม่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
