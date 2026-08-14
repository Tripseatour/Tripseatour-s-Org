import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check tables
    const [appStoreRes, bookingsRes] = await Promise.allSettled([
      supabase.from('app_store').select('key').limit(1),
      supabase.from('bookings').select('id').limit(1)
    ]);

    const isAppStoreOk = appStoreRes.status === 'fulfilled' && !appStoreRes.value.error;
    const isBookingsOk = bookingsRes.status === 'fulfilled' && !bookingsRes.value.error;

    return res.status(200).json({
      connected: isAppStoreOk || isBookingsOk,
      url: SUPABASE_URL,
      tables: {
        app_store: isAppStoreOk,
        bookings: isBookingsOk
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(200).json({
      connected: false,
      url: SUPABASE_URL,
      error: error?.message || 'Failed to connect',
      timestamp: new Date().toISOString()
    });
  }
}
