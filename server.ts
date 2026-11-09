import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';
import { initialTours, initialBookings, initialReviews, initialCustomers, initialSettings, mockSuppliers } from './src/data/mockData';
import { normalizeTours } from './src/utils/tourNormalizer';
import { Tour, Booking, Review, Customer, AppSettings, LineNotificationLog, SalesStats, AdminUser, Supplier, VisitorAnalytics, DailyVisitorPoint, VisitorPingPayload, LiveSession } from './src/types';
import extractTourHandler from './src/server-handlers/extract-tour-from-image';
import translateTourHandler from './src/server-handlers/translate-tour';
import { safeParseLlmJson } from './src/utils/llmJsonParser';

const app = express();
const PORT = 3000;
const SITE_URL = process.env.APP_URL || 'https://tripseatourphuket.vercel.app';

// Local Disk Persistence Helpers to ensure data is permanently saved across server restarts
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create data directory:', e);
  }
}

function saveLocalFile(filename: string, data: any) {
  try {
    ensureDataDir();
    const filePath = path.join(LOCAL_DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`Could not save local file ${filename}:`, e);
  }
}

function readLocalFile<T>(filename: string, defaultValue: T): T {
  try {
    const filePath = path.join(LOCAL_DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (raw && raw.trim()) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn(`Could not read local file ${filename}:`, e);
  }
  return defaultValue;
}

// Helper to gather all configured Gemini API keys (Key Pool / Rotation)
function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const addKey = (k?: string) => {
    if (!k || typeof k !== 'string') return;
    k.split(/[\n,]/).forEach(item => {
      const clean = item.trim();
      if (clean && !clean.includes('MY_GEMINI_API_KEY') && !keys.includes(clean)) {
        keys.push(clean);
      }
    });
  };

  addKey(process.env.GEMINI_API_KEYS);
  addKey(process.env.VITE_GEMINI_API_KEYS);
  addKey(process.env.GEMINI_API_KEY);
  addKey(process.env.VITE_GEMINI_API_KEY);
  addKey(process.env.GEMINI_API_KEY_2);
  addKey(process.env.GEMINI_API_KEY_3);
  addKey(process.env.GEMINI_API_KEY_4);
  addKey(process.env.GEMINI_API_KEY_5);

  return keys;
}

// Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    },
    timeout: 25000
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Dynamic live host tracking for LINE image URLs
let liveHostUrl = SITE_URL;
app.use((req, res, next) => {
  const forwardedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  const forwardedProto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString().split(',')[0].trim();
  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
    liveHostUrl = `https://${forwardedHost}`;
  }
  next();
});

// Deduplication map to prevent duplicate LINE notification messages
const recentLineNotifications = new Map<string, number>();

// Tombstone sets for permanently deleted items to prevent bounce-back
let deletedTourIds = new Set<string>(readLocalFile<string[]>('deleted_tour_ids.json', []));
let deletedBookingIds = new Set<string>(readLocalFile<string[]>('deleted_booking_ids.json', []));
let deletedCustomerIds = new Set<string>(readLocalFile<string[]>('deleted_customer_ids.json', []));
let deletedReviewIds = new Set<string>(readLocalFile<string[]>('deleted_review_ids.json', []));
let deletedSupplierIds = new Set<string>(readLocalFile<string[]>('deleted_supplier_ids.json', []));

// Authoritative Memory DB State with local disk persistence
let tours: Tour[] = (() => {
  const localSaved = readLocalFile<Tour[] | null>('tours.json', null);
  if (localSaved && Array.isArray(localSaved) && localSaved.length > 0) {
    return normalizeTours(localSaved).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
  }
  const defaults = normalizeTours(initialTours).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
  saveLocalFile('tours.json', defaults);
  return defaults;
})();

