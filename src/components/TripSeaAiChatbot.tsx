import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User, RefreshCw, ChevronRight, Compass, ShieldCheck, CreditCard, Clock, PhoneCall } from 'lucide-react';
import { Language, Tour, AppSettings } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface TripSeaAiChatbotProps {
  currentLang?: Language;
  currentLanguage?: Language;
  tours?: Tour[];
  settings?: AppSettings;
  onBookTourClick?: (tourId: string) => void;
  contactPhone?: string;
  lineOaId?: string;
  facebookUrl?: string;
  currentCurrency?: any;
}

export const TripSeaAiChatbot: React.FC<TripSeaAiChatbotProps> = ({
  currentLang,
  currentLanguage,
  tours = [],
  settings,
  onBookTourClick,
  contactPhone = '+66 (0) 62 681 6494',
  lineOaId = '@056hxinu',
  facebookUrl = 'https://www.facebook.com/tripseatoursphuket/'
}) => {
  const activeLang: Language = currentLang || currentLanguage || 'TH';
  const phone = settings?.contactPhone || contactPhone || '062-681-6494 / 097-924-1399';
  const line = settings?.lineOaId || lineOaId || '@056hxinu';
  const fb = settings?.facebookUrl || facebookUrl;
  const tat = settings?.tatLicenseNo || '33/11100';

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'สวัสดีค่ะ! ยินดีต้อนรับสู่ **Trip Sea Tour Phuket** 🌊✨\n\nหนูคือ **TripSeaTour AI Assistant** ผู้ช่วยอัจฉริยะ 24 ชม. ขับเคลื่อนด้วย **Gemini AI** พร้อมแนะนำทัวร์เกาะพีพี อ่าวพังงา เรือยอชท์คาทามารัน และช่วยเหลือเรื่องการจองทุกขั้นตอนค่ะ\n\nมีอะไรให้หนูช่วยแนะนำวันนี้ไหมคะ? 👇',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const quickQuestions = [
    { label: '🏝️ แนะนำทัวร์ยอดฮิต', query: 'ช่วยแนะนำทัวร์เกาะยอดฮิตของภูเก็ตที่คุ้มค่าที่สุดหน่อยครับ' },
    { label: '💰 เช็คราคาโปรโมชั่น', query: 'ราคาโปรโมชั่นของแต่ละทัวร์ตอนนี้มีอะไรบ้าง รวมอะไรบ้างครับ' },
    { label: '💳 ขั้นตอนการจอง & สแกนจ่าย', query: 'ขั้นตอนการจองและชำระเงินผ่าน PromptPay ทำอย่างไรบ้างครับ' },
    { label: '🛡️ ใบอนุญาต ททท. & ประกันภัย', query: 'บริษัทมีใบอนุญาต ททท. ถูกต้องไหมและมีประกันภัยอะไรบ้างครับ' },
    { label: '⏰ การรับส่งที่โรงแรม', query: 'มีบริการรถรับส่งจากโรงแรมไหนบ้าง นัดกี่โมงครับ' }
  ];

  // Comprehensive Client-side Smart Engine
  const generateClientSmartAnswer = (query: string): string => {
    const lower = (query || '').toLowerCase().trim();

    const tourListText = tours && tours.length > 0
      ? tours.map((t, idx) => `🏝️ **${idx + 1}. ${activeLang === 'EN' ? t.title.EN : t.title.TH}**\n   • ราคาโปรโมชั่น: ผู้ใหญ่ **฿${t.priceAdult.toLocaleString()}** / เด็ก **฿${t.priceChild.toLocaleString()}** (จากปกติ ฿${t.originalPriceAdult.toLocaleString()})\n   • ไฮไลท์: ${t.highlights.TH?.slice(0, 3).join(', ')}`).join('\n\n')
      : `🏝️ **1. ทัวร์เกาะพีพี - อ่าวมาหยา - ปิเละลากูน สปีดโบ๊ท**: ผู้ใหญ่ **฿1,590** / เด็ก **฿1,190**\n` +
        `🚣 **2. ทัวร์อ่าวพังงา - เกาะเจมส์บอนด์ - แคนูเกาะห้อง**: ผู้ใหญ่ **฿1,690** / เด็ก **฿1,290**\n` +
        `⛵ **3. ล่องเรือยอชท์คาทามารัน เกาะเฮ & พระอาทิตย์ตกแหลมพรหมเทพ**: ผู้ใหญ่ **฿2,490** / เด็ก **฿1,790**`;

    // 1. Greetings
    if (lower === 'สวัสดี' || lower === 'สวัสดีครับ' || lower === 'สวัสดีค่ะ' || lower.includes('hello') || lower.includes('hi') || lower === 'หวัดดี' || lower === 'ดีครับ' || lower === 'ดีค่ะ' || lower.includes('hey')) {
      return `สวัสดีค่ะ! ยินดีต้อนรับสู่ **Trip Sea Tour Phuket** ค่ะ 🌊✨\n\nเรามีบริการนำเที่ยวทางทะเลภูเก็ตครบวงจร พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\nโปรแกรมแนะนำยอดนิยมวันนี้:\n${tourListText}\n\n💬 ท่านสามารถสอบถามรายละเอียดโปรแกรม หรือจองทัวร์ผ่านระบบบนเว็บได้ทันที หรือแอดไลน์ **${line}** (โทร **${phone}**) ได้ตลอด 24 ชม. เลยนะคะ!`;
    }

    // 2. Specific Islands / Tour Queries
    if (lower.includes('พีพี') || lower.includes('phi phi') || lower.includes('มาหยา') || lower.includes('maya') || lower.includes('ปิเละ') || lower.includes('pileh')) {
      const ppTour = tours.find(t => t.id.includes('phi-phi') || t.title.TH.includes('พีพี'));
      const priceA = ppTour ? ppTour.priceAdult.toLocaleString() : '1,590';
      const priceC = ppTour ? ppTour.priceChild.toLocaleString() : '1,190';
      return `🏝️ **ทัวร์เกาะพีพี - อ่าวมาหยา - ปิเละลากูน - เกาะไข่ (เรือสปีดโบ๊ท)**\n\n` +
        `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿${priceA}** / เด็ก **฿${priceC}**\n` +
        `• **จุดท่องเที่ยวไฮไลท์**:\n` +
        `  - ถ่ายรูปชมความงามระดับโลกที่ **อ่าวมาหยา** (Maya Bay)\n` +
        `  - กระโดดเล่นน้ำ พายแพดเดิลบอร์ดที่ **ปิเละลากูน** (Pileh Lagoon สระว่ายน้ำกลางทะเล)\n` +
        `  - ดำน้ำตื้นชมปะการังและฝูงปลาหลากสีสัน\n` +
        `  - พักผ่อนชายหาดขาวละเอียดที่ **เกาะไข่นอก**\n` +
        `• **บริการที่รวมในแพ็กเกจ**: รถตู้ VIP รับส่งโรงแรม, บุฟเฟต์อาหารกลางวัน, ผลไม้และเครื่องดื่ม, อุปกรณ์ดำน้ำ Snorkel, เสื้อชูชีพ, ไกด์มืออาชีพ และประกันภัยอุบัติเหตุทางทะเลค่ะ\n\n` +
        `กดปุ่ม **"จองทัวร์นี้"** บนหน้าเว็บเพื่อรับสิทธิ์โปรโมชั่นได้เลยค่ะ!`;
    }

    if (lower.includes('พังงา') || lower.includes('phang nga') || lower.includes('เจมส์บอนด์') || lower.includes('james bond') || lower.includes('เกาะห้อง') || lower.includes('เกาะปันหยี') || lower.includes('แคนู')) {
      const jbTour = tours.find(t => t.id.includes('james-bond') || t.title.TH.includes('เจมส์บอนด์') || t.title.TH.includes('พังงา'));
      const priceA = jbTour ? jbTour.priceAdult.toLocaleString() : '1,690';
      const priceC = jbTour ? jbTour.priceChild.toLocaleString() : '1,290';
      return `🚣 **ทัวร์อ่าวพังงา - เขาตะปู - เกาะเจมส์บอนด์ & พายแคนูเกาะห้อง**\n\n` +
        `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿${priceA}** / เด็ก **฿${priceC}**\n` +
        `• **จุดท่องเที่ยวไฮไลท์**:\n` +
        `  - สัมผัสความมหัศจรรย์ของ **เขาตะปู (James Bond Island)** สถานที่ถ่ายทำภาพยนตร์ 007\n` +
        `  - ล่องเรือแคนูลอดถ้ำหินงอกหินย้อยตระการตาที่ **เกาะห้อง พังงา** (มีสต๊าฟพายให้ นั่งชิลล์สบาย)\n` +
        `  - ทานอาหารกลางวันบน **เกาะปันหยี** หมู่บ้านชาวเลกลางน้ำชื่อดัง\n` +
        `• **บริการที่รวมในแพ็กเกจ**: รถตู้รับส่ง, อาหารกลางวัน, เรือแคนูพร้อมคนพาย, ไกด์ และประกันภัย ททท. ค่ะ!`;
    }

    if (lower.includes('ยอชท์') || lower.includes('yacht') || lower.includes('คาทามารัน') || lower.includes('catamaran') || lower.includes('พระอาทิตย์ตก') || lower.includes('sunset') || lower.includes('แหลมพรหมเทพ') || lower.includes('เกาะเฮ') || lower.includes('coral island')) {
      const yachtTour = tours.find(t => t.id.includes('yacht') || t.title.TH.includes('ยอชท์'));
      const priceA = yachtTour ? yachtTour.priceAdult.toLocaleString() : '2,490';
      const priceC = yachtTour ? yachtTour.priceChild.toLocaleString() : '1,790';
      return `⛵ **ล่องเรือยอชท์คาทามารันสุดหรู เกาะเฮ (Coral Island) & ชมพระอาทิตย์ตกแหลมพรหมเทพ**\n\n` +
        `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿${priceA}** / เด็ก **฿${priceC}**\n` +
        `• **ความพิเศษและไฮไลท์**:\n` +
        `  - พักผ่อนและถ่ายรูปสวยสไตล์ Luxury บนตาข่ายหน้าเรือยอชท์\n` +
        `  - ดำน้ำและเล่นกิจกรรมทางน้ำที่ **เกาะเฮ (Banana Beach / Coral Island)**\n` +
        `  - ล่องเรือชมแสงทไวไลท์และพระอาทิตย์ตกดินสุดโรแมนติก ณ จุดชมวิว **แหลมพรหมเทพ**\n` +
        `• **บริการที่รวม**: เซ็ตอาหารและเครื่องดื่มบนเรือ, อุปกรณ์ดำน้ำ Snorkeling, ผ้าเช็ดตัว, ไกด์ และประกันภัยค่ะ!`;
    }

    // 3. Price & Promotions
    if (lower.includes('ราคา') || lower.includes('price') || lower.includes('โปร') || lower.includes('แพง') || lower.includes('cost') || lower.includes('เท่าไหร่') || lower.includes('กี่บาท')) {
      return `💰 **ราคาโปรโมชั่นทัวร์ภูเก็ตสุดคุ้มประจำวันนี้ค่ะ**:\n\n${tourListText}\n\n✅ ทุกแพ็กเกจเป็นราคารวมทุกอย่างแล้ว ไม่มีค่าใช้จ่ายแอบแฝง\n✅ รวมรถตู้รับ-ส่งฟรีจากโรงแรมในภูเก็ต (ป่าตอง, กะรน, กะตะ, ตัวเมืองภูเก็ต ฯลฯ)\n✅ ชำระง่ายผ่าน PromptPay QR Code พร้อมออก E-Ticket ทันทีค่ะ!`;
    }

    // 4. Booking & Payment Steps
    if (lower.includes('จอง') || lower.includes('book') || lower.includes('ชำระ') || lower.includes('จ่าย') || lower.includes('โอน') || lower.includes('สแกน') || lower.includes('พร้อมเพย์') || lower.includes('promptpay') || lower.includes('สลิป') || lower.includes('slip') || lower.includes('เงิน')) {
      return `💳 **ขั้นตอนการจองและชำระเงินง่ายๆ ใน 4 ขั้นตอนค่ะ**:\n\n` +
        `1️⃣ **เลือกทัวร์และวันที่ต้องการเดินทาง**: กดปุ่ม "จองทัวร์นี้" บนโปรแกรมที่ท่านต้องการ\n` +
        `2️⃣ **กรอกข้อมูลผู้เดินทาง**: ระบุชื่อ, เบอร์โทร และชื่อโรงแรมที่พักในภูเก็ตสำหรับให้รถตู้ไปรับ\n` +
        `3️⃣ **สแกนจ่ายผ่าน PromptPay QR**: สแกนจ่ายได้ทุกแอปธนาคาร ยอดเงินตรง สะดวก รวดเร็ว ไม่มีค่าธรรมเนียม\n` +
        `4️⃣ **แนบสลิป รับ E-Ticket ทันที**: ระบบจะตรวจสอบและออกตั๋ว Voucher อิเล็กทรอนิกส์พร้อมส่งแจ้งเตือนเข้า LINE ทันทีค่ะ\n\n` +
        `💬 หรือหากสะดวกจองผ่านแอดมิน ทัก LINE ได้ที่: **${line}** ได้ตลอด 24 ชม. ค่ะ`;
    }

    // 5. Hotel Transfer & Pickup Time
    if (lower.includes('รับส่ง') || lower.includes('โรงแรม') || lower.includes('hotel') || lower.includes('pickup') || lower.includes('เวลารับ') || lower.includes('กี่โมง') || lower.includes('zone') || lower.includes('โซน')) {
      return `🚐 **บริการรถรับ-ส่งโรงแรมในจังหวัดภูเก็ต**:\n\n` +
        `• **เวลานัดรับช่วงเช้า**: ประมาณ **07:30 - 08:00 น.** (ขึ้นอยู่กับทำเลที่ตั้งของโรงแรมท่าน)\n` +
        `• **เวลาเดินทางกลับส่งโรงแรม**: ประมาณ **16:30 - 17:30 น.**\n` +
        `• **โซนรับส่งฟรี**: ป่าตอง, กะรน, กะตะ, ในหาน, ราไวย์, ฉลอง และตัวเมืองภูเก็ต\n` +
        `• **การนัดหมาย**: คนขับรถตู้ VIP จะไปรับท่านที่หน้าล็อบบี้โรงแรมตามเวลาที่ระบุบนตั๋ว E-Ticket ค่ะ\n\n` +
        `📌 ก่อนวันเดินทาง 1 วัน ระบบจะมีข้อความแจ้งเตือนคอนเฟิร์มเวลารับส่งผ่านทาง LINE อีกครั้งเพื่อความอุ่นใจค่ะ!`;
    }

    // 6. TAT License & Safety & Insurance
    if (lower.includes('ใบอนุญาต') || lower.includes('ททท') || lower.includes('tat') || lower.includes('ประกัน') || lower.includes('ถูกต้อง') || lower.includes('ปลอดภัย') || lower.includes('license') || lower.includes('safe') || lower.includes('insurance')) {
      return `🛡️ **ความปลอดภัยและความน่าเชื่อถือที่ Trip Sea Tour Phuket**:\n\n` +
        `• **ใบอนุญาตประกอบธุรกิจนำเที่ยว ททท.**: เลขที่ **${tat}** (ออกโดยกรมการท่องเที่ยวแห่งประเทศไทย ตรวจสอบได้ 100%)\n` +
        `• **ประกันภัยอุบัติเหตุทางทะเล**: คุ้มครองผู้โดยสารทุกท่าน ทุกที่นั่ง ตามมาตรฐานสากล\n` +
        `• **กัปตันและทีมงานมืออาชีพ**: ผ่านการอบรมด้านความปลอดภัยและการปฐมพยาบาลเบื้องต้น (CPR)\n` +
        `• **อุปกรณ์ความปลอดภัยครบครัน**: เสื้อชูชีพมาตรฐานสำหรับผู้ใหญ่และเด็กเล็กบนเรือทุกลำค่ะ!`;
    }

    // 7. Things to prepare / Weather
    if (lower.includes('เตรียม') || lower.includes('เตรียมตัว') || lower.includes('นำอะไรไป') || lower.includes('แต่งตัว') || lower.includes('เสื้อผ้า') || lower.includes('pack') || lower.includes('weather') || lower.includes('ฝน') || lower.includes('คลื่น')) {
      return `🎒 **สิ่งที่ควรเตรียมสำหรับทริปทะเลภูเก็ตค่ะ**:\n\n` +
        `1. ชุดว่ายน้ำ หรือชุดลำลองที่แห้งง่าย\n` +
        `2. ชุดเปลี่ยน 1 ชุดสำหรับเปลี่ยนขากลับ\n` +
        `3. ผ้าเช็ดตัว, หมวกปีกกว้าง, แว่นตากันแดด\n` +
        `4. ครีมกันแดดที่เป็นมิตรต่อปะการัง (Reef-Safe Sunscreen)\n` +
        `5. ซองกันน้ำสำหรับโทรศัพท์มือถือ\n` +
        `6. ยาประจำตัว (บนเรือมีบริการยาแก้เมาคลื่นและกล่องปฐมพยาบาลฟรีค่ะ)\n\n` +
        `🌊 กรณีคลื่นลมหรือสภาพอากาศไม่เอื้ออำนวย บริษัทจะแจ้งล่วงหน้าและปรับเปลี่ยนวันเดินทางหรือคืนเงินตามเงื่อนไขอย่างปลอดภัยที่สุดค่ะ!`;
    }

    // 8. Contact Hotline / Social Links
    if (lower.includes('ติดต่อ') || lower.includes('เบอร์') || lower.includes('โทร') || lower.includes('ไลน์') || lower.includes('line') || lower.includes('facebook') || lower.includes('เฟส') || lower.includes('call') || lower.includes('phone')) {
      return `📞 **ช่องทางติดต่อ บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด**:\n\n` +
        `• 📱 **เบอร์โทรศัพท์สายด่วน (Hotline 24 ชม.)**: **${phone}**\n` +
        `• 💬 **LINE Official Account**: **${line}** (แอดไลน์สอบถามได้ตลอด 24 ชม.)\n` +
        `• 🌐 **Facebook Page**: [Trip Sea Tour Phuket](${fb})\n` +
        `• 📍 **สำนักงาน**: ภูเก็ต ประเทศไทย\n` +
        `• 🛡️ **ใบอนุญาต ททท.**: เลขที่ **${tat}**\n\n` +
        `ทีมงานพร้อมให้บริการและดูแลทุกท่านด้วยความยินดียิ่งค่ะ!`;
    }

    // General Comprehensive Answer
    return `ขอบคุณสำหรับคำถามค่ะ 😊🌊\n\n**Trip Sea Tour Phuket** ยินดีให้บริการข้อมูลทัวร์ทะเลภูเก็ต เกาะพีพี อ่าวพังงา และเรือยอชท์ชมพระอาทิตย์ตก พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\n` +
      `📌 **โปรแกรมแนะนำยอดนิยม**:\n${tourListText}\n\n` +
      `ท่านสามารถคลิกดูรายละเอียดและกด **"จองทัวร์"** บนหน้าเว็บได้ทันที หรือสอบถามเจ้าหน้าที่ทาง LINE: **${line}** (โทร **${phone}**) ได้ตลอด 24 ชม. เลยนะคะ!`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          language: activeLang
        })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || generateClientSmartAnswer(query);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Safe fallback without error
        const fallbackText = generateClientSmartAnswer(query);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.warn('Chat network notice, using local intelligent engine:', err);
      const fallbackText = generateClientSmartAnswer(query);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'เริ่มต้นบทสนทนาใหม่แล้วค่ะ ✨ สามารถพิมพ์สอบถามข้อมูลทัวร์ภูเก็ต ราคา และการจองได้เลยนะคะ',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to render bold markdown and newlines
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((lineText, idx) => {
      const parts = lineText.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={`${lineText.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'} leading-relaxed`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-teal-950">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-teal-100 text-xs font-semibold text-slate-800 animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span>สอบถาม AI ผู้ช่วย 24 ชม.</span>
          </div>

          <button
            id="open-ai-chatbot-btn"
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-tr from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-full shadow-xl shadow-teal-900/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group relative"
            title="คุยกับ TripSeaTour AI ผู้ช่วย 24 ชม."
          >
            <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-white">
              AI 24/7
            </span>
          </button>
        </div>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-teal-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-teal-600/60 border border-teal-400/40 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-teal-200" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-teal-800 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight">TripSeaTour AI</h3>
                  <span className="bg-teal-900/80 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-600/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    Gemini 24/7
                  </span>
                </div>
                <p className="text-[11px] text-teal-200/90 font-medium">
                  ผู้ช่วยอัจฉริยะตอบคำถามทันที
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-teal-200 hover:text-white hover:bg-teal-600/50 rounded-xl transition"
                title="ล้างบทสนทนา"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-teal-200 hover:text-white hover:bg-teal-600/50 rounded-xl transition"
                title="ปิดหน้าต่างแชท"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick FAQ Chips */}
          <div className="bg-teal-50/70 border-b border-teal-100/80 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q.query)}
                className="whitespace-nowrap bg-white hover:bg-teal-100/60 text-teal-900 border border-teal-200/80 text-[11px] font-semibold px-2.5 py-1 rounded-full transition shadow-xs shrink-0 active:scale-95"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 text-xs">
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl p-3 shadow-xs ${
                      isAi
                        ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                        : 'bg-teal-600 text-white font-medium rounded-tr-xs shadow-teal-900/10'
                    }`}
                  >
                    <div className="space-y-1">
                      {renderMessageContent(msg.text)}
                    </div>
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isAi ? 'text-slate-400' : 'text-teal-200'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isAi && (
                    <div className="w-7 h-7 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-600">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></span>
                    <span className="text-[11px] text-slate-500 ml-1">กำลังคิดคำตอบ...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="พิมพ์คำถามเกี่ยวกับทัวร์ภูเก็ต เช่น ราคา เกาะพีพี..."
                className="flex-1 bg-slate-100/90 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-10 h-10 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white rounded-2xl flex items-center justify-center transition shrink-0 shadow-md shadow-teal-900/20 active:scale-95"
                title="ส่งข้อความ"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
