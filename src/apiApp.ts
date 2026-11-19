import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';
import { initialTours, initialBookings, initialReviews, initialCustomers, initialSettings, mockSuppliers } from './data/mockData';
import { normalizeTours } from './utils/tourNormalizer';
import { Tour, Booking, Review, Customer, AppSettings, LineNotificationLog, SalesStats, AdminUser, Supplier, VisitorAnalytics, DailyVisitorPoint, LiveSession } from './types';
import extractTourHandler from './server-handlers/extract-tour-from-image';
import translateTourHandler from './server-handlers/translate-tour';
import {
  fsGetDoc,
  fsSetDoc,
  fsPatchFields,
  fsDeleteDoc,
  fsListCollection,
  fsQueryVisible,
  FIRESTORE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
} from './lib/firestoreRest';
import {
  sanitizeDocId,
  sanitizeTourForFirestore,
  sanitizeBookingForFirestore,
  sanitizeBookingStatusForFirestore,
  sanitizeCustomerForFirestore,
  sanitizeSupplierForFirestore,
  sanitizeReviewForFirestore,
  sanitizePublicConfig,
  sanitizePrivateConfig,
  sanitizePublicMediaForFirestore,
  sanitizeLiveChatForFirestore,
  sanitizeVisitorAnalyticsForFirestore,
} from './lib/firestoreSanitizers';

const app = express();
const SITE_URL = process.env.APP_URL || 'https://tripseatourphuket.vercel.app';
const IS_VERCEL = Boolean(process.env.VERCEL);

// Local Disk Persistence Helpers (disabled on Vercel read-only filesystem)
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (IS_VERCEL) return;
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create data directory:', e);
  }
}

function saveLocalFile(filename: string, data: any) {
  if (IS_VERCEL) return;
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

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('MY_GEMINI_API_KEY')) return null;
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 25000,
      },
    });
  } catch {
    return null;
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Extract live HTTPS host URL from request
let liveHostUrl = SITE_URL;
function getRequestHostUrl(req?: express.Request): string {
  if (req) {
    const forwardedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      return `https://${forwardedHost}`;
    }
  }
  const rawHost = liveHostUrl || SITE_URL || 'https://tripseatourphuket.vercel.app';
  return rawHost.startsWith('https://')
    ? rawHost
    : rawHost.startsWith('http://')
      ? rawHost.replace('http://', 'https://')
      : `https://${rawHost}`;
}

