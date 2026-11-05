export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  const ref = (query.ref || query.bookingRef || query.id || '').toString().trim();

  try {
    // Return a clean placeholder svg if no slip is fetched directly
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
