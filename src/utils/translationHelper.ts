import { Language } from '../types';

/**
 * Intelligent tourism dictionary for automatic fallback localization
 * Ensures instant translation for common Phuket & Andaman island destinations
 */
const THAI_TO_ENG_KEYWORDS: Array<[RegExp, string]> = [
  [/ทัวร์เกาะพีพี|เกาะพีพี/gi, 'Phi Phi Islands'],
  [/อ่าวมาหยา/gi, 'Maya Bay'],
  [/เกาะไข่(นอก|ใน)?/gi, 'Khai Island'],
  [/เกาะเจมส์บอนด์|เขาตะปู/gi, 'James Bond Island'],
  [/อ่าวพังงา/gi, 'Phang Nga Bay'],
  [/เกาะห้อง/gi, 'Hong Island'],
  [/เกาะราชา|เกาะรายา/gi, 'Racha Island'],
  [/เกาะเฮ|บานาน่าบีช/gi, 'Coral Island (Banana Beach)'],
  [/เกาะไม้ท่อน/gi, 'Maiton Island'],
  [/เกาะสิมิลัน/gi, 'Similan Islands'],
  [/เกาะสุรินทร์/gi, 'Surin Islands'],
  [/แหลมพรหมเทพ/gi, 'Promthep Cape'],
  [/เรือสปีดโบ๊ท|สปีดโบ๊ต/gi, 'Speedboat'],
  [/เรือยอชท์คาทามารัน|เรือยอชท์|คาทามารัน/gi, 'Luxury Catamaran Yacht'],
  [/พระอาทิตย์ตก|ชมพระอาทิตย์ตก/gi, 'Sunset Cruise'],
  [/ปางช้าง|ช้าง/gi, 'Elephant Sanctuary'],
  [/ซิตี้ทัวร์|รอบเมืองภูเก็ต|เที่ยวเมือง/gi, 'Phuket City Tour'],
  [/ดำน้ำตื้น|ดำน้ำ/gi, 'Snorkeling'],
  [/พายแคนู|แคนู/gi, 'Sea Canoeing'],
  [/เต็มวัน/gi, 'Full Day'],
  [/ครึ่งวัน/gi, 'Half Day'],
  [/บุฟเฟต์อาหารกลางวัน|อาหารกลางวัน/gi, 'Buffet Lunch'],
  [/รถรับส่ง/gi, 'Hotel Transfer']
];

const THAI_TO_ZH_KEYWORDS: Array<[RegExp, string]> = [
  [/ทัวร์เกาะพีพี|เกาะพีพี/gi, '皮皮岛'],
  [/อ่าวมาหยา/gi, '玛雅湾'],
  [/เกาะไข่(นอก|ใน)?/gi, '蛋岛'],
  [/เกาะเจมส์บอนด์|เขาตะปู/gi, '007詹姆斯邦德岛'],
  [/อ่าวพังงา/gi, '攀牙湾'],
  [/เกาะห้อง/gi, '洪岛'],
  [/เกาะราชา|เกาะรายา/gi, '皇帝岛'],
  [/เกาะเฮ|บานาน่าบีช/gi, '珊瑚岛'],
  [/เกาะไม้ท่อน/gi, '蜜月岛'],
  [/เกาะสิมิลัน/gi, '斯米兰群岛'],
  [/เกาะสุรินทร์/gi, '素林群岛'],
  [/แหลมพรหมเทพ/gi, '神仙半岛'],
  [/เรือสปีดโบ๊ท|สปีดโบ๊ต/gi, '快艇'],
  [/เรือยอชท์คาทามารัน|เรือยอชท์|คาทามารัน/gi, '豪华双体帆船游艇'],
  [/พระอาทิตย์ตก|ชมพระอาทิตย์ตก/gi, '日落之旅'],
  [/ปางช้าง|ช้าง/gi, '大象保护区'],
  [/ซิตี้ทัวร์|รอบเมืองภูเก็ต|เที่ยวเมือง/gi, '普吉环岛观光'],
  [/ดำน้ำตื้น|ดำน้ำ/gi, '浮潜'],
  [/พายแคนู|แคนู/gi, '皮划艇'],
  [/เต็มวัน/gi, '全天'],
  [/ครึ่งวัน/gi, '半天'],
  [/บุฟเฟต์อาหารกลางวัน|อาหารกลางวัน/gi, '海边自助午餐'],
  [/รถรับส่ง/gi, '酒店往返接送']
];