app.use((req, _res, next) => {
  const forwardedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
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

// Authoritative Memory DB State seeded from local files / defaults, immediately synced with Firebase Firestore
let tours: Tour[] = (() => {
  const localSaved = readLocalFile<Tour[] | null>('tours.json', null);
  if (localSaved && Array.isArray(localSaved) && localSaved.length > 0) {
    return normalizeTours(localSaved).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
  }
  return normalizeTours(initialTours).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
})();

let bookings: Booking[] = (() => {
  if (IS_VERCEL) return [];
  const localSaved = readLocalFile<Booking[] | null>('bookings.json', null);
  const source = localSaved && Array.isArray(localSaved) ? localSaved : [];
  return source.filter(b => !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
})();

let reviews: Review[] = (() => {
  if (IS_VERCEL) return [];
  const localSaved = readLocalFile<Review[] | null>('reviews.json', null);
  const source = localSaved && Array.isArray(localSaved) ? localSaved : [...initialReviews];
  return source.filter(r => !deletedReviewIds.has(r.id));
})();

let customers: Customer[] = (() => {
  if (IS_VERCEL) return [];
  const localSaved = readLocalFile<Customer[] | null>('customers.json', null);
  const source = localSaved && Array.isArray(localSaved) ? localSaved : [];
  return source.filter(c => !deletedCustomerIds.has(c.id));
})();

let suppliers: Supplier[] = (() => {
  const localSaved = readLocalFile<Supplier[] | null>('suppliers.json', null);
  const source = localSaved && Array.isArray(localSaved) ? localSaved : [...mockSuppliers];
  return source.filter(s => !deletedSupplierIds.has(s.id));
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
      tablet: 1020,
    },
    topPages: [
      { path: 'home', title: 'หน้าแรก - ทัวร์เกาะพีพี & ทะเลภูเก็ต', views: 15420 },
      { path: 'how-to-book', title: 'วิธีการจอง & นโยบายการชำระเงิน', views: 4280 },
      { path: 'about-me', title: 'เกี่ยวกับเรา & ใบอนุญาต ททท.', views: 2890 },
      { path: 'tour-detail', title: 'รายละเอียดโปรแกรมทัวร์', views: 2260 },
    ],
    sources: [
      { source: 'Direct / ค้นหาตรง', count: 9800, percentage: 39.4 },
      { source: 'Google Search', count: 8200, percentage: 33.0 },
      { source: 'Facebook', count: 3950, percentage: 15.9 },
      { source: 'LINE Official', count: 2100, percentage: 8.5 },
      { source: 'TikTok & Other', count: 800, percentage: 3.2 },
    ],
    recentVisitors: [],
    lastUpdated: new Date().toISOString(),
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
    city: city || (countryCode === 'TH' ? 'Phuket / Bangkok' : undefined),
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
        pageviewsCount: session.pageviewsCount,
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
    lastSeen: new Date().toISOString(),
  },
];

let lineLogs: LineNotificationLog[] = [];

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

let liveChatSessions: LiveChatSession[] = readLocalFile<LiveChatSession[]>('live_chat_sessions.json', []);

// Image Cache API (Memory + Firestore public_media for cross-lambda image delivery to LINE)
const memoryServerImages = new Map<string, { data: string; mimeType: string }>();

async function saveServerImage(key: string, dataUrl: string, mimeType?: string, authToken?: string) {
  const sanitized = sanitizePublicMediaForFirestore(key, dataUrl, mimeType);
  memoryServerImages.set(key, { data: sanitized.data, mimeType: sanitized.mimeType });
  memoryServerImages.set(sanitized.id, { data: sanitized.data, mimeType: sanitized.mimeType });
  await fsSetDoc('public_media', sanitized.id, sanitized, authToken).catch(() => {});
}

async function getServerImage(key: string, authToken?: string): Promise<{ data: string; mimeType: string } | null> {
  const cleanId = sanitizeDocId(key, 'media');
  const mem = memoryServerImages.get(key) || memoryServerImages.get(cleanId);
  if (mem && mem.data) return mem;

  // Fallback to Firestore public_media so different Vercel serverless instances find uploaded slips/tickets
  const remote = await fsGetDoc<any>('public_media', cleanId, authToken);
  if (remote.exists && remote.data && typeof remote.data.data === 'string' && remote.data.data.startsWith('data:image')) {
    const entry = { data: remote.data.data, mimeType: remote.data.mimeType || 'image/jpeg' };
    memoryServerImages.set(key, entry);
    memoryServerImages.set(cleanId, entry);
    return entry;
  }
  return null;
}

// Cloud Firebase Firestore Synchronization State
let isInitialCloudSyncDone = false;
let hasSyncedWithAuthToken = false;
let lastTimestampCheckMs = 0;
let loadedSyncVersion = -1;
let cloudSyncPromise: Promise<void> | null = null;

let syncMetadata = {
  version: 1,
  lastUpdatedAt: {
    tours: new Date().toISOString(),
    bookings: new Date().toISOString(),
    reviews: new Date().toISOString(),
    customers: new Date().toISOString(),
    suppliers: new Date().toISOString(),
    settings: new Date().toISOString(),
  },
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

async function syncStateFromFirestore(forceCheck: boolean = false, authToken?: string) {
  const now = Date.now();
  const hasAuth = Boolean(authToken && authToken.trim());

  // Avoid hammering Firestore on rapid concurrent requests unless forced or admin auth just became available
  if (!forceCheck && isInitialCloudSyncDone && (!hasAuth || hasSyncedWithAuthToken) && now - lastTimestampCheckMs < 4000) {
    return;
  }
  if (cloudSyncPromise) {
    return cloudSyncPromise;
  }

  cloudSyncPromise = (async () => {
    try {
      // 1 single read on metadata/sync to detect changes cleanly without scanning collections
      const syncRes = await fsGetDoc<any>('metadata', 'sync', authToken);
      lastTimestampCheckMs = Date.now();

      const remoteVersion = syncRes.exists && typeof syncRes.data?.version === 'number' ? syncRes.data.version : 1;
      const needsCollectionRefresh =
        !isInitialCloudSyncDone ||
        remoteVersion !== loadedSyncVersion ||
        (hasAuth && !hasSyncedWithAuthToken);

      if (!needsCollectionRefresh) {
        return;
      }

      if (syncRes.exists && syncRes.data) {
        if (syncRes.data.toursAt) syncMetadata.lastUpdatedAt.tours = syncRes.data.toursAt;
        if (syncRes.data.bookingsAt) syncMetadata.lastUpdatedAt.bookings = syncRes.data.bookingsAt;
        if (syncRes.data.reviewsAt) syncMetadata.lastUpdatedAt.reviews = syncRes.data.reviewsAt;
        if (syncRes.data.customersAt) syncMetadata.lastUpdatedAt.customers = syncRes.data.customersAt;
        if (syncRes.data.suppliersAt) syncMetadata.lastUpdatedAt.suppliers = syncRes.data.suppliersAt;
        if (syncRes.data.settingsAt) syncMetadata.lastUpdatedAt.settings = syncRes.data.settingsAt;
        syncMetadata.version = remoteVersion;
      }

      // Fetch tombstones first when admin token is present
      if (hasAuth) {
        const delRes = await fsGetDoc<any>('metadata', 'deleted_ids', authToken);
        if (delRes.exists && delRes.data) {
          const d = delRes.data;
          if (Array.isArray(d.deletedTourIds)) {
            deletedTourIds = new Set([...Array.from(deletedTourIds), ...d.deletedTourIds]);
            saveLocalFile('deleted_tour_ids.json', Array.from(deletedTourIds));
          }
          if (Array.isArray(d.deletedBookingIds)) {
            deletedBookingIds = new Set([...Array.from(deletedBookingIds), ...d.deletedBookingIds]);
            saveLocalFile('deleted_booking_ids.json', Array.from(deletedBookingIds));
          }
          if (Array.isArray(d.deletedCustomerIds)) {
            deletedCustomerIds = new Set([...Array.from(deletedCustomerIds), ...d.deletedCustomerIds]);
            saveLocalFile('deleted_customer_ids.json', Array.from(deletedCustomerIds));
          }
          if (Array.isArray(d.deletedReviewIds)) {
            deletedReviewIds = new Set([...Array.from(deletedReviewIds), ...d.deletedReviewIds]);
            saveLocalFile('deleted_review_ids.json', Array.from(deletedReviewIds));
          }
          if (Array.isArray(d.deletedSupplierIds)) {
            deletedSupplierIds = new Set([...Array.from(deletedSupplierIds), ...d.deletedSupplierIds]);
            saveLocalFile('deleted_supplier_ids.json', Array.from(deletedSupplierIds));
          }
        }
      }

      // Fetch public collections (+ private collections when admin bearer token is present)
      const [toursRes, reviewsRes, pubConfigRes] = await Promise.all([
        hasAuth ? fsListCollection<Tour>('tours', authToken) : fsQueryVisible<Tour>('tours', 'isVisible', true),
        hasAuth ? fsListCollection<Review>('reviews', authToken) : fsQueryVisible<Review>('reviews', 'isApproved', true),
        fsGetDoc<Partial<AppSettings>>('config', 'public', authToken),
      ]);

      if (toursRes.ok && (toursRes.items.length > 0 || deletedTourIds.size > 0)) {
        tours = normalizeTours(toursRes.items).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
        saveLocalFile('tours.json', tours);
      }

      if (reviewsRes.ok && (reviewsRes.items.length > 0 || deletedReviewIds.size > 0)) {
        reviews = reviewsRes.items.filter(r => r && !deletedReviewIds.has(r.id));
        saveLocalFile('reviews.json', reviews);
      }

      if (pubConfigRes.exists && pubConfigRes.data) {
        settings = { ...settings, ...pubConfigRes.data };
        saveLocalFile('settings.json', settings);
      }

      if (hasAuth) {
        const [privConfigRes, bookingsRes, customersRes, suppliersRes, chatRes] = await Promise.all([
          fsGetDoc<Partial<AppSettings>>('config', 'private', authToken),
          fsListCollection<Booking>('bookings', authToken),
          fsListCollection<Customer>('customers', authToken),
          fsListCollection<Supplier>('suppliers', authToken),
          fsListCollection<LiveChatSession>('live_chat_sessions', authToken),
        ]);

        if (privConfigRes.exists && privConfigRes.data) {
          settings = { ...settings, ...privConfigRes.data };
          saveLocalFile('settings.json', settings);
        }
        if (bookingsRes.ok) {
          bookings = bookingsRes.items.filter(b => b && !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
          saveLocalFile('bookings.json', bookings);
        }
        if (customersRes.ok) {
          customers = customersRes.items.filter(c => c && !deletedCustomerIds.has(c.id));
          saveLocalFile('customers.json', customers);
        }
        if (suppliersRes.ok && (suppliersRes.items.length > 0 || deletedSupplierIds.size > 0)) {
          suppliers = suppliersRes.items.filter(s => s && !deletedSupplierIds.has(s.id));
          saveLocalFile('suppliers.json', suppliers);
        }
        if (chatRes.ok && chatRes.items.length > 0) {
          liveChatSessions = chatRes.items;
          saveLocalFile('live_chat_sessions.json', liveChatSessions);
        }
        hasSyncedWithAuthToken = true;
      }

      loadedSyncVersion = remoteVersion;
      isInitialCloudSyncDone = true;
    } catch (err) {
      console.warn('[CloudSync] syncStateFromFirestore error:', err);
    } finally {
      cloudSyncPromise = null;
    }
  })();

  return cloudSyncPromise;
}

interface PersistOptions {
  authToken?: string;
  docItem?: any;
  deleteId?: string;
  deleteRef?: string;
  patchFields?: { id: string; fields: Record<string, any> };
  saveAll?: boolean;
}

async function syncCollectionFull(
  collectionName: string,
  items: any[],
  sanitizer: (item: any) => Record<string, any>,
  authToken?: string
) {
  if (!authToken) return;
  const existingRes = await fsListCollection<any>(collectionName, authToken);
  const sanitizedList = items.map((item) => sanitizer(item));
  const incomingIds = new Set(sanitizedList.map((d) => d.id));

  if (existingRes.ok) {
    const deletePromises = existingRes.items
      .filter((existing) => existing?.id && !incomingIds.has(existing.id))
      .map((existing) => fsDeleteDoc(collectionName, existing.id, authToken));
    await Promise.all(deletePromises);
  }

  await Promise.all(
    sanitizedList.map((docData) => fsSetDoc(collectionName, docData.id, docData, authToken))
  );
}

async function persistDeletedIdsToFirestore(authToken?: string) {
  if (!authToken) return;
  await fsSetDoc(
    'metadata',
    'deleted_ids',
    {
      deletedTourIds: Array.from(deletedTourIds).slice(0, 500),
      deletedBookingIds: Array.from(deletedBookingIds).slice(0, 1000),
      deletedCustomerIds: Array.from(deletedCustomerIds).slice(0, 1000),
      deletedReviewIds: Array.from(deletedReviewIds).slice(0, 500),
      deletedSupplierIds: Array.from(deletedSupplierIds).slice(0, 500),
      updatedAt: new Date().toISOString(),
    },
    authToken
  ).catch(() => {});
}

async function persistSyncMetadataToFirestore(authToken?: string) {
  if (!authToken) return;
  const iso = new Date().toISOString();
  await fsSetDoc(
    'metadata',
    'sync',
    {
      version: syncMetadata.version,
      updatedAt: iso,
      toursAt: syncMetadata.lastUpdatedAt.tours,
      bookingsAt: syncMetadata.lastUpdatedAt.bookings,
      reviewsAt: syncMetadata.lastUpdatedAt.reviews,
      customersAt: syncMetadata.lastUpdatedAt.customers,
      suppliersAt: syncMetadata.lastUpdatedAt.suppliers,
      settingsAt: syncMetadata.lastUpdatedAt.settings,
    },
    authToken
  ).catch(() => {});
  loadedSyncVersion = syncMetadata.version;
}

async function persistState(
  key: 'tours' | 'bookings' | 'settings' | 'reviews' | 'customers' | 'suppliers' | 'analytics',
  opts: PersistOptions = {}
) {
  const { authToken, docItem, deleteId, deleteRef, patchFields, saveAll } = opts;
  updateSyncMetadata(key === 'analytics' ? undefined : key);

  // 1. Save to local disk (skipped safely on Vercel read-only FS)
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

  // 2. Persist permanently to Firebase Firestore REST
  try {
    if (key === 'tours') {
      if (docItem) {
        const sanitized = sanitizeTourForFirestore(docItem);
        await fsSetDoc('tours', sanitized.id, sanitized, authToken);
      } else if (deleteId) {
        await fsDeleteDoc('tours', sanitizeDocId(deleteId, 'tour'), authToken);
        await persistDeletedIdsToFirestore(authToken);
      } else if (saveAll) {
        await syncCollectionFull('tours', tours, sanitizeTourForFirestore, authToken);
        await persistDeletedIdsToFirestore(authToken);
      }
      await persistSyncMetadataToFirestore(authToken);
    } else if (key === 'bookings') {
      if (docItem) {
        const isAdminReq = Boolean(authToken && authToken.trim());
        const sanitized = sanitizeBookingForFirestore(docItem, !isAdminReq);
        const statusDoc = sanitizeBookingStatusForFirestore(docItem, !isAdminReq);
        await Promise.all([
          fsSetDoc('bookings', sanitized.id, sanitized, authToken),
          fsSetDoc('booking_status', statusDoc.bookingRef, statusDoc, authToken),
        ]);
      } else if (patchFields) {
        const cleanId = sanitizeDocId(patchFields.id, 'bk');
        await fsPatchFields('bookings', cleanId, { ...patchFields.fields, updatedAt: new Date().toISOString() }, authToken);
        if (deleteRef && (patchFields.fields.paymentStatus || patchFields.fields.orderStatus)) {
          await fsPatchFields(
            'booking_status',
            sanitizeDocId(deleteRef, 'TST'),
            {
              ...(patchFields.fields.paymentStatus ? { paymentStatus: patchFields.fields.paymentStatus } : {}),
              ...(patchFields.fields.orderStatus ? { orderStatus: patchFields.fields.orderStatus } : {}),
            },
            authToken
          );
        }
      } else if (deleteId) {
        await fsDeleteDoc('bookings', sanitizeDocId(deleteId, 'bk'), authToken);
        if (deleteRef) {
          await fsDeleteDoc('booking_status', sanitizeDocId(deleteRef, 'TST'), authToken);
        }
        await persistDeletedIdsToFirestore(authToken);
      } else if (saveAll) {
        await syncCollectionFull('bookings', bookings, sanitizeBookingForFirestore, authToken);
        await persistDeletedIdsToFirestore(authToken);
      }
      await persistSyncMetadataToFirestore(authToken);
    } else if (key === 'settings') {
      if (authToken) {
        const nowIso = new Date().toISOString();
        await Promise.all([
          fsSetDoc('config', 'public', sanitizePublicConfig(settings, nowIso), authToken),
          fsSetDoc('config', 'private', sanitizePrivateConfig(settings, nowIso), authToken),
        ]);
        await persistSyncMetadataToFirestore(authToken);
      }
    } else if (key === 'reviews') {
      if (docItem) {
        const sanitized = sanitizeReviewForFirestore(docItem);
        await fsSetDoc('reviews', sanitized.id, sanitized, authToken);
      } else if (patchFields) {
        await fsPatchFields('reviews', sanitizeDocId(patchFields.id, 'rev'), patchFields.fields, authToken);
      } else if (deleteId) {
        await fsDeleteDoc('reviews', sanitizeDocId(deleteId, 'rev'), authToken);
        await persistDeletedIdsToFirestore(authToken);
      } else if (saveAll) {
        await syncCollectionFull('reviews', reviews, sanitizeReviewForFirestore, authToken);
        await persistDeletedIdsToFirestore(authToken);
      }
      await persistSyncMetadataToFirestore(authToken);
    } else if (key === 'customers') {
      if (docItem) {
        const sanitized = sanitizeCustomerForFirestore(docItem);
        await fsSetDoc('customers', sanitized.id, sanitized, authToken);
      } else if (patchFields) {
        await fsPatchFields('customers', sanitizeDocId(patchFields.id, 'cust'), patchFields.fields, authToken);
      } else if (deleteId) {
        await fsDeleteDoc('customers', sanitizeDocId(deleteId, 'cust'), authToken);
        await persistDeletedIdsToFirestore(authToken);
      } else if (saveAll) {
        await syncCollectionFull('customers', customers, sanitizeCustomerForFirestore, authToken);
        await persistDeletedIdsToFirestore(authToken);
      }
      await persistSyncMetadataToFirestore(authToken);
    } else if (key === 'suppliers') {
      if (docItem) {
        const sanitized = sanitizeSupplierForFirestore(docItem);
        await fsSetDoc('suppliers', sanitized.id, sanitized, authToken);
      } else if (patchFields) {
        await fsPatchFields('suppliers', sanitizeDocId(patchFields.id, 'sup'), patchFields.fields, authToken);
      } else if (deleteId) {
        await fsDeleteDoc('suppliers', sanitizeDocId(deleteId, 'sup'), authToken);
        await persistDeletedIdsToFirestore(authToken);
      } else if (saveAll) {
        await syncCollectionFull('suppliers', suppliers, sanitizeSupplierForFirestore, authToken);
        await persistDeletedIdsToFirestore(authToken);
      }
      await persistSyncMetadataToFirestore(authToken);
    } else if (key === 'analytics') {
      fsSetDoc('metadata', 'visitor_analytics', sanitizeVisitorAnalyticsForFirestore(visitorAnalytics)).catch(() => {});
    }
  } catch (cloudErr) {
    console.warn(`Firestore persistState error for ${key}:`, cloudErr);
  }
}

// Middleware: Sync cloud state before handling API requests
app.use('/api', async (req, _res, next) => {
  const skipPaths = ['/analytics/ping', '/ticket-image', '/slip-image'];
  const shouldSkip = skipPaths.some((p) => req.path.startsWith(p));
  if (!shouldSkip) {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const force = req.path === '/sync-status' || req.path === '/bookings' || req.path === '/tours';
    await syncStateFromFirestore(force, authToken);
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
  slipImageUrl?: string,
  overrideHostUrl?: string,
  overrideToken?: string,
  overrideTargetId?: string
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
        timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
  };

  const tokenCandidate = (overrideToken && !overrideToken.startsWith('SIMULATED'))
    ? overrideToken.trim()
    : (
        process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() ||
        process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?.trim() ||
        settings.lineMessagingChannelAccessToken?.trim()
      );
  const channelToken = (tokenCandidate && tokenCandidate.length > 0 && !tokenCandidate.startsWith('SIMULATED'))
    ? tokenCandidate
    : initialSettings.lineMessagingChannelAccessToken;

  const targetCandidate =
    overrideTargetId?.trim() ||
    process.env.LINE_USER_ID?.trim() ||
    process.env.LINE_MESSAGING_USER_ID?.trim() ||
    settings.lineMessagingUserId?.trim();
  const targetId = (targetCandidate && targetCandidate.length > 0)
    ? targetCandidate
    : initialSettings.lineMessagingUserId;

  if (channelToken && !channelToken.startsWith('SIMULATED')) {
    try {
      const messagesPayload: any[] = [];
      const hostUrl = overrideHostUrl || getRequestHostUrl();
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
          effectiveSlipUrl = `${hostUrl}/api/slip-image?ref=${encodeURIComponent(bookingRef)}`;
        }
      }

      if (effectiveSlipUrl) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: effectiveSlipUrl,
          previewImageUrl: effectiveSlipUrl,
        });
      }

      // 2. Ticket Voucher / Tour Image (High-res photo of tour or QR ticket)
      let effectiveTicketUrl: string | null = null;
      if (ticketImageUrl && ticketImageUrl.startsWith('https://') && !ticketImageUrl.includes('localhost')) {
        effectiveTicketUrl = ticketImageUrl;
      } else if (imageUrl && imageUrl.startsWith('https://') && !imageUrl.includes('localhost')) {
        effectiveTicketUrl = imageUrl;
      } else if (booking?.tourImage && booking.tourImage.startsWith('https://') && !booking.tourImage.includes('localhost')) {
        effectiveTicketUrl = booking.tourImage;
      } else if (bookingRef && bookingRef.startsWith('TST-')) {
        effectiveTicketUrl = `${hostUrl}/api/ticket-image?ref=${encodeURIComponent(bookingRef)}`;
      }

      if (effectiveTicketUrl) {
        messagesPayload.push({
          type: 'image',
          originalContentUrl: effectiveTicketUrl,
          previewImageUrl: effectiveTicketUrl,
        });
      }

      // 3. Detailed Text Message
      messagesPayload.push({
        type: 'text',
        text: message,
      });

      const boundedPayload = messagesPayload.slice(0, 5);

      const endpoint = targetId && targetId.trim().length > 0
        ? 'https://api.line.me/v2/bot/message/push'
        : 'https://api.line.me/v2/bot/message/broadcast';

      const bodyPayload = targetId && targetId.trim().length > 0
        ? { to: targetId.trim(), messages: boundedPayload }
        : { messages: boundedPayload };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channelToken.trim()}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      if (response.ok) {
        logItem.status = 'sent';
      } else {
        const errorText = await response.text();
        console.error('LINE Messaging API Error:', response.status, errorText);

        // Fallback to text-only push if image URL was rejected
        try {
          const fallbackRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${channelToken.trim()}`,
            },
            body: JSON.stringify(
              targetId && targetId.trim().length > 0
                ? { to: targetId.trim(), messages: [{ type: 'text', text: message }] }
                : { messages: [{ type: 'text', text: message }] }
            ),
          });
          if (fallbackRes.ok) {
            logItem.status = 'sent';
          } else {
            logItem.status = 'failed';
            logItem.message = `${logItem.message} ❌ (Error ${response.status}: ${errorText})`;
          }
        } catch {
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
export async function checkAndSend24hReminders(authToken?: string) {
  await syncStateFromFirestore(false, authToken);
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
        await persistState('bookings', {
          authToken,
          patchFields: {
            id: booking.id,
            fields: {
              reminderSent: true,
              reminderSentAt: booking.reminderSentAt,
            },
          },
        });
      }
    }
  }

  return { sentCount, sentBookings };
}

// API ROUTES
app.get('/api/sync-status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    version: syncMetadata.version,
    lastUpdatedAt: syncMetadata.lastUpdatedAt,
  });
});

// --- Tours ---
app.get('/api/tours', (_req, res) => {
  const activeTours = tours.filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
  res.json(normalizeTours(activeTours));
});

app.get('/api/tours/deleted-ids', (_req, res) => {
  res.json({ deletedTourIds: Array.from(deletedTourIds) });
});

app.get('/api/deleted-ids', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    deletedTourIds: Array.from(deletedTourIds),
    deletedBookingIds: Array.from(deletedBookingIds),
    deletedCustomerIds: Array.from(deletedCustomerIds),
    deletedReviewIds: Array.from(deletedReviewIds),
    deletedSupplierIds: Array.from(deletedSupplierIds),
  });
});

app.post('/api/tours', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const tourId = req.body.id || `tour-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newTour: Tour = {
    ...req.body,
    id: tourId,
    slug: req.body.slug || tourId,
  };

  deletedTourIds.delete(newTour.id);
  if (newTour.slug) deletedTourIds.delete(newTour.slug);

  const existingIdx = tours.findIndex(t => t.id === newTour.id || (t.title?.TH && t.title.TH === newTour.title?.TH));
  if (existingIdx !== -1) {
    tours[existingIdx] = { ...tours[existingIdx], ...newTour };
  } else {
    tours.unshift(newTour);
  }

  tours = normalizeTours(tours).filter(t => !deletedTourIds.has(t.id));
  const savedTour = tours.find(t => t.id === newTour.id) || newTour;
  await persistState('tours', { authToken, docItem: savedTour });
  res.json({ ...savedTour, version: syncMetadata.version });
});

app.put('/api/tours/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const index = tours.findIndex(t => t.id === id);
  if (index !== -1) {
    tours[index] = { ...tours[index], ...req.body };
    tours = normalizeTours(tours).filter(t => !deletedTourIds.has(t.id) && !deletedTourIds.has(t.slug));
    const updatedTour = tours.find(t => t.id === id) || tours[index];
    await persistState('tours', { authToken, docItem: updatedTour });
    res.json({ ...updatedTour, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Tour not found' });
  }
});

app.delete('/api/tours/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const target = tours.find(t => t.id === id || t.slug === id);
  deletedTourIds.add(id);
  if (target?.id) deletedTourIds.add(target.id);
  if (target?.slug) deletedTourIds.add(target.slug);

  tours = tours.filter(t => t.id !== id && t.slug !== id && !deletedTourIds.has(t.id));
  await persistState('tours', { authToken, deleteId: target?.id || id });

  res.json({
    success: true,
    id,
    deletedTourIds: Array.from(deletedTourIds),
    version: syncMetadata.version,
  });
});

app.post('/api/tours/save-all', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const incomingTours = req.body?.tours || req.body;
    if (!Array.isArray(incomingTours)) {
      return res.status(400).json({ error: 'tours payload must be an array' });
    }

    incomingTours.forEach((t: any) => {
      if (t.id) deletedTourIds.delete(t.id);
      if (t.slug) deletedTourIds.delete(t.slug);
    });

    tours = normalizeTours(incomingTours);
    await persistState('tours', { authToken, saveAll: true });
    res.json({
      success: true,
      count: tours.length,
      tours,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.tours,
    });
  } catch (err: any) {
    console.error('Save all tours error:', err);
    res.status(500).json({ error: err?.message || 'Failed to save all tours' });
  }
});

