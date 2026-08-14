import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  const ref = (query.ref || query.bookingRef || query.id || 'TEST').toString().trim();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Try retrieving cached image from app_store
    const { data: storeData } = await supabase
      .from('app_store')
      .select('value')
      .in('key', [`img_ticket_${ref}`, `ticket_${ref}`])
      .limit(1)
      .maybeSingle();

    if (storeData && storeData.value && storeData.value.startsWith('data:image')) {
      const base64Data = storeData.value.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const isPng = storeData.value.includes('image/png');
      
      res.setHeader('Content-Type', isPng ? 'image/png' : 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.end(buffer);
    }

    // 2. Try fetching booking from bookings table to render dynamic ticket
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_ref', ref)
      .maybeSingle();

    const tourTitle = (booking?.tour_title || 'เกาะพีพี มายา ไข่ (เรือสปีดโบ๊ท VIP)').slice(0, 38);
    const customerName = (booking?.customer_name || 'ลูกค้าทริปภูเก็ต').slice(0, 32);
    const customerPhone = booking?.customer_phone || '08X-XXX-XXXX';
    const travelDate = booking?.travel_date || new Date().toISOString().split('T')[0];
    const bookingDate = booking?.created_at ? new Date(booking.created_at).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH');
    const pickupHotel = ((booking?.pickup_hotel || 'โรงแรมในภูเก็ต') + (booking?.room_number ? ` (ห้อง ${booking.room_number})` : '')).slice(0, 50);
    const sendBackHotel = ((booking?.send_back_hotel || booking?.pickup_hotel || 'โรงแรมในภูเก็ต')).slice(0, 50);
    const adults = booking?.adults || 1;
    const children = booking?.children || 0;
    const infants = booking?.infants || 0;
    const totalAmount = booking?.total_amount ? Number(booking.total_amount).toLocaleString() : '0';
    const pickupTime = booking?.pickup_time || '07:30 - 08:00 น.';
    const nationality = booking?.nationality || 'Thai / -';
    const remark = (booking?.special_requests || booking?.notes || '-').slice(0, 60);

    // Generate high quality SVG voucher matching customer TicketVoucher
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280" style="background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <defs>
        <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.12" />
        </filter>
      </defs>

      <!-- White Ticket Card -->
      <rect x="25" y="25" width="850" height="1230" rx="16" fill="#ffffff" stroke="#0f172a" stroke-width="3" filter="url(#cardShadow)" />

      <!-- Top Header -->
      <g transform="translate(45, 45)">
        <!-- Logo Box -->
        <rect x="0" y="0" width="70" height="70" rx="14" fill="#0d3b66" stroke="#0f172a" stroke-width="2" />
        <text x="35" y="44" fill="#38bdf8" font-size="28" font-weight="900" text-anchor="middle">TST</text>
        
        <!-- Company Text -->
        <text x="85" y="28" fill="#0d3b66" font-size="22" font-weight="900" letter-spacing="0.5">Trip Sea Tour Phuket Co., Ltd.</text>
        
        <!-- License Badge -->
        <rect x="420" y="10" width="125" height="24" rx="6" fill="#ccfbf1" stroke="#5eead4" stroke-width="1" />
        <text x="482" y="26" fill="#115e59" font-size="11" font-weight="800" text-anchor="middle">ททท. 33/11100</text>
        
        <text x="85" y="48" fill="#475569" font-size="12" font-weight="500">ภูเก็ต ประเทศไทย (Phuket, Thailand)</text>
        <text x="85" y="66" fill="#475569" font-size="12" font-weight="500">Tel. (+66) 97 924 1399 / (+66) 62 681 6494 | Email: tripseatourphuket@gmail.com</text>

        <!-- Ticket Ref Header Right -->
        <text x="800" y="24" fill="#64748b" font-size="11" font-weight="bold" text-anchor="end">OFFICIAL E-TICKET</text>
        <text x="800" y="52" fill="#0f766e" font-size="20" font-weight="900" font-family="monospace" text-anchor="end">${ref}</text>
      </g>

      <!-- Header Divider Line -->
      <line x1="45" y1="130" x2="855" y2="130" stroke="#0f172a" stroke-width="2.5" />

      <!-- Table Grid -->
      <g transform="translate(45, 145)">
        <!-- Outer Table Border -->
        <rect x="0" y="0" width="810" height="660" fill="#ffffff" stroke="#0f172a" stroke-width="2" />

        <!-- Row 1: Program & Booking Date -->
        <line x1="0" y1="70" x2="810" y2="70" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="0" x2="200" y2="70" stroke="#0f172a" stroke-width="1.5" />
        <line x1="500" y1="0" x2="500" y2="70" stroke="#0f172a" stroke-width="1.5" />
        <line x1="660" y1="0" x2="660" y2="70" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="0" width="200" height="70" fill="#f8fafc" />
        <rect x="500" y="0" width="160" height="70" fill="#f8fafc" />
        <text x="15" y="40" fill="#1e293b" font-size="13" font-weight="bold">Program (โปรแกรมทัวร์):</text>
        <text x="215" y="42" fill="#0f172a" font-size="14" font-weight="bold">${tourTitle}</text>
        <text x="515" y="40" fill="#1e293b" font-size="13" font-weight="bold">Booking Date (วันที่จอง):</text>
        <text x="675" y="42" fill="#0f172a" font-size="14" font-weight="600">${bookingDate}</text>

        <!-- Row 2: Booking No & Pick up Time -->
        <line x1="0" y1="135" x2="810" y2="135" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="70" x2="200" y2="135" stroke="#0f172a" stroke-width="1.5" />
        <line x1="500" y1="70" x2="500" y2="135" stroke="#0f172a" stroke-width="1.5" />
        <line x1="660" y1="70" x2="660" y2="135" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="70" width="200" height="65" fill="#f8fafc" />
        <rect x="500" y="70" width="160" height="65" fill="#f8fafc" />
        <text x="15" y="108" fill="#1e293b" font-size="13" font-weight="bold">Booking No (เลขบุ๊คกิ้ง):</text>
        <text x="215" y="110" fill="#e11d48" font-size="16" font-weight="900" font-family="monospace">${ref}</text>
        <text x="515" y="108" fill="#1e293b" font-size="13" font-weight="bold">Pick up Time (เวลารับ):</text>
        <text x="675" y="110" fill="#e11d48" font-size="15" font-weight="900">${pickupTime}</text>

        <!-- Row 3: Tour Date & Nation Ality -->
        <line x1="0" y1="200" x2="810" y2="200" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="135" x2="200" y2="200" stroke="#0f172a" stroke-width="1.5" />
        <line x1="500" y1="135" x2="500" y2="200" stroke="#0f172a" stroke-width="1.5" />
        <line x1="660" y1="135" x2="660" y2="200" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="135" width="200" height="65" fill="#f8fafc" />
        <rect x="500" y="135" width="160" height="65" fill="#f8fafc" />
        <text x="15" y="165" fill="#1e293b" font-size="13" font-weight="bold">Tour Date (วันที่ไป):</text>
        <text x="15" y="185" fill="#64748b" font-size="11">出发日期:</text>
        <text x="215" y="175" fill="#e11d48" font-size="16" font-weight="900">${travelDate}</text>
        <text x="515" y="173" fill="#1e293b" font-size="13" font-weight="bold">Nation Ality (สัญชาติ):</text>
        <text x="675" y="173" fill="#0f172a" font-size="14" font-weight="600">${nationality}</text>

        <!-- Row 4: Guest Name & Mobile No -->
        <line x1="0" y1="265" x2="810" y2="265" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="200" x2="200" y2="265" stroke="#0f172a" stroke-width="1.5" />
        <line x1="500" y1="200" x2="500" y2="265" stroke="#0f172a" stroke-width="1.5" />
        <line x1="660" y1="200" x2="660" y2="265" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="200" width="200" height="65" fill="#f8fafc" />
        <rect x="500" y="200" width="160" height="65" fill="#f8fafc" />
        <text x="15" y="238" fill="#1e293b" font-size="13" font-weight="bold">Guest Name (ชื่อลูกค้า):</text>
        <text x="215" y="240" fill="#0f172a" font-size="15" font-weight="bold">${customerName}</text>
        <text x="515" y="238" fill="#1e293b" font-size="13" font-weight="bold">Mobile No (เบอร์โทร):</text>
        <text x="675" y="240" fill="#0f172a" font-size="15" font-weight="bold" font-family="monospace">${customerPhone}</text>

        <!-- Row 5: PAX Passengers & Total -->
        <line x1="0" y1="330" x2="810" y2="330" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="265" x2="200" y2="330" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="265" width="200" height="65" fill="#f8fafc" />
        <text x="15" y="303" fill="#1e293b" font-size="13" font-weight="bold">PAX (จำนวนคน):</text>
        <text x="215" y="303" fill="#0f172a" font-size="14" font-weight="600">Adult(ผู้ใหญ่): <tspan font-weight="bold" font-size="16">${adults}</tspan>   Child(เด็ก): <tspan font-weight="bold" font-size="16">${children}</tspan>   Infant(ทารก): <tspan font-weight="bold" font-size="16">${infants}</tspan></text>
        <text x="610" y="303" fill="#047857" font-size="15" font-weight="900">ยอดชำระ: ฿${totalAmount}</text>

        <!-- Row 6: Pick up Hotel -->
        <line x1="0" y1="410" x2="810" y2="410" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="330" x2="200" y2="410" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="330" width="200" height="80" fill="#f8fafc" />
        <text x="15" y="375" fill="#1e293b" font-size="13" font-weight="bold">Pick up Hotel (รับโรงแรม):</text>
        <text x="215" y="375" fill="#0f172a" font-size="14" font-weight="600">${pickupHotel}</text>

        <!-- Row 7: Send back Hotel -->
        <line x1="0" y1="490" x2="810" y2="490" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="410" x2="200" y2="490" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="410" width="200" height="80" fill="#f8fafc" />
        <text x="15" y="455" fill="#1e293b" font-size="13" font-weight="bold">Send back (ส่งกลับ):</text>
        <text x="215" y="455" fill="#0f172a" font-size="14" font-weight="600">${sendBackHotel}</text>

        <!-- Row 8: Remark -->
        <line x1="0" y1="560" x2="810" y2="560" stroke="#0f172a" stroke-width="1.5" />
        <line x1="200" y1="490" x2="200" y2="560" stroke="#0f172a" stroke-width="1.5" />
        <rect x="0" y="490" width="200" height="70" fill="#f8fafc" />
        <text x="15" y="530" fill="#1e293b" font-size="13" font-weight="bold">Remark (หมายเหตุ):</text>
        <text x="215" y="530" fill="#475569" font-size="13" font-weight="500">${remark}</text>

        <!-- Row 9: Multi-Lingual Cautions & Conditions -->
        <rect x="0" y="560" width="810" height="100" fill="#fafafa" />
        
        <!-- Thai Cautions (Red) -->
        <text x="15" y="582" fill="#dc2626" font-size="10.5" font-weight="bold">1. กรุณารอที่ล็อบบี้โรงแรมตามเวลานัด คนขับจะรอไม่เกิน 5 นาที หากมาช้าและตกรถจะไม่สามารถคืนเงินหรือเลื่อนวันได้</text>
        <text x="15" y="598" fill="#dc2626" font-size="10.5" font-weight="bold">2. โปรดคาดเข็มขัดนิรภัยตลอดเวลาบนรถ | 3. หากเกินเวลานัด 20 นาทีไม่พบคนขับ โทร (+66) 97 924 1399</text>
        <text x="15" y="614" fill="#dc2626" font-size="10.5" font-weight="bold">4. ห้ามสตรีมีครรภ์ ผู้ป่วยโรคหัวใจ โรคความดันรุนแรง และโรคกระดูกสันหลังเข้าร่วมทริปทางทะเล</text>

        <!-- Chinese & English -->
        <text x="15" y="632" fill="#334155" font-size="9.5" font-weight="bold">重要提醒: 请按时在酒店大堂等候，司机最多等待5分钟。严禁孕妇、心脏病患者参加出海行程。</text>
        <text x="15" y="648" fill="#334155" font-size="9.5">Cautions: Please stand by at hotel lobby on time. Driver waits max 5 mins. Fasten seat belts.</text>
      </g>

      <!-- Voucher Footer Wish Banner -->
      <g transform="translate(45, 820)">
        <rect x="0" y="0" width="810" height="42" rx="10" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="405" y="26" fill="#0f172a" font-size="13" font-weight="900" letter-spacing="1" text-anchor="middle">
          HAVE A NICE TRIP - ขอให้เป็นทริปที่สนุกนะครับ/ค่ะ - 祝您旅途愉快
        </text>
      </g>

      <!-- Verification Stamp Bottom -->
      <g transform="translate(680, 875)">
        <circle cx="60" cy="45" r="42" fill="none" stroke="#059669" stroke-width="2.5" stroke-dasharray="5 3" />
        <text x="60" y="38" fill="#059669" font-size="10" font-weight="bold" text-anchor="middle">TRIP SEA TOUR</text>
        <text x="60" y="52" fill="#059669" font-size="12" font-weight="900" text-anchor="middle">OFFICIAL</text>
        <text x="60" y="64" fill="#059669" font-size="8" font-weight="bold" text-anchor="middle">E-TICKET</text>
      </g>

      <text x="450" y="930" fill="#64748b" font-size="12" text-anchor="middle">กรุณาแสดงตั๋ว E-Ticket ใบนี้แก่คนขับรถ/ไกด์เมื่อถึงเวลานัดหมาย</text>
    </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(svg);
  } catch (err: any) {
    console.error('Error generating ticket image:', err);
    return res.status(500).json({ error: err?.message || 'Error generating ticket' });
  }
}
