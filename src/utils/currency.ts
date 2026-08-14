export type Currency = 'THB' | 'USD' | 'EUR' | 'CNY' | 'RUB' | 'GBP' | 'SGD' | 'AUD';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  label: string;
  flag: string;
  rateAgainstTHB: number; // 1 THB = X Currency
  decimals: number;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  THB: {
    code: 'THB',
    symbol: '฿',
    label: 'THB (฿ บาท)',
    flag: '🇹🇭',
    rateAgainstTHB: 1,
    decimals: 0
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($ Dollar)',
    flag: '🇺🇸',
    rateAgainstTHB: 0.0282, // 1 USD ≈ 35.5 THB
    decimals: 2
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR (€ Euro)',
    flag: '🇪🇺',
    rateAgainstTHB: 0.0258, // 1 EUR ≈ 38.8 THB
    decimals: 2
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    label: 'CNY (¥ 人民币)',
    flag: '🇨🇳',
    rateAgainstTHB: 0.204, // 1 CNY ≈ 4.9 THB
    decimals: 1
  },
  RUB: {
    code: 'RUB',
    symbol: '₽',
    label: 'RUB (₽ Рубль)',
    flag: '🇷🇺',
    rateAgainstTHB: 2.56, // 1 RUB ≈ 0.39 THB
    decimals: 0
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    label: 'GBP (£ Pound)',
    flag: '🇬🇧',
    rateAgainstTHB: 0.0221, // 1 GBP ≈ 45.2 THB
    decimals: 2
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    label: 'SGD (S$ Dollar)',
    flag: '🇸🇬',
    rateAgainstTHB: 0.0377, // 1 SGD ≈ 26.5 THB
    decimals: 2
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    label: 'AUD (A$ Dollar)',
    flag: '🇦🇺',
    rateAgainstTHB: 0.0431, // 1 AUD ≈ 23.2 THB
    decimals: 2
  }
};

/**
 * Convert THB amount to target currency value
 */
export function convertFromTHB(amountInTHB: number, targetCurrency: Currency): number {
  if (!amountInTHB || isNaN(amountInTHB)) return 0;
  if (targetCurrency === 'THB') return amountInTHB;
  const rate = CURRENCIES[targetCurrency]?.rateAgainstTHB || 1;
  return amountInTHB * rate;
}

/**
 * Format THB amount in selected currency display format
 * e.g. "฿1,500" or "$42.30" or "¥306"
 */
export function formatPrice(amountInTHB: number, currency: Currency = 'THB'): string {
  if (amountInTHB === undefined || amountInTHB === null || isNaN(amountInTHB)) return '฿0';
  const curr = CURRENCIES[currency] || CURRENCIES.THB;
  const converted = convertFromTHB(amountInTHB, currency);
  
  const formattedNumber = converted.toLocaleString(undefined, {
    minimumFractionDigits: curr.decimals,
    maximumFractionDigits: curr.decimals
  });

  return `${curr.symbol}${formattedNumber}`;
}
