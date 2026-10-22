import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, ArrowUp, ArrowDown, CheckSquare, Square, Clock, Sparkles, 
  MapPin, DollarSign, Image as ImageIcon, Calendar, ListChecks, Eye, EyeOff,
  Upload, FileImage, CheckCircle2, AlertCircle, RefreshCw, FileText, Camera, 
  ScanLine, Loader2, ArrowRight, Layers, ImagePlus, Star, Images
} from 'lucide-react';
import { Tour, TourItinerary, Language, Supplier } from '../types';
import { normalizeTours } from '../utils/tourNormalizer';
import { compressImageBase64 } from '../utils/storage';
import { translateTourData } from '../utils/translationHelper';

export interface AiTourImageItem {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
  sizeBytes?: number;
}

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

  // Foreigner Prices (ราคาชาวต่างชาติ สำหรับภาษา EN / ZH / RU)
  const [priceForeignAdult, setPriceForeignAdult] = useState(1900);
  const [priceForeignChild, setPriceForeignChild] = useState(1300);
  const [costForeignAdult, setCostForeignAdult] = useState(1400);
  const [costForeignChild, setCostForeignChild] = useState(950);
  const [originalPriceForeignAdult, setOriginalPriceForeignAdult] = useState(2700);
  const [originalPriceForeignChild, setOriginalPriceForeignChild] = useState(1900);
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

  // AI Image Scanner State (Multi-Image Support)
  const [aiImages, setAiImages] = useState<AiTourImageItem[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
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
    setAiImages([]);
    setCoverImageIndex(0);
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
      setPriceForeignAdult(tour.priceForeignAdult || (tour.priceAdult ? tour.priceAdult + 400 : 1900));
      setPriceForeignChild(tour.priceForeignChild || (tour.priceChild ? tour.priceChild + 300 : 1300));
      setCostForeignAdult(tour.costForeignAdult !== undefined ? tour.costForeignAdult : (tour.costAdult ? tour.costAdult + 400 : Math.round((tour.priceForeignAdult || 1900) * 0.65)));
      setCostForeignChild(tour.costForeignChild !== undefined ? tour.costForeignChild : (tour.costChild ? tour.costChild + 300 : Math.round((tour.priceForeignChild || 1300) * 0.65)));
      setOriginalPriceForeignAdult(tour.originalPriceForeignAdult || (tour.originalPriceAdult ? tour.originalPriceAdult + 500 : 2700));
      setOriginalPriceForeignChild(tour.originalPriceForeignChild || (tour.originalPriceChild ? tour.originalPriceChild + 400 : 1900));
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
      setCostAdult(1000);
      setCostChild(650);
      setOriginalPriceAdult(2200);
      setOriginalPriceChild(1500);
      setPriceForeignAdult(1900);
      setPriceForeignChild(1300);
      setCostForeignAdult(1400);
      setCostForeignChild(950);
      setOriginalPriceForeignAdult(2700);
      setOriginalPriceForeignChild(1900);
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

  // Auto-Translate to EN, ZH, RU (Powered by Gemini + Smart Tourism Localization Engine)
  const handleAutoTranslate = async () => {
    if (!titleTH.trim()) {
      alert('กรุณากรอกชื่อโปรแกรมทัวร์ (ภาษาไทย) ก่อนกดแปลภาษา');
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateTourData({
        titleTH,
        descTH,
        durationTH,
        highlightsTH,
        category,
        itinerarySteps
      });

      if (translated.titleEN) setTitleEN(translated.titleEN);
      if (translated.titleZH) setTitleZH(translated.titleZH);
      if (translated.titleRU) setTitleRU(translated.titleRU);
      if (translated.descEN) setDescEN(translated.descEN);
      if (translated.descZH) setDescZH(translated.descZH);
      if (translated.descRU) setDescRU(translated.descRU);
      if (translated.durationEN) setDurationEN(translated.durationEN);
      if (translated.durationZH) setDurationZH(translated.durationZH);
      if (translated.durationRU) setDurationRU(translated.durationRU);
      if (translated.translatedItinerary && Array.isArray(translated.translatedItinerary)) {
        setItinerarySteps(translated.translatedItinerary);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper: Auto-calculate foreigner rate based on Thai rate + National Park foreigner fee
  const handleAutoCalcForeignerPrices = () => {
    const parkFeeAdult = 400; // ค่าธรรมเนียมอุทยานต่างชาติมาตรฐาน (เช่น เกาะพีพี / อ่าวพังงา / สิมิลัน)
    const parkFeeChild = 300;
    setPriceForeignAdult(Number(priceAdult) + parkFeeAdult);
    setPriceForeignChild(Number(priceChild) + parkFeeChild);
    setCostForeignAdult(Number(costAdult) + parkFeeAdult);
    setCostForeignChild(Number(costChild) + parkFeeChild);
    setOriginalPriceForeignAdult(Number(originalPriceAdult) + 500);
    setOriginalPriceForeignChild(Number(originalPriceChild) + 400);
  };

  // Helper: Read and optimize image to Base64 (resizing very large images for fast processing)
  const readFileAsOptimizedBase64 = (file: File): Promise<{ base64: string; mimeType: string; name: string; sizeBytes: number }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const optimized = canvas.toDataURL('image/jpeg', 0.88);
              resolve({ base64: optimized, mimeType: 'image/jpeg', name: file.name, sizeBytes: file.size });
              return;
            }
          }
          resolve({ base64: rawData, mimeType: file.type || 'image/jpeg', name: file.name, sizeBytes: file.size });
        };
        img.onerror = () => {
          resolve({ base64: rawData, mimeType: file.type || 'image/jpeg', name: file.name, sizeBytes: file.size });
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  };

  // Image Selection and Reading Handlers (Multiple Files)
  const handleMultipleFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith('image/')) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      setAiScanError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (เช่น JPG, PNG, WEBP)');
      return;
    }

    const availableSlots = Math.max(0, 10 - aiImages.length);
    if (availableSlots <= 0) {
      setAiScanError('สามารถอัปโหลดรูปภาพได้สูงสุด 10 รูป กรุณาลบรูปบางส่วนออกก่อนเพิ่มใหม่');
      return;
    }

    if (validFiles.length > availableSlots) {
      setAiScanError(`สามารถเพิ่มได้อีกเพียง ${availableSlots} รูป (สูงสุด 10 รูป) ระบบจะเลือกเฉพาะ ${availableSlots} รูปแรก`);
    } else {
      setAiScanError(null);
    }

    setAiScanSuccess(false);
    setAiScanSummary(null);

    const filesToProcess = validFiles.slice(0, availableSlots);
    const processed = await Promise.all(filesToProcess.map(readFileAsOptimizedBase64));

    const newItems: AiTourImageItem[] = processed.map((p, idx) => ({
      id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: p.name,
      base64: p.base64,
      mimeType: p.mimeType,
      sizeBytes: p.sizeBytes
    }));

    setAiImages(prev => {
      const combined = [...prev, ...newItems];
      return combined;
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setAiImages(prev => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      if (coverImageIndex >= updated.length) {
        setCoverImageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    setAiScanSuccess(false);
  };

  const handleClearAllImages = () => {
    setAiImages([]);
    setCoverImageIndex(0);
    setAiScanSuccess(false);
    setAiScanSummary(null);
    setAiScanError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      const pastedFiles: File[] = [];
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        handleMultipleFiles(pastedFiles);
      }
    }
  };

  // AI Scan Tour Images & Auto Fill (Multi-Image Synthesis)
  const handleScanTourImage = async () => {
    if (aiImages.length === 0) {
      setAiScanError('กรุณาอัปโหลดรูปภาพโบรชัวร์หรือรายละเอียดโปรแกรมทัวร์อย่างน้อย 1 รูป');
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
          images: aiImages.map(img => ({
            imageBase64: img.base64,
            mimeType: img.mimeType,
          }))
        }),
      });

      if (!res.ok) {
        let errorMsg = '';
        try {
          const errJson = await res.json();
          errorMsg = errJson.error || errJson.message || errJson.details || '';
        } catch (_) {
          // Response is not JSON
        }

        if (!errorMsg) {
          if (res.status === 404) {
            errorMsg = 'ไม่พบ Endpoint /api/extract-tour-from-image (404 Not Found) - กำลังซิงค์ไฟล์ API ไปยัง Vercel';
          } else if (res.status === 429) {
            errorMsg = 'โควต้าการใช้งาน Gemini AI ชั่วคราวเต็ม (Rate Limit) กรุณารอสักครู่ (1-2 นาที) แล้วลองใหม่อีกครั้ง หรือโควต้ารายวันจะรีเซ็ตเวลา 14:00 - 15:00 น.';
          } else if (res.status === 503) {
            errorMsg = 'เซิร์ฟเวอร์ Gemini AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (High demand) กรุณาลองใหม่อีกครั้งใน 1-2 นาที';
          } else {
            errorMsg = `ไม่สามารถวิเคราะห์ข้อมูลจากรูปภาพได้ (HTTP ${res.status})`;
          }
        }
        throw new Error(errorMsg);
      }

      const resData = await res.json();
      const extracted = resData.data;

      if (!extracted) {
        throw new Error('ไม่พบข้อมูลโปรแกรมทัวร์ในรูปภาพ กรุณาตรวจสอบภาพอีกครั้ง');
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

      // If user chose to use image as cover, use selected cover image index
      if (useImageAsCover && aiImages[coverImageIndex]) {
        setImageUrl(aiImages[coverImageIndex].base64);
      }

      setAiScanSuccess(true);
      setAiScanSummary(
        `ประมวลผลข้อมูลสำเร็จจากทั้งหมด ${aiImages.length} รูปภาพ: ชื่อทัวร์ "${extracted.titleTH || extracted.titleEN || '-'}" • ราคาผู้ใหญ่ ฿${(extracted.priceAdult || 0).toLocaleString()} • กำหนดการ ${extracted.itinerarySteps?.length || 0} ช่วงเวลา • ไฮไลท์ ${extracted.highlightsTH?.length || 0} ข้อ • สิ่งที่รวม ${extracted.includedItemsTH?.length || 0} รายการ`
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

    let finalImageUrl = imageUrl || 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1000';
    if (finalImageUrl.startsWith('data:image')) {
      finalImageUrl = await compressImageBase64(finalImageUrl, 900, 0.75);
    }

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
      priceForeignAdult: Number(priceForeignAdult),
      priceForeignChild: Number(priceForeignChild),
      costForeignAdult: Number(costForeignAdult),
      costForeignChild: Number(costForeignChild),
      originalPriceForeignAdult: Number(originalPriceForeignAdult),
      originalPriceForeignChild: Number(originalPriceForeignChild),
      images: [finalImageUrl],
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
                      <span>Gemini 3.8 Flash (สแกนได้หลายรูป)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    เพิ่มรูปรายละเอียดทัวร์ได้หลายรูปพร้อมกัน (เช่น หน้าปก + ตารางเวลา + หน้ารายละเอียดราคา/สิ่งที่รวม) แล้วให้ AI สังเคราะห์ข้อมูลกรอกลงในช่องต่างๆ ให้ทันที
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
                {/* Hidden File Input (supports multiple files) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMultipleFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Upload or Drop Area (when no images yet) */}
                {aiImages.length === 0 ? (
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
                      <Images className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">
                        คลิกเพื่อเลือกไฟล์รูปภาพ (เลือกพร้อมกันได้หลายรูป) หรือ ลากรูปโบรชัวร์มาวางที่นี่
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        รองรับหลายรูปพร้อมกันสูงสุด 10 รูป (เช่น หน้าปก + ตารางเวลา + หน้ารายละเอียดราคา/สิ่งที่รวม) หรือกด <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-indigo-300 font-mono text-[10px]">Ctrl+V</kbd> เพื่อวางรูปภาพ
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-indigo-900/40 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>เลือกรูปโบรชัวร์ทัวร์ (เลือกได้หลายรูป)</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Multi-Image Gallery & Action Controls */
                  <div className="bg-slate-950/90 rounded-2xl border border-indigo-500/40 p-3.5 sm:p-4 space-y-3.5 shadow-md">
                    {/* Top Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>รูปภาพที่เลือก ({aiImages.length} รูป / สูงสุด 10 รูป)</span>
                        <span className="text-[10px] text-amber-300 font-normal hidden sm:inline">
                          • คลิก "ตั้งเป็นรูปหน้าปก" เพื่อเลือกรูปปกทัวร์
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={aiImages.length >= 10 || isAiScanning}
                          className="text-xs bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                        >
                          <ImagePlus className="w-3.5 h-3.5 text-indigo-400" />
                          <span>+ เพิ่มรูปอีก</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllImages}
                          disabled={isAiScanning}
                          className="text-xs text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ล้างทั้งหมด</span>
                        </button>
                      </div>
                    </div>

                    {/* Image Thumbnails Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {aiImages.map((imgItem, idx) => {
                        const isCover = coverImageIndex === idx;
                        return (
                          <div
                            key={imgItem.id}
                            className={`relative group rounded-xl border-2 overflow-hidden transition-all bg-slate-900 flex flex-col ${
                              isCover
                                ? 'border-amber-400 shadow-md shadow-amber-950/40 ring-2 ring-amber-400/30'
                                : 'border-indigo-500/30 hover:border-indigo-400/70'
                            }`}
                          >
                            {/* Thumbnail */}
                            <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
                              <img
                                src={imgItem.base64}
                                alt={imgItem.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />

                              {/* Page Badge */}
                              <div className="absolute top-1.5 left-1.5 bg-slate-900/90 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-700 shadow">
                                #{idx + 1}
                              </div>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(idx);
                                }}
                                title="ลบรูปนี้"
                                className="absolute top-1.5 right-1.5 bg-rose-600/90 hover:bg-rose-600 text-white p-1 rounded-md shadow transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Cover Badge Overlay */}
                              {isCover && (
                                <div className="absolute bottom-1.5 left-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-slate-950" />
                                  <span>รูปหน้าปก</span>
                                </div>
                              )}
                            </div>

                            {/* Footer inside card */}
                            <div className="p-2 bg-slate-950/90 flex flex-col gap-1 text-left">
                              <span className="text-[10px] text-slate-300 font-medium truncate" title={imgItem.name}>
                                {imgItem.name}
                              </span>
                              {!isCover ? (
                                <button
                                  type="button"
                                  onClick={() => setCoverImageIndex(idx)}
                                  className="text-[9px] text-indigo-300 hover:text-amber-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded px-1.5 py-0.5 transition font-semibold text-center cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Star className="w-2.5 h-2.5" />
                                  <span>ตั้งเป็นหน้าปก</span>
                                </button>
                              ) : (
                                <span className="text-[9px] text-amber-400 font-bold flex items-center justify-center gap-1 py-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>เลือกเป็นหน้าปกแล้ว</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add More Slot */}
                      {aiImages.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-300 flex flex-col items-center justify-center gap-1.5 p-3 transition cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500/30 flex items-center justify-center text-indigo-300 transition">
                            <ImagePlus className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-center leading-tight">
                            + เพิ่มรูปอีก<br />
                            <span className="text-[9px] text-slate-400 font-normal">({10 - aiImages.length} รูปที่เหลือ)</span>
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Options & Action Bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Option: Use as cover image */}
                      <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                        <input
                          type="checkbox"
                          checked={useImageAsCover}
                          onChange={(e) => setUseImageAsCover(e.target.checked)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs text-slate-300 font-medium">
                          นำรูปที่เลือก <strong className="text-amber-300 font-bold">(รูป #{coverImageIndex + 1})</strong> ไปใช้เป็น <strong className="text-cyan-300 font-bold">ภาพหน้าปกของโปรแกรมทัวร์ (Tour Cover)</strong> ด้วย
                        </span>
                      </label>

                      {/* Scan Button */}
                      <button
                        type="button"
                        onClick={handleScanTourImage}
                        disabled={isAiScanning || aiImages.length === 0}
                        className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {isAiScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                            <span>AI กำลังวิเคราะห์ทั้ง {aiImages.length} รูปภาพ...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>✨ สั่งให้ AI อ่าน {aiImages.length} รูปภาพและกรอกฟอร์มอัตโนมัติ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status: Loading */}
                {isAiScanning && (
                  <div className="bg-indigo-950/60 border border-indigo-500/50 p-3.5 rounded-xl flex items-center gap-3 animate-pulse shadow-inner">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                    <div>
                      <div className="font-bold text-white text-xs">
                        กำลังส่งรูปภาพทั้ง {aiImages.length} รูปให้ Gemini 3.8 Flash วิเคราะห์และถอดข้อความ...
                      </div>
                      <p className="text-[11px] text-indigo-200 mt-0.5">
                        ระบบกำลังวิเคราะห์และสังเคราะห์ข้อมูลจากรูปทั้งหมด: ชื่อโปรแกรมทัวร์, จุดหมายปลายทาง, ตารางเวลาการเดินทาง, ราคาผู้ใหญ่/เด็ก, ไฮไลท์ท่องเที่ยว และแปล 4 ภาษาให้อัตโนมัติ
                      </p>
                    </div>
                  </div>
                )}

                {/* Status: Error */}
                {aiScanError && (
                  <div className="bg-rose-950/80 border border-rose-500/50 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs shadow-md">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-rose-300">ไม่สามารถสกัดข้อมูลจากรูปภาพได้:</div>
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
                      <span>🎉 AI สกัดข้อมูลจากทั้ง {aiImages.length} รูปภาพและกรอกฟอร์มสำเร็จเรียบร้อยแล้ว!</span>
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
                { id: 'EN', label: '🇬🇧 English (EN)', filled: Boolean(titleEN && titleEN !== titleTH) },
                { id: 'ZH', label: '🇨🇳 中文 (ZH)', filled: Boolean(titleZH && titleZH !== titleTH) },
                { id: 'RU', label: '🇷🇺 Русский (RU)', filled: Boolean(titleRU && titleRU !== titleTH) },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    const targetLang = tab.id as 'TH' | 'EN' | 'ZH' | 'RU';
                    setActiveLangTab(targetLang);
                    if (targetLang !== 'TH' && titleTH.trim()) {
                      const isTargetEmpty = 
                        (targetLang === 'EN' && (!titleEN.trim() || titleEN === titleTH)) ||
                        (targetLang === 'ZH' && (!titleZH.trim() || titleZH === titleTH)) ||
                        (targetLang === 'RU' && (!titleRU.trim() || titleRU === titleTH));
                      if (isTargetEmpty && !isTranslating) {
                        handleAutoTranslate();
                      }
                    }
                  }}
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
                    💡 เพียงกรอกข้อมูลภาษาไทย แล้วกดปุ่มนี้ ระบบจะแปลและเติมช่องภาษาอังกฤษ จีน และรัสเซียให้อัตโนมัติทันที
                  </p>
                </div>
              </div>
            )}

            {activeLangTab === 'EN' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between bg-cyan-950/50 border border-cyan-500/30 p-2.5 rounded-xl text-xs">
                  <span className="text-cyan-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>แปลชื่อและรายละเอียดจากภาษาไทยเป็นภาษาอังกฤษอัตโนมัติ</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoTranslate}
                    disabled={isTranslating}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-3 py-1 rounded-lg text-xs cursor-pointer active:scale-95 transition"
                  >
                    {isTranslating ? 'กำลังแปล...' : '⚡ กดแปลทันที (Translate)'}
                  </button>
                </div>
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
                <div className="flex items-center justify-between bg-cyan-950/50 border border-cyan-500/30 p-2.5 rounded-xl text-xs">
                  <span className="text-cyan-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>从泰语自动翻译为中文简体</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoTranslate}
                    disabled={isTranslating}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-3 py-1 rounded-lg text-xs cursor-pointer active:scale-95 transition"
                  >
                    {isTranslating ? '正在翻译...' : '⚡ 立即翻译 (Translate)'}
                  </button>
                </div>
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
                <div className="flex items-center justify-between bg-cyan-950/50 border border-cyan-500/30 p-2.5 rounded-xl text-xs">
                  <span className="text-cyan-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Автоматический перевод с тайского на русский</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoTranslate}
                    disabled={isTranslating}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-3 py-1 rounded-lg text-xs cursor-pointer active:scale-95 transition"
                  >
                    {isTranslating ? 'Перевод...' : '⚡ Перевести (Translate)'}
                  </button>
                </div>
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

            {/* SECTION: Thai Resident Pricing */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h5 className="font-extrabold text-emerald-300 text-xs flex items-center gap-1.5">
                  <span>🇹🇭 1. ราคาสำหรับคนไทย (Thai Resident Rates - แสดงเมื่อเลือกภาษาไทย)</span>
                </h5>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-emerald-400 block mb-1">ขายผู้ใหญ่ (THB) *</label>
                  <input
                    type="number"
                    required
                    value={priceAdult}
                    onChange={(e) => setPriceAdult(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2.5 text-emerald-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-cyan-400 block mb-1">ขายเด็ก (THB) *</label>
                  <input
                    type="number"
                    required
                    value={priceChild}
                    onChange={(e) => setPriceChild(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl p-2.5 text-cyan-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-400 block mb-1">🏭 ทุนเอเยนต์ผู้ใหญ่</label>
                  <input
                    type="number"
                    required
                    value={costAdult}
                    onChange={(e) => setCostAdult(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-400 block mb-1">🏭 ทุนเอเยนต์เด็ก</label>
                  <input
                    type="number"
                    required
                    value={costChild}
                    onChange={(e) => setCostChild(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">ราคาขีดฆ่าผู้ใหญ่</label>
                  <input
                    type="number"
                    value={originalPriceAdult}
                    onChange={(e) => setOriginalPriceAdult(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">ราคาขีดฆ่าเด็ก</label>
                  <input
                    type="number"
                    value={originalPriceChild}
                    onChange={(e) => setOriginalPriceChild(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-400"
                  />
                </div>

                <div className="col-span-2 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-slate-300 font-medium text-[11px]">กำไรคาดการณ์คนไทย/ตั๋ว:</span>
                  <span className="font-extrabold text-emerald-400 text-xs">
                    ผู้ใหญ่ ฿{(priceAdult - costAdult).toLocaleString()} / เด็ก ฿{(priceChild - costChild).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION: Foreigner Pricing */}
            <div className="space-y-2 pt-3 border-t border-slate-800 bg-sky-950/20 p-3 rounded-2xl border border-sky-500/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="font-extrabold text-sky-300 text-xs flex items-center gap-1.5">
                    <span>🌍 2. ราคาสำหรับชาวต่างชาติ (Foreigner / International Rates - สำหรับภาษา EN, ZH, RU)</span>
                  </h5>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    ระบบจะใช้ราคานี้อัตโนมัติเมื่อลูกค้าดูหน้าเว็บเป็นภาษาอังกฤษ จีน หรือรัสเซีย (รวมค่าอุทยานต่างชาติแล้ว)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAutoCalcForeignerPrices}
                  className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold px-3 py-1 rounded-xl text-[11px] shadow-sm cursor-pointer active:scale-95 transition flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ คำนวณราคาต่างชาติอัตโนมัติ (+ค่าอุทยาน ฿400 / ฿300)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-sky-400 block mb-1">ขายผู้ใหญ่ต่างชาติ (THB) *</label>
                  <input
                    type="number"
                    required
                    value={priceForeignAdult}
                    onChange={(e) => setPriceForeignAdult(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-sky-500/50 rounded-xl p-2.5 text-sky-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-cyan-400 block mb-1">ขายเด็กต่างชาติ (THB) *</label>
                  <input
                    type="number"
                    required
                    value={priceForeignChild}
                    onChange={(e) => setPriceForeignChild(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl p-2.5 text-cyan-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-400 block mb-1">🏭 ทุนต่างชาติผู้ใหญ่</label>
                  <input
                    type="number"
                    required
                    value={costForeignAdult}
                    onChange={(e) => setCostForeignAdult(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-400 block mb-1">🏭 ทุนต่างชาติเด็ก</label>
                  <input
                    type="number"
                    required
                    value={costForeignChild}
                    onChange={(e) => setCostForeignChild(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">ราคาขีดฆ่าผู้ใหญ่ต่างชาติ</label>
                  <input
                    type="number"
                    value={originalPriceForeignAdult}
                    onChange={(e) => setOriginalPriceForeignAdult(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">ราคาขีดฆ่าเด็กต่างชาติ</label>
                  <input
                    type="number"
                    value={originalPriceForeignChild}
                    onChange={(e) => setOriginalPriceForeignChild(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-400"
                  />
                </div>

                <div className="col-span-2 bg-sky-950/60 border border-sky-500/40 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-slate-300 font-medium text-[11px]">กำไรคาดการณ์ต่างชาติ/ตั๋ว:</span>
                  <span className="font-extrabold text-sky-300 text-xs">
                    ผู้ใหญ่ ฿{(priceForeignAdult - costForeignAdult).toLocaleString()} / เด็ก ฿{(priceForeignChild - costForeignChild).toLocaleString()}
                  </span>
                </div>
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
