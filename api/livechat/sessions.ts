import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const DEFAULT_DEMO_SESSION = [
  {
    id: 'session-demo-1',
    customerName: 'คุณสมชาย (สนใจทัวร์พีพี)',
    customerPhone: '081-234-5678',
    unreadCount: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        senderName: 'คุณสมชาย',
        text: 'สวัสดีครับ สอบถามทัวร์เกาะพีพีวันเสาร์นี้ยังมีที่ว่างไหมครับ?',
        timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'm2',
        sender: 'admin',
        senderName: 'แอดมิน TripSea Tour',
        text: 'สวัสดีค่ะคุณสมชาย! วันเสาร์นี้ยังมีที่ว่างสำหรับเรือสปีดโบ๊ท 4 ท่านค่ะ สามารถกดจองผ่านหน้าเว็บได้เลยนะคะ',
        timestamp: new Date(Date.now() - 1200000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'm3',
        sender: 'customer',
        senderName: 'คุณสมชาย',
        text: 'ขอบคุณครับ กำลังเลือกแพ็กเกจบนหน้าเว็บเลยครับ',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    ]
  }
];

async function loadSessionsFromSupabase(supabase: any) {
  try {
    const { data } = await supabase.from('app_store').select('value').eq('key', 'live_chat_sessions').maybeSingle();
    if (data && data.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error loading live_chat_sessions from Supabase:', e);
  }
  return DEFAULT_DEMO_SESSION;
}

async function persistSessionsToSupabase(supabase: any, sessions: any[]) {
  try {
    await supabase.from('app_store').upsert({
      key: 'live_chat_sessions',
      value: JSON.stringify(sessions),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.error('Error persisting live_chat_sessions to Supabase:', e);
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const sessions = await loadSessionsFromSupabase(supabase);

  // GET: list all sessions or get single session by query id
  if (req.method === 'GET') {
    const sessionId = req.query?.id || req.query?.sessionId;
    if (sessionId) {
      const found = sessions.find((s: any) => s.id === sessionId);
      if (found) {
        return res.status(200).json(found);
      } else {
        return res.status(404).json({ error: 'Session not found' });
      }
    }
    return res.status(200).json(sessions);
  }

  // POST: create or get session
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { sessionId, customerName, customerPhone } = body;

    let session = sessions.find((s: any) => s.id === sessionId);
    if (!session) {
      session = {
        id: sessionId || `session-${Date.now()}`,
        customerName: customerName || 'นักท่องเที่ยวบนหน้าเว็บ',
        customerPhone: customerPhone || '',
        unreadCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-welcome-${Date.now()}`,
            sender: 'admin',
            senderName: 'แอดมิน TripSea Tour',
            text: 'สวัสดีค่ะ! ยินดีต้อนรับสู่แชทสดกับเจ้าหน้าที่ Trip Sea Tour Phuket ค่ะ 🌊\n\nมีข้อสงสัยหรือต้องการสอบถามทัวร์ด่วน พิมพ์ข้อความไว้ได้เลยค่ะ แอดมินพร้อมตอบกลับทันทีนะคะ!',
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      sessions.unshift(session);
      await persistSessionsToSupabase(supabase, sessions);
    } else if (customerName && customerName !== session.customerName) {
      session.customerName = customerName;
      await persistSessionsToSupabase(supabase, sessions);
    }

    return res.status(200).json(session);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
