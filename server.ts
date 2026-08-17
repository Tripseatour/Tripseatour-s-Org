import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { initialTours, initialBookings, initialReviews, initialCustomers, initialSettings } from './src/data/mockData';
import { Tour, Booking, Review, Customer, AppSettings, LineNotificationLog, SalesStats, AdminUser } from './src/types';

const app = express();
const PORT = 3000;
const SITE_URL = process.env.APP_URL || 'https://tripseatourphuket.vercel.app';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

app.use(express.json({ limit: '10mb' }));

// Authoritative Memory DB State with Supabase persistence
let tours: Tour[] = [...initialTours];
let bookings: Booking[] = [...initialBookings];
let reviews: Review[] = [...initialReviews];
let customers: Customer[] = [...initialCustomers];
let settings: AppSettings = { ...initialSettings };
let detectedLineGroups: Array<{ groupId: string; groupName?: string; lastSeen: string }> = [
  {
    groupId: 'C1bb0d71ad5dbb960801dad6bd5208afa',
    groupName: 'กลุ่มแอดมินรับแจ้งเตือนจองทัวร์ ภูเก็ต (Trip Sea Tour)',
    lastSeen: new Date().toISOString()
  }
];
let lineLogs: LineNotificationLog[] = [
  {
    id: 'log-1',
    bookingRef: 'TST-202608-0101',
    type: 'PAYMENT_VERIFIED',
    message: '🟢 [ชำระเงินสำเร็จ] ออเดอร์ TST-202608-0101 (คุณณัฐพล) ยอดเงิน 5,170 บาท ผ่าน PromptPay แล้ว',
    status: 'simulated',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'log-2',
    bookingRef: 'TST-202608-0102',
    type: 'NEW_ORDER',
    message: '🔔 [มีออเดอร์ใหม่] TST-202608-0102 (David Miller) ยอดเงิน 4,980 บาท รอตรวจสอบสลิป',
    status: 'simulated',
    timestamp: new Date().toISOString()
  }
];

let isStateLoaded = false;