let bookings: Booking[] = (() => {
  const localSaved = readLocalFile<Booking[] | null>('bookings.json', null);
  const source = (localSaved && Array.isArray(localSaved)) ? localSaved : [...initialBookings];
  const filtered = source.filter(b => !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
  saveLocalFile('bookings.json', filtered);
  return filtered;
})();

let reviews: Review[] = (() => {
  const localSaved = readLocalFile<Review[] | null>('reviews.json', null);
  const source = (localSaved && Array.isArray(localSaved)) ? localSaved : [...initialReviews];
  const filtered = source.filter(r => !deletedReviewIds.has(r.id));
  saveLocalFile('reviews.json', filtered);
  return filtered;
})();

let customers: Customer[] = (() => {
  const localSaved = readLocalFile<Customer[] | null>('customers.json', null);
  const source = (localSaved && Array.isArray(localSaved)) ? localSaved : [...initialCustomers];
  const filtered = source.filter(c => !deletedCustomerIds.has(c.id));
  saveLocalFile('customers.json', filtered);
  return filtered;
})();

let suppliers: Supplier[] = (() => {
  const localSaved = readLocalFile<Supplier[] | null>('suppliers.json', null);
  const source = (localSaved && Array.isArray(localSaved)) ? localSaved : [...mockSuppliers];
  const filtered = source.filter(s => !deletedSupplierIds.has(s.id));
  saveLocalFile('suppliers.json', filtered);
  return filtered;
})();

let settings: AppSettings = readLocalFile<AppSettings>('settings.json', { ...initialSettings });

function getDefaultVisitorAnalytics(): VisitorAnalytics {
  const dailyHistory: DailyVisitorPoint[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const views = 140 + Math.floor(Math.sin(i * 1.5) * 45) + (i % 3) * 20;
    const uniques = Math.floor(views * 0.62) + (i % 2) * 5;
    dailyHistory.push({ date: dateStr, views, uniques });
  }

  return {
    totalPageviews: 24850,
    totalUniqueVisitors: 9420,
    todayPageviews: 186,
    todayUniqueVisitors: 114,
    yesterdayPageviews: 210,
    yesterdayUniqueVisitors: 128,
    activeNow: 4,
    dailyHistory,
    devices: {
      mobile: 16890,
      desktop: 6940,
      tablet: 1020
    },
    topPages: [
      { path: 'home', title: 'หน้าแรก - ทัวร์เกาะพีพี & ทะเลภูเก็ต', views: 15420 },
      { path: 'how-to-book', title: 'วิธีการจอง & นโยบายการชำระเงิน', views: 4280 },
      { path: 'about-me', title: 'เกี่ยวกับเรา & ใบอนุญาต ททท.', views: 2890 },
      { path: 'tour-detail', title: 'รายละเอียดโปรแกรมทัวร์', views: 2260 }
    ],
    sources: [
      { source: 'Direct / ค้นหาตรง', count: 9800, percentage: 39.4 },
      { source: 'Google Search', count: 8200, percentage: 33.0 },
      { source: 'Facebook', count: 3950, percentage: 15.9 },
      { source: 'LINE Official', count: 2100, percentage: 8.5 },
      { source: 'TikTok & Other', count: 800, percentage: 3.2 }
    ],
    recentVisitors: [
      {
        id: 'v-th-8821',
        timestamp: new Date(Date.now() - 1000 * 45).toISOString(),
        device: 'mobile',
        page: 'home',
        referrer: 'Google Search'
      },
      {
        id: 'v-th-4190',
        timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
        device: 'desktop',
        page: 'tour-detail',
        referrer: 'Direct'
      },
      {
        id: 'v-th-9102',
        timestamp: new Date(Date.now() - 1000 * 180).toISOString(),
        device: 'mobile',
        page: 'how-to-book',
        referrer: 'Facebook'
      }
    ],
    lastUpdated: new Date().toISOString()
  };
}

let visitorAnalytics: VisitorAnalytics = readLocalFile<VisitorAnalytics>('analytics.json', getDefaultVisitorAnalytics());

interface ActiveSessionRecord {
  visitorId: string;
  ipMasked: string;
  country: string;
  countryCode: string;
  city?: string;
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
  screen?: string;
  language?: string;
  timezone?: string;
  currentPage: string;
  pageTitle?: string;
  referrer: string;
  firstSeen: number;
  lastPing: number;
  pageviewsCount: number;
}

const activeSessions = new Map<string, ActiveSessionRecord>();
const todayVisitorsSet = new Set<string>();

function getClientLocation(req: any, clientTimezone?: string, clientLang?: string) {
  const rawIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  const isLocal = rawIp === '127.0.0.1' || rawIp === '::1' || rawIp.startsWith('192.168.') || rawIp.startsWith('10.');
  const ipMasked = isLocal ? '127.0.0.1 (Local)' : rawIp.replace(/\.\d+$/, '.xxx');

  let countryCode = (req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code'] || '').toString().toUpperCase();
  const city = (req.headers['x-vercel-ip-city'] || '').toString();

  if (!countryCode) {
    if (clientTimezone?.includes('Bangkok') || clientLang?.toLowerCase().startsWith('th')) {
      countryCode = 'TH';
    } else if (clientTimezone?.includes('Shanghai') || clientTimezone?.includes('Chongqing') || clientLang?.toLowerCase().startsWith('zh')) {
      countryCode = 'CN';
    } else if (clientTimezone?.includes('Moscow') || clientLang?.toLowerCase().startsWith('ru')) {
      countryCode = 'RU';
    } else if (clientTimezone?.includes('London') || clientTimezone?.includes('Europe')) {
      countryCode = 'GB';
    } else if (clientTimezone?.includes('New_York') || clientTimezone?.includes('Los_Angeles') || clientTimezone?.includes('America')) {
      countryCode = 'US';
    } else {
      countryCode = 'TH';
    }
  }

  const countryNames: Record<string, { name: string; flag: string }> = {
    TH: { name: 'ประเทศไทย', flag: '🇹🇭' },
    US: { name: 'United States', flag: '🇺🇸' },
    CN: { name: 'China (จีน)', flag: '🇨🇳' },
    RU: { name: 'Russia (รัสเซีย)', flag: '🇷🇺' },
    GB: { name: 'United Kingdom', flag: '🇬🇧' },
    DE: { name: 'Germany', flag: '🇩🇪' },
    SG: { name: 'Singapore', flag: '🇸🇬' },
    MY: { name: 'Malaysia', flag: '🇲🇾' },
    AU: { name: 'Australia', flag: '🇦🇺' },
    KR: { name: 'South Korea', flag: '🇰🇷' },
    JP: { name: 'Japan', flag: '🇯🇵' },
  };

  const cInfo = countryNames[countryCode] || { name: countryCode || 'Global', flag: '🌐' };

  return {
    rawIp,
    ipMasked,
    countryCode,
    country: `${cInfo.flag} ${cInfo.name}`,
    city: city || (countryCode === 'TH' ? 'Phuket / Bangkok' : undefined)
  };
}

function getCleanLiveSessions(): LiveSession[] {
  const nowMs = Date.now();
  const list: LiveSession[] = [];
  for (const [vId, session] of activeSessions.entries()) {
    if (nowMs - session.lastPing > 180000) {
      activeSessions.delete(vId);
    } else {
      list.push({
        visitorId: session.visitorId,
        ipMasked: session.ipMasked,
        country: session.country,
        countryCode: session.countryCode,
        city: session.city,
        device: session.device,
        browser: session.browser,
        os: session.os,
        screen: session.screen,
        language: session.language,
        timezone: session.timezone,
        currentPage: session.currentPage,
        pageTitle: session.pageTitle,
        referrer: session.referrer,
        firstSeen: new Date(session.firstSeen).toISOString(),
        lastPing: new Date(session.lastPing).toISOString(),
        lastPingSecondsAgo: Math.max(0, Math.floor((nowMs - session.lastPing) / 1000)),
        pageviewsCount: session.pageviewsCount
      });
    }
  }
  list.sort((a, b) => new Date(b.lastPing).getTime() - new Date(a.lastPing).getTime());
  return list;
}


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
  return;
}

let syncMetadata = {
  version: 1,
  lastUpdatedAt: {
    tours: new Date().toISOString(),
    bookings: new Date().toISOString(),
    reviews: new Date().toISOString(),
    customers: new Date().toISOString(),
    suppliers: new Date().toISOString(),
    settings: new Date().toISOString()
  }
};

export function updateSyncMetadata(key?: 'tours' | 'bookings' | 'reviews' | 'customers' | 'suppliers' | 'settings') {
  syncMetadata.version++;
  const iso = new Date().toISOString();
  if (key) {
    syncMetadata.lastUpdatedAt[key] = iso;
  } else {
    syncMetadata.lastUpdatedAt.tours = iso;
    syncMetadata.lastUpdatedAt.bookings = iso;
    syncMetadata.lastUpdatedAt.reviews = iso;
    syncMetadata.lastUpdatedAt.customers = iso;
    syncMetadata.lastUpdatedAt.suppliers = iso;
    syncMetadata.lastUpdatedAt.settings = iso;
  }
}

async function persistState(key: 'tours' | 'bookings' | 'settings' | 'reviews' | 'customers' | 'suppliers' | 'analytics') {
  updateSyncMetadata(key === 'analytics' ? undefined : key);

  // 1. Always save to local file on disk for 100% permanent persistence
  try {
    if (key === 'tours') {
      saveLocalFile('tours.json', tours);
      saveLocalFile('deleted_tour_ids.json', Array.from(deletedTourIds));
    } else if (key === 'bookings') {
      saveLocalFile('bookings.json', bookings);
      saveLocalFile('deleted_booking_ids.json', Array.from(deletedBookingIds));
    } else if (key === 'settings') {
      saveLocalFile('settings.json', settings);
    } else if (key === 'reviews') {
      saveLocalFile('reviews.json', reviews);
      saveLocalFile('deleted_review_ids.json', Array.from(deletedReviewIds));
    } else if (key === 'customers') {
      saveLocalFile('customers.json', customers);
      saveLocalFile('deleted_customer_ids.json', Array.from(deletedCustomerIds));
    } else if (key === 'suppliers') {
      saveLocalFile('suppliers.json', suppliers);
      saveLocalFile('deleted_supplier_ids.json', Array.from(deletedSupplierIds));
    } else if (key === 'analytics') {
      saveLocalFile('analytics.json', visitorAnalytics);
    }
  } catch (localErr) {
    console.warn(`Local file save error for ${key}:`, localErr);
  }

  // 2. Sync to Supabase - removed (local disk storage active)
  return;
}

// Middleware to ensure persistent state is loaded on every API call
app.use(async (req, res, next) => {
  isStateLoaded = true;
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
  // Deduplicate rapid repeat calls for the same booking and event within 30 seconds
  if (bookingRef && bookingRef !== 'N/A' && bookingRef !== 'TEST' && bookingRef !== 'GROUP-ID-CHECK') {
    const dedupKey = `${bookingRef}_${type}`;
    const lastSentTime = recentLineNotifications.get(dedupKey);
    const now = Date.now();
    if (lastSentTime && now - lastSentTime < 30000) {
      console.log(`[LINE] Skipping duplicate notification for ${dedupKey} (sent ${Math.round((now - lastSentTime) / 1000)}s ago)`);
      return {
        id: `log-${Date.now()}`,
        bookingRef,
        type,
        message: `${message} (ข้ามการส่งซ้ำ: เพิ่งส่งไปเมื่อสักครู่)`,
        status: 'sent' as const,
        timestamp: new Date().toISOString()
      };
    }
    recentLineNotifications.set(dedupKey, now);
    if (recentLineNotifications.size > 100) {
      for (const [k, t] of recentLineNotifications.entries()) {
        if (now - t > 300000) recentLineNotifications.delete(k);
      }
    }
  }

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
      const rawHost = liveHostUrl || SITE_URL || 'https://tripseatourphuket.vercel.app';
      const hostUrl = rawHost.startsWith('https://') 
        ? rawHost 
        : (rawHost.startsWith('http://') ? rawHost.replace('http://', 'https://') : `https://${rawHost}`);

      const booking = bookings.find(b => b.bookingRef === bookingRef || b.id === bookingRef);

      // 1. Slip Image (Payment slip uploaded by customer)
      let effectiveSlipUrl: string | null = null;
      const hasSlipData = Boolean(
        (slipImageUrl && slipImageUrl.trim().length > 0) ||
        (booking?.slipUrl && booking.slipUrl.trim().length > 0) ||
        memoryServerImages.has(`slip_${bookingRef}`)
      );

      if (hasSlipData) {
        if (slipImageUrl && slipImageUrl.startsWith('https://') && !slipImageUrl.includes('localhost')) {
          effectiveSlipUrl = slipImageUrl;
        } else if (booking?.slipUrl && booking.slipUrl.startsWith('https://') && !booking.slipUrl.includes('localhost')) {
          effectiveSlipUrl = booking.slipUrl;
        } else if (bookingRef && bookingRef.startsWith('TST-')) {
          effectiveSlipUrl = `${hostUrl}/api/slip-image?ref=${bookingRef}`;
        }
      }

      if (effectiveSlipUrl) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: effectiveSlipUrl,
          previewImageUrl: effectiveSlipUrl
        });
      }

      // 2. Ticket Voucher / Tour Image (High-res photo of tour or verified ticket)
      let effectiveTicketUrl: string | null = null;
      if (ticketImageUrl && ticketImageUrl.startsWith('https://') && !ticketImageUrl.includes('localhost')) {
        effectiveTicketUrl = ticketImageUrl;
      } else if (imageUrl && imageUrl.startsWith('https://') && !imageUrl.includes('localhost')) {
        effectiveTicketUrl = imageUrl;
      } else if (booking?.tourImage && booking.tourImage.startsWith('https://') && !booking.tourImage.includes('localhost')) {
        effectiveTicketUrl = booking.tourImage;
      } else if (bookingRef && bookingRef.startsWith('TST-')) {
        effectiveTicketUrl = `${hostUrl}/api/ticket-image?ref=${bookingRef}`;
      }

      if (effectiveTicketUrl) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: effectiveTicketUrl,
          previewImageUrl: effectiveTicketUrl
        });
      }

      // 3. Detailed Text Message
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

        // Fallback to text-only push if image proxy unreachable from LINE
        try {
          const fallbackRes = await fetch(targetId ? 'https://api.line.me/v2/bot/message/push' : 'https://api.line.me/v2/bot/message/broadcast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${channelToken.trim()}`
            },
            body: JSON.stringify(targetId ? {
              to: targetId.trim(),
              messages: [{ type: 'text', text: message }]
            } : {
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
          `🏨 โรงแรมรับส่ง: ${booking.pickupHotel}${booking.roomNumber ? ` (ห้อง ${booking.roomNumber})` : ''}\n` +
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
  const activeTours = tours.filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
  res.json(normalizeTours(activeTours));
});

// Endpoint to retrieve deleted tour IDs
app.get('/api/tours/deleted-ids', (req, res) => {
  res.json({ deletedTourIds: Array.from(deletedTourIds) });
});

// Endpoint to retrieve all permanently deleted IDs across all entities
app.get('/api/deleted-ids', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    deletedTourIds: Array.from(deletedTourIds),
    deletedBookingIds: Array.from(deletedBookingIds),
    deletedCustomerIds: Array.from(deletedCustomerIds),
    deletedReviewIds: Array.from(deletedReviewIds),
    deletedSupplierIds: Array.from(deletedSupplierIds)
  });
});

