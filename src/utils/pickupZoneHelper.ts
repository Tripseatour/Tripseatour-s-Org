import { PickupZoneConfig, Tour, Language } from '../types';

export const PHUKET_ZONE_TRANSLATIONS: Record<string, Record<Language, string>> = {
  patong: {
    TH: 'ป่าตอง',
    EN: 'Patong',
    ZH: '芭东 (Patong)',
    RU: 'Патонг (Patong)'
  },
  kata_karon: {
    TH: 'กะตะ / กะรน',
    EN: 'Kata / Karon',
    ZH: '卡塔 / 卡伦 (Kata / Karon)',
    RU: 'Ката / Карон (Kata / Karon)'
  },
  kata: {
    TH: 'กะตะ',
    EN: 'Kata',
    ZH: '卡塔 (Kata)',
    RU: 'Ката (Kata)'
  },
  karon: {
    TH: 'กะรน',
    EN: 'Karon',
    ZH: '卡伦 (Karon)',
    RU: 'Карон (Karon)'
  },
  phuket_town: {
    TH: 'ตัวเมืองภูเก็ต',
    EN: 'Phuket Town',
    ZH: '普吉镇 (Phuket Town)',
    RU: 'Пхукет Таун (Phuket Town)'
  },
  chalong: {
    TH: 'ฉลอง',
    EN: 'Chalong',
    ZH: '查龙 (Chalong)',
    RU: 'Чалонг (Chalong)'
  },
  rawai: {
    TH: 'ราไวย์ / ในหาน',
    EN: 'Rawai / Nai Harn',
    ZH: '拉威 / 奈汉 (Rawai / Nai Harn)',
    RU: 'Раваи / Най Харн (Rawai / Nai Harn)'
  },
  kamala: {
    TH: 'กมลา',
    EN: 'Kamala',
    ZH: '卡马拉 (Kamala)',
    RU: 'Камала (Kamala)'
  },
  surin_bangtao: {
    TH: 'สุรินทร์ / บางเทา / ลากูน่า',
    EN: 'Surin / Bangtao / Laguna',
    ZH: '素林 / 邦涛 / 拉古娜 (Surin / Bangtao / Laguna)',
    RU: 'Сурин / Бангтао / Лагуна (Surin / Bangtao / Laguna)'
  },
  panwa: {
    TH: 'แหลมพันวา',
    EN: 'Cape Panwa',
    ZH: '攀瓦角 (Cape Panwa)',
    RU: 'Мыс Панва (Cape Panwa)'
  },
  mai_khao: {
    TH: 'ไม้ขาว / ในทอน / ในยาง',
    EN: 'Mai Khao / Naithon / Nai Yang',
    ZH: '迈考 / 奈通 / 奈扬 (Mai Khao / Naithon / Nai Yang)',
    RU: 'Май Кхао / Найтон / Най Янг'
  },
  airport: {
    TH: 'สนามบินภูเก็ต / รถส่วนตัว',
    EN: 'Phuket Airport / Private Transfer',
    ZH: '普吉机场 / 私人包车 (Phuket Airport)',
    RU: 'Аэропорт Пхукет / Трансфер'
  }
};

export const DEFAULT_PHUKET_PICKUP_ZONES: PickupZoneConfig[] = [
  { id: 'zone-patong', zoneName: 'Patong (ป่าตอง)', isFree: true, extraFee: 0 },
  { id: 'zone-kata-karon', zoneName: 'Kata / Karon (กะตะ / กะรอน)', isFree: true, extraFee: 0 },
  { id: 'zone-phuket-town', zoneName: 'Phuket Town (ตัวเมืองภูเก็ต)', isFree: true, extraFee: 0 },
  { id: 'zone-chalong', zoneName: 'Chalong (ฉลอง)', isFree: true, extraFee: 0 },
  { id: 'zone-rawai', zoneName: 'Rawai / Nai Harn (ราไวย์ / ในหาน)', isFree: true, extraFee: 0 },
  { id: 'zone-kamala', zoneName: 'Kamala (กมลา)', isFree: false, extraFee: 100 },
  { id: 'zone-surin-bangtao', zoneName: 'Surin / Bangtao / Laguna (สุรินทร์ / บางเทา / ลากูน่า)', isFree: false, extraFee: 100 },
  { id: 'zone-panwa', zoneName: 'Cape Panwa (แหลมพันวา)', isFree: false, extraFee: 200 },
  { id: 'zone-mai-khao', zoneName: 'Mai Khao / Naithon / Nai Yang (ไม้ขาว / ในทอน / ในยาง)', isFree: false, extraFee: 200 },
  { id: 'zone-airport', zoneName: 'Phuket Airport / Private Transfer (สนามบินภูเก็ต)', isFree: false, extraFee: 500 }
];

