// Global memory cache for fast image serving
export const memoryImageCache = new Map<string, { data: string; mimeType: string; timestamp: number }>();

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { key, dataUrl, mimeType = 'image/png' } = body;

      if (!key || !dataUrl) {
        return res.status(400).json({ error: 'key and dataUrl are required' });
      }

      memoryImageCache.set(key, {
        data: dataUrl,
        mimeType: mimeType || (dataUrl.includes('image/jpeg') ? 'image/jpeg' : 'image/png'),
        timestamp: Date.now()
      });

      return res.status(200).json({ success: true, key });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
