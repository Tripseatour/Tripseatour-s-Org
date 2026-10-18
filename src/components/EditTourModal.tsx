import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, ArrowUp, ArrowDown, CheckSquare, Square, Clock, Sparkles, 
  MapPin, DollarSign, Image as ImageIcon, Calendar, ListChecks, Eye, EyeOff,
  Upload, FileImage, CheckCircle2, AlertCircle, RefreshCw, FileText, Camera, 
  ScanLine, Loader2, ArrowRight
} from 'lucide-react';
import { Tour, TourItinerary, Language, Supplier } from '../types';
import { normalizeTours } from '../utils/tourNormalizer';

interface EditTourModalProps {
  tour: Tour | null; // null = adding new, object = editing existing
  suppliers?: Supplier[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (tourData: Partial<Tour>) => Promise<void> | void;
  initialAiScanMode?: boolean;
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
  suppliers = [],
  isOpen,
  onClose,
  onSave,
  initialAiScanMode = false,
}) => {
  const isEditing = Boolean(tour);

  // Tour Form State
  const [titleTH, setTitleTH] = useState('');
  const [titleEN, setTitleEN] = useState('');
  const [titleZH, setTitleZH] = useState('');
  const [titleRU, setTitleRU] = useState('');
  const [category, setCategory] = useState<'island' | 'sunset' | 'yacht' | 'eco' | 'sightseeing'>('island');
  const [supplierId, setSupplierId] = useState('');
  const [durationTH, setDurationTH] = useState('');
  const [durationEN, setDurationEN] = useState('');
  const [durationZH, setDurationZH] = useState('');
  const [durationRU, setDurationRU] = useState('');
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
  const [descZH, setDescZH] = useState('');
  const [descRU, setDescRU] = useState('');
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [activeLangTab, setActiveLangTab] = useState<'TH' | 'EN' | 'ZH' | 'RU'>('TH');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Included Items Checklist State
  const [includedItemsTH, setIncludedItemsTH] = useState<string[]>([]);
  const [customIncludeInput, setCustomIncludeInput] = useState('');

  // Itinerary Steps State
  const [itinerarySteps, setItinerarySteps] = useState<TourItinerary[]>([]);

  // Highlights State
  const [highlightsTH, setHighlightsTH] = useState<string[]>([]);
  const [customHighlightInput, setCustomHighlightInput] = useState('');

  // AI Image Scanner State
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiImageFile, setAiImageFile] = useState<File | null>(null);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [aiScanSuccess, setAiScanSuccess] = useState<boolean>(false);
  const [aiScanSummary, setAiScanSummary] = useState<string | null>(null);
  const [aiScanError, setAiScanError] = useState<string | null>(null);
  const [useImageAsCover, setUseImageAsCover] = useState<boolean>(true);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const [isAiSectionCollapsed, setIsAiSectionCollapsed] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing tour data if editing
  useEffect(() => {
    setAiImagePreview(null);
    setAiImageFile(null);
    setAiScanSuccess(false);
    setAiScanSummary(null);
    setAiScanError(null);

    if (tour) {
      setTitleTH(tour.title?.TH || '');
      setTitleEN(tour.title?.EN || '');
      setTitleZH(tour.title?.ZH || '');
      setTitleRU(tour.title?.RU || '');
      setCategory(tour.category || 'island');
      setSupplierId(tour.supplierId || '');
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
      setDescZH(tour.description?.ZH || '');
      setDescRU(tour.description?.RU || '');
      setIncludedItemsTH(tour.included?.TH || []);
      setItinerarySteps(tour.itinerary ? JSON.parse(JSON.stringify(tour.itinerary)) : []);
      setHighlightsTH(tour.highlights?.TH || []);
      setIsVisible(tour.isVisible !== undefined ? tour.isVisible : (tour.isAvailable !== undefined ? tour.isAvailable : true));
      setIsAiSectionCollapsed(!initialAiScanMode);
    } else {
      // Default initial state for new tour
      setIsVisible(true);
      setTitleTH('');
      setTitleEN('');
      setTitleZH('');
      setTitleRU('');
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
      setDescZH('');
      setDescRU('');
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
      setIsAiSectionCollapsed(false);
    }
  }, [tour, isOpen, initialAiScanMode]);

  if (!isOpen) return null;

  // Category map labels in all 4 languages
  const categoryLabelsMap: Record<string, { TH: string; EN: string; ZH: string; RU: string }> = {
    island: { TH: 'ทัวร์เกาะ', EN: 'Island Tour', ZH: '海岛一日游', RU: 'Островной тур' },
    sunset: { TH: 'ล่องเรือยอชท์ชมพระอาทิตย์ตก', EN: 'Sunset Yacht', ZH: '日落帆船', RU: 'Закатная яхта' },
    yacht: { TH: 'เรือยอชท์คาทามารัน', EN: 'Yacht Catamaran', ZH: '双体帆船游艇', RU: 'Яхта-Катамаран' },
    eco: { TH: 'ปางช้าง / เชิงอนุรักษ์', EN: 'Eco & Elephant', ZH: '大象保护区', RU: 'Заповедник Слонов' },
    sightseeing: { TH: 'เที่ยวเมือง / ซิตี้ทัวร์', EN: 'City Sightseeing', ZH: '环岛观光', RU: 'Обзорный тур' }
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

  // AI Auto-Translate to EN, ZH, RU
  const handleAutoTranslate = async () => {
    if (!titleTH.trim()) {
      alert('กรุณากรอกชื่อโปรแกรมทัวร์ (ภาษาไทย) ก่อนกดแปลภาษา');
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleTH,
          descTH,
          durationTH,
          highlightsTH,
          category,
          itinerarySteps
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.titleEN) setTitleEN(data.titleEN);
        if (data.titleZH) setTitleZH(data.titleZH);
        if (data.titleRU) setTitleRU(data.titleRU);
        if (data.descEN) setDescEN(data.descEN);
        if (data.descZH) setDescZH(data.descZH);
        if (data.descRU) setDescRU(data.descRU);
        if (data.durationEN) setDurationEN(data.durationEN);
        if (data.durationZH) setDurationZH(data.durationZH);
        if (data.durationRU) setDurationRU(data.durationRU);
        if (data.translatedItinerary && Array.isArray(data.translatedItinerary)) {
          setItinerarySteps(data.translatedItinerary);
        }
      } else {
        // Fallback translation
        if (!titleEN) setTitleEN(titleTH);
        if (!titleZH) setTitleZH(titleTH);
        if (!titleRU) setTitleRU(titleTH);
        if (!descEN) setDescEN(descTH);
        if (!descZH) setDescZH(descTH);
        if (!descRU) setDescRU(descTH);
      }
    } catch (err) {
      console.error('Translation error:', err);
      if (!titleEN) setTitleEN(titleTH);
      if (!titleZH) setTitleZH(titleTH);
      if (!titleRU) setTitleRU(titleTH);
    } finally {
      setIsTranslating(false);
    }
  };

  // Image Selection and Reading Handlers
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAiScanError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (เช่น JPG, PNG, WEBP)');
      return;
    }
    setAiImageFile(file);
    setAiScanError(null);
    setAiScanSuccess(false);
    setAiScanSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAiImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageSelect(file);
            break;
          }
        }
      }
    }
  };

  // AI Scan Tour Image & Auto Fill
  const handleScanTourImage = async () => {
    if (!aiImagePreview) {
      setAiScanError('กรุณาอัปโหลดรูปภาพโบรชัวร์หรือรายละเอียดโปรแกรมทัวร์ก่อน');
      return;
    }

    setIsAiScanning(true);
    setAiScanError(null);
    setAiScanSuccess(false);
    setAiScanSummary(null);

    try {
      const res = await fetch('/api/extract-tour-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: aiImagePreview,
          mimeType: aiImageFile?.type || 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'ไม่สามารถวิเคราะห์ข้อมูลจากรูปภาพได้');
      }

      const resData = await res.json();
      const extracted = resData.data;

      if (!extracted) {
        throw new Error('ไม่พบข้อมูลโปรแกรมทัวร์ในภาพ กรุณาตรวจสอบภาพอีกครั้ง');
      }

      // Auto-fill extracted values into form fields
      if (extracted.titleTH) setTitleTH(extracted.titleTH);
      if (extracted.titleEN) setTitleEN(extracted.titleEN);
      if (extracted.titleZH) setTitleZH(extracted.titleZH);
      if (extracted.titleRU) setTitleRU(extracted.titleRU);

      if (extracted.category && ['island', 'sunset', 'yacht', 'eco', 'sightseeing'].includes(extracted.category)) {
        setCategory(extracted.category);
      }
      if (extracted.location) setLocation(extracted.location);

      if (extracted.durationTH) setDurationTH(extracted.durationTH);
      if (extracted.durationEN) setDurationEN(extracted.durationEN);
      if (extracted.durationZH) setDurationZH(extracted.durationZH);
      if (extracted.durationRU) setDurationRU(extracted.durationRU);

      if (typeof extracted.priceAdult === 'number' && !isNaN(extracted.priceAdult)) {
        setPriceAdult(extracted.priceAdult);
      }
      if (typeof extracted.priceChild === 'number' && !isNaN(extracted.priceChild)) {
        setPriceChild(extracted.priceChild);
      }
      if (typeof extracted.originalPriceAdult === 'number' && !isNaN(extracted.originalPriceAdult)) {
        setOriginalPriceAdult(extracted.originalPriceAdult);
      }
      if (typeof extracted.originalPriceChild === 'number' && !isNaN(extracted.originalPriceChild)) {
        setOriginalPriceChild(extracted.originalPriceChild);
      }
      if (typeof extracted.costAdult === 'number' && !isNaN(extracted.costAdult)) {
        setCostAdult(extracted.costAdult);
      }
      if (typeof extracted.costChild === 'number' && !isNaN(extracted.costChild)) {
        setCostChild(extracted.costChild);
      }

      if (extracted.descTH) setDescTH(extracted.descTH);
      if (extracted.descEN) setDescEN(extracted.descEN);
      if (extracted.descZH) setDescZH(extracted.descZH);
      if (extracted.descRU) setDescRU(extracted.descRU);

      if (extracted.highlightsTH && Array.isArray(extracted.highlightsTH) && extracted.highlightsTH.length > 0) {
        setHighlightsTH(extracted.highlightsTH);
      }

      if (extracted.includedItemsTH && Array.isArray(extracted.includedItemsTH) && extracted.includedItemsTH.length > 0) {
        setIncludedItemsTH(extracted.includedItemsTH);
      }

      if (extracted.itinerarySteps && Array.isArray(extracted.itinerarySteps) && extracted.itinerarySteps.length > 0) {
        setItinerarySteps(extracted.itinerarySteps);
      }

      // Check supplier match
      if (extracted.supplierName && suppliers && suppliers.length > 0) {
        const found = suppliers.find(s => 
          s.name.toLowerCase().includes(extracted.supplierName.toLowerCase()) ||
          extracted.supplierName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (found) {
          setSupplierId(found.id);
        }
      }

      // If user chose to use image as cover
      if (useImageAsCover && aiImagePreview) {
        setImageUrl(aiImagePreview);
      }

      setAiScanSuccess(true);
      setAiScanSummary(
        `ชื่อทัวร์: "${extracted.titleTH || extracted.titleEN || '-'}" • ราคาผู้ใหญ่ ฿${(extracted.priceAdult || 0).toLocaleString()} • กำหนดการ ${extracted.itinerarySteps?.length || 0} ช่วงเวลา • ไฮไลท์ ${extracted.highlightsTH?.length || 0} ข้อ • สิ่งที่รวม ${extracted.includedItemsTH?.length || 0} รายการ`
      );
    } catch (err: any) {
      console.error('Scan error:', err);
      setAiScanError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Save submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const catLabel = categoryLabelsMap[category] || { TH: 'ทัวร์ภูเก็ต', EN: 'Phuket Tour', ZH: '普吉行程', RU: 'Тур на Пхукете' };

    const selectedSup = suppliers.find(s => s.id === supplierId);

    const rawTour: Partial<Tour> = {
      ...(tour ? { id: tour.id, slug: tour.slug } : {}),
      title: {
        TH: titleTH,
        EN: titleEN || titleTH,
        ZH: titleZH || titleEN || titleTH,
        RU: titleRU || titleEN || titleTH
      },
      category,
      categoryLabel: {
        TH: catLabel.TH,
        EN: catLabel.EN,
        ZH: catLabel.ZH,
        RU: catLabel.RU
      },
      supplierId: supplierId || undefined,
      supplierName: selectedSup?.name || undefined,
      description: {
        TH: descTH,
        EN: descEN || descTH,
        ZH: descZH || descEN || descTH,
        RU: descRU || descEN || descTH
      },
      duration: {
        TH: durationTH,
        EN: durationEN || durationTH,
        ZH: durationZH || durationEN || durationTH,
        RU: durationRU || durationEN || durationTH
      },
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
        ZH: highlightsTH.length ? highlightsTH : [titleZH || titleEN || titleTH],
        RU: highlightsTH.length ? highlightsTH : [titleRU || titleEN || titleTH]
      },
      pickupAreas: ['Patong', 'Kata', 'Karon', 'Phuket Town', 'Rawai', 'Chalong', 'Kamala'],
      rating: tour?.rating || 4.9,
      reviewCount: tour?.reviewCount || 35,
      tags: [catLabel.TH, 'ภูเก็ต', 'ดำน้ำ'],
      isVisible,
      isAvailable: isVisible
    };

    const normalizedList = normalizeTours([rawTour as Tour]);
    const payload = normalizedList[0] || rawTour;

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
          {/* VISIBILITY STATUS SELECTOR */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white text-xs flex items-center gap-2">
                <span className="text-base">👁️</span>
                <span>สถานะการแสดงผลบนหน้าเว็บไซต์ (Website Visibility)</span>
              </label>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                isVisible 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
                <span>{isVisible ? 'เปิดแสดงบนหน้าเว็บ (Active)' : 'ซ่อนไว้ / ไม่แสดง (Hidden)'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsVisible(true)}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  isVisible
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                  isVisible ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600'
                }`}>
                  {isVisible && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className={`font-bold text-xs flex items-center gap-1.5 ${isVisible ? 'text-emerald-300' : 'text-slate-300'}`}>
                    <span>🟢 แสดงบนเว็บไซต์ (เปิดขาย)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    ลูกค้าสามารถมองเห็น ค้นหา และจองทัวร์นี้ได้ตามปกติบนหน้าเว็บ
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  !isVisible
                    ? 'bg-rose-950/60 border-rose-500 text-white shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                  !isVisible ? 'border-rose-400 bg-rose-500 text-white' : 'border-slate-600'
                }`}>
                  {!isVisible && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className={`font-bold text-xs flex items-center gap-1.5 ${!isVisible ? 'text-rose-300' : 'text-slate-300'}`}>
                    <span>🔴 ซ่อนไว้ (ไม่แสดงหน้าร้าน)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    พักการขายชั่วคราว ลูกค้าจะไม่เห็นทัวร์นี้บนหน้าเว็บ (แอดมินยังคงเห็นและเปิดกลับมาได้เสมอ)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* AI FEATURE: Auto-fill Tour Form from Flyer / Poster / Image */}
          <div 
            className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/60 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-indigo-500/50 shadow-xl shadow-indigo-950/30 space-y-4 relative overflow-hidden transition-all"
            onPaste={handlePaste}
          >
            {/* Header with Collapse toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
                  <ScanLine className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span>✨ AI อ่านรูปโบรชัวร์และกรอกข้อมูลทัวร์อัตโนมัติ</span>
                    </h4>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Gemini 3.8 Flash Vision</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    เพิ่มรูปรายละเอียดทัวร์ / ใบเสนอราคา / โบรชัวร์ แล้วให้ AI สกัดชื่อ ราคา กำหนดการ และสิ่งที่รวม กรอกลงในช่องต่างๆ ให้ทันที
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAiSectionCollapsed(!isAiSectionCollapsed)}
                className="text-xs text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer font-bold shadow-sm"
              >
                {isAiSectionCollapsed ? '+ เปิดใช้ AI สแกนรูป' : 'ย่อเก็บ'}
              </button>
            </div>

            {!isAiSectionCollapsed && (
              <div className="space-y-3.5 pt-1 animate-in fade-in">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageSelect(e.target.files[0]);
                    }
                  }}
                />

                {/* Upload or Drop Area */}
                {!aiImagePreview ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                      isDraggingImage
                        ? 'border-indigo-400 bg-indigo-950/60 ring-2 ring-indigo-400/40'
                        : 'border-slate-700 hover:border-indigo-500/80 bg-slate-950/60 hover:bg-indigo-950/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shadow-inner">
                      <Camera className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">
                        คลิกเพื่อเลือกไฟล์รูปภาพ หรือ ลากรูปโบรชัวร์มาวางที่นี่
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        รองรับไฟล์ JPG, PNG, WEBP หรือกด <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-indigo-300 font-mono text-[10px]">Ctrl+V</kbd> เพื่อวางรูปภาพจากคลิปบอร์ด
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-indigo-900/40 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>เลือกรูปโบรชัวร์ทัวร์</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Image Preview & Action Controls */
                  <div className="bg-slate-950/90 rounded-2xl border border-indigo-500/40 p-3.5 sm:p-4 space-y-3 shadow-md">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {/* Thumbnail Preview */}
                      <div className="relative group shrink-0">
                        <img
                          src={aiImagePreview}
                          alt="Tour details preview"
                          className="w-32 h-32 sm:w-36 sm:h-36 object-cover rounded-xl border border-indigo-500/40 shadow-lg group-hover:scale-[1.02] transition"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="text-[10px] bg-slate-900/90 text-white px-2.5 py-1.5 rounded-lg font-bold shadow"
                          >
                            เปลี่ยนรูป
                          </button>
                        </div>
                      </div>

                      {/* Info & Options */}
                      <div className="flex-1 space-y-2.5 w-full text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <FileImage className="w-4 h-4 text-indigo-400" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{aiImageFile?.name || 'รูปภาพโบรชัวร์รายละเอียดทัวร์'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAiImagePreview(null);
                              setAiImageFile(null);
                              setAiScanSuccess(false);
                              setAiScanSummary(null);
                              setAiScanError(null);
                            }}
                            className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบรูปภาพ</span>
                          </button>
                        </div>

                        {/* Option: Use as cover image */}
                        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={useImageAsCover}
                            onChange={(e) => setUseImageAsCover(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span className="text-xs text-slate-300 font-medium">
                            นำรูปภาพนี้ไปใช้เป็น <strong className="text-cyan-300 font-bold">ภาพหน้าปกของโปรแกรมทัวร์ (Tour Cover)</strong> ด้วย
                          </span>
                        </label>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleScanTourImage}
                            disabled={isAiScanning}
                            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-950/50 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {isAiScanning ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                                <span>AI กำลังวิเคราะห์รูปภาพและกรอกข้อมูล...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                <span>✨ สั่งให้ AI อ่านรายละเอียดและกรอกฟอร์มอัตโนมัติ</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAiScanning}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                            <span>เปลี่ยนรูป</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status: Loading */}
                {isAiScanning && (
                  <div className="bg-indigo-950/60 border border-indigo-500/50 p-3.5 rounded-xl flex items-center gap-3 animate-pulse shadow-inner">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                    <div>
                      <div className="font-bold text-white text-xs">
                        กำลังส่งรูปภาพให้ Gemini AI สแกนและถอดข้อความ...
                      </div>
                      <p className="text-[11px] text-indigo-200 mt-0.5">
                        ระบบกำลังวิเคราะห์ชื่อโปรแกรมทัวร์, จุดหมายปลายทาง, ตารางเวลา, ราคาผู้ใหญ่/เด็ก, ไฮไลท์ท่องเที่ยว และแปล 4 ภาษาให้อัตโนมัติ
                      </p>
                    </div>
                  </div>
                )}

                {/* Status: Error */}
                {aiScanError && (
                  <div className="bg-rose-950/80 border border-rose-500/50 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs shadow-md">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-rose-300">ไม่สามารถสกัดข้อมูลจากภาพได้:</div>
                      <p className="mt-0.5">{aiScanError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiScanError(null)}
                      className="text-rose-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Status: Success */}
                {aiScanSuccess && aiScanSummary && (
                  <div className="bg-emerald-950/80 border border-emerald-500/60 p-3.5 rounded-xl space-y-1.5 text-xs animate-in fade-in shadow-md">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>🎉 AI สกัดข้อมูลและกรอกฟอร์มสำเร็จเรียบร้อยแล้ว!</span>
                    </div>
                    <p className="text-emerald-100 text-[11px] leading-relaxed pl-6">
                      {aiScanSummary}
                    </p>
                    <div className="text-[11px] text-emerald-300/80 pl-6 pt-1 flex items-center gap-1 font-medium">
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span>ข้อมูลทั้งหมดถูกใส่ลงในฟอร์มด้านล่างแล้ว สามารถเลื่อนลงเพื่อตรวจสอบและปรับแต่งได้เลยครับ</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 1: Basic Information & Multilingual Content */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>1. ข้อมูลทั่วไปและหลายภาษา (4 ภาษา: TH, EN, ZH, RU)</span>
              </h4>

              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={isTranslating || !titleTH.trim()}
                className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="คลิกเพื่อให้ AI แปลชื่อ รายละเอียด และระยะเวลาเป็นอังกฤษ จีน และรัสเซียอัตโนมัติ"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin text-amber-300' : 'text-cyan-200'}`} />
                <span>{isTranslating ? 'กำลังแปลภาษาด้วย AI...' : '✨ แปลภาษาอัตโนมัติ 4 ภาษา (Auto-Translate)'}</span>
              </button>
            </div>

            {/* Language Tabs Selector */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
              {[
                { id: 'TH', label: '🇹🇭 ภาษาไทย (TH)', filled: Boolean(titleTH) },
                { id: 'EN', label: '🇬🇧 English (EN)', filled: Boolean(titleEN) },
                { id: 'ZH', label: '🇨🇳 中文 (ZH)', filled: Boolean(titleZH) },
                { id: 'RU', label: '🇷🇺 Русский (RU)', filled: Boolean(titleRU) },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLangTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeLangTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.filled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Dynamic Language Content Inputs */}
            {activeLangTab === 'TH' && (
              <div className="space-y-3 animate-in fade-in">
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
                  <label className="font-bold text-slate-300 block mb-1">รายละเอียดทัวร์สังเขป (ภาษาไทย)</label>
                  <textarea
                    rows={2}
                    value={descTH}
                    onChange={(e) => setDescTH(e.target.value)}
                    placeholder="คำอธิบายสั้นๆ ไฮไลท์การท่องเที่ยว..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleAutoTranslate}
                    disabled={isTranslating || !titleTH.trim()}
                    className="w-full bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isTranslating ? 'animate-spin text-amber-300' : 'text-cyan-200'}`} />
                    <span>
                      {isTranslating
                        ? '🤖 กำลังให้ AI แปลเป็นภาษาอังกฤษ จีน และรัสเซียให้อัตโนมัติ...'
                        : '✨ กดแปลเป็นภาษาอื่นๆ อัตโนมัติ (แปลชื่อ รายละเอียด และกำหนดการเป็น EN / ZH / RU)'}
                    </span>
                  </button>
                  <p className="text-[10.5px] text-slate-400 mt-1 text-center">
                    💡 เพียงกรอกข้อมูลภาษาไทย แล้วกดปุ่มนี้ ระบบจะใช้ AI แปลและเติมช่องภาษาอังกฤษ จีน และรัสเซียให้อัตโนมัติทันที
                  </p>
                </div>
              </div>
            )}

            {activeLangTab === 'EN' && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Tour Title (English)</label>
                  <input
                    type="text"
                    placeholder="e.g. Phi Phi Island Speedboat Day Tour"
                    value={titleEN}
                    onChange={(e) => setTitleEN(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Tour Description (English)</label>
                  <textarea
                    rows={2}
                    value={descEN}
                    onChange={(e) => setDescEN(e.target.value)}
                    placeholder="Brief description of the tour highlights..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            )}

            {activeLangTab === 'ZH' && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">行程名称 (中文简体)</label>
                  <input
                    type="text"
                    placeholder="例如 皮皮岛玛雅湾快艇一日游"
                    value={titleZH}
                    onChange={(e) => setTitleZH(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">行程简介 (中文简体)</label>
                  <textarea
                    rows={2}
                    value={descZH}
                    onChange={(e) => setDescZH(e.target.value)}
                    placeholder="简要行程亮点介绍..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            )}

            {activeLangTab === 'RU' && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Название тура (Русский)</label>
                  <input
                    type="text"
                    placeholder="Например: Тур на острова Пхи-Пхи на скоростном катере"
                    value={titleRU}
                    onChange={(e) => setTitleRU(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Описание тура (Русский)</label>
                  <textarea
                    rows={2}
                    value={descRU}
                    onChange={(e) => setDescRU(e.target.value)}
                    placeholder="Краткое описание достопримечательностей..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            )}

            {/* Category, Supplier, Duration & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
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
                <label className="font-bold text-amber-300 block mb-1">🏢 บริษัทผู้ให้บริการ (Supplier)</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-200 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- ไม่ระบุ / ดำเนินการเอง --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      🏢 [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ระยะเวลาเดินทาง (Duration)</label>
                <input
                  type="text"
                  placeholder="เช่น เต็มวัน (08:00 - 17:00)"
                  value={durationTH}
                  onChange={(e) => setDurationTH(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-bold text-slate-300 block mb-1">สถานที่ท่องเที่ยวหลัก (Location)</label>
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