app.post('/api/tours/reset-default', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    deletedTourIds.clear();
    tours = normalizeTours([...initialTours]);
    await persistState('tours', { authToken, saveAll: true });
    res.json({
      success: true,
      count: tours.length,
      tours,
      deletedTourIds: [],
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.tours,
    });
  } catch (err: any) {
    console.error('Reset tours error:', err);
    res.status(500).json({ error: err?.message || 'Failed to reset tours' });
  }
});

// --- Suppliers API ---
app.get('/api/suppliers', (_req, res) => {
  const activeSuppliers = suppliers.filter(s => !deletedSupplierIds.has(s.id));
  res.json(activeSuppliers);
});

app.post('/api/suppliers', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
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
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0],
  };

  deletedSupplierIds.delete(newSup.id);
  const existingIdx = suppliers.findIndex(s => s.id === newSup.id || (s.code && s.code === newSup.code));
  if (existingIdx !== -1) {
    suppliers[existingIdx] = { ...suppliers[existingIdx], ...newSup };
  } else {
    suppliers.unshift(newSup);
  }

  suppliers = suppliers.filter(s => !deletedSupplierIds.has(s.id));
  const savedSup = existingIdx !== -1 ? suppliers[existingIdx] : newSup;
  await persistState('suppliers', { authToken, docItem: savedSup });
  res.json({ ...savedSup, version: syncMetadata.version });
});

