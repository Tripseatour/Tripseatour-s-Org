import type { IncomingMessage, ServerResponse } from 'http';

const DEFAULT_CHANNEL_ACCESS_TOKEN = 'Na3ekdkIyTshDZwZItjOQGv4MXBqo/j6zzXfoES2K6Od6HEjLXDjookdpV5QzuUA6FqXknMZL3MwgiPNmupdAy9oZweKN5QKlTjdloODikwIgrlJEeyrWJW7vAzydq38jHDmKR1NZE58ji2oYNy9VwdB04t89/1O/w1cDnyilFU=';
const DEFAULT_LINE_GROUP_ID = 'C1bb0d71ad5dbb960801dad6bd5208afa';
const DEFAULT_DOMAIN = 'https://tripseatourphuket.vercel.app';

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
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { 
      message, 
      bookingRef = 'TEST', 
      type = 'TEST', 
      imageUrl,
      ticketImageUrl,
      slipImageUrl,
      slipUrl,
      channelToken: customToken,
      targetId: customTargetId
    } = body;

    const token = (customToken && customToken.trim().length > 10 && !customToken.startsWith('SIMULATED'))
      ? customToken.trim()
      : (process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || DEFAULT_CHANNEL_ACCESS_TOKEN);

    const targetId = (customTargetId && customTargetId.trim().length > 0)
      ? customTargetId.trim()
      : (process.env.LINE_MESSAGING_USER_ID || DEFAULT_LINE_GROUP_ID);

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Determine current app host URL for LINE image fetching
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = (req.headers['x-forwarded-proto'] || 'https').includes('https') ? 'https' : 'https';
    const baseUrl = hostHeader && !hostHeader.includes('localhost') 
      ? `${protocol}://${hostHeader}` 
      : DEFAULT_DOMAIN;



    const messagesPayload: any[] = [];

    // 1. Attach E-Ticket Image
    // If ticketImageUrl is direct https URL, use it, otherwise use our dynamic ticket endpoint
    const finalTicketUrl = (ticketImageUrl && ticketImageUrl.startsWith('https://'))
      ? ticketImageUrl
      : (bookingRef && bookingRef !== 'TEST' ? `${baseUrl}/api/ticket-image?ref=${bookingRef}` : null);

    if (finalTicketUrl) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: finalTicketUrl,
        previewImageUrl: finalTicketUrl
      });
    }

    // 2. Attach Slip Image (if slip is uploaded or provided)
    const effectiveSlip = slipImageUrl || slipUrl;
    let finalSlipUrl: string | null = null;

    if (effectiveSlip && effectiveSlip.startsWith('https://')) {
      finalSlipUrl = effectiveSlip;
    } else if (effectiveSlip || type === 'NEW_ORDER' || type === 'PAYMENT_VERIFIED') {
      finalSlipUrl = `${baseUrl}/api/slip-image?ref=${bookingRef}`;
    }

    if (finalSlipUrl) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: finalSlipUrl,
        previewImageUrl: finalSlipUrl
      });
    }

    // 3. If no ticket or slip image, but tour thumbnail exists
    if (messagesPayload.length === 0 && imageUrl && imageUrl.startsWith('https://')) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      });
    }

    // 4. Attach formatted Text Message
    messagesPayload.push({
      type: 'text',
      text: message
    });

    // Ensure we don't exceed LINE's maximum 5 messages per push
    const boundedPayload = messagesPayload.slice(0, 5);

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to: targetId,
        messages: boundedPayload
      })
    });

    const logItem = {
      id: `log-${Date.now()}`,
      bookingRef,
      type,
      message,
      status: response.ok ? 'sent' : 'failed',
      timestamp: new Date().toISOString()
    };

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE Messaging API Error:', response.status, errorText);

      // If image push failed (e.g. invalid image format), fallback to text-only push
      try {
        const fallbackRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            to: targetId,
            messages: [{ type: 'text', text: message }]
          })
        });

        if (fallbackRes.ok) {
          return res.status(200).json({
            success: true,
            logItem: { ...logItem, status: 'sent' }
          });
        }
      } catch (fbErr) {}

      return res.status(response.status).json({
        success: false,
        error: errorText,
        status: response.status,
        logItem: {
          ...logItem,
          status: 'failed',
          message: `${message} ❌ (Error ${response.status}: ${errorText})`
        }
      });
    }

    return res.status(200).json({
      success: true,
      logItem
    });
  } catch (error: any) {
    console.error('Failed to send LINE message:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal Server Error'
    });
  }
}
