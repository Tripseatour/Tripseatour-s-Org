import { TourAddon, Language } from '../types';

/**
 * Returns localized name for a tour addon in the given language
 */
export function getAddonDisplayName(addon: TourAddon, lang: Language): string {
  if (!addon) return '';

  // 1. If name is a multilingual Record { TH: '', EN: '', ZH: '', RU: '' }
  if (addon.name && typeof addon.name === 'object') {
    const loc = (addon.name as Record<Language, string>)[lang];
    if (loc && loc.trim()) return loc;
    return (addon.name as Record<Language, string>).TH || (addon.name as Record<Language, string>).EN || '';
  }

  // 2. If dedicated language property exists
  if (lang === 'EN' && addon.nameEN) return addon.nameEN;
  if (lang === 'ZH' && addon.nameZH) return addon.nameZH;
  if (lang === 'RU' && addon.nameRU) return addon.nameRU;
  if (lang === 'TH' && addon.nameTH) return addon.nameTH;

  // 3. Built-in translations for common tourism addons
  const str = typeof addon.name === 'string' ? addon.name : '';
  if (str) {
    if (str.includes('เดินทางไปท่าเรือเอง') || str.includes('ไปท่าเรือเอง') || str.includes('ท่าเรือเอง')) {
      const discount = Math.abs(addon.priceAdjustment || 200);
      switch (lang) {
        case 'EN': return `Travel to pier by own (Discount -${discount} THB/person)`;
        case 'ZH': return `自行前往码头 (每人立减 -${discount} 泰铢)`;
        case 'RU': return `Добраться до пирса самостоятельно (Скидка -${discount} бат/чел)`;
        default: return str;
      }
    }
    return str;
  }

  return '';
}

/**
 * Returns localized unit text for addon price adjustment
 */
export function getAddonAdjustmentText(priceAdjustment: number, lang: Language): { label: string; formatted: string } {
  const absVal = Math.abs(priceAdjustment);
  const isDiscount = priceAdjustment < 0;

  if (isDiscount) {
    switch (lang) {
      case 'EN': return { label: `Discount -${absVal} THB/guest`, formatted: `-฿${absVal.toLocaleString()}` };
      case 'ZH': return { label: `每人立减 -${absVal} 泰铢`, formatted: `-฿${absVal.toLocaleString()}` };
      case 'RU': return { label: `Скидка -${absVal} бат/чел`, formatted: `-฿${absVal.toLocaleString()}` };
      default: return { label: `ส่วนลด -${absVal} บาท/ท่าน`, formatted: `-฿${absVal.toLocaleString()}` };
    }
  } else {
    switch (lang) {
      case 'EN': return { label: `Extra +${absVal} THB/guest`, formatted: `+฿${absVal.toLocaleString()}` };
      case 'ZH': return { label: `加购 +${absVal} 泰铢/人`, formatted: `+฿${absVal.toLocaleString()}` };
      case 'RU': return { label: `Доплата +${absVal} бат/чел`, formatted: `+฿${absVal.toLocaleString()}` };
      default: return { label: `เพิ่ม +${absVal} บาท/ท่าน`, formatted: `+฿${absVal.toLocaleString()}` };
    }
  }
}