app.put('/api/suppliers/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const index = suppliers.findIndex(s => s.id === id);
  if (index !== -1) {
    suppliers[index] = { ...suppliers[index], ...req.body };
    suppliers = suppliers.filter(s => !deletedSupplierIds.has(s.id));
    await persistState('suppliers', { authToken, docItem: suppliers[index] });
    res.json({ ...suppliers[index], version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Supplier not found' });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  deletedSupplierIds.add(id);
  suppliers = suppliers.filter(s => s.id !== id && !deletedSupplierIds.has(s.id));
  await persistState('suppliers', { authToken, deleteId: id });
  res.json({
    success: true,
    id,
    deletedSupplierIds: Array.from(deletedSupplierIds),
    version: syncMetadata.version,
  });
});

app.post('/api/suppliers/save-all', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const incoming = req.body?.suppliers || req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'suppliers payload must be an array' });
    }
    suppliers = incoming.filter((s: Supplier) => !deletedSupplierIds.has(s.id));
    await persistState('suppliers', { authToken, saveAll: true });
    res.json({
      success: true,
      count: suppliers.length,
      suppliers,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.suppliers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save all suppliers' });
  }
});

app.post('/api/bookings/save-all', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const incoming = req.body?.bookings || req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'bookings payload must be an array' });
    }
    bookings = incoming.filter((b: Booking) => b && !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
    await persistState('bookings', { authToken, saveAll: true });
    res.json({
      success: true,
      count: bookings.length,
      bookings,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.bookings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save all bookings' });
  }
});

// --- Universal Full-System Backup & Restore ---
app.get('/api/backup/full-export', (_req, res) => {
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
      reviews: reviews.length,
    },
    data: {
      tours,
      suppliers,
      customers,
      bookings,
      reviews,
      settings,
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tripseatour_full_backup_${timestamp.split('T')[0]}.json"`);
  res.json(backupBundle);
});

app.post('/api/backup/full-import', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const bundle = req.body?.data || req.body;
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({ error: 'Invalid backup bundle format' });
    }

    const restoredCounts: Record<string, number> = {};

    if (Array.isArray(bundle.tours)) {
      bundle.tours.forEach((t: any) => {
        if (t.id) deletedTourIds.delete(t.id);
        if (t.slug) deletedTourIds.delete(t.slug);
      });
      tours = normalizeTours(bundle.tours);
      await persistState('tours', { authToken, saveAll: true });
      restoredCounts.tours = tours.length;
    }

    if (Array.isArray(bundle.suppliers)) {
      suppliers = bundle.suppliers;
      await persistState('suppliers', { authToken, saveAll: true });
      restoredCounts.suppliers = suppliers.length;
    }

    if (Array.isArray(bundle.customers)) {
      customers = bundle.customers;
      await persistState('customers', { authToken, saveAll: true });
      restoredCounts.customers = customers.length;
    }

    if (Array.isArray(bundle.bookings)) {
      bookings = bundle.bookings;
      await persistState('bookings', { authToken, saveAll: true });
      restoredCounts.bookings = bookings.length;
    }

    if (Array.isArray(bundle.reviews)) {
      reviews = bundle.reviews;
      await persistState('reviews', { authToken, saveAll: true });
      restoredCounts.reviews = reviews.length;
    }

    if (bundle.settings && typeof bundle.settings === 'object' && bundle.settings.promptPayId) {
      settings = { ...settings, ...bundle.settings };
      await persistState('settings', { authToken });
      restoredCounts.settings = 1;
    }

    res.json({
      success: true,
      message: 'กู้คืนข้อมูลสำรองทั้งระบบเรียบร้อยแล้ว',
      restoredCounts,
      version: syncMetadata.version,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to restore full backup' });
  }
});

// AI endpoints
app.all('/api/translate-tour', async (req, res) => translateTourHandler(req, res));
app.all('/api/extract-tour-from-image', async (req, res) => extractTourHandler(req, res));

// --- Bookings ---
app.get('/api/bookings', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const activeBookings = bookings.filter(b => !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
  res.json(activeBookings);
});

app.get('/api/bookings/lookup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const rawQuery = String(req.query.q || '').trim();
  if (!rawQuery) return res.json([]);

  const lowerQ = rawQuery.toLowerCase();
  const cleanPhoneQ = lowerQ.replace(/[^a-z0-9]/g, '');

  const localMatched = bookings.filter((b) => {
    if (deletedBookingIds.has(b.id) || deletedBookingIds.has(b.bookingRef)) return false;
    const bRef = (b.bookingRef || '').toLowerCase();
    const bPhoneClean = (b.customerPhone || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const bEmail = (b.customerEmail || '').toLowerCase();
    const bName = (b.customerName || '').toLowerCase();
    const bLine = (b.customerLineId || '').toLowerCase();
    return (
      (cleanPhoneQ.length >= 3 && bPhoneClean.includes(cleanPhoneQ)) ||
      bRef.includes(lowerQ) ||
      bEmail.includes(lowerQ) ||
      bName.includes(lowerQ) ||
      (bLine && bLine.includes(lowerQ))
    );
  });

  if (localMatched.length > 0) {
    return res.json(localMatched);
  }

  // Fallback to Firestore non-PII booking_status collection by exact bookingRef
  const cleanRef = rawQuery.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  if (cleanRef) {
    const statusRes = await fsGetDoc<any>('booking_status', cleanRef);
    if (statusRes.exists && statusRes.data) {
      return res.json([
        {
          id: cleanRef,
          bookingRef: statusRes.data.bookingRef || cleanRef,
          tourId: '',
          tourTitle: statusRes.data.tourTitle || 'ทัวร์ภูเก็ต',
          customerName: 'Booking Reference Verified',
          customerEmail: '',
          customerPhone: '-',
          travelDate: statusRes.data.travelDate || '',
          pickupHotel: '-',
          pickupZone: statusRes.data.pickupZone || 'General Zone',
          adults: Number(statusRes.data.adults) || 1,
          children: Number(statusRes.data.children) || 0,
          infants: Number(statusRes.data.infants) || 0,
          totalAmount: Number(statusRes.data.totalAmount) || 0,
          paymentMethod: 'promptpay',
          paymentStatus: statusRes.data.paymentStatus || 'pending',
          orderStatus: statusRes.data.orderStatus || 'pending',
          createdAt: statusRes.data.createdAt || new Date().toISOString(),
        },
      ]);
    }
  }

  res.json([]);
});

