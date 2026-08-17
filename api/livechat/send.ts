import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const DEFAULT_CHANNEL_ACCESS_TOKEN = 'Na3ekdkIyTshDZwZItjOQGv4MXBqo/j6zzXfoES2K6Od6HEjLXDjookdpV5QzuUA6FqXknMZL3MwgiPNmupdAy9oZweKN5QKlTjdloODikwIgrlJEeyrWJW7vAzydq38jHDmKR1NZE58ji2oYNy9VwdB04t89/1O/w1cDnyilFU=';
const DEFAULT_LINE_GROUP_ID = 'C1bb0d71ad5dbb960801dad6bd5208afa';
const DEFAULT_DOMAIN = 'https://tripseatourphuket.vercel.app';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { sessionId, sender, senderName, text, imageUrl } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const sessions = await loadSessionsFromSupabase(supabase);

    let session = sessions.find((s: any) => s.id === sessionId);
    if (!session) {
      session = {
        id: sessionId || `session-${Date.now()}`,
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

      // --- Trigger LINE Push Notification to Admin ---
      try {
        const { token, targetId } = await loadLineCredentials(supabase);
        const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = (req.headers['x-forwarded-proto'] || 'https').includes('https') ? 'https' : 'https';
        const siteUrl = hostHeader && !hostHeader.includes('localhost') 
          ? `${protocol}://${hostHeader}` 
          : DEFAULT_DOMAIN;

        const custName = session.customerName || senderName || 'นักท่องเที่ยวบนหน้าเว็บ';
        const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        
        const lineMessage = `💬 [แจ้งเตือนแชทสดลูกค้าใหม่!]\n` +
          `👤 ลูกค้า: ${custName}\n` +
          `💬 ข้อความ: "${text || (imageUrl ? '[แนบไฟล์รูปภาพ/สลิป]' : '')}"\n` +
          `⏰ เวลา: ${timeStr}\n` +
          `🔗 คลิกแชทตอบกลับทันที: ${siteUrl}/#admin (เมนู 💬 แชทสดลูกค้า)`;

        const messagesPayload: any[] = [];

        // If direct https image URL provided, attach as LINE image payload
        if (imageUrl && imageUrl.startsWith('https://')) {
          messagesPayload.push({
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
          });
        }

        // Add formatted text message
        messagesPayload.push({
          type: 'text',
          text: lineMessage
        });

        // Push message to LINE
        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            to: targetId,
            messages: messagesPayload.slice(0, 5)
          })
        });

        if (!lineRes.ok) {
          const errBody = await lineRes.text();
          console.error('LINE push failed:', lineRes.status, errBody);

          // Fallback to text-only push if image push was rejected
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              to: targetId,
              messages: [{ type: 'text', text: lineMessage }]
            })
          });
        }
      } catch (lineErr) {
        console.error('Error triggering LINE notification for live chat:', lineErr);
      }
    } else if (sender === 'admin') {
      session.unreadCount = 0;
    }

    await persistSessionsToSupabase(supabase, sessions);

    return res.status(200).json({
      success: true,
      message: newMsg,
      session
    });
  } catch (error: any) {
    console.error('Error in livechat/send handler:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}