export function getZoneDisplayName(zoneInput: PickupZoneConfig | string | null | undefined, lang: Language = 'TH'): string {
  if (!zoneInput) return '';

  const rawStr = typeof zoneInput === 'string' ? zoneInput : (zoneInput.zoneName || zoneInput.id || '');
  if (!rawStr.trim()) return '';

  // In Thai mode (or if no translation needed), return the EXACT text configured in the back office!
  if (lang === 'TH') {
    return rawStr;
  }

  const lower = rawStr.toLowerCase().trim();
  let matchedKey = '';

  if (lower.includes('airport') || lower.includes('สนามบิน') || lower.includes('аэропорт') || lower.includes('机场')) {
    matchedKey = 'airport';
  } else if (lower.includes('mai khao') || lower.includes('maikhao') || lower.includes('naithon') || lower.includes('nai yang') || lower.includes('ไม้ขาว') || lower.includes('ในทอน') || lower.includes('ในยาง') || lower.includes('迈考')) {
    matchedKey = 'mai_khao';
  } else if (lower.includes('panwa') || lower.includes('พันวา') || lower.includes('панва') || lower.includes('攀瓦')) {
    matchedKey = 'panwa';
  } else if (lower.includes('surin') || lower.includes('bangtao') || lower.includes('laguna') || lower.includes('สุรินทร์') || lower.includes('บางเทา') || lower.includes('ลากูน่า') || lower.includes('邦涛') || lower.includes('素林')) {
    matchedKey = 'surin_bangtao';
  } else if (lower.includes('kamala') || lower.includes('กมลา') || lower.includes('камала') || lower.includes('卡马拉')) {
    matchedKey = 'kamala';
  } else if (lower.includes('rawai') || lower.includes('nai harn') || lower.includes('ราไวย์') || lower.includes('ในหาน') || lower.includes('раваи') || lower.includes('拉威')) {
    matchedKey = 'rawai';
  } else if (lower.includes('chalong') || lower.includes('ฉลอง') || lower.includes('чалонг') || lower.includes('查龙')) {
    matchedKey = 'chalong';
  } else if (lower.includes('phuket town') || lower.includes('ตัวเมือง') || lower.includes('пхукет таун') || lower.includes('普吉镇') || lower === 'town') {
    matchedKey = 'phuket_town';
  } else if ((lower.includes('kata') || lower.includes('กะตะ') || lower.includes('ката') || lower.includes('卡塔')) &&
             (lower.includes('karon') || lower.includes('กะรน') || lower.includes('карон') || lower.includes('卡伦'))) {
    matchedKey = 'kata_karon';
  } else if (lower.includes('kata') || lower.includes('กะตะ') || lower.includes('ката') || lower.includes('卡塔')) {
    matchedKey = 'kata';
  } else if (lower.includes('karon') || lower.includes('กะรน') || lower.includes('карон') || lower.includes('卡伦')) {
    matchedKey = 'karon';
  } else if (lower.includes('patong') || lower.includes('ป่าตอง') || lower.includes('патонг') || lower.includes('芭东')) {
    matchedKey = 'patong';
  }

  if (matchedKey && PHUKET_ZONE_TRANSLATIONS[matchedKey]) {
    return PHUKET_ZONE_TRANSLATIONS[matchedKey][lang] || PHUKET_ZONE_TRANSLATIONS[matchedKey].EN || rawStr;
  }

  // Fallback for custom or unmapped strings
  return rawStr;
}

export function getZoneTransferStatusLabel(isFree: boolean, extraFee: number, lang: Language = 'TH'): string {
  if (isFree || !extraFee || extraFee === 0) {
    if (lang === 'TH') return 'รับ-ส่งฟรี';
    if (lang === 'ZH') return '免费接送';
    if (lang === 'RU') return 'Бесплатный трансфер';
    return 'Free Transfer';
  }

  if (lang === 'TH') return `+฿${extraFee} / ท่าน`;
  if (lang === 'ZH') return `+฿${extraFee} / 人`;
  if (lang === 'RU') return `+฿${extraFee} / гостей`;
  return `+฿${extraFee} / guest`;
}

export function getEffectivePickupZones(tour?: Tour | null): PickupZoneConfig[] {
  if (!tour) return DEFAULT_PHUKET_PICKUP_ZONES;

  if (tour.pickupZoneConfigs && Array.isArray(tour.pickupZoneConfigs) && tour.pickupZoneConfigs.length > 0) {
    return tour.pickupZoneConfigs;
  }

  // Fallback if tour only has pickupAreas string array
  if (tour.pickupAreas && Array.isArray(tour.pickupAreas) && tour.pickupAreas.length > 0) {
    const customZones: PickupZoneConfig[] = tour.pickupAreas.map((area, idx) => {
      const isFreeDefault = ['patong', 'kata', 'karon', 'phuket town', 'chalong', 'rawai', 'กะตะ', 'กะรอน', 'ป่าตอง', 'ตัวเมือง'].some(kw => area.toLowerCase().includes(kw));
      return {
        id: `zone-area-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        zoneName: area,
        isFree: isFreeDefault,
        extraFee: isFreeDefault ? 0 : 150
      };
    });

    // Merge default standard zones if not present
    DEFAULT_PHUKET_PICKUP_ZONES.forEach(defZone => {
      const exists = customZones.some(cz => cz.zoneName.toLowerCase().includes(defZone.zoneName.split(' ')[0].toLowerCase()));
      if (!exists) {
        customZones.push(defZone);
      }
    });

    return customZones;
  }

  return DEFAULT_PHUKET_PICKUP_ZONES;
}

export function getZoneExtraFeePerGuest(zones: PickupZoneConfig[], selectedZoneName: string): number {
  if (!selectedZoneName || !zones || !zones.length) return 0;

  const found = zones.find(z => 
    z.zoneName.toLowerCase().trim() === selectedZoneName.toLowerCase().trim() ||
    selectedZoneName.toLowerCase().trim().includes(z.zoneName.split(' ')[0].toLowerCase().trim()) ||
    z.zoneName.toLowerCase().trim().includes(selectedZoneName.split(' ')[0].toLowerCase().trim())
  );

  if (!found) return 0;
  if (found.isFree) return 0;
  return Number(found.extraFee) || 0;
}
