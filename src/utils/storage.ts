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

// Strip very large base64 strings (>50KB) for localStorage storage fallback
function sanitizePayloadForLocalStorage(value: any): any {
  if (!value) return value;

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (item && typeof item === 'object') {
          const clone = { ...item };
          // If tour has images array with huge base64 strings
          if (Array.isArray(clone.images)) {
            clone.images = clone.images.map((img: string) => {
              if (typeof img === 'string' && img.startsWith('data:image') && img.length > 50000) {
                // Keep a lightweight placeholder so UI still functions
                return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
              }
              return img;
            });
          }
          return clone;
        }
        return item;
      });
    }

    return parsed;
  } catch {
    return value;
  }
}

/**
 * Safely store an item in localStorage without throwing QuotaExceededError
 */
export function safeSetLocalStorage(key: string, data: any): boolean {
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] localStorage.setItem failed for key "${key}":`, err?.message || err);

    // If quota exceeded, sanitize heavy base64 images and retry
    try {
      // 1. Clear old non-critical scratch keys
      const nonCriticalKeys = [
        'tst_last_tours_saved_at',
        'tst_tour_draft',
        'tst_live_chat_draft',
        'tst_last_active_tab'
      ];
      nonCriticalKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });

      // 2. Sanitize payload by removing heavy inline Base64 data
      const sanitized = sanitizePayloadForLocalStorage(data);
      const reserialized = JSON.stringify(sanitized);

      localStorage.setItem(key, reserialized);
      console.log(`[SafeStorage] Successfully saved sanitized version of "${key}" after quota recovery.`);
      return true;
    } catch (retryErr) {
      console.warn(`[SafeStorage] Quota exceeded persistently for "${key}". Data is retained in React state and synced to database.`);
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