const THAI_TO_RU_KEYWORDS: Array<[RegExp, string]> = [
  [/ทัวร์เกาะพีพี|เกาะพีพี/gi, 'Острова Пхи-Пхи'],
  [/อ่าวมาหยา/gi, 'Бухта Майя Бэй'],
  [/เกาะไข่(นอก|ใน)?/gi, 'Остров Кхай'],
  [/เกาะเจมส์บอนด์|เขาตะปู/gi, 'Остров Джеймса Бонда'],
  [/อ่าวพังงา/gi, 'Залив Пханг Нга'],
  [/เกาะห้อง/gi, 'Остров Хонг'],
  [/เกาะราชา|เกาะรายา/gi, 'Остров Рача'],
  [/เกาะเฮ|บานาน่าบีช/gi, 'Коралловый остров'],
  [/เกาะไม้ท่อน/gi, 'Остров Майтон'],
  [/เกาะสิมิลัน/gi, 'Симиланские острова'],
  [/เกาะสุรินทร์/gi, 'Суринские острова'],
  [/แหลมพรหมเทพ/gi, 'Мыс Промтхеп'],
  [/เรือสปีดโบ๊ท|สปีดโบ๊ต/gi, 'Скоростной катер'],
  [/เรือยอชท์คาทามารัน|เรือยอชท์|คาทามารัน/gi, 'Яхта-Катамаран'],
  [/พระอาทิตย์ตก|ชมพระอาทิตย์ตก/gi, 'Морской круиз на закате'],
  [/ปางช้าง|ช้าง/gi, 'Заповедник слонов'],
  [/ซิตี้ทัวร์|รอบเมืองภูเก็ต|เที่ยวเมือง/gi, 'Обзорный тур по Пхукету'],
  [/ดำน้ำตื้น|ดำน้ำ/gi, 'Снорклинг'],
  [/พายแคนู|แคนู/gi, 'Каноэ по пещерам'],
  [/เต็มวัน/gi, 'Полный день'],
  [/ครึ่งวัน/gi, 'Полдня'],
  [/บุฟเฟต์อาหารกลางวัน|อาหารกลางวัน/gi, 'Обед "шведский стол"'],
  [/รถรับส่ง/gi, 'Трансфер из отеля']
];

export function translateThaiTextRuleBased(text: string, targetLang: Language): string {
  if (!text || !text.trim()) return '';
  if (targetLang === 'TH') return text;

  let keywords = THAI_TO_ENG_KEYWORDS;
  if (targetLang === 'ZH') keywords = THAI_TO_ZH_KEYWORDS;
  if (targetLang === 'RU') keywords = THAI_TO_RU_KEYWORDS;

  let translated = text;
  let matches: string[] = [];

  for (const [regex, replacement] of keywords) {
    if (regex.test(translated)) {
      matches.push(replacement);
      translated = translated.replace(regex, replacement);
    }
  }

  // If replaced keywords exist
  if (matches.length > 0) {
    if (targetLang === 'EN') {
      return matches.join(' - ') + (translated.includes('Tour') ? '' : ' Tour');
    }
    if (targetLang === 'ZH') {
      return matches.join(' + ') + '一日游';
    }
    if (targetLang === 'RU') {
      return 'Тур: ' + matches.join(', ');
    }
  }

  // Fallback defaults
  if (targetLang === 'EN') return `${text} (Phuket Tour)`;
  if (targetLang === 'ZH') return `${text} (普吉海岛游)`;
  if (targetLang === 'RU') return `${text} (Тур на Пхукете)`;

  return text;
}

export interface TranslationResult {
  titleEN: string;
  titleZH: string;
  titleRU: string;
  descEN: string;
  descZH: string;
  descRU: string;
  durationEN: string;
  durationZH: string;
  durationRU: string;
  translatedItinerary?: any[];
}

/**
 * High-reliability tour translation:
 * Calls `/api/translate-tour` with server AI, and automatically applies rule-based
 * tourism localization if API is offline or returns error.
 */