app.post('/api/bookings', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const {
    tourId, customerName, customerEmail, customerPhone, customerLineId,
    nationality, travelDate, pickupHotel, pickupZone, pickupZoneFee, roomNumber, specialRequests,
    adults, children, infants, totalAmount, slipUrl, paymentStatus, isForeigner, selectedAddons,
  } = req.body;

  const tour = tours.find(t => t.id === tourId);
  const refNum = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = req.body.bookingRef || `TST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${refNum}`;

  const hasSlip = Boolean(slipUrl && slipUrl.trim().length > 0);

  const newBooking: Booking = {
    id: req.body.id || `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingRef,
    tourId,
    tourTitle: req.body.tourTitle || (tour ? tour.title.TH : 'ทัวร์ภูเก็ต'),
    tourImage: req.body.tourImage || (tour && tour.images.length ? tour.images[0] : ''),
    customerName,
    customerEmail,
    customerPhone,
    customerLineId,
    nationality: nationality || 'Thai',
    isForeigner,
    selectedAddons,
    travelDate,
    pickupHotel,
    pickupZone: pickupZone || 'General Zone',
    pickupZoneFee,
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
    lineNotifySent: false,
  };

  deletedBookingIds.delete(newBooking.id);
  deletedBookingIds.delete(bookingRef);
  bookings.unshift(newBooking);

  // Cache slip image in memory AND Firestore public_media BEFORE sending LINE so LINE crawler can fetch from any Vercel lambda!
  if (hasSlip && slipUrl) {
    const mimeMatch = slipUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    await Promise.all([
      saveServerImage(`slip_${bookingRef}`, slipUrl, mimeType, authToken),
      saveServerImage(`slip_${newBooking.id}`, slipUrl, mimeType, authToken),
    ]);
  }

  // Update Customer CRM
  let targetCustomer: Customer;
  const custIndex = customers.findIndex(c => (customerEmail && c.email === customerEmail) || (customerPhone && c.phone === customerPhone));
  if (custIndex !== -1) {
    customers[custIndex].totalBookings += 1;
    customers[custIndex].totalSpent += newBooking.totalAmount;
    customers[custIndex].lastBookingDate = new Date().toISOString().split('T')[0];
    targetCustomer = customers[custIndex];
  } else {
    targetCustomer = {
      id: `cust-${Date.now()}`,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      lineId: customerLineId,
      nationality: nationality || 'Thai',
      totalBookings: 1,
      totalSpent: newBooking.totalAmount,
      lastBookingDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
    };
    customers.unshift(targetCustomer);
  }

  // Persist booking (+ booking_status + customer if admin) before sending LINE
  await Promise.all([
    persistState('bookings', { authToken, docItem: newBooking }),
    authToken ? persistState('customers', { authToken, docItem: targetCustomer }) : persistState('customers'),
  ]);

  const hostUrl = getRequestHostUrl(req);
  const lineMsg = `🔔 [มีคำสั่งจองใหม่${hasSlip ? ' (แนบสลิปแล้ว)' : ''}!] ${bookingRef}\n` +
    `📍 ทัวร์: ${newBooking.tourTitle}\n` +
    `👤 ลูกค้า: ${customerName} (${customerPhone})\n` +
    `📅 วันเดินทาง: ${travelDate}\n` +
    `🏨 โรงแรม: ${pickupHotel}${roomNumber ? ` (ห้อง ${roomNumber})` : ''} (โซน: ${pickupZone || 'ทั่วไป'})\n` +
    `👥 จำนวน: ผู้ใหญ่ ${adults} ท่าน / เด็ก ${children} ท่าน\n` +
    `💰 ยอดรวม: ฿${Number(totalAmount || 0).toLocaleString()} (PromptPay QR)\n` +
    `📄 สลิปโอนเงิน: ${hasSlip ? 'แนบสลิปเรียบร้อย (ดูรูปด้านบน)' : 'ยังไม่แนบสลิป'}\n` +
    `🌐 เว็บไซต์: ${hostUrl}`;

  const lineResult = await sendLineNotification(
    lineMsg,
    bookingRef,
    'NEW_ORDER',
    newBooking.tourImage,
    newBooking.tourImage,
    hasSlip ? `${hostUrl}/api/slip-image?ref=${encodeURIComponent(bookingRef)}` : undefined,
    hostUrl
  );
  newBooking.lineNotifySent = lineResult.status === 'sent';
  if (authToken) {
    await persistState('bookings', {
      authToken,
      patchFields: { id: newBooking.id, fields: { lineNotifySent: newBooking.lineNotifySent } },
    });
  } else {
    saveLocalFile('bookings.json', bookings);
  }

  res.json({ ...newBooking, version: syncMetadata.version });
});

app.post('/api/bookings/:id/upload-slip', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { slipUrl } = req.body;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (slipUrl) {
    const mimeMatch = slipUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    await Promise.all([
      saveServerImage(`slip_${booking.bookingRef}`, slipUrl, mimeType, authToken),
      saveServerImage(`slip_${booking.id}`, slipUrl, mimeType, authToken),
    ]);
  }

  const wasAlreadySlipUploaded = booking.paymentStatus === 'slip_uploaded' && Boolean(booking.slipUrl);
  booking.slipUrl = slipUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80';
  booking.paymentStatus = 'slip_uploaded';
  booking.slipUploadedAt = new Date().toISOString();

  await persistState('bookings', {
    authToken,
    deleteRef: booking.bookingRef,
    patchFields: {
      id: booking.id,
      fields: {
        slipUrl: booking.slipUrl.slice(0, 840000),
        slipUploadedAt: booking.slipUploadedAt,
        paymentStatus: 'slip_uploaded',
      },
    },
  });

  if (!wasAlreadySlipUploaded && !booking.lineNotifySent) {
    const hostUrl = getRequestHostUrl(req);
    const msg = `📄 [สลิปแจ้งชำระเงิน] ${booking.bookingRef}\n` +
      `👤 ${booking.customerName} อัปโหลดสลิปเรียบร้อยแล้ว\n` +
      `💰 ยอดชำระ: ฿${booking.totalAmount.toLocaleString()}\n` +
      `🌐 ตรวจสอบที่: ${hostUrl}`;

    const lineResult = await sendLineNotification(
      msg,
      booking.bookingRef,
      'NEW_ORDER',
      booking.tourImage,
      booking.tourImage,
      `${hostUrl}/api/slip-image?ref=${encodeURIComponent(booking.bookingRef)}`,
      hostUrl
    );
    booking.lineNotifySent = lineResult.status === 'sent';
    if (authToken) {
      await persistState('bookings', {
        authToken,
        patchFields: { id: booking.id, fields: { lineNotifySent: booking.lineNotifySent } },
      });
    } else {
      saveLocalFile('bookings.json', bookings);
    }
  }

  res.json({ ...booking, version: syncMetadata.version });
});

app.put('/api/bookings/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { supplierId, supplierName, paymentStatus, orderStatus } = req.body;
  const patch: Record<string, any> = {};
  if (supplierId !== undefined) {
    booking.supplierId = supplierId ? supplierId : undefined;
    patch.supplierId = supplierId || '';
  }
  if (supplierName !== undefined) {
    booking.supplierName = supplierName ? supplierName : undefined;
    patch.supplierName = supplierName || '';
  }
  if (paymentStatus) {
    booking.paymentStatus = paymentStatus;
    patch.paymentStatus = paymentStatus;
  }
  if (orderStatus) {
    booking.orderStatus = orderStatus;
    patch.orderStatus = orderStatus;
  }

  await persistState('bookings', {
    authToken,
    deleteRef: booking.bookingRef,
    patchFields: { id: booking.id, fields: patch },
  });
  res.json({ ...booking, version: syncMetadata.version });
});

app.put('/api/bookings/:id/status', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { paymentStatus, orderStatus } = req.body;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (paymentStatus) booking.paymentStatus = paymentStatus;
  if (orderStatus) booking.orderStatus = orderStatus;

  const patch: Record<string, any> = {
    paymentStatus: booking.paymentStatus,
    orderStatus: booking.orderStatus,
  };

  if (paymentStatus === 'verified') {
    booking.paidAt = new Date().toISOString();
    booking.orderStatus = 'confirmed';
    patch.paidAt = booking.paidAt;
    patch.orderStatus = 'confirmed';
  }

  await persistState('bookings', {
    authToken,
    deleteRef: booking.bookingRef,
    patchFields: { id: booking.id, fields: patch },
  });
  res.json({ ...booking, version: syncMetadata.version });
});

app.delete('/api/bookings/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const target = bookings.find(b => b.id === id || b.bookingRef === id);
  deletedBookingIds.add(id);
  if (target?.id) deletedBookingIds.add(target.id);
  if (target?.bookingRef) deletedBookingIds.add(target.bookingRef);
  bookings = bookings.filter(b => b.id !== id && b.bookingRef !== id && !deletedBookingIds.has(b.id) && !deletedBookingIds.has(b.bookingRef));
  await persistState('bookings', {
    authToken,
    deleteId: target?.id || id,
    deleteRef: target?.bookingRef || id,
  });
  res.json({
    success: true,
    id,
    deletedBookingIds: Array.from(deletedBookingIds),
    version: syncMetadata.version,
    message: 'Deleted booking successfully',
  });
});

app.get(
  ['/api/admin/firestore-status', '/api/firestore-status'],
  async (req, res) => {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const [syncCheck, pubCheck] = await Promise.all([
      fsGetDoc('metadata', 'sync', authToken),
      fsGetDoc('config', 'public', authToken),
    ]);
    const reachable = syncCheck.status === 200 || syncCheck.status === 404 || pubCheck.status === 200 || pubCheck.status === 404;
    res.json({
      connected: reachable,
      projectId: FIRESTORE_PROJECT_ID,
      databaseId: FIRESTORE_DATABASE_ID,
      url: `https://console.firebase.google.com/project/${FIRESTORE_PROJECT_ID}/firestore`,
      storageType: 'Firebase Firestore Cloud Database',
      keysFound: [
        tours.length > 0 ? 'tours' : null,
        bookings.length > 0 ? 'bookings' : null,
        reviews.length > 0 ? 'reviews' : null,
        customers.length > 0 ? 'customers' : null,
        suppliers.length > 0 ? 'suppliers' : null,
        'config',
      ].filter(Boolean),
    });
  }
);

app.post('/api/admin/clean-deleted-data', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    await Promise.all([
      persistState('tours', { authToken, saveAll: true }),
      persistState('bookings', { authToken, saveAll: true }),
      persistState('reviews', { authToken, saveAll: true }),
      persistState('customers', { authToken, saveAll: true }),
      persistState('suppliers', { authToken, saveAll: true }),
      persistState('settings', { authToken }),
    ]);
    res.json({ success: true, message: 'ล้างข้อมูลเก่าที่ลบไปแล้วเรียบร้อยแล้ว' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clean data', details: err?.message });
  }
});

app.post('/api/admin/backup-database', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    await Promise.all([
      persistState('tours', { authToken, saveAll: true }),
      persistState('bookings', { authToken, saveAll: true }),
      persistState('reviews', { authToken, saveAll: true }),
      persistState('customers', { authToken, saveAll: true }),
      persistState('suppliers', { authToken, saveAll: true }),
      persistState('settings', { authToken }),
    ]);

    res.json({
      success: true,
      message: 'สำรองข้อมูลลงฐานข้อมูล Cloud (Firebase Firestore) เรียบร้อยแล้ว',
      backupTime: new Date().toISOString(),
      counts: {
        tours: tours.length,
        bookings: bookings.length,
        reviews: reviews.length,
        customers: customers.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสำรองข้อมูล',
      details: err?.message || 'Unknown error',
    });
  }
});

// --- Reviews Management API ---
app.get('/api/reviews', (_req, res) => {
  const activeReviews = reviews.filter(r => !deletedReviewIds.has(r.id));
  res.json(activeReviews);
});

app.post('/api/reviews', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { tourId, userName, rating, comment, nationality, photo, photos } = req.body;
  const photoList = Array.isArray(photos) && photos.length > 0
    ? photos
    : photo
      ? [photo]
      : undefined;

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
    isApproved: true,
  };
  reviews.unshift(newRev);

  const tour = tours.find(t => t.id === newRev.tourId);
  if (tour) {
    const tourRevs = reviews.filter(r => r.tourId === newRev.tourId);
    const avg = tourRevs.reduce((acc, curr) => acc + curr.rating, 0) / tourRevs.length;
    tour.rating = Number(avg.toFixed(2));
    tour.reviewCount = tourRevs.length;
    if (authToken) {
      await persistState('tours', {
        authToken,
        patchFields: { id: tour.id, fields: { rating: tour.rating, reviewCount: tour.reviewCount } },
      });
    } else {
      saveLocalFile('tours.json', tours);
    }
  }

  await persistState('reviews', { authToken, docItem: newRev });
  res.json({ ...newRev, version: syncMetadata.version });
});

app.post('/api/reviews/save-all', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const incoming = req.body?.reviews || req.body;
  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: 'reviews payload must be an array' });
  }
  reviews = incoming.filter((r: Review) => !deletedReviewIds.has(r.id));
  await persistState('reviews', { authToken, saveAll: true });
  res.json({ success: true, count: reviews.length, reviews, version: syncMetadata.version });
});

