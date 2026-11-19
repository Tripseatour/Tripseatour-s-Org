import { Tour, Booking, Customer, Supplier, Review, AppSettings, VisitorAnalytics } from '../types';

export function pickAllowedKeys<T extends Record<string, any>>(obj: T, allowedKeys: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

export const TOUR_ALLOWED_KEYS = [
  'id', 'slug', 'title', 'category', 'categoryLabel', 'description', 'highlights',
  'priceAdult', 'priceChild', 'priceInfant', 'costAdult', 'costChild',
  'priceForeignAdult', 'priceForeignChild', 'costForeignAdult', 'costForeignChild',
  'originalPriceAdult', 'originalPriceChild', 'originalPriceForeignAdult', 'originalPriceForeignChild',
  'supplierId', 'supplierName', 'duration', 'location', 'pickupAreas', 'pickupZoneConfigs',
  'included', 'excluded', 'itinerary', 'images', 'rating', 'reviewCount', 'tags',
  'isFeatured', 'isAvailable', 'isVisible', 'addons', 'sortOrder', 'updatedAt',
];

export const BOOKING_ALLOWED_KEYS = [
  'id', 'bookingRef', 'tourId', 'tourTitle', 'tourImage', 'supplierId', 'supplierName',
  'customerName', 'customerEmail', 'customerPhone', 'customerLineId', 'nationality',
  'isForeigner', 'selectedAddons', 'travelDate', 'pickupTime', 'pickupHotel',
  'pickupZone', 'pickupZoneFee', 'roomNumber', 'sendBackHotel', 'specialRequests',
  'adults', 'children', 'infants', 'totalAmount', 'paymentMethod', 'promptPayIdUsed',
  'paymentStatus', 'orderStatus', 'slipUrl', 'slipUploadedAt', 'ticketImageUrl',
  'paidAt', 'createdAt', 'lineNotifySent', 'reminderSent', 'reminderSentAt', 'notes', 'updatedAt',
];

export const CUSTOMER_ALLOWED_KEYS = [
  'id', 'name', 'email', 'phone', 'lineId', 'nationality',
  'totalBookings', 'totalSpent', 'lastBookingDate', 'createdAt',
];

export const SUPPLIER_ALLOWED_KEYS = [
  'id', 'name', 'code', 'contactPerson', 'phone', 'email', 'lineId',
  'address', 'bankName', 'accountNo', 'accountName', 'bankAccount', 'notes', 'isActive', 'createdAt',
];

export const REVIEW_ALLOWED_KEYS = [
  'id', 'tourId', 'userName', 'userAvatar', 'nationality', 'rating', 'comment',
  'date', 'verifiedBooking', 'photos', 'adminReply', 'adminReplyDate', 'isApproved',
];

export const PUBLIC_CONFIG_KEYS = [
  'siteName', 'companyName', 'promptPayId', 'promptPayName', 'lineOaId',
  'contactPhone', 'contactEmail', 'address', 'tatLicenseNo', 'tatLicenseImgUrl',
  'facebookUrl', 'facebookMessengerUrl', 'updatedAt',
];

export const PRIVATE_CONFIG_KEYS = [
  'adminPin', 'adminGoogleEmails', 'adminPermissions',
  'lineMessagingChannelAccessToken', 'lineMessagingUserId', 'lineNotifyToken', 'updatedAt',
];

export function sanitizeDocId(rawId: string, prefix: string = 'doc'): string {
  const cleaned = String(rawId || `${prefix}-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  return cleaned || `${prefix}-${Date.now()}`;
}

export function sanitizeTourForFirestore(t: Tour): Record<string, any> {
  const validCategory = ['island', 'sunset', 'yacht', 'eco', 'sightseeing'].includes(t.category)
    ? t.category
    : 'island';
  const cleanId = sanitizeDocId(t.id, 'tour');
  return pickAllowedKeys(
    {
      ...t,
      id: cleanId,
      slug: sanitizeDocId(t.slug || cleanId, 'tour'),
      title: t.title && typeof t.title === 'object' ? t.title : { TH: 'ทัวร์ภูเก็ต', EN: 'Phuket Tour' },
      category: validCategory,
      priceAdult: Math.max(0, Math.min(1000000, Number(t.priceAdult) || 0)),
      priceChild: Math.max(0, Math.min(1000000, Number(t.priceChild) || 0)),
      isVisible: t.isVisible !== false,
      images: Array.isArray(t.images) ? t.images.slice(0, 20) : [],
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 30) : [],
      location: typeof t.location === 'string' ? t.location.slice(0, 300) : '',
      updatedAt: new Date().toISOString(),
    },
    TOUR_ALLOWED_KEYS
  );
}

export function sanitizeBookingForFirestore(b: Booking, forceGuestPending: boolean = false): Record<string, any> {
  const cleanId = sanitizeDocId(b.id, 'bk');
  const cleanRef = sanitizeDocId(b.bookingRef, 'TST');
  const paymentStatus = forceGuestPending
    ? (b.slipUrl ? 'slip_uploaded' : 'pending')
    : (['pending', 'slip_uploaded', 'verified', 'cancelled', 'refunded'].includes(b.paymentStatus)
      ? b.paymentStatus
      : 'pending');
  const orderStatus = forceGuestPending
    ? 'pending'
    : (['pending', 'confirmed', 'completed', 'cancelled'].includes(b.orderStatus)
      ? b.orderStatus
      : 'pending');

  return pickAllowedKeys(
    {
      ...b,
      id: cleanId,
      bookingRef: cleanRef,
      tourId: String(b.tourId || 'tour-1').slice(0, 128),
      tourTitle: String(b.tourTitle || 'ทัวร์ภูเก็ต').slice(0, 300),
      tourImage: typeof b.tourImage === 'string' ? b.tourImage.slice(0, 490000) : '',
      customerName: String(b.customerName || 'Guest').slice(0, 200),
      customerEmail: typeof b.customerEmail === 'string' ? b.customerEmail.slice(0, 200) : '',
      customerPhone: String(b.customerPhone || '-').slice(0, 50),
      travelDate: String(b.travelDate || new Date().toISOString().split('T')[0]).slice(0, 32),
      pickupHotel: String(b.pickupHotel || '-').slice(0, 300),
      adults: Math.max(1, Math.min(100, Number(b.adults) || 1)),
      children: Math.max(0, Number(b.children) || 0),
      infants: Math.max(0, Number(b.infants) || 0),
      totalAmount: Math.max(0, Math.min(10000000, Number(b.totalAmount) || 0)),
      paymentStatus,
      orderStatus,
      slipUrl: typeof b.slipUrl === 'string' ? b.slipUrl.slice(0, 840000) : undefined,
      ticketImageUrl: typeof b.ticketImageUrl === 'string' ? b.ticketImageUrl.slice(0, 840000) : undefined,
      createdAt: String(b.createdAt || new Date().toISOString()).slice(0, 64),
      lineNotifySent: forceGuestPending ? false : Boolean(b.lineNotifySent),
    },
    BOOKING_ALLOWED_KEYS
  );
}

export function sanitizeBookingStatusForFirestore(b: Booking, forceGuestPending: boolean = false): Record<string, any> {
  const cleanRef = sanitizeDocId(b.bookingRef, 'TST');
  return {
    bookingRef: cleanRef,
    tourTitle: String(b.tourTitle || 'ทัวร์ภูเก็ต').slice(0, 300),
    travelDate: String(b.travelDate || new Date().toISOString().split('T')[0]).slice(0, 32),
    adults: Math.max(1, Math.min(100, Number(b.adults) || 1)),
    children: Math.max(0, Number(b.children) || 0),
    infants: Math.max(0, Number(b.infants) || 0),
    totalAmount: Math.max(0, Math.min(10000000, Number(b.totalAmount) || 0)),
    paymentStatus: forceGuestPending
      ? (b.slipUrl ? 'slip_uploaded' : 'pending')
      : (['pending', 'slip_uploaded', 'verified', 'cancelled', 'refunded'].includes(b.paymentStatus) ? b.paymentStatus : 'pending'),
    orderStatus: forceGuestPending
      ? 'pending'
      : (['pending', 'confirmed', 'completed', 'cancelled'].includes(b.orderStatus) ? b.orderStatus : 'pending'),
    pickupZone: String(b.pickupZone || 'General Zone').slice(0, 128),
    createdAt: String(b.createdAt || new Date().toISOString()).slice(0, 64),
  };
}

export function sanitizeCustomerForFirestore(c: Customer): Record<string, any> {
  const cleanId = sanitizeDocId(c.id, 'cust');
  return pickAllowedKeys(
    {
      ...c,
      id: cleanId,
      name: String(c.name || 'Customer').slice(0, 200),
      phone: String(c.phone || '-').slice(0, 50),
      totalBookings: Math.max(0, Number(c.totalBookings) || 0),
      totalSpent: Math.max(0, Number(c.totalSpent) || 0),
      createdAt: String(c.createdAt || new Date().toISOString().split('T')[0]).slice(0, 64),
    },
    CUSTOMER_ALLOWED_KEYS
  );
}

export function sanitizeSupplierForFirestore(s: Supplier): Record<string, any> {
  const cleanId = sanitizeDocId(s.id, 'sup');
  return pickAllowedKeys(
    {
      ...s,
      id: cleanId,
      name: String(s.name || 'Supplier').slice(0, 200),
      code: String(s.code || 'SUP').slice(0, 64),
      isActive: s.isActive !== false,
    },
    SUPPLIER_ALLOWED_KEYS
  );
}

export function sanitizeReviewForFirestore(r: Review): Record<string, any> {
  const cleanId = sanitizeDocId(r.id, 'rev');
  return pickAllowedKeys(
    {
      ...r,
      id: cleanId,
      tourId: String(r.tourId || 'tour-1').slice(0, 128),
      userName: String(r.userName || 'ผู้ใช้งาน').slice(0, 120),
      rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
      comment: String(r.comment || '-').slice(0, 2000),
      date: String(r.date || new Date().toISOString().split('T')[0]).slice(0, 32),
      verifiedBooking: Boolean(r.verifiedBooking),
      isApproved: r.isApproved !== false,
      photos: Array.isArray(r.photos) ? r.photos.slice(0, 5) : undefined,
    },
    REVIEW_ALLOWED_KEYS
  );
}

export function sanitizePublicConfig(settings: AppSettings, nowIso: string = new Date().toISOString()): Record<string, any> {
  return pickAllowedKeys(
    {
      ...settings,
      siteName: String(settings.siteName || 'Trip Sea Tour Phuket').slice(0, 200),
      promptPayId: String(settings.promptPayId || '0825257914').slice(0, 64),
      tatLicenseImgUrl: typeof settings.tatLicenseImgUrl === 'string' ? settings.tatLicenseImgUrl.slice(0, 840000) : '',
      updatedAt: nowIso,
    },
    PUBLIC_CONFIG_KEYS
  );
}

export function sanitizePrivateConfig(settings: AppSettings, nowIso: string = new Date().toISOString()): Record<string, any> {
  return pickAllowedKeys(
    {
      ...settings,
      adminGoogleEmails:
        Array.isArray(settings.adminGoogleEmails) && settings.adminGoogleEmails.length > 0
          ? settings.adminGoogleEmails.slice(0, 50)
          : ['asmr9941@gmail.com'],
      updatedAt: nowIso,
    },
    PRIVATE_CONFIG_KEYS
  );
}

export function sanitizePublicMediaForFirestore(key: string, dataUrl: string, mimeType?: string): Record<string, any> {
  const cleanId = sanitizeDocId(key, 'media');
  const resolvedMime =
    mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/jpeg'
      ? mimeType
      : dataUrl.includes('image/png')
        ? 'image/png'
        : dataUrl.includes('image/webp')
          ? 'image/webp'
          : 'image/jpeg';
  return {
    id: cleanId,
    data: String(dataUrl).slice(0, 845000),
    mimeType: resolvedMime,
    createdAt: new Date().toISOString(),
  };
}

export function sanitizeLiveChatForFirestore(session: any): Record<string, any> {
  const cleanId = sanitizeDocId(session.id, 'session');
  return {
    id: cleanId,
    customerName: String(session.customerName || 'นักท่องเที่ยวบนหน้าเว็บ').slice(0, 200),
    customerPhone: String(session.customerPhone || '').slice(0, 50),
    unreadCount: Math.max(0, Math.min(1000, Number(session.unreadCount) || 0)),
    status: session.status === 'closed' ? 'closed' : 'active',
    createdAt: String(session.createdAt || new Date().toISOString()).slice(0, 64),
    updatedAt: String(session.updatedAt || new Date().toISOString()).slice(0, 64),
    messages: Array.isArray(session.messages) ? session.messages.slice(-200) : [],
  };
}

export function sanitizeVisitorAnalyticsForFirestore(analytics: VisitorAnalytics): Record<string, any> {
  return {
    totalPageviews: Math.max(0, Number(analytics.totalPageviews) || 0),
    totalUniqueVisitors: Math.max(0, Number(analytics.totalUniqueVisitors) || 0),
    todayPageviews: Math.max(0, Number(analytics.todayPageviews) || 0),
    todayUniqueVisitors: Math.max(0, Number(analytics.todayUniqueVisitors) || 0),
    yesterdayPageviews: Math.max(0, Number(analytics.yesterdayPageviews) || 0),
    yesterdayUniqueVisitors: Math.max(0, Number(analytics.yesterdayUniqueVisitors) || 0),
    activeNow: Math.max(0, Number(analytics.activeNow) || 0),
    isRealModeOnly: Boolean(analytics.isRealModeOnly),
    liveSessions: (analytics.liveSessions || []).slice(0, 50),
    dailyHistory: (analytics.dailyHistory || []).slice(-14),
    devices: analytics.devices || { mobile: 0, desktop: 0, tablet: 0 },
    topPages: (analytics.topPages || []).slice(0, 20),
    sources: (analytics.sources || []).slice(0, 20),
    recentVisitors: (analytics.recentVisitors || []).slice(0, 30),
    lastUpdated: String(analytics.lastUpdated || new Date().toISOString()),
  };
}