export async function translateTourData(params: {
  titleTH: string;
  descTH?: string;
  durationTH?: string;
  highlightsTH?: string[];
  category?: string;
  itinerarySteps?: any[];
}): Promise<TranslationResult> {
  const { titleTH, descTH = '', durationTH = 'เต็มวัน (08:00 - 17:00)', highlightsTH = [], category = 'island', itinerarySteps = [] } = params;

  // 1. First attempt: Remote API
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
      if (data && data.titleEN && data.titleEN !== titleTH) {
        return {
          titleEN: data.titleEN,
          titleZH: data.titleZH || translateThaiTextRuleBased(titleTH, 'ZH'),
          titleRU: data.titleRU || translateThaiTextRuleBased(titleTH, 'RU'),
          descEN: data.descEN || 'Experience the beauty of the Andaman Sea with premium tour service in Phuket.',
          descZH: data.descZH || '体验安达曼海的美景与普吉岛高品质出海一日游服务。',
          descRU: data.descRU || 'Откройте для себя красоту Андаманского моря с лучшим сервисом на Пхукете.',
          durationEN: data.durationEN || '08:00 AM - 05:00 PM (Full Day)',
          durationZH: data.durationZH || '08:00 - 17:00 (全天)',
          durationRU: data.durationRU || '08:00 - 17:00 (Полный день)',
          translatedItinerary: data.translatedItinerary
        };
      }
    }
  } catch (err) {
    console.warn('API translation unavailable, using smart offline localization engine:', err);
  }

  // 2. Intelligent Offline Fallback
  const titleEN = translateThaiTextRuleBased(titleTH, 'EN');
  const titleZH = translateThaiTextRuleBased(titleTH, 'ZH');
  const titleRU = translateThaiTextRuleBased(titleTH, 'RU');

  const descEN = descTH ? `${translateThaiTextRuleBased(descTH, 'EN')} - Professional guided tour in Phuket with hotel transfers & buffet lunch.` : 'Experience the turquoise waters and iconic islands of Phuket with first-class service.';
  const descZH = descTH ? `${translateThaiTextRuleBased(descTH, 'ZH')} - 普吉岛专业中文/英文导游，包含酒店接送及海边自助午餐。` : '探索普吉岛醉人的蓝海与标志性海岛，享受一站式贴心出海体验。';
  const descRU = descTH ? `${translateThaiTextRuleBased(descTH, 'RU')} - Незабываемый тур по островам Пхукета с трансфером и обедом.` : 'Незабываемое путешествие по бирюзовым водам и живописным островам Пхукета.';

  const durationEN = durationTH.includes('ครึ่ง') ? 'Half Day (08:30 - 13:00 / 13:30 - 18:00)' : 'Full Day (08:00 AM - 05:00 PM)';
  const durationZH = durationTH.includes('ครึ่ง') ? '半天 (08:30 - 13:00 / 13:30 - 18:00)' : '全天 (08:00 - 17:00)';
  const durationRU = durationTH.includes('ครึ่ง') ? 'Полдня (08:30 - 13:00 / 13:30 - 18:00)' : 'Полный день (08:00 - 17:00)';

  const translatedItinerary = Array.isArray(itinerarySteps)
    ? itinerarySteps.map(step => ({
        ...step,
        title: {
          TH: step.title?.TH || '',
          EN: (step.title?.EN && step.title.EN !== step.title?.TH) ? step.title.EN : translateThaiTextRuleBased(step.title?.TH || '', 'EN'),
          ZH: (step.title?.ZH && step.title.ZH !== step.title?.TH) ? step.title.ZH : translateThaiTextRuleBased(step.title?.TH || '', 'ZH'),
          RU: (step.title?.RU && step.title.RU !== step.title?.TH) ? step.title.RU : translateThaiTextRuleBased(step.title?.TH || '', 'RU'),
        },
        description: step.description ? {
          TH: step.description?.TH || '',
          EN: (step.description?.EN && step.description.EN !== step.description?.TH) ? step.description.EN : translateThaiTextRuleBased(step.description?.TH || '', 'EN'),
          ZH: (step.description?.ZH && step.description.ZH !== step.description?.TH) ? step.description.ZH : translateThaiTextRuleBased(step.description?.TH || '', 'ZH'),
          RU: (step.description?.RU && step.description.RU !== step.description?.TH) ? step.description.RU : translateThaiTextRuleBased(step.description?.TH || '', 'RU'),
        } : undefined
      }))
    : undefined;

  return {
    titleEN,
    titleZH,
    titleRU,
    descEN,
    descZH,
    descRU,
    durationEN,
    durationZH,
    durationRU,
    translatedItinerary
  };
}