async function loadStateFromSupabase() {
  if (!supabase) return;
  
  // 1. Settings
  try {
    const { data: kvSettings } = await supabase.from('app_store').select('value').eq('key', 'settings').maybeSingle();
    if (kvSettings && kvSettings.value) {
      try {
        const parsed = JSON.parse(kvSettings.value);
        settings = { ...settings, ...parsed };
      } catch (e) {}
    } else {
      const { data: settingsData } = await supabase.from('settings').select('*').limit(1);
      if (settingsData && settingsData.length > 0) {
        const s = settingsData[0];
        settings = {
          siteName: s.site_name || settings.siteName,
          companyName: s.company_name || settings.companyName,
          promptPayId: s.promptpay_id || settings.promptPayId,
          promptPayName: s.promptpay_name || settings.promptPayName,
          lineMessagingChannelAccessToken: s.line_messaging_channel_access_token || s.line_notify_token || settings.lineMessagingChannelAccessToken,
          lineMessagingUserId: s.line_messaging_user_id || settings.lineMessagingUserId,
          lineNotifyToken: s.line_notify_token || settings.lineNotifyToken,
          lineOaId: s.line_oa_id || settings.lineOaId,
          contactPhone: s.contact_phone || settings.contactPhone,
          contactEmail: s.contact_email || settings.contactEmail,
          address: s.address || settings.address,
          adminPin: s.admin_pin || settings.adminPin,
          adminGoogleEmails: s.admin_google_emails || (settings.adminGoogleEmails && settings.adminGoogleEmails.length > 0 ? settings.adminGoogleEmails : ['asmr9941@gmail.com', 'admin@tripseatour.com']),
          tatLicenseNo: s.tat_license_no || settings.tatLicenseNo,
          tatLicenseImgUrl: s.tat_license_img_url || settings.tatLicenseImgUrl,
          facebookUrl: s.facebook_url || settings.facebookUrl
        };
      }
    }
    // Ensure promptPayName is set to พรทิพย์ แดงทัด if missing or previously company name
    if (!settings.promptPayName || settings.promptPayName.includes('บริษัท')) {
      settings.promptPayName = 'พรทิพย์ แดงทัด';
      await persistState('settings');
    }
  } catch (e) {
    console.warn('Could not load settings from Supabase:', e);
  }

  // 2. Tours
  try {
    const { data: kvTours } = await supabase.from('app_store').select('value').eq('key', 'tours').maybeSingle();
    if (kvTours && kvTours.value !== undefined && kvTours.value !== null) {
      try {
        tours = JSON.parse(kvTours.value);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Could not load tours from Supabase:', e);
  }

  // 3. Bookings
  try {
    const { data: kvBookings } = await supabase.from('app_store').select('value').eq('key', 'bookings').maybeSingle();
    if (kvBookings && kvBookings.value !== undefined && kvBookings.value !== null) {
      try {
        bookings = JSON.parse(kvBookings.value);
      } catch (e) {}
    } else {
      const { data: bkData } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (bkData && bkData.length > 0) {
        bookings = bkData.map((b: any) => ({
          id: b.id,
          bookingRef: b.booking_ref,
          tourId: b.tour_id,
          tourTitle: b.tour_title,
          tourImage: b.tour_image || '',
          customerName: b.customer_name,
          customerEmail: b.customer_email,
          customerPhone: b.customer_phone,
          customerLineId: b.customer_line_id,
          nationality: b.nationality || 'Thai',
          travelDate: b.travel_date,
          pickupHotel: b.pickup_hotel,
          pickupZone: b.pickup_zone,
          roomNumber: b.room_number,
          specialRequests: b.special_requests,
          adults: Number(b.adults) || 1,
          children: Number(b.children) || 0,
          infants: Number(b.infants) || 0,
          totalAmount: Number(b.total_amount) || 0,
          paymentMethod: b.payment_method || 'promptpay',
          promptPayIdUsed: b.promptpay_id_used,
          paymentStatus: b.payment_status || 'pending',
          orderStatus: b.order_status || 'pending',
          slipUrl: b.slip_url,
          slipUploadedAt: b.slip_uploaded_at,
          paidAt: b.paid_at,
          createdAt: b.created_at,
          lineNotifySent: b.line_notify_sent,
          reminderSent: b.reminder_sent,
          notes: b.notes
        }));
        // Immediately persist to app_store
        await persistState('bookings');
      }
    }
  } catch (e) {
    console.warn('Could not load bookings from Supabase:', e);
  }

  // 4. Reviews
  try {
    const { data: kvReviews } = await supabase.from('app_store').select('value').eq('key', 'reviews').maybeSingle();
    if (kvReviews && kvReviews.value !== undefined && kvReviews.value !== null) {
      try {
        reviews = JSON.parse(kvReviews.value);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Could not load reviews from Supabase:', e);
  }

  // 5. Customers
  try {
    const { data: kvCustomers } = await supabase.from('app_store').select('value').eq('key', 'customers').maybeSingle();
    if (kvCustomers && kvCustomers.value !== undefined && kvCustomers.value !== null) {
      try {
        customers = JSON.parse(kvCustomers.value);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Could not load customers from Supabase:', e);
  }

  // 6. Live Chat Sessions
  try {
    const { data: kvChat } = await supabase.from('app_store').select('value').eq('key', 'live_chat_sessions').maybeSingle();
    if (kvChat && kvChat.value !== undefined && kvChat.value !== null) {
      try {
        const loaded = JSON.parse(kvChat.value);
        if (Array.isArray(loaded) && loaded.length > 0) {
          liveChatSessions = loaded;
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Could not load live chat sessions from Supabase:', e);
  }
}

let syncMetadata = {
  version: 1,
  lastUpdatedAt: {
    tours: new Date().toISOString(),
    bookings: new Date().toISOString(),
    reviews: new Date().toISOString(),
    customers: new Date().toISOString(),
    settings: new Date().toISOString()
  }
};

export function updateSyncMetadata(key?: 'tours' | 'bookings' | 'reviews' | 'customers' | 'settings') {
  syncMetadata.version++;
  const iso = new Date().toISOString();
  if (key) {
    syncMetadata.lastUpdatedAt[key] = iso;
  } else {
    syncMetadata.lastUpdatedAt.tours = iso;
    syncMetadata.lastUpdatedAt.bookings = iso;
    syncMetadata.lastUpdatedAt.reviews = iso;
    syncMetadata.lastUpdatedAt.customers = iso;
    syncMetadata.lastUpdatedAt.settings = iso;
  }
}

async function persistState(key: 'tours' | 'bookings' | 'settings' | 'reviews' | 'customers') {
  updateSyncMetadata(key);
  if (!supabase) return;
  try {
    let val = '';
    if (key === 'tours') val = JSON.stringify(tours);
    if (key === 'bookings') val = JSON.stringify(bookings);
    if (key === 'settings') val = JSON.stringify(settings);
    if (key === 'reviews') val = JSON.stringify(reviews);
    if (key === 'customers') val = JSON.stringify(customers);

    const { error: kvError } = await supabase.from('app_store').upsert({ key, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (kvError) {
      console.log(`[Supabase app_store upsert info for ${key}]:`, kvError.message);
    }

    if (key === 'settings') {
      try {
        const { error: setErr } = await supabase.from('settings').upsert({
          id: 1,
          site_name: settings.siteName,
          company_name: settings.companyName,
          promptpay_id: settings.promptPayId,
          promptpay_name: settings.promptPayName,
          line_messaging_channel_access_token: settings.lineMessagingChannelAccessToken,
          line_messaging_user_id: settings.lineMessagingUserId,
          line_notify_token: settings.lineNotifyToken,
          line_oa_id: settings.lineOaId,
          contact_phone: settings.contactPhone,
          contact_email: settings.contactEmail,
          address: settings.address,
          admin_pin: settings.adminPin,
          admin_google_emails: settings.adminGoogleEmails,
          tat_license_no: settings.tatLicenseNo,
          tat_license_img_url: settings.tatLicenseImgUrl,
          facebook_url: settings.facebookUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (setErr) console.log('[Supabase settings upsert info]:', setErr.message);
      } catch (e) {
        // Ignore if settings table not present
      }
    }
  } catch (err) {
    console.error(`Error persisting ${key} to Supabase:`, err);
  }
}

// Middleware to ensure persistent state is loaded on every API call on Vercel
app.use(async (req, res, next) => {
  if (!isStateLoaded && supabase) {
    await loadStateFromSupabase();
    isStateLoaded = true;
  }
  next();
});

// Helper: Trigger LINE Notification via Messaging API with E-Ticket & Slip image attachment
async function sendLineNotification(
  message: string,
  bookingRef: string = 'N/A',
  type: 'NEW_ORDER' | 'PAYMENT_VERIFIED' | 'ORDER_CONFIRMED' | 'REMINDER_24H' | 'TEST' = 'NEW_ORDER',
  imageUrl?: string,
  ticketImageUrl?: string,
  slipImageUrl?: string
) {
  const logItem: LineNotificationLog = {
    id: `log-${Date.now()}`,
    bookingRef,
    type,
    message,
    status: 'simulated',
    timestamp: new Date().toISOString()
  };

  const channelToken = (settings.lineMessagingChannelAccessToken && settings.lineMessagingChannelAccessToken.trim().length > 0 && !settings.lineMessagingChannelAccessToken.startsWith('SIMULATED'))
    ? settings.lineMessagingChannelAccessToken.trim()
    : initialSettings.lineMessagingChannelAccessToken;
  const targetId = (settings.lineMessagingUserId && settings.lineMessagingUserId.trim().length > 0)
    ? settings.lineMessagingUserId.trim()
    : initialSettings.lineMessagingUserId;

  if (channelToken && !channelToken.startsWith('SIMULATED')) {
    try {
      const messagesPayload: any[] = [];
      const hostUrl = SITE_URL || 'https://tripseatourphuket.vercel.app';

      // 1. E-Ticket Image
      const effectiveTicketUrl = (ticketImageUrl && ticketImageUrl.startsWith('https://'))
        ? ticketImageUrl
        : (bookingRef && bookingRef !== 'N/A' && bookingRef !== 'TEST' ? `${hostUrl}/api/ticket-image?ref=${bookingRef}` : null);

      if (effectiveTicketUrl) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: effectiveTicketUrl,
          previewImageUrl: effectiveTicketUrl
        });
      }

      // 2. Slip Image
      const effectiveSlipUrl = (slipImageUrl && slipImageUrl.startsWith('https://'))
        ? slipImageUrl
        : (slipImageUrl || type === 'NEW_ORDER' || type === 'PAYMENT_VERIFIED' 
            ? `${hostUrl}/api/slip-image?ref=${bookingRef}` 
            : null);

      if (effectiveSlipUrl) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: effectiveSlipUrl,
          previewImageUrl: effectiveSlipUrl
        });
      }

      // 3. Fallback Tour Thumbnail (if no ticket or slip attached)
      if (messagesPayload.length === 0 && imageUrl && imageUrl.startsWith('https://')) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        });
      }

      // 4. Detailed Text Message
      messagesPayload.push({
        type: 'text',
        text: message
      });

      const boundedPayload = messagesPayload.slice(0, 5);

      let response;
      if (targetId && targetId.trim().length > 0) {
        // Push Message to Group ID / User ID
        response = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${channelToken.trim()}`
          },
          body: JSON.stringify({
            to: targetId.trim(),
            messages: boundedPayload
          })
        });
      } else {
        // Broadcast Message
        response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${channelToken.trim()}`
          },
          body: JSON.stringify({
            messages: boundedPayload
          })
        });
      }

      if (response.ok) {
        logItem.status = 'sent';
      } else {
        const errorText = await response.text();
        console.error('LINE Messaging API Error:', response.status, errorText);

        // Fallback to text-only push if images failed
        try {
          const fallbackRes = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${channelToken.trim()}`
            },
            body: JSON.stringify({
              to: targetId.trim(),
              messages: [{ type: 'text', text: message }]
            })
          });
          if (fallbackRes.ok) {
            logItem.status = 'sent';
          } else {
            logItem.status = 'failed';
            logItem.message = `${logItem.message} ❌ (Error ${response.status}: ${errorText})`;
          }
        } catch (e) {
          logItem.status = 'failed';
          logItem.message = `${logItem.message} ❌ (Error ${response.status}: ${errorText})`;
        }
      }
    } catch (err: any) {
      console.error('Error sending LINE Messaging API:', err);
      logItem.status = 'failed';
      logItem.message = `${logItem.message} ❌ (Network Error: ${err?.message || err})`;
    }
  }

  lineLogs.unshift(logItem);
  if (lineLogs.length > 50) lineLogs.pop();
  return logItem;
}

// Automated 24h Reminder Scanner
async function checkAndSend24hReminders() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  let sentCount = 0;
  const sentBookings: Booking[] = [];

  for (const booking of bookings) {
    if ((booking.orderStatus === 'confirmed' || booking.paymentStatus === 'verified') && !booking.reminderSent) {
      const travelDateStr = booking.travelDate;
      const travelTime = new Date(travelDateStr).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.round((travelTime - todayTime) / (1000 * 3600 * 24));

      if (diffDays === 1 || travelDateStr === tomorrowStr || (diffDays >= 0 && diffDays <= 1)) {
        const lineMsg = `\n⏰ [แจ้งเตือนใกล้วันเดินทาง - 24 ชม.]\n` +
          `🎫 รหัสการจอง: ${booking.bookingRef}\n` +
          `👤 ลูกค้า: ${booking.customerName} (${booking.customerPhone})\n` +
          `📍 ทัวร์: ${booking.tourTitle}\n` +
          `📅 วันเดินทาง: ${booking.travelDate}\n` +
          `🏨 โรงแรมรับส่ง: ${booking.pickupHotel} (ห้อง ${booking.roomNumber || 'ยังไม่ระบุ'})\n` +
          `👥 จำนวน: ผู้ใหญ่ ${booking.adults} / เด็ก ${booking.children}\n` +
          `📌 สถานะ: ยืนยันเรียบร้อยแล้ว (พร้อมต้อนรับลูกค้า!)\n` +
          `🌐 เว็บไซต์: ${SITE_URL}`;

        await sendLineNotification(lineMsg, booking.bookingRef, 'REMINDER_24H', booking.tourImage);
        booking.reminderSent = true;
        booking.reminderSentAt = new Date().toISOString();
        sentCount++;
        sentBookings.push(booking);
      }
    }
  }

  return { sentCount, sentBookings };
}

// API ROUTES
app.get('/api/sync-status', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    version: syncMetadata.version,
    lastUpdatedAt: syncMetadata.lastUpdatedAt
  });
});
// --- Tours ---
app.get('/api/tours', (req, res) => {
  res.json(tours);
});

app.post('/api/tours', async (req, res) => {
  const newTour: Tour = {
    ...req.body,
    id: `tour-${Date.now()}`,
    slug: req.body.slug || `tour-${Date.now()}`
  };
  tours.unshift(newTour);
  await persistState('tours');
  res.json({ ...newTour, version: syncMetadata.version });
});

app.put('/api/tours/:id', async (req, res) => {
  const { id } = req.params;
  const index = tours.findIndex(t => t.id === id);
  if (index !== -1) {
    tours[index] = { ...tours[index], ...req.body };
    await persistState('tours');
    res.json({ ...tours[index], version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Tour not found' });
  }
});

app.delete('/api/tours/:id', async (req, res) => {
  const { id } = req.params;
  tours = tours.filter(t => t.id !== id);
  await persistState('tours');
  res.json({ success: true, id, version: syncMetadata.version });
});

// --- Bookings ---
app.get('/api/bookings', (req, res) => {
  res.json(bookings);
});

app.post('/api/bookings', async (req, res) => {
  const {
    tourId, customerName, customerEmail, customerPhone, customerLineId,
    nationality, travelDate, pickupHotel, pickupZone, roomNumber, specialRequests,
    adults, children, infants, totalAmount, slipUrl, paymentStatus
  } = req.body;

  const tour = tours.find(t => t.id === tourId);
  const refNum = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = `TST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${refNum}`;

  const hasSlip = Boolean(slipUrl && slipUrl.trim().length > 0);

  const newBooking: Booking = {
    id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingRef,
    tourId,
    tourTitle: tour ? tour.title.TH : 'ทัวร์ภูเก็ต',
    tourImage: tour && tour.images.length ? tour.images[0] : '',
    customerName,
    customerEmail,
    customerPhone,
    customerLineId,
    nationality: nationality || 'Thai',
    travelDate,
    pickupHotel,
    pickupZone: pickupZone || 'General Zone',
    roomNumber,
    specialRequests,
    adults: Number(adults) || 1,
    children: Number(children) || 0,
    infants: Number(infants) || 0,
    totalAmount: Number(totalAmount) || 0,
    paymentMethod: 'promptpay',
    promptPayIdUsed: settings.promptPayId,
    paymentStatus: hasSlip ? 'slip_uploaded' : (paymentStatus || 'pending'),
    orderStatus: 'pending',
    slipUrl: hasSlip ? slipUrl : undefined,
    slipUploadedAt: hasSlip ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
    lineNotifySent: false
  };

  bookings.unshift(newBooking);

  // Auto update / save Customer CRM
  let custIndex = customers.findIndex(c => c.email === customerEmail || c.phone === customerPhone);
  if (custIndex !== -1) {
    customers[custIndex].totalBookings += 1;
    customers[custIndex].totalSpent += newBooking.totalAmount;
    customers[custIndex].lastBookingDate = new Date().toISOString().split('T')[0];
  } else {
    customers.unshift({
      id: `cust-${Date.now()}`,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      lineId: customerLineId,
      nationality: nationality || 'Thai',
      totalBookings: 1,
      totalSpent: newBooking.totalAmount,
      lastBookingDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0]
    });
  }

  // LINE Notification Alert
  const lineMsg = `\n🆕 [มีคำสั่งจองใหม่${hasSlip ? ' (แนบสลิปแล้ว)' : ''}!] ${bookingRef}\n` +
    `📍 ทัวร์: ${newBooking.tourTitle}\n` +
    `👤 ลูกค้า: ${customerName} (${customerPhone})\n` +
    `📅 วันเดินทาง: ${travelDate}\n` +
    `🏨 โรงแรม: ${pickupHotel}\n` +
    `👥 จำนวน: ผู้ใหญ่ ${adults} / เด็ก ${children}\n` +
    `💰 ยอดรวม: ${totalAmount.toLocaleString()} บาท (PromptPay QR)\n` +
    `📄 สลิปโอนเงิน: ${hasSlip ? 'แนบสลิปเรียบร้อย' : 'รอแนบสลิป'}\n` +
    `🌐 เว็บไซต์: ${SITE_URL}`;

  await sendLineNotification(lineMsg, bookingRef, hasSlip ? 'NEW_ORDER' : 'NEW_ORDER', (hasSlip ? slipUrl : undefined) || newBooking.tourImage);
  newBooking.lineNotifySent = true;

  await persistState('bookings');
  await persistState('customers');

  res.json({ ...newBooking, version: syncMetadata.version });
});

app.post('/api/bookings/:id/upload-slip', async (req, res) => {
  const { id } = req.params;
  const { slipUrl } = req.body;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.slipUrl = slipUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80';
  booking.paymentStatus = 'slip_uploaded';
  booking.slipUploadedAt = new Date().toISOString();

  const msg = `\n📄 [สลิปแจ้งชำระเงิน] ${booking.bookingRef}\n` +
    `👤 ${booking.customerName} อัปโหลดสลิปเรียบร้อยแล้ว\n` +
    `💰 ยอดชำระ: ${booking.totalAmount.toLocaleString()} บาท\n` +
    `🌐 ตรวจสอบที่: ${SITE_URL}`;

  await sendLineNotification(msg, booking.bookingRef, 'NEW_ORDER', booking.slipUrl || booking.tourImage);
  await persistState('bookings');

  res.json({ ...booking, version: syncMetadata.version });
});

app.put('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, orderStatus } = req.body;
  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (paymentStatus) booking.paymentStatus = paymentStatus;
  if (orderStatus) booking.orderStatus = orderStatus;

  if (paymentStatus === 'verified') {
    booking.paidAt = new Date().toISOString();
    booking.orderStatus = 'confirmed';

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(booking.bookingRef)}`;
    const ticketImageUrl = booking.tourImage || 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80';

    const msg = `🎫 [ตั๋วอิเล็กทรอนิกส์ E-TICKET / VOUCHER ยืนยันการจองเรียบร้อย]\n` +
      `═════════════════════════\n` +
      `📌 รหัสตั๋ว: ${booking.bookingRef}\n` +
      `📍 ทัวร์: ${booking.tourTitle}\n` +
      `📅 วันเดินทาง: ${booking.travelDate}\n` +
      `⏰ เวลานัดรับ: ${booking.pickupTime || '07:30 - 08:00 น.'}\n` +
      `👤 ผู้เดินทาง: ${booking.customerName} (${booking.customerPhone})\n` +
      `🏨 โรงแรมที่รับ: ${booking.pickupHotel} (ห้อง: ${booking.roomNumber || 'ยังไม่ระบุ'} / โซน: ${booking.pickupZone || 'ทั่วไป'})\n` +
      `👥 จำนวน: ผู้ใหญ่ ${booking.adults} ท่าน / เด็ก ${booking.children || 0} ท่าน / ทารก ${booking.infants || 0} ท่าน\n` +
      `💰 ยอดชำระสุทธิ: ฿${booking.totalAmount.toLocaleString()} (ชำระผ่าน PromptPay แล้ว)\n` +
      `═════════════════════════\n` +
      `🔗 สแกนตรวจตั๋ว: ${qrUrl}\n` +
      `🌐 เว็บไซต์: ${SITE_URL}\n` +
      `ℹ️ ออกตั๋ว E-Voucher อัตโนมัติในระบบเรียบร้อย สามารถนำไปแสดงต่อคนขับ/ไกด์ในวันเดินทางได้ทันที`;

    await sendLineNotification(msg, booking.bookingRef, 'PAYMENT_VERIFIED', ticketImageUrl);
  }

  await persistState('bookings');

  res.json({ ...booking, version: syncMetadata.version });
});

// Delete Booking Order API
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  bookings = bookings.filter(b => b.id !== id && b.bookingRef !== id);
  await persistState('bookings');
  if (supabase) {
    try {
      await supabase.from('bookings').delete().or(`id.eq.${id},booking_ref.eq.${id}`);
    } catch (e) {
      console.warn('Supabase row delete info:', e);
    }
  }
  res.json({ success: true, id, version: syncMetadata.version, message: 'Deleted booking successfully' });
});

// Supabase Connection Status API
app.get('/api/admin/supabase-status', async (req, res) => {
  if (!supabase) {
    return res.json({
      connected: false,
      url: null,
      message: 'Supabase client is not initialized'
    });
  }

  try {
    const { data, error } = await supabase.from('app_store').select('key').limit(5);
    res.json({
      connected: !error,
      url: SUPABASE_URL,
      keysFound: data ? data.map((d: any) => d.key) : [],
      error: error ? error.message : null
    });
  } catch (err: any) {
    res.json({
      connected: false,
      url: SUPABASE_URL,
      error: err?.message || 'Database ping error'
    });
  }
});

// Purge / Clean orphaned deleted data from Supabase
app.post('/api/admin/clean-deleted-data', async (req, res) => {
  try {
    await persistState('tours');
    await persistState('bookings');
    await persistState('reviews');
    await persistState('customers');
    await persistState('settings');

    if (supabase) {
      // Clean relational table entries that don't match current bookings memory
      const currentBookingIds = bookings.map(b => b.id);
      const currentRefs = bookings.map(b => b.bookingRef);
      const { data: dbBookings } = await supabase.from('bookings').select('id, booking_ref');
      if (dbBookings && dbBookings.length > 0) {
        for (const row of dbBookings) {
          if (!currentBookingIds.includes(row.id) && !currentRefs.includes(row.booking_ref)) {
            await supabase.from('bookings').delete().eq('id', row.id);
          }
        }
      }
    }

    res.json({ success: true, message: 'ล้างข้อมูลเก่าที่ลบไปแล้วใน Supabase เรียบร้อยแล้ว (Sync Complete)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clean Supabase data', details: err?.message });
  }
});

// Manual Backup Database API to force write state to Supabase
app.post('/api/admin/backup-database', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Supabase client is not initialized. Cannot perform backup.'
      });
    }

    // Force persist all memory states
    await persistState('tours');
    await persistState('bookings');
    await persistState('reviews');
    await persistState('customers');
    await persistState('settings');

    // Synchronize individual bookings inside the relational 'bookings' table for extra manual data safety
    for (const b of bookings) {
      try {
        await supabase.from('bookings').upsert({
          id: b.id,
          booking_ref: b.bookingRef,
          tour_id: b.tourId,
          tour_title: b.tourTitle,
          tour_image: b.tourImage,
          customer_name: b.customerName,
          customer_email: b.customerEmail,
          customer_phone: b.customerPhone,
          customer_line_id: b.customerLineId,
          nationality: b.nationality || 'Thai',
          travel_date: b.travelDate,
          pickup_hotel: b.pickupHotel,
          pickup_zone: b.pickupZone,
          room_number: b.roomNumber,
          special_requests: b.specialRequests,
          adults: b.adults,
          children: b.children,
          infants: b.infants,
          total_amount: b.totalAmount,
          payment_method: b.paymentMethod,
          promptpay_id_used: b.promptPayIdUsed,
          payment_status: b.paymentStatus,
          order_status: b.orderStatus,
          slip_url: b.slipUrl,
          slip_uploaded_at: b.slipUploadedAt,
          paid_at: b.paidAt,
          created_at: b.createdAt || new Date().toISOString(),
          line_notify_sent: b.lineNotifySent,
          reminder_sent: b.reminderSent,
          notes: b.notes
        }, { onConflict: 'id' });
      } catch (upsertErr) {
        console.warn(`Could not sync individual booking ${b.bookingRef} to relational DB:`, upsertErr);
      }
    }

    res.json({
      success: true,
      message: 'สำรองข้อมูลทั้งหมดและซิงค์ความปลอดภัยไปยัง Supabase เรียบร้อยแล้ว',
      backupTime: new Date().toISOString(),
      counts: {
        tours: tours.length,
        bookings: bookings.length,
        reviews: reviews.length,
        customers: customers.length
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสำรองข้อมูล',
      details: err?.message || 'Unknown error'
    });
  }
});