app.put('/api/reviews/:id/reply', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { reply } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    rev.adminReply = reply;
    rev.adminReplyDate = new Date().toISOString().split('T')[0];
    await persistState('reviews', {
      authToken,
      patchFields: { id: rev.id, fields: { adminReply: rev.adminReply, adminReplyDate: rev.adminReplyDate } },
    });
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.post('/api/reviews/:id/reply', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { reply } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    rev.adminReply = reply;
    rev.adminReplyDate = new Date().toISOString().split('T')[0];
    await persistState('reviews', {
      authToken,
      patchFields: { id: rev.id, fields: { adminReply: rev.adminReply, adminReplyDate: rev.adminReplyDate } },
    });
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.put('/api/reviews/:id/status', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { isApproved } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    rev.isApproved = isApproved !== undefined ? isApproved : !rev.isApproved;
    await persistState('reviews', {
      authToken,
      patchFields: { id: rev.id, fields: { isApproved: rev.isApproved } },
    });
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.put('/api/reviews/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { photos, comment, userName, rating } = req.body;
  const rev = reviews.find(r => r.id === id);
  if (rev) {
    const patch: Record<string, any> = {};
    if (photos !== undefined) {
      rev.photos = Array.isArray(photos) ? photos : photos ? [photos] : [];
      patch.photos = rev.photos;
    }
    if (comment !== undefined) {
      rev.comment = comment;
      patch.comment = comment;
    }
    if (userName !== undefined) {
      rev.userName = userName;
      patch.userName = userName;
    }
    if (rating !== undefined) {
      rev.rating = Number(rating) || rev.rating;
      patch.rating = rev.rating;
    }

    await persistState('reviews', { authToken, patchFields: { id: rev.id, fields: patch } });
    res.json({ ...rev, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  deletedReviewIds.add(id);
  reviews = reviews.filter(r => r.id !== id && !deletedReviewIds.has(r.id));
  await persistState('reviews', { authToken, deleteId: id });
  res.json({
    success: true,
    id,
    deletedReviewIds: Array.from(deletedReviewIds),
    version: syncMetadata.version,
    message: 'Review deleted successfully',
  });
});

// --- AI Review Reply Generator ---
app.post('/api/ai/reply-review', async (req, res) => {
  try {
    const { reviewComment, rating, customerName, tourTitle } = req.body;
    const aiClient = getAiClient();

    if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are the official management team of "Trip Sea Tour Phuket" (ทริปซีทัวร์ ภูเก็ต - TAT License 33/11100).
Generate a warm, professional, polite, and personalized Thai reply to this customer review:
Customer Name: ${customerName || 'ลูกค้าท่านสำคัญ'}
Tour: ${tourTitle || 'ทัวร์ภูเก็ต'}
Rating: ${rating || 5}/5 Stars
Review: "${reviewComment || 'บริการดีมาก ประทับใจมากครับ'}"

Requirements:
- Polite Thai language using formal yet friendly tone (ค่ะ/ครับ)
- Express sincere appreciation for their patronage
- Keep response length concise and natural (2-4 sentences). Do not include quotes or prefixes.`,
      });

      const reply = response.text?.trim() || `ขอบพระคุณคุณ ${customerName || 'ลูกค้า'} เป็นอย่างสูงที่ไว้วางใจเลือกเดินทางกับ Trip Sea Tour Phuket ค่ะ ทางทีมงานยินดีเป็นอย่างยิ่งที่ได้มอบความประทับใจ และหวังว่าจะมีโอกาสได้ต้อนรับท่านอีกครั้งในทริปหน้านะคะ! 🌊🙏`;
      return res.json({ reply });
    }
    return res.json({
      reply: `ขอบพระคุณคุณ ${customerName || 'ลูกค้า'} เป็นอย่างสูงที่เลือกใช้บริการ Trip Sea Tour Phuket และมอบคะแนน ${rating || 5} ดาวให้พวกเราค่ะ ทางทีมงานรู้สึกยินดีและเป็นเกียรติอย่างยิ่งที่ได้ดูแล หวังว่าจะได้ต้อนรับท่านอีกในโอกาสต่อไปนะคะ! 🌊🙏`,
    });
  } catch {
    res.json({
      reply: `ขอบพระคุณคุณ ${req.body?.customerName || 'ลูกค้า'} มากค่ะที่ไว้วางใจและประทับใจบริการของ Trip Sea Tour Phuket ยินดีต้อนรับเสมอค่ะ`,
    });
  }
});

function generateSmartFallbackReply(message: string, language: string = 'TH'): string {
  const lower = (message || '').toLowerCase().trim();
  const phone = settings.contactPhone || '062-681-6494 / 097-924-1399';
  const lineOa = settings.lineOaId || '@056hxinu';
  const fb = settings.facebookUrl || 'https://www.facebook.com/tripseatoursphuket/';
  const tat = settings.tatLicenseNo || '33/11100';

  const tourListText = tours.slice(0, 6).map((t, idx) => {
    const title = language === 'EN' ? t.title.EN : t.title.TH;
    return `🏝️ **${idx + 1}. ${title}**\n   • ราคาโปรโมชั่น: ผู้ใหญ่ **฿${t.priceAdult.toLocaleString()}** / เด็ก **฿${t.priceChild.toLocaleString()}**`;
  }).join('\n\n');

  if (lower.includes('ติดต่อ') || lower.includes('เบอร์') || lower.includes('ไลน์') || lower.includes('line')) {
    return `📞 **ช่องทางติดต่อ บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด**:\n\n• 📱 **สายด่วน**: **${phone}**\n• 💬 **LINE OA**: **${lineOa}**\n• 🌐 **Facebook**: ${fb}\n• 🛡️ **ใบอนุญาต ททท.**: **${tat}**`;
  }

  return `ขอบคุณสำหรับคำถามค่ะ 😊🌊\n\n**Trip Sea Tour Phuket** ยินดีให้บริการข้อมูลทัวร์ทะเลภูเก็ต พร้อมใบอนุญาต ททท. เลขที่ **${tat}**\n\n📌 **โปรแกรมแนะนำยอดนิยม**:\n${tourListText}\n\nสอบถามเจ้าหน้าที่ทาง LINE: **${lineOa}** (โทร **${phone}**) ได้ตลอด 24 ชม. ค่ะ!`;
}

app.post('/api/chat', async (req, res) => {
  const { message = '', language = 'TH' } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const aiClient = getAiClient();
  if (aiClient) {
    try {
      const availableToursSummary = tours.slice(0, 12).map(t =>
        `• [${t.title.TH} / ${t.title.EN}] ราคา: ผู้ใหญ่ ฿${t.priceAdult.toLocaleString()}, เด็ก ฿${t.priceChild.toLocaleString()}`
      ).join('\n');

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are "TripSeaTour AI Assistant" for Trip Sea Tour Phuket (TAT License ${settings.tatLicenseNo || '33/11100'}, Phone: ${settings.contactPhone}, LINE: ${settings.lineOaId}). Answer in ${language} politely.\nTours:\n${availableToursSummary}\n\nUser: ${message}`,
      });
      if (response?.text) {
        return res.json({ reply: response.text });
      }
    } catch {}
  }

  return res.json({ reply: generateSmartFallbackReply(message, language) });
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

    if (authorizedEmails.includes(lowerEmail)) {
      const user: AdminUser = {
        email: lowerEmail,
        name: name || lowerEmail.split('@')[0],
        picture: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || lowerEmail)}&background=0D9488&color=fff`,
        role: lowerEmail === authorizedEmails[0] ? 'superadmin' : 'admin',
        lastLogin: new Date().toISOString(),
      };
      return res.json({ authenticated: true, user, message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ' });
    }
    return res.status(403).json({
      authenticated: false,
      message: `บัญชี Google (${email}) ไม่ได้รับสิทธิ์เข้าถึงระบบผู้ดูแล กรุณาติดต่อ Super Admin เพื่อเพิ่มสิทธิ์`,
    });
  } catch {
    res.status(500).json({ authenticated: false, message: 'Authentication error' });
  }
});

app.post('/api/admin/verify-pin', (req, res) => {
  const { pin } = req.body || {};
  const targetPin = settings.adminPin || '1234';
  if (typeof pin === 'string' && pin === targetPin) {
    const user: AdminUser = {
      email: 'pin-admin@tripseatour.com',
      name: 'แอดมิน (PIN สำรอง)',
      role: 'admin',
      lastLogin: new Date().toISOString(),
    };
    return res.json({ authenticated: true, user });
  }
  return res.status(401).json({ authenticated: false, message: 'รหัส PIN ไม่ถูกต้อง โปรดลองใหม่อีกครั้ง' });
});

app.get(['/api/admin/google-emails', '/api/admin/google-accounts'], (_req, res) => {
  const list = settings.adminGoogleEmails || ['asmr9941@gmail.com', 'admin@tripseatour.com'];
  res.json({ success: true, adminGoogleEmails: list });
});

app.post(['/api/admin/google-emails', '/api/admin/google-accounts'], async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
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
  await persistState('settings', { authToken });
  res.json({ success: true, adminGoogleEmails: settings.adminGoogleEmails });
});

app.delete(['/api/admin/google-emails', '/api/admin/google-accounts', '/api/admin/google-accounts/:email'], async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const email = req.params.email || req.body?.email || (req.query.email as string);
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!settings.adminGoogleEmails) {
    settings.adminGoogleEmails = ['asmr9941@gmail.com', 'admin@tripseatour.com'];
  }

  if (cleanEmail === 'asmr9941@gmail.com') {
    return res.status(400).json({ error: 'Cannot remove primary superadmin account' });
  }

  settings.adminGoogleEmails = settings.adminGoogleEmails.filter(e => e.toLowerCase() !== cleanEmail);
  await persistState('settings', { authToken });
  res.json({ success: true, adminGoogleEmails: settings.adminGoogleEmails });
});

// --- Live Chat Endpoints ---
async function persistLiveChat(sessionToSave?: any, deleteSessionId?: string, authToken?: string) {
  saveLocalFile('live_chat_sessions.json', liveChatSessions);
  try {
    if (deleteSessionId) {
      await fsDeleteDoc('live_chat_sessions', sanitizeDocId(deleteSessionId, 'session'), authToken);
    } else if (sessionToSave) {
      const sanitized = sanitizeLiveChatForFirestore(sessionToSave);
      await fsSetDoc('live_chat_sessions', sanitized.id, sanitized, authToken);
    }
  } catch (err) {
    console.warn('Firestore live_chat_sessions persist error:', err);
  }
}

app.get('/api/livechat/sessions', (_req, res) => {
  res.json(liveChatSessions);
});

app.get('/api/livechat/sessions/:id', async (req, res) => {
  let session = liveChatSessions.find(s => s.id === req.params.id);
  if (!session) {
    const cleanId = sanitizeDocId(req.params.id, 'session');
    const docRes = await fsGetDoc('live_chat_sessions', cleanId).catch(() => null);
    if (docRes && docRes.exists && docRes.data) {
      session = docRes.data;
      liveChatSessions.unshift(session);
    }
  }
  if (session) res.json(session);
  else res.status(404).json({ error: 'Session not found' });
});

app.post('/api/livechat/sessions', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { sessionId, customerName, customerPhone } = req.body;
  let session = liveChatSessions.find(s => s.id === sessionId);
  if (!session && sessionId) {
    const docRes = await fsGetDoc('live_chat_sessions', sanitizeDocId(sessionId, 'session')).catch(() => null);
    if (docRes && docRes.exists && docRes.data) {
      session = docRes.data;
      liveChatSessions.unshift(session);
    }
  }
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
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    liveChatSessions.unshift(session);
    await persistLiveChat(session, undefined, authToken);
  } else if (customerName && customerName !== session.customerName) {
    session.customerName = customerName;
    session.updatedAt = new Date().toISOString();
    await persistLiveChat(session, undefined, authToken);
  }
  res.json(session);
});

app.post('/api/livechat/send', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { sessionId, sender, senderName, text, imageUrl } = req.body;
  let session = liveChatSessions.find(s => s.id === sessionId);
  if (!session && sessionId) {
    const docRes = await fsGetDoc('live_chat_sessions', sanitizeDocId(sessionId, 'session')).catch(() => null);
    if (docRes && docRes.exists && docRes.data) {
      session = docRes.data;
      liveChatSessions.unshift(session);
    }
  }

  if (!session) {
    session = {
      id: sessionId || `session-${Date.now()}`,
      customerName: senderName || 'นักท่องเที่ยวบนหน้าเว็บ',
      unreadCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    liveChatSessions.unshift(session);
  }

  const newMsg: LiveChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender: sender || 'customer',
    senderName: senderName || (sender === 'admin' ? 'แอดมิน TripSea Tour' : 'คุณลูกค้า'),
    text: text || '',
    imageUrl,
    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
  };

  session.messages.push(newMsg);
  session.updatedAt = new Date().toISOString();

  if (sender === 'customer') {
    session.unreadCount += 1;
    const hostUrl = getRequestHostUrl(req);
    const custName = session.customerName || senderName || 'นักท่องเที่ยวบนหน้าเว็บ';
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const lineMessage = `💬 [แจ้งเตือนแชทสดลูกค้าใหม่!]\n` +
      `👤 ลูกค้า: ${custName}\n` +
      `💬 ข้อความ: "${text || (imageUrl ? '[แนบไฟล์รูปภาพ/สลิป]' : '')}"\n` +
      `⏰ เวลา: ${timeStr}\n` +
      `🔗 คลิกแชทตอบกลับทันที: ${hostUrl}/#admin (เมนู 💬 แชทสดลูกค้า)`;

    await sendLineNotification(
      lineMessage,
      session.id,
      'LIVE_CHAT' as any,
      imageUrl && imageUrl.startsWith('https://') ? imageUrl : undefined,
      undefined,
      undefined,
      hostUrl
    ).catch(() => {});
  } else if (sender === 'admin') {
    session.unreadCount = 0;
  }

  await persistLiveChat(session, undefined, authToken);
  res.json({ success: true, message: newMsg, session });
});

app.post('/api/livechat/read/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const session = liveChatSessions.find(s => s.id === req.params.id);
  if (session) {
    session.unreadCount = 0;
    session.updatedAt = new Date().toISOString();
    await persistLiveChat(session, undefined, authToken);
    res.json({ success: true, session });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/livechat/close/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const session = liveChatSessions.find(s => s.id === req.params.id);
  if (session) {
    session.status = session.status === 'active' ? 'closed' : 'active';
    session.updatedAt = new Date().toISOString();
    await persistLiveChat(session, undefined, authToken);
    res.json({ success: true, session });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.delete('/api/livechat/delete/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const id = (req.params.id || req.query.id || req.body?.id || req.body?.sessionId) as string;
  if (id) {
    liveChatSessions = liveChatSessions.filter(s => s.id !== id);
    await persistLiveChat(undefined, id, authToken);
  }
  res.json({ success: true, sessions: liveChatSessions });
});

app.post(['/api/livechat/delete/:id', '/api/livechat/delete'], async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const id = (req.params.id || req.query.id || req.body?.id || req.body?.sessionId) as string;
  if (id) {
    liveChatSessions = liveChatSessions.filter(s => s.id !== id);
    await persistLiveChat(undefined, id, authToken);
  }
  res.json({ success: true, sessions: liveChatSessions });
});

// --- Customers ---
app.get('/api/customers', (_req, res) => {
  const activeCustomers = customers.filter(c => !deletedCustomerIds.has(c.id));
  res.json(activeCustomers);
});

app.put('/api/customers/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const { name, email, phone, lineId, nationality } = req.body;
  const cust = customers.find(c => c.id === id);
  if (cust) {
    const patch: Record<string, any> = {};
    if (name !== undefined) {
      cust.name = name;
      patch.name = name;
    }
    if (email !== undefined) {
      cust.email = email;
      patch.email = email;
    }
    if (phone !== undefined) {
      cust.phone = phone;
      patch.phone = phone;
    }
    if (lineId !== undefined) {
      cust.lineId = lineId;
      patch.lineId = lineId;
    }
    if (nationality !== undefined) {
      cust.nationality = nationality;
      patch.nationality = nationality;
    }

    customers = customers.filter(c => !deletedCustomerIds.has(c.id));
    await persistState('customers', { authToken, patchFields: { id: cust.id, fields: patch } });
    res.json({ ...cust, version: syncMetadata.version });
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  deletedCustomerIds.add(id);
  customers = customers.filter(c => c.id !== id && !deletedCustomerIds.has(c.id));
  await persistState('customers', { authToken, deleteId: id });
  res.json({
    success: true,
    id,
    deletedCustomerIds: Array.from(deletedCustomerIds),
    version: syncMetadata.version,
    message: 'Customer deleted successfully',
  });
});

app.post('/api/customers/save-all', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const incoming = req.body?.customers || req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'customers payload must be an array' });
    }
    customers = incoming.filter((c: Customer) => !deletedCustomerIds.has(c.id));
    await persistState('customers', { authToken, saveAll: true });
    res.json({
      success: true,
      count: customers.length,
      customers,
      version: syncMetadata.version,
      lastUpdatedAt: syncMetadata.lastUpdatedAt.customers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save all customers' });
  }
});

