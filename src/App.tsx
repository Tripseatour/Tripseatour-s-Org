import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { TourCard } from './components/TourCard';
import { TourDetailModal } from './components/TourDetailModal';
import { ItineraryModal } from './components/ItineraryModal';
import { BookingModal } from './components/BookingModal';
import { BookingLookupModal } from './components/BookingLookupModal';
import { CustomerReviewSection } from './components/CustomerReviewSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAuthModal } from './components/AdminAuthModal';

import { Tour, Booking, Review, Customer, AppSettings, LineNotificationLog, Language } from './types';
import { translations } from './data/translations';
import { initialTours, initialBookings, initialReviews, initialCustomers, initialSettings } from './data/mockData';
import { Compass, Sparkles, Filter, Ticket, QrCode, Phone, MessageCircle, ShieldCheck } from 'lucide-react';
import { supabaseApi } from './lib/supabase';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('TH');
  const [activeView, setActiveView] = useState<'home' | 'tours' | 'reviews' | 'admin'>('home');

  // Admin Security Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);

  // Backend Data with localStorage state memory
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch initial data & auto-sync
  const loadInitialData = async () => {
    try {
      const localToursRaw = localStorage.getItem('tst_tours');
      const localSettingsRaw = localStorage.getItem('tst_settings');
      const localBookingsRaw = localStorage.getItem('tst_bookings');
      const localCustomersRaw = localStorage.getItem('tst_customers');

      // Populate UI with localStorage values immediately (so it's instant and not wiped out by defaults)
      let initialToursState = tours;
      let initialBookingsState = bookings;
      let initialSettingsState = settings;
      let initialCustomersState = customers;

      if (localToursRaw) {
        try {
          const parsed = JSON.parse(localToursRaw);
          if (parsed && parsed.length > 0) {
            initialToursState = parsed;
            setTours(parsed);
          }
        } catch (e) {}
      }
      if (localBookingsRaw) {
        try {
          const parsed = JSON.parse(localBookingsRaw);
          if (parsed) {
            initialBookingsState = parsed;
            setBookings(parsed);
          }
        } catch (e) {}
      }
      if (localSettingsRaw) {
        try {
          const parsed = JSON.parse(localSettingsRaw);
          if (parsed && parsed.promptPayId) {
            initialSettingsState = parsed;
            setSettings(parsed);
          }
        } catch (e) {}
      }
      if (localCustomersRaw) {
        try {
          const parsed = JSON.parse(localCustomersRaw);
          if (parsed) {
            initialCustomersState = parsed;
            setCustomers(parsed);
          }
        } catch (e) {}
      }

      // Fetch latest from API
      const [resTours, resBookings, resReviews, resCustomers, resSettings, resLogs] = await Promise.all([
        fetch('/api/tours').catch(() => null),
        fetch('/api/bookings').catch(() => null),
        fetch('/api/reviews').catch(() => null),
        fetch('/api/customers').catch(() => null),
        fetch('/api/settings').catch(() => null),
        fetch('/api/line/logs').catch(() => null)
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

      // Direct Supabase Fallback for client-side resilience (crucial for Vercel)
      if (!serverBookings || serverBookings.length === 0) {
        const directBookings = await supabaseApi.getBookings();
        if (directBookings && directBookings.length > 0) {
          serverBookings = directBookings;
        }
      }
      if (!serverSettings) {
        const directSettings = await supabaseApi.getSettings();
        if (directSettings) {
          serverSettings = directSettings;
        }
      }
      if (!serverTours || serverTours.length === 0) {
        const directTours = await supabaseApi.getTours();
        if (directTours && directTours.length > 0) {
          serverTours = directTours;
        }
      }

      // Intelligent merging: Prefer custom edited values, don't overwrite with mock defaults
      let finalTours = initialToursState;
      let finalBookings = initialBookingsState;
      let finalSettings = initialSettingsState;
      let finalCustomers = initialCustomersState;

      // 1. Settings Merger
      const isServerSettingsDefault = !serverSettings || 
        (serverSettings.promptPayId === '0812345678' && serverSettings.companyName === 'บริษัท ทริป ซี ทัวร์ จำกัด (สำนักงานใหญ่)');
      const isLocalSettingsCustom = initialSettingsState.promptPayId !== '0812345678' || 
        initialSettingsState.companyName !== 'บริษัท ทริป ซี ทัวร์ จำกัด (สำนักงานใหญ่)';

      if (isServerSettingsDefault && isLocalSettingsCustom) {
        finalSettings = initialSettingsState;
        setSettings(initialSettingsState);
      } else if (serverSettings) {
        finalSettings = serverSettings;
        setSettings(serverSettings);
        localStorage.setItem('tst_settings', JSON.stringify(serverSettings));
      }

      // 2. Tours Merger
      const isServerToursDefault = !serverTours || 
        (serverTours.length === 3 && serverTours.every((t: any) => t.id === 'tour-1' || t.id === 'tour-2' || t.id === 'tour-3'));
      const isLocalToursCustom = initialToursState.length !== 3 || 
        initialToursState.some((t: any) => t.id !== 'tour-1' && t.id !== 'tour-2' && t.id !== 'tour-3');

      if (isServerToursDefault && isLocalToursCustom) {
        finalTours = initialToursState;
        setTours(initialToursState);
      } else if (serverTours && serverTours.length > 0) {
        finalTours = serverTours;
        setTours(serverTours);
        localStorage.setItem('tst_tours', JSON.stringify(serverTours));
      }

      // 3. Bookings Merger
      const isServerBookingsDefault = !serverBookings || 
        (serverBookings.length <= 2 && serverBookings.every((b: any) => b.id === 'bk-1' || b.id === 'bk-2'));
      const isLocalBookingsCustom = initialBookingsState.length > 2 || 
        initialBookingsState.some((b: any) => b.id !== 'bk-1' && b.id !== 'bk-2') ||
        initialBookingsState.some((b: any) => {
          const defaultBk = b.id === 'bk-1' ? 'pending' : b.id === 'bk-2' ? 'verified' : '';
          return defaultBk && b.paymentStatus !== defaultBk;
        });

      if (isServerBookingsDefault && isLocalBookingsCustom) {
        finalBookings = initialBookingsState;
        setBookings(initialBookingsState);
      } else if (serverBookings) {
        finalBookings = serverBookings;
        setBookings(serverBookings);
        localStorage.setItem('tst_bookings', JSON.stringify(serverBookings));
      }

      // 4. Customers Merger
      const isServerCustomersDefault = !serverCustomers || 
        (serverCustomers.length <= 2 && serverCustomers.every((c: any) => c.id === 'cust-1' || c.id === 'cust-2'));
      const isLocalCustomersCustom = initialCustomersState.length > 2 || 
        initialCustomersState.some((c: any) => c.id !== 'cust-1' && c.id !== 'cust-2');

      if (isServerCustomersDefault && isLocalCustomersCustom) {
        finalCustomers = initialCustomersState;
        setCustomers(initialCustomersState);
      } else if (serverCustomers) {
        finalCustomers = serverCustomers;
        setCustomers(serverCustomers);
        localStorage.setItem('tst_customers', JSON.stringify(serverCustomers));
      }

      if (serverReviews && serverReviews.length > 0) {
        setReviews(serverReviews);
        localStorage.setItem('tst_reviews', JSON.stringify(serverReviews));
      }

      // Send the merged, robust local data back to the server to ensure its memory database is accurate
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tours: finalTours,
          bookings: finalBookings,
          settings: finalSettings,
          customers: finalCustomers
        })
      }).catch(() => {});

    } catch (err) {
      console.error('Error loading data from server/Supabase:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
    
    // Auto-sync local fallback bookings to Supabase in the background
    const syncLocalFallbacks = async () => {
      try {
        const savedFallbacks = localStorage.getItem('local_fallback_bookings');
        if (savedFallbacks) {
          const list = JSON.parse(savedFallbacks);
          if (list.length > 0) {
            console.log(`Syncing ${list.length} local fallback bookings back to Supabase...`);
            let successCount = 0;
            for (const bk of list) {
              const res = await supabaseApi.createBooking(bk);
              if (res) {
                successCount++;
              }
            }
            if (successCount === list.length) {
              localStorage.removeItem('local_fallback_bookings');
              console.log('Successfully synchronized all local fallback bookings!');
            } else {
              const remaining = list.slice(successCount);
              localStorage.setItem('local_fallback_bookings', JSON.stringify(remaining));
            }
          }
        }
      } catch (err) {
        console.error('Error syncing local fallback bookings:', err);
      }
    };
    
    const timeout = setTimeout(syncLocalFallbacks, 2500);
    return () => clearTimeout(timeout);
  }, []);

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

  // Handlers
  const handleBookingCreated = (newBooking: Booking) => {
    const nextBookings = [newBooking, ...bookings];
    setBookings(nextBookings);
    localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
    showToast(`🟢 สั่งจองทัวร์สำเร็จ! รหัส ${newBooking.bookingRef} - แจ้งเตือนไปยัง LINE แล้ว`);
  };

  const handleUpdateBookingStatus = async (id: string, paymentStatus: string, orderStatus: string) => {
    try {
      // 1. Instantly update local UI state & localStorage (No lag)
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
      }

      // 2. Direct write to Supabase table
      await supabaseApi.updateBooking(id, { 
        paymentStatus: paymentStatus as any, 
        orderStatus: (paymentStatus === 'verified' ? 'confirmed' : orderStatus) as any,
        paidAt: paymentStatus === 'verified' ? new Date().toISOString() : undefined 
      }).catch(() => {});
      
      // Keep a full backup in key-value store too
      await supabaseApi.saveBookingsBackup(nextBookings).catch(() => {});

      // 3. Try to notify/update via Express Server API in background
      await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, orderStatus }),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      // 1. Instantly update UI & localStorage
      const nextBookings = bookings.filter(b => b.id !== id && b.bookingRef !== id);
      setBookings(nextBookings);
      localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
      showToast('🗑️ ลบคำสั่งซื้อทัวร์เรียบร้อยแล้ว');

      // 2. Direct delete from Supabase table
      await supabaseApi.deleteBooking(id).catch(() => {});
      await supabaseApi.saveBookingsBackup(nextBookings).catch(() => {});

      // 3. Inform backend API in background
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      // 1. Instantly update local state & localStorage
      setSettings(newSettings);
      localStorage.setItem('tst_settings', JSON.stringify(newSettings));
      showToast('💾 บันทึกการตั้งค่าแล้ว');

      // 2. Direct write to Supabase dedicated table and app_store
      await supabaseApi.saveSettings(newSettings).catch(() => {});

      // 3. Direct write to local Express API server (if online/active)
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCustomer = async (id: string, updatedCustomerData: Partial<Customer>) => {
    try {
      // 1. Instantly update local state & localStorage
      const nextCustomers = customers.map(c => c.id === id ? { ...c, ...updatedCustomerData } : c);
      setCustomers(nextCustomers);
      localStorage.setItem('tst_customers', JSON.stringify(nextCustomers));
      showToast('💾 อัปเดตข้อมูลลูกค้าใน CRM เรียบร้อยแล้ว');

      // 2. Backup to Supabase key-value store
      await supabaseApi.saveCustomers(nextCustomers).catch(() => {});

      // 3. Inform backend API in background
      await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomerData),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      // 1. Instantly update local state & localStorage
      const nextCustomers = customers.filter(c => c.id !== id);
      setCustomers(nextCustomers);
      localStorage.setItem('tst_customers', JSON.stringify(nextCustomers));
      showToast('🗑️ ลบข้อมูลลูกค้าเรียบร้อยแล้ว');

      // 2. Backup to Supabase key-value store
      await supabaseApi.saveCustomers(nextCustomers).catch(() => {});

      // 3. Inform backend API in background
      await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTestLine = async (message: string) => {
    try {
      showToast('📱 กำลังส่งสัญญาณแจ้งเตือน...');
      const res = await fetch('/api/line/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const log = await res.json();
        setLineLogs([log, ...lineLogs]);
        
        if (log.status === 'failed') {
          showToast(`❌ ส่งแจ้งเตือนไม่สำเร็จ: ${log.message}`);
        } else if (log.status === 'simulated') {
          showToast('📱 ส่งการแจ้งเตือนจำลองสำเร็จ (เนื่องจากยังไม่ได้ตั้งค่าคีย์ LINE ในระบบ)');
        } else {
          showToast('📱 ส่งการแจ้งเตือนทดสอบเข้า LINE เรียบร้อย');
        }
      } else {
        const errorText = await res.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
    } catch (err: any) {
      console.warn('LINE Notify API failed on Vercel backend, showing simulated notification log:', err);
      const simulatedLog: LineNotificationLog = {
        id: `log-sim-${Date.now()}`,
        bookingRef: 'TEST',
        type: 'TEST',
        message: `📱 [โหมดพรีวิว/Static] ${message}`,
        status: 'simulated',
        timestamp: new Date().toISOString()
      };
      setLineLogs(prev => [simulatedLog, ...prev]);
      
      // If we got a specific HTTP/Server error, display it to the user so they can diagnose it
      if (err?.message && (err.message.includes('HTTP ') || err.message.includes('Fetch'))) {
        showToast(`❌ เซิร์ฟเวอร์หลังบ้านตอบกลับผิดพลาด: ${err.message}`);
      } else {
        showToast('📱 ส่งการแจ้งเตือนจำลองสำเร็จ (เนื่องจากเซิร์ฟเวอร์หลักไม่ได้รันแบบเต็มใน Vercel)');
      }
    }
  };

  const handleTrigger24hReminders = async () => {
    try {
      const res = await fetch('/api/line/trigger-reminders', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const [bkRes, logRes] = await Promise.all([
          fetch('/api/bookings'),
          fetch('/api/line/logs')
        ]);
        if (bkRes.ok) {
          const bks = await bkRes.json();
          setBookings(bks);
          localStorage.setItem('tst_bookings', JSON.stringify(bks));
        }
        if (logRes.ok) setLineLogs(await logRes.json());
        showToast(`⏰ รันระบบตรวจสอบแจ้งเตือน 24 ชม. เรียบร้อย (ส่งแจ้งเตือนแล้ว ${data.sentCount} รายการ)`);
      } else {
        showToast('⏰ ไม่พบการแจ้งเตือน 24 ชม. ที่ค้างอยู่ขณะนี้');
      }
    } catch (err) {
      console.error(err);
      showToast('⏰ ค้นหาแจ้งเตือนเสร็จสิ้น (เรียบร้อย)');
    }
  };

  const handleSendSingleReminder = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/line/send-reminder/${bookingId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.booking) {
          const nextBookings = bookings.map(b => b.id === bookingId ? data.booking : b);
          setBookings(nextBookings);
          localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
        }
        const logRes = await fetch('/api/line/logs');
        if (logRes.ok) setLineLogs(await logRes.json());
        showToast(`⏰ ส่งแจ้งเตือนเตือนความจำ 24 ชม. ของ ${data.booking?.customerName} เรียบร้อยแล้ว`);
      } else {
        showToast('⏰ ค้นหาการแจ้งเตือนเตือนความจำรายบุคคลเรียบร้อยแล้ว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTour = async (newTour: Tour) => {
    try {
      // 1. Instantly update local state & localStorage
      const nextTours = [newTour, ...tours];
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('🏝️ เพิ่มโปรแกรมทัวร์ใหม่เรียบร้อย');

      // 2. Direct write to Supabase key-value app_store
      await supabaseApi.saveTours(nextTours).catch(() => {});

      // 3. Dispatch to local Express API
      await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTour),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTour = async (id: string, updatedTourData: Partial<Tour>) => {
    try {
      // 1. Instantly update local state & localStorage
      const nextTours = tours.map(t => t.id === id ? { ...t, ...updatedTourData } : t);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('💾 บันทึกการแก้ไขโปรแกรมทัวร์เรียบร้อย');

      // 2. Direct write to Supabase key-value app_store
      await supabaseApi.saveTours(nextTours).catch(() => {});

      // 3. Dispatch to local Express API
      await fetch(`/api/tours/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTourData),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTour = async (id: string) => {
    try {
      // 1. Instantly update local state & localStorage
      const nextTours = tours.filter(t => t.id !== id);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('🗑️ ลบโปรแกรมทัวร์เรียบร้อย');

      // 2. Direct write to Supabase key-value app_store
      await supabaseApi.saveTours(nextTours).catch(() => {});

      // 3. Dispatch to local Express API
      await fetch(`/api/tours/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReview = async (reviewData: { tourId: string; userName: string; rating: number; comment: string; photo?: string }) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });
      if (res.ok) {
        const created = await res.json();
        setReviews([created, ...reviews]);
        showToast('⭐ ขอบพระคุณสำหรับรีวิวครับ!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigate = (view: 'home' | 'tours' | 'reviews' | 'admin') => {
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

  const handleAuthenticateAdmin = (pin: string): boolean => {
    const targetPin = settings.adminPin || '1234';
    if (pin === targetPin) {
      setIsAdminAuthenticated(true);
      setIsAdminAuthModalOpen(false);
      setActiveView('admin');
      showToast('🔓 เข้าสู่ระบบแอดมินสำเร็จ');
      return true;
    }
    return false;
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setActiveView('home');
    showToast('🔒 ออกจากระบบแอดมินเรียบร้อยแล้ว');
  };

  const t = translations[currentLang];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Real-time Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/50 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-right duration-300">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Navbar */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
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
          settings={settings}
          lineLogs={lineLogs}
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
        />
      ) : (
        <main className="flex-1 space-y-12 pb-16">
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
                  {t.tours} ({filteredTours.length})
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
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-blue-200"
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
        </main>
      )}

      {/* Footer */}
      <Footer currentLang={currentLang} settings={settings} onNavigate={handleNavigate} />

      {/* Modals */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onAuthenticate={handleAuthenticateAdmin}
        currentPin={settings.adminPin || '1234'}
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
