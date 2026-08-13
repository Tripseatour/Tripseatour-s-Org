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
import { Compass, Sparkles, Filter, Ticket, QrCode, Phone, MessageCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('TH');
  const [activeView, setActiveView] = useState<'home' | 'tours' | 'reviews' | 'admin'>('home');

  // Admin Security Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);

  // Backend Data
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    siteName: 'Trip Sea Tour Phuket',
    companyName: 'บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด',
    promptPayId: '0979241399',
    promptPayName: 'บริษัท ทริปซีทัวร์ ภูเก็ต จำกัด',
    lineNotifyToken: 'SIMULATED_LINE_NOTIFY_TOKEN_XYZ123',
    lineOaId: '@056hxinu',
    contactPhone: '+66 (0) 62 681 6494 / +66 (0) 97 924 1399',
    contactEmail: 'tripseatourphuket@gmail.com',
    address: 'ภูเก็ต ประเทศไทย',
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

  // Fetch initial data
  const loadInitialData = async () => {
    try {
      const [resTours, resBookings, resReviews, resCustomers, resSettings, resLogs] = await Promise.all([
        fetch('/api/tours'),
        fetch('/api/bookings'),
        fetch('/api/reviews'),
        fetch('/api/customers'),
        fetch('/api/settings'),
        fetch('/api/line/logs')
      ]);

      if (resTours.ok) setTours(await resTours.json());
      if (resBookings.ok) setBookings(await resBookings.json());
      if (resReviews.ok) setReviews(await resReviews.json());
      if (resCustomers.ok) setCustomers(await resCustomers.json());
      if (resSettings.ok) setSettings(await resSettings.json());
      if (resLogs.ok) setLineLogs(await resLogs.json());
    } catch (err) {
      console.error('Error loading data from server:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
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
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, orderStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        const nextBookings = bookings.map(b => b.id === id ? updated : b);
        setBookings(nextBookings);
        localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
        showToast(`✅ อนุมัติการชำระเงินของ ${updated.customerName} เรียบร้อยแล้ว`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const nextBookings = bookings.filter(b => b.id !== id && b.bookingRef !== id);
        setBookings(nextBookings);
        localStorage.setItem('tst_bookings', JSON.stringify(nextBookings));
        showToast('🗑️ ลบคำสั่งซื้อทัวร์เรียบร้อยแล้ว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);
      localStorage.setItem('tst_settings', JSON.stringify(newSettings));
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
        localStorage.setItem('tst_settings', JSON.stringify(saved));
        showToast('💾 บันทึกการตั้งค่า PromptPay & LINE Notify แล้ว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTestLine = async (message: string) => {
    try {
      const res = await fetch('/api/line/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const log = await res.json();
        setLineLogs([log, ...lineLogs]);
        showToast('📱 ส่งการแจ้งเตือนทดสอบเข้า LINE เรียบร้อย');
      }
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
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
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTour),
      });
      if (res.ok) {
        const created = await res.json();
        const updatedTours = [created, ...tours.filter(t => t.id !== created.id)];
        setTours(updatedTours);
        localStorage.setItem('tst_tours', JSON.stringify(updatedTours));
        showToast('🏝️ เพิ่มโปรแกรมทัวร์ใหม่เรียบร้อย');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTour = async (id: string, updatedTourData: Partial<Tour>) => {
    try {
      const nextTours = tours.map(t => t.id === id ? { ...t, ...updatedTourData } : t);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      const res = await fetch(`/api/tours/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTourData),
      });
      if (res.ok) {
        const updated = await res.json();
        const finalTours = tours.map(t => t.id === id ? updated : t);
        setTours(finalTours);
        localStorage.setItem('tst_tours', JSON.stringify(finalTours));
        showToast('💾 บันทึกการแก้ไขโปรแกรมทัวร์เรียบร้อย');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTour = async (id: string) => {
    if (!confirm('ยืนยันลบโปรแกรมทัวร์นี้?')) return;
    try {
      const nextTours = tours.filter(t => t.id !== id);
      setTours(nextTours);
      localStorage.setItem('tst_tours', JSON.stringify(nextTours));
      const res = await fetch(`/api/tours/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('🗑️ ลบโปรแกรมทัวร์เรียบร้อย');
      }
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
