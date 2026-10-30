import { VisitorAnalytics, VisitorPingPayload } from '../types';

const VISITOR_ID_KEY = 'tst_visitor_id';
const LOCAL_ANALYTICS_KEY = 'tst_visitor_analytics_cache';

// Detect device type from userAgent and screen width
export function getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 768 && width <= 1024)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || width < 768) {
    return 'mobile';
  }
  return 'desktop';
}

// Generate or retrieve persistent anonymous visitor ID
export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = 'v-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).substring(2, 9);
  }
}

// Detect human-friendly traffic source
export function getTrafficSource(): string {
  if (typeof document === 'undefined') return 'Direct';
  const ref = document.referrer ? document.referrer.toLowerCase() : '';
  if (!ref) return 'Direct';
  if (ref.includes('google.')) return 'Google Search';
  if (ref.includes('facebook.') || ref.includes('fb.me') || ref.includes('m.me')) return 'Facebook';
  if (ref.includes('line.me') || ref.includes('line://')) return 'LINE';
  if (ref.includes('instagram.')) return 'Instagram';
  if (ref.includes('tiktok.')) return 'TikTok';
  if (ref.includes('twitter.') || ref.includes('x.com')) return 'X / Twitter';
  if (ref.includes('youtube.')) return 'YouTube';
  try {
    const url = new URL(ref);
    return url.hostname.replace('www.', '');
  } catch {
    return 'Referral';
  }
}

// Detect browser name
export function getBrowserName(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Line\//i.test(ua)) return 'LINE In-App';
  if (/FBAV|FBAN/i.test(ua)) return 'Facebook In-App';
  if (/Instagram/i.test(ua)) return 'Instagram In-App';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) return 'Safari';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if (/Opera|OPR/i.test(ua)) return 'Opera';
  return 'Browser';
}

// Detect OS name
export function getOSName(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'OS';
}

// Record pageview / heartbeat to backend
export async function trackPageView(page: string, title?: string): Promise<Partial<VisitorAnalytics> | null> {
  if (typeof window === 'undefined') return null;

  const payload: VisitorPingPayload = {
    visitorId: getVisitorId(),
    page: page || 'home',
    title: title || document.title || 'Trip Sea Tour Phuket',
    referrer: getTrafficSource(),
    device: getDeviceType(),
    browser: getBrowserName(),
    os: getOSName(),
    screen: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language || 'th-TH',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok'
  };

  try {
    const res = await fetch('/api/analytics/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        try {
          localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch (err) {
    // Ignore network error silently
  }

  return null;
}

// Fetch complete visitor analytics
export async function fetchVisitorAnalytics(): Promise<VisitorAnalytics | null> {
  try {
    const res = await fetch('/api/analytics/stats', { cache: 'no-store' }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.totalPageviews === 'number') {
        try {
          localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch {}

  // Fallback to cached
  try {
    const cached = localStorage.getItem(LOCAL_ANALYTICS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return null;
}

// Reset visitor analytics (e.g. start fresh from 0 real visitors)
export async function resetVisitorAnalytics(mode: 'real_zero' | 'baseline' = 'real_zero'): Promise<VisitorAnalytics | null> {
  try {
    const res = await fetch('/api/analytics/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.visitorAnalytics) {
        try {
          localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(data.visitorAnalytics));
        } catch {}
        return data.visitorAnalytics;
      }
    }
  } catch (e) {
    console.error('Reset analytics error:', e);
  }
  return null;
}

// Toggle between pure real data mode and cumulative baseline mode
export async function toggleRealModeAnalytics(isRealModeOnly: boolean): Promise<VisitorAnalytics | null> {
  try {
    const res = await fetch('/api/analytics/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRealModeOnly })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.visitorAnalytics) {
        try {
          localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(data.visitorAnalytics));
        } catch {}
        return data.visitorAnalytics;
      }
    }
  } catch (e) {
    console.error('Toggle real mode error:', e);
  }
  return null;
}
