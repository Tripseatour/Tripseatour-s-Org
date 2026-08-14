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
          adminGoogleEmails: settings.adminGoogleEmails || ['asmr9941@gmail.com', 'admin@tripseatour.com']
        };
      }
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
}

async function persistState(key: 'tours' | 'bookings' | 'settings' | 'reviews' | 'customers') {
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

// Helper: Trigger LINE Notification via Messaging API with optional image attachment
async function sendLineNotification(
  message: string,
  bookingRef: string = 'N/A',
  type: 'NEW_ORDER' | 'PAYMENT_VERIFIED' | 'ORDER_CONFIRMED' | 'REMINDER_24H' | 'TEST' = 'NEW_ORDER',
  imageUrl?: string
) {
  const logItem: LineNotificationLog = {
    id: `log-${Date.now()}`,
    bookingRef,
    type,
    message,
    status: 'simulated',
    timestamp: new Date().toISOString()
  };

  const channelToken = settings.lineMessagingChannelAccessToken || settings.lineNotifyToken;
  const targetId = settings.lineMessagingUserId;

  if (channelToken && !channelToken.startsWith('SIMULATED')) {
    try {
      // Build rich messages array (Image + Text)
      const messagesPayload: any[] = [];

      // If an image URL is provided (HTTPS), attach it as an image message
      if (imageUrl && imageUrl.startsWith('https://')) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        });
      }

      messagesPayload.push({
        type: 'text',
        text: message
      });

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
            messages: messagesPayload
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
            messages: messagesPayload
          })
        });
      }

      if (response.ok) {
        logItem.status = 'sent';
      } else {
        const errorText = await response.text();
        console.error('LINE Messaging API Error:', response.status, errorText);
        logItem.status = 'failed';
        logItem.message = `${logItem.message} ❌ (Error ${response.status}: ${errorText})`;
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
  res.json(newTour);
});

app.put('/api/tours/:id', async (req, res) => {
  const { id } = req.params;
  const index = tours.findIndex(t => t.id === id);
  if (index !== -1) {
    tours[index] = { ...tours[index], ...req.body };
    await persistState('tours');
    res.json(tours[index]);
  } else {
    res.status(404).json({ error: 'Tour not found' });
  }
});

app.delete('/api/tours/:id', async (req, res) => {
  const { id } = req.params;
  tours = tours.filter(t => t.id !== id);
  await persistState('tours');
  res.json({ success: true, id });
});

// --- Bookings ---
app.get('/api/bookings', (req, res) => {
  res.json(bookings);
});

