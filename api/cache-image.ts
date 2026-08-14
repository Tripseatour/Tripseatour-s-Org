import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

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

      // Also persist to Supabase app_store asynchronously
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await supabase.from('app_store').upsert({
          key: `img_${key}`,
          value: dataUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (dbErr) {
        console.warn('Persist to Supabase app_store failed:', dbErr);
      }

      return res.status(200).json({ success: true, key });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
