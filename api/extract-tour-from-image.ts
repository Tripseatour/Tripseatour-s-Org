import { GoogleGenAI } from '@google/genai';

// Helper to gather all configured Gemini API keys (Key Pool / Rotation)
function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const addKey = (k?: string) => {
    if (!k || typeof k !== 'string') return;
    k.split(/[\n,]/).forEach(item => {
      const clean = item.trim();
      if (clean && !clean.includes('MY_GEMINI_API_KEY') && !keys.includes(clean)) {
        keys.push(clean);
      }
    });
  };

  addKey(process.env.GEMINI_API_KEYS);
  addKey(process.env.VITE_GEMINI_API_KEYS);
  addKey(process.env.GEMINI_API_KEY);
  addKey(process.env.VITE_GEMINI_API_KEY);
  addKey(process.env.GEMINI_API_KEY_2);
  addKey(process.env.GEMINI_API_KEY_3);
  addKey(process.env.GEMINI_API_KEY_4);
  addKey(process.env.GEMINI_API_KEY_5);

  return keys;
}

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
    const { images, imageBase64, mimeType } = body;

    // Check Available Gemini API Keys Pool
    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
      return res.status(500).json({
        error: 'ยังไม่ได้ระบุ GEMINI_API_KEY ใน Vercel: กรุณาเข้าไปที่ Vercel Dashboard > Project Settings > Environment Variables แล้วเพิ่มตัวแปรชื่อ GEMINI_API_KEY หรือ GEMINI_API_KEY_2 พร้อมใส่ API Key จาก Google AI Studio'
      });
    }

    // Normalize into array of images
    const rawImages: Array<{ imageBase64: string; mimeType?: string }> = [];

    if (Array.isArray(images) && images.length > 0) {
      images.forEach((item: any) => {
        if (typeof item === 'string' && item.trim()) {
          rawImages.push({ imageBase64: item });
        } else if (item && typeof item === 'object' && item.imageBase64) {
          rawImages.push({
            imageBase64: item.imageBase64,
            mimeType: item.mimeType || 'image/jpeg'
          });
        }
      });
    } else if (imageBase64) {
      rawImages.push({ imageBase64, mimeType: mimeType || 'image/jpeg' });
    }

    if (rawImages.length === 0) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพโบรชัวร์หรือโปรแกรมทัวร์อย่างน้อย 1 รูป' });
    }

    // Limit to maximum 10 images
    const selectedImages = rawImages.slice(0, 10);

    const imageParts: any[] = [];
    selectedImages.forEach((img) => {
      let cleanBase64 = img.imageBase64;
      let detectedMime = img.mimeType || 'image/jpeg';
      if (cleanBase64.includes('base64,')) {
        const match = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          detectedMime = match[1] || detectedMime;
          cleanBase64 = match[2];
        }
      }

      imageParts.push({
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64,
        },
      });
    });

    const prompt = `You are an expert travel operations manager and itinerary specialist for Trip Sea Tour Phuket (a premier tour agency in Phuket, Thailand).
Analyze the provided tour brochure / flyer / timetable / poster image(s) thoroughly (${imageParts.length} page/image provided). 
These images may contain multiple pages of a tour program, such as:
1) Cover / Title / Overview page
2) Pricing & Inclusions table
3) Detailed Time Schedule / Itinerary timetable
4) Pickup zones, conditions, and what to bring

Carefully correlate, cross-reference, and synthesize ALL details across ALL uploaded images into a single cohesive, structured JSON.

Read all Thai and English text, pricing, schedules, highlights, destinations, inclusions, terms, and notes visible across all images.
If any text is in Thai, extract it accurately and also generate high quality English (EN), Simplified Chinese (ZH), and Russian (RU) translations for multi-language fields.
If specific prices are not explicitly written in the image, provide reasonable, realistic Phuket market rates (e.g., priceAdult: 1500-2500 THB, child ~70%).

Output ONLY a valid JSON object matching this exact schema (no markdown, no backticks, no extra text):
{
  "titleTH": "ชื่อโปรแกรมทัวร์ภาษาไทย เช่น ทัวร์เกาะพีพี อ่าวมาหยา เกาะไข่ สปีดโบ๊ท",
  "titleEN": "Tour Title in English",
  "titleZH": "Tour Title in Simplified Chinese",
  "titleRU": "Tour Title in Russian",
  "category": "island",
  "location": "สถานที่ เช่น เกาะพีพี - อ่าวมาหยา - เกาะไข่ หรือ ภูเก็ต / พังงา",
  "durationTH": "ระยะเวลา เช่น เต็มวัน (08:00 - 17:00)",
  "durationEN": "Full Day (08:00 AM - 05:00 PM)",
  "durationZH": "全天 (08:00 - 17:00)",
  "durationRU": "Полный день (08:00 - 17:00)",
  "priceAdult": 1800,
  "priceChild": 1200,
  "originalPriceAdult": 2500,
  "originalPriceChild": 1700,
  "costAdult": 1150,
  "costChild": 780,
  "descTH": "คำอธิบายโปรแกรมทัวร์อย่างละเอียด น่าดึงดูดใจ และครบถ้วน (ภาษาไทย)",
  "descEN": "Detailed and engaging tour description in English",
  "descZH": "Chinese tour description",
  "descRU": "Russian tour description",
  "highlightsTH": [
    "ไฮไลท์ 1 ที่ระบุในรูปภาพ",
    "ไฮไลท์ 2",
    "ไฮไลท์ 3",
    "ไฮไลท์ 4"
  ],
  "includedItemsTH": [
    "รถรับ-ส่งโรงแรม",
    "อาหารกลางวัน และเครื่องดื่ม",
    "อุปกรณ์ดำน้ำตื้นและเสื้อชูชีพ",
    "ประกันอุบัติเหตุการเดินทาง",
    "ไกด์นำเที่ยวมืออาชีพ"
  ],
  "itinerarySteps": [
    {
      "time": "07:30 - 08:30",
      "title": {
        "TH": "รถรับจากโรงแรมที่พัก สู่ท่าเรือ",
        "EN": "Hotel pickup and transfer to pier",
        "ZH": "酒店接送至码头",
        "RU": "Трансфер из отеля к причалу"
      },
      "description": {
        "TH": "เช็คอิน รับประทานอาหารว่าง ชา กาแฟ รับฟังบรรยายสรุป",
        "EN": "Check-in, light refreshments, and briefing",
        "ZH": "登记、享用茶点并听取安全讲解",
        "RU": "Регистрация, легкий перекус и инструктаж"
      }
    }
  ],
  "supplierName": "ชื่อบริษัทเรือหรือซัพพลายเออร์ถ้ามี",
  "notes": "ข้อความสำคัญเพิ่มเติม หรือสิ่งที่ควรนำมาด้วย"
}

Important:
- "category" must be strictly one of: "island", "sunset", "yacht", "eco", "sightseeing"
- Prices must be numbers (THB currency)
- Ensure all itinerary steps visible in the timetable are extracted accurately in chronological order with start/end times.`;

    const textPart = { text: prompt };

    let responseText = '';
    let lastError: any = null;
    let successfulKeyIndex = -1;

    // Multi-key rotation loop: automatically try next available key if one fails
    for (let i = 0; i < apiKeys.length; i++) {
      const activeKey = apiKeys[i];
      try {
        const ai = new GoogleGenAI({
          apiKey: activeKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [...imageParts, textPart] },
        });

        if (aiResponse && aiResponse.text) {
          responseText = aiResponse.text;
          successfulKeyIndex = i;
          break; // Success!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini Key #${i + 1} failed:`, err?.message || err);

        // If there are more keys in the pool, try the next one
        if (i < apiKeys.length - 1) {
          console.log(`Rotating to Gemini Key #${i + 2}...`);
          continue;
        }
      }
    }

    if (!responseText) {
      const errMsg = (lastError?.message || '').toLowerCase();
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('resource_exhausted')) {
        return res.status(429).json({
          error: `โควต้าการใช้งาน Gemini AI ชั่วคราวเต็ม (ระบบทดลองหมุนเวียนคีย์ทั้งหมด ${apiKeys.length} ตัวแล้ว) กรุณารอสักครู่ (1-2 นาที) แล้วลองใหม่อีกครั้ง หรือโควต้ารายวันจะรีเซ็ตเวลา 14:00 - 15:00 น. เวลาไทย`
        });
      }
      if (errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('high demand')) {
        return res.status(503).json({
          error: 'เซิร์ฟเวอร์ Gemini AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (High demand) กรุณากดลองใหม่อีกครั้งใน 1-2 นาที'
        });
      }
      return res.status(500).json({
        error: `เกิดข้อผิดพลาดในการประมวลผล Gemini AI: ${lastError?.message || 'ไม่สามารถวิเคราะห์ข้อมูลจากรูปภาพได้'}`
      });
    }

    const cleanJson = responseText.replace(/```json\s*|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      data: parsed,
      imageCount: imageParts.length,
      usedKeyIndex: successfulKeyIndex
    });
  } catch (err: any) {
    console.error('Vercel extract-tour-from-image error:', err);
    return res.status(500).json({
      error: err?.message || 'ไม่สามารถสกัดข้อมูลจากรูปภาพได้ กรุณาตรวจสอบรูปภาพและลองใหม่อีกครั้ง'
    });
  }
}