app.post('/api/tours', async (req, res) => {
  const tourId = req.body.id || `tour-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newTour: Tour = {
    ...req.body,
    id: tourId,
    slug: req.body.slug || tourId
  };

  // Untombstone if it was previously in deletedTourIds
  deletedTourIds.delete(newTour.id);
  if (newTour.slug) deletedTourIds.delete(newTour.slug);
  saveLocalFile('deleted_tour_ids.json', Array.from(deletedTourIds));

  // Check if tour already exists by id or titleTH to prevent duplicates
  const existingIdx = tours.findIndex(t => t.id === newTour.id || (t.title?.TH && t.title.TH === newTour.title?.TH));
  if (existingIdx !== -1) {
    tours[existingIdx] = { ...tours[existingIdx], ...newTour };
  } else {
    tours.unshift(newTour);
  }

  tours = normalizeTours(tours).filter(t => !deletedTourIds.has(t.id));
  await persistState('tours');
  res.json({ ...(existingIdx !== -1 ? tours[existingIdx] : newTour), version: syncMetadata.version });
});

app.put('/api/tours/:id', async (req, res) => {
  const { id } = req.params;
  const index = tours.findIndex(t => t.id === id);
  if (index !== -1) {
    tours[index] = { ...tours[index], ...req.body };
    tours = normalizeTours(tours).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
    await persistState('tours');
    res.json({ ...tours[index], version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Tour not found' });
  }
});

app.delete('/api/tours/:id', async (req, res) => {
  const { id } = req.params;
  const target = tours.find(t => t.id === id || t.slug === id);
  deletedTourIds.add(id);
  if (target?.id) deletedTourIds.add(target.id);
  if (target?.slug) deletedTourIds.add(target.slug);

  tours = tours.filter(t => t.id !== id && t.slug !== id && !deletedTourIds.has(t.id));
  await persistState('tours');
  saveLocalFile('deleted_tour_ids.json', Array.from(deletedTourIds));

  console.log(`[Permanently Deleted Tour]: ${id} (${target?.title?.TH || ''}), remaining tours: ${tours.length}`);

  res.json({
    success: true,
    id,
    deletedTourIds: Array.from(deletedTourIds),
    version: syncMetadata.version
  });
});

// Save all tours in batch / overwrite all tours (e.g. from JSON import / restore)
app.post('/api/tours/save-all', async (req, res) => {
  try {
    const incomingTours = req.body?.tours || req.body;
    if (!Array.isArray(incomingTours)) {
      return res.status(400).json({ error: 'tours payload must be an array' });
    }

    // Untombstone all incoming tours from deleted list (explicitly imported or restored by user)
    incomingTours.forEach((t: any) => {
      if (t.id) deletedTourIds.delete(t.id);
      if (t.slug) deletedTourIds.delete(t.slug);
    });
    saveLocalFile('deleted_tour_ids.json', Array.from(deletedTourIds));

    tours = normalizeTours(incomingTours);
    await persistState('tours');
    res.json({
      success: true,
      count: tours.length,
      tours,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.tours
    });
  } catch (err: any) {
    console.error('Save all tours error:', err);
    res.status(500).json({ error: err?.message || 'Failed to save all tours' });
  }
});

// Reset tours to default initial tours (clears deleted list upon explicit user request)
app.post('/api/tours/reset-default', async (req, res) => {
  try {
    deletedTourIds.clear();
    saveLocalFile('deleted_tour_ids.json', []);
    tours = normalizeTours([...initialTours]);
    await persistState('tours');
    res.json({
      success: true,
      count: tours.length,
      tours,
      deletedTourIds: [],
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.tours
    });
  } catch (err: any) {
    console.error('Reset tours error:', err);
    res.status(500).json({ error: err?.message || 'Failed to reset tours' });
  }
});

// --- Suppliers API (CRUD & Bulk JSON Backup / Restore) ---
app.get('/api/suppliers', (req, res) => {
  const activeSuppliers = suppliers.filter(s => !deletedSupplierIds.has(s.id));
  res.json(activeSuppliers);
});

app.post('/api/suppliers', async (req, res) => {
  const newSup: Supplier = {
    id: req.body.id || `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: req.body.name || 'ซัพพลายเออร์ใหม่',
    code: req.body.code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
    contactPerson: req.body.contactPerson,
    phone: req.body.phone || '',
    email: req.body.email,
    lineId: req.body.lineId,
    address: req.body.address,
    bankName: req.body.bankName,
    accountNo: req.body.accountNo,
    accountName: req.body.accountName,
    bankAccount: req.body.bankAccount,
    notes: req.body.notes,
    isActive: req.body.isActive !== false,
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  };

  deletedSupplierIds.delete(newSup.id);
  const existingIdx = suppliers.findIndex(s => s.id === newSup.id || (s.code && s.code === newSup.code));
  if (existingIdx !== -1) {
    suppliers[existingIdx] = { ...suppliers[existingIdx], ...newSup };
  } else {
    suppliers.unshift(newSup);
  }

  suppliers = suppliers.filter(s => !deletedSupplierIds.has(s.id));
  await persistState('suppliers');
  res.json({ ...(existingIdx !== -1 ? suppliers[existingIdx] : newSup), version: syncMetadata.version });
});

