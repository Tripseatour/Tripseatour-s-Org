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
  const ref = (query.ref || query.bookingRef || query.id || '').toString().trim();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Check in app_store
    const { data: storeData } = await supabase
      .from('app_store')
      .select('value')
      .in('key', [`img_slip_${ref}`, `slip_${ref}`])
      .limit(1)
      .maybeSingle();

    let slipDataUrl = storeData?.value;

    // 2. If not found in app_store, check in bookings table
    if (!slipDataUrl && ref) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('slip_url')
        .eq('booking_ref', ref)
        .maybeSingle();
      slipDataUrl = booking?.slip_url;
    }

    if (slipDataUrl) {
      // If it's a base64 image data URL
      if (slipDataUrl.startsWith('data:image')) {
        const mimeMatch = slipDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = slipDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(buffer);
      }

      // If it's an external HTTPS URL
      if (slipDataUrl.startsWith('https://')) {
        return res.redirect(302, slipDataUrl);
      }
    }

    // Return a clean fallback placeholder if no slip was attached
    const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#f8fafc; font-family:sans-serif;">
      <rect width="600" height="800" fill="#f1f5f9" />
      <rect x="50" y="50" width="500" height="700" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
      <circle cx="300" cy="350" r="50" fill="#e2e8f0" />
      <path d="M280 340 L300 360 L330 330" stroke="#64748b" stroke-width="6" fill="none" stroke-linecap="round" />
      <text x="300" y="440" font-size="22" font-weight="bold" fill="#334155" text-anchor="middle">สลิปโอนเงิน (Slip Preview)</text>
      <text x="300" y="480" font-size="16" fill="#64748b" text-anchor="middle">รหัสอ้างอิง: ${ref || 'ไม่มีข้อมูล'}</text>
      <text x="300" y="520" font-size="14" fill="#94a3b8" text-anchor="middle">TRIP SEA TOUR PHUKET</text>
    </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(fallbackSvg);
  } catch (err: any) {
    console.error('Error serving slip image:', err);
    return res.status(500).json({ error: err?.message || 'Error serving slip image' });
  }
}
