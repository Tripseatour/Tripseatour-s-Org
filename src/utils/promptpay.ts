import QRCode from 'qrcode';

// CRC16-CCITT implementation for EMVCo PromptPay QR
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate EMVCo compliant PromptPay QR Code Payload string
 * @param target Mobile number (e.g. "0812345678") or Tax/National ID (e.g. "0835560001234")
 * @param amount Optional floating number amount e.g. 2500.00
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  // Clean non-digits
  const cleanTarget = target.replace(/[^0-9]/g, '');

  let subTag = '';
  if (cleanTarget.length === 10 && cleanTarget.startsWith('0')) {
    // Mobile number: format as 0066 + 9 digits
    const formattedMobile = '0066' + cleanTarget.substring(1);
    subTag = `01${formattedMobile.length.toString().padStart(2, '0')}${formattedMobile}`;
  } else if (cleanTarget.length === 13) {
    // Tax ID / Citizen ID
    subTag = `02${cleanTarget.length.toString().padStart(2, '0')}${cleanTarget}`;
  } else {
    // Fallback default mobile
    const formattedMobile = '0066812345678';
    subTag = `01${formattedMobile.length.toString().padStart(2, '0')}${formattedMobile}`;
  }

  // Merchant Information Template (Tag 29)
  const aid = '0016A000000677010111';
  const tag29Value = `${aid}${subTag}`;
  const tag29 = `29${tag29Value.length.toString().padStart(2, '0')}${tag29Value}`;

  let payload = '000201'; // Payload Format Indicator
  payload += amount && amount > 0 ? '010212' : '010211'; // Point of Initiation
  payload += tag29;
  payload += '5303764'; // Currency Code: 764 THB
  
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += `54${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}`;
  }

  payload += '5802TH'; // Country Code: TH
  payload += '6304'; // Checksum Tag

  const checksum = crc16(payload);
  return payload + checksum;
}

/**
 * Generate Data URL QR code image from PromptPay payload
 */
export async function generatePromptPayQRDataUrl(target: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#003B5C', // Royal Thai PromptPay Navy Blue
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating PromptPay QR Code:', err);
    return '';
  }
}
