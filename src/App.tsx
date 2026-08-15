import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { TourCard } from './components/TourCard';
import { TourDetailModal } from './components/TourDetailModal';
import { ItineraryModal } from './components/ItineraryModal';
import { BookingModal } from './components/BookingModal';
import { BookingLookupModal } from './components/BookingLookupModal';
import { CustomerReviewSection } from './components/CustomerReviewSection';
import { HowToBookSection } from './components/HowToBookSection';
import { TatLicenseCertificate } from './components/TatLicenseCertificate';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAuthModal } from './components/AdminAuthModal';
import { TripSeaAiChatbot } from './components/TripSeaAiChatbot';

import { Tour, Booking, Review, Customer, AppSettings, LineNotificationLog, Language, AdminUser } from './types';
import { Currency } from './utils/currency';
import { translations } from './data/translations';
import { initialTours, initialBookings, initialReviews, initialCustomers, initialSettings } from './data/mockData';
import { Compass, Sparkles, Filter, Ticket, QrCode, Phone, MessageCircle, ShieldCheck } from 'lucide-react';
import { supabaseApi } from './lib/supabase';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('TH');
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('THB');
  const [activeView, setActiveView] = useState<'home' | 'how-to-book' | 'about-me' | 'admin'>('home');

  // Admin Security Auth State (Google Account or PIN)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tst_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('tst_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);

  // Backend Data with localStorage cache
  const [tours, setTours] = useState<Tour[]>(() => {
    try {
      const saved = localStorage.getItem('tst_tours');
      return saved ? JSON.parse(saved) : initialTours;
    } catch {
      return initialTours;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('tst_bookings');
      return saved ? JSON.parse(saved) : initialBookings;
    } catch {
      return initialBookings;
    }
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem('tst_reviews');
      return saved ? JSON.parse(saved) : initialReviews;
    } catch {
      return initialReviews;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('tst_customers');
      return saved ? JSON.parse(saved) : initialCustomers;
    } catch {
      return initialCustomers;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('tst_settings');
      return saved ? JSON.parse(saved) : initialSettings;
    } catch {
      return initialSettings;
    }
  });

  const [lineLogs, setLineLogs] = useState<LineNotificationLog[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'priceLow' | 'priceHigh' | 'rating'>('recommended');

  // Active Modals
  const [detailTour, setDetailTour] = useState<Tour | null>(null);
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  const [itineraryTour, setItineraryTour] = useState<Tour | null>(null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync status state & server version tracking
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toLocaleTimeString('th-TH'));
  const lastServerVersionRef = React.useRef<number>(0);
  const lastMutationTimeRef = React.useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch initial data & auto-sync with version / lastUpdatedAt check
  const loadInitialData = useCallback(async (forceReload: boolean = false) => {
    try {
      setSyncStatus('syncing');

      // Skip background sync overwrite if user recently performed a mutation (<10 sec ago)
      if (!forceReload && Date.now() - lastMutationTimeRef.current < 10000) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
        return;
      }

      // 1. Check server version first
      let serverVersion: number | null = null;
      try {
        const syncRes = await fetch('/api/sync-status', { cache: 'no-store' });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          serverVersion = syncData.version;
        }
      } catch (e) {}

      // If server version has NOT changed and we are not forcing reload, skip heavy re-renders
      if (!forceReload && serverVersion !== null && serverVersion === lastServerVersionRef.current && lastServerVersionRef.current > 0) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
        return;
      }

      // 2. Fetch latest from server APIs
      const [resTours, resBookings, resReviews, resCustomers, resSettings, resLogs] = await Promise.all([
        fetch('/api/tours', { cache: 'no-store' }).catch(() => null),
        fetch('/api/bookings', { cache: 'no-store' }).catch(() => null),
        fetch('/api/reviews', { cache: 'no-store' }).catch(() => null),
        fetch('/api/customers', { cache: 'no-store' }).catch(() => null),
        fetch('/api/settings', { cache: 'no-store' }).catch(() => null),
        fetch('/api/line/logs', { cache: 'no-store' }).catch(() => null)
      ]);

      let serverTours: Tour[] | null = null;
      let serverBookings: Booking[] | null = null;
      let serverReviews: Review[] | null = null;
      let serverCustomers: Customer[] | null = null;
      let serverSettings: AppSettings | null = null;

      if (resTours && resTours.ok) serverTours = await resTours.json().catch(() => null);
      if (resBookings && resBookings.ok) serverBookings = await resBookings.json().catch(() => null);
      if (resReviews && resReviews.ok) serverReviews = await resReviews.json().catch(() => null);
      if (resCustomers && resCustomers.ok) serverCustomers = await resCustomers.json().catch(() => null);
      if (resSettings && resSettings.ok) serverSettings = await resSettings.json().catch(() => null);
      if (resLogs && resLogs.ok) {
        const logs = await resLogs.json().catch(() => null);
        if (logs) setLineLogs(logs);
      }

      // Supabase direct fallback ONLY if server API returned null (e.g. server offline / Vercel SPA)
      if (serverBookings === null) {
        const directBookings = await supabaseApi.getBookings();
        if (directBookings !== null) {
          serverBookings = directBookings;
        } else {
          serverBookings = initialBookings;
          supabaseApi.saveBookingsBackup(initialBookings).catch(() => {});
        }
      }
      if (!serverSettings) {
        const directSettings = await supabaseApi.getSettings();
        if (directSettings) {
          serverSettings = directSettings;
        } else {
          serverSettings = initialSettings;
          supabaseApi.saveSettings(initialSettings).catch(() => {});
        }
      }
      if (serverTours === null) {
        const directTours = await supabaseApi.getTours();
        if (directTours !== null) {
          serverTours = directTours;
        } else {
          serverTours = initialTours;
          supabaseApi.saveTours(initialTours).catch(() => {});
        }
      }
      if (serverCustomers === null) {
        const directCustomers = await supabaseApi.getCustomers();
        if (directCustomers !== null) {
          serverCustomers = directCustomers;
        } else {
          serverCustomers = initialCustomers;
          supabaseApi.saveCustomers(initialCustomers).catch(() => {});
        }
      }
      if (serverReviews === null) {
        const directReviews = await supabaseApi.getReviews();
        if (directReviews !== null) {
          serverReviews = directReviews;
        } else {
          serverReviews = initialReviews;
          supabaseApi.saveReviews(initialReviews).catch(() => {});
        }
      }

      // Update state & replace localStorage cache authoritatively
      if (serverTours && Array.isArray(serverTours)) {
        setTours(serverTours);
        localStorage.setItem('tst_tours', JSON.stringify(serverTours));
      }
      if (serverBookings && Array.isArray(serverBookings)) {
        setBookings(serverBookings);
        localStorage.setItem('tst_bookings', JSON.stringify(serverBookings));
      }
      if (serverReviews && Array.isArray(serverReviews)) {
        setReviews(serverReviews);
        localStorage.setItem('tst_reviews', JSON.stringify(serverReviews));
      }
      if (serverCustomers && Array.isArray(serverCustomers)) {
        setCustomers(serverCustomers);
        localStorage.setItem('tst_customers', JSON.stringify(serverCustomers));
      }
      if (serverSettings && serverSettings.promptPayId) {
        setSettings(serverSettings);
        localStorage.setItem('tst_settings', JSON.stringify(serverSettings));
      }

      if (serverVersion !== null) {
        lastServerVersionRef.current = serverVersion;
      }
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
    } catch (err) {
      console.error('Error loading data from server/Supabase:', err);
      setSyncStatus('error');
    }
  }, []);

  const handleForcePurgeAndSync = async () => {
    try {
      localStorage.removeItem('tst_bookings');
      localStorage.removeItem('tst_customers');
      localStorage.removeItem('tst_tours');
      localStorage.removeItem('tst_reviews');
      localStorage.removeItem('tst_settings');
      lastServerVersionRef.current = -1;
      await loadInitialData(true);
      showToast('🔄 ล้างแคชเครื่องและรีเซ็ตข้อมูลจากฐานข้อมูลหลักเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error purging local storage:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Auto-refresh interval (every 10s) to keep dashboard and orders fully live
    const interval = setInterval(() => {
      loadInitialData();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadInitialData]);

  // Filter & Sort Tours
  const filteredTours = tours
    .filter((t) => {
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const titleStr = (t.title[currentLang] || t.title.TH).toLowerCase();
      const descStr = (t.description[currentLang] || t.description.TH).toLowerCase();
      const queryLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || titleStr.includes(queryLower) || descStr.includes(queryLower) || t.tags.some(tag => tag.toLowerCase().includes(queryLower));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'priceLow') return a.priceAdult - b.priceAdult;
      if (sortBy === 'priceHigh') return b.priceAdult - a.priceAdult;
      if (sortBy === 'rating') return b.rating - a.rating;
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });

  // Centralized LINE Notification Dispatcher (Serverless & Express Multi-Route Resilient)
  const dispatchLineNotification = async (
    message: string,
    bookingRef: string = 'TEST',
    type: 'NEW_ORDER' | 'PAYMENT_VERIFIED' | 'ORDER_CONFIRMED' | 'REMINDER_24H' | 'TEST' = 'TEST',
    imageUrl?: string,
    ticketImageUrl?: string,
    slipImageUrl?: string
  ): Promise<{ success: boolean; logItem?: LineNotificationLog; error?: string }> => {
    const payload = {
      message,
      bookingRef,
      type,
      imageUrl,
      ticketImageUrl,
      slipImageUrl,
      slipUrl: slipImageUrl,
      channelToken: settings.lineMessagingChannelAccessToken || initialSettings.lineMessagingChannelAccessToken,
      targetId: settings.lineMessagingUserId || initialSettings.lineMessagingUserId,
    };

    const endpoints = ['/api/send-line', '/api/line/notify', '/api/line-notify'];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && (data.logItem || data.success !== undefined || data.status)) {
            const logItem: LineNotificationLog = data.logItem || {
              id: `log-${Date.now()}`,
              bookingRef,
              type,
              message,
              status: (data.success || data.status === 'sent') ? 'sent' : 'failed',
              timestamp: new Date().toISOString()
            };
            setLineLogs(prev => [logItem, ...prev.filter(l => l.id !== logItem.id)]);
            return { success: data.success ?? (logItem.status === 'sent'), logItem, error: data.error };
          }
        }
      } catch (err) {
        console.warn(`Dispatch attempt at ${endpoint} failed:`, err);
      }
    }

    const fallbackLog: LineNotificationLog = {
      id: `log-local-${Date.now()}`,
      bookingRef,
      type,
      message: `📱 [โหมดพรีวิว] ${message}`,
      status: 'simulated',
      timestamp: new Date().toISOString()
    };
    setLineLogs(prev => [fallbackLog, ...prev]);
    return { success: false, logItem: fallbackLog, error: 'Cannot connect to LINE API' };
  };

  // Handlers for Booking
  const handleBookingCreated = (newBooking: Booking) => {
    lastMutationTimeRef.current = Date.now();
    const nextBookings = [newBooking, ...bookings];
    setBookings(nextBookings);
    localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));

    // Save to Supabase (works on Vercel and production)
    supabaseApi.createBooking(newBooking).catch(() => {});
    supabaseApi.saveBookingsBackup(nextBookings).catch(() => {});

    // Dispatch real LINE alert to Group with Ticket & Slip images
    const lineMsg = `🔔 [มีออเดอร์ใหม่] รหัส ${newBooking.bookingRef}\n` +
      `📍 ทัวร์: ${newBooking.tourTitle}\n` +
      `👤 ลูกค้า: ${newBooking.customerName} (${newBooking.customerPhone})\n` +
      `💰 ยอดชำระ: ฿${newBooking.totalAmount.toLocaleString()}\n` +
      `📅 วันเดินทาง: ${newBooking.travelDate}\n` +
      `🏨 โรงแรมรับ: ${newBooking.pickupHotel} (ห้อง ${newBooking.roomNumber || '-'})\n` +
      `👥 จำนวน: ผู้ใหญ่ ${newBooking.adults} ท่าน / เด็ก ${newBooking.children || 0} ท่าน\n` +
      `💳 สถานะ: ${newBooking.paymentStatus === 'slip_uploaded' ? 'แนบสลิปแล้ว (รอตรวจ)' : 'รอชำระเงิน'}\n` +
      `🎟️ ตั๋ว E-Ticket และสลิปโอนเงินแนบมาในรูปภาพด้านบน`;

    dispatchLineNotification(
      lineMsg, 
      newBooking.bookingRef, 
      'NEW_ORDER', 
      newBooking.tourImage,
      newBooking.ticketImageUrl,
      newBooking.slipUrl
    );

    showToast(`🟢 สั่งจองทัวร์สำเร็จ! รหัส ${newBooking.bookingRef} - ส่งแจ้งเตือน LINE พร้อมรูปตั๋วและสลิปแล้ว`);
  };

  const handleUpdateBookingStatus = async (id: string, paymentStatus: string, orderStatus: string) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const nextBookings = bookings.map(b => b.id === id ? { 
        ...b, 
        paymentStatus: paymentStatus as any, 
        orderStatus: orderStatus as any, 
        paidAt: paymentStatus === 'verified' ? new Date().toISOString() : b.paidAt,
        orderStatusLocal: orderStatus === 'confirmed' ? 'confirmed' : b.orderStatus
      } : b);
      setBookings(nextBookings);
      localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));

      const updatedBooking = nextBookings.find(b => b.id === id);
      if (updatedBooking) {
        showToast(`✅ อัปเดตสถานะการจองของ ${updatedBooking.customerName} เรียบร้อยแล้ว`);
        
        if (paymentStatus === 'verified') {
          const verifiedMsg = `🟢 [ยืนยันชำระเงินสำเร็จ & ออกตั๋ว] รหัส ${updatedBooking.bookingRef}\n` +
            `📍 ทัวร์: ${updatedBooking.tourTitle}\n` +
            `👤 ลูกค้า: ${updatedBooking.customerName} (${updatedBooking.customerPhone})\n` +
            `💰 ยอดรับชำระ: ฿${updatedBooking.totalAmount.toLocaleString()} (PromptPay ยืนยันแล้ว)\n` +
            `📅 วันเดินทาง: ${updatedBooking.travelDate}\n` +
            `🏨 โรงแรมรับ: ${updatedBooking.pickupHotel} (ห้อง ${updatedBooking.roomNumber || '-'})\n` +
            `🎉 ออกตั๋ว E-Ticket E-Voucher เรียบร้อย พร้อมเดินทาง!`;
          dispatchLineNotification(
            verifiedMsg, 
            updatedBooking.bookingRef, 
            'PAYMENT_VERIFIED', 
            updatedBooking.tourImage,
            updatedBooking.ticketImageUrl,
            updatedBooking.slipUrl
          );
        }
      }

      // Sync to Supabase
      supabaseApi.updateBooking(id, { 
        paymentStatus: paymentStatus as any, 
        orderStatus: (paymentStatus === 'verified' ? 'confirmed' : orderStatus) as any,
        paidAt: paymentStatus === 'verified' ? new Date().toISOString() : undefined 
      }).catch(() => {});
      supabaseApi.saveBookingsBackup(nextBookings).catch(() => {});

      // Sync to Express API
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, orderStatus }),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const targetBooking = bookings.find(b => b.id === id || b.bookingRef === id);
      const bookingRef = targetBooking?.bookingRef || id;
      const actualId = targetBooking?.id || id;

      const nextBookings = bookings.filter(b => b.id !== id && b.bookingRef !== id);
      setBookings(nextBookings);
      localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
      showToast('🗑️ ลบคำสั่งซื้อทัวร์เรียบร้อยแล้ว');

      // Sync to Supabase (delete from bookings table AND update app_store backup)
      await Promise.all([
        supabaseApi.deleteBooking(actualId),
        supabaseApi.deleteBooking(bookingRef),
        supabaseApi.saveBookingsBackup(nextBookings)
      ]).catch(() => {});

      // Sync to Express API if available
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      lastMutationTimeRef.current = Date.now();
      setSettings(newSettings);
      localStorage.setItem('tst_settings', JSON.stringify(newSettings));
      showToast('💾 บันทึกการตั้งค่าแล้ว');

      // Sync to Supabase
      supabaseApi.saveSettings(newSettings).catch(() => {});

      // Sync to Express API
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCustomer = async (id: string, updatedCustomerData: Partial<Customer>) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const nextCustomers = customers.map(c => c.id === id ? { ...c, ...updatedCustomerData } : c);
      setCustomers(nextCustomers);
      localStorage.setItem('tst_customers', JSON.stringify(nextCustomers));
      showToast('💾 อัปเดตข้อมูลลูกค้าใน CRM เรียบร้อยแล้ว');

      // Sync to Supabase
      supabaseApi.saveCustomers(nextCustomers).catch(() => {});

      // Sync to Express API
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomerData),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const nextCustomers = customers.filter(c => c.id !== id);
      setCustomers(nextCustomers);
      localStorage.setItem('tst_customers', JSON.stringify(nextCustomers));
      showToast('🗑️ ลบข้อมูลลูกค้าเรียบร้อยแล้ว');

      // Sync to Supabase
      supabaseApi.saveCustomers(nextCustomers).catch(() => {});

      // Sync to Express API
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTestLine = async (message: string) => {
    try {
      showToast('📱 กำลังส่งสัญญาณแจ้งเตือนไปยัง LINE...');
      const res = await dispatchLineNotification(message, 'TEST', 'TEST');
      if (res.success && res.logItem?.status === 'sent') {
        showToast('🟢 ส่งการแจ้งเตือนเข้ากลุ่ม LINE สำเร็จเรียบร้อย!');
      } else if (res.logItem?.status === 'failed') {
        showToast(`⚠️ LINE API: ${res.error || res.logItem.message}`);
      } else {
        showToast('📱 ส่งการแจ้งเตือนเข้า LINE เรียบร้อย');
      }
    } catch (err: any) {
      console.error('Test line error:', err);
      showToast('⚠️ ไม่สามารถส่งข้อความได้');
    }
  };

  const handleTrigger24hReminders = async () => {
    try {
      const res = await fetch('/api/line/trigger-reminders', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await loadInitialData();
        showToast(`⏰ รันแจ้งเตือน 24 ชม. เรียบร้อย (ส่งแล้ว ${data.sentCount} รายการ)`);
      } else {
        showToast('⏰ ไม่พบการแจ้งเตือน 24 ชม. ที่ค้างอยู่ขณะนี้');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendSingleReminder = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/line/send-reminder/${bookingId}`, { method: 'POST' });
      if (res.ok) {
        await loadInitialData();
        showToast('⏰ ส่งแจ้งเตือนเตือนความจำ 24 ชม. เข้า LINE สำเร็จ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTour = async (newTour: Tour) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const nextTours = [newTour, ...tours];
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('🏝️ เพิ่มโปรแกรมทัวร์ใหม่เรียบร้อย');

      // Sync to Supabase
      supabaseApi.saveTours(nextTours).catch(() => {});

      // Sync to Express API
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTour),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTour = async (id: string, updatedTourData: Partial<Tour>) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const nextTours = tours.map(t => t.id === id ? { ...t, ...updatedTourData } : t);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('💾 บันทึกการแก้ไขโปรแกรมทัวร์เรียบร้อย');

      // Sync to Supabase
      supabaseApi.saveTours(nextTours).catch(() => {});

      // Sync to Express API
      const res = await fetch(`/api/tours/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTourData),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTour = async (id: string) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const nextTours = tours.filter(t => t.id !== id);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('🗑️ ลบโปรแกรมทัวร์เรียบร้อย');

      // Sync to Supabase
      supabaseApi.saveTours(nextTours).catch(() => {});

      // Sync to Express API
      const res = await fetch(`/api/tours/${id}`, { method: 'DELETE' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Review Handlers
  const handleAddReview = async (reviewData: { tourId: string; userName: string; rating: number; comment: string; photo?: string }) => {
    try {
      lastMutationTimeRef.current = Date.now();
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      }).catch(() => null);

      if (res && res.ok) {
        const created = await res.json().catch(() => null);
        if (created) {
          if (created.version) lastServerVersionRef.current = created.version;
          const nextReviews = [created, ...reviews];
          setReviews(nextReviews);
          localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
          supabaseApi.saveReviews(nextReviews).catch(() => {});
          showToast('⭐ ขอบพระคุณสำหรับรีวิวครับ!');
          return;
        }
      }

      // Fallback local review creation if offline / Vercel
      const localReview: Review = {
        id: `rev-${Date.now()}`,
        tourId: reviewData.tourId,
        userName: reviewData.userName,
        userAvatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
        rating: reviewData.rating,
        comment: reviewData.comment,
        date: new Date().toISOString().split('T')[0],
        verifiedBooking: true,
        photos: reviewData.photo ? [reviewData.photo] : [],
        isApproved: true
      };
      const nextReviews = [localReview, ...reviews];
      setReviews(nextReviews);
      localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
      supabaseApi.saveReviews(nextReviews).catch(() => {});
      showToast('⭐ ขอบพระคุณสำหรับรีวิวครับ!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveReview = async (id: string, isApproved: boolean) => {
    lastMutationTimeRef.current = Date.now();
    const nextReviews = reviews.map(r => r.id === id ? { ...r, isApproved } : r);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    supabaseApi.saveReviews(nextReviews).catch(() => {});
    showToast(isApproved ? '✓ อนุมัติการแสดงผลรีวิวแล้ว' : '⏳ ซ่อนรีวิวเรียบร้อย');
    try {
      const res = await fetch(`/api/reviews/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (e) {}
  };

  const handleUpdateReview = async (id: string, updatedFields: Partial<Review>) => {
    lastMutationTimeRef.current = Date.now();
    const nextReviews = reviews.map(r => r.id === id ? { ...r, ...updatedFields } : r);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    supabaseApi.saveReviews(nextReviews).catch(() => {});
    showToast('✏️ แก้ไขข้อมูลรีวิวเรียบร้อยแล้ว');
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (e) {}
  };

  const handleReplyReview = async (id: string, reply: string) => {
    lastMutationTimeRef.current = Date.now();
    const nextReviews = reviews.map(r => r.id === id ? { ...r, adminReply: reply } : r);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    supabaseApi.saveReviews(nextReviews).catch(() => {});
    showToast('💬 บันทึกคำตอบกลับรีวิวเรียบร้อย');
    try {
      const res = await fetch(`/api/reviews/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (e) {}
  };

  const handleDeleteReview = async (id: string) => {
    lastMutationTimeRef.current = Date.now();
    const nextReviews = reviews.filter(r => r.id !== id);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    supabaseApi.saveReviews(nextReviews).catch(() => {});
    showToast('🗑️ ลบรีวิวเรียบร้อยแล้ว');
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.version) lastServerVersionRef.current = data.version;
      }
    } catch (e) {}
  };

  const handleNavigate = (view: 'home' | 'how-to-book' | 'about-me' | 'admin') => {
    if (view === 'admin') {
      if (isAdminAuthenticated) {
        setActiveView('admin');
      } else {
        setIsAdminAuthModalOpen(true);
      }
    } else {
      setActiveView(view);
    }
  };

  // Google Account Auth handler
  const handleAuthenticateGoogle = (user: AdminUser) => {
    setIsAdminAuthenticated(true);
    setAdminUser(user);
    localStorage.setItem('tst_admin_auth', 'true');
    localStorage.setItem('tst_admin_user', JSON.stringify(user));
    setIsAdminAuthModalOpen(false);
    setActiveView('admin');
    showToast(`🔓 เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${user.name}`);
  };

  const handleAuthenticatePin = (pin: string): boolean => {
    const targetPin = settings.adminPin || '1234';
    if (pin === targetPin) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('tst_admin_auth', 'true');
      setIsAdminAuthModalOpen(false);
      setActiveView('admin');
      showToast('🔓 เข้าสู่ระบบแอดมินสำเร็จ');
      return true;
    }
    return false;
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    try {
      localStorage.removeItem('tst_admin_auth');
      localStorage.removeItem('tst_admin_user');
      sessionStorage.clear();
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.disableAutoSelect();
      }
    } catch (e) {}
    setActiveView('home');
    showToast('🔒 ออกจากระบบและล้างเซสชันแอดมินเรียบร้อยแล้ว');
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const t = translations[currentLang];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Real-time Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-right duration-300">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Navbar */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        currentCurrency={currentCurrency}
        onCurrencyChange={setCurrentCurrency}
        onNavigate={handleNavigate}
        activeView={activeView}
        onOpenLookup={() => setIsLookupOpen(true)}
        promptPayId={settings.promptPayId}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* View Routing */}
      {activeView === 'admin' && isAdminAuthenticated ? (
        <AdminDashboard
          bookings={bookings}
          tours={tours}
          customers={customers}
          reviews={reviews}
          settings={settings}
          lineLogs={lineLogs}
          syncStatus={syncStatus}
          lastSyncedAt={lastSyncedAt}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          onDeleteBooking={handleDeleteBooking}
          onSaveSettings={handleSaveSettings}
          onSendTestLine={handleSendTestLine}
          onAddTour={handleAddTour}
          onUpdateTour={handleUpdateTour}
          onDeleteTour={handleDeleteTour}
          onLogoutAdmin={handleLogoutAdmin}
          onTrigger24hReminders={handleTrigger24hReminders}
          onSendSingleReminder={handleSendSingleReminder}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onApproveReview={handleApproveReview}
          onUpdateReview={handleUpdateReview}
          onReplyReview={handleReplyReview}
          onDeleteReview={handleDeleteReview}
          onRefreshData={loadInitialData}
          onForceSync={handleForcePurgeAndSync}
        />
      ) : (
        <main className="flex-1 space-y-12 pb-16">
          {activeView === 'home' && (
            <>
              {/* Hero Section */}
              <HeroSection
                currentLang={currentLang}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onExploreClick={() => {
                  const el = document.getElementById('tours-catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              {/* Tour Catalog Section */}
              <section id="tours-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Catalog Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {currentLang === 'TH' ? 'โปรแกรมทัวร์แนะนำ' :
                       currentLang === 'EN' ? 'Recommended Tours' :
                       currentLang === 'ZH' ? '推荐行程' : 'Рекомендуемые туры'} ({filteredTours.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      โปรแกรมท่องเที่ยวภูเก็ต ยืนยันตรง ชำระผ่าน พร้อมเพย์ QR Code
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-slate-500 font-semibold shrink-0">จัดเรียง:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-auto"
                    >
                      <option value="recommended">{t.sortRecommended}</option>
                      <option value="priceLow">{t.sortPriceLow}</option>
                      <option value="priceHigh">{t.sortPriceHigh}</option>
                      <option value="rating">{t.sortRating}</option>
                    </select>
                  </div>
                </div>

                {/* Tour Cards Grid */}
                {filteredTours.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTours.map((tour) => (
                      <TourCard
                        key={tour.id}
                        tour={tour}
                        currentLang={currentLang}
                        currentCurrency={currentCurrency}
                        onSelectTour={setDetailTour}
                        onBookNow={setBookingTour}
                        onViewItinerary={setItineraryTour}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm">
                    <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-spin-slow" />
                    <h3 className="font-extrabold text-slate-800 text-base">ไม่พบโปรแกรมทัวร์ที่ค้นหา</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">โปรดลองเปลี่ยนคำค้นหา หรือ เลือกดูทุกหมวดหมู่</p>
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-teal-200"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </div>
                )}
              </section>

              {/* Customer Reviews Section */}
              <CustomerReviewSection
                currentLang={currentLang}
                reviews={reviews}
                tours={tours}
                onAddReview={handleAddReview}
              />
            </>
          )}

          {activeView === 'how-to-book' && (
            <HowToBookSection
              currentLang={currentLang}
              settings={settings}
              onExploreTours={() => setActiveView('home')}
              onOpenLookup={() => setIsLookupOpen(true)}
            />
          )}

          {activeView === 'about-me' && (
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <span className="text-[10px] uppercase tracking-widest bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-extrabold border border-teal-100">
                  Phuket Local Guide & Official License
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mt-3">
                  {currentLang === 'TH' ? 'เกี่ยวกับเรา & ใบอนุญาตประกอบธุรกิจนำเที่ยว' :
                   currentLang === 'EN' ? 'About Us & TAT Tourism License' :
                   currentLang === 'ZH' ? '关于我们与泰国旅游营业执照' : 'О нас и туристическая лицензия TAT'}
                </h1>
                <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                  {currentLang === 'TH' ? 'ผู้ให้บริการนำเที่ยวทะเลภูเก็ตและเกาะอันดามัน จดทะเบียนถูกต้องตามกฎหมาย ใบอนุญาตเลขที่ 33/11100 โดยกรมการท่องเที่ยว กระทรวงการท่องเที่ยวและกีฬา' :
                   currentLang === 'EN' ? 'Fully licensed tour operator in Phuket under TAT License No. 33/11100, issued by the Department of Tourism, Thailand.' :
                   currentLang === 'ZH' ? '普吉岛合法持牌旅行社，持有泰国旅游局颁发的旅游营业执照编号 33/11100，安全资质100%保障。' :
                   'Официально зарегистрированный туроператор на Пхукете по лицензии TAT № 33/11100.'}
                </p>
              </div>

              {/* Official License Certificate Component with Full Details & Zoom Lightbox */}
              <div className="mb-12">
                <TatLicenseCertificate currentLang={currentLang} />
              </div>

              {/* Bio & Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-12 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm">
                <div className="md:col-span-5 bg-slate-50 border border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center aspect-square relative overflow-hidden">
                  <div className="absolute inset-0 bg-teal-600/[0.03] pointer-events-none" />
                  <div className="w-20 h-20 bg-teal-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-teal-200 mb-4">
                    TS
                  </div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">TRIP SEA TOUR</h3>
                  <p className="text-[10px] text-teal-600 font-extrabold tracking-widest uppercase mt-1 mb-3">Phuket, Thailand</p>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    TAT License No. 33/11100
                  </span>
                </div>

                <div className="md:col-span-7 space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {currentLang === 'TH' ? 'ยินดีต้อนรับสู่ครอบครัวทริปซีทัวร์' :
                     currentLang === 'EN' ? 'Welcome to Trip Sea Tour' :
                     currentLang === 'ZH' ? '欢迎选择普吉岛ทริปซีทัวร์' : 'Добро пожаловать в Trip Sea Tour'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentLang === 'TH' ? 'พวกเราคือผู้เชี่ยวชาญการท่องเที่ยวทะเลภูเก็ตและเกาะข้างเคียง เช่น เกาะพีพี เกาะราชา เกาะเฮ อ่าวพังงา และเกาะไม้ท่อน เรามุ่งเน้นความโปร่งใส ปลอดภัย และราคาที่ยุติธรรมที่สุด การจองระบบโอนตรงผ่านพร้อมเพย์ช่วยลดค่าธรรมเนียมแพลตฟอร์ม ทำให้เรามอบบริการที่ดีที่สุดให้คุณในราคาที่คุ้มค่ากว่าใคร' :
                     currentLang === 'EN' ? 'We are local guides and sea experts based in Phuket, offering premium speedboats, catamarans, and land tours directly to you. By booking through our local PromptPay direct transfer, we bypass high travel platform fees and pass the savings on to you with premier guides.' :
                     currentLang === 'ZH' ? '我们是普吉岛本地资深海岛达人，专为全球游客提供高标准的快艇、双体帆船以及经典环岛一日游。支持 PromptPay 直接支付，省去高昂的三方平台佣金，让您可以享受到普吉岛最地道、最超值的出行品质服务。' :
                     'Мы предлагаем качественные экскурсии на лодках, катамаранах и обзорные туры по Пхукету без лишних наценок.'}
                  </p>

                  <div className="pt-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        ✓
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {currentLang === 'TH' ? 'มีใบอนุญาตจดทะเบียนนำเที่ยวถูกต้อง (เลขที่ 33/11100)' : 'Tourism License No. 33/11100 Verified'}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {currentLang === 'TH' ? 'ออกโดยกรมการท่องเที่ยว กระทรวงการท่องเที่ยวและกีฬา ตรวจสอบได้จริง 100%' : 'Issued by the Department of Tourism, Thailand. 100% verifiable.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        ✓
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {currentLang === 'TH' ? 'คุ้มครองด้วยประกันภัยอุบัติเหตุครบถ้วน' : 'Full Travel Insurance'}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {currentLang === 'TH' ? 'รวมประกันภัยการเดินทางและอุบัติเหตุสำหรับผู้โดยสารทุกคนบนเรือ' : 'Comprehensive accident travel insurance included for every passenger on our trips.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Us Card on About Me Page */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-white">ช่องทางติดต่อเรา (Contact Us)</h3>
                    <p className="text-xs text-slate-400">สอบถามรายละเอียด เพิ่มเพื่อน LINE OA หรือโทรติดต่อทีมงานโดยตรง</p>
                  </div>
                  <a
                    href={`https://line.me/R/ti/p/${settings.lineOaId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-md shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>แอด LINE Official ({settings.lineOaId || '@056hxinu'})</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Main */}
                  <a
                    href="tel:0626816494"
                    className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-teal-500 transition flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30 group-hover:scale-105 transition">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">เบอร์โทรศัพท์หลัก (Primary Phone)</div>
                      <div className="text-sm font-extrabold text-white font-mono group-hover:text-teal-300 transition">062-681-6494</div>
                    </div>
                  </a>

                  {/* Phone Backup */}
                  <a
                    href="tel:0979241399"
                    className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-amber-500 transition flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 group-hover:scale-105 transition">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">เบอร์โทรศัพท์สำรอง (Backup Phone)</div>
                      <div className="text-sm font-extrabold text-white font-mono group-hover:text-amber-300 transition">097-924-1399</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* 24/7 AI Chatbot Assistant Powered by Gemini AI */}
      <TripSeaAiChatbot
        currentLang={currentLang}
        currentCurrency={currentCurrency}
        tours={tours}
      />

      {/* Footer */}
      <Footer currentLang={currentLang} settings={settings} onNavigate={handleNavigate} />

      {/* Modals */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onAuthenticateGoogle={handleAuthenticateGoogle}
        onAuthenticatePin={handleAuthenticatePin}
        authorizedEmails={settings.adminGoogleEmails || ['asmr9941@gmail.com']}
      />

      <TourDetailModal
        tour={detailTour}
        currentLang={currentLang}
        onClose={() => setDetailTour(null)}
        onBookNow={(tour) => {
          setDetailTour(null);
          setBookingTour(tour);
        }}
        reviews={reviews}
      />

      <ItineraryModal
        tour={itineraryTour}
        currentLang={currentLang}
        onClose={() => setItineraryTour(null)}
        onBookNow={(tour) => {
          setItineraryTour(null);
          setBookingTour(tour);
        }}
      />

      <BookingModal
        tour={bookingTour}
        currentLang={currentLang}
        settings={settings}
        onClose={() => setBookingTour(null)}
        onBookingCreated={handleBookingCreated}
      />

      {isLookupOpen && (
        <BookingLookupModal
          currentLang={currentLang}
          onClose={() => setIsLookupOpen(false)}
          bookings={bookings}
        />
      )}
    </div>
  );
}
