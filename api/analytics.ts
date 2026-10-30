import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tljofqremlconawmtndd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

function getDefaultVisitorAnalytics() {
  const dailyHistory: Array<{ date: string; views: number; uniques: number }> = [];
  const now = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const views = 140 + Math.floor(Math.sin(i * 1.5) * 45) + (i % 3) * 20;
    const uniques = Math.floor(views * 0.62) + (i % 2) * 5;
    dailyHistory.push({
      date: dateStr,
      views,
      uniques
    });
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

function getClientLocation(req: any, clientTimezone?: string, clientLang?: string) {
  const rawIp = (req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  const isLocal = rawIp === '127.0.0.1' || rawIp === '::1' || rawIp.startsWith('192.168.') || rawIp.startsWith('10.');
  const ipMasked = isLocal ? '127.0.0.1 (Local)' : rawIp.replace(/\.\d+$/, '.xxx');

  let countryCode = (req.headers?.['cf-ipcountry'] || req.headers?.['x-vercel-ip-country'] || req.headers?.['x-country-code'] || '').toString().toUpperCase();
  const city = (req.headers?.['x-vercel-ip-city'] || '').toString();

  if (!countryCode) {
    if (clientTimezone?.includes('Bangkok') || clientLang?.toLowerCase().startsWith('th')) {
      countryCode = 'TH';
    } else if (clientTimezone?.includes('Shanghai') || clientLang?.toLowerCase().startsWith('zh')) {
      countryCode = 'CN';
    } else if (clientTimezone?.includes('Moscow') || clientLang?.toLowerCase().startsWith('ru')) {
      countryCode = 'RU';
    } else if (clientTimezone?.includes('London') || clientTimezone?.includes('Europe')) {
      countryCode = 'GB';
    } else if (clientTimezone?.includes('America') || clientTimezone?.includes('New_York')) {
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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const loadAnalytics = async () => {
    try {
      const { data } = await supabase.from('app_store').select('value').eq('key', 'visitor_analytics').maybeSingle();
      if (data && data.value) {
        const parsed = JSON.parse(data.value);
        if (parsed && typeof parsed.totalPageviews === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('loadAnalytics error:', e);
    }
    return getDefaultVisitorAnalytics();
  };

  const saveAnalytics = async (analytics: any) => {
    try {
      await supabase.from('app_store').upsert({
        key: 'visitor_analytics',
        value: JSON.stringify(analytics),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (e) {
      console.warn('saveAnalytics error:', e);
    }
  };

  try {
    const action = req.query?.action || (req.url?.includes('live') ? 'live' : req.url?.includes('reset') ? 'reset' : req.url?.includes('mode') ? 'mode' : (req.url?.includes('ping') ? 'ping' : 'stats'));

    // 1. GET: Return statistics or live sessions
    if (req.method === 'GET' || action === 'stats' || action === 'live') {
      const stats = await loadAnalytics();
      const nowMs = Date.now();
      
      // Clean stale live sessions older than 3 minutes
      let live = Array.isArray(stats.liveSessions) ? stats.liveSessions : [];
      live = live.filter((s: any) => {
        const pingTime = new Date(s.lastPing).getTime();
        return nowMs - pingTime <= 180000;
      });
      live.forEach((s: any) => {
        s.lastPingSecondsAgo = Math.max(0, Math.floor((nowMs - new Date(s.lastPing).getTime()) / 1000));
      });
      live.sort((a: any, b: any) => new Date(b.lastPing).getTime() - new Date(a.lastPing).getTime());

      stats.liveSessions = live;
      stats.activeNow = live.length;

      if (action === 'live') {
        return res.status(200).json({
          activeNow: live.length,
          liveSessions: live,
          lastUpdated: new Date().toISOString()
        });
      }

      return res.status(200).json(stats);
    }

    // 2. POST /reset: Start tracking fresh from 0
    if (req.method === 'POST' && (action === 'reset' || req.url?.includes('reset'))) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const mode = body.mode || 'real_zero';
      const todayStr = new Date().toISOString().split('T')[0];

      let fresh: any;
      if (mode === 'baseline') {
        fresh = getDefaultVisitorAnalytics();
        fresh.isRealModeOnly = false;
      } else {
        fresh = {
          totalPageviews: 1,
          totalUniqueVisitors: 1,
          todayPageviews: 1,
          todayUniqueVisitors: 1,
          yesterdayPageviews: 0,
          yesterdayUniqueVisitors: 0,
          activeNow: 1,
          isRealModeOnly: true,
          liveSessions: [],
          dailyHistory: [{ date: todayStr, views: 1, uniques: 1 }],
          devices: { mobile: 1, desktop: 0, tablet: 0 },
          topPages: [{ path: 'home', title: 'หน้าแรก', views: 1 }],
          sources: [{ source: 'Direct / ค้นหาตรง', count: 1, percentage: 100 }],
          recentVisitors: [],
          lastUpdated: new Date().toISOString()
        };
      }
      await saveAnalytics(fresh);
      return res.status(200).json({ success: true, mode, visitorAnalytics: fresh });
    }

    // 3. POST /ping: Increment live pageview & update session
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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
      } = body;

      const current = await loadAnalytics();
      const todayStr = new Date().toISOString().split('T')[0];
      const nowMs = Date.now();
      const loc = getClientLocation(req, timezone, language);
      const effectiveVisitorId = (visitorId && visitorId.length > 3) ? visitorId : `v-${Math.random().toString(36).substring(2, 8)}`;
      const effectiveDevice = (device === 'desktop' || device === 'tablet' || device === 'mobile') ? device : 'mobile';

      // Update Live Sessions list
      let liveSessions: any[] = Array.isArray(current.liveSessions) ? current.liveSessions : [];
      liveSessions = liveSessions.filter((s: any) => (nowMs - new Date(s.lastPing).getTime()) <= 180000);

      const existingLiveIdx = liveSessions.findIndex((s: any) => s.visitorId === effectiveVisitorId);
      if (existingLiveIdx >= 0) {
        liveSessions[existingLiveIdx].lastPing = new Date().toISOString();
        liveSessions[existingLiveIdx].currentPage = page || 'home';
        if (title) liveSessions[existingLiveIdx].pageTitle = title;
        liveSessions[existingLiveIdx].device = effectiveDevice;
        liveSessions[existingLiveIdx].pageviewsCount = (liveSessions[existingLiveIdx].pageviewsCount || 1) + 1;
      } else {
        liveSessions.unshift({
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
          firstSeen: new Date().toISOString(),
          lastPing: new Date().toISOString(),
          lastPingSecondsAgo: 0,
          pageviewsCount: 1
        });
      }

      current.liveSessions = liveSessions;
      current.activeNow = liveSessions.length;

      // Check daily history
      if (!Array.isArray(current.dailyHistory)) {
        current.dailyHistory = [];
      }
      let todayEntry = current.dailyHistory.find((d: any) => d.date === todayStr);
      if (!todayEntry) {
        current.yesterdayPageviews = current.todayPageviews || 0;
        current.yesterdayUniqueVisitors = current.todayUniqueVisitors || 0;
        current.todayPageviews = 0;
        current.todayUniqueVisitors = 0;
        todayEntry = { date: todayStr, views: 0, uniques: 0 };
        current.dailyHistory.push(todayEntry);
        if (current.dailyHistory.length > 14) {
          current.dailyHistory = current.dailyHistory.slice(-14);
        }
      }

      // Increment counters
      current.totalPageviews = (current.totalPageviews || 0) + 1;
      current.todayPageviews = (current.todayPageviews || 0) + 1;
      todayEntry.views = (todayEntry.views || 0) + 1;

      // Unique check
      const isNewVisitor = existingLiveIdx < 0;
      if (isNewVisitor) {
        current.todayUniqueVisitors = (current.todayUniqueVisitors || 0) + 1;
        current.totalUniqueVisitors = (current.totalUniqueVisitors || 0) + 1;
        todayEntry.uniques = (todayEntry.uniques || 0) + 1;
      }

      // Device counts
      if (!current.devices) current.devices = { mobile: 0, desktop: 0, tablet: 0 };
      if (effectiveDevice === 'desktop') current.devices.desktop++;
      else if (effectiveDevice === 'tablet') current.devices.tablet++;
      else current.devices.mobile++;

      // Top Pages
      if (!Array.isArray(current.topPages)) current.topPages = [];
      const pageKey = page || 'home';
      const existingPage = current.topPages.find((p: any) => p.path === pageKey);
      if (existingPage) {
        existingPage.views = (existingPage.views || 0) + 1;
      } else {
        current.topPages.push({ path: pageKey, title: title || pageKey, views: 1 });
      }
      current.topPages.sort((a: any, b: any) => b.views - a.views);

      // Traffic Sources
      if (!Array.isArray(current.sources)) current.sources = [];
      const srcKey = referrer || 'Direct';
      let existingSrc = current.sources.find((s: any) => s.source.toLowerCase().includes(srcKey.toLowerCase()));
      if (existingSrc) {
        existingSrc.count = (existingSrc.count || 0) + 1;
      } else {
        current.sources.push({ source: srcKey, count: 1, percentage: 1 });
      }
      const totalSrcCount = current.sources.reduce((sum: number, s: any) => sum + s.count, 0);
      current.sources.forEach((s: any) => {
        s.percentage = totalSrcCount > 0 ? Number(((s.count / totalSrcCount) * 100).toFixed(1)) : 0;
      });

      // Recent visitors list
      if (!Array.isArray(current.recentVisitors)) current.recentVisitors = [];
      current.recentVisitors.unshift({
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
      if (current.recentVisitors.length > 30) {
        current.recentVisitors = current.recentVisitors.slice(0, 30);
      }

      current.lastUpdated = new Date().toISOString();
      await saveAnalytics(current);

      return res.status(200).json({
        totalPageviews: current.totalPageviews,
        totalUniqueVisitors: current.totalUniqueVisitors,
        todayPageviews: current.todayPageviews,
        todayUniqueVisitors: current.todayUniqueVisitors,
        yesterdayPageviews: current.yesterdayPageviews,
        activeNow: current.activeNow,
        liveSessions: current.liveSessions
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ error: error?.message || 'Server error' });
  }
}

