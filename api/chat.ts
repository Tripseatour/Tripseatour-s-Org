import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const DEFAULT_TOURS = [
  {
    id: 'phi-phi-maya-bamboo-speed-boat',
    title: {
      TH: 'ทัวร์เกาะพีพี - อ่าวมาหยา - ปิเละลากูน - เกาะไข่ (เรือสปีดโบ๊ท VIP)',
      EN: 'Phi Phi Islands, Maya Bay, Pileh Lagoon & Khai Island by Speedboat'
    },
    priceAdult: 1890,
    priceChild: 1390,
    originalPriceAdult: 2800,
    highlights: ['อ่าวมาหยา (Maya Bay)', 'ปิเละลากูน (Pileh Lagoon)', 'ถ้ำไวกิ้ง', 'หาดลิง', 'เกาะไข่นอก']
  },
  {
    id: 'james-bond-island-phang-nga-canoe',
    title: {
      TH: 'ทัวร์อ่าวพังงา - เกาะเจมส์บอนด์ (เขาตะปู) - พายแคนูเกาะห้อง & เกาะปันหยี',
      EN: 'Phang Nga Bay, James Bond Island & Sea Canoe at Hong Island'
    },
    priceAdult: 1990,
    priceChild: 1490,
    originalPriceAdult: 2900,
    highlights: ['เขาตะปู (James Bond 007)', 'พายเรือแคนูลอดถ้ำเกาะห้อง', 'หมู่บ้านลอยน้ำเกาะปันหยี', 'ถ้ำเขาพิงกัน']
  },
  {
    id: 'catamaran-sunset-coral-island-promthep',
    title: {
      TH: 'ล่องเรือยอชท์คาทามารันสุดหรู เกาะเฮ & ชมพระอาทิตย์ตกแหลมพรหมเทพ',
      EN: 'Luxury Catamaran Yacht Sunset: Coral Island & Promthep Cape'
    },
    priceAdult: 2490,
    priceChild: 1790,
    originalPriceAdult: 3500,
    highlights: ['ล่องเรือยอชท์ Catamaran สุดหรู', 'Banana Beach เกาะเฮ', 'ชมแสงทไวไลท์พระอาทิตย์ตกแหลมพรหมเทพ']
  }
];

