import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { Booking, Tour, Review, AppSettings, Customer, Supplier, VisitorAnalytics } from '../types';
import { compressImageBase64 } from '../utils/storage';

export const isCloudDbConfigured = true;

export function isFirebaseAdminSignedIn(): boolean {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return false;
  return Boolean(user.email);
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch {}
  return {};
}

// --- Payload Sanitizers (matching firebase-blueprint.json & firestore.rules) ---

function pickAllowedKeys<T extends Record<string, any>>(obj: T, allowedKeys: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

const TOUR_ALLOWED_KEYS = [
  'id', 'slug', 'title', 'category', 'categoryLabel', 'description', 'highlights',
  'priceAdult', 'priceChild', 'priceInfant', 'costAdult', 'costChild',
  'priceForeignAdult', 'priceForeignChild', 'costForeignAdult', 'costForeignChild',
  'originalPriceAdult', 'originalPriceChild', 'originalPriceForeignAdult', 'originalPriceForeignChild',
  'supplierId', 'supplierName', 'duration', 'location', 'pickupAreas', 'pickupZoneConfigs',
  'included', 'excluded', 'itinerary', 'images', 'rating', 'reviewCount', 'tags',
  'isFeatured', 'isAvailable', 'isVisible', 'addons', 'sortOrder', 'updatedAt',
];

const BOOKING_ALLOWED_KEYS = [
  'id', 'bookingRef', 'tourId', 'tourTitle', 'tourImage', 'supplierId', 'supplierName',
  'customerName', 'customerEmail', 'customerPhone', 'customerLineId', 'nationality',
  'isForeigner', 'selectedAddons', 'travelDate', 'pickupTime', 'pickupHotel',
  'pickupZone', 'pickupZoneFee', 'roomNumber', 'sendBackHotel', 'specialRequests',
  'adults', 'children', 'infants', 'totalAmount', 'paymentMethod', 'promptPayIdUsed',
  'paymentStatus', 'orderStatus', 'slipUrl', 'slipUploadedAt', 'ticketImageUrl',
  'paidAt', 'createdAt', 'lineNotifySent', 'reminderSent', 'reminderSentAt', 'notes', 'updatedAt',
];

const CUSTOMER_ALLOWED_KEYS = [
  'id', 'name', 'email', 'phone', 'lineId', 'nationality',
  'totalBookings', 'totalSpent', 'lastBookingDate', 'createdAt',
];

const SUPPLIER_ALLOWED_KEYS = [
  'id', 'name', 'code', 'contactPerson', 'phone', 'email', 'lineId',
  'address', 'bankName', 'accountNo', 'accountName', 'bankAccount', 'notes', 'isActive', 'createdAt',
];

const REVIEW_ALLOWED_KEYS = [
  'id', 'tourId', 'userName', 'userAvatar', 'nationality', 'rating', 'comment',
  'date', 'verifiedBooking', 'photos', 'adminReply', 'adminReplyDate', 'isApproved',
];

const PUBLIC_CONFIG_KEYS = [
  'siteName', 'companyName', 'promptPayId', 'promptPayName', 'lineOaId',
  'contactPhone', 'contactEmail', 'address', 'tatLicenseNo', 'tatLicenseImgUrl',
  'facebookUrl', 'facebookMessengerUrl', 'updatedAt',
];

const PRIVATE_CONFIG_KEYS = [
  'adminPin', 'adminGoogleEmails', 'adminPermissions',
  'lineMessagingChannelAccessToken', 'lineMessagingUserId', 'lineNotifyToken', 'updatedAt',
];

export function sanitizeTourForFirestore(t: Tour): Record<string, any> {
  const validCategory = ['island', 'sunset', 'yacht', 'eco', 'sightseeing'].includes(t.category)
    ? t.category
    : 'island';
  const cleanId = (t.id || `tour-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const raw = pickAllowedKeys(
    {
      ...t,
      id: cleanId,
      slug: (t.slug || cleanId).slice(0, 128),
      category: validCategory,
      priceAdult: Math.max(0, Number(t.priceAdult) || 0),
      priceChild: Math.max(0, Number(t.priceChild) || 0),
      isVisible: t.isVisible !== false,
      images: Array.isArray(t.images) ? t.images.slice(0, 20) : [],
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 30) : [],
      location: typeof t.location === 'string' ? t.location.slice(0, 300) : '',
      updatedAt: new Date().toISOString(),
    },
    TOUR_ALLOWED_KEYS
  );
  return raw;
}

export function sanitizeBookingForFirestore(b: Booking): Record<string, any> {
  const cleanId = (b.id || `bk-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const cleanRef = (b.bookingRef || `TST-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
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
      totalAmount: Math.max(0, Number(b.totalAmount) || 0),
      paymentStatus: ['pending', 'slip_uploaded', 'verified', 'cancelled', 'refunded'].includes(b.paymentStatus)
        ? b.paymentStatus
        : 'pending',
      orderStatus: ['pending', 'confirmed', 'completed', 'cancelled'].includes(b.orderStatus)
        ? b.orderStatus
        : 'pending',
      slipUrl: typeof b.slipUrl === 'string' ? b.slipUrl.slice(0, 840000) : undefined,
      ticketImageUrl: typeof b.ticketImageUrl === 'string' ? b.ticketImageUrl.slice(0, 840000) : undefined,
      createdAt: String(b.createdAt || new Date().toISOString()).slice(0, 64),
      lineNotifySent: Boolean(b.lineNotifySent),
    },
    BOOKING_ALLOWED_KEYS
  );
}

export function sanitizeCustomerForFirestore(c: Customer): Record<string, any> {
  const cleanId = (c.id || `cust-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
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
  const cleanId = (s.id || `sup-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
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
  const cleanId = (r.id || `rev-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
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

async function bumpSyncMetadata(fieldKey?: string) {
  if (!isFirebaseAdminSignedIn()) return;
  try {
    const now = new Date().toISOString();
    const syncRef = doc(db, 'metadata', 'sync');
    const snap = await getDoc(syncRef);
    const prevVersion = snap.exists() && typeof snap.data()?.version === 'number' ? snap.data().version : 1;
    const payload: Record<string, any> = {
      ...(snap.exists() ? snap.data() : {}),
      version: prevVersion + 1,
      updatedAt: now,
    };
    if (fieldKey) {
      payload[fieldKey] = now;
    }
    await setDoc(syncRef, payload);
  } catch (e) {
    console.warn('[Firestore] bumpSyncMetadata warning:', e);
  }
}

export const cloudDbApi = {
  async checkConnection(): Promise<{ connected: boolean; projectId?: string; databaseId?: string; error?: string }> {
    try {
      await getDoc(doc(db, 'config', 'public'));
      return { connected: true };
    } catch (err: any) {
      return { connected: false, error: err?.message || 'Firestore connection failed' };
    }
  },

  async getDeletedIds(): Promise<{
    deletedTourIds: string[];
    deletedBookingIds: string[];
    deletedCustomerIds: string[];
    deletedReviewIds: string[];
    deletedSupplierIds: string[];
  } | null> {
    if (!isFirebaseAdminSignedIn()) return null;
    const path = 'metadata/deleted_ids';
    try {
      const snap = await getDoc(doc(db, 'metadata', 'deleted_ids'));
      if (!snap.exists()) {
        return {
          deletedTourIds: [],
          deletedBookingIds: [],
          deletedCustomerIds: [],
          deletedReviewIds: [],
          deletedSupplierIds: [],
        };
      }
      const d = snap.data() || {};
      return {
        deletedTourIds: Array.isArray(d.deletedTourIds) ? d.deletedTourIds : [],
        deletedBookingIds: Array.isArray(d.deletedBookingIds) ? d.deletedBookingIds : [],
        deletedCustomerIds: Array.isArray(d.deletedCustomerIds) ? d.deletedCustomerIds : [],
        deletedReviewIds: Array.isArray(d.deletedReviewIds) ? d.deletedReviewIds : [],
        deletedSupplierIds: Array.isArray(d.deletedSupplierIds) ? d.deletedSupplierIds : [],
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async saveDeletedIds(
    key: 'deletedTourIds' | 'deletedBookingIds' | 'deletedCustomerIds' | 'deletedReviewIds' | 'deletedSupplierIds',
    ids: string[]
  ): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'metadata/deleted_ids';
    try {
      const ref = doc(db, 'metadata', 'deleted_ids');
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() || {} : {};
      const next = {
        deletedTourIds: Array.isArray(current.deletedTourIds) ? current.deletedTourIds : [],
        deletedBookingIds: Array.isArray(current.deletedBookingIds) ? current.deletedBookingIds : [],
        deletedCustomerIds: Array.isArray(current.deletedCustomerIds) ? current.deletedCustomerIds : [],
        deletedReviewIds: Array.isArray(current.deletedReviewIds) ? current.deletedReviewIds : [],
        deletedSupplierIds: Array.isArray(current.deletedSupplierIds) ? current.deletedSupplierIds : [],
        [key]: Array.from(new Set(ids.filter(Boolean))).slice(0, 500),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(ref, next);
      await bumpSyncMetadata();
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getTours(): Promise<Tour[] | null> {
    const path = 'tours';
    try {
      const snap = isFirebaseAdminSignedIn()
        ? await getDocs(collection(db, 'tours'))
        : await getDocs(query(collection(db, 'tours'), where('isVisible', '==', true)));
      if (snap.empty) return [];
      return snap.docs.map((d) => d.data() as Tour);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async saveTour(tour: Tour): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const sanitized = sanitizeTourForFirestore(tour);
    const path = `tours/${sanitized.id}`;
    try {
      await setDoc(doc(db, 'tours', sanitized.id), sanitized);
      await bumpSyncMetadata('toursAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async saveTours(tours: Tour[]): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'tours';
    try {
      const existingSnap = await getDocs(collection(db, 'tours'));
      const incomingIds = new Set(tours.map((t) => sanitizeTourForFirestore(t).id));
      const batch = writeBatch(db);

      for (const existingDoc of existingSnap.docs) {
        if (!incomingIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
        }
      }

      for (const t of tours) {
        const sanitized = sanitizeTourForFirestore(t);
        batch.set(doc(db, 'tours', sanitized.id), sanitized);
      }

      await batch.commit();
      await bumpSyncMetadata('toursAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async deleteTour(id: string): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
    const path = `tours/${cleanId}`;
    try {
      await deleteDoc(doc(db, 'tours', cleanId));
      await bumpSyncMetadata('toursAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async getBookings(): Promise<Booking[] | null> {
    if (!isFirebaseAdminSignedIn()) return null;
    const path = 'bookings';
    try {
      const snap = await getDocs(collection(db, 'bookings'));
      return snap.docs.map((d) => d.data() as Booking);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async createBooking(booking: Booking): Promise<boolean> {
    const sanitized = sanitizeBookingForFirestore(booking);
    const path = `bookings/${sanitized.id}`;
    try {
      // Guest create must enforce pending status & lineNotifySent: false under rules
      if (!isFirebaseAdminSignedIn()) {
        sanitized.orderStatus = 'pending';
        sanitized.paymentStatus = sanitized.slipUrl ? 'slip_uploaded' : 'pending';
        sanitized.lineNotifySent = false;
      }
      await setDoc(doc(db, 'bookings', sanitized.id), sanitized);

      // Write non-PII status projection for public booking lookup
      await setDoc(doc(db, 'booking_status', sanitized.bookingRef), {
        bookingRef: sanitized.bookingRef,
        tourTitle: sanitized.tourTitle,
        travelDate: sanitized.travelDate,
        adults: sanitized.adults,
        children: sanitized.children || 0,
        infants: sanitized.infants || 0,
        totalAmount: sanitized.totalAmount,
        paymentStatus: sanitized.paymentStatus,
        orderStatus: sanitized.orderStatus,
        pickupZone: sanitized.pickupZone || 'General Zone',
        createdAt: sanitized.createdAt,
      }).catch(() => {});

      // Cache compressed slip in public_media so LINE crawler can fetch from /api/slip-image
      if (sanitized.slipUrl && sanitized.slipUrl.startsWith('data:image')) {
        const mimeMatch = sanitized.slipUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        await setDoc(doc(db, 'public_media', `slip_${sanitized.bookingRef}`), {
          id: `slip_${sanitized.bookingRef}`,
          data: sanitized.slipUrl.slice(0, 840000),
          mimeType,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      await bumpSyncMetadata('bookingsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async updateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
    const path = `bookings/${cleanId}`;
    try {
      const ref = doc(db, 'bookings', cleanId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      const existing = snap.data() as Booking;
      const cleanUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined && BOOKING_ALLOWED_KEYS.includes(k) && k !== 'id' && k !== 'bookingRef' && k !== 'createdAt') {
          cleanUpdates[k] = v === null ? '' : v;
        }
      }
      await updateDoc(ref, cleanUpdates);
      if (existing.bookingRef) {
        const statusRef = doc(db, 'booking_status', existing.bookingRef);
        const statusSnap = await getDoc(statusRef);
        if (statusSnap.exists()) {
          await updateDoc(statusRef, {
            paymentStatus: cleanUpdates.paymentStatus || existing.paymentStatus,
            orderStatus: cleanUpdates.orderStatus || existing.orderStatus,
          }).catch(() => {});
        }
      }
      await bumpSyncMetadata('bookingsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deleteBooking(id: string, bookingRef?: string): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
    const path = `bookings/${cleanId}`;
    try {
      await deleteDoc(doc(db, 'bookings', cleanId));
      if (bookingRef) {
        const cleanRef = bookingRef.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
        await deleteDoc(doc(db, 'booking_status', cleanRef)).catch(() => {});
      }
      await bumpSyncMetadata('bookingsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async getBookingStatus(bookingRef: string): Promise<Partial<Booking> | null> {
    try {
      const cleanRef = (bookingRef || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
      if (!cleanRef) return null;
      const snap = await getDoc(doc(db, 'booking_status', cleanRef));
      return snap.exists() ? (snap.data() as Partial<Booking>) : null;
    } catch {
      return null;
    }
  },

  async saveBookingsBackup(bookings: Booking[]): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'bookings';
    try {
      const existingSnap = await getDocs(collection(db, 'bookings'));
      const incomingIds = new Set(bookings.map((b) => sanitizeBookingForFirestore(b).id));
      const batch = writeBatch(db);

      for (const existingDoc of existingSnap.docs) {
        if (!incomingIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
        }
      }

      for (const b of bookings) {
        const sanitized = sanitizeBookingForFirestore(b);
        batch.set(doc(db, 'bookings', sanitized.id), sanitized);
      }

      await batch.commit();
      await bumpSyncMetadata('bookingsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getCustomers(): Promise<Customer[] | null> {
    if (!isFirebaseAdminSignedIn()) return null;
    const path = 'customers';
    try {
      const snap = await getDocs(collection(db, 'customers'));
      return snap.docs.map((d) => d.data() as Customer);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async saveCustomers(customers: Customer[]): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'customers';
    try {
      const existingSnap = await getDocs(collection(db, 'customers'));
      const incomingIds = new Set(customers.map((c) => sanitizeCustomerForFirestore(c).id));
      const batch = writeBatch(db);

      for (const existingDoc of existingSnap.docs) {
        if (!incomingIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
        }
      }

      for (const c of customers) {
        const sanitized = sanitizeCustomerForFirestore(c);
        batch.set(doc(db, 'customers', sanitized.id), sanitized);
      }

      await batch.commit();
      await bumpSyncMetadata('customersAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getSuppliers(): Promise<Supplier[] | null> {
    if (!isFirebaseAdminSignedIn()) return null;
    const path = 'suppliers';
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      return snap.docs.map((d) => d.data() as Supplier);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async saveSuppliers(suppliers: Supplier[]): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'suppliers';
    try {
      const existingSnap = await getDocs(collection(db, 'suppliers'));
      const incomingIds = new Set(suppliers.map((s) => sanitizeSupplierForFirestore(s).id));
      const batch = writeBatch(db);

      for (const existingDoc of existingSnap.docs) {
        if (!incomingIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
        }
      }

      for (const s of suppliers) {
        const sanitized = sanitizeSupplierForFirestore(s);
        batch.set(doc(db, 'suppliers', sanitized.id), sanitized);
      }

      await batch.commit();
      await bumpSyncMetadata('suppliersAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getReviews(): Promise<Review[] | null> {
    const path = 'reviews';
    try {
      const snap = isFirebaseAdminSignedIn()
        ? await getDocs(collection(db, 'reviews'))
        : await getDocs(query(collection(db, 'reviews'), where('isApproved', '==', true)));
      return snap.docs.map((d) => d.data() as Review);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async createReview(review: Review): Promise<boolean> {
    const sanitized = sanitizeReviewForFirestore(review);
    sanitized.isApproved = true;
    const path = `reviews/${sanitized.id}`;
    try {
      await setDoc(doc(db, 'reviews', sanitized.id), sanitized);
      await bumpSyncMetadata('reviewsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async saveReviews(reviews: Review[]): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'reviews';
    try {
      const existingSnap = await getDocs(collection(db, 'reviews'));
      const incomingIds = new Set(reviews.map((r) => sanitizeReviewForFirestore(r).id));
      const batch = writeBatch(db);

      for (const existingDoc of existingSnap.docs) {
        if (!incomingIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
        }
      }

      for (const r of reviews) {
        const sanitized = sanitizeReviewForFirestore(r);
        batch.set(doc(db, 'reviews', sanitized.id), sanitized);
      }

      await batch.commit();
      await bumpSyncMetadata('reviewsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getSettings(): Promise<Partial<AppSettings> | null> {
    const path = 'config/public';
    try {
      const pubSnap = await getDoc(doc(db, 'config', 'public'));
      let result: Record<string, any> = pubSnap.exists() ? pubSnap.data() : {};
      if (isFirebaseAdminSignedIn()) {
        try {
          const privSnap = await getDoc(doc(db, 'config', 'private'));
          if (privSnap.exists()) {
            result = { ...result, ...privSnap.data() };
          }
        } catch {}
      }
      return Object.keys(result).length > 0 ? (result as Partial<AppSettings>) : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async saveSettings(settings: AppSettings): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    const path = 'config/public';
    try {
      let safeTatImg = settings.tatLicenseImgUrl || '';
      if (safeTatImg.startsWith('data:image') && safeTatImg.length > 750000) {
        safeTatImg = await compressImageBase64(safeTatImg, 1100, 0.78);
      }
      const now = new Date().toISOString();
      const pubPayload = pickAllowedKeys(
        {
          ...settings,
          tatLicenseImgUrl: safeTatImg.slice(0, 840000),
          updatedAt: now,
        },
        PUBLIC_CONFIG_KEYS
      );
      const privPayload = pickAllowedKeys(
        {
          ...settings,
          adminGoogleEmails: Array.isArray(settings.adminGoogleEmails) && settings.adminGoogleEmails.length > 0
            ? settings.adminGoogleEmails
            : ['asmr9941@gmail.com'],
          updatedAt: now,
        },
        PRIVATE_CONFIG_KEYS
      );

      await Promise.all([
        setDoc(doc(db, 'config', 'public'), pubPayload),
        setDoc(doc(db, 'config', 'private'), privPayload),
      ]);
      await bumpSyncMetadata('settingsAt');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async saveVisitorAnalytics(analytics: VisitorAnalytics): Promise<boolean> {
    const path = 'metadata/visitor_analytics';
    try {
      await setDoc(doc(db, 'metadata', 'visitor_analytics'), {
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
        lastUpdated: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  },

  async getVisitorAnalytics(): Promise<VisitorAnalytics | null> {
    try {
      const snap = await getDoc(doc(db, 'metadata', 'visitor_analytics'));
      return snap.exists() ? (snap.data() as VisitorAnalytics) : null;
    } catch {
      return null;
    }
  },

  // Initial one-time migration helper: seeds Firestore from local/server data ONLY when Firestore tours is empty
  async seedIfFirestoreEmpty(seed: {
    tours: Tour[];
    suppliers: Supplier[];
    reviews: Review[];
    settings: AppSettings;
  }): Promise<boolean> {
    if (!isFirebaseAdminSignedIn()) return false;
    try {
      const [toursSnap, delSnap] = await Promise.all([
        getDocs(collection(db, 'tours')),
        getDoc(doc(db, 'metadata', 'deleted_ids')),
      ]);
      if (!toursSnap.empty || (delSnap.exists() && Array.isArray(delSnap.data()?.deletedTourIds) && delSnap.data()?.deletedTourIds.length > 0)) {
        return false; // Already seeded or intentionally emptied
      }
      await Promise.all([
        this.saveTours(seed.tours),
        this.saveSuppliers(seed.suppliers),
        this.saveReviews(seed.reviews),
        this.saveSettings(seed.settings),
      ]);
      return true;
    } catch {
      return false;
    }
  },
};
