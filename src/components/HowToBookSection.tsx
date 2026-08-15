import React, { useState } from 'react';
import {
  Compass,
  QrCode,
  UploadCloud,
  Ticket,
  MessageCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Smartphone,
  ChevronRight,
  PhoneCall,
  Zap,
  Info
} from 'lucide-react';
import { AppSettings } from '../types';
import {
  Search,
  FileSearch,
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';

interface HowToBookSectionProps {
  currentLang: string;
  settings: AppSettings;
  onExploreTours: () => void;
  onOpenLookup?: () => void;
}

export const HowToBookSection: React.FC<HowToBookSectionProps> = ({
  currentLang,
  settings,
  onExploreTours,
  onOpenLookup
}) => {
  const [activeStepTab, setActiveStepTab] = useState<number | null>(null);

  const stepsData = [
    {
      step: 1,
      icon: Compass,
      color: 'teal',
      title: {
        TH: '1. เลือกโปรแกรมทัวร์ & ระบุวันเดินทาง',
        EN: '1. Choose Tour & Select Date',
        ZH: '1. 选择行程与出行日期',
        RU: '1. Выберите тур и дату'
      },
      subtitle: {
        TH: 'เลือกทัวร์ที่ใช่ ระบุวันที่ จำนวนผู้ใหญ่/เด็ก และเช็คราคาโปรโมชั่นทันที',
        EN: 'Browse island & cruise programs, pick your travel date and group size with instant live pricing.',
        ZH: '浏览精选海岛与游艇一日游，选定出发日期与人数，系统自动计算特惠总价。',
        RU: 'Выберите экскурсию, укажите дату и количество гостей с мгновенным расчетом цены.'
      },
      details: [
        {
          TH: 'เลือกเกาะยอดนิยม: เกาะพีพี มายา, อ่าวพังงา เจมส์บอนด์, สิมิลัน, เกาะราชา หรือเรือยอชท์ชมพระอาทิตย์ตก',
          EN: 'Select top destinations: Phi Phi, Phang Nga James Bond, Similan, Racha, or Sunset Yacht',
          ZH: '精选线路：皮皮岛、攀牙湾007岛、斯米兰群岛、蜜月岛日落帆船等',
          RU: 'Популярные направления: Пхи-Пхи, Джеймс Бонд, Симиланы, Закатный катамаран'
        },
        {
          TH: 'ระบุจำนวนผู้ใหญ่ เด็ก และทารก พร้อมแสดงยอดเงินสุทธิชัดเจน ไม่มีค่าใช้จ่ายแอบแฝง',
          EN: 'Specify adults & children headcounts with transparent all-inclusive net pricing',
          ZH: '清晰勾选成人与儿童人数，明码标价无任何隐藏附加费用',
          RU: 'Укажите количество взрослых и детей с прозрачной итоговой стоимостью'
        }
      ],
      mockupType: 'tour-select'
    },
    {
      step: 2,
      icon: QrCode,
      color: 'blue',
      title: {
        TH: '2. กรอกข้อมูลโรงแรม & สแกนจ่าย PromptPay QR',
        EN: '2. Fill Hotel & Scan PromptPay QR',
        ZH: '2. 填写酒店信息并扫码支付',
        RU: '2. Укажите отель и оплатите'
      },
      subtitle: {
        TH: 'ระบุโรงแรมสำหรับรถรับส่ง และสแกน QR Code พร้อมเพย์ด้วยแอปธนาคารใดก็ได้ในไทย',
        EN: 'Enter your hotel in Phuket for pickup and scan the generated Thai PromptPay QR using any banking app.',
        ZH: '填写普吉岛接送酒店与联系电话/LINE，使用任意泰国手机银行 App 扫描 PromptPay 二维码。',
        RU: 'Укажите отель для трансфера и отсканируйте PromptPay QR-код в мобильном банке.'
      },
      details: [
        {
          TH: 'ระบบสร้าง PromptPay QR Code ตามยอดเงินจริงอัตโนมัติ รวดเร็วและปลอดภัย 100%',
          EN: 'Automated exact-amount PromptPay QR code generation with bank-grade 256-bit security',
          ZH: '系统自动生成对应应付金额的 PromptPay QR 码，支持所有泰国银行即时转账',
          RU: 'Автоматическая генерация QR-кода на точную сумму с защитой банковского уровня'
        },
        {
          TH: 'ระบุชื่อโรงแรม โซน และ LINE ID เพื่อให้เจ้าหน้าที่ประสานงานรถรับส่งได้อย่างแม่นยำ',
          EN: 'Provide hotel name, room number, and LINE ID for seamless pickup coordination',
          ZH: '输入酒店全名、房号与 LINE ID，以便司机准时到达大堂接送',
          RU: 'Укажите отель, номер комнаты и LINE ID для точного трансфера'
        }
      ],
      mockupType: 'qr-payment'
    },
    {
      step: 3,
      icon: UploadCloud,
      color: 'amber',
      title: {
        TH: '3. แนบสลิปโอนเงิน & ระบบแจ้งเตือนแอดมิน LINE ทันที',
        EN: '3. Upload Transfer Slip & Instant LINE Alert',
        ZH: '3. 上传付款水单 & 微信/LINE 客服秒级响应',
        RU: '3. Загрузите чек и оповещение в LINE'
      },
      subtitle: {
        TH: 'อัปโหลดรูปสลิปจากแอปธนาคาร ระบบจะแจ้งเตือนทีมงาน Trip Sea Tour ทาง LINE แบบเรียลไทม์',
        EN: 'Upload your bank transfer slip screenshot. Our smart system instantly triggers an alert to the admin.',
        ZH: '上传手机银行转账截图，订单与凭证信息将通过 LINE 实时推送至后台客服。',
        RU: 'Загрузите скриншот квитанции из банка. Система мгновенно уведомит администратора в LINE.'
      },
      details: [
        {
          TH: 'รองรับไฟล์รูปภาพ JPG, PNG จากมือถือ เพียงคลิกอัปโหลดหรือลากวาง',
          EN: 'Supports mobile screenshots in JPG/PNG with easy 1-click upload or drag & drop',
          ZH: '支持直接从手机相册选取支付截图上传，秒级同步',
          RU: 'Поддерживает скриншоты JPG/PNG с удобной загрузкой в один клик'
        },
        {
          TH: 'แอดมินตรวจสอบสลิปภายใน 5-10 นาที และเปลี่ยนสถานะเป็น "ชำระเงินแล้ว"',
          EN: 'Admins verify your payment within 5-10 minutes and issue your confirmed status',
          ZH: '人工客服通常在 5-10 分钟内完成凭证核验并确认订单',
          RU: 'Администратор проверит квитанцию за 5-10 минут и подтвердит статус'
        }
      ],
      mockupType: 'slip-alert'
    },
    {
      step: 4,
      icon: Ticket,
      color: 'emerald',
      title: {
        TH: '4. รับตั๋ว E-Ticket พร้อมเดินทาง ',
        EN: '4. Get E-Ticket Voucher ',
        ZH: '4. 获取正规电子行程单 ',
        RU: '4. Получите E-Ticket и напоминание '
      },
      subtitle: {
        TH: 'รับตั๋ว E-Ticket ทาง LINE/ระบบ ใช้แสดงที่เคาน์เตอร์ท่าเรือ ',
        EN: 'Download official E-Ticket Voucher, present it at pier check-in, ',
        ZH: '获取带官方 TAT 旅游执照的电子确认单，登船时出示手机即可。',
        RU: 'Получите электронный ваучер для посадки на пирсе и напоминание '
      },
      details: [
        {
          TH: 'ตั๋ว E-Ticket มี QR Code ตรวจสอบ, ข้อมูลเวลารถรับส่ง และใบอนุญาต ททท. 33/11100',
          EN: 'Voucher includes check-in QR code, exact hotel pickup window, and TAT License 33/11100',
          ZH: '包含登船核销二维码、酒店大堂接人时间段与正规旅行社营运资质编号',
          RU: 'Ваучер содержит QR-код для посадки, интервал трансфера и лицензию TAT'
        },
      ],
      mockupType: 'e-ticket'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3.5 py-1 rounded-full text-xs font-extrabold border border-teal-200/70 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>EASY 4-STEP BOOKING GUIDE</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {currentLang === 'TH' ? 'ขั้นตอนการจองและชำระเงินง่ายๆ 4 ขั้นตอน' :
           currentLang === 'EN' ? 'How to Book & Pay in 4 Simple Steps' :
           currentLang === 'ZH' ? '4 步极简预订与支付指南' : 'Как забронировать и оплатить в 4 шага'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
          {currentLang === 'TH' ? 'จองทัวร์ภูเก็ตง่าย รวดเร็ว ปลอดภัยด้วย PromptPay QR พร้อมรับตั๋ว E-Ticket ยืนยันตรงเข้า LINE ทันที ตลอด 24 ชั่วโมง' :
           currentLang === 'EN' ? 'Book Phuket tours instantly with PromptPay QR, get official E-Ticket vouchers directly on LINE with 24/7 support.' :
           currentLang === 'ZH' ? '一键预订普吉海岛一日游，支持 PromptPay 扫码即时支付，电子确认单直发 LINE，24小时全程护航。' :
           'Мгновенное бронирование экскурсий с оплатой по PromptPay QR, получение ваучеров в LINE и поддержка 24/7.'}
        </p>
      </div>

      {/* Quick Interactive Step Navigator */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
        <button
          onClick={() => setActiveStepTab(null)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeStepTab === null
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>ดูทั้งหมด 4 ขั้นตอน</span>
        </button>
        {stepsData.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.step}
              onClick={() => setActiveStepTab(s.step)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeStepTab === s.step
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">
                {s.step}
              </span>
              <span className="hidden sm:inline">
                {s.step === 1 ? 'เลือกทัวร์' : s.step === 2 ? 'สแกนจ่าย QR' : s.step === 3 ? 'แนบสลิป' : 'รับตั๋ว E-Ticket'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step Cards Grid */}
      <div className="space-y-10">
        {stepsData
          .filter((s) => activeStepTab === null || activeStepTab === s.step)
          .map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                id={`step-${s.step}`}
                className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden transition duration-300 hover:border-teal-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  {/* Left Column: Explanations & Checklist */}
                  <div className="p-6 sm:p-8 lg:col-span-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      {/* Step Badge */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-teal-700/20">
                          {s.step}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                            STEP {s.step} OF 4
                          </span>
                          <span className="text-xs text-slate-400">
                            {s.step === 1 ? 'เริ่มต้นง่ายๆ' : s.step === 2 ? 'ปลอดภัย 100%' : s.step === 3 ? 'รวดเร็วใน 5 นาที' : 'พร้อมออกเดินทาง'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                          {s.title[currentLang as keyof typeof s.title] || s.title.TH}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                          {s.subtitle[currentLang as keyof typeof s.subtitle] || s.subtitle.TH}
                        </p>
                      </div>

                      {/* Key Bullet Points */}
                      <div className="space-y-2.5 pt-2">
                        {s.details.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">
                              {item[currentLang as keyof typeof item] || item.TH}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Tip */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-teal-600" />
                        <span>
                          {s.step === 1 && 'ราคาที่แสดงรวมค่าธรรมเนียมอุทยานและอาหารแล้ว'}
                          {s.step === 2 && 'PromptPay QR ไม่มีค่าธรรมเนียมการโอนข้ามธนาคาร'}
                          {s.step === 3 && 'หากมีข้อสงสัย ทักแชทสอบถามแอดมินได้ตลอดเวลา'}
                          {s.step === 4 && 'บันทึกรูปตั๋ว E-Ticket ไว้ในมือถือเพื่อความสะดวก'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-teal-600">✓ Verified</span>
                    </div>
                  </div>

                  {/* Right Column: Visual Mockup Illustration */}
                  <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 flex items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-700/60 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* MOCKUP 1: Tour Selection & Booking Form */}
                    {s.mockupType === 'tour-select' && (
                      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700 text-slate-900 space-y-3 p-4 relative z-10 animate-in fade-in">
                        <div className="relative rounded-xl overflow-hidden h-36 bg-slate-100">
                          <img
                            src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80"
                            alt="Tour Selection Mockup"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                            🔥 โปรโมชั่นพิเศษ
                          </div>
                          <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                            ⭐ 4.9 (489 รีวิว)
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">เกาะพีพี • อ่าวมาเกาะ</span>
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                            ทัวร์เกาะพีพี มายา ปิเละลากูน & เกาะไข่ โดยเรือสปีดโบ๊ท
                          </h4>
                        </div>

                        {/* Interactive fields mock */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-teal-600" /> วันเดินทาง:
                            </span>
                            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              18 ส.ค. 2569
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-teal-600" /> ผู้เดินทาง:
                            </span>
                            <span className="font-bold text-slate-900 text-[11px]">
                              ผู้ใหญ่ 2 ท่าน / เด็ก 1 ท่าน
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-600 font-bold text-[11px]">ยอดชำระสุทธิ:</span>
                            <span className="font-extrabold text-amber-600 text-sm font-mono">฿5,170</span>
                          </div>
                        </div>

                        <div className="bg-teal-600 text-white font-bold text-center py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/30">
                          <span>คลิก จองทัวร์นี้</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}

                    {/* MOCKUP 2: QR Payment PromptPay */}
                    {s.mockupType === 'qr-payment' && (
                      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700 text-slate-900 p-4 space-y-3 relative z-10 animate-in fade-in">
                        {/* PromptPay Header */}
                        <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-white text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs">
                              TH
                            </div>
                            <div>
                              <div className="text-[10px] font-mono text-teal-400 font-bold tracking-wider uppercase">Thai QR Payment</div>
                              <div className="text-xs font-bold">{settings.companyName}</div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30 font-bold">
                            PromptPay
                          </span>
                        </div>

                        {/* QR Code Container */}
                        <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border border-slate-300 shadow-inner flex items-center justify-center">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://tripseatourphuket.com/pay/TST-202608-0101`}
                              alt="PromptPay QR Code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 font-mono">
                            PromptPay ID: <strong className="text-slate-800">{settings.promptPayId || '081-234-5678'}</strong>
                          </p>
                        </div>

                        {/* Amount Box */}
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-amber-700 block font-bold">ยอดเงินที่ต้องสแกนจ่าย</span>
                            <span className="font-extrabold text-amber-900 text-base font-mono">฿5,170.00 THB</span>
                          </div>
                          <span className="text-[10px] text-amber-800 bg-amber-200/60 px-2 py-1 rounded-lg font-bold">
                            ยอดตามจริง
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>รองรับทุกแอปธนาคาร: K PLUS, SCB EASY, Krungthai, KMA, TTBDrive</span>
                        </div>
                      </div>
                    )}

                    {/* MOCKUP 3: Slip Upload & LINE Notification */}
                    {s.mockupType === 'slip-alert' && (
                      <div className="w-full max-w-sm space-y-3 relative z-10 animate-in fade-in">
                        {/* Slip Uploaded Card */}
                        <div className="bg-white rounded-2xl shadow-xl p-3.5 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> แนบสลิปเรียบร้อยแล้ว
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              Slip Verified ✓
                            </span>
                          </div>

                          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <img
                              src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=200&q=80"
                              alt="Transfer Slip Preview"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-300"
                            />
                            <div className="text-[11px] leading-tight">
                              <div className="font-bold text-slate-800">transfer_slip_5170thb.jpg</div>
                              <div className="text-slate-400 text-[10px]">ยอดเงิน ฿5,170 • PromptPay QR</div>
                            </div>
                          </div>
                        </div>

                        {/* Simulated Instant LINE Message Alert Card */}
                        <div className="bg-[#06C755] text-white rounded-2xl p-3.5 shadow-2xl space-y-2 border border-emerald-400/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-white text-[#06C755] flex items-center justify-center font-bold text-[10px]">
                                L
                              </div>
                              <span className="text-xs font-extrabold tracking-wide">LINE Notification (Live Sync)</span>
                            </div>
                            <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white/90">เมื่อสักครู่</span>
                          </div>

                          <div className="bg-white text-slate-900 p-2.5 rounded-xl text-xs space-y-1 shadow-inner">
                            <div className="text-teal-700 font-extrabold text-[11px]">🔔 มีรายการจองใหม่ & สลิปโอนเงิน!</div>
                            <div className="text-slate-600 text-[10px]">
                              รหัส: <strong className="font-mono text-slate-900">#TST-202608-0101</strong><br />
                              ลูกค้า: <strong>คุณณัฐพล วงศ์สว่าง</strong> (081-987-6543)<br />
                              ทัวร์: เกาะพีพี มายา ไข่ (฿5,170)
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MOCKUP 4: Official E-Ticket Voucher */}
                    {s.mockupType === 'e-ticket' && (
                      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-300 text-slate-900 relative z-10 animate-in fade-in">
                        {/* E-Ticket Top Header */}
                        <div className="bg-slate-900 text-white p-3 border-b-2 border-dashed border-slate-700 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider bg-teal-500 text-slate-950 px-1.5 py-0.2 rounded font-extrabold">
                              E-TICKET VOUCHER
                            </span>
                            <div className="font-extrabold text-xs mt-0.5">{settings.companyName}</div>
                          </div>
                          <span className="font-mono text-teal-300 text-xs font-bold">#TST-202608-0101</span>
                        </div>

                        {/* Ticket Content Body */}
                        <div className="p-3.5 space-y-2.5 text-xs">
                          <div className="border-b border-slate-100 pb-2">
                            <div className="font-extrabold text-slate-900 text-[11px]">ทัวร์เกาะพีพี มายา ปิเละลากูน & เกาะไข่</div>
                            <div className="text-slate-500 text-[10px]">เรือสปีดโบ๊ท VIP • ท่าเรือรัษฎา ภูเก็ต</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-slate-400 block">ผู้เดินทาง:</span>
                              <strong className="text-slate-800">คุณณัฐพล (3 ท่าน)</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block">วันเดินทาง:</span>
                              <strong className="text-teal-700 font-mono">18 ส.ค. 2569</strong>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200">
                              <span className="text-slate-400 block">เวลารถตู้รับที่ล็อบบี้:</span>
                              <strong className="text-amber-700 font-mono">⏰ 07:30 - 07:45 น. (The Sea Galleri)</strong>
                            </div>
                          </div>

                          {/* Boarding QR & TAT Stamp */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-slate-100 p-1 rounded-lg border border-slate-300">
                                <img
                                  src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=TST-VOUCHER-VALID"
                                  alt="Boarding QR"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="text-[9px] text-slate-500 leading-tight">
                                <div>สแกนเพื่อขึ้นเรือ</div>
                                <div className="text-emerald-600 font-bold">✓ ชำระเงินแล้ว</div>
                              </div>
                            </div>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono border border-slate-200">
                              TAT: 33/11100
                            </span>
                          </div>
                        </div>

                        {/* 24h Reminder Ribbon */}
                        <div className="bg-blue-600 text-white text-[10px] font-bold text-center py-1.5 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-blue-200" />
                          <span>ระบบจะส่งแจ้งเตือนใกล้วันเดินทาง 24 ชม. ทาง LINE</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* --- Section: How to Check & Lookup Ticket Voucher (วิธีการเช็คตั๋ว E-Ticket) --- */}
      <div className="my-14 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-teal-800/50 relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest bg-teal-500/20 text-teal-300 px-3.5 py-1 rounded-full font-extrabold border border-teal-500/30">
              <FileSearch className="w-3.5 h-3.5" />
              <span>Instant E-Ticket Lookup</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3">
              {currentLang === 'TH' ? '🔍 วิธีการเช็คตั๋ว & ค้นหา E-Ticket การจอง' :
               currentLang === 'EN' ? '🔍 How to Check & Lookup Your E-Ticket' :
               currentLang === 'ZH' ? '🔍 如何查询与查看您的电子船票 (E-Ticket)' : '🔍 Как проверить электронный ваучер'}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentLang === 'TH' ? 'ท่านสามารถตรวจสอบสถานะการจอง ดูรายละเอียดรถรับส่ง และเปิด QR Code ตั๋วขึ้นเรือได้ตลอด 24 ชั่วโมง เพียงใช้เบอร์โทรศัพท์หรือรหัสการจอง' :
               currentLang === 'EN' ? 'Check your booking confirmation, hotel pickup schedule, and boarding QR code anytime using your phone number or booking reference.' :
               currentLang === 'ZH' ? '随时随地通过手机号码或预订编号（TST-xxxxxx）查询订单确认状态、酒店接送时间及登船电子二维码。' :
               'Проверьте статус бронирования, время трансфера и посадочный QR-код в любое время по номеру телефона.'}
            </p>
          </div>

          {/* 3 Step Card Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Step A */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:bg-white/10 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 font-extrabold text-base flex items-center justify-center mb-3 border border-teal-500/30">
                  1
                </div>
                <h3 className="font-extrabold text-sm text-white mb-2">
                  {currentLang === 'TH' ? 'คลิกปุ่ม "เช็คตั๋ว / ค้นหาการจอง"' :
                   currentLang === 'EN' ? 'Click "Check Ticket"' :
                   currentLang === 'ZH' ? '点击“查询订单/检票”' : 'Нажмите «Проверить билет»'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentLang === 'TH' ? 'กดปุ่มเมนู "เช็คตั๋ว" ที่แถบเมนูด้านบนของเว็บไซต์ หรือกดปุ่มด้านล่างนี้เพื่อเปิดหน้าต่างค้นหา' :
                   currentLang === 'EN' ? 'Click the "Check Ticket" button in the top navigation bar or the quick button below.' :
                   currentLang === 'ZH' ? '在网站顶部导航栏点击“查询订单/检票”按钮，或点击下方快捷按钮打开查询窗口。' :
                   'Нажмите кнопку «Проверить билет» в верхнем меню или кнопку ниже.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-teal-300 flex items-center gap-1 font-mono">
                <span>📍 เมนูด้านบน / Quick Action</span>
              </div>
            </div>

            {/* Step B */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:bg-white/10 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-extrabold text-base flex items-center justify-center mb-3 border border-blue-500/30">
                  2
                </div>
                <h3 className="font-extrabold text-sm text-white mb-2">
                  {currentLang === 'TH' ? 'กรอกเบอร์โทร หรือรหัสการจอง' :
                   currentLang === 'EN' ? 'Enter Phone or Booking ID' :
                   currentLang === 'ZH' ? '输入预订手机号或订单编号' : 'Введите телефон или номер заказа'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentLang === 'TH' ? 'ระบุเบอร์โทรศัพท์ที่ใช้ทำการจอง (เช่น 0812345678) หรือกรอกรหัสการจอง เช่น TST-202608-0101 แล้วกดปุ่ม "ค้นหา"' :
                   currentLang === 'EN' ? 'Enter the phone number used during checkout or your booking ID (e.g. TST-202608-0101) and click Search.' :
                   currentLang === 'ZH' ? '输入预订时填写的联系电话（如 0812345678）或订单号（如 TST-202608-0101）后点击搜索。' :
                   'Введите номер телефона или номер бронирования (например TST-202608-0101) и нажмите поиск.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-blue-300 flex items-center gap-1 font-mono">
                <span>📱 เช่น: 081-xxx-xxxx / TST-xxxxxx</span>
              </div>
            </div>

            {/* Step C */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:bg-white/10 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-base flex items-center justify-center mb-3 border border-emerald-500/30">
                  3
                </div>
                <h3 className="font-extrabold text-sm text-white mb-2">
                  {currentLang === 'TH' ? 'รับ Voucher และ QR Code ขึ้นเรือ' :
                   currentLang === 'EN' ? 'View Voucher & Boarding QR' :
                   currentLang === 'ZH' ? '查看电子确认单与登船码' : 'Получите ваучер и QR-код'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentLang === 'TH' ? 'ระบบจะแสดงตั๋ว E-Ticket พร้อมเวลารถตู้รับที่ล็อบบี้โรงแรม, สถานะชำระเงิน และปุ่มดาวน์โหลดรูปภาพเก็บไว้ในมือถือ' :
                   currentLang === 'EN' ? 'View the confirmed e-voucher with hotel pickup schedule, payment status, and 1-click image download.' :
                   currentLang === 'ZH' ? '系统将立即呈现包含酒店大堂接送时间、已付款状态与一键保存手机相册的登船凭证。' :
                   'Система покажет ваучер со временем трансфера из отеля и QR-кодом для посадки на катер.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-emerald-300 flex items-center gap-1 font-mono">
                <span>🎫 พร้อมปุ่มดาวน์โหลดภาพ E-Ticket</span>
              </div>
            </div>
          </div>

          {/* Interactive Action Bar inside Check Ticket Box */}
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {currentLang === 'TH' ? 'ต้องการตรวจสอบตั๋วการจองของคุณตอนนี้?' : 'Ready to check your booking now?'}
                </h4>
                <p className="text-xs text-slate-400">
                  {currentLang === 'TH' ? 'ค้นหาตั๋วได้อย่างรวดเร็วและปลอดภัยตลอด 24 ชม.' : 'Instant real-time booking status lookup 24/7'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onOpenLookup && (
                <button
                  onClick={onOpenLookup}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-slate-950" />
                  <span>{currentLang === 'TH' ? 'คลิกเปิดหน้าค้นหาตั๋วเลย' : 'Open Ticket Lookup Modal'}</span>
                </button>
              )}

              <a
                href={`https://line.me/R/ti/p/${settings.lineOaId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-3 rounded-xl text-xs transition border border-slate-600 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#06C755]" />
                <span>ถามแอดมินทาง LINE</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Contact & Support Banner (LINE OA & Phone Numbers) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg shadow-slate-100">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200/60">
              <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
              <span>ติดต่อสอบถามข้อมูลการจอง & ช่วยเหลือ</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              มีข้อสงสัย หรือต้องการจองผ่านเจ้าหน้าที่?
            </h3>
            <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
              ทีมงาน Trip Sea Tour ยินดีให้บริการคำแนะนำจัดทริป ทัวร์เกาะ รถรับส่งสนามบิน และรับแจ้งชำระเงินทาง LINE Official หรือโทรติดต่อได้ตลอดเวลา
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
            {/* LINE Official Add Button */}
            <a
              href={`https://line.me/R/ti/p/${settings.lineOaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b34c] text-white font-extrabold px-5 py-3.5 rounded-2xl text-xs transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>แอด LINE Official ({settings.lineOaId || '@056hxinu'})</span>
            </a>

            {/* Primary Phone Button */}
            <a
              href="tel:0626816494"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-3.5 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 font-mono"
            >
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span>โทร 062-681-6494</span>
            </a>

            {/* Secondary Backup Phone Button */}
            <a
              href="tel:0979241399"
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-5 py-3.5 rounded-2xl text-xs transition border border-slate-300 flex items-center justify-center gap-2 font-mono"
            >
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>เบอร์สำรอง 097-924-1399</span>
            </a>
          </div>
        </div>
      </div>

      {/* Direct Tour Booking Action Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl border border-teal-800/40">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-300 text-xs font-extrabold px-2.5 py-0.5 rounded-lg border border-teal-500/30">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>พร้อมสัมผัสทะเลภูเก็ตแล้วหรือยัง?</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            เลือกโปรแกรมทัวร์ยอดนิยม แล้วเริ่มจองได้ทันที
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            การันตีราคาดีที่สุด ประกันอุบัติเหตุทางทะเลครบวงจร และทีมงานดูแลเอาใจใส่ตลอดการเดินทาง
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={onExploreTours}
            className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-2xl text-xs transition shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>ดูรายการทัวร์ & จองทันที</span>
          </button>

          <a
            href={`https://line.me/R/ti/p/${settings.lineOaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3.5 rounded-2xl text-xs transition border border-slate-700 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-[#06C755]" />
            <span>ปรึกษาแอดมิน LINE</span>
          </a>
        </div>
      </div>
    </div>
  );
};