// --- Stats Dashboard ---
app.get('/api/stats', (_req, res) => {
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'verified' || b.paymentStatus === 'slip_uploaded')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalBookings = bookings.length;
  const pendingVerifications = bookings.filter(b => b.paymentStatus === 'slip_uploaded' || b.paymentStatus === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.orderStatus === 'confirmed').length;

  const monthlyRevenue = [
    { month: 'พ.ค. 26', revenue: 145000, bookings: 32 },
    { month: 'มิ.ย. 26', revenue: 182000, bookings: 41 },
    { month: 'ก.ค. 26', revenue: 220000, bookings: 54 },
    { month: 'ส.ค. 26', revenue: totalRevenue + 95000, bookings: totalBookings + 18 },
  ];

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
    revenue: catMap[cat].revenue,
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
      { status: 'รอชำระเงิน', count: bookings.filter(b => b.paymentStatus === 'pending').length },
    ],
    recentBookings: bookings.slice(0, 10),
  };

  res.json(stats);
});

// --- Website Visitor Analytics API ---
app.get('/api/analytics/stats', (_req, res) => {
  const live = getCleanLiveSessions();
  visitorAnalytics.activeNow = live.length;
  visitorAnalytics.liveSessions = live;
  visitorAnalytics.lastUpdated = new Date().toISOString();
  res.json(visitorAnalytics);
});

app.get('/api/analytics/live', (_req, res) => {
  const live = getCleanLiveSessions();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    activeNow: live.length,
    liveSessions: live,
    lastUpdated: new Date().toISOString(),
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
      timezone,
    } = req.body || {};

    const effectiveVisitorId = visitorId && visitorId.length > 3 ? visitorId : `v-${Math.random().toString(36).substring(2, 8)}`;
    const effectiveDevice: 'mobile' | 'desktop' | 'tablet' = device === 'desktop' || device === 'tablet' || device === 'mobile' ? device : 'mobile';

    const loc = getClientLocation(req, timezone, language);
    const nowMs = Date.now();

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
        pageviewsCount: 1,
      });
    }

    const liveSessions = getCleanLiveSessions();
    visitorAnalytics.activeNow = liveSessions.length;
    visitorAnalytics.liveSessions = liveSessions;

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

    visitorAnalytics.totalPageviews = (visitorAnalytics.totalPageviews || 0) + 1;
    visitorAnalytics.todayPageviews = (visitorAnalytics.todayPageviews || 0) + 1;
    todayEntry.views = (todayEntry.views || 0) + 1;

    if (!todayVisitorsSet.has(effectiveVisitorId)) {
      todayVisitorsSet.add(effectiveVisitorId);
      visitorAnalytics.todayUniqueVisitors = (visitorAnalytics.todayUniqueVisitors || 0) + 1;
      visitorAnalytics.totalUniqueVisitors = (visitorAnalytics.totalUniqueVisitors || 0) + 1;
      todayEntry.uniques = (todayEntry.uniques || 0) + 1;
    }

    if (!visitorAnalytics.devices) visitorAnalytics.devices = { mobile: 0, desktop: 0, tablet: 0 };
    if (effectiveDevice === 'desktop') visitorAnalytics.devices.desktop++;
    else if (effectiveDevice === 'tablet') visitorAnalytics.devices.tablet++;
    else visitorAnalytics.devices.mobile++;

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

    if (!Array.isArray(visitorAnalytics.sources)) visitorAnalytics.sources = [];
    const srcKey = referrer || 'Direct';
    const srcObj = visitorAnalytics.sources.find(s => s.source.toLowerCase().includes(srcKey.toLowerCase()));
    if (srcObj) {
      srcObj.count = (srcObj.count || 0) + 1;
    } else {
      visitorAnalytics.sources.push({ source: srcKey, count: 1, percentage: 1 });
    }
    const totalSrc = visitorAnalytics.sources.reduce((sum, s) => sum + s.count, 0);
    visitorAnalytics.sources.forEach(s => {
      s.percentage = totalSrc > 0 ? Number(((s.count / totalSrc) * 100).toFixed(1)) : 0;
    });

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
      referrer: srcKey,
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
      liveSessions,
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
          tablet: live.filter(s => s.device === 'tablet').length,
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
          referrer: s.referrer,
        })),
        lastUpdated: new Date().toISOString(),
      };
    }

    await persistState('analytics');
    res.json({
      success: true,
      mode,
      message: mode === 'baseline' ? 'รีเซ็ตเป็นสถิติอ้างอิงสำเร็จ' : 'รีเซ็ตเริ่มนับสถิติจริงจาก 0 สำเร็จ',
      visitorAnalytics,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error resetting analytics' });
  }
});