app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const index = suppliers.findIndex(s => s.id === id);
  if (index !== -1) {
    suppliers[index] = { ...suppliers[index], ...req.body };
    suppliers = suppliers.filter(s => !deletedSupplierIds.has(s.id));
    await persistState('suppliers');
    res.json({ ...suppliers[index], version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Supplier not found' });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  deletedSupplierIds.add(id);
  suppliers = suppliers.filter(s => s.id !== id && !deletedSupplierIds.has(s.id));
  await persistState('suppliers');
  res.json({
    success: true,
    id,
    deletedSupplierIds: Array.from(deletedSupplierIds),
    version: syncMetadata.version
  });
});

app.post('/api/suppliers/save-all', async (req, res) => {
  try {
    const incoming = req.body?.suppliers || req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'suppliers payload must be an array' });
    }
    suppliers = incoming.filter((s: Supplier) => !deletedSupplierIds.has(s.id));
    await persistState('suppliers');
    res.json({
      success: true,
      count: suppliers.length,
      suppliers,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.suppliers
    });
  } catch (err: any) {
    console.error('Save all suppliers error:', err);
    res.status(500).json({ error: err?.message || 'Failed to save all suppliers' });
  }
});

// --- Bulk Save Bookings API (for JSON Import & Restore) ---
app.post('/api/bookings/save-all', async (req, res) => {
  try {
    const incoming = req.body?.bookings || req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'bookings payload must be an array' });
    }
    bookings = incoming;
    await persistState('bookings');
    res.json({
      success: true,
      count: bookings.length,
      bookings,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.bookings
    });
  } catch (err: any) {
    console.error('Save all bookings error:', err);
    res.status(500).json({ error: err?.message || 'Failed to save all bookings' });
  }
});

