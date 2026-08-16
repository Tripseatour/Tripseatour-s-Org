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

    // Generate high quality SVG voucher in A5 Landscape proportions (920px x 650px)
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="920" height="650" viewBox="0 0 920 650" style="background:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <defs>
        <filter id="cardShadow" x="-3%" y="-3%" width="106%" height="106%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.12" />
        </filter>
      </defs>

      <!-- White Ticket Card (A5 Landscape) -->
      <rect x="15" y="15" width="890" height="620" rx="12" fill="#ffffff" stroke="#0f172a" stroke-width="3" filter="url(#cardShadow)" />

      <!-- Top Header -->
      <g transform="translate(35, 30)">
        <!-- Logo Box -->
        <rect x="0" y="0" width="60" height="60" rx="12" fill="#0d3b66" stroke="#0f172a" stroke-width="2" />
        <text x="30" y="38" fill="#38bdf8" font-size="22" font-weight="900" text-anchor="middle">TST</text>
        
        <!-- Company Text -->
        <text x="75" y="24" fill="#0d3b66" font-size="18" font-weight="900" letter-spacing="0.5">Trip Sea Tour Phuket Co., Ltd.</text>
        
        <!-- License Badge -->
        <rect x="360" y="8" width="115" height="20" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1" />
        <text x="417" y="22" fill="#78350f" font-size="10" font-weight="800" text-anchor="middle">ททท. 33/11100</text>
        
        <text x="75" y="42" fill="#475569" font-size="10" font-weight="500">ภูเก็ต ประเทศไทย (Phuket, Thailand)</text>
        <text x="75" y="56" fill="#475569" font-size="10" font-weight="500">Tel. (+66) 97 924 1399 / (+66) 62 681 6494 | Email: tripseatourphuket@gmail.com</text>

        <!-- Ticket Ref Header Right -->
        <rect x="670" y="2" width="180" height="22" rx="4" fill="#0f172a" />
        <text x="760" y="17" fill="#ffffff" font-size="9.5" font-weight="bold" text-anchor="middle">OFFICIAL E-TICKET</text>
        <rect x="670" y="24" width="180" height="34" rx="4" fill="#f0fdfa" stroke="#0f172a" stroke-width="1.5" />
        <text x="760" y="48" fill="#0f766e" font-size="17" font-weight="900" font-family="monospace" text-anchor="middle">${ref}</text>
      </g>

      <!-- Header Divider Line -->
      <line x1="35" y1="98" x2="885" y2="98" stroke="#0f172a" stroke-width="2" />

      <!-- Main Layout Grid -->
      <!-- Left Panel: Booking Details (Width 565px) -->
      <g transform="translate(35, 108)">
        <rect x="0" y="0" width="565" height="425" rx="8" fill="#ffffff" stroke="#0f172a" stroke-width="2" />

        <!-- Program Banner -->
        <rect x="0" y="0" width="565" height="48" rx="7 7 0 0" fill="#0f766e" />
        <text x="15" y="18" fill="#99f6e4" font-size="9" font-weight="bold">TOUR PROGRAM (โปรแกรมทัวร์):</text>
        <text x="15" y="38" fill="#ffffff" font-size="14" font-weight="900">${tourTitle}</text>

        <!-- Row 1: Guest Name & Mobile -->
        <line x1="0" y1="96" x2="565" y2="96" stroke="#0f172a" stroke-width="1.5" />
        <line x1="282" y1="48" x2="282" y2="96" stroke="#0f172a" stroke-width="1.5" />
        <text x="15" y="66" fill="#64748b" font-size="9" font-weight="bold">GUEST NAME (ชื่อลูกค้า):</text>
        <text x="15" y="85" fill="#0f172a" font-size="13" font-weight="bold">${customerName}</text>
        <text x="295" y="66" fill="#64748b" font-size="9" font-weight="bold">MOBILE NO. (เบอร์โทร):</text>
        <text x="295" y="85" fill="#0f172a" font-size="13" font-weight="bold" font-family="monospace">${customerPhone}</text>

        <!-- Row 2: Tour Date & Pickup Time (Highlight) -->
        <rect x="0" y="96" width="282" height="54" fill="#fff1f2" />
        <rect x="282" y="96" width="283" height="54" fill="#fffbeb" />
        <line x1="0" y1="150" x2="565" y2="150" stroke="#0f172a" stroke-width="1.5" />
        <line x1="282" y1="96" x2="282" y2="150" stroke="#0f172a" stroke-width="1.5" />
        <text x="15" y="114" fill="#9f1239" font-size="9.5" font-weight="900">TOUR DATE (วันที่เดินทาง):</text>
        <text x="15" y="138" fill="#e11d48" font-size="17" font-weight="900" font-family="monospace">${travelDate}</text>
        <text x="295" y="114" fill="#92400e" font-size="9.5" font-weight="900">PICKUP TIME (เวลารับ):</text>
        <text x="295" y="138" fill="#d97706" font-size="15" font-weight="900">${pickupTime}</text>

        <!-- Row 3: Booking Date & Nationality -->
        <line x1="0" y1="198" x2="565" y2="198" stroke="#0f172a" stroke-width="1.5" />
        <line x1="282" y1="150" x2="282" y2="198" stroke="#0f172a" stroke-width="1.5" />
        <text x="15" y="168" fill="#64748b" font-size="9" font-weight="bold">BOOKING DATE (วันที่จอง):</text>
        <text x="15" y="187" fill="#1e293b" font-size="12" font-weight="600">${bookingDate}</text>
        <text x="295" y="168" fill="#64748b" font-size="9" font-weight="bold">NATIONALITY (สัญชาติ):</text>
        <text x="295" y="187" fill="#1e293b" font-size="12" font-weight="600">${nationality}</text>

        <!-- Row 4: Pick up Hotel -->
        <line x1="0" y1="250" x2="565" y2="250" stroke="#0f172a" stroke-width="1.5" />
        <text x="15" y="218" fill="#64748b" font-size="9" font-weight="bold">PICK UP HOTEL (รับโรงแรม):</text>
        <text x="15" y="238" fill="#0f172a" font-size="12.5" font-weight="bold">🏨 ${pickupHotel}</text>

        <!-- Row 5: Send Back Hotel -->
        <line x1="0" y1="302" x2="565" y2="302" stroke="#0f172a" stroke-width="1.5" />
        <text x="15" y="270" fill="#64748b" font-size="9" font-weight="bold">SEND BACK HOTEL (ส่งกลับโรงแรม):</text>
        <text x="15" y="290" fill="#1e293b" font-size="12" font-weight="600">🚐 ${sendBackHotel}</text>

        <!-- Row 6: Remarks -->
        <rect x="0" y="302" width="565" height="123" rx="0 0 7 7" fill="#f8fafc" />
        <text x="15" y="322" fill="#64748b" font-size="9" font-weight="bold">REMARKS (หมายเหตุ):</text>
        <text x="15" y="344" fill="#475569" font-size="11.5" font-style="italic">${remark}</text>
      </g>

      <!-- Right Panel: Status, PAX Summary, Boarding Notice (Width 270px) -->
      <g transform="translate(615, 108)">
        <rect x="0" y="0" width="270" height="425" rx="8" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />

        <!-- Status Header -->
        <rect x="15" y="15" width="240" height="50" rx="8" fill="#0f766e" stroke="#0f172a" stroke-width="1.5" />
        <text x="135" y="34" fill="#99f6e4" font-size="9" font-weight="bold" text-anchor="middle">BOOKING STATUS</text>
        <text x="135" y="52" fill="#ffffff" font-size="13" font-weight="900" text-anchor="middle">CONFIRMED (ยืนยันสิทธิ์แล้ว)</text>

        <!-- PAX Summary Box -->
        <rect x="15" y="75" width="240" height="150" rx="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.5" />
        <text x="135" y="98" fill="#0f172a" font-size="10" font-weight="900" text-anchor="middle">PAX SUMMARY (จำนวนผู้เดินทาง)</text>
        <line x1="25" y1="108" x2="245" y2="108" stroke="#e2e8f0" stroke-width="1" />
        
        <!-- Adult -->
        <rect x="25" y="116" width="100" height="46" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <text x="75" y="132" fill="#64748b" font-size="8.5" font-weight="bold" text-anchor="middle">ผู้ใหญ่ (Adult)</text>
        <text x="75" y="152" fill="#0f766e" font-size="14" font-weight="900" text-anchor="middle">${adults} ท่าน</text>

        <!-- Child -->
        <rect x="135" y="116" width="100" height="46" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <text x="185" y="132" fill="#64748b" font-size="8.5" font-weight="bold" text-anchor="middle">เด็ก (Child)</text>
        <text x="185" y="152" fill="#0f766e" font-size="14" font-weight="900" text-anchor="middle">${children} ท่าน</text>

        <!-- Total Guests Banner -->
        <rect x="25" y="172" width="210" height="38" rx="6" fill="#f0fdfa" stroke="#0f766e" stroke-width="1" />
        <text x="130" y="196" fill="#0f766e" font-size="11" font-weight="bold" text-anchor="middle">ผู้เดินทางรวมทั้งหมด: ${Number(adults) + Number(children) + Number(infants)} ท่าน</text>

        <!-- Boarding Notice Box -->
        <rect x="15" y="235" width="240" height="85" rx="8" fill="#fffbeb" stroke="#f59e0b" stroke-width="1" />
        <text x="135" y="255" fill="#92400e" font-size="9.5" font-weight="900" text-anchor="middle">📌 แสดงตั๋วนี้แก่คนขับรถ / ไกด์</text>
        <text x="135" y="272" fill="#475569" font-size="7.5" text-anchor="middle">Please present this E-Ticket on your mobile</text>
        <text x="135" y="284" fill="#475569" font-size="7.5" text-anchor="middle">to the driver upon boarding.</text>
        <line x1="25" y1="292" x2="245" y2="292" stroke="#fde68a" stroke-width="1" />
        <text x="135" y="308" fill="#78350f" font-size="9" font-weight="bold" text-anchor="middle">📞 Hotline: (+66) 97 924 1399</text>

        <!-- Ink Stamp -->
        <circle cx="135" cy="370" r="35" fill="none" stroke="#059669" stroke-width="2" stroke-dasharray="4 2" />
        <text x="135" y="364" fill="#059669" font-size="8" font-weight="900" text-anchor="middle">CONFIRMED</text>
        <text x="135" y="376" fill="#059669" font-size="7" font-weight="bold" text-anchor="middle">TRIP SEA TOUR</text>
        <text x="135" y="388" fill="#059669" font-size="6" font-weight="bold" text-anchor="middle">OFFICIAL VOUCHER</text>
      </g>

      <!-- Multi-Lingual Cautions (Footer) -->
      <g transform="translate(35, 542)">
        <text x="0" y="10" fill="#b91c1c" font-size="8" font-weight="bold">1. กรุณารอที่ล็อบบี้ตรงเวลานัด คนขับรอไม่เกิน 5 นาที หากล่าช้าถือว่าสละสิทธิ์และไม่คืนเงิน</text>
        <text x="0" y="22" fill="#b91c1c" font-size="8" font-weight="bold">2. สตรีมีครรภ์ ผู้ป่วยโรคหัวใจ ความดันรุนแรง หรือกระดูกสันหลัง ห้ามออกทะเล | หากเกินเวลานัด 20 นาที โทร (+66) 97 924 1399</text>
        <text x="0" y="34" fill="#475569" font-size="7.5" font-weight="bold">重要提醒: 请准时在酒店大堂等候。严禁孕妇、心脏病患者出海。超过20分钟未见司机请联系 (+66) 97 924 1399</text>
        <text x="0" y="46" fill="#475569" font-size="7.5">Cautions: Please standby at lobby on time. Driver waits max 5 mins. If delayed over 20 mins, contact (+66) 97 924 1399.</text>
      </g>

      <!-- Bottom Wish Banner -->
      <g transform="translate(35, 600)">
        <rect x="0" y="0" width="850" height="24" rx="4" fill="#0f766e" />
        <text x="425" y="16" fill="#f0fdfa" font-size="10" font-weight="bold" letter-spacing="1" text-anchor="middle">
          HAVE A NICE TRIP - ขอให้เป็นทริปที่สนุกและปลอดภัยนะครับ/ค่ะ - 祝您旅途愉快
        </text>
      </g>
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
