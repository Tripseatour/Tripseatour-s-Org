import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { initialTours, initialBookings, initialReviews, initialCustomers, initialSettings } from './src/data/mockData';
import { Tour, Booking, Review, Customer, AppSettings, LineNotificationLog, SalesStats } from './src/types';

const app = express();
const PORT = 3000;
const SITE_URL = process.env.APP_URL || 'https://tripseatourphuket.vercel.app';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

app.use(express.json({ limit: '10mb' }));

// Memory DB State with Supabase persistence
let tours: Tour[] = [...initialTours];
let bookings: Booking[] = [...initialBookings];
let reviews: Review[] = [...initialReviews];
let customers: Customer[] = [...initialCustomers];
let settings: AppSettings = { ...initialSettings };
let detectedLineGroups: Array<{ groupId: string; groupName?: string; lastSeen: string }> = [
  {
    groupId: 'C1234567890abcdef1234567890abcdef',
    groupName: 'กลุ่มแอดมินรับแจ้งเตือนจองทัวร์ ภูเก็ต (ตัวอย่าง)',
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
  try {
    // 1. Settings (Check app_store first for full state)
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
          adminPin: s.admin_pin || settings.adminPin
        };
      }
    }

    // 2. Tours
    const { data: kvTours } = await supabase.from('app_store').select('value').eq('key', 'tours').maybeSingle();
    if (kvTours && kvTours.value) {
      try {
        tours = JSON.parse(kvTours.value);
      } catch (e) {}
    }

    // 3. Bookings
    const { data: kvBookings } = await supabase.from('app_store').select('value').eq('key', 'bookings').maybeSingle();
    if (kvBookings && kvBookings.value) {
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
      }
    }

    // 4. Reviews
    const { data: kvReviews } = await supabase.from('app_store').select('value').eq('key', 'reviews').maybeSingle();
    if (kvReviews && kvReviews.value) {
      try {
        reviews = JSON.parse(kvReviews.value);
      } catch (e) {}
    }

    // 5. Customers
    const { data: kvCustomers } = await supabase.from('app_store').select('value').eq('key', 'customers').maybeSingle();
    if (kvCustomers && kvCustomers.value) {
      try {
        customers = JSON.parse(kvCustomers.value);
      } catch (e) {}
    }

  } catch (err) {
    console.error('Error loading state from Supabase:', err);
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

// Helper: Trigger LINE Notification via Messaging API
async function sendLineNotification(message: string, bookingRef: string = 'N/A', type: 'NEW_ORDER' | 'PAYMENT_VERIFIED' | 'ORDER_CONFIRMED' | 'REMINDER_24H' | 'TEST' = 'NEW_ORDER') {
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
      let response;
      if (targetId && targetId.trim().length > 0) {
        // Send via LINE Messaging API - Push Message to User ID / Group ID
        response = await fetch('https://api.line.me/v2/bot/message/push', {
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
      } else {
        // Send via LINE Messaging API - Broadcast Message
        response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${channelToken.trim()}`
          },
          body: JSON.stringify({
            messages: [{ type: 'text', text: message }]
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
    // Check if booking is confirmed / paid and 24h reminder hasn't been sent yet
    if ((booking.orderStatus === 'confirmed' || booking.paymentStatus === 'verified') && !booking.reminderSent) {
      const travelDateStr = booking.travelDate;
      const travelTime = new Date(travelDateStr).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.round((travelTime - todayTime) / (1000 * 3600 * 24));

      // Remind if travel date is tomorrow (1 day ahead) or today/within 24 hours
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

        await sendLineNotification(lineMsg, booking.bookingRef, 'REMINDER_24H');
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

  await sendLineNotification(lineMsg, bookingRef, 'NEW_ORDER');
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

  await sendLineNotification(msg, booking.bookingRef, 'NEW_ORDER');
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

    const msg = `\n✅ [ยืนยันการชำระเงินเรียบร้อย] ${booking.bookingRef}\n` +
      `👤 ลูกค้า: ${booking.customerName}\n` +
      `📍 ทัวร์: ${booking.tourTitle}\n` +
      `📅 วันเดินทาง: ${booking.travelDate}\n` +
      `🎉 สถานะ: ออกตั๋ว Voucher เรียบร้อยแล้ว\n` +
      `🌐 ดูเว็บไซต์: ${SITE_URL}`;

    await sendLineNotification(msg, booking.bookingRef, 'PAYMENT_VERIFIED');
  }

  await persistState('bookings');

  res.json(booking);
});

// Delete Booking Order API
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  bookings = bookings.filter(b => b.id !== id && b.bookingRef !== id);
  await persistState('bookings');
  res.json({ success: true, id, message: 'Deleted booking successfully' });
});

// --- Reviews ---
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/api/reviews', async (req, res) => {
  const { tourId, userName, rating, comment, nationality, photo } = req.body;
  const newRev: Review = {
    id: `rev-${Date.now()}`,
    tourId,
    userName,
    nationality: nationality || 'TH',
    rating: Number(rating) || 5,
    comment,
    date: new Date().toISOString().split('T')[0],
    verifiedBooking: true,
    photos: photo ? [photo] : undefined,
    isApproved: true
  };
  reviews.unshift(newRev);

  // Update tour rating average
  const tour = tours.find(t => t.id === tourId);
  if (tour) {
    const tourRevs = reviews.filter(r => r.tourId === tourId);
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

// --- Customers ---
app.get('/api/customers', (req, res) => {
  res.json(customers);
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

  const logResult = await sendLineNotification(ticketMessage, booking.bookingRef, 'ORDER_CONFIRMED');

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
