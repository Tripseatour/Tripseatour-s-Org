import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Trash2, ShoppingCart, Calendar, Users, MapPin, QrCode, 
  Upload, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, 
  Loader2, Sparkles, Building2, Phone, Mail, User, Check, 
  Ticket, AlertCircle, Plus, Minus, Tag, Eye, RefreshCw, FileText
} from 'lucide-react';
import { Tour, Booking, Language, AppSettings, CartItem } from '../types';
import { Currency, formatPrice } from '../utils/currency';
import { translations } from '../data/translations';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { TicketVoucher } from './TicketVoucher';
import { supabaseApi } from '../lib/supabase';

interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  currentLang: Language;
  currentCurrency?: Currency;
  settings: AppSettings;
  onClose: () => void;
  onUpdateCartItem: (id: string, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onBookingsCreated: (newBookings: Booking[]) => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  currentLang,
  currentCurrency = 'THB',
  settings,
  onClose,
  onUpdateCartItem,
  onRemoveFromCart,
  onClearCart,
  onBookingsCreated,
}) => {
  const validCurrency = (currentCurrency || 'THB') as Currency;
  const t = translations[currentLang];

  // Steps: 1 = Review Cart, 2 = Contact Info, 3 = PromptPay QR & Slip, 4 = Confirmation & Tickets
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Common Contact Information
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLineId, setCustomerLineId] = useState('');
  const [nationality, setNationality] = useState(currentLang === 'TH' ? 'Thai' : 'Foreigner');

  // Common Hotel (optional shortcut)
  const [commonHotel, setCommonHotel] = useState('');
  const [commonZone, setCommonZone] = useState('Patong');
  const [applyCommonHotel, setApplyCommonHotel] = useState(false);

  // Payment & Slip State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [slipFile, setSlipFile] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string | null>(null);
  const [slipFileSize, setSlipFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewSlipZoom, setPreviewSlipZoom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);

  // Calculate Totals
  const totalAmount = cart.reduce((sum, item) => {
    const adultsTotal = item.adults * item.tour.priceAdult;
    const childrenTotal = item.children * item.tour.priceChild;
    return sum + adultsTotal + childrenTotal;
  }, 0);

  const totalAdults = cart.reduce((sum, item) => sum + item.adults, 0);
  const totalChildren = cart.reduce((sum, item) => sum + item.children, 0);
  const totalInfants = cart.reduce((sum, item) => sum + item.infants, 0);
  const totalGuests = totalAdults + totalChildren + totalInfants;

  // Apply common hotel to all items when toggled
  useEffect(() => {
    if (applyCommonHotel && commonHotel) {
      cart.forEach(item => {
        onUpdateCartItem(item.id, {
          pickupHotel: commonHotel,
          pickupZone: commonZone,
        });
      });
    }
  }, [applyCommonHotel, commonHotel, commonZone]);

  // Generate PromptPay QR Data URL for Grand Total
  useEffect(() => {
    if (totalAmount <= 0) return;
    let isMounted = true;
    async function loadQR() {
      const dataUrl = await generatePromptPayQRDataUrl(settings.promptPayId, totalAmount);
      if (isMounted) setQrCodeDataUrl(dataUrl);
    }
    loadQR();
    return () => { isMounted = false; };
  }, [settings.promptPayId, totalAmount]);

  // Compress and process slip image via HTML5 Canvas
  const processSlipImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ เช่น JPG, PNG, WEBP, HEIC');
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    setSlipFileName(file.name);
    setSlipFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
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
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setSlipFile(compressed);
        } else {
          setSlipFile(rawDataUrl);
        }
      };
      img.onerror = () => {
        setSlipFile(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Handle Slip File Selection
  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSlipImage(e.target.files[0]);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSlipImage(e.dataTransfer.files[0]);
    }
  };

  const handleSimulateSlip = () => {
    setSlipFileName('slip-promptpay-demo.jpg');
    setSlipFileSize('245 KB');
    setSlipFile('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80');
  };

  const handleRemoveSlip = () => {
    setSlipFile(null);
    setSlipFileName(null);
    setSlipFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit All Bookings in the Cart
  const handleSubmitMultiBooking = async () => {
    // Validate hotel requirement - MUST NOT BE EMPTY
    let missingHotel = false;
    let missingTourName = '';

    if (applyCommonHotel) {
      if (!commonHotel || !commonHotel.trim()) {
        missingHotel = true;
      }
    } else {
      const missingItem = cart.find(item => !item.pickupHotel || !item.pickupHotel.trim());
      if (missingItem) {
        missingHotel = true;
        missingTourName = missingItem.tour.title[currentLang] || missingItem.tour.title.TH;
      }
    }

    if (missingHotel) {
      alert(missingTourName 
        ? `โรงแรมที่พักห้ามเป็นค่าว่าง: กรุณาระบุชื่อโรงแรมสำหรับ "${missingTourName}"`
        : 'โรงแรมที่พักห้ามเป็นค่าว่าง: กรุณาระบุชื่อโรงแรมที่พักให้ครบถ้วน');
      setStep(1);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('กรุณากรอกข้อมูล ชื่อ-นามสกุล และ เบอร์โทรศัพท์ ให้ครบถ้วน');
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const createdList: Booking[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const itemTour = item.tour;
        const itemTotal = (item.adults * itemTour.priceAdult) + (item.children * itemTour.priceChild);
        const refNum = Math.floor(1000 + Math.random() * 9000);
        const bookingRef = `TST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${refNum}${String.fromCharCode(65 + i)}`;

        const hotel = applyCommonHotel 
          ? commonHotel.trim()
          : (item.pickupHotel?.trim() || commonHotel.trim());
        const zone = applyCommonHotel
          ? commonZone
          : (item.pickupZone || commonZone || 'Patong');

        const payload = {
          tourId: itemTour.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail?.trim() || 'guest@phukettrip.com',
          customerPhone: customerPhone.trim(),
          customerLineId: customerLineId?.trim() || '',
          nationality: nationality || 'Thai',
          travelDate: item.travelDate,
          pickupHotel: hotel,
          pickupZone: zone,
          roomNumber: item.roomNumber || '',
          specialRequests: item.specialRequests || '',
          adults: item.adults,
          children: item.children,
          infants: item.infants,
          totalAmount: itemTotal,
          slipUrl: slipFile || undefined,
          paymentStatus: slipFile ? 'slip_uploaded' : 'pending',
        };

        let bookingData: Booking;

        try {
          const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error('API request failed');
          bookingData = await res.json();
        } catch {
          // Fallback direct creation
          bookingData = {
            id: `bk-cart-${timestamp}-${i}`,
            bookingRef,
            tourId: itemTour.id,
            tourTitle: itemTour.title.TH || 'ทัวร์ภูเก็ต',
            tourImage: itemTour.images && itemTour.images.length ? itemTour.images[0] : '',
            customerName: customerName.trim(),
            customerEmail: customerEmail?.trim() || 'guest@phukettrip.com',
            customerPhone: customerPhone.trim(),
            customerLineId: customerLineId?.trim() || '',
            nationality: nationality || 'Thai',
            travelDate: item.travelDate,
            pickupHotel: hotel,
            pickupZone: zone,
            roomNumber: item.roomNumber || '',
            specialRequests: item.specialRequests || '',
            adults: item.adults,
            children: item.children,
            infants: item.infants,
            totalAmount: itemTotal,
            paymentMethod: 'promptpay',
            promptPayIdUsed: settings.promptPayId,
            paymentStatus: slipFile ? 'slip_uploaded' : 'pending',
            orderStatus: 'pending',
            slipUrl: slipFile || undefined,
            slipUploadedAt: slipFile ? new Date().toISOString() : undefined,
            createdAt: new Date().toISOString(),
            lineNotifySent: true,
          };
        }

        // If slip was provided, ensure attached
        if (slipFile) {
          bookingData.slipUrl = slipFile;
          bookingData.paymentStatus = 'slip_uploaded';
          bookingData.slipUploadedAt = new Date().toISOString();

          // Also try uploading slip endpoint if available
          try {
            await fetch(`/api/bookings/${bookingData.id}/upload-slip`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slipUrl: slipFile }),
            });
          } catch (e) {
            // Ignore if endpoint already handled
          }
        }

        // Direct persist to Supabase if available
        try {
          await supabaseApi.createBooking(bookingData);
        } catch (supErr) {
          console.warn('Supabase sync notice:', supErr);
        }

        createdList.push(bookingData);
      }

      setCompletedBookings(createdList);
      onBookingsCreated(createdList);
      onClearCart();
      setStep(4);
    } catch (err) {
      console.error('Error submitting multi-tour booking:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              {step === 4 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShoppingCart className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  {step === 4 
                    ? `ออกตั๋วสำเร็จ (${completedBookings.length} โปรแกรม)` 
                    : `${t.myCart} (${cart.length} ${t.totalTours})`}
                </h2>
                {step !== 4 && cart.length > 0 && (
                  <span className="bg-teal-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    {totalGuests} ท่าน
                  </span>
                )}
                {step === 4 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    E-Ticket Ready
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {step === 4 
                  ? 'ระบบออกตั๋ว E-Ticket และบันทึกคำสั่งจองเรียบร้อยแล้ว'
                  : 'จองหลายโปรแกรมทัวร์พร้อมกัน ชำระเงินรวมครั้งเดียวผ่าน PromptPay QR'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step Breadcrumbs (When cart has items) */}
        {cart.length > 0 && step !== 4 && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5 sm:gap-4 max-w-full overflow-x-auto">
              <button 
                onClick={() => setStep(1)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${step === 1 ? 'bg-teal-600 text-white shadow-xs' : 'hover:text-slate-900'}`}
              >
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">1</span>
                <span>รายการทัวร์ ({cart.length})</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

              <button 
                onClick={() => {
                  if (cart.length > 0) setStep(2);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${step === 2 ? 'bg-teal-600 text-white shadow-xs' : 'hover:text-slate-900'}`}
              >
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">2</span>
                <span>ข้อมูลผู้ติดต่อ</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

              <button 
                onClick={() => {
                  if (customerName && customerPhone) setStep(3);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${step === 3 ? 'bg-teal-600 text-white shadow-xs' : 'hover:text-slate-900'}`}
              >
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">3</span>
                <span>ชำระเงินรวม</span>
              </button>
            </div>

            <button
              onClick={onClearCart}
              className="text-[11px] text-rose-500 hover:text-rose-700 font-bold hover:underline shrink-0 hidden sm:block"
            >
              {t.clearCart}
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm space-y-6">

          {/* EMPTY CART STATE */}
          {cart.length === 0 && step !== 4 && (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <ShoppingCart className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{t.cartEmpty}</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                  {t.cartEmptyDesc}
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-md shadow-teal-200 inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.continueBrowsing}</span>
              </button>
            </div>
          )}

          {/* STEP 1: REVIEW & CUSTOMIZE ITEMS */}
          {cart.length > 0 && step === 1 && (
            <div className="space-y-4">
              
              {/* Optional Quick Apply Hotel for all tours */}
              <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-teal-950">
                    <input
                      type="checkbox"
                      checked={applyCommonHotel}
                      onChange={(e) => setApplyCommonHotel(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded-md border-teal-300 focus:ring-teal-500"
                    />
                    <span>{t.applySameHotelToAll}</span>
                  </label>
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>

                {applyCommonHotel && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-800 block mb-1 flex items-center gap-1">
                        <span>โรงแรมที่พักในภูเก็ต</span>
                        <span className="text-rose-600 font-extrabold">* (จำเป็นต้องระบุ)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={commonHotel}
                        onChange={(e) => setCommonHotel(e.target.value)}
                        placeholder="เช่น Hilton Phuket Arcadia, Patong Resort (จำเป็นต้องระบุ)"
                        className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden ${
                          !commonHotel.trim() ? 'border-amber-400 bg-amber-50/30' : 'border-teal-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        โซนรับส่ง
                      </label>
                      <select
                        value={commonZone}
                        onChange={(e) => setCommonZone(e.target.value)}
                        className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                      >
                        <option value="Patong">ป่าตอง (Patong) - ฟรี</option>
                        <option value="Kata">กะตะ (Kata) - ฟรี</option>
                        <option value="Karon">กะรน (Karon) - ฟรี</option>
                        <option value="Phuket Town">ตัวเมืองภูเก็ต (Phuket Town) - ฟรี</option>
                        <option value="Rawai">ราไวย์ (Rawai)</option>
                        <option value="Kamala">กมลา (Kamala)</option>
                        <option value="Bangtao">บางเทา / ลากูน่า (Bangtao / Laguna)</option>
                        <option value="Airport">สนามบิน / ไม้ขาว (Maikhao / Airport)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3.5">
                {cart.map((item, index) => {
                  const tour = item.tour;
                  const title = tour.title[currentLang] || tour.title.TH;
                  const itemSubtotal = (item.adults * tour.priceAdult) + (item.children * tour.priceChild);

                  return (
                    <div 
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-teal-300 transition space-y-3"
                    >
                      {/* Tour Top Row */}
                      <div className="flex gap-3 items-start justify-between">
                        <div className="flex gap-3 items-start">
                          <img
                            src={tour.images[0]}
                            alt={title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                              ทริปที่ {index + 1}: {tour.categoryLabel[currentLang] || tour.categoryLabel.TH}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm sm:text-base line-clamp-1 mt-1">
                              {title}
                            </h4>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>ผู้ใหญ่: ฿{tour.priceAdult.toLocaleString()}</span>
                              <span>•</span>
                              <span>เด็ก: ฿{tour.priceChild.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => onRemoveFromCart(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="ลบออกจากตะกร้า"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Travel Date & Passengers Config for this Tour */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {/* Travel Date */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <span>วันที่เดินทาง (Travel Date)</span>
                          </label>
                          <input
                            type="date"
                            value={item.travelDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => onUpdateCartItem(item.id, { travelDate: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                          />
                        </div>

                        {/* Passenger Steppers */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                            <Users className="w-3.5 h-3.5 text-teal-600" />
                            <span>จำนวนผู้เดินทาง</span>
                          </label>
                          <div className="flex items-center gap-3">
                            {/* Adults */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <span className="text-[11px] font-bold text-slate-600">ผู้ใหญ่:</span>
                              <button
                                onClick={() => onUpdateCartItem(item.id, { adults: Math.max(1, item.adults - 1) })}
                                className="w-5 h-5 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-black text-slate-900">{item.adults}</span>
                              <button
                                onClick={() => onUpdateCartItem(item.id, { adults: item.adults + 1 })}
                                className="w-5 h-5 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Children */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <span className="text-[11px] font-bold text-slate-600">เด็ก:</span>
                              <button
                                onClick={() => onUpdateCartItem(item.id, { children: Math.max(0, item.children - 1) })}
                                className="w-5 h-5 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-black text-slate-900">{item.children}</span>
                              <button
                                onClick={() => onUpdateCartItem(item.id, { children: item.children + 1 })}
                                className="w-5 h-5 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pickup Hotel per tour (if not common) */}
                      {!applyCommonHotel && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5 flex items-center gap-1">
                              <span>โรงแรมที่พักทริปนี้</span>
                              <span className="text-rose-600 font-extrabold">* (จำเป็นต้องระบุ)</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={item.pickupHotel || ''}
                              onChange={(e) => onUpdateCartItem(item.id, { pickupHotel: e.target.value })}
                              placeholder="ระบุชื่อโรงแรมที่พัก (จำเป็นต้องระบุ)"
                              className={`w-full bg-slate-50 border rounded-lg px-2.5 py-1 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden ${
                                !item.pickupHotel || !item.pickupHotel.trim() ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">
                              โซนรับส่ง
                            </label>
                            <select
                              value={item.pickupZone || 'Patong'}
                              onChange={(e) => onUpdateCartItem(item.id, { pickupZone: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                            >
                              <option value="Patong">ป่าตอง (Patong) - ฟรี</option>
                              <option value="Kata">กะตะ (Kata) - ฟรี</option>
                              <option value="Karon">กะรน (Karon) - ฟรี</option>
                              <option value="Phuket Town">ตัวเมืองภูเก็ต - ฟรี</option>
                              <option value="Rawai">ราไวย์ (Rawai)</option>
                              <option value="Kamala">กมลา (Kamala)</option>
                              <option value="Bangtao">บางเทา / ลากูน่า</option>
                              <option value="Airport">สนามบิน / ไม้ขาว</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Tour Subtotal Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">
                          ยอดรวมโปรแกรมนี้ ({item.adults} ผู้ใหญ่{item.children > 0 ? `, ${item.children} เด็ก` : ''})
                        </span>
                        <span className="font-black text-slate-900 text-sm">
                          ฿{itemSubtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>จำนวนโปรแกรมทัวร์ทั้งหมด:</span>
                  <span className="font-bold text-white">{cart.length} โปรแกรม</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>จำนวนผู้เดินทางรวม:</span>
                  <span className="font-bold text-white">{totalAdults} ผู้ใหญ่ {totalChildren > 0 ? `, ${totalChildren} เด็ก` : ''}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-teal-400 font-bold block">{t.grandTotal}</span>
                    <span className="text-2xl sm:text-3xl font-black text-teal-300">
                      ฿{totalAmount.toLocaleString()}
                    </span>
                  </div>
                  {validCurrency !== 'THB' && (
                    <span className="text-xs text-slate-400 font-medium">
                      ≈ {formatPrice(totalAmount, validCurrency)}
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: CONTACT INFORMATION */}
          {cart.length > 0 && step === 2 && (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-900 font-medium flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
                <span>กรอกข้อมูลผู้ติดต่อเพียงครั้งเดียว สำหรับออกตั๋วและประสานงานรถรับส่งทุกทริป</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    {t.fullName} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="เช่น สมชาย ใจดี / John Smith"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    {t.phone} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    {t.lineId}
                  </label>
                  <input
                    type="text"
                    value={customerLineId}
                    onChange={(e) => setCustomerLineId(e.target.value)}
                    placeholder="เช่น somchai_tours"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    {t.email}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="เช่น somchai@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    {t.nationality}
                  </label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    <option value="Thai">ไทย (Thai)</option>
                    <option value="Foreigner">ต่างชาติ (Foreigner)</option>
                    <option value="Chinese">จีน (Chinese)</option>
                    <option value="Russian">รัสเซีย (Russian)</option>
                    <option value="European">ยุโรป (European)</option>
                  </select>
                </div>
              </div>

              {/* Overview of Booked Packages */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <h5 className="font-extrabold text-slate-800 text-xs">สรุปรายการทัวร์ที่จะทำการจอง:</h5>
                {cart.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate max-w-[65%]">
                      {idx + 1}. {item.tour.title.TH || item.tour.title.EN} ({item.travelDate})
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">
                      ฿{((item.adults * item.tour.priceAdult) + (item.children * item.tour.priceChild)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PROMPTPAY QR & SLIP PAYMENT */}
          {cart.length > 0 && step === 3 && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950 font-medium flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>ชำระเงินรวมยอดเดียว <b>฿{totalAmount.toLocaleString()}</b> ครอบคลุมทั้ง {cart.length} โปรแกรมทัวร์</span>
                </div>
                <span className="hidden sm:inline bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  ปลอดภัย 100%
                </span>
              </div>

              {/* PromptPay Official Redesigned Card */}
              <div className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                {/* Official Header Banner */}
                <div className="bg-gradient-to-r from-[#003B5C] via-[#004B75] to-[#003B5C] p-3.5 text-center border-b border-white/10">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="bg-white text-[#003B5C] px-2.5 py-0.5 rounded-md font-black text-xs tracking-wider uppercase shadow-2xs">
                      PROMPTPAY
                    </div>
                    <span className="text-xs font-bold text-slate-200">| พร้อมเพย์ Official</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    สแกน QR Code ด้วยแอปพลิเคชันทุกธนาคารเพื่อชำระเงิน
                  </p>
                </div>

                <div className="p-5 text-center space-y-4">
                  {/* Centered White QR Code Box */}
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border-2 border-teal-500/30">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="PromptPay QR Code"
                        className="w-52 h-52 sm:w-60 sm:h-60 mx-auto object-contain"
                      />
                    ) : (
                      <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-500 block mt-2 tracking-wide uppercase">
                      • PromptPay Dynamic QR Code •
                    </span>
                  </div>

                  {/* Payment Amount & Account Details */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 max-w-md mx-auto space-y-3 text-center">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">{t.exactAmountToPay}</span>
                      <div className="flex items-center justify-center gap-2.5 mt-0.5">
                        <span className="text-3xl sm:text-4xl font-black text-teal-400 tracking-tight">
                          ฿{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-700/70 text-xs text-slate-300 space-y-1">
                      <p className="font-bold text-white">
                        ชื่อบัญชี: <span className="text-teal-300">{(settings.promptPayName && !settings.promptPayName.includes('บริษัท')) ? settings.promptPayName : 'พรทิพย์ แดงทัด'}</span>
                      </p>
                      <div className="flex items-center justify-center gap-2 text-slate-300 text-[11px] pt-0.5">
                        <span>เลขพร้อมเพย์: <b className="text-white font-mono text-xs">{settings.promptPayId}</b></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Slip Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-teal-600" />
                    <span>{t.uploadSlip} (ยอดรวม ฿{totalAmount.toLocaleString()})</span>
                  </label>
                </div>

                {/* Hidden File Input with camera capture support */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSlipChange}
                  className="hidden"
                  id="cart-slip-file-input"
                />

                {slipFile ? (
                  /* Slip Preview State */
                  <div className="bg-slate-50 border-2 border-emerald-400/80 rounded-2xl p-4 transition shadow-xs">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Image Thumbnail with zoom trigger */}
                      <div 
                        onClick={() => setPreviewSlipZoom(true)}
                        className="relative w-28 h-36 bg-slate-900 rounded-xl overflow-hidden shadow-md border border-slate-200 cursor-pointer group shrink-0"
                      >
                        <img 
                          src={slipFile} 
                          alt="Slip Preview" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-6 h-6" />
                        </div>
                        <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] px-1 rounded-sm">
                          กดดูรูป
                        </span>
                      </div>

                      {/* File Details & Actions */}
                      <div className="space-y-2 text-center sm:text-left flex-1">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>แนบสลิปโอนเงินสำเร็จ</span>
                        </div>

                        <div className="text-xs text-slate-600">
                          <p className="font-semibold text-slate-800 truncate max-w-xs">
                            {slipFileName || 'ใบเสร็จสลิปโอนเงิน PromptPay'}
                          </p>
                          {slipFileSize && (
                            <p className="text-[11px] text-slate-400">ขนาดไฟล์: {slipFileSize}</p>
                          )}
                          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                            พร้อมส่งไปยังระบบหลังบ้านและออกตั๋ว Voucher ทันที
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewSlipZoom(true)}
                            className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูรูปขยาย</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>เปลี่ยนรูปสลิป</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRemoveSlip}
                            className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบสลิป</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Dropzone State */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition select-none ${
                      isDragging 
                        ? 'border-teal-500 bg-teal-50/80 scale-[1.01]' 
                        : 'border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-slate-800 text-sm">
                          {isDragging ? 'ปล่อยรูปภาพที่นี่เพื่อแนบสลิป' : 'คลิกหรือลากรูปสลิปมาวางที่นี่'}
                        </h5>
                        <p className="text-xs text-slate-500 mt-1">
                          รองรับไฟล์ JPG, PNG, WEBP หรือถ่ายรูปสลิปจากมือถือ
                        </p>
                      </div>

                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>เลือกรูปสลิปโอนเงิน</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETED BOOKINGS & E-TICKETS */}
          {step === 4 && completedBookings.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-200">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-emerald-950">
                  จองและออกตั๋ว E-Ticket สำเร็จครบ {completedBookings.length} โปรแกรม!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  ระบบได้บันทึกคำสั่งจองและเตรียมตั๋ว E-Ticket ทุกทัวร์ไว้ให้คุณแล้ว สามารถดูและดาวน์โหลดตั๋วแยกแต่ละทริปได้ด้านล่าง
                </p>
              </div>

              {/* Multi-Ticket Tab Selector */}
              {completedBookings.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {completedBookings.map((bk, idx) => (
                    <button
                      key={bk.id}
                      onClick={() => setActiveTicketIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center gap-1.5 ${
                        activeTicketIndex === idx
                          ? 'bg-teal-700 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>ทริปที่ {idx + 1}: {bk.tourTitle.split('(')[0]}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Ticket Voucher View */}
              {completedBookings[activeTicketIndex] && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">
                      แสดงตั๋ว E-Ticket ใบที่ {activeTicketIndex + 1} จาก {completedBookings.length} ใบ:
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      Ref: {completedBookings[activeTicketIndex].bookingRef}
                    </span>
                  </div>

                  <TicketVoucher
                    booking={completedBookings[activeTicketIndex]}
                    currentLang={currentLang}
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step === 1 && cart.length > 0 && (
            <>
              <button
                onClick={onClose}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-200 transition"
              >
                ← {t.continueBrowsing}
              </button>
              <button
                onClick={() => {
                  if (applyCommonHotel) {
                    if (!commonHotel || !commonHotel.trim()) {
                      alert('โรงแรมที่พักห้ามเป็นค่าว่าง: กรุณาระบุชื่อโรงแรมที่พักในภูเก็ต เพื่อใช้สำหรับการจัดรถรับ-ส่ง');
                      return;
                    }
                  } else {
                    const missingItem = cart.find(item => !item.pickupHotel || !item.pickupHotel.trim());
                    if (missingItem) {
                      const tourTitle = missingItem.tour.title[currentLang] || missingItem.tour.title.TH;
                      alert(`โรงแรมที่พักห้ามเป็นค่าว่าง: กรุณาระบุชื่อโรงแรมสำหรับ "${tourTitle}" หรือติ๊ก "ใช้โรงแรมและโซนเดียวกันทุกโปรแกรม" ด้านบน`);
                      return;
                    }
                  }
                  setStep(2);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-md shadow-teal-200 flex items-center gap-2 active:scale-95"
              >
                <span>ไปขั้นตอนข้อมูลผู้ติดต่อ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-200 transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ย้อนกลับ</span>
              </button>
              <button
                onClick={() => {
                  if (!customerName || !customerPhone) {
                    alert('กรุณากรอก ชื่อ-นามสกุล และ เบอร์โทรศัพท์ ให้ครบถ้วน');
                    return;
                  }
                  setStep(3);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-md shadow-teal-200 flex items-center gap-2 active:scale-95"
              >
                <span>ไปขั้นตอนชำระเงิน (PromptPay)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-200 transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ย้อนกลับ</span>
              </button>
              <button
                onClick={handleSubmitMultiBooking}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-teal-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกและออกตั๋ว...</span>
                  </>
                ) : (
                  <>
                    <span>ยืนยันการจองทั้งหมด ({cart.length} ทัวร์)</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 4 && (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-500">
                สามารถนำรหัส Booking Ref มาค้นหาตั๋วได้ตลอดเวลา
              </span>
              <button
                onClick={onClose}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}
        </div>

        {/* Slip Image Fullscreen Zoom Modal */}
        {previewSlipZoom && slipFile && (
          <div 
            onClick={() => setPreviewSlipZoom(false)}
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            >
              <div className="p-3 bg-slate-800 flex items-center justify-between border-b border-slate-700 text-white">
                <span className="text-xs font-bold flex items-center gap-1.5 text-teal-300">
                  <Eye className="w-4 h-4" />
                  <span>รูปสลิปโอนเงิน (PromptPay)</span>
                </span>
                <button
                  onClick={() => setPreviewSlipZoom(false)}
                  className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto">
                <img 
                  src={slipFile} 
                  alt="Full Slip Preview" 
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-700"
                />
              </div>

              <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-xs">{slipFileName || 'slip-image.jpg'}</span>
                <button
                  onClick={() => setPreviewSlipZoom(false)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                >
                  ปิดรูป
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
