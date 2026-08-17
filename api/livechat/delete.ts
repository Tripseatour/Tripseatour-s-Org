import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

async function loadSessionsFromSupabase(supabase: any) {
  try {
    const { data } = await supabase.from('app_store').select('value').eq('key', 'live_chat_sessions').maybeSingle();
    if (data && data.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error loading live_chat_sessions:', e);
  }
  return [];
}

async function persistSessionsToSupabase(supabase: any, sessions: any[]) {
  try {
    await supabase.from('app_store').upsert({
      key: 'live_chat_sessions',
      value: JSON.stringify(sessions),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.error('Error persisting live_chat_sessions:', e);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let sessionId = req.query?.id || req.query?.sessionId;
  if (!sessionId && req.body) {
    try {
      const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      sessionId = parsed?.id || parsed?.sessionId;
    } catch (e) {}
  }

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    let sessions = await loadSessionsFromSupabase(supabase);
    const updatedSessions = sessions.filter((s: any) => s.id !== sessionId);
    await persistSessionsToSupabase(supabase, updatedSessions);
    return res.status(200).json({ success: true, sessions: updatedSessions });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to delete live chat session' });
  }
}