app.post('/api/bookings', async (req, res) => {
  const {
    tourId, customerName, customerEmail, customerPhone, customerLineId,
    nationality, travelDate, pickupHotel, pickupZone, roomNumber, specialRequests,
    adults, children, infants, totalAmount
  } = req.body;

  const tour = tours.find(t => t.id === tourId);
  const refNum = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = `TST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${refNum}`;

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
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
    paymentStatus: 'pending',
    orderStatus: 'pending',
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
  const lineMsg = `\n🆕 [มีคำสั่งจองใหม่!] ${bookingRef}\n` +
    `📍 ทัวร์: ${newBooking.tourTitle}\n` +
    `👤 ลูกค้า: ${customerName} (${customerPhone})\n` +
    `📅 วันเดินทาง: ${travelDate}\n` +
    `🏨 โรงแรม: ${pickupHotel}\n` +
    `👥 จำนวน: ผู้ใหญ่ ${adults} / เด็ก ${children}\n` +
    `💰 ยอดรวม: ${totalAmount.toLocaleString()} บาท (PromptPay QR)\n` +
    `🌐 เว็บไซต์: ${SITE_URL}`;

  await sendLineNotification(lineMsg, bookingRef, 'NEW_ORDER', newBooking.tourImage);
  newBooking.lineNotifySent = true;

  await persistState('bookings');
  await persistState('customers');

  res.json(newBooking);
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

  res.json(booking);
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

  res.json(booking);
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
  res.json({ success: true, id, message: 'Deleted booking successfully' });
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

// --- Reviews Management API ---
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/api/reviews', async (req, res) => {
  const { tourId, userName, rating, comment, nationality, photo } = req.body;
  const newRev: Review = {
    id: `rev-${Date.now()}`,
    tourId: tourId || (tours[0]?.id || 'tour-1'),
    userName: userName || 'ผู้ใช้งาน',
    nationality: nationality || 'TH',
    rating: Number(rating) || 5,
    comment: comment || '',
    date: new Date().toISOString().split('T')[0],
    verifiedBooking: true,
    photos: photo ? [photo] : undefined,
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
  res.json(newRev);
});

app.put('/api/reviews/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    rev.adminReply = reply;
    rev.adminReplyDate = new Date().toISOString().split('T')[0];
    await persistState('reviews');
    res.json(rev);
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
    res.json(rev);
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
    res.json({ success: true, message: 'Review deleted successfully' });
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

// --- TripSeaTour AI Chatbot (Powered by Gemini AI 24/7) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, language = 'TH' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

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
- Official TAT License (ใบอนุญาตประกอบธุรกิจนำเที่ยว ททท.): เลขที่ 33/11100 (จดทะเบียนถูกต้องตามกฎหมาย มีประกันภัยอุบัติเหตุทางทะเลคุ้มครองทุกที่นั่ง)
- Location: Phuket, Thailand
- Contact Hotline: ${settings.contactPhone || '+66 (0) 62 681 6494 / +66 (0) 97 924 1399'}
- Official LINE OA: ${settings.lineOaId || '@056hxinu'}
- Official Website: ${SITE_URL}

CURRENT TOUR PACKAGES:
${availableToursSummary}

HOW TO BOOK & PAYMENT:
1. เลือกรอบทัวร์และวันที่ต้องการเดินทางบนหน้าเว็บ
2. กรอกชื่อผู้เดินทาง, เบอร์โทร, โรงแรมที่พักในภูเก็ต (มีรถตู้ VIP รับส่งถึงล็อบบี้)
3. ชำระเงินสะดวกผ่าน PromptPay QR Code (สแกนจ่ายได้ทุกธนาคาร ไม่มีค่าธรรมเนียม)
4. อัปโหลดสลิป ระบบจะออก E-Ticket / Voucher ทางหน้าจอพร้อมส่งแจ้งเตือนเข้า LINE ทันที
5. มีระบบแจ้งเตือนวันเดินทางล่วงหน้า 24 ชม. ผ่าน LINE

THINGS TO PREPARE FOR SEA TOURS:
- ครีมกันแดดที่เป็นมิตรกับปะการัง (Reef-safe sunscreen)
- แว่นกันแดด, หมวก, ผ้าเช็ดตัว, ชุดว่ายน้ำ, ชุดเปลี่ยน
- ซองกันน้ำสำหรับสมาร์ทโฟน
- ยาแก้เมาคลื่น (บนเรือมีบริการฟรี)

YOUR INSTRUCTIONS:
- Answer in the user's requested language (${language}) or matching the user's input language (Thai, English, Chinese, Russian).
- In Thai, use warm and polite particles (ค่ะ/ครับ).
- Provide accurate, helpful, inspiring travel advice about Phuket sea trips, weather, itineraries, packing tips, and booking details.
- Recommend specific tour packages with exact prices when requested.
- If customer wants to book immediately, guide them to click "จองทัวร์นี้" or contact LINE: ${settings.lineOaId || '@056hxinu'}.
- Keep replies well-structured, formatted with neat bullet points, bold highlights, and friendly emojis.`;

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `${systemInstruction}\n\nUser Question: ${message}`,
      });

      const reply = response.text || 'ขออภัยค่ะ ขณะนี้ระบบไม่สามารถประมวลผลคำตอบได้ โปรดลองอีกครั้งหรือติดต่อเจ้าหน้าที่ทาง LINE: @056hxinu';
      return res.json({ reply });
    } else {
      // Smart offline fallback
      let fallbackReply = `สวัสดีค่ะ ยินดีต้อนรับสู่ Trip Sea Tour Phuket 🌊\n\nเราพร้อมให้บริการข้อมูลทัวร์ภูเก็ต เกาะพีพี อ่าวพังงา และเรือยอชท์ชมพระอาทิตย์ตก พร้อมใบอนุญาต ททท. เลขที่ 33/11100\n\n📌 สนใจทัวร์ไหนเป็นพิเศษ สามารถกดเลือกดูรายละเอียดบนหน้าเว็บ หรือสอบถามแอดมินทาง LINE: ${settings.lineOaId || '@056hxinu'} (โทร ${settings.contactPhone}) ได้ตลอด 24 ชม. ค่ะ!`;
      
      const lower = message.toLowerCase();
      if (lower.includes('ราคา') || lower.includes('price') || lower.includes('เท่าไหร่') || lower.includes('cost')) {
        fallbackReply = `ราคาโปรโมชั่นพิเศษของ Trip Sea Tour Phuket วันนี้ค่ะ:\n` +
          `🏝️ 1. ทัวร์เกาะพีพี - มาหยา - ปิเละลากูน สปีดโบ๊ท: ผู้ใหญ่ ฿1,590 / เด็ก ฿1,190\n` +
          `🚣 2. ทัวร์อ่าวพังงา - เกาะเจมส์บอนด์ - แคนูเกาะห้อง: ผู้ใหญ่ ฿1,690 / เด็ก ฿1,290\n` +
          `⛵ 3. ล่องเรือยอชท์คาทามารัน เกาะเฮ & พระอาทิตย์ตกแหลมพรหมเทพ: ผู้ใหญ่ ฿2,490 / เด็ก ฿1,790\n\n` +
          `ทุกโปรแกรมรวม: รถรับส่งโรงแรม, อาหารกลางวัน/ค่ำ, อุปกรณ์ดำน้ำ, ประกันอุบัติเหตุทางทะเล ททท. ค่ะ!`;
      } else if (lower.includes('จอง') || lower.includes('book') || lower.includes('ชำระ') || lower.includes('จ่าย') || lower.includes('pay')) {
        fallbackReply = `ขั้นตอนการจองและชำระเงินง่ายๆ 4 ขั้นตอนค่ะ:\n` +
          `1️⃣ เลือกโปรแกรมทัวร์และวันที่ต้องการเดินทาง\n` +
          `2️⃣ กรอกข้อมูลผู้เดินทางและชื่อโรงแรมที่พัก\n` +
          `3️⃣ สแกนจ่ายด้วย PromptPay QR Code ผ่านแอปธนาคาร\n` +
          `4️⃣ แนบสลิป รับ E-Ticket ทันที พร้อมรับการแจ้งเตือนทาง LINE 24 ชม. ค่ะ!`;
      }
      return res.json({ reply: fallbackReply });
    }
  } catch (err: any) {
    console.error('Chatbot API error:', err);
    res.status(500).json({ error: 'Chat processing failed', details: err?.message });
  }
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

// Add new authorized Google Admin email
app.post('/api/admin/google-emails', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!settings.adminGoogleEmails) {
    settings.adminGoogleEmails = ['asmr9941@gmail.com', 'admin@tripseatour.com'];
  }

  if (!settings.adminGoogleEmails.includes(cleanEmail)) {
    settings.adminGoogleEmails.push(cleanEmail);
    await persistState('settings');
  }

  res.json({ success: true, adminGoogleEmails: settings.adminGoogleEmails });
});

// Remove authorized Google Admin email
app.delete('/api/admin/google-emails', async (req, res) => {
  const { email } = req.body;
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
    res.json(cust);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  customers = customers.filter(c => c.id !== id);
  await persistState('customers');
  res.json({ success: true, message: 'Customer deleted successfully' });
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
  res.json(settings);
});

app.post('/api/line/notify', async (req, res) => {
  const { message } = req.body;
  const result = await sendLineNotification(message || '🧪 [ทดสอบการแจ้งเตือน LINE Notify จากหลังบ้านแอดมิน]', 'TEST', 'TEST');
  res.json(result);
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