// --- Reviews Management API ---
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/api/reviews', async (req, res) => {
  const { tourId, userName, rating, comment, nationality, photo, photos } = req.body;
  const photoList = Array.isArray(photos) && photos.length > 0 
    ? photos 
    : (photo ? [photo] : undefined);

  const newRev: Review = {
    id: `rev-${Date.now()}`,
    tourId: tourId || (tours[0]?.id || 'tour-1'),
    userName: userName || 'ผู้ใช้งาน',
    nationality: nationality || 'TH',
    rating: Number(rating) || 5,
    comment: comment || '',
    date: new Date().toISOString().split('T')[0],
    verifiedBooking: true,
    photos: photoList,
    isApproved: true
  };
  reviews.unshift(newRev);

  // Update tour rating average
  const tour = tours.find(t => t.id === newRev.tourId);
  if (tour) {
    const tourRevs = reviews.filter(r => r.tourId === newRev.tourId);
    const avg = tourRevs.reduce((acc, curr) => acc + curr.rating, 0) / tourRevs.length;
    tour.rating = Number(avg.toFixed(2));
    tour.reviewCount = tourRevs.length;
    await persistState('tours');
  }

  await persistState('reviews');
  res.json({ ...newRev, version: syncMetadata.version });
});

app.put('/api/reviews/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    rev.adminReply = reply;
    rev.adminReplyDate = new Date().toISOString().split('T')[0];
    await persistState('reviews');
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.put('/api/reviews/:id/status', async (req, res) => {
  const { id } = req.params;
  const { isApproved } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    rev.isApproved = isApproved !== undefined ? isApproved : !rev.isApproved;
    await persistState('reviews');
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.put('/api/reviews/:id', async (req, res) => {
  const { id } = req.params;
  const { photos, comment, userName, rating } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    if (photos !== undefined) {
      rev.photos = Array.isArray(photos) ? photos : (photos ? [photos] : []);
    }
    if (comment !== undefined) rev.comment = comment;
    if (userName !== undefined) rev.userName = userName;
    if (rating !== undefined) rev.rating = Number(rating) || rev.rating;
    
    await persistState('reviews');
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  const { id } = req.params;
  const initialLen = reviews.length;
  reviews = reviews.filter(r => r.id !== id);
  if (reviews.length < initialLen) {
    await persistState('reviews');
    res.json({ success: true, id, version: syncMetadata.version, message: 'Review deleted successfully' });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

// --- AI Review Reply Generator (Powered by Gemini AI) ---
app.post('/api/ai/reply-review', async (req, res) => {
  try {
    const { reviewComment, rating, customerName, tourTitle } = req.body;

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are the official management team of "Trip Sea Tour Phuket" (ทริปซีทัวร์ ภูเก็ต - TAT License 33/11100).
Generate a warm, professional, polite, and personalized Thai reply to this customer review:
Customer Name: ${customerName || 'ลูกค้าท่านสำคัญ'}
Tour: ${tourTitle || 'ทัวร์ภูเก็ต'}
Rating: ${rating || 5}/5 Stars
Review: "${reviewComment || 'บริการดีมาก ประทับใจมากครับ'}"

Requirements:
- Polite Thai language using formal yet friendly tone (ค่ะ/ครับ)
- Express sincere appreciation for their patronage
- Address their specific positive comments or feedback
- Wish them safe travels and invite them back warmly
- Keep response length concise and natural (2-4 sentences). Do not include quotes or prefixes.`,
      });

      const reply = response.text?.trim() || `ขอบพระคุณคุณ ${customerName || 'ลูกค้า'} เป็นอย่างสูงที่ไว้วางใจเลือกเดินทางกับ Trip Sea Tour Phuket ค่ะ ทางทีมงานยินดีเป็นอย่างยิ่งที่ได้มอบความประทับใจ และหวังว่าจะมีโอกาสได้ต้อนรับท่านอีกครั้งในทริปหน้านะคะ! 🌊🙏`;
      return res.json({ reply });
    } else {
      const reply = `ขอบพระคุณคุณ ${customerName || 'ลูกค้า'} เป็นอย่างสูงที่เลือกใช้บริการ Trip Sea Tour Phuket และมอบคะแนน ${rating || 5} ดาวให้พวกเราค่ะ ทางทีมงานรู้สึกยินดีและเป็นเกียรติอย่างยิ่งที่ได้ดูแล หวังว่าจะได้ต้อนรับท่านอีกในโอกาสต่อไปนะคะ! 🌊🙏`;
      return res.json({ reply });
    }
  } catch (err: any) {
    console.error('Error generating AI review reply:', err);
    res.json({
      reply: `ขอบพระคุณคุณ ${req.body.customerName || 'ลูกค้า'} มากค่ะที่ไว้วางใจและประทับใจบริการของ Trip Sea Tour Phuket ยินดีต้อนรับเสมอค่ะ`
    });
  }
});

// --- TripSeaTour AI Chatbot (Powered by Gemini AI with Smart Knowledge Fallback) ---
function generateSmartFallbackReply(message: string, language: string = 'TH'): string {
  const lower = (message || '').toLowerCase().trim();
  const phone = settings.contactPhone || '062-681-6494 / 097-924-1399';
  const lineOa = settings.lineOaId || '@056hxinu';
  const fb = settings.facebookUrl || 'https://www.facebook.com/tripseatoursphuket/';
  const tat = settings.tatLicenseNo || '33/11100';

  // Format list of active tours dynamically
  const tourListText = tours.map((t, idx) => {
    const title = language === 'EN' ? t.title.EN : t.title.TH;
    return `🏝️ **${idx + 1}. ${title}**\n   • ราคาโปรโมชั่น: ผู้ใหญ่ **฿${t.priceAdult.toLocaleString()}** / เด็ก **฿${t.priceChild.toLocaleString()}** (จากปกติ ฿${t.originalPriceAdult.toLocaleString()})\n   • ไฮไลท์: ${t.highlights.TH?.slice(0, 3).join(', ')}`;
  }).join('\n\n');

  // 1. Greetings
  if (lower === 'สวัสดี' || lower === 'สวัสดีครับ' || lower === 'สวัสดีค่ะ' || lower.includes('hello') || lower.includes('hi') || lower === 'หวัดดี' || lower === 'ดีครับ' || lower === 'ดีค่ะ' || lower.includes('hey')) {
    return `สวัสดีค่ะ! ยินดีต้อนรับสู่ **Trip Sea Tour Phuket** ค่ะ 🌊✨\n\nเรามีบริการนำเที่ยวทางทะเลภูเก็ตครบวงจร พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\nโปรแกรมแนะนำยอดนิยมวันนี้:\n${tourListText}\n\n💬 ท่านสามารถสอบถามรายละเอียดโปรแกรม หรือจองทัวร์ผ่านระบบบนเว็บได้ทันที หรือแอดไลน์ **${lineOa}** (โทร **${phone}**) ได้ตลอด 24 ชม. เลยนะคะ!`;
  }

  // 2. Specific Islands / Tour Queries
  if (lower.includes('พีพี') || lower.includes('phi phi') || lower.includes('มาหยา') || lower.includes('maya') || lower.includes('ปิเละ') || lower.includes('pileh')) {
    const ppTour = tours.find(t => t.id.includes('phi-phi') || t.title.TH.includes('พีพี'));
    const priceA = ppTour ? ppTour.priceAdult.toLocaleString() : '1,590';
    const priceC = ppTour ? ppTour.priceChild.toLocaleString() : '1,190';
    return `🏝️ **ทัวร์เกาะพีพี - อ่าวมาหยา - ปิเละลากูน - เกาะไข่ (เรือสปีดโบ๊ท)**\n\n` +
      `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿${priceA}** / เด็ก **฿${priceC}**\n` +
      `• **จุดท่องเที่ยวไฮไลท์**:\n` +
      `  - ถ่ายรูปชมความงามระดับโลกที่ **อ่าวมาหยา** (Maya Bay)\n` +
      `  - กระโดดเล่นน้ำ พายแพดเดิลบอร์ดที่ **ปิเละลากูน** (Pileh Lagoon สระว่ายน้ำกลางทะเล)\n` +
      `  - ดำน้ำตื้นชมปะการังและฝูงปลาหลากสีสัน\n` +
      `  - พักผ่อนชายหาดขาวละเอียดที่ **เกาะไข่นอก**\n` +
      `• **บริการที่รวมในแพ็กเกจ**: รถตู้ VIP รับส่งโรงแรม, บุฟเฟต์อาหารกลางวัน, ผลไม้และเครื่องดื่ม, อุปกรณ์ดำน้ำ Snorkel, เสื้อชูชีพ, ไกด์มืออาชีพ และประกันภัยอุบัติเหตุทางทะเลค่ะ\n\n` +
      `กดปุ่ม **"จองทัวร์นี้"** บนหน้าเว็บเพื่อรับสิทธิ์โปรโมชั่นได้เลยค่ะ!`;
  }

  if (lower.includes('พังงา') || lower.includes('phang nga') || lower.includes('เจมส์บอนด์') || lower.includes('james bond') || lower.includes('เกาะห้อง') || lower.includes('เกาะปันหยี') || lower.includes('แคนู')) {
    const jbTour = tours.find(t => t.id.includes('james-bond') || t.title.TH.includes('เจมส์บอนด์') || t.title.TH.includes('พังงา'));
    const priceA = jbTour ? jbTour.priceAdult.toLocaleString() : '1,690';
    const priceC = jbTour ? jbTour.priceChild.toLocaleString() : '1,290';
    return `🚣 **ทัวร์อ่าวพังงา - เขาตะปู - เกาะเจมส์บอนด์ & พายแคนูเกาะห้อง**\n\n` +
      `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿${priceA}** / เด็ก **฿${priceC}**\n` +
      `• **จุดท่องเที่ยวไฮไลท์**:\n` +
      `  - สัมผัสความมหัศจรรย์ของ **เขาตะปู (James Bond Island)** สถานที่ถ่ายทำภาพยนตร์ 007\n` +
      `  - ล่องเรือแคนูลอดถ้ำหินงอกหินย้อยตระการตาที่ **เกาะห้อง พังงา** (มีสต๊าฟพายให้ นั่งชิลล์สบาย)\n` +
      `  - ทานอาหารกลางวันบน **เกาะปันหยี** หมู่บ้านชาวเลกลางน้ำชื่อดัง\n` +
      `• **บริการที่รวมในแพ็กเกจ**: รถตู้รับส่ง, อาหารกลางวัน, เรือแคนูพร้อมคนพาย, ไกด์ และประกันภัย ททท. ค่ะ!`;
  }

  if (lower.includes('ยอชท์') || lower.includes('yacht') || lower.includes('คาทามารัน') || lower.includes('catamaran') || lower.includes('พระอาทิตย์ตก') || lower.includes('sunset') || lower.includes('แหลมพรหมเทพ') || lower.includes('เกาะเฮ') || lower.includes('coral island')) {
    const yachtTour = tours.find(t => t.id.includes('yacht') || t.title.TH.includes('ยอชท์'));
    const priceA = yachtTour ? yachtTour.priceAdult.toLocaleString() : '2,490';
    const priceC = yachtTour ? yachtTour.priceChild.toLocaleString() : '1,790';
    return `⛵ **ล่องเรือยอชท์คาทามารันสุดหรู เกาะเฮ (Coral Island) & ชมพระอาทิตย์ตกแหลมพรหมเทพ**\n\n` +
      `• **ราคาโปรโมชั่นพิเศษ**: ผู้ใหญ่ **฿${priceA}** / เด็ก **฿${priceC}**\n` +
      `• **ความพิเศษและไฮไลท์**:\n` +
      `  - พักผ่อนและถ่ายรูปสวยสไตล์ Luxury บนตาข่ายหน้าเรือยอชท์\n` +
      `  - ดำน้ำและเล่นกิจกรรมทางน้ำที่ **เกาะเฮ (Banana Beach / Coral Island)**\n` +
      `  - ล่องเรือชมแสงทไวไลท์และพระอาทิตย์ตกดินสุดโรแมนติก ณ จุดชมวิว **แหลมพรหมเทพ**\n` +
      `• **บริการที่รวม**: เซ็ตอาหารและเครื่องดื่มบนเรือ, อุปกรณ์ดำน้ำ Snorkeling, ผ้าเช็ดตัว, ไกด์ และประกันภัยค่ะ!`;
  }

  // 3. Price & Promotions
  if (lower.includes('ราคา') || lower.includes('price') || lower.includes('โปร') || lower.includes('แพง') || lower.includes('cost') || lower.includes('เท่าไหร่') || lower.includes('กี่บาท')) {
    return `💰 **ราคาโปรโมชั่นทัวร์ภูเก็ตสุดคุ้มประจำวันนี้ค่ะ**:\n\n${tourListText}\n\n✅ ทุกแพ็กเกจเป็นราคารวมทุกอย่างแล้ว ไม่มีค่าใช้จ่ายแอบแฝง\n✅ รวมรถตู้รับ-ส่งฟรีจากโรงแรมในภูเก็ต (ป่าตอง, กะรน, กะตะ, ตัวเมืองภูเก็ต ฯลฯ)\n✅ ชำระง่ายผ่าน PromptPay QR Code พร้อมออก E-Ticket ทันทีค่ะ!`;
  }

  // 4. Booking & Payment Steps
  if (lower.includes('จอง') || lower.includes('book') || lower.includes('ชำระ') || lower.includes('จ่าย') || lower.includes('โอน') || lower.includes('สแกน') || lower.includes('พร้อมเพย์') || lower.includes('promptpay') || lower.includes('สลิป') || lower.includes('slip') || lower.includes('เงิน')) {
    return `💳 **ขั้นตอนการจองและชำระเงินง่ายๆ ใน 4 ขั้นตอนค่ะ**:\n\n` +
      `1️⃣ **เลือกทัวร์และวันที่ต้องการเดินทาง**: กดปุ่ม "จองทัวร์นี้" บนโปรแกรมที่ท่านต้องการ\n` +
      `2️⃣ **กรอกข้อมูลผู้เดินทาง**: ระบุชื่อ, เบอร์โทร และชื่อโรงแรมที่พักในภูเก็ตสำหรับให้รถตู้ไปรับ\n` +
      `3️⃣ **สแกนจ่ายผ่าน PromptPay QR**: สแกนจ่ายได้ทุกแอปธนาคาร ยอดเงินตรง สะดวก รวดเร็ว ไม่มีค่าธรรมเนียม\n` +
      `4️⃣ **แนบสลิป รับ E-Ticket ทันที**: ระบบจะตรวจสอบและออกตั๋ว Voucher อิเล็กทรอนิกส์พร้อมส่งแจ้งเตือนเข้า LINE ทันทีค่ะ\n\n` +
      `💬 หรือหากสะดวกจองผ่านแอดมิน ทัก LINE ได้ที่: **${lineOa}** ได้ตลอด 24 ชม. ค่ะ`;
  }

  // 5. Hotel Transfer & Pickup Time
  if (lower.includes('รับส่ง') || lower.includes('โรงแรม') || lower.includes('hotel') || lower.includes('pickup') || lower.includes('เวลารับ') || lower.includes('กี่โมง') || lower.includes('zone') || lower.includes('โซน')) {
    return `🚐 **บริการรถรับ-ส่งโรงแรมในจังหวัดภูเก็ต**:\n\n` +
      `• **เวลานัดรับช่วงเช้า**: ประมาณ **07:30 - 08:00 น.** (ขึ้นอยู่กับทำเลที่ตั้งของโรงแรมท่าน)\n` +
      `• **เวลาเดินทางกลับส่งโรงแรม**: ประมาณ **16:30 - 17:30 น.**\n` +
      `• **โซนรับส่งฟรี**: ป่าตอง, กะรน, กะตะ, ในหาน, ราไวย์, ฉลอง และตัวเมืองภูเก็ต\n` +
      `• **การนัดหมาย**: คนขับรถตู้ VIP จะไปรับท่านที่หน้าล็อบบี้โรงแรมตามเวลาที่ระบุบนตั๋ว E-Ticket ค่ะ\n\n` +
      `📌 ก่อนวันเดินทาง 1 วัน ระบบจะมีข้อความแจ้งเตือนคอนเฟิร์มเวลารับส่งผ่านทาง LINE อีกครั้งเพื่อความอุ่นใจค่ะ!`;
  }

  // 6. TAT License & Safety & Insurance
  if (lower.includes('ใบอนุญาต') || lower.includes('ททท') || lower.includes('tat') || lower.includes('ประกัน') || lower.includes('ถูกต้อง') || lower.includes('ปลอดภัย') || lower.includes('license') || lower.includes('safe') || lower.includes('insurance')) {
    return `🛡️ **ความปลอดภัยและความน่าเชื่อถือที่ Trip Sea Tour Phuket**:\n\n` +
      `• **ใบอนุญาตประกอบธุรกิจนำเที่ยว ททท.**: เลขที่ **${tat}** (ออกโดยกรมการท่องเที่ยวแห่งประเทศไทย ตรวจสอบได้ 100%)\n` +
      `• **ประกันภัยอุบัติเหตุทางทะเล**: คุ้มครองผู้โดยสารทุกท่าน ทุกที่นั่ง ตามมาตรฐานสากล\n` +
      `• **กัปตันและทีมงานมืออาชีพ**: ผ่านการอบรมด้านความปลอดภัยและการปฐมพยาบาลเบื้องต้น (CPR)\n` +
      `• **อุปกรณ์ความปลอดภัยครบครัน**: เสื้อชูชีพมาตรฐานสำหรับผู้ใหญ่และเด็กเล็กบนเรือทุกลำค่ะ!`;
  }

  // 7. Things to prepare / Weather
  if (lower.includes('เตรียม') || lower.includes('เตรียมตัว') || lower.includes('นำอะไรไป') || lower.includes('แต่งตัว') || lower.includes('เสื้อผ้า') || lower.includes('pack') || lower.includes('weather') || lower.includes('ฝน') || lower.includes('คลื่น')) {
    return `🎒 **สิ่งที่ควรเตรียมสำหรับทริปทะเลภูเก็ตค่ะ**:\n\n` +
      `1. ชุดว่ายน้ำ หรือชุดลำลองที่แห้งง่าย\n` +
      `2. ชุดเปลี่ยน 1 ชุดสำหรับเปลี่ยนขากลับ\n` +
      `3. ผ้าเช็ดตัว, หมวกปีกกว้าง, แว่นตากันแดด\n` +
      `4. ครีมกันแดดที่เป็นมิตรต่อปะการัง (Reef-Safe Sunscreen)\n` +
      `5. ซองกันน้ำสำหรับโทรศัพท์มือถือ\n` +
      `6. ยาประจำตัว (บนเรือมีบริการยาแก้เมาคลื่นและกล่องปฐมพยาบาลฟรีค่ะ)\n\n` +
      `🌊 กรณีคลื่นลมหรือสภาพอากาศไม่เอื้ออำนวย บริษัทจะแจ้งล่วงหน้าและปรับเปลี่ยนวันเดินทางหรือคืนเงินตามเงื่อนไขอย่างปลอดภัยที่สุดค่ะ!`;
  }

  // 8. Contact Hotline / Social Links
  if (lower.includes('ติดต่อ') || lower.includes('เบอร์') || lower.includes('โทร') || lower.includes('ไลน์') || lower.includes('line') || lower.includes('facebook') || lower.includes('เฟส') || lower.includes('call') || lower.includes('phone')) {
    return `📞 **ช่องทางติดต่อ บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด**:\n\n` +
      `• 📱 **เบอร์โทรศัพท์สายด่วน (Hotline 24 ชม.)**: **${phone}**\n` +
      `• 💬 **LINE Official Account**: **${lineOa}** (แอดไลน์สอบถามได้ตลอด 24 ชม.)\n` +
      `• 🌐 **Facebook Page**: [Trip Sea Tour Phuket](${fb})\n` +
      `• 📍 **สำนักงาน**: ภูเก็ต ประเทศไทย\n` +
      `• 🛡️ **ใบอนุญาต ททท.**: เลขที่ **${tat}**\n\n` +
      `ทีมงานพร้อมให้บริการและดูแลทุกท่านด้วยความยินดียิ่งค่ะ!`;
  }

  // General Comprehensive Answer
  return `ขอบคุณสำหรับคำถามค่ะ 😊🌊\n\n**Trip Sea Tour Phuket** ยินดีให้บริการข้อมูลทัวร์ทะเลภูเก็ต เกาะพีพี อ่าวพังงา และเรือยอชท์ชมพระอาทิตย์ตก พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\n` +
    `📌 **โปรแกรมแนะนำยอดนิยม**:\n${tourListText}\n\n` +
    `ท่านสามารถคลิกดูรายละเอียดและกด **"จองทัวร์"** บนหน้าเว็บได้ทันที หรือสอบถามเจ้าหน้าที่ทาง LINE: **${lineOa}** (โทร **${phone}**) ได้ตลอด 24 ชม. เลยนะคะ!`;
}

app.post('/api/chat', async (req, res) => {
  const { message = '', language = 'TH' } = req.body || {};
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 1. If Gemini API Key is available, try generating response via modern models with fallback
  if (process.env.GEMINI_API_KEY) {
    try {
      const availableToursSummary = tours.map(t =>
        `• [${t.title.TH} / ${t.title.EN}] (ID: ${t.id})
  - หมวดหมู่: ${t.categoryLabel?.TH || t.category}
  - ราคา: ผู้ใหญ่ ฿${t.priceAdult.toLocaleString()}, เด็ก ฿${t.priceChild.toLocaleString()} (จากปกติ ฿${t.originalPriceAdult.toLocaleString()})
  - ระยะเวลา: ${t.duration.TH}
  - ไฮไลท์: ${t.highlights.TH?.join(', ')}
  - บริการรวม: ${t.included.TH?.join(', ')}
  - จุดรับส่ง: ${t.pickupAreas?.join(', ')}`
      ).join('\n\n');

      const systemInstruction = `You are "TripSeaTour AI Assistant" (ผู้ช่วยอัจฉริยะ TripSeaTour 24/7 Powered by Gemini AI), the official 24/7 AI travel concierge for "Trip Sea Tour Phuket" (บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด).

ABOUT TRIP SEA TOUR PHUKET:
- Official TAT License (ใบอนุญาตประกอบธุรกิจนำเที่ยว ททท.): เลขที่ ${settings.tatLicenseNo || '33/11100'} (จดทะเบียนถูกต้องตามกฎหมาย มีประกันภัยอุบัติเหตุทางทะเลคุ้มครองทุกที่นั่ง)
- Location: Phuket, Thailand
- Contact Hotline: ${settings.contactPhone || '062-681-6494 / 097-924-1399'}
- Official LINE OA: ${settings.lineOaId || '@056hxinu'}
- Official Facebook: ${settings.facebookUrl || 'https://www.facebook.com/tripseatoursphuket/'}
- Official Website: ${SITE_URL}

CURRENT TOUR PACKAGES:
${availableToursSummary}

HOW TO BOOK & PAYMENT:
1. เลือกรอบทัวร์และวันที่ต้องการเดินทางบนหน้าเว็บ
2. กรอกชื่อผู้เดินทาง, เบอร์โทร, โรงแรมที่พักในภูเก็ต (มีรถตู้ VIP รับส่งถึงล็อบบี้)
3. ชำระเงินสะดวกผ่าน PromptPay QR Code (สแกนจ่ายได้ทุกธนาคาร ไม่มีค่าธรรมเนียม)
4. อัปโหลดสลิป ระบบจะออก E-Ticket / Voucher ทางหน้าจอพร้อมส่งแจ้งเตือนเข้า LINE ทันที
5. มีระบบแจ้งเตือนวันเดินทางล่วงหน้า 24 ชม. ผ่าน LINE

YOUR INSTRUCTIONS:
- Answer in the user's requested language (${language}) or matching the user's input language.
- In Thai, use warm, polite, and helpful particles (ค่ะ/ครับ).
- Keep replies well-structured with neat markdown bullet points, bold highlights, and friendly emojis.
- Recommend specific tour packages with exact prices when requested.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemInstruction}\n\nUser Question: ${message}`,
      });

      if (response && response.text) {
        return res.json({ reply: response.text });
      }
    } catch (aiErr: any) {
      console.warn('Gemini API call warning (falling back to smart local knowledge base):', aiErr?.message || aiErr);
    }
  }

  // 2. High-speed, guaranteed smart rule-based knowledge engine
  const fallbackReply = generateSmartFallbackReply(message, language);
  return res.json({ reply: fallbackReply });
});

// --- Admin Google Authentication & Account Management ---
app.post('/api/admin/verify-google-account', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    if (!email) {
      return res.status(400).json({ authenticated: false, message: 'กรุณาระบุ Google Email' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const authorizedEmails = (settings.adminGoogleEmails || ['asmr9941@gmail.com', 'admin@tripseatour.com'])
      .map(e => e.trim().toLowerCase());

    const isAuthorized = authorizedEmails.includes(lowerEmail);

    if (isAuthorized) {
      const user: AdminUser = {
        email: lowerEmail,
        name: name || lowerEmail.split('@')[0],
        picture: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || lowerEmail)}&background=0D9488&color=fff`,
        role: lowerEmail === authorizedEmails[0] ? 'superadmin' : 'admin',
        lastLogin: new Date().toISOString()
      };
      return res.json({ authenticated: true, user, message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ' });
    } else {
      return res.status(403).json({
        authenticated: false,
        message: `บัญชี Google (${email}) ไม่ได้รับสิทธิ์เข้าถึงระบบผู้ดูแล กรุณาติดต่อ Super Admin เพื่อเพิ่มสิทธิ์`
      });
    }
  } catch (err: any) {
    console.error('Error verifying Google admin account:', err);
    res.status(500).json({ authenticated: false, message: 'Authentication error' });
  }
});

// Get authorized Google Admin emails
app.get(['/api/admin/google-emails', '/api/admin/google-accounts'], (req, res) => {
  const list = settings.adminGoogleEmails || ['asmr9941@gmail.com', 'admin@tripseatour.com'];
  res.json({ success: true, adminGoogleEmails: list });
});

// Add new authorized Google Admin email
app.post(['/api/admin/google-emails', '/api/admin/google-accounts'], async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!settings.adminGoogleEmails) {
    settings.adminGoogleEmails = ['asmr9941@gmail.com', 'admin@tripseatour.com'];
  }

  if (!settings.adminGoogleEmails.map(e => e.toLowerCase()).includes(cleanEmail)) {
    settings.adminGoogleEmails.push(cleanEmail);
  }
  await persistState('settings');

  res.json({ success: true, adminGoogleEmails: settings.adminGoogleEmails });
});

// Remove authorized Google Admin email
app.delete(['/api/admin/google-emails', '/api/admin/google-accounts', '/api/admin/google-accounts/:email'], async (req, res) => {
  const email = req.params.email || req.body.email || (req.query.email as string);
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!settings.adminGoogleEmails) {
    settings.adminGoogleEmails = ['asmr9941@gmail.com', 'admin@tripseatour.com'];
  }

  // Prevent removing superadmin primary account
  if (cleanEmail === 'asmr9941@gmail.com') {
    return res.status(400).json({ error: 'Cannot remove primary superadmin account' });
  }

  settings.adminGoogleEmails = settings.adminGoogleEmails.filter(e => e.toLowerCase() !== cleanEmail);
  await persistState('settings');

  res.json({ success: true, adminGoogleEmails: settings.adminGoogleEmails });
});

// Live Chat Support API Store
export interface LiveChatMessage {
  id: string;
  sender: 'customer' | 'admin' | 'system';
  senderName?: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
}

export interface LiveChatSession {
  id: string;
  customerName: string;
  customerPhone?: string;
  unreadCount: number;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: LiveChatMessage[];
}

let liveChatSessions: LiveChatSession[] = [
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

async function persistLiveChat() {
  if (!supabase) return;
  try {
    await supabase.from('app_store').upsert({
      key: 'live_chat_sessions',
      value: JSON.stringify(liveChatSessions),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (err) {}
}

// --- Live Chat Endpoints ---
app.get('/api/livechat/sessions', (req, res) => {
  res.json(liveChatSessions);
});

app.get('/api/livechat/sessions/:id', (req, res) => {
  const session = liveChatSessions.find(s => s.id === req.params.id);
  if (session) {
    res.json(session);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/livechat/sessions', (req, res) => {
  const { sessionId, customerName, customerPhone } = req.body;
  let session = liveChatSessions.find(s => s.id === sessionId);
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
    liveChatSessions.unshift(session);
    persistLiveChat();
  } else if (customerName && customerName !== session.customerName) {
    session.customerName = customerName;
    persistLiveChat();
  }
  res.json(session);
});

app.post('/api/livechat/send', (req, res) => {
  const { sessionId, sender, senderName, text, imageUrl } = req.body;
  let session = liveChatSessions.find(s => s.id === sessionId);

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
    liveChatSessions.unshift(session);
  }

  const newMsg: LiveChatMessage = {
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
    session.unreadCount += 1;

    // Trigger LINE Notification to Admin Group / Official Channel
    const custName = session.customerName || senderName || 'นักท่องเที่ยวบนหน้าเว็บ';
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const lineMessage = `💬 [แจ้งเตือนแชทสดลูกค้าใหม่!]\n` +
      `👤 ลูกค้า: ${custName}\n` +
      `💬 ข้อความ: "${text || (imageUrl ? '[แนบไฟล์รูปภาพ/สลิป]' : '')}"\n` +
      `⏰ เวลา: ${timeStr}\n` +
      `🔗 คลิกแชทตอบกลับทันที: ${SITE_URL}/#admin (เมนู 💬 แชทสดลูกค้า)`;

    sendLineNotification(
      lineMessage,
      session.id,
      'NEW_ORDER',
      imageUrl && imageUrl.startsWith('https://') ? imageUrl : undefined
    ).catch(err => console.error('Failed to send LINE notification for live chat:', err));
  } else if (sender === 'admin') {
    session.unreadCount = 0;
  }

  persistLiveChat();

  res.json({ success: true, message: newMsg, session });
});

app.post('/api/livechat/read/:id', (req, res) => {
  const session = liveChatSessions.find(s => s.id === req.params.id);
  if (session) {
    session.unreadCount = 0;
    res.json({ success: true, session });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/livechat/close/:id', (req, res) => {
  const session = liveChatSessions.find(s => s.id === req.params.id);
  if (session) {
    session.status = session.status === 'active' ? 'closed' : 'active';
    res.json({ success: true, session });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// --- Customers ---
app.get('/api/customers', (req, res) => {
  res.json(customers);
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, lineId, nationality } = req.body;
  const cust = customers.find(c => c.id === id);
  if (cust) {
    if (name !== undefined) cust.name = name;
    if (email !== undefined) cust.email = email;
    if (phone !== undefined) cust.phone = phone;
    if (lineId !== undefined) cust.lineId = lineId;
    if (nationality !== undefined) cust.nationality = nationality;
    
    await persistState('customers');
    res.json({ ...cust, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  customers = customers.filter(c => c.id !== id);
  await persistState('customers');
  res.json({ success: true, id, version: syncMetadata.version, message: 'Customer deleted successfully' });
});

// --- Stats Dashboard ---
app.get('/api/stats', (req, res) => {
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'verified' || b.paymentStatus === 'slip_uploaded')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalBookings = bookings.length;
  const pendingVerifications = bookings.filter(b => b.paymentStatus === 'slip_uploaded' || b.paymentStatus === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.orderStatus === 'confirmed').length;

  // Monthly Revenue
  const monthlyRevenue = [
    { month: 'พ.ค. 26', revenue: 145000, bookings: 32 },
    { month: 'มิ.ย. 26', revenue: 182000, bookings: 41 },
    { month: 'ก.ค. 26', revenue: 220000, bookings: 54 },
    { month: 'ส.ค. 26', revenue: totalRevenue + 95000, bookings: totalBookings + 18 }
  ];

  // Category Breakdown
  const catMap: Record<string, { count: number; revenue: number }> = {};
  tours.forEach(t => {
    catMap[t.category] = { count: 0, revenue: 0 };
  });

  bookings.forEach(b => {
    const tour = tours.find(t => t.id === b.tourId);
    const cat = tour ? tour.category : 'island';
    if (!catMap[cat]) catMap[cat] = { count: 0, revenue: 0 };
    catMap[cat].count += 1;
    catMap[cat].revenue += b.totalAmount;
  });

  const categoryBreakdown = Object.keys(catMap).map(cat => ({
    category: cat,
    count: catMap[cat].count,
    revenue: catMap[cat].revenue
  }));

  const stats: SalesStats = {
    totalRevenue,
    totalBookings,
    pendingVerifications,
    confirmedBookings,
    monthlyRevenue,
    categoryBreakdown,
    statusBreakdown: [
      { status: 'ชำระเงินแล้ว', count: bookings.filter(b => b.paymentStatus === 'verified').length },
      { status: 'รอตรวจสอบสลิป', count: bookings.filter(b => b.paymentStatus === 'slip_uploaded').length },
      { status: 'รอชำระเงิน', count: bookings.filter(b => b.paymentStatus === 'pending').length }
    ],
    recentBookings: bookings.slice(0, 10)
  };

  res.json(stats);
});

// --- State Auto Sync ---
app.post('/api/sync', async (req, res) => {
  try {
    const {
      tours: clientTours,
      bookings: clientBookings,
      settings: clientSettings,
      reviews: clientReviews,
      customers: clientCustomers
    } = req.body;

    let updated = false;

    if (Array.isArray(clientTours) && clientTours.length > 0) {
      tours = clientTours;
      await persistState('tours');
      updated = true;
    }
    if (Array.isArray(clientBookings)) {
      bookings = clientBookings;
      await persistState('bookings');
      updated = true;
    }
    if (clientSettings && clientSettings.promptPayId) {
      settings = { ...settings, ...clientSettings };
      await persistState('settings');
      updated = true;
    }
    if (Array.isArray(clientReviews)) {
      reviews = clientReviews;
      await persistState('reviews');
      updated = true;
    }
    if (Array.isArray(clientCustomers)) {
      customers = clientCustomers;
      await persistState('customers');
      updated = true;
    }

    res.json({ success: true, updated, settings, toursCount: tours.length, bookingsCount: bookings.length });
  } catch (err) {
    console.error('Error in /api/sync:', err);
    res.status(500).json({ error: 'Failed to sync state' });
  }
});

// --- Settings & LINE Notify ---
app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.put('/api/settings', async (req, res) => {
  settings = { ...settings, ...req.body };
  await persistState('settings');
  res.json({ ...settings, version: syncMetadata.version });
});

app.post('/api/send-line', async (req, res) => {
  const { message, bookingRef = 'TEST', type = 'TEST', imageUrl, ticketImageUrl, slipImageUrl, slipUrl } = req.body;
  const result = await sendLineNotification(
    message || '🧪 [ทดสอบการแจ้งเตือน LINE]', 
    bookingRef, 
    type, 
    imageUrl, 
    ticketImageUrl, 
    slipImageUrl || slipUrl
  );
  res.json(result);
});

app.post('/api/line/notify', async (req, res) => {
  const { message, bookingRef = 'TEST', type = 'TEST', imageUrl, ticketImageUrl, slipImageUrl, slipUrl } = req.body;
  const result = await sendLineNotification(
    message || '🧪 [ทดสอบการแจ้งเตือน LINE Notify จากหลังบ้านแอดมิน]', 
    bookingRef, 
    type, 
    imageUrl, 
    ticketImageUrl, 
    slipImageUrl || slipUrl
  );
  res.json(result);
});

// Image Cache API
const memoryServerImages = new Map<string, { data: string; mimeType: string }>();

app.post('/api/cache-image', async (req, res) => {
  const { key, dataUrl, mimeType } = req.body;
  if (!key || !dataUrl) {
    return res.status(400).json({ error: 'key and dataUrl required' });
  }
  memoryServerImages.set(key, {
    data: dataUrl,
    mimeType: mimeType || (dataUrl.includes('image/jpeg') ? 'image/jpeg' : 'image/png')
  });
  res.json({ success: true, key });
});

// Ticket Image Endpoint
app.get(['/api/ticket-image', '/api/ticket-image/:ref'], async (req, res) => {
  const ref = (req.params.ref || req.query.ref || req.query.bookingRef || 'TEST').toString().trim();
  
  // 1. Check in memory image cache (high-res PNG captured from client TicketVoucher)
  const cached = memoryServerImages.get(`ticket_${ref}`) || memoryServerImages.get(ref);
  if (cached && cached.data.startsWith('data:image')) {
    const base64Data = cached.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', cached.mimeType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  }

  // 2. Query booking details to render official paper voucher replica
  const booking = bookings.find(b => b.bookingRef === ref || b.id === ref);
  const tourTitle = (booking?.tourTitle || 'เกาะพีพี มายา ไข่ (เรือสปีดโบ๊ท VIP)').slice(0, 38);
  const customerName = (booking?.customerName || 'ลูกค้าทริปภูเก็ต').slice(0, 32);
  const customerPhone = booking?.customerPhone || '08X-XXX-XXXX';
  const travelDate = booking?.travelDate || new Date().toISOString().split('T')[0];
  const bookingDate = booking?.createdAt ? new Date(booking.createdAt).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH');
  const pickupHotel = ((booking?.pickupHotel || 'โรงแรมในภูเก็ต') + (booking?.roomNumber ? ` (ห้อง ${booking.roomNumber})` : '')).slice(0, 50);
  const sendBackHotel = ((booking?.sendBackHotel || booking?.pickupHotel || 'โรงแรมในภูเก็ต')).slice(0, 50);
  const adults = booking?.adults || 1;
  const children = booking?.children || 0;
  const infants = booking?.infants || 0;
  const totalAmount = booking?.totalAmount ? Number(booking.totalAmount).toLocaleString() : '0';
  const pickupTime = booking?.pickupTime || '07:30 - 08:00 น.';
  const nationality = booking?.nationality || 'Thai / -';
  const remark = (booking?.specialRequests || booking?.notes || '-').slice(0, 60);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="920" height="650" viewBox="0 0 920 650" style="background:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <defs>
      <filter id="cardShadow" x="-3%" y="-3%" width="106%" height="106%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.12" />
      </filter>
    </defs>

    <!-- White Ticket Card (A5 Landscape) -->
    <rect x="15" y="15" width="890" height="620" rx="12" fill="#ffffff" stroke="#0f172a" stroke-width="3" filter="url(#cardShadow)" />

    <!-- Top Header -->
    <g transform="translate(35, 30)">
      <!-- Logo Box -->
      <rect x="0" y="0" width="60" height="60" rx="12" fill="#0d3b66" stroke="#0f172a" stroke-width="2" />
      <text x="30" y="38" fill="#38bdf8" font-size="22" font-weight="900" text-anchor="middle">TST</text>
      
      <!-- Company Text -->
      <text x="75" y="24" fill="#0d3b66" font-size="18" font-weight="900" letter-spacing="0.5">Trip Sea Tour Phuket Co., Ltd.</text>
      
      <!-- License Badge -->
      <rect x="360" y="8" width="115" height="20" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1" />
      <text x="417" y="22" fill="#78350f" font-size="10" font-weight="800" text-anchor="middle">ททท. 33/11100</text>
      
      <text x="75" y="42" fill="#475569" font-size="10" font-weight="500">ภูเก็ต ประเทศไทย (Phuket, Thailand)</text>
      <text x="75" y="56" fill="#475569" font-size="10" font-weight="500">Tel. (+66) 97 924 1399 / (+66) 62 681 6494 | Email: tripseatourphuket@gmail.com</text>

      <!-- Ticket Ref Header Right -->
      <rect x="670" y="2" width="180" height="22" rx="4" fill="#0f172a" />
      <text x="760" y="17" fill="#ffffff" font-size="9.5" font-weight="bold" text-anchor="middle">OFFICIAL E-TICKET</text>
      <rect x="670" y="24" width="180" height="34" rx="4" fill="#f0fdfa" stroke="#0f172a" stroke-width="1.5" />
      <text x="760" y="48" fill="#0f766e" font-size="17" font-weight="900" font-family="monospace" text-anchor="middle">${ref}</text>
    </g>

    <!-- Header Divider Line -->
    <line x1="35" y1="98" x2="885" y2="98" stroke="#0f172a" stroke-width="2" />

    <!-- Main Layout Grid -->
    <!-- Left Panel: Booking Details (Width 565px) -->
    <g transform="translate(35, 108)">
      <rect x="0" y="0" width="565" height="425" rx="8" fill="#ffffff" stroke="#0f172a" stroke-width="2" />

      <!-- Program Banner -->
      <rect x="0" y="0" width="565" height="48" rx="7 7 0 0" fill="#0f766e" />
      <text x="15" y="18" fill="#99f6e4" font-size="9" font-weight="bold">TOUR PROGRAM (โปรแกรมทัวร์):</text>
      <text x="15" y="38" fill="#ffffff" font-size="14" font-weight="900">${tourTitle}</text>

      <!-- Row 1: Guest Name & Mobile -->
      <line x1="0" y1="96" x2="565" y2="96" stroke="#0f172a" stroke-width="1.5" />
      <line x1="282" y1="48" x2="282" y2="96" stroke="#0f172a" stroke-width="1.5" />
      <text x="15" y="66" fill="#64748b" font-size="9" font-weight="bold">GUEST NAME (ชื่อลูกค้า):</text>
      <text x="15" y="85" fill="#0f172a" font-size="13" font-weight="bold">${customerName}</text>
      <text x="295" y="66" fill="#64748b" font-size="9" font-weight="bold">MOBILE NO. (เบอร์โทร):</text>
      <text x="295" y="85" fill="#0f172a" font-size="13" font-weight="bold" font-family="monospace">${customerPhone}</text>

      <!-- Row 2: Tour Date & Pickup Time (Highlight) -->
      <rect x="0" y="96" width="282" height="54" fill="#fff1f2" />
      <rect x="282" y="96" width="283" height="54" fill="#fffbeb" />
      <line x1="0" y1="150" x2="565" y2="150" stroke="#0f172a" stroke-width="1.5" />
      <line x1="282" y1="96" x2="282" y2="150" stroke="#0f172a" stroke-width="1.5" />
      <text x="15" y="114" fill="#9f1239" font-size="9.5" font-weight="900">TOUR DATE (วันที่เดินทาง):</text>
      <text x="15" y="138" fill="#e11d48" font-size="17" font-weight="900" font-family="monospace">${travelDate}</text>
      <text x="295" y="114" fill="#92400e" font-size="9.5" font-weight="900">PICKUP TIME (เวลารับ):</text>
      <text x="295" y="138" fill="#d97706" font-size="15" font-weight="900">${pickupTime}</text>

      <!-- Row 3: Booking Date & Nationality -->
      <line x1="0" y1="198" x2="565" y2="198" stroke="#0f172a" stroke-width="1.5" />
      <line x1="282" y1="150" x2="282" y2="198" stroke="#0f172a" stroke-width="1.5" />
      <text x="15" y="168" fill="#64748b" font-size="9" font-weight="bold">BOOKING DATE (วันที่จอง):</text>
      <text x="15" y="187" fill="#1e293b" font-size="12" font-weight="600">${bookingDate}</text>
      <text x="295" y="168" fill="#64748b" font-size="9" font-weight="bold">NATIONALITY (สัญชาติ):</text>
      <text x="295" y="187" fill="#1e293b" font-size="12" font-weight="600">${nationality}</text>

      <!-- Row 4: Pick up Hotel -->
      <line x1="0" y1="250" x2="565" y2="250" stroke="#0f172a" stroke-width="1.5" />
      <text x="15" y="218" fill="#64748b" font-size="9" font-weight="bold">PICK UP HOTEL (รับโรงแรม):</text>
      <text x="15" y="238" fill="#0f172a" font-size="12.5" font-weight="bold">🏨 ${pickupHotel}</text>

      <!-- Row 5: Send Back Hotel -->
      <line x1="0" y1="302" x2="565" y2="302" stroke="#0f172a" stroke-width="1.5" />
      <text x="15" y="270" fill="#64748b" font-size="9" font-weight="bold">SEND BACK HOTEL (ส่งกลับโรงแรม):</text>
      <text x="15" y="290" fill="#1e293b" font-size="12" font-weight="600">🚐 ${sendBackHotel}</text>

      <!-- Row 6: Remarks -->
      <rect x="0" y="302" width="565" height="123" rx="0 0 7 7" fill="#f8fafc" />
      <text x="15" y="322" fill="#64748b" font-size="9" font-weight="bold">REMARKS (หมายเหตุ):</text>
      <text x="15" y="344" fill="#475569" font-size="11.5" font-style="italic">${remark}</text>
    </g>

    <!-- Right Panel: Status, PAX Summary, Boarding Notice (Width 270px) -->
    <g transform="translate(615, 108)">
      <rect x="0" y="0" width="270" height="425" rx="8" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />

      <!-- Status Header -->
      <rect x="15" y="15" width="240" height="50" rx="8" fill="#0f766e" stroke="#0f172a" stroke-width="1.5" />
      <text x="135" y="34" fill="#99f6e4" font-size="9" font-weight="bold" text-anchor="middle">BOOKING STATUS</text>
      <text x="135" y="52" fill="#ffffff" font-size="13" font-weight="900" text-anchor="middle">CONFIRMED (ยืนยันสิทธิ์แล้ว)</text>

      <!-- PAX Summary Box -->
      <rect x="15" y="75" width="240" height="150" rx="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.5" />
      <text x="135" y="98" fill="#0f172a" font-size="10" font-weight="900" text-anchor="middle">PAX SUMMARY (จำนวนผู้เดินทาง)</text>
      <line x1="25" y1="108" x2="245" y2="108" stroke="#e2e8f0" stroke-width="1" />
      
      <!-- Adult -->
      <rect x="25" y="116" width="100" height="46" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <text x="75" y="132" fill="#64748b" font-size="8.5" font-weight="bold" text-anchor="middle">ผู้ใหญ่ (Adult)</text>
      <text x="75" y="152" fill="#0f766e" font-size="14" font-weight="900" text-anchor="middle">${adults} ท่าน</text>

      <!-- Child -->
      <rect x="135" y="116" width="100" height="46" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <text x="185" y="132" fill="#64748b" font-size="8.5" font-weight="bold" text-anchor="middle">เด็ก (Child)</text>
      <text x="185" y="152" fill="#0f766e" font-size="14" font-weight="900" text-anchor="middle">${children} ท่าน</text>

      <!-- Total Guests Banner -->
      <rect x="25" y="172" width="210" height="38" rx="6" fill="#f0fdfa" stroke="#0f766e" stroke-width="1" />
      <text x="130" y="196" fill="#0f766e" font-size="11" font-weight="bold" text-anchor="middle">ผู้เดินทางรวมทั้งหมด: ${Number(adults) + Number(children) + Number(infants)} ท่าน</text>

      <!-- Boarding Notice Box -->
      <rect x="15" y="235" width="240" height="85" rx="8" fill="#fffbeb" stroke="#f59e0b" stroke-width="1" />
      <text x="135" y="255" fill="#92400e" font-size="9.5" font-weight="900" text-anchor="middle">📌 แสดงตั๋วนี้แก่คนขับรถ / ไกด์</text>
      <text x="135" y="272" fill="#475569" font-size="7.5" text-anchor="middle">Please present this E-Ticket on your mobile</text>
      <text x="135" y="284" fill="#475569" font-size="7.5" text-anchor="middle">to the driver upon boarding.</text>
      <line x1="25" y1="292" x2="245" y2="292" stroke="#fde68a" stroke-width="1" />
      <text x="135" y="308" fill="#78350f" font-size="9" font-weight="bold" text-anchor="middle">📞 Hotline: (+66) 97 924 1399</text>

      <!-- Ink Stamp -->
      <circle cx="135" cy="370" r="35" fill="none" stroke="#059669" stroke-width="2" stroke-dasharray="4 2" />
      <text x="135" y="364" fill="#059669" font-size="8" font-weight="900" text-anchor="middle">CONFIRMED</text>
      <text x="135" y="376" fill="#059669" font-size="7" font-weight="bold" text-anchor="middle">TRIP SEA TOUR</text>
      <text x="135" y="388" fill="#059669" font-size="6" font-weight="bold" text-anchor="middle">OFFICIAL VOUCHER</text>
    </g>

    <!-- Multi-Lingual Cautions (Footer) -->
    <g transform="translate(35, 542)">
      <text x="0" y="10" fill="#b91c1c" font-size="8" font-weight="bold">1. กรุณารอที่ล็อบบี้ตรงเวลานัด คนขับรอไม่เกิน 5 นาที หากล่าช้าถือว่าสละสิทธิ์และไม่คืนเงิน</text>
      <text x="0" y="22" fill="#b91c1c" font-size="8" font-weight="bold">2. สตรีมีครรภ์ ผู้ป่วยโรคหัวใจ ความดันรุนแรง หรือกระดูกสันหลัง ห้ามออกทะเล | หากเกินเวลานัด 20 นาที โทร (+66) 97 924 1399</text>
      <text x="0" y="34" fill="#475569" font-size="7.5" font-weight="bold">重要提醒: 请准时在酒店大堂等候。严禁孕妇、心脏病患者出海。超过20分钟未见司机请联系 (+66) 97 924 1399</text>
      <text x="0" y="46" fill="#475569" font-size="7.5">Cautions: Please standby at lobby on time. Driver waits max 5 mins. If delayed over 20 mins, contact (+66) 97 924 1399.</text>
    </g>

    <!-- Bottom Wish Banner -->
    <g transform="translate(35, 600)">
      <rect x="0" y="0" width="850" height="24" rx="4" fill="#0f766e" />
      <text x="425" y="16" fill="#f0fdfa" font-size="10" font-weight="bold" letter-spacing="1" text-anchor="middle">
        HAVE A NICE TRIP - ขอให้เป็นทริปที่สนุกและปลอดภัยนะครับ/ค่ะ - 祝您旅途愉快
      </text>
    </g>
  </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// Slip Image Endpoint
app.get(['/api/slip-image', '/api/slip-image/:ref'], async (req, res) => {
  const ref = (req.params.ref || req.query.ref || req.query.bookingRef || '').toString().trim();
  
  const cached = memoryServerImages.get(`slip_${ref}`) || memoryServerImages.get(ref);
  if (cached && cached.data.startsWith('data:image')) {
    const base64Data = cached.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', cached.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  }

  const booking = bookings.find(b => b.bookingRef === ref || b.id === ref);
  if (booking && booking.slipUrl) {
    if (booking.slipUrl.startsWith('data:image')) {
      const mimeMatch = booking.slipUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = booking.slipUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.end(buffer);
    }
    if (booking.slipUrl.startsWith('https://')) {
      return res.redirect(302, booking.slipUrl);
    }
  }

  const fallbackSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#f8fafc; font-family:sans-serif;">
    <rect width="600" height="800" fill="#f1f5f9" />
    <rect x="50" y="50" width="500" height="700" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <circle cx="300" cy="350" r="50" fill="#e2e8f0" />
    <path d="M280 340 L300 360 L330 330" stroke="#64748b" stroke-width="6" fill="none" stroke-linecap="round" />
    <text x="300" y="440" font-size="22" font-weight="bold" fill="#334155" text-anchor="middle">สลิปโอนเงิน (Slip Preview)</text>
    <text x="300" y="480" font-size="16" fill="#64748b" text-anchor="middle">รหัสอ้างอิง: ${ref || 'ไม่มีข้อมูล'}</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(fallbackSvg);
});

// API to send E-Ticket Voucher to LINE Notification
app.post('/api/bookings/:id/send-line-ticket', async (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(booking.bookingRef)}`;

  const ticketMessage = `🎫 [ตั๋วอิเล็กทรอนิกส์ E-TICKET / VOUCHER]\n` +
    `═════════════════════════\n` +
    `📌 รหัสตั๋ว: ${booking.bookingRef}\n` +
    `📍 ทัวร์: ${booking.tourTitle}\n` +
    `📅 วันเดินทาง: ${booking.travelDate}\n` +
    `👤 ผู้เดินทาง: ${booking.customerName} (${booking.customerPhone})\n` +
    `🏨 โรงแรมที่รับ: ${booking.pickupHotel} (โซน: ${booking.pickupZone}${booking.roomNumber ? `, ห้อง ${booking.roomNumber}` : ''})\n` +
    `👥 จำนวน: ผู้ใหญ่ ${booking.adults} ท่าน / เด็ก ${booking.children} ท่าน\n` +
    `💰 ยอดชำระสุทธิ: ฿${booking.totalAmount.toLocaleString()} (ชำระแล้ว)\n` +
    `═════════════════════════\n` +
    `🌐 เว็บไซต์: https://tripseatour-s-org.vercel.app\n` +
    `🔗 สแกนตรวจตั๋ว: ${qrUrl}\n` +
    `ℹ️ ลูกค้าสามารถแสดงตั๋วนี้ให้คนขับรถ/ไกด์ดูในวันเดินทางได้ทันที`;

  const logResult = await sendLineNotification(ticketMessage, booking.bookingRef, 'ORDER_CONFIRMED', booking.tourImage || 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80');

  res.json({ success: true, bookingRef: booking.bookingRef, logResult });
});

// GET detected LINE Groups
app.get('/api/line/detected-groups', (req, res) => {
  res.json({
    detectedGroups: detectedLineGroups,
    currentConfiguredGroupId: settings.lineMessagingUserId
  });
});

// LINE Webhook Endpoint to auto-detect Group ID
app.post('/api/line/webhook', async (req, res) => {
  try {
    const events = req.body?.events || [];
    for (const event of events) {
      const source = event.source;
      if (source) {
        const isGroup = source.type === 'group' || source.type === 'room';
        const isUser = source.type === 'user';
        
        if (isGroup || isUser) {
          const detectedGroupId = isGroup ? (source.groupId || source.roomId) : source.userId;
          if (detectedGroupId) {
            console.log('📌 Detected LINE ID:', detectedGroupId);

            // Record or update in memory list
            const existingIndex = detectedLineGroups.findIndex(g => g.groupId === detectedGroupId);
            const label = isGroup ? 'กลุ่ม LINE' : 'ผู้ใช้งานเดี่ยว (1-on-1)';
            if (existingIndex >= 0) {
              detectedLineGroups[existingIndex].lastSeen = new Date().toISOString();
            } else {
              detectedLineGroups.unshift({
                groupId: detectedGroupId,
                groupName: `${label} (ตรวจพบเมื่อ ${new Date().toLocaleTimeString('th-TH')})`,
                lastSeen: new Date().toISOString()
              });
            }
            
            // Auto-assign group ID if empty or simulated
            if (!settings.lineMessagingUserId || settings.lineMessagingUserId.startsWith('U1234') || settings.lineMessagingUserId === 'C1234567890abcdef1234567890abcdef') {
              settings.lineMessagingUserId = detectedGroupId;
              // IMPORTANT: Persist settings to Supabase so it is saved permanently (crucial for Vercel Serverless)
              await persistState('settings');
            }

            // Auto reply back into the LINE Group/Chat with its ID
            if (event.replyToken && settings.lineMessagingChannelAccessToken && !settings.lineMessagingChannelAccessToken.startsWith('SIMULATED')) {
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${settings.lineMessagingChannelAccessToken.trim()}`
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [{
                    type: 'text',
                    text: `🤖 [ระบบแจ้งเตือนอัตโนมัติ]\n\n✅ เชื่อมต่อระบบรับแจ้งเตือนจองทัวร์เรียบร้อยแล้ว!\n\n📌 LINE ID สำหรับบันทึกลงในระบบคือ:\n${detectedGroupId}\n\n💡 ระบบได้บันทึก ID นี้ลงใน AppSettings ของเว็บไซต์เรียบร้อยแล้ว`
                  }]
                })
              }).catch((e) => console.error('Error sending reply:', e));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
  res.status(200).send('OK');
});

// Force Bot to send Group ID Identification Message into the active Group
app.post('/api/line/send-group-id-bot-message', async (req, res) => {
  const { groupId } = req.body;
  const targetGroup = groupId || settings.lineMessagingUserId;

  if (!targetGroup) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ Group ID' });
  }

  const messageText = `📢 [แจ้งจากหลังบ้านแอดมิน - Trip Sea Tour]\n` +
    `🤖 ยืนยันการเชื่อมต่อกลุ่ม LINE แอดมินสำเร็จ!\n\n` +
    `📌 Group ID: ${targetGroup}\n` +
    `⏰ เวลาตรวจสอบ: ${new Date().toLocaleString('th-TH')}\n\n` +
    `ระบบพร้อมส่งการแจ้งเตือนออเดอร์ใหม่ สลิปโอนเงิน และการแจ้งเตือน 24 ชม. เข้ากลุ่มนี้โดยตรง`;

  const result = await sendLineNotification(messageText, 'GROUP-ID-CHECK', 'TEST');
  res.json({ success: true, targetGroup, result });
});

app.post('/api/line/trigger-reminders', async (req, res) => {
  const result = await checkAndSend24hReminders();
  res.json({ success: true, ...result });
});

app.post('/api/line/send-reminder/:id', async (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const lineMsg = `\n⏰ [แจ้งเตือนใกล้วันเดินทาง - 24 ชม.]\n` +
    `🎫 รหัสการจอง: ${booking.bookingRef}\n` +
    `👤 ลูกค้า: ${booking.customerName} (${booking.customerPhone})\n` +
    `📍 ทัวร์: ${booking.tourTitle}\n` +
    `📅 วันเดินทาง: ${booking.travelDate}\n` +
    `🏨 โรงแรมรับส่ง: ${booking.pickupHotel} (ห้อง ${booking.roomNumber || 'ยังไม่ระบุ'})\n` +
    `👥 จำนวน: ผู้ใหญ่ ${booking.adults} / เด็ก ${booking.children}\n` +
    `📌 สถานะ: ยืนยันเรียบร้อยแล้ว (พร้อมต้อนรับลูกค้า!)`;

  const logItem = await sendLineNotification(lineMsg, booking.bookingRef, 'REMINDER_24H');
  booking.reminderSent = true;
  booking.reminderSentAt = new Date().toISOString();

  res.json({ success: true, logItem, booking });
});

app.get('/api/line/logs', (req, res) => {
  res.json(lineLogs);
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    
    // Background 24h reminder scheduler (runs every 1 hour & on startup)
    setTimeout(() => {
      checkAndSend24hReminders().catch(err => console.error('Initial 24h reminder check failed:', err));
    }, 5000);

    setInterval(() => {
      checkAndSend24hReminders().catch(err => console.error('Periodic 24h reminder check failed:', err));
    }, 60 * 60 * 1000);
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;