function generateSmartFallbackReply(message: string, language: string = 'TH', settings: any = {}): string {
  const lower = (message || '').toLowerCase().trim();
  const phone = settings.contactPhone || '062-681-6494 / 097-924-1399';
  const lineOa = settings.lineOaId || '@056hxinu';
  const fb = settings.facebookUrl || 'https://www.facebook.com/tripseatoursphuket/';
  const tat = settings.tatLicenseNo || '33/11100';

  const tourListText = DEFAULT_TOURS.map((t, idx) => {
    const title = language === 'EN' ? t.title.EN : t.title.TH;
    return `🏝️ **${idx + 1}. ${title}**\n   • ราคาโปรโมชั่น: ผู้ใหญ่ **฿${t.priceAdult.toLocaleString()}** / เด็ก **฿${t.priceChild.toLocaleString()}** (จากปกติ ฿${t.originalPriceAdult.toLocaleString()})\n   • ไฮไลท์: ${t.highlights.slice(0, 3).join(', ')}`;
  }).join('\n\n');

  // 1. Greetings
  if (lower === 'สวัสดี' || lower === 'สวัสดีครับ' || lower === 'สวัสดีค่ะ' || lower.includes('hello') || lower.includes('hi') || lower === 'หวัดดี' || lower === 'ดีครับ' || lower === 'ดีค่ะ' || lower.includes('hey')) {
    return `สวัสดีค่ะ! ยินดีต้อนรับสู่ **Trip Sea Tour Phuket** ค่ะ 🌊✨\n\nเรามีบริการนำเที่ยวทางทะเลภูเก็ตครบวงจร พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\nโปรแกรมแนะนำยอดนิยมวันนี้:\n${tourListText}\n\n💬 ท่านสามารถสอบถามรายละเอียดโปรแกรม หรือจองทัวร์ผ่านระบบบนเว็บได้ทันที หรือแอดไลน์ **${lineOa}** (โทร **${phone}**) ได้ตลอด 24 ชม. เลยนะคะ!`;
  }

  // 2. Specific Islands / Tour Queries
  if (lower.includes('พีพี') || lower.includes('phi phi') || lower.includes('มาหยา') || lower.includes('maya') || lower.includes('ปิเละ') || lower.includes('pileh')) {
    return `🏝️ **ทัวร์เกาะพีพี - อ่าวมาหยา - ปิเละลากูน - เกาะไข่ (เรือสปีดโบ๊ท VIP)**\n\n` +
      `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿1,890** / เด็ก **฿1,390**\n` +
      `• **จุดท่องเที่ยวไฮไลท์**:\n` +
      `  - ถ่ายรูปชมความงามระดับโลกที่ **อ่าวมาหยา** (Maya Bay)\n` +
      `  - กระโดดเล่นน้ำ พายแพดเดิลบอร์ดที่ **ปิเละลากูน** (Pileh Lagoon สระว่ายน้ำกลางทะเล)\n` +
      `  - ดำน้ำตื้นชมปะการังและฝูงปลาหลากสีสัน ณ ถ้ำไวกิ้ง และหาดลิง\n` +
      `  - พักผ่อนชายหาดขาวละเอียดที่ **เกาะไข่นอก**\n` +
      `• **บริการที่รวมในแพ็กเกจ**: รถตู้ VIP รับส่งโรงแรม, บุฟเฟต์อาหารกลางวัน, ผลไม้และเครื่องดื่ม, อุปกรณ์ดำน้ำ Snorkel, เสื้อชูชีพ, ไกด์มืออาชีพ และประกันภัยอุบัติเหตุทางทะเลค่ะ\n\n` +
      `กดปุ่ม **"จองทัวร์นี้"** บนหน้าเว็บเพื่อรับสิทธิ์โปรโมชั่นได้เลยค่ะ!`;
  }

  if (lower.includes('พังงา') || lower.includes('phang nga') || lower.includes('เจมส์บอนด์') || lower.includes('james bond') || lower.includes('เกาะห้อง') || lower.includes('เกาะปันหยี') || lower.includes('แคนู')) {
    return `🚣 **ทัวร์อ่าวพังงา - เขาตะปู - เกาะเจมส์บอนด์ & พายแคนูเกาะห้อง**\n\n` +
      `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿1,990** / เด็ก **฿1,490**\n` +
      `• **จุดท่องเที่ยวไฮไลท์**:\n` +
      `  - สัมผัสความมหัศจรรย์ของ **เขาตะปู (James Bond Island)** สถานที่ถ่ายทำภาพยนตร์ 007\n` +
      `  - ล่องเรือแคนูลอดถ้ำหินงอกหินย้อยตระการตาที่ **เกาะห้อง พังงา** (มีสต๊าฟพายให้ นั่งชิลล์สบาย)\n` +
      `  - ทานอาหารกลางวันบน **เกาะปันหยี** หมู่บ้านชาวเลกลางน้ำชื่อดัง\n` +
      `• **บริการที่รวมในแพ็กเกจ**: รถตู้รับส่ง, อาหารกลางวัน, เรือแคนูพร้อมคนพาย, ไกด์ และประกันภัย ททท. ค่ะ!`;
  }

  if (lower.includes('ยอชท์') || lower.includes('yacht') || lower.includes('คาทามารัน') || lower.includes('catamaran') || lower.includes('พระอาทิตย์ตก') || lower.includes('sunset') || lower.includes('แหลมพรหมเทพ') || lower.includes('เกาะเฮ') || lower.includes('coral island')) {
    return `⛵ **ล่องเรือยอชท์คาทามารันสุดหรู เกาะเฮ (Coral Island) & ชมพระอาทิตย์ตกแหลมพรหมเทพ**\n\n` +
      `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿2,490** / เด็ก **฿1,790**\n` +
      `• **ความพิเศษและไฮไลท์**:\n` +
      `  - พักผ่อนและถ่ายรูปสวยสไตล์ Luxury บนตาข่ายหน้าเรือยอชท์ Catamaran\n` +
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
      `💬 หรือหากสะดวกจองผ่านแอดมิน ทัก LINE ได้ที่: **${lineOa}** ได้ตลอด 24 ชม. ค่ะ`;
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
      `• 💬 **LINE Official Account**: **${lineOa}** (แอดไลน์สอบถามได้ตลอด 24 ชม.)\n` +
      `• 🌐 **Facebook Page**: [Trip Sea Tour Phuket](${fb})\n` +
      `• 📍 **สำนักงาน**: ภูเก็ต ประเทศไทย\n` +
      `• 🛡️ **ใบอนุญาต ททท.**: เลขที่ **${tat}**\n\n` +
      `ทีมงานพร้อมให้บริการและดูแลทุกท่านด้วยความยินดียิ่งค่ะ!`;
  }

  // Default Comprehensive Tour Info
  return `ขอบคุณสำหรับคำถามค่ะ 😊🌊\n\n**Trip Sea Tour Phuket** ยินดีให้บริการข้อมูลทัวร์ทะเลภูเก็ต เกาะพีพี อ่าวพังงา และเรือยอชท์ชมพระอาทิตย์ตก พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\n` +
    `📌 **โปรแกรมแนะนำยอดนิยม**:\n${tourListText}\n\n` +
    `ท่านสามารถคลิกดูรายละเอียดและกด **"จองทัวร์"** บนหน้าเว็บได้ทันที หรือสอบถามเจ้าหน้าที่ทาง LINE: **${lineOa}** (โทร **${phone}**) ได้ตลอด 24 ชม. เลยนะคะ!`;
}

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { message = '', language = 'TH' } = body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try reading settings from Supabase if available
    let settings: any = {
      tatLicenseNo: '33/11100',
      contactPhone: '062-681-6494 / 097-924-1399',
      lineOaId: '@056hxinu',
      facebookUrl: 'https://www.facebook.com/tripseatoursphuket/'
    };

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await supabase.from('app_store').select('value').eq('key', 'tripsea_settings').single();
      if (data && data.value) {
        settings = { ...settings, ...data.value };
      }
    } catch (dbErr) {
      // ignore
    }

    // Try Gemini API if key is set
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are "TripSeaTour AI Assistant" (ผู้ช่วยอัจฉริยะ TripSeaTour 24/7 Powered by Gemini AI), the official 24/7 AI travel concierge for "Trip Sea Tour Phuket" (บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด).
TAT License: ${settings.tatLicenseNo || '33/11100'}
Hotline: ${settings.contactPhone || '062-681-6494 / 097-924-1399'}
LINE OA: ${settings.lineOaId || '@056hxinu'}
Provide friendly, warm, polite, and helpful travel advice in ${language}. Use clean markdown and emojis.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemInstruction}\n\nCustomer Question: ${message}`,
        });

        if (response && response.text) {
          return res.status(200).json({ reply: response.text });
        }
      } catch (aiErr: any) {
        console.warn('Vercel Gemini call warning (using smart fallback):', aiErr?.message || aiErr);
      }
    }

    // High accuracy smart rule-based knowledge engine
    const fallbackReply = generateSmartFallbackReply(message, language, settings);
    return res.status(200).json({ reply: fallbackReply });

  } catch (error: any) {
    console.error('Vercel /api/chat error:', error);
    const safeReply = generateSmartFallbackReply(
      req?.body?.message || '',
      req?.body?.language || 'TH',
      {}
    );
    return res.status(200).json({ reply: safeReply });
  }
}
