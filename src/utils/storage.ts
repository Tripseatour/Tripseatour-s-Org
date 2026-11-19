/**
 * Safe LocalStorage Helper with QuotaExceededError protection and automatic payload trimming
 */

// Compress base64 image for lightweight storage and faster loading
export async function compressImageBase64(dataUrl: string, maxDim = 900, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If already small (< 60KB), don't process
  if (dataUrl.length < 80000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const clone: Record<string, any> = { ...obj };

  // Strip heavy base64 strings (>20KB) from known image fields
  const imageFields = ['slipUrl', 'ticketImageUrl', 'tatLicenseImgUrl', 'tourImage', 'imageUrl', 'userAvatar'];
  for (const field of imageFields) {
    const val = clone[field];
    if (typeof val === 'string' && val.startsWith('data:image') && val.length > 20000) {
      clone[field] = field === 'tourImage' || field === 'imageUrl'
        ? 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
        : '';
    }
  }

  if (Array.isArray(clone.images)) {
    clone.images = clone.images.map((img: string) => {
      if (typeof img === 'string' && img.startsWith('data:image') && img.length > 20000) {
        return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
      }
      return img;
    });
  }

  if (Array.isArray(clone.photos)) {
    clone.photos = clone.photos.map((img: string) => {
      if (typeof img === 'string' && img.startsWith('data:image') && img.length > 20000) {
        return '';
      }
      return img;
    }).filter(Boolean);
  }

  return clone;
}

// Strip very large base64 strings (>20KB) for localStorage storage fallback
function sanitizePayloadForLocalStorage(value: any): any {
  if (!value) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return sanitizeObject(parsed);
  } catch {
    return value;
  }
}

const HEAVY_CACHE_KEYS = [
  'tst_tours',
  'tst_settings',
  'tst_reviews',
  'tst_customers',
  'tst_suppliers',
  'tst_last_tours_saved_at',
  'tst_tour_draft',
  'tst_live_chat_draft',
  'tst_last_active_tab',
  'local_fallback_bookings',
];

/**
 * Safely store an item in localStorage without throwing QuotaExceededError
 */
export function safeSetLocalStorage(key: string, data: any): boolean {
  try {
    let serialized = typeof data === 'string' ? data : JSON.stringify(data);

    // Pre-emptively sanitize heavy media blobs if payload exceeds 250KB so localStorage never fills up
    if (serialized.length > 250000) {
      const sanitized = sanitizePayloadForLocalStorage(data);
      serialized = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
    }

    // If still > 1.5MB for non-critical heavy caches, skip caching locally (cloud DB is authoritative)
    if (serialized.length > 1500000 && (key === 'tst_tours' || key === 'tst_settings')) {
      return false;
    }

    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] localStorage.setItem failed for key "${key}":`, err?.message || err);

    try {
      // Evict heavy cache keys first so critical keys (deleted IDs, bookings, auth) NEVER fail to save
      HEAVY_CACHE_KEYS.forEach((k) => {
        if (k !== key) {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        }
      });

      const sanitized = sanitizePayloadForLocalStorage(data);
      const reserialized = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);

      localStorage.setItem(key, reserialized);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Safely get an item from localStorage
 */
export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