// --- State Auto Sync ---
app.post('/api/sync', async (req, res) => {
  try {
    const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const {
      tours: clientTours,
      bookings: clientBookings,
      settings: clientSettings,
      reviews: clientReviews,
      customers: clientCustomers,
    } = req.body;

    let updated = false;

    if (Array.isArray(clientTours) && clientTours.length > 0) {
      tours = clientTours;
      await persistState('tours', { authToken, saveAll: true });
      updated = true;
    }
    if (Array.isArray(clientBookings)) {
      bookings = clientBookings;
      await persistState('bookings', { authToken, saveAll: true });
      updated = true;
    }
    if (clientSettings && clientSettings.promptPayId) {
      settings = { ...settings, ...clientSettings };
      await persistState('settings', { authToken });
      updated = true;
    }
    if (Array.isArray(clientReviews)) {
      reviews = clientReviews;
      await persistState('reviews', { authToken, saveAll: true });
      updated = true;
    }
    if (Array.isArray(clientCustomers)) {
      customers = clientCustomers;
      await persistState('customers', { authToken, saveAll: true });
      updated = true;
    }
    if (Array.isArray(req.body.suppliers)) {
      suppliers = req.body.suppliers;
      await persistState('suppliers', { authToken, saveAll: true });
      updated = true;
    }

    res.json({ success: true, updated, settings, toursCount: tours.length, bookingsCount: bookings.length, suppliersCount: suppliers.length });
  } catch (err) {
    console.error('Error in /api/sync:', err);
    res.status(500).json({ error: 'Failed to sync state' });
  }
});

// --- Settings & LINE Notify ---
app.get('/api/settings', (_req, res) => {
  res.json(settings);
});

app.put('/api/settings', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  settings = { ...settings, ...req.body };
  await persistState('settings', { authToken });
  res.json({ ...settings, version: syncMetadata.version });
});

app.post('/api/settings', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  settings = { ...settings, ...req.body };
  await persistState('settings', { authToken });
  res.json({ ...settings, version: syncMetadata.version });
});

app.get('/api/line/logs', (_req, res) => {
  res.json(lineLogs);
});

app.post(['/api/send-line', '/api/line/notify', '/api/line-notify'], async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { message, bookingRef = 'TEST', type = 'TEST', imageUrl, ticketImageUrl, slipImageUrl, slipUrl, channelToken, targetId } = req.body || {};
  const hostUrl = getRequestHostUrl(req);
  const rawSlip = slipImageUrl || slipUrl;

  // If client passed base64 slip directly to /api/send-line, persist it so /api/slip-image can serve it
  if (rawSlip && typeof rawSlip === 'string' && rawSlip.startsWith('data:image') && bookingRef && bookingRef !== 'TEST') {
    const mimeMatch = rawSlip.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    await saveServerImage(`slip_${bookingRef}`, rawSlip, mimeType, authToken);
  }

  const result = await sendLineNotification(
    message || '🧪 [ทดสอบการแจ้งเตือน LINE]',
    bookingRef,
    type,
    imageUrl,
    ticketImageUrl,
    rawSlip,
    hostUrl,
    channelToken,
    targetId
  );
  res.json({ success: result.status === 'sent', logItem: result, status: result.status });
});

app.post('/api/cache-image', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { key, dataUrl, mimeType } = req.body;
  if (!key || !dataUrl) {
    return res.status(400).json({ error: 'key and dataUrl required' });
  }
  await saveServerImage(key, dataUrl, mimeType, authToken);
  res.json({ success: true, key });
});

// Ticket Image Endpoint - Guarantees valid PNG or JPEG binary response (LINE rejects SVG)
app.get(['/api/ticket-image', '/api/ticket-image/:ref'], async (req, res) => {
  const ref = (req.params.ref || req.query.ref || req.query.bookingRef || 'TEST').toString().trim();

  // 1. Check memory / Firestore image cache
  const cached = (await getServerImage(`ticket_${ref}`)) || (await getServerImage(ref));
  if (cached && cached.data.startsWith('data:image')) {
    const base64Data = cached.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', cached.mimeType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  }

  // 2. Query booking details
  const booking = bookings.find(b => b.bookingRef === ref || b.id === ref);

  // 3a. If tourImage is a base64 image, stream binary PNG/JPEG directly
  if (booking?.tourImage && booking.tourImage.startsWith('data:image')) {
    const mimeMatch = booking.tourImage.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = booking.tourImage.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  }

  // 3b. If tourImage is an HTTPS URL, stream it as binary image
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

  // 4. Fallback: generate clean high-res PNG QR Ticket
  try {
    const hostUrl = getRequestHostUrl(req);
    const checkUrl = `${hostUrl}/#lookup?ref=${encodeURIComponent(ref)}`;
    const qrBuffer = await QRCode.toBuffer(checkUrl, {
      type: 'png',
      width: 600,
      margin: 3,
      color: { dark: '#0d3b66', light: '#ffffff' },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(qrBuffer);
  } catch {
    res.status(500).send('Error generating ticket image');
  }
});

// Slip Image Endpoint - Returns real JPEG/PNG binary buffer or 404 (NEVER returns SVG)
app.get(['/api/slip-image', '/api/slip-image/:ref'], async (req, res) => {
  const ref = (req.params.ref || req.query.ref || req.query.bookingRef || '').toString().trim();

  const cached = (await getServerImage(`slip_${ref}`)) || (await getServerImage(ref));
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

app.post('/api/bookings/:id/send-line-ticket', async (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);

  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  const hostUrl = getRequestHostUrl(req);
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
    `🌐 เว็บไซต์: ${hostUrl}\n` +
    `🔗 สแกนตรวจตั๋ว: ${qrUrl}\n` +
    `ℹ️ ลูกค้าสามารถแสดงตั๋วนี้ให้คนขับรถ/ไกด์ดูในวันเดินทางได้ทันที`;

  const logResult = await sendLineNotification(
    ticketMessage,
    booking.bookingRef,
    'ORDER_CONFIRMED',
    booking.tourImage || 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
    undefined,
    undefined,
    hostUrl
  );

  res.json({ success: true, bookingRef: booking.bookingRef, logResult });
});

app.get('/api/line/detected-groups', (_req, res) => {
  res.json({
    detectedGroups: detectedLineGroups,
    currentConfiguredGroupId: settings.lineMessagingUserId,
  });
});

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
            const existingIndex = detectedLineGroups.findIndex(g => g.groupId === detectedGroupId);
            const label = isGroup ? 'กลุ่ม LINE' : 'ผู้ใช้งานเดี่ยว (1-on-1)';
            if (existingIndex >= 0) {
              detectedLineGroups[existingIndex].lastSeen = new Date().toISOString();
            } else {
              detectedLineGroups.unshift({
                groupId: detectedGroupId,
                groupName: `${label} (ตรวจพบเมื่อ ${new Date().toLocaleTimeString('th-TH')})`,
                lastSeen: new Date().toISOString(),
              });
            }

            if (!settings.lineMessagingUserId || settings.lineMessagingUserId.startsWith('U1234') || settings.lineMessagingUserId === 'C1234567890abcdef1234567890abcdef') {
              settings.lineMessagingUserId = detectedGroupId;
              await persistState('settings');
            }

            if (event.replyToken && settings.lineMessagingChannelAccessToken && !settings.lineMessagingChannelAccessToken.startsWith('SIMULATED')) {
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${settings.lineMessagingChannelAccessToken.trim()}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [{
                    type: 'text',
                    text: `🤖 [ระบบแจ้งเตือนอัตโนมัติ]\n\n✅ เชื่อมต่อระบบรับแจ้งเตือนจองทัวร์เรียบร้อยแล้ว!\n\n📌 LINE ID สำหรับบันทึกลงในระบบคือ:\n${detectedGroupId}`,
                  }],
                }),
              }).catch(() => {});
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

app.post('/api/line/send-group-id-bot-message', async (req, res) => {
  const { groupId } = req.body;
  const targetGroup = groupId || settings.lineMessagingUserId;
  if (!targetGroup) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ Group ID' });
  }

  const hostUrl = getRequestHostUrl(req);
  const messageText = `📢 [แจ้งจากหลังบ้านแอดมิน - Trip Sea Tour]\n` +
    `🤖 ยืนยันการเชื่อมต่อกลุ่ม LINE แอดมินสำเร็จ!\n\n` +
    `📌 Group ID: ${targetGroup}\n` +
    `⏰ เวลาตรวจสอบ: ${new Date().toLocaleString('th-TH')}\n\n` +
    `ระบบพร้อมส่งการแจ้งเตือนออเดอร์ใหม่ สลิปโอนเงิน และการแจ้งเตือน 24 ชม. เข้ากลุ่มนี้โดยตรง`;

  const result = await sendLineNotification(messageText, 'GROUP-ID-CHECK', 'TEST', undefined, undefined, undefined, hostUrl, undefined, targetGroup);
  res.json({ success: result.status === 'sent', targetGroup, result });
});

app.post('/api/line/trigger-reminders', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const result = await checkAndSend24hReminders(authToken);
  res.json({ success: true, ...result });
});

app.post('/api/line/send-reminder/:id', async (req, res) => {
  const authToken = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id || b.bookingRef === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const hostUrl = getRequestHostUrl(req);
  const lineMsg = `\n⏰ [แจ้งเตือนใกล้วันเดินทาง - 24 ชม.]\n` +
    `🎫 รหัสการจอง: ${booking.bookingRef}\n` +
    `👤 ลูกค้า: ${booking.customerName} (${booking.customerPhone})\n` +
    `📍 ทัวร์: ${booking.tourTitle}\n` +
    `📅 วันเดินทาง: ${booking.travelDate}\n` +
    `🏨 โรงแรมรับส่ง: ${booking.pickupHotel}${booking.roomNumber ? ` (ห้อง ${booking.roomNumber})` : ''}\n` +
    `👥 จำนวน: ผู้ใหญ่ ${booking.adults} / เด็ก ${booking.children}\n` +
    `📌 สถานะ: ยืนยันเรียบร้อยแล้ว (พร้อมต้อนรับลูกค้า!)`;

  const logItem = await sendLineNotification(lineMsg, booking.bookingRef, 'REMINDER_24H', booking.tourImage, undefined, undefined, hostUrl);
  booking.reminderSent = true;
  booking.reminderSentAt = new Date().toISOString();
  await persistState('bookings', {
    authToken,
    patchFields: {
      id: booking.id,
      fields: { reminderSent: true, reminderSentAt: booking.reminderSentAt },
    },
  });

  res.json({ success: true, logItem, booking });
});

// Ensure any unhandled /api/* route returns clean JSON (never fall through to SPA HTML)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.path}` });
});

export default app;