// --- Universal Full-System Backup & Restore Endpoints ---
app.get('/api/backup/full-export', (req, res) => {
  const timestamp = new Date().toISOString();
  const backupBundle = {
    system: 'Trip Sea Tour Phuket',
    version: '2.0',
    exportedAt: timestamp,
    counts: {
      tours: tours.length,
      suppliers: suppliers.length,
      customers: customers.length,
      bookings: bookings.length,
      reviews: reviews.length
    },
    data: {
      tours,
      suppliers,
      customers,
      bookings,
      reviews,
      settings
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tripseatour_full_backup_${timestamp.split('T')[0]}.json"`);
  res.json(backupBundle);
});

app.post('/api/backup/full-import', async (req, res) => {
  try {
    const bundle = req.body?.data || req.body;
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({ error: 'Invalid backup bundle format' });
    }

    const restoredCounts: Record<string, number> = {};

    // 1. Tours
    if (Array.isArray(bundle.tours)) {
      bundle.tours.forEach((t: any) => {
        if (t.id) deletedTourIds.delete(t.id);
        if (t.slug) deletedTourIds.delete(t.slug);
      });
      saveLocalFile('deleted_tour_ids.json', Array.from(deletedTourIds));
      tours = normalizeTours(bundle.tours);
      await persistState('tours');
      restoredCounts.tours = tours.length;
    }

    // 2. Suppliers
    if (Array.isArray(bundle.suppliers)) {
      suppliers = bundle.suppliers;
      await persistState('suppliers');
      restoredCounts.suppliers = suppliers.length;
    }

    // 3. Customers
    if (Array.isArray(bundle.customers)) {
      customers = bundle.customers;
      await persistState('customers');
      restoredCounts.customers = customers.length;
    }

    // 4. Bookings
    if (Array.isArray(bundle.bookings)) {
      bookings = bundle.bookings;
      await persistState('bookings');
      restoredCounts.bookings = bookings.length;
    }

    // 5. Reviews
    if (Array.isArray(bundle.reviews)) {
      reviews = bundle.reviews;
      await persistState('reviews');
      restoredCounts.reviews = reviews.length;
    }

    // 6. Settings
    if (bundle.settings && typeof bundle.settings === 'object' && bundle.settings.promptPayId) {
      settings = { ...settings, ...bundle.settings };
      await persistState('settings');
      restoredCounts.settings = 1;
    }

    res.json({
      success: true,
      message: 'กู้คืนข้อมูลสำรองทั้งระบบเรียบร้อยแล้ว',
      restoredCounts,
      version: syncMetadata.version,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Full import error:', err);
    res.status(500).json({ error: err?.message || 'Failed to restore full backup' });
  }
});

// AI Automatic Tour Translation endpoint for Admin
app.all('/api/translate-tour', async (req, res) => {
  return translateTourHandler(req, res);
});

// AI Tour Extraction from Flyer / Image(s) endpoint for Admin (Single or Multiple Images)
app.all('/api/extract-tour-from-image', async (req, res) => {
  return extractTourHandler(req, res);
});


// --- Bookings ---
app.get('/api/bookings', (req, res) => {
  const activeBookings = bookings.filter(b => !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
  res.json(activeBookings);
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

  // Untombstone booking ID and ref
  deletedBookingIds.delete(newBooking.id);
  deletedBookingIds.delete(bookingRef);

  bookings.unshift(newBooking);

  // Cache slip image in memory immediately if uploaded
  if (hasSlip && slipUrl) {
    const mimeMatch = slipUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    memoryServerImages.set(`slip_${bookingRef}`, { data: slipUrl, mimeType });
    memoryServerImages.set(`slip_${newBooking.id}`, { data: slipUrl, mimeType });
  }

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

  // LINE Notification Alert (Single authoritative send upon creation)
  const rawHost = liveHostUrl || SITE_URL || 'https://tripseatourphuket.vercel.app';
  const hostUrl = rawHost.startsWith('https://') 
    ? rawHost 
    : (rawHost.startsWith('http://') ? rawHost.replace('http://', 'https://') : `https://${rawHost}`);

  const lineMsg = `🔔 [มีคำสั่งจองใหม่${hasSlip ? ' (แนบสลิปแล้ว)' : ''}!] ${bookingRef}\n` +
    `📍 ทัวร์: ${newBooking.tourTitle}\n` +
    `👤 ลูกค้า: ${customerName} (${customerPhone})\n` +
    `📅 วันเดินทาง: ${travelDate}\n` +
    `🏨 โรงแรม: ${pickupHotel}${roomNumber ? ` (ห้อง ${roomNumber})` : ''} (โซน: ${pickupZone || 'ทั่วไป'})\n` +
    `👥 จำนวน: ผู้ใหญ่ ${adults} ท่าน / เด็ก ${children} ท่าน\n` +
    `💰 ยอดรวม: ฿${totalAmount.toLocaleString()} (PromptPay QR)\n` +
    `📄 สลิปโอนเงิน: ${hasSlip ? 'แนบสลิปเรียบร้อย (ดูรูปด้านบน)' : 'ยังไม่แนบสลิป'}\n` +
    `🌐 เว็บไซต์: ${hostUrl}`;

  await sendLineNotification(
    lineMsg, 
    bookingRef, 
    'NEW_ORDER', 
    newBooking.tourImage, 
    newBooking.tourImage, 
    hasSlip ? `${hostUrl}/api/slip-image?ref=${bookingRef}` : undefined
  );
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

  if (slipUrl) {
    const mimeMatch = slipUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    memoryServerImages.set(`slip_${booking.bookingRef}`, { data: slipUrl, mimeType });
    memoryServerImages.set(`slip_${booking.id}`, { data: slipUrl, mimeType });
  }

  const wasAlreadySlipUploaded = booking.paymentStatus === 'slip_uploaded' && Boolean(booking.slipUrl);
  booking.slipUrl = slipUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80';
  booking.paymentStatus = 'slip_uploaded';
  booking.slipUploadedAt = new Date().toISOString();

  // Only send notification if not already notified for this slip
  if (!wasAlreadySlipUploaded && !booking.lineNotifySent) {
    const rawHost = liveHostUrl || SITE_URL || 'https://tripseatourphuket.vercel.app';
    const hostUrl = rawHost.startsWith('https://') 
      ? rawHost 
      : (rawHost.startsWith('http://') ? rawHost.replace('http://', 'https://') : `https://${rawHost}`);

    const msg = `📄 [สลิปแจ้งชำระเงิน] ${booking.bookingRef}\n` +
      `👤 ${booking.customerName} อัปโหลดสลิปเรียบร้อยแล้ว\n` +
      `💰 ยอดชำระ: ฿${booking.totalAmount.toLocaleString()}\n` +
      `🌐 ตรวจสอบที่: ${hostUrl}`;

    await sendLineNotification(
      msg, 
      booking.bookingRef, 
      'NEW_ORDER', 
      booking.tourImage, 
      booking.tourImage, 
      `${hostUrl}/api/slip-image?ref=${booking.bookingRef}`
    );
    booking.lineNotifySent = true;
  }

  await persistState('bookings');
  res.json({ ...booking, version: syncMetadata.version });
});

app.put('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { supplierId, supplierName, paymentStatus, orderStatus } = req.body;
  if (supplierId !== undefined) booking.supplierId = supplierId ? supplierId : undefined;
  if (supplierName !== undefined) booking.supplierName = supplierName ? supplierName : undefined;
  if (paymentStatus) booking.paymentStatus = paymentStatus;
  if (orderStatus) booking.orderStatus = orderStatus;

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
      `🏨 โรงแรมที่รับ: ${booking.pickupHotel}${booking.roomNumber ? ` (ห้อง: ${booking.roomNumber})` : ''} (โซน: ${booking.pickupZone || 'ทั่วไป'})\n` +
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
  const target = bookings.find(b => b.id === id || b.bookingRef === id);
  deletedBookingIds.add(id);
  if (target?.id) deletedBookingIds.add(target.id);
  if (target?.bookingRef) deletedBookingIds.add(target.bookingRef);
  bookings = bookings.filter(b => b.id !== id && b.bookingRef !== id && !deletedBookingIds.has(b.id));
  await persistState('bookings');
  res.json({
    success: true,
    id,
    deletedBookingIds: Array.from(deletedBookingIds),
    version: syncMetadata.version,
    message: 'Deleted booking successfully'
  });
});

// Local Storage Connection Status API
app.get('/api/admin/supabase-status', async (req, res) => {
  res.json({
    connected: true,
    storageType: 'Local Disk Persistence (data/*.json)',
    message: 'Local disk storage active (Supabase completely removed)',
    keysFound: ['tours', 'bookings', 'reviews', 'customers', 'suppliers', 'settings']
  });
});

// Purge / Clean orphaned deleted data from Local Storage
app.post('/api/admin/clean-deleted-data', async (req, res) => {
  try {
    await persistState('tours');
    await persistState('bookings');
    await persistState('reviews');
    await persistState('customers');
    await persistState('suppliers');
    await persistState('settings');

    res.json({ success: true, message: 'ล้างข้อมูลเก่าที่ลบไปแล้วเรียบร้อยแล้ว' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clean data', details: err?.message });
  }
});

// Manual Backup Database API to force write state to local disk files
app.post('/api/admin/backup-database', async (req, res) => {
  try {
    await persistState('tours');
    await persistState('bookings');
    await persistState('reviews');
    await persistState('customers');
    await persistState('settings');

    res.json({
      success: true,
      message: 'สำรองข้อมูลลงไฟล์ระบบ Local Disk เรียบร้อยแล้ว',
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
  const activeReviews = reviews.filter(r => !deletedReviewIds.has(r.id));
  res.json(activeReviews);
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
  deletedReviewIds.add(id);
  reviews = reviews.filter(r => r.id !== id && !deletedReviewIds.has(r.id));
  await persistState('reviews');
  res.json({
    success: true,
    id,
    deletedReviewIds: Array.from(deletedReviewIds),
    version: syncMetadata.version,
    message: 'Review deleted successfully'
  });
});

// --- AI Review Reply Generator (Powered by Gemini AI) ---
app.post('/api/ai/reply-review', async (req, res) => {
  try {
    const { reviewComment, rating, customerName, tourTitle } = req.body;

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
      `📌 **กำหนดชำระและเลื่อน/ยกเลิก**: ชำระล่วงหน้าก่อนวันเดินทางไม่เกิน 1 วัน / สามารถเลื่อนวันเดินทางหรือยกเลิกได้ล่วงหน้าก่อนวันเดินทาง 1 วัน ไม่เกินเวลา 18:00 น. (หากเกินเวลา 18:00 น. ของวันก่อนเดินทาง ขอสงวนสิทธิ์งดคืนเงินทุกกรณีค่ะ)\n\n` +
      `💬 หรือหากสะดวกจองผ่านแอดมิน ทัก LINE ได้ที่: **${lineOa}** ได้ตลอด 24 ชม. ค่ะ`;
  }

  // 4.5. Cancellation & Reschedule Policy
  if (lower.includes('ยกเลิก') || lower.includes('เลื่อน') || lower.includes('คืนเงิน') || lower.includes('cancel') || lower.includes('reschedule') || lower.includes('refund') || lower.includes('18:00') || lower.includes('18.00')) {
    return `📌 **นโยบายการชำระเงิน การเลื่อนวันเดินทาง และการยกเลิกการจองค่ะ**:\n\n` +
      `1️⃣ **กำหนดชำระเงิน**: ชำระเงินล่วงหน้าก่อนวันเดินทางอย่างน้อย/ไม่เกิน 1 วัน\n` +
      `2️⃣ **การเลื่อนวันเดินทางหรือยกเลิก**: สามารถแจ้งเลื่อนวันเดินทางหรือยกเลิกการจองได้ล่วงหน้าก่อนวันเดินทาง 1 วัน **ไม่เกินเวลา 18:00 น.**\n` +
      `3️⃣ **หากเลยกำหนดเวลา**: หากแจ้งเลื่อนหรือยกเลิกเลยเวลา 18:00 น. ของวันก่อนเดินทาง ทางบริษัทขอสงวนสิทธิ์ **งดคืนเงินทุกกรณี** ค่ะ\n` +
      `4️⃣ **กรณีคลื่นลมมรสุม**: หากเรือไม่สามารถออกจากฝั่งได้เนื่องจากสภาพอากาศหรือคำสั่งจากทางราชการ ยินดีคืนเงินเต็มจำนวน 100% หรือปรับเลื่อนวันเดินทางให้ทันทีค่ะ!`;
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

      let aiText = '';
      for (const m of ['gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: `${systemInstruction}\n\nUser Question: ${message}`,
          });
          if (response && response.text) {
            aiText = response.text;
            break;
          }
        } catch (_) {}
      }

      if (aiText) {
        return res.json({ reply: aiText });
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
  saveLocalFile('live_chat_sessions.json', liveChatSessions);
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
      'LIVE_CHAT' as any,
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

app.delete('/api/livechat/delete/:id', async (req, res) => {
  const id = req.params.id || req.query.id || req.body?.id || req.body?.sessionId;
  if (id) {
    liveChatSessions = liveChatSessions.filter(s => s.id !== id);
    await persistLiveChat();
  }
  res.json({ success: true, sessions: liveChatSessions });
});

app.post('/api/livechat/delete/:id', async (req, res) => {
  const id = req.params.id || req.query.id || req.body?.id || req.body?.sessionId;
  if (id) {
    liveChatSessions = liveChatSessions.filter(s => s.id !== id);
    await persistLiveChat();
  }
  res.json({ success: true, sessions: liveChatSessions });
});

app.post('/api/livechat/delete', async (req, res) => {
  const id = req.query.id || req.body?.id || req.body?.sessionId;
  if (id) {
    liveChatSessions = liveChatSessions.filter(s => s.id !== id);
    await persistLiveChat();
  }
  res.json({ success: true, sessions: liveChatSessions });
});

// --- Customers ---
app.get('/api/customers', (req, res) => {
  const activeCustomers = customers.filter(c => !deletedCustomerIds.has(c.id));
  res.json(activeCustomers);
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
    
    customers = customers.filter(c => !deletedCustomerIds.has(c.id));
    await persistState('customers');
    res.json({ ...cust, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  deletedCustomerIds.add(id);
  customers = customers.filter(c => c.id !== id && !deletedCustomerIds.has(c.id));
  await persistState('customers');
  res.json({
    success: true,
    id,
    deletedCustomerIds: Array.from(deletedCustomerIds),
    version: syncMetadata.version,
    message: 'Customer deleted successfully'
  });
});

app.post('/api/customers/save-all', async (req, res) => {
  try {
    const incoming = req.body?.customers || req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'customers payload must be an array' });
    }
    customers = incoming.filter((c: Customer) => !deletedCustomerIds.has(c.id));
    await persistState('customers');
    res.json({
      success: true,
      count: customers.length,
      customers,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.customers
    });
  } catch (err: any) {
    console.error('Save all customers error:', err);
    res.status(500).json({ error: err?.message || 'Failed to save all customers' });
  }
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

// --- Website Visitor Analytics API (100% Genuine Real-time Tracking) ---
app.get('/api/analytics/stats', (req, res) => {
  const live = getCleanLiveSessions();
  visitorAnalytics.activeNow = live.length;
  visitorAnalytics.liveSessions = live;
  visitorAnalytics.lastUpdated = new Date().toISOString();
  res.json(visitorAnalytics);
});

app.get('/api/analytics/live', (req, res) => {
  const live = getCleanLiveSessions();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    activeNow: live.length,
    liveSessions: live,
    lastUpdated: new Date().toISOString()
  });
});

app.post('/api/analytics/ping', async (req, res) => {
  try {
    const {
      visitorId,
      page = 'home',
      title,
      referrer = 'Direct',
      device = 'mobile',
      browser = 'Browser',
      os = 'OS',
      screen,
      language,
      timezone
    } = req.body || {};

    const effectiveVisitorId = (visitorId && visitorId.length > 3) ? visitorId : `v-${Math.random().toString(36).substring(2, 8)}`;
    const effectiveDevice: 'mobile' | 'desktop' | 'tablet' = (device === 'desktop' || device === 'tablet' || device === 'mobile') ? device : 'mobile';

    // 1. Detect Real Location / IP from Request
    const loc = getClientLocation(req, timezone, language);
    const nowMs = Date.now();

    // 2. Update or insert in activeSessions map
    const existingSession = activeSessions.get(effectiveVisitorId);
    if (existingSession) {
      existingSession.lastPing = nowMs;
      existingSession.currentPage = page || 'home';
      if (title) existingSession.pageTitle = title;
      existingSession.device = effectiveDevice;
      existingSession.browser = browser || existingSession.browser;
      existingSession.os = os || existingSession.os;
      existingSession.pageviewsCount += 1;
    } else {
      activeSessions.set(effectiveVisitorId, {
        visitorId: effectiveVisitorId,
        ipMasked: loc.ipMasked,
        country: loc.country,
        countryCode: loc.countryCode,
        city: loc.city,
        device: effectiveDevice,
        browser: browser || 'Browser',
        os: os || 'OS',
        screen: screen || 'N/A',
        language: language || 'th-TH',
        timezone: timezone || 'Asia/Bangkok',
        currentPage: page || 'home',
        pageTitle: title || page || 'หน้าแรก',
        referrer: referrer || 'Direct',
        firstSeen: nowMs,
        lastPing: nowMs,
        pageviewsCount: 1
      });
    }

    // 3. Clean stale sessions & calculate real active visitors
    const liveSessions = getCleanLiveSessions();
    visitorAnalytics.activeNow = liveSessions.length;
    visitorAnalytics.liveSessions = liveSessions;

    // 4. Daily history rollover check
    const todayStr = new Date().toISOString().split('T')[0];
    if (!Array.isArray(visitorAnalytics.dailyHistory)) {
      visitorAnalytics.dailyHistory = [];
    }
    let todayEntry = visitorAnalytics.dailyHistory.find(d => d.date === todayStr);
    if (!todayEntry) {
      visitorAnalytics.yesterdayPageviews = visitorAnalytics.todayPageviews || 0;
      visitorAnalytics.yesterdayUniqueVisitors = visitorAnalytics.todayUniqueVisitors || 0;
      visitorAnalytics.todayPageviews = 0;
      visitorAnalytics.todayUniqueVisitors = 0;
      todayVisitorsSet.clear();

      todayEntry = { date: todayStr, views: 0, uniques: 0 };
      visitorAnalytics.dailyHistory.push(todayEntry);
      if (visitorAnalytics.dailyHistory.length > 14) {
        visitorAnalytics.dailyHistory = visitorAnalytics.dailyHistory.slice(-14);
      }
    }

    // 5. Increment pageviews
    visitorAnalytics.totalPageviews = (visitorAnalytics.totalPageviews || 0) + 1;
    visitorAnalytics.todayPageviews = (visitorAnalytics.todayPageviews || 0) + 1;
    todayEntry.views = (todayEntry.views || 0) + 1;

    // 6. Unique visitor check
    if (!todayVisitorsSet.has(effectiveVisitorId)) {
      todayVisitorsSet.add(effectiveVisitorId);
      visitorAnalytics.todayUniqueVisitors = (visitorAnalytics.todayUniqueVisitors || 0) + 1;
      visitorAnalytics.totalUniqueVisitors = (visitorAnalytics.totalUniqueVisitors || 0) + 1;
      todayEntry.uniques = (todayEntry.uniques || 0) + 1;
    }

    // 7. Device distribution
    if (!visitorAnalytics.devices) visitorAnalytics.devices = { mobile: 0, desktop: 0, tablet: 0 };
    if (effectiveDevice === 'desktop') visitorAnalytics.devices.desktop++;
    else if (effectiveDevice === 'tablet') visitorAnalytics.devices.tablet++;
    else visitorAnalytics.devices.mobile++;

    // 8. Top Pages
    if (!Array.isArray(visitorAnalytics.topPages)) visitorAnalytics.topPages = [];
    const pageKey = page || 'home';
    const pageObj = visitorAnalytics.topPages.find(p => p.path === pageKey);
    if (pageObj) {
      pageObj.views = (pageObj.views || 0) + 1;
      if (title && title !== pageKey) pageObj.title = title;
    } else {
      visitorAnalytics.topPages.push({ path: pageKey, title: title || pageKey, views: 1 });
    }
    visitorAnalytics.topPages.sort((a, b) => b.views - a.views);

    // 9. Sources
    if (!Array.isArray(visitorAnalytics.sources)) visitorAnalytics.sources = [];
    const srcKey = referrer || 'Direct';
    let srcObj = visitorAnalytics.sources.find(s => s.source.toLowerCase().includes(srcKey.toLowerCase()));
    if (srcObj) {
      srcObj.count = (srcObj.count || 0) + 1;
    } else {
      visitorAnalytics.sources.push({ source: srcKey, count: 1, percentage: 1 });
    }
    const totalSrc = visitorAnalytics.sources.reduce((sum, s) => sum + s.count, 0);
    visitorAnalytics.sources.forEach(s => {
      s.percentage = totalSrc > 0 ? Number(((s.count / totalSrc) * 100).toFixed(1)) : 0;
    });

    // 10. Recent visitors feed
    if (!Array.isArray(visitorAnalytics.recentVisitors)) visitorAnalytics.recentVisitors = [];
    visitorAnalytics.recentVisitors.unshift({
      id: effectiveVisitorId,
      timestamp: new Date().toISOString(),
      device: effectiveDevice,
      browser,
      os,
      country: loc.country,
      city: loc.city,
      page: pageKey,
      referrer: srcKey
    });
    if (visitorAnalytics.recentVisitors.length > 30) {
      visitorAnalytics.recentVisitors = visitorAnalytics.recentVisitors.slice(0, 30);
    }

    visitorAnalytics.lastUpdated = new Date().toISOString();
    persistState('analytics').catch(() => {});

    res.json({
      totalPageviews: visitorAnalytics.totalPageviews,
      totalUniqueVisitors: visitorAnalytics.totalUniqueVisitors,
      todayPageviews: visitorAnalytics.todayPageviews,
      todayUniqueVisitors: visitorAnalytics.todayUniqueVisitors,
      yesterdayPageviews: visitorAnalytics.yesterdayPageviews,
      yesterdayUniqueVisitors: visitorAnalytics.yesterdayUniqueVisitors,
      activeNow: visitorAnalytics.activeNow,
      liveSessions: liveSessions
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error tracking pageview' });
  }
});

app.post('/api/analytics/mode', async (req, res) => {
  try {
    const { isRealModeOnly } = req.body || {};
    visitorAnalytics.isRealModeOnly = Boolean(isRealModeOnly);
    await persistState('analytics');
    res.json({ success: true, isRealModeOnly: visitorAnalytics.isRealModeOnly, visitorAnalytics });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error updating analytics mode' });
  }
});

app.post('/api/analytics/reset', async (req, res) => {
  try {
    const { mode = 'real_zero' } = req.body || {};
    const todayStr = new Date().toISOString().split('T')[0];
    const live = getCleanLiveSessions();

    if (mode === 'baseline') {
      visitorAnalytics = getDefaultVisitorAnalytics();
      visitorAnalytics.activeNow = live.length;
      visitorAnalytics.liveSessions = live;
      visitorAnalytics.isRealModeOnly = false;
    } else {
      // 100% Pure Real Mode from 0
      const currentActiveCount = live.length;
      const initialViews = currentActiveCount > 0 ? currentActiveCount : 1;
      visitorAnalytics = {
        totalPageviews: initialViews,
        totalUniqueVisitors: initialViews,
        todayPageviews: initialViews,
        todayUniqueVisitors: initialViews,
        yesterdayPageviews: 0,
        yesterdayUniqueVisitors: 0,
        activeNow: currentActiveCount,
        isRealModeOnly: true,
        liveSessions: live,
        dailyHistory: [{ date: todayStr, views: initialViews, uniques: initialViews }],
        devices: {
          mobile: live.filter(s => s.device === 'mobile').length,
          desktop: live.filter(s => s.device === 'desktop').length,
          tablet: live.filter(s => s.device === 'tablet').length
        },
        topPages: [{ path: 'home', title: 'หน้าแรก', views: initialViews }],
        sources: [{ source: 'Direct / ค้นหาตรง', count: initialViews, percentage: 100 }],
        recentVisitors: live.map(s => ({
          id: s.visitorId,
          timestamp: s.lastPing,
          device: s.device,
          browser: s.browser,
          os: s.os,
          country: s.country,
          city: s.city,
          page: s.currentPage,
          referrer: s.referrer
        })),
        lastUpdated: new Date().toISOString()
      };
    }

    await persistState('analytics');
    res.json({
      success: true,
      mode,
      message: mode === 'baseline' ? 'รีเซ็ตเป็นสถิติอ้างอิงสำเร็จ' : 'รีเซ็ตเริ่มนับสถิติจริงจาก 0 สำเร็จ',
      visitorAnalytics
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error resetting analytics' });
  }
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
    if (Array.isArray(req.body.suppliers)) {
      suppliers = req.body.suppliers;
      await persistState('suppliers');
      updated = true;
    }

    res.json({ success: true, updated, settings, toursCount: tours.length, bookingsCount: bookings.length, suppliersCount: suppliers.length });
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

// Ticket Image Endpoint - Guarantees valid PNG or JPEG binary response (LINE rejects SVG)
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

  // 2. Query booking details
  const booking = bookings.find(b => b.bookingRef === ref || b.id === ref);

  // 3. If tourImage is an HTTPS JPEG/PNG URL, stream it as binary image
  if (booking?.tourImage && booking.tourImage.startsWith('https://')) {
    try {
      const imgRes = await fetch(booking.tourImage);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(buffer);
      }
    } catch {}
  }

  // 4. Fallback: generate a clean high-res PNG QR Ticket using qrcode
  try {
    const rawHost = liveHostUrl || SITE_URL || 'https://tripseatourphuket.vercel.app';
    const hostUrl = rawHost.startsWith('https://') 
      ? rawHost 
      : (rawHost.startsWith('http://') ? rawHost.replace('http://', 'https://') : `https://${rawHost}`);
    const checkUrl = `${hostUrl}/#lookup?ref=${ref}`;
    const qrBuffer = await QRCode.toBuffer(checkUrl, {
      type: 'png',
      width: 600,
      margin: 3,
      color: { dark: '#0d3b66', light: '#ffffff' }
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(qrBuffer);
  } catch (err) {
    res.status(500).send('Error generating ticket image');
  }
});

// Slip Image Endpoint - Returns real JPEG/PNG binary buffer or 404 (NEVER returns SVG)
app.get(['/api/slip-image', '/api/slip-image/:ref'], async (req, res) => {
  const ref = (req.params.ref || req.query.ref || req.query.bookingRef || '').toString().trim();
  
  const cached = memoryServerImages.get(`slip_${ref}`) || memoryServerImages.get(ref);
  if (cached && cached.data && cached.data.startsWith('data:image')) {
    const base64Data = cached.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', cached.mimeType || 'image/jpeg');
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
      try {
        const imgRes = await fetch(booking.slipUrl);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.end(buffer);
        }
      } catch {}
      return res.redirect(302, booking.slipUrl);
    }
  }

  res.status(404).send('No slip image found for this booking');
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
    `🏨 โรงแรมรับส่ง: ${booking.pickupHotel}${booking.roomNumber ? ` (ห้อง ${booking.roomNumber})` : ''}\n` +
    `👥 จำนวน: ผู้ใหญ่ ${booking.adults} / เด็ก ${booking.children}\n` +
    `📌 สถานะ: ยืนยันเรียบร้อยแล้ว (พร้อมต้อนรับลูกค้า!)`;

  const logItem = await sendLineNotification(lineMsg, booking.bookingRef, 'REMINDER_24H');
  booking.reminderSent = true;
  booking.reminderSentAt = new Date().toISOString();

  res.json({ success: true, logItem, booking });
});

// Ensure any unhandled /api/* route returns clean JSON (never fall through to SPA HTML)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.path}` });
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
