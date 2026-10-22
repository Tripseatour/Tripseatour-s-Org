import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const DEFAULT_CHANNEL_ACCESS_TOKEN = 'Na3ekdkIyTshDZwZItjOQGv4MXBqo/j6zzXfoES2K6Od6HEjLXDjookdpV5QzuUA6FqXknMZL3MwgiPNmupdAy9oZweKN5QKlTjdloODikwIgrlJEeyrWJW7vAzydq38jHDmKR1NZE58ji2oYNy9VwdB04t89/1O/w1cDnyilFU=';
const DEFAULT_LINE_GROUP_ID = 'C1bb0d71ad5dbb960801dad6bd5208afa';
const DEFAULT_DOMAIN = 'https://tripseatourphuket.vercel.app';

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
      if (Array.isArray(parsed)) return parsed;
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

async function loadLineCredentials(supabase: any) {
  let token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || DEFAULT_CHANNEL_ACCESS_TOKEN;
  let targetId = process.env.LINE_MESSAGING_USER_ID || DEFAULT_LINE_GROUP_ID;

  try {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      if (data.line_messaging_channel_access_token && !data.line_messaging_channel_access_token.startsWith('SIMULATED')) {
        token = data.line_messaging_channel_access_token.trim();
      }
      if (data.line_messaging_user_id && data.line_messaging_user_id.trim().length > 0) {
        targetId = data.line_messaging_user_id.trim();
      }
    }
  } catch (e) {}

  return { token, targetId };
}

export default async function handler(req: any, res: any) {
  // CORS configuration
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
  const url = req.url || '';
  const action = req.query?.action || (url.includes('/send') ? 'send' : url.includes('/read') ? 'read' : url.includes('/delete') ? 'delete' : 'sessions');
  const sessionId = req.query?.id || req.query?.sessionId;

  // 1. ACTION: SEND MESSAGE
  if (action === 'send' || url.includes('/send')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { sessionId: bodySessionId, sender, senderName, text, imageUrl } = body;
      const targetSessionId = bodySessionId || sessionId;

      const sessions = await loadSessionsFromSupabase(supabase);
      let session = sessions.find((s: any) => s.id === targetSessionId);

      if (!session) {
        session = {
          id: targetSessionId || `session-${Date.now()}`,
          customerName: senderName || 'นักท่องเที่ยวบนหน้าเว็บ',
          unreadCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: []
        };
        sessions.unshift(session);
      }

      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: sender || 'customer',
        senderName: senderName || (sender === 'admin' ? 'แอดมิน TripSea Tour' : 'คุณลูกค้า'),
        text: text || '',
        imageUrl,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };

      session.messages.push(newMsg);
      session.updatedAt = new Date().toISOString();

      if (sender === 'customer') {
        session.unreadCount = (session.unreadCount || 0) + 1;

        // Trigger LINE notification
        try {
          const { token, targetId } = await loadLineCredentials(supabase);
          const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
          const siteUrl = hostHeader && !hostHeader.includes('localhost')
            ? `https://${hostHeader}`
            : DEFAULT_DOMAIN;

          const custName = session.customerName || senderName || 'นักท่องเที่ยวบนหน้าเว็บ';
          const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          const lineMessage = `💬 [แจ้งเตือนแชทสดลูกค้าใหม่!]\n` +
            `👤 ลูกค้า: ${custName}\n` +
            `💬 ข้อความ: "${text || (imageUrl ? '[แนบไฟล์รูปภาพ/สลิป]' : '')}"\n` +
            `⏰ เวลา: ${timeStr}\n` +
            `🔗 คลิกแชทตอบกลับทันที: ${siteUrl}/#admin (เมนู 💬 แชทสดลูกค้า)`;

          const messagesPayload: any[] = [];
          if (imageUrl && imageUrl.startsWith('https://')) {
            messagesPayload.push({
              type: 'image',
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl
            });
          }
          messagesPayload.push({
            type: 'text',
            text: lineMessage
          });

          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              to: targetId,
              messages: messagesPayload.slice(0, 5)
            })
          }).catch(() => {});
        } catch (lineErr) {}
      } else if (sender === 'admin') {
        session.unreadCount = 0;
      }

      await persistSessionsToSupabase(supabase, sessions);

      return res.status(200).json({
        success: true,
        message: newMsg,
        session
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Error sending message' });
    }
  }

  // 2. ACTION: MARK AS READ
  if (action === 'read' || url.includes('/read')) {
    try {
      const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const targetId = sessionId || parsedBody?.id || parsedBody?.sessionId;

      const sessions = await loadSessionsFromSupabase(supabase);
      const session = sessions.find((s: any) => s.id === targetId);
      if (session) {
        session.unreadCount = 0;
        await persistSessionsToSupabase(supabase, sessions);
        return res.status(200).json({ success: true, session });
      }
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message });
    }
  }

  // 3. ACTION: DELETE SESSION
  if (action === 'delete' || url.includes('/delete') || req.method === 'DELETE') {
    try {
      const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const targetId = sessionId || parsedBody?.id || parsedBody?.sessionId;

      if (!targetId) {
        return res.status(400).json({ error: 'Missing sessionId' });
      }

      let sessions = await loadSessionsFromSupabase(supabase);
      const updatedSessions = sessions.filter((s: any) => s.id !== targetId);
      await persistSessionsToSupabase(supabase, updatedSessions);
      return res.status(200).json({ success: true, sessions: updatedSessions });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to delete session' });
    }
  }

  // 4. ACTION: SESSIONS LIST & CREATE (DEFAULT)
  const sessions = await loadSessionsFromSupabase(supabase);

  // GET: Single session by ID or list all
  if (req.method === 'GET') {
    if (sessionId) {
      const found = sessions.find((s: any) => s.id === sessionId);
      if (found) {
        return res.status(200).json(found);
      }
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.status(200).json(sessions);
  }

  // POST: Create or update session
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { sessionId: bodyId, customerName, customerPhone } = body;
    const targetId = bodyId || sessionId;

    let session = sessions.find((s: any) => s.id === targetId);
    if (!session) {
      session = {
        id: targetId || `session-${Date.now()}`,
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
