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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch initial data & auto-sync from server/Supabase
  const loadInitialData = useCallback(async () => {
    try {
      // 1. Fetch latest from server APIs
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

      // Supabase direct fallback if server returned null/empty
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
      if (!serverCustomers || serverCustomers.length === 0) {
        const directCustomers = await supabaseApi.getCustomers();
        if (directCustomers && directCustomers.length > 0) {
          serverCustomers = directCustomers;
        }
      }

      // Update state if server or Supabase returned data (respecting edits and deletions)
      if (serverTours && serverTours.length > 0) {
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
    } catch (err) {
      console.error('Error loading data from server/Supabase:', err);
    }
  }, []);

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

  // Handlers for Booking
  const handleBookingCreated = (newBooking: Booking) => {
    const nextBookings = [newBooking, ...bookings];
    setBookings(nextBookings);
    localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
    showToast(`🟢 สั่งจองทัวร์สำเร็จ! รหัส ${newBooking.bookingRef} - แจ้งเตือนไปยัง LINE แล้ว`);
  };

  const handleUpdateBookingStatus = async (id: string, paymentStatus: string, orderStatus: string) => {
    try {
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

      await supabaseApi.updateBooking(id, { 
        paymentStatus: paymentStatus as any, 
        orderStatus: (paymentStatus === 'verified' ? 'confirmed' : orderStatus) as any,
        paidAt: paymentStatus === 'verified' ? new Date().toISOString() : undefined 
      }).catch(() => {});
      
      await supabaseApi.saveBookingsBackup(nextBookings).catch(() => {});

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
      const nextBookings = bookings.filter(b => b.id !== id && b.bookingRef !== id);
      setBookings(nextBookings);
      localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
      showToast('🗑️ ลบคำสั่งซื้อทัวร์เรียบร้อยแล้ว');

      await supabaseApi.deleteBooking(id).catch(() => {});
      await supabaseApi.saveBookingsBackup(nextBookings).catch(() => {});
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);
      localStorage.setItem('tst_settings', JSON.stringify(newSettings));
      showToast('💾 บันทึกการตั้งค่าแล้ว');

      await supabaseApi.saveSettings(newSettings).catch(() => {});
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
      const nextCustomers = customers.map(c => c.id === id ? { ...c, ...updatedCustomerData } : c);
      setCustomers(nextCustomers);
      localStorage.setItem('tst_customers', JSON.stringify(nextCustomers));
      showToast('💾 อัปเดตข้อมูลลูกค้าใน CRM เรียบร้อยแล้ว');

      await supabaseApi.saveCustomers(nextCustomers).catch(() => {});
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
      const nextCustomers = customers.filter(c => c.id !== id);
      setCustomers(nextCustomers);
      localStorage.setItem('tst_customers', JSON.stringify(nextCustomers));
      showToast('🗑️ ลบข้อมูลลูกค้าเรียบร้อยแล้ว');

      await supabaseApi.saveCustomers(nextCustomers).catch(() => {});
      await fetch(`/api/customers/${id}`, { method: 'DELETE' }).catch(() => {});
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
        showToast('📱 ส่งการแจ้งเตือนทดสอบเข้า LINE เรียบร้อย');
      } else {
        throw new Error('Send LINE failed');
      }
    } catch (err: any) {
      const simulatedLog: LineNotificationLog = {
        id: `log-sim-${Date.now()}`,
        bookingRef: 'TEST',
        type: 'TEST',
        message: `📱 [โหมดพรีวิว] ${message}`,
        status: 'simulated',
        timestamp: new Date().toISOString()
      };
      setLineLogs(prev => [simulatedLog, ...prev]);
      showToast('📱 ส่งการแจ้งเตือนเข้า LINE เรียบร้อย');
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
      const nextTours = [newTour, ...tours];
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('🏝️ เพิ่มโปรแกรมทัวร์ใหม่เรียบร้อย');

      await supabaseApi.saveTours(nextTours).catch(() => {});
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
      const nextTours = tours.map(t => t.id === id ? { ...t, ...updatedTourData } : t);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('💾 บันทึกการแก้ไขโปรแกรมทัวร์เรียบร้อย');

      await supabaseApi.saveTours(nextTours).catch(() => {});
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
      const nextTours = tours.filter(t => t.id !== id);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      showToast('🗑️ ลบโปรแกรมทัวร์เรียบร้อย');

      await supabaseApi.saveTours(nextTours).catch(() => {});
      await fetch(`/api/tours/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  // Review Handlers
  const handleAddReview = async (reviewData: { tourId: string; userName: string; rating: number; comment: string; photo?: string }) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });
      if (res.ok) {
        const created = await res.json();
        const nextReviews = [created, ...reviews];
        setReviews(nextReviews);
        localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
        showToast('⭐ ขอบพระคุณสำหรับรีวิวครับ!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveReview = async (id: string, isApproved: boolean) => {
    const nextReviews = reviews.map(r => r.id === id ? { ...r, isApproved } : r);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    showToast(isApproved ? '✓ อนุมัติการแสดงผลรีวิวแล้ว' : '⏳ ซ่อนรีวิวเรียบร้อย');
    try {
      await fetch(`/api/reviews/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      });
    } catch (e) {}
  };

  const handleReplyReview = async (id: string, reply: string) => {
    const nextReviews = reviews.map(r => r.id === id ? { ...r, adminReply: reply } : r);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    showToast('💬 บันทึกคำตอบกลับรีวิวเรียบร้อย');
    try {
      await fetch(`/api/reviews/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply })
      });
    } catch (e) {}
  };

  const handleDeleteReview = async (id: string) => {
    const nextReviews = reviews.filter(r => r.id !== id);
    setReviews(nextReviews);
    localStorage.setItem('tst_reviews', JSON.stringify(nextReviews));
    showToast('🗑️ ลบรีวิวเรียบร้อยแล้ว');
    try {
      await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
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
    localStorage.removeItem('tst_admin_auth');
    localStorage.removeItem('tst_admin_user');
    setActiveView('home');
    showToast('🔒 ออกจากระบบแอดมินเรียบร้อยแล้ว');
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
          onReplyReview={handleReplyReview}
          onDeleteReview={handleDeleteReview}
          onRefreshData={loadInitialData}
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
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <div className="text-center mb-8">
                <span className="text-[10px] uppercase tracking-widest bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-extrabold border border-teal-100">
                  Easy Booking Steps
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mt-3">
                  {currentLang === 'TH' ? 'ขั้นตอนการจองและชำระเงิน' :
                   currentLang === 'EN' ? 'How to Book & Pay' :
                   currentLang === 'ZH' ? '预订与支付流程' : 'Как забронировать и оплатить'}
                </h1>
                <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                  {currentLang === 'TH' ? 'จองง่าย รวดเร็ว ปลอดภัยด้วยระบบชำระเงิน พร้อมเพย์ QR Code และเชื่อมต่อตรงกับแอดมินทาง LINE ตลอด 24 ชั่วโมง' :
                   currentLang === 'EN' ? 'Book directly with our instant PromptPay QR code payment and connect instantly to our 24/7 support team on LINE.' :
                   currentLang === 'ZH' ? '便捷安全的预订系统，支持泰国 PromptPay 扫码即时付款，并直接关联 LINE 24小时中文客服协助核销。' :
                   'Бронируйте напрямую с мгновенной оплатой по QR-коду PromptPay и мгновенно подключайтесь к поддержке 24/7 в LINE.'}
                </p>
              </div>

              {/* Steps Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">
                      {currentLang === 'TH' ? 'เลือกโปรแกรมทัวร์' :
                       currentLang === 'EN' ? 'Select Tour' :
                       currentLang === 'ZH' ? '选择产品' : 'Выберите тур'}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {currentLang === 'TH' ? 'ดูรายละเอียดโปรแกรมท่องเที่ยวที่ชอบบนหน้าแรก กด "จองทัวร์นี้" พร้อมระบุวันที่เดินทาง และระบุจำนวนผู้เดินทาง (ผู้ใหญ่/เด็ก)' :
                       currentLang === 'EN' ? 'Browse tours on our home catalog, click "Book Now", then select travel date and headcount (Adults/Children).' :
                       currentLang === 'ZH' ? '在首页选择您心仪的一日游或巡游，点击“立即预订”，输入出行日期、人数（大人/小孩）。' :
                       'Выберите тур на главной странице, нажмите «Забронировать», укажите дату поездки и количество гостей.'}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">
                      {currentLang === 'TH' ? 'กรอกข้อมูลจัดส่งและสแกนจ่าย' :
                       currentLang === 'EN' ? 'Enter Details & Pay' :
                       currentLang === 'ZH' ? '填写信息并扫码支付' : 'Заполните данные и оплатите'}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {currentLang === 'TH' ? 'กรอกชื่อ-เบอร์โทร และชื่อโรงแรมในภูเก็ตสำหรับรถรับส่ง จากนั้นสแกน QR Code พร้อมเพย์ด้วยแอปธนาคารตามยอดเงินจริง' :
                       currentLang === 'EN' ? 'Fill contact info and hotel name in Phuket for pickup. Scan the generated PromptPay QR with any Thai banking app.' :
                       currentLang === 'ZH' ? '填写联系方式及普吉岛入住房号（接送服务），使用任意泰国银行 App 扫描生成的 PromptPay 二维码扫码支付。' :
                       'Заполните контактные данные и название отеля на Пхукете для трансфера. Отсканируйте QR-код PromptPay.'}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">
                      {currentLang === 'TH' ? 'แนบสลิปและยืนยันส่งจอง' :
                       currentLang === 'EN' ? 'Upload Slip & Confirm' :
                       currentLang === 'ZH' ? '上传付款凭证并确认' : 'Загрузите чек'}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {currentLang === 'TH' ? 'แนบรูปถ่ายสลิปการโอนเงิน (Transfer Slip) ในระบบ แล้วกดยืนยัน ออเดอร์จะส่งไปแจ้งเตือนแอดมินทาง LINE ทันที' :
                       currentLang === 'EN' ? 'Upload the transfer slip photo and click Confirm. Our system triggers a real-time notification to the admin.' :
                       currentLang === 'ZH' ? '在系统内上传您的银行付款回执（สลิป）并点击确认，订单信息及凭证将秒级推送至客服。' :
                       'Загрузите фото чека об оплате в систему и нажмите кнопку подтверждения. Заказ мгновенно поступит администратору.'}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">
                      {currentLang === 'TH' ? 'รับ Voucher ยืนยันการเดินทาง' :
                       currentLang === 'EN' ? 'Get Your Travel Voucher' :
                       currentLang === 'ZH' ? '获取电子旅行确认单' : 'Получите ваучер'}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {currentLang === 'TH' ? 'แอดมินตรวจสอบสลิปภายใน 10 นาที และออกตั๋วอิเล็กทรอนิกส์ (Voucher) ส่งให้คุณทาง LINE/Email เพื่อใช้ขึ้นเรือนำเที่ยว' :
                       currentLang === 'EN' ? 'Admin verifies your payment in 10 minutes and sends the e-Voucher via LINE/Email to present at boat check-in.' :
                       currentLang === 'ZH' ? '客服将在 10 分钟内完成凭证核对，并通过微信/LINE/邮箱向您下发正式确认单（Voucher）。' :
                       'Администратор проверит платеж за 10 минут и отправит вам электронный ваучер в LINE/Email для поездки.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instant support card */}
              <div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div>
                  <h4 className="font-extrabold text-lg tracking-tight">
                    {currentLang === 'TH' ? 'ต้องการสอบถามด่วน หรือจองผ่านเจ้าหน้าที่?' :
                     currentLang === 'EN' ? 'Need urgent support or want custom booking?' :
                     currentLang === 'ZH' ? '需要紧急咨询或人工客服代订？' : 'Нужна помощь или консультация?'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {currentLang === 'TH' ? 'ทีมงานบริการลูกค้าของทริปซีทัวร์พร้อมช่วยเหลือ ตอบคำถาม แนะนำหมวดหมู่เรือ และจัดทริปให้ท่าน 24 ชั่วโมง' :
                     currentLang === 'EN' ? 'Our service team is on standby to assist, suggest itineraries, and customize boat charters 24/7.' :
                     currentLang === 'ZH' ? '客服团队 24 小时全天候在线协助您量身定制巡游计划或解答各种出行疑问。' :
                     'Наша команда поддержки готова помочь вам составить индивидуальный маршрут 24/7.'}
                  </p>
                </div>
                <a
                  href={`https://line.me/R/ti/p/${settings.lineOaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold px-6 py-3 rounded-2xl text-xs transition whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>แอดไลน์ @{settings.lineOaId}</span>
                </a>
              </div>
            </div>
          )}

          {activeView === 'about-me' && (
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <span className="text-[10px] uppercase tracking-widest bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-extrabold border border-teal-100">
                  Phuket Local Guide & Official License
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mt-3">
                  {currentLang === 'TH' ? 'เกี่ยวกับเรา & ใบอนุญาตประกอบธุรกิจนำเที่ยว' :
                   currentLang === 'EN' ? 'About Us & TAT Tourism License' :
                   currentLang === 'ZH' ? '关于我们与泰国旅游营业执照' : 'О нас и туристическая лицензия TAT'}
                </h1>
                <p className="mt-4 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                  {currentLang === 'TH' ? 'ผู้ให้บริการนำเที่ยวทะเลภูเก็ตและเกาะอันดามัน จดทะเบียนถูกต้องตามกฎหมาย ใบอนุญาตเลขที่ 33/11100 โดยกรมการท่องเที่ยว กระทรวงการท่องเที่ยวและกีฬา' :
                   currentLang === 'EN' ? 'Fully licensed tour operator in Phuket under TAT License No. 33/11100, issued by the Department of Tourism, Thailand.' :
                   currentLang === 'ZH' ? '普吉岛合法持牌旅行社，持有泰国旅游局颁发的旅游营业执照编号 33/11100，安全资质100%保障。' :
                   'Официально зарегистрированный туроператор на Пхукете по лицензии TAT № 33/11100.'}
                </p>
              </div>

              {/* Official License Card Box */}
              <div className="bg-white border-2 border-teal-100 rounded-3xl p-6 sm:p-8 shadow-md mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-teal-700 text-white text-[10px] font-extrabold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider">
                  แบบ ธ.1 • กรมการท่องเที่ยว
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-full md:w-1/3 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center flex flex-col justify-center items-center">
                    <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md mb-3">
                      TAT
                    </div>
                    <span className="text-xs font-bold text-slate-800">ใบอนุญาตเลขที่</span>
                    <span className="text-xl font-extrabold text-teal-600 tracking-tight mt-0.5">33/11100</span>
                    <span className="text-[10px] text-slate-400 mt-2">สาขาภาคใต้ เขต 2</span>
                  </div>

                  <div className="flex-1 space-y-3 text-xs text-slate-700">
                    <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
                      รายละเอียดใบอนุญาตประกอบธุรกิจนำเที่ยว (TAT License Details)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><strong className="text-slate-900">ชื่อผู้รับใบอนุญาต:</strong> นางสาว พรทิพย์ แดงทัด</div>
                      <div><strong className="text-slate-900">ชื่อภาษาไทย:</strong> ทริป ซี ทัวร์</div>
                      <div><strong className="text-slate-900">ชื่อภาษาอังกฤษ:</strong> TRIP SEA TOUR</div>
                      <div><strong className="text-slate-900">ประเภท:</strong> เฉพาะพื้นที่ (ภูเก็ต / อันดามัน)</div>
                      <div className="sm:col-span-2"><strong className="text-slate-900">สำนักงานตั้งอยู่เลขที่:</strong> 71/47 หมู่ที่ 2 ตำบลกะทู้ อำเภอกะทู้ จังหวัดภูเก็ต 83120</div>
                      <div><strong className="text-slate-900">วันออกใบอนุญาต:</strong> 26 มกราคม พ.ศ. 2569</div>
                      <div><strong className="text-slate-900">อายุใบอนุญาต:</strong> 7 ก.พ. 2569 - 6 ก.พ. 2571 (2 ปี)</div>
                      <div className="sm:col-span-2"><strong className="text-slate-900">ผู้ออกใบอนุญาต:</strong> (นางสาวเล็กนางค์ ศิลลา) นายทะเบียนธุรกิจนำเที่ยวและมัคคุเทศก์ สาขาภาคใต้ เขต 2</div>
                    </div>
                  </div>
                </div>

                {/* Verification Website Link Box */}
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50/60 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-teal-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {currentLang === 'TH' ? 'ตรวจสอบสถานะใบอนุญาตบนเว็บไซต์ทางการ' : 'Verify License on Official Department Website'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {currentLang === 'TH' ? 'ท่านสามารถตรวจสอบความถูกต้องของใบอนุญาตนำเที่ยวได้โดยตรงผ่านระบบตรวจสอบของกรมการท่องเที่ยว' : 'You can independently verify this tour operator license directly on the official Thai Department of Tourism database.'}
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://esvcs.dot.go.th/e-service/LicenseInformationPage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition whitespace-nowrap shadow-sm shadow-teal-200 flex items-center gap-1.5 shrink-0"
                  >
                    <span>ตรวจสอบเว็บไซต์กรมการท่องเที่ยว</span>
                    <span className="text-[10px] opacity-80">↗</span>
                  </a>
                </div>
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
