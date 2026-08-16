import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, MapPin, QrCode, Upload, CheckCircle2, ShieldCheck, FileText, Phone, Mail, User, AlertCircle, ArrowRight, Loader2, Sparkles, Check } from 'lucide-react';
import { Tour, Booking, Language, AppSettings } from '../types';
import { translations } from '../data/translations';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { TicketVoucher } from './TicketVoucher';
import { supabaseApi } from '../lib/supabase';

interface BookingModalProps {
  tour: Tour | null;
  currentLang: Language;
  settings: AppSettings;
  onClose: () => void;
  onBookingCreated: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  tour,
  currentLang,
  settings,
  onClose,
  onBookingCreated,
}) => {
  // Default travel date tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  // Form State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [travelDate, setTravelDate] = useState(defaultDateStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [pickupHotel, setPickupHotel] = useState('');
  const [pickupZone, setPickupZone] = useState('Patong');
  const [roomNumber, setRoomNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLineId, setCustomerLineId] = useState('');
  const [nationality, setNationality] = useState(currentLang === 'TH' ? 'Thai' : 'Foreigner');

  // Payment State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [slipFile, setSlipFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Price Calculation
  const priceAdult = tour?.priceAdult || 0;
  const priceChild = tour?.priceChild || 0;
  const totalAmount = (adults * priceAdult) + (children * priceChild);

  // Generate PromptPay QR Data URL
  useEffect(() => {
    if (!tour) return;
    let isMounted = true;
    async function loadQR() {
      const dataUrl = await generatePromptPayQRDataUrl(settings.promptPayId, totalAmount);
      if (isMounted) setQrCodeDataUrl(dataUrl);
    }
    loadQR();
    return () => { isMounted = false; };
  }, [tour, settings.promptPayId, totalAmount]);

  if (!tour) return null;

  const t = translations[currentLang];

  // Handle Slip Upload
  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSlipFile(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSimulateSlip = () => {
    setSlipFile('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80');
  };

  // Submit Booking & Payment
  const handleSubmitBooking = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !pickupHotel.trim()) {
      alert('โรงแรมที่พักห้ามเป็นค่าว่าง: กรุณากรอกข้อมูล ชื่อ-นามสกุล, เบอร์โทรศัพท์ และ โรงแรมที่พัก ให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tourId: tour.id,
        customerName,
        customerEmail: customerEmail || 'guest@phukettrip.com',
        customerPhone,
        customerLineId,
        nationality,
        travelDate,
        pickupHotel,
        pickupZone,
        roomNumber,
        specialRequests,
        adults,
        children,
        infants,
        totalAmount,
      };

      let bookingData: Booking;

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Booking request failed');
        bookingData = await res.json();
      } catch (apiErr) {
        console.warn('Vercel API endpoint for booking creation failed, falling back to direct client-side Supabase write:', apiErr);
        
        // Generate robust booking payload client-side
        const refNum = Math.floor(1000 + Math.random() * 9000);
        const bookingRef = `TST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${refNum}`;
        
        bookingData = {
          id: `bk-${Date.now()}`,
          bookingRef,
          tourId: tour.id,
          tourTitle: tour.title.TH || 'ทัวร์ภูเก็ต',
          tourImage: tour.images && tour.images.length ? tour.images[0] : '',
          customerName,
          customerEmail: customerEmail || 'guest@phukettrip.com',
          customerPhone,
          customerLineId,
          nationality: nationality || 'Thai',
          travelDate,
          pickupHotel,
          pickupZone: pickupZone || 'General Zone',
          roomNumber,
          specialRequests,
          adults: Number(adults) || 1,
          children: Number(children) || 0,
          infants: Number(infants) || 0,
          totalAmount: Number(totalAmount) || 0,
          paymentMethod: 'promptpay',
          promptPayIdUsed: settings.promptPayId || '0825257914',
          paymentStatus: 'pending',
          orderStatus: 'pending',
          createdAt: new Date().toISOString(),
          lineNotifySent: false
        };

        // Write directly to Supabase client-side
        try {
          const success = await supabaseApi.createBooking(bookingData);
          if (!success) {
            throw new Error('Supabase direct booking creation returned false');
          }
        } catch (dbErr) {
          console.error('Supabase write failed, falling back to localStorage database backup:', dbErr);
          try {
            const savedFallbacks = localStorage.getItem('local_fallback_bookings');
            const list = savedFallbacks ? JSON.parse(savedFallbacks) : [];
            list.push(bookingData);
            localStorage.setItem('local_fallback_bookings', JSON.stringify(list));
          } catch (storageErr) {
            console.error('Failed to write to localStorage fallback:', storageErr);
          }
        }
      }

      // If slip uploaded, upload and cache slip
      if (slipFile) {
        bookingData.paymentStatus = 'slip_uploaded';
        bookingData.slipUrl = slipFile;
        bookingData.slipUploadedAt = new Date().toISOString();

        // Cache image to server for public LINE delivery
        fetch('/api/cache-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: `slip_${bookingData.bookingRef}`,
            dataUrl: slipFile
          })
        }).catch(() => {});

        // 1. Double-write slip info direct to Supabase
        await supabaseApi.updateBooking(bookingData.id, {
          paymentStatus: 'slip_uploaded',
          slipUrl: slipFile,
          slipUploadedAt: bookingData.slipUploadedAt
        }).catch((dbErr) => {
          console.warn('Direct Supabase update for slip failed, updating local fallback copy:', dbErr);
          try {
            const savedFallbacks = localStorage.getItem('local_fallback_bookings');
            if (savedFallbacks) {
              const list = JSON.parse(savedFallbacks);
              const idx = list.findIndex((b: any) => b.id === bookingData.id);
              if (idx !== -1) {
                list[idx].paymentStatus = 'slip_uploaded';
                list[idx].slipUrl = slipFile;
                list[idx].slipUploadedAt = bookingData.slipUploadedAt;
                localStorage.setItem('local_fallback_bookings', JSON.stringify(list));
              }
            }
          } catch (storageErr) {}
        });

        // 2. Fallback push to API in background
        await fetch(`/api/bookings/${bookingData.id}/upload-slip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slipUrl: slipFile }),
        }).catch(() => {});
      }

      setCompletedBooking(bookingData);
      onBookingCreated(bookingData);
      setStep(4);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {t.bookingDetails} - PromptPay QR
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {tour.title[currentLang] || tour.title.TH}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500 shrink-0">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-blue-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-300'}`}>1</span>
            <span>วันที่ & จำนวน</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-blue-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-300'}`}>2</span>
            <span>ผู้ติดต่อ</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-blue-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-300'}`}>3</span>
            <span>สแกนจ่าย</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* STEP 1: Date, Guest Count & Pickup Hotel */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Date selection */}
              <div>
                <label className="font-bold text-slate-800 text-xs block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  <span>{t.selectTravelDate} *</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              {/* Guest Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                {/* Adult */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">{t.adult}</span>
                    <span className="text-cyan-700 font-bold">฿{tour.priceAdult.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl p-1">
                    <button
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-slate-900">{adults}</span>
                    <button
                      onClick={() => setAdults(adults + 1)}
                      className="w-7 h-7 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-bold transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Child */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">{t.child}</span>
                    <span className="text-cyan-700 font-bold">฿{tour.priceChild.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl p-1">
                    <button
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-slate-900">{children}</span>
                    <button
                      onClick={() => setChildren(children + 1)}
                      className="w-7 h-7 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-bold transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Infant */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">{t.infant}</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl p-1">
                    <button
                      onClick={() => setInfants(Math.max(0, infants - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-slate-900">{infants}</span>
                    <button
                      onClick={() => setInfants(infants + 1)}
                      className="w-7 h-7 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-bold transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Pickup Hotel */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-800 text-xs block mb-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    <span>{t.pickupHotel}</span>
                    <span className="text-rose-600 font-extrabold">* (จำเป็นต้องระบุ)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น โรงแรม Hilton Phuket Arcadia, Patong Beach (จำเป็นต้องระบุ)"
                    value={pickupHotel}
                    onChange={(e) => setPickupHotel(e.target.value)}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
                      !pickupHotel.trim() ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      {t.pickupZone}
                    </label>
                    <select
                      value={pickupZone}
                      onChange={(e) => setPickupZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
                    >
                      {tour.pickupAreas.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      {t.roomNumber}
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Room 304 (ถ้าทราบ)"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Contact Information */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ข้อมูลผู้ติดต่อจะถูกบันทึกไว้สำหรับออกตั๋ว Voucher และยืนยันเวลารถรับส่ง</span>
              </div>

              <div>
                <label className="font-bold text-slate-800 text-xs block mb-1 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-cyan-600" />
                  <span>{t.fullName} *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมชาย ใจดี หรือ Mr.John Carter"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 text-xs block mb-1 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-cyan-600" />
                    <span>{t.phone} *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="061-123-4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 text-xs block mb-1 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-cyan-600" />
                    <span>{t.email}</span>
                  </label>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 text-xs block mb-1">
                    {t.lineId}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น @line_id หรือ เบอร์โทร"
                    value={customerLineId}
                    onChange={(e) => setCustomerLineId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 text-xs block mb-1">
                    {t.specialRequests}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ทานอาหารมังสวิรัติ, ขอคาร์ซีท"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PromptPay QR Payment & Slip Attachment */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in">
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
                        <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                          ฿{totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        (ผู้ใหญ่ {adults} ท่าน x ฿{tour.priceAdult.toLocaleString()} {children > 0 ? `+ เด็ก ${children} ท่าน x ฿${tour.priceChild.toLocaleString()}` : ''})
                      </span>
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

              {/* Upload Slip Section */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 text-xs block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-cyan-600" />
                    <span>{t.uploadSlip} *</span>
                  </span>
                </label>

                <div className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-4 text-center bg-slate-50 transition relative">
                  {slipFile ? (
                    <div className="space-y-2">
                      <div className="w-24 h-32 mx-auto rounded-lg overflow-hidden shadow border border-slate-300">
                        <img src={slipFile} alt="Slip Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs text-emerald-700 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>แนบสลิปโอนเงินเรียบร้อยแล้ว</span>
                      </div>
                      <button
                        onClick={() => setSlipFile(null)}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        เปลี่ยนรูปสลิป
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-600">{t.dragDropSlip}</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSlipChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation Voucher Success */}
          {step === 4 && completedBooking && (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {t.bookingSuccess}
                </span>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  ระบบได้ออกตั๋ว E-Ticket เรียบร้อยแล้ว ท่านสามารถกดบันทึกรูปตั๋วลงมือถือได้ทันที
                </p>
              </div>

              {/* Digital Ticket Voucher Component */}
              <TicketVoucher booking={completedBooking} settings={settings} />
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition"
            >
              ย้อนกลับ
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              onClick={() => {
                if (!pickupHotel || !pickupHotel.trim()) {
                  alert('โรงแรมที่พักห้ามเป็นค่าว่าง: กรุณากรอกชื่อโรงแรม/ที่พัก เพื่อใช้สำหรับการจัดรถรับ-ส่ง');
                  return;
                }
                setStep(2);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-200 flex items-center gap-1.5"
            >
              <span>ถัดไป: ข้อมูลผู้ติดต่อ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => {
                if (!customerName || !customerPhone) {
                  alert('กรุณากรอกชื่อ-นามสกุล และ เบอร์โทรศัพท์');
                  return;
                }
                setStep(3);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-200 flex items-center gap-1.5"
            >
              <span>ถัดไป: สแกนจ่าย PromptPay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmitBooking}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-200 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังส่งข้อมูล...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t.confirmBookingButton}</span>
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-2.5 rounded-xl text-xs transition w-full"
            >
              เสร็จสิ้น / ปิดหน้านี้
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
