import React, { useState, useEffect } from 'react';
import {
  BarChart3, DollarSign, ShoppingBag, Clock, CheckCircle2, AlertTriangle, Users,
  Settings, MessageCircle, QrCode, Plus, Search, Eye, Check, X, RefreshCw, Send, Image as ImageIcon,
  ChevronRight, Filter, FileSpreadsheet, Sparkles, LogOut, Lock, Key, Ticket, Trash2, Edit3, Calendar, ListChecks,
  Star, MessageSquare, Bot, UserPlus, UserMinus, ShieldCheck, Mail, Database
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Booking, Tour, Customer, Review, AppSettings, LineNotificationLog, SalesStats } from '../types';
import { TicketVoucher } from './TicketVoucher';
import { EditTourModal } from './EditTourModal';
import { isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from '../lib/supabase';

interface AdminDashboardProps {
  bookings: Booking[];
  tours: Tour[];
  customers: Customer[];
  reviews?: Review[];
  settings: AppSettings;
  lineLogs: LineNotificationLog[];
  onUpdateBookingStatus: (id: string, paymentStatus: string, orderStatus: string) => void;
  onDeleteBooking?: (id: string) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onSendTestLine: (message: string) => void;
  onAddTour: (tour: Tour) => void;
  onUpdateTour?: (id: string, tourData: Partial<Tour>) => void;
  onDeleteTour: (id: string) => void;
  onLogoutAdmin?: () => void;
  onTrigger24hReminders?: () => void;
  onSendSingleReminder?: (bookingId: string) => void;
  onUpdateCustomer?: (id: string, customerData: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
  onApproveReview?: (id: string, isApproved: boolean) => void;
  onReplyReview?: (id: string, reply: string) => void;
  onDeleteReview?: (id: string) => void;
  onRefreshData?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  tours,
  customers,
  reviews = [],
  settings,
  lineLogs,
  onUpdateBookingStatus,
  onDeleteBooking,
  onSaveSettings,
  onSendTestLine,
  onAddTour,
  onUpdateTour,
  onDeleteTour,
  onLogoutAdmin,
  onTrigger24hReminders,
  onSendSingleReminder,
  onUpdateCustomer,
  onDeleteCustomer,
  onApproveReview,
  onReplyReview,
  onDeleteReview,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'tours' | 'customers' | 'reviews' | 'settings'>('overview');
  const [stats, setStats] = useState<SalesStats | null>(null);

  // Filters
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Modals & Forms
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [testLineMsg, setTestLineMsg] = useState('🧪 [ทดสอบการแจ้งเตือน LINE Notify จากระบบแอดมิน]\n');
  const [deleteBookingTarget, setDeleteBookingTarget] = useState<Booking | null>(null);
  const [deleteTourTarget, setDeleteTourTarget] = useState<Tour | null>(null);

  // Customer Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);

  // Review Reply State & AI
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [aiGeneratingMap, setAiGeneratingMap] = useState<Record<string, boolean>>({});
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null);

  // Settings State & Admin Google Account Management
  const [formSettings, setFormSettings] = useState<AppSettings>({ ...settings });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [detectedGroups, setDetectedGroups] = useState<Array<{ groupId: string; groupName?: string; lastSeen: string }>>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [groupFetchStatus, setGroupFetchStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Supabase Status & Purge State
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; url: string | null; error?: string | null } | null>(null);
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [cleanStatusMsg, setCleanStatusMsg] = useState<string | null>(null);

  const checkSupabaseStatus = async () => {
    try {
      const res = await fetch('/api/admin/supabase-status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      setSupabaseStatus({ connected: false, url: null, error: 'Network Error' });
    }
  };

  const handleCleanDeletedData = async () => {
    setIsCleaningData(true);
    setCleanStatusMsg(null);
    try {
      const res = await fetch('/api/admin/clean-deleted-data', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCleanStatusMsg('✅ ล้างข้อมูลเก่าที่ลบไปแล้วสะสมใน Supabase เรียบร้อยแล้ว!');
        if (onRefreshData) onRefreshData();
      } else {
        setCleanStatusMsg('❌ ไม่สามารถล้างข้อมูลได้: ' + (data.details || 'ข้อผิดพลาดระบบ'));
      }
    } catch (e) {
      setCleanStatusMsg('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsCleaningData(false);
    }
  };

  const fetchDetectedGroups = async () => {
    setIsFetchingGroups(true);
    setGroupFetchStatus(null);
    try {
      const res = await fetch('/api/line/detected-groups');
      if (res.ok) {
        const data = await res.json();
        setDetectedGroups(data.detectedGroups || []);
        if (data.currentConfiguredGroupId) {
          setFormSettings(prev => ({ ...prev, lineMessagingUserId: data.currentConfiguredGroupId }));
        }
      }
    } catch (err) {
      console.error('Error fetching detected groups:', err);
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleSendGroupIdToBot = async (targetGroup: string) => {
    setGroupFetchStatus('กำลังส่งข้อความยืนยันเข้ากลุ่ม LINE...');
    try {
      const res = await fetch('/api/line/send-group-id-bot-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: targetGroup })
      });
      const data = await res.json();
      if (data.success) {
        setGroupFetchStatus('✅ ส่งข้อความยืนยันเข้ากลุ่ม LINE สำเร็จแล้ว!');
      } else {
        setGroupFetchStatus('❌ ไม่สามารถส่งข้อความได้: ' + (data.message || 'โปรดตรวจสอบ Channel Access Token'));
      }
    } catch (err) {
      setGroupFetchStatus('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  useEffect(() => {
    fetchDetectedGroups();
    checkSupabaseStatus();
  }, []);

  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  // Load Stats from backend API
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [bookings]);

  // Auto-refresh interval (every 12 seconds) for live dashboard sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (onRefreshData) {
        onRefreshData();
      }
      fetchStats();
    }, 12000);
    return () => clearInterval(interval);
  }, [onRefreshData]);

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  // Add Google Admin Account
  const handleAddAdminEmail = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      alert('กรุณากรอก Google Account Email ที่ถูกต้อง');
      return;
    }
    const currentList = formSettings.adminGoogleEmails || ['asmr9941@gmail.com'];
    if (currentList.includes(email)) {
      alert('อีเมลนี้มีสิทธิ์ในระบบอยู่แล้ว');
      return;
    }
    const updatedList = [...currentList, email];
    const updatedSettings = { ...formSettings, adminGoogleEmails: updatedList };
    setFormSettings(updatedSettings);
    onSaveSettings(updatedSettings);
    setNewAdminEmail('');
    try {
      await fetch('/api/admin/google-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (e) {}
    alert(`เพิ่มบัญชีผู้ดูแล Google: ${email} เรียบร้อยแล้ว`);
  };

  // Remove Google Admin Account
  const handleRemoveAdminEmail = async (emailToRemove: string) => {
    const currentList = formSettings.adminGoogleEmails || ['asmr9941@gmail.com'];
    if (currentList.length <= 1) {
      alert('ไม่สามารถลบบัญชีผู้ดูแลคนสุดท้ายได้');
      return;
    }
    if (emailToRemove === 'asmr9941@gmail.com') {
      if (!confirm('คุณต้องการลบสิทธิ์ Super Admin (asmr9941@gmail.com) ใช่หรือไม่?')) return;
    } else {
      if (!confirm(`ต้องการลบสิทธิ์ผู้ดูแลของ ${emailToRemove} หรือไม่?`)) return;
    }
    const updatedList = currentList.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase());
    const updatedSettings = { ...formSettings, adminGoogleEmails: updatedList };
    setFormSettings(updatedSettings);
    onSaveSettings(updatedSettings);
    try {
      await fetch(`/api/admin/google-accounts/${encodeURIComponent(emailToRemove)}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  };

  // AI Reply Review Generator using Gemini
  const handleGenerateAiReply = async (review: Review) => {
    setAiGeneratingMap(prev => ({ ...prev, [review.id]: true }));
    try {
      const tour = tours.find(t => t.id === review.tourId);
      const res = await fetch('/api/ai/reply-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText: review.comment,
          rating: review.rating,
          userName: review.userName,
          tourTitle: tour?.title.TH || 'ทัวร์ภูเก็ต'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setReplyTextMap(prev => ({ ...prev, [review.id]: data.reply }));
        }
      } else {
        throw new Error('AI reply failed');
      }
    } catch (err) {
      console.error('Error generating AI reply:', err);
      setReplyTextMap(prev => ({
        ...prev,
        [review.id]: `ขอบพระคุณคุณ ${review.userName} มากๆ ครับที่ไว้วางใจเดินทางกับ Trip Sea Tour หวังว่าจะได้มีโอกาสดูแลคุณลูกค้าอีกในทริปหน้านะครับ! 🌊✨`
      }));
    } finally {
      setAiGeneratingMap(prev => ({ ...prev, [review.id]: false }));
    }
  };

  // Save Review Reply
  const handleSaveReply = async (reviewId: string) => {
    const reply = replyTextMap[reviewId];
    if (!reply || !reply.trim()) {
      alert('กรุณากรอกข้อความตอบกลับ');
      return;
    }
    if (onReplyReview) {
      onReplyReview(reviewId, reply.trim());
    }
    try {
      await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply.trim() })
      });
    } catch (e) {}
    alert('บันทึกคำตอบกลับรีวิวเรียบร้อยแล้ว!');
  };

  // Filter Bookings List
  const filteredBookings = bookings.filter((b) => {
    const matchesFilter =
      orderFilter === 'all' ||
      (orderFilter === 'pending' && b.paymentStatus === 'pending') ||
      (orderFilter === 'slip_uploaded' && b.paymentStatus === 'slip_uploaded') ||
      (orderFilter === 'verified' && b.paymentStatus === 'verified');

    const matchesSearch =
      b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  const COLORS = ['#0d9488', '#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen pb-16">
      {/* Backoffice Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-teal-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase">
                ADMIN BACKOFFICE
              </span>
              <span className="text-xs text-slate-400">ระบบจัดการคำสั่งซื้อและสถิติยอดขาย (Live Sync)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              แดชบอร์ดแอดมิน - Trip Sea Tour Phuket
            </h1>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onRefreshData) onRefreshData();
                fetchStats();
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              title="ดึงข้อมูลล่าสุดทันที"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรชข้อมูล</span>
            </button>
            {onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800/80 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                title="ออกจากระบบแอดมินและล็อคการเข้าถึง"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>ล็อคแอดมิน (Lock)</span>
              </button>
            )}
          </div>
        </div>

        {/* Backoffice Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>แดชบอร์ดสถิติ</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'orders' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>จัดการออเดอร์ ({bookings.length})</span>
            {bookings.filter(b => b.paymentStatus === 'slip_uploaded').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                {bookings.filter(b => b.paymentStatus === 'slip_uploaded').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tours')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tours' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>โปรแกรมทัวร์ ({tours.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'customers' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ฐานข้อมูลลูกค้า CRM ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reviews' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400" />
            <span>จัดการรีวิว & ตอบกลับ ({reviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ตั้งค่า & บัญชี Google Admin</span>
          </button>
        </div>
      </div>

      {/* Main Backoffice Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">รายได้รวมทั้งหมด</span>
                    <span className="text-2xl font-extrabold text-teal-400 mt-1 block">
                      ฿{(stats?.totalRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <span>✓ ข้อมูลอัปเดตอัตโนมัติแบบเรียลไทม์</span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">จำนวนออเดอร์ทั้งหมด</span>
                    <span className="text-2xl font-extrabold text-white mt-1 block">
                      {bookings.length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400">
                  ออเดอร์สะสมผ่าน PromptPay QR
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">สลิปรอการตรวจสอบ</span>
                    <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                      {bookings.filter(b => b.paymentStatus === 'slip_uploaded').length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-amber-400 font-semibold">
                  {bookings.filter(b => b.paymentStatus === 'slip_uploaded').length > 0 ? '⚠️ มีสลิปรอให้แอดมินคอนเฟิร์ม' : '✓ ตรวจสอบครบหมดแล้ว'}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">ออเดอร์ยืนยันสำเร็จ</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                      {bookings.filter(b => b.paymentStatus === 'verified').length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-emerald-400">
                  ออกตั๋ว E-Ticket เรียบร้อย
                </div>
              </div>
            </div>

            {/* Sales Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Sales Revenue Chart */}
              <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-400" />
                  <span>สถิติยอดขายรายเดือน (Monthly Revenue)</span>
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `฿${val/1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                        formatter={(val) => [`฿${Number(val).toLocaleString()}`, 'ยอดขาย']}
                      />
                      <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown Pie Chart */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-cyan-400" />
                  <span>สัดส่วนตามประเภททัวร์</span>
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.categoryBreakdown || []}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={5}
                      >
                        {(stats?.categoryBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-[11px] text-slate-400 pb-2">
                  {(stats?.categoryBreakdown || []).map((cat, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span>{cat.category}: {cat.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อลูกค้า, รหัสจอง (TST-...), หรือเบอร์โทร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {onTrigger24hReminders && (
                  <button
                    onClick={onTrigger24hReminders}
                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-teal-950 shrink-0"
                    title="สแกนและส่งแจ้งเตือนใกล้วันเดินทาง (24 ชม.) ให้รายการที่ยังไม่ได้ส่ง"
                  >
                    <Clock className="w-3.5 h-3.5 text-teal-200" />
                    <span>รันแจ้งเตือน 24 ชม. LINE</span>
                  </button>
                )}
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    orderFilter === 'all' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด ({bookings.length})
                </button>
                <button
                  onClick={() => setOrderFilter('slip_uploaded')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    orderFilter === 'slip_uploaded' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-amber-400 hover:text-white'
                  }`}
                >
                  รอตรวจสลิป ({bookings.filter(b => b.paymentStatus === 'slip_uploaded').length})
                </button>
                <button
                  onClick={() => setOrderFilter('verified')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    orderFilter === 'verified' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-emerald-400 hover:text-white'
                  }`}
                >
                  ชำระเงินแล้ว ({bookings.filter(b => b.paymentStatus === 'verified').length})
                </button>
              </div>
            </div>

            {/* Orders List Table */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-700 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">รหัสการจอง & เวลา</th>
                      <th className="p-3.5">โปรแกรมทัวร์</th>
                      <th className="p-3.5">ข้อมูลผู้จอง & โรงแรม</th>
                      <th className="p-3.5">วันเดินทาง / จำนวน</th>
                      <th className="p-3.5">ยอดเงิน</th>
                      <th className="p-3.5">สลิปโอนเงิน</th>
                      <th className="p-3.5 text-center">จัดการคำสั่งซื้อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-3.5">
                          <span className="font-mono font-extrabold text-teal-300 block text-sm">
                            {b.bookingRef}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(b.createdAt).toLocaleString('th-TH')}
                          </span>
                        </td>

                        <td className="p-3.5 max-w-[200px]">
                          <span className="font-bold text-white block leading-snug line-clamp-2">
                            {b.tourTitle}
                          </span>
                          <span className="text-[10px] text-teal-400 font-mono">PromptPay QR</span>
                        </td>

                        <td className="p-3.5 space-y-0.5">
                          <div className="font-bold text-white">{b.customerName}</div>
                          <div className="text-slate-400">📞 {b.customerPhone}</div>
                          <div className="text-slate-400 text-[11px]">🏨 {b.pickupHotel} ({b.pickupZone})</div>
                        </td>

                        <td className="p-3.5 space-y-0.5">
                          <div className="font-bold text-teal-300">📅 {b.travelDate}</div>
                          <div className="text-slate-400">👥 ผญ: {b.adults} / เด็ก: {b.children}</div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-extrabold text-amber-400 text-sm">
                            ฿{b.totalAmount.toLocaleString()}
                          </span>
                        </td>

                        <td className="p-3.5">
                          {b.slipUrl ? (
                            <button
                              onClick={() => setSelectedSlipUrl(b.slipUrl || null)}
                              className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 text-teal-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                              <span>ดูรูปสลิป</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">ยังไม่แนบสลิป</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center space-y-1">
                          {b.paymentStatus !== 'verified' ? (
                            <button
                              onClick={() => onUpdateBookingStatus(b.id, 'verified', 'confirmed')}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติชำระเงิน</span>
                            </button>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg font-bold block text-[11px]">
                              ✓ อนุมัติแล้ว (ส่ง LINE แล้ว)
                            </span>
                          )}

                          {/* View / Send Ticket Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedTicketBooking(b)}
                            className="w-full mt-1 bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-700/80 font-bold px-2 py-1 rounded-lg text-[10px] transition flex items-center justify-center gap-1 shadow-sm"
                            title="เปิดดูตั๋ว E-Ticket บันทึกรูป หรือส่งรูปเข้า LINE"
                          >
                            <Ticket className="w-3 h-3 text-teal-300 shrink-0" />
                            <span>ดู/ส่งรูปตั๋ว LINE</span>
                          </button>

                          {/* LINE 24h Reminder Status / Trigger */}
                          {b.reminderSent ? (
                            <span className="bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono text-[10px] block mt-1" title={b.reminderSentAt}>
                              ⏰ ส่งเตือน 24 ชม. แล้ว
                            </span>
                          ) : (b.paymentStatus === 'verified' || b.orderStatus === 'confirmed') && onSendSingleReminder ? (
                            <button
                              onClick={() => onSendSingleReminder(b.id)}
                              className="w-full mt-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/80 font-bold px-2 py-1 rounded-lg text-[10px] transition flex items-center justify-center gap-1 shadow-sm"
                              title="ส่งแจ้งเตือนใกล้วันเดินทาง 24 ชม. เข้า LINE"
                            >
                              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                              <span>ส่งเตือน 24 ชม. LINE</span>
                            </button>
                          ) : null}

                          {/* Delete Order Button */}
                          {onDeleteBooking && (
                            <button
                              type="button"
                              onClick={() => setDeleteBookingTarget(b)}
                              className="w-full mt-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold px-2 py-1 rounded-lg text-[10px] transition flex items-center justify-center gap-1 shadow-sm"
                              title="ลบออเดอร์นี้ออกจากระบบ"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>ลบออเดอร์นี้</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TOUR PROGRAM MANAGEMENT */}
        {activeTab === 'tours' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">จัดการรายการโปรแกรมทัวร์ (Tour Programs)</h2>
                <p className="text-xs text-slate-400">เพิ่ม/แก้ไข หมวดหมู่ ราคา รายการที่รวมในทัวร์ และตารางเวลาเดินทาง (Itinerary)</p>
              </div>

              <button
                onClick={() => {
                  setEditingTour(null);
                  setIsTourModalOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-teal-900/30"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มโปรแกรมทัวร์ใหม่</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tours.map((tr) => (
                <div key={tr.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                  <div className="relative aspect-video">
                    <img src={tr.images[0]} alt={tr.title.TH} className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 bg-slate-900/90 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {tr.categoryLabel.TH}
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">{tr.title.TH}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tr.description.TH}</p>
                      <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                        <span className="text-slate-400">ราคาผู้ใหญ่:</span>
                        <span className="font-extrabold text-amber-400 font-mono">฿{tr.priceAdult.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">ราคาเด็ก:</span>
                        <span className="font-bold text-slate-300 font-mono">฿{tr.priceChild.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                      <button
                        onClick={() => {
                          setEditingTour(tr);
                          setIsTourModalOpen(true);
                        }}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        onClick={() => setDeleteTourTarget(tr)}
                        className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CRM CUSTOMER DATABASE */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">ฐานข้อมูลลูกค้า (CRM Database)</h2>
                <p className="text-xs text-slate-400">รายชื่อลูกค้าทั้งหมด ประวัติการสั่งซื้อ และยอดการใช้จ่ายสะสม</p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-700 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">ชื่อลูกค้า</th>
                      <th className="p-3.5">เบอร์โทรศัพท์ / LINE</th>
                      <th className="p-3.5">อีเมล & สัญชาติ</th>
                      <th className="p-3.5">จำนวนครั้งที่จอง</th>
                      <th className="p-3.5">ยอดใช้จ่ายสะสม</th>
                      <th className="p-3.5 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-3.5 font-bold text-white">{c.name}</td>
                        <td className="p-3.5 text-slate-300">
                          <div>📞 {c.phone}</div>
                          {c.lineId && <div className="text-[11px] text-teal-400">LINE: {c.lineId}</div>}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div>{c.email}</div>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">{c.nationality}</span>
                        </td>
                        <td className="p-3.5 font-bold text-teal-300">{c.bookingCount} ครั้ง</td>
                        <td className="p-3.5 font-bold text-amber-400 font-mono">฿{c.totalSpent.toLocaleString()}</td>
                        <td className="p-3.5 text-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingCustomer(c);
                              setIsCustomerModalOpen(true);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => setDeleteCustomerTarget(c)}
                            className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-rose-800"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REVIEWS & AI REPLIES MANAGEMENT */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  <span>จัดการรีวิว & ระบบตอบกลับด้วย Gemini AI 24/7</span>
                </h2>
                <p className="text-xs text-slate-400">
                  อนุมัติการแสดงผลรีวิว จัดการข้อความ และใช้ Gemini AI ช่วยร่างคำตอบกลับอย่างมืออาชีพและสุภาพ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reviewFilter === 'all' ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด ({reviews.length})
                </button>
                <button
                  onClick={() => setReviewFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reviewFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400 hover:text-white'
                  }`}
                >
                  รออนุมัติ ({reviews.filter(r => r.isApproved === false).length})
                </button>
                <button
                  onClick={() => setReviewFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reviewFilter === 'approved' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-emerald-400 hover:text-white'
                  }`}
                >
                  อนุมัติแล้ว ({reviews.filter(r => r.isApproved !== false).length})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {reviews
                .filter(r => {
                  if (reviewFilter === 'pending') return r.isApproved === false;
                  if (reviewFilter === 'approved') return r.isApproved !== false;
                  return true;
                })
                .map((rev) => {
                  const tour = tours.find(t => t.id === rev.tourId);
                  const isApproved = rev.isApproved !== false;
                  const isAiThinking = aiGeneratingMap[rev.id] || false;
                  const currentReplyValue = replyTextMap[rev.id] !== undefined ? replyTextMap[rev.id] : (rev.adminReply || '');

                  return (
                    <div
                      key={rev.id}
                      className={`bg-slate-800/90 border rounded-2xl p-5 shadow-lg space-y-4 transition ${
                        isApproved ? 'border-slate-700' : 'border-amber-500/40 bg-amber-950/10'
                      }`}
                    >
                      {/* Top Review Metadata */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-sm border border-teal-500/30">
                            {rev.userName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{rev.userName}</h4>
                              <span className="text-[10px] text-slate-400">📅 {rev.date}</span>
                              {rev.verifiedBooking && (
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                                  ✓ ลูกค้าจองจริง
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-teal-400 font-medium">
                              📍 ทัวร์: {tour ? tour.title.TH : 'ทัวร์ภูเก็ต'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                            ))}
                          </div>

                          {/* Approval Status Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onApproveReview) {
                                onApproveReview(rev.id, !isApproved);
                              }
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {isApproved ? '✓ อนุมัติแสดงผล' : '⏳ ซ่อนรีวิว'}
                          </button>

                          {/* Delete Review */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('ต้องการลบรีวิวนี้หรือไม่?')) {
                                if (onDeleteReview) onDeleteReview(rev.id);
                              }
                            }}
                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg transition"
                            title="ลบรีวิว"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Review Comment Content */}
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                        "{rev.comment}"
                      </p>

                      {/* Attached Photos */}
                      {rev.photos && rev.photos.length > 0 && (
                        <div className="flex gap-2">
                          {rev.photos.map((p, idx) => (
                            <img
                              key={idx}
                              src={p}
                              alt="Review"
                              className="w-16 h-16 rounded-xl object-cover border border-slate-700"
                            />
                          ))}
                        </div>
                      )}

                      {/* Admin Response Box & Gemini AI Assistant */}
                      <div className="bg-slate-900/90 border border-teal-500/30 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-teal-400" />
                            <span>ข้อความตอบกลับจากแอดมิน (Trip Sea Tour Official Response)</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleGenerateAiReply(rev)}
                            disabled={isAiThinking}
                            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-teal-950 disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAiThinking ? 'animate-spin' : ''}`} />
                            <span>{isAiThinking ? 'Gemini กำลังร่างคำตอบ...' : '✨ ให้ Gemini AI ช่วยร่างคำตอบ'}</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <textarea
                            rows={2}
                            value={currentReplyValue}
                            onChange={(e) => setReplyTextMap(prev => ({ ...prev, [rev.id]: e.target.value }))}
                            placeholder="พิมพ์ข้อความขอบคุณและตอบกลับลูกค้า หรือกดปุ่ม Gemini AI ด้านบน..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveReply(rev.id)}
                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 rounded-xl text-xs transition shadow-md shadow-teal-950 flex items-center justify-center shrink-0"
                          >
                            <span>บันทึกคำตอบ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS & GOOGLE ADMIN MANAGEMENT */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Supabase Database Connection Status Banner */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${supabaseStatus?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">สถานะการเชื่อมต่อฐานข้อมูล Supabase</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${supabaseStatus?.connected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      {supabaseStatus?.connected ? '🟢 ออนไลน์ / เชื่อมต่อสมบูรณ์' : '🟡 กำลังตรวจสอบ / Local Cache Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    URL: {supabaseStatus?.url || 'https://tljofqremlconawmtndd.supabase.co'} (ตาราง: app_store, bookings, tours, settings)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanDeletedData}
                  disabled={isCleaningData}
                  className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  title="ล้างข้อมูลออเดอร์/ทัวร์ที่เคยลบไปแล้วเพื่อไม่ให้ดึงกลับมาซ้ำ"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${isCleaningData ? 'animate-spin' : ''}`} />
                  <span>{isCleaningData ? 'กำลังล้างข้อมูล...' : 'ล้างขยะข้อมูลเก่าใน Supabase'}</span>
                </button>
                <button
                  type="button"
                  onClick={checkSupabaseStatus}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>เช็คสถานะ</span>
                </button>
              </div>
            </div>
            {cleanStatusMsg && (
              <div className="bg-slate-800 border border-teal-500/40 p-3.5 rounded-xl text-xs text-teal-300 font-bold animate-in fade-in flex items-center justify-between">
                <span>{cleanStatusMsg}</span>
                <button onClick={() => setCleanStatusMsg(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
              </div>
            )}

            {/* Google Admin Accounts Management Section */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                    <h3 className="text-base font-bold text-white">
                      จัดการบัญชี Google Account ผู้ดูแลระบบ (Admin Access Control)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    กำหนดรายชื่ออีเมล Google Account ที่มีสิทธิ์เข้าสู่ระบบหลังบ้านเพื่อจัดการคำสั่งซื้อ ราคา และการตั้งค่า
                  </p>
                </div>
              </div>

              {/* Authorized Accounts List */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  บัญชี Google ที่ได้รับสิทธิ์ในปัจจุบัน (Authorized Admins)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(formSettings.adminGoogleEmails || ['asmr9941@gmail.com']).map((email, idx) => {
                    const isSuper = email === 'asmr9941@gmail.com' || idx === 0;
                    return (
                      <div
                        key={email}
                        className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-mono text-xs font-bold text-white block">{email}</span>
                            <span className="text-[10px] text-teal-400">
                              {isSuper ? '👑 Super Administrator' : '🛡️ Administrator'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAdminEmail(email)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/50 transition"
                          title="ลบสิทธิ์ผู้ดูแล"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add new Google account */}
                <div className="flex gap-2 pt-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="กรอก Google Email ที่ต้องการเพิ่มสิทธิ์ เช่น manager@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAdminEmail}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-teal-950 shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>เพิ่มบัญชี Google</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PromptPay & LINE Notify Settings Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-teal-400" />
                    <span>ตั้งค่าบัญชีรับเงิน PromptPay & ข้อมูลบริษัท</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    กำหนดเบอร์โทรศัพท์/เลขบัตรรับเงิน และข้อมูลบริษัทที่ปรากฏบนตั๋ว E-Ticket
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      PromptPay ID (เบอร์โทรศัพท์ หรือ เลขประจำตัวประชาชน 13 หลัก)
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.promptPayId}
                      onChange={(e) => setFormSettings({ ...formSettings, promptPayId: e.target.value })}
                      placeholder="เช่น 0626816494 หรือ 1234567890123"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1 flex items-center justify-between">
                      <span>รหัสความปลอดภัย PIN สำรอง (Backup Admin PIN)</span>
                      <span className="text-[10px] text-amber-400 font-normal">ใช้เข้าสู่ระบบสำรองฉุกเฉิน</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4 text-amber-400" />
                      </div>
                      <input
                        type="text"
                        maxLength={10}
                        value={formSettings.adminPin || '1234'}
                        onChange={(e) => setFormSettings({ ...formSettings, adminPin: e.target.value })}
                        placeholder="รหัส PIN 4 หลัก เช่น 1234"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono font-bold text-amber-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">ชื่อบัญชีรับเงิน / บริษัท</label>
                    <input
                      type="text"
                      required
                      value={formSettings.companyName}
                      onChange={(e) => setFormSettings({ ...formSettings, companyName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                      <input
                        type="text"
                        value={formSettings.contactPhone}
                        onChange={(e) => setFormSettings({ ...formSettings, contactPhone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">อีเมลติดต่อ</label>
                      <input
                        type="email"
                        value={formSettings.contactEmail}
                        onChange={(e) => setFormSettings({ ...formSettings, contactEmail: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">ที่อยู่สำนักงาน</label>
                    <input
                      type="text"
                      value={formSettings.address}
                      onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-700/80">
                    <label className="text-slate-300 font-bold block mb-1">
                      LINE Target Group ID (สำหรับส่งข้อความตรง Push Message เข้ากลุ่มแอดมิน)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formSettings.lineMessagingUserId || ''}
                        onChange={(e) => setFormSettings({ ...formSettings, lineMessagingUserId: e.target.value })}
                        placeholder="ระบุ Group ID เช่น C1234567890abcdef1234567890abcdef"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={fetchDetectedGroups}
                        disabled={isFetchingGroups}
                        className="bg-teal-600/80 hover:bg-teal-500 text-white font-bold px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0 border border-teal-500/30"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                        <span>ดึง Group ID</span>
                      </button>
                    </div>
                  </div>

                  {saveSuccess && (
                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>💾 บันทึกการตั้งค่าทั้งหมดเรียบร้อยแล้ว</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full font-extrabold py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20 shadow-lg transition text-xs flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>บันทึกการตั้งค่าทั้งหมด</span>
                  </button>
                </form>
              </div>

              {/* LINE Notification Tester & Live Feed */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400" />
                  <span>ทดสอบส่งการแจ้งเตือนเข้า LINE (LINE Alert Test)</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <textarea
                    rows={3}
                    value={testLineMsg}
                    onChange={(e) => setTestLineMsg(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                  />
                  <button
                    onClick={() => onSendTestLine(testLineMsg)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30"
                  >
                    <Send className="w-4 h-4" />
                    <span>ส่งข้อความทดสอบไปยัง LINE</span>
                  </button>
                </div>

                <hr className="border-slate-700" />

                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
                    ประวัติการส่งการแจ้งเตือน (Live Alert Feed)
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {lineLogs.map((log) => (
                      <div key={log.id} className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span className="font-mono text-teal-400">{log.bookingRef}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString('th-TH')}</span>
                        </div>
                        <p className="text-slate-200 whitespace-pre-line font-medium">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slip Preview Modal */}
      {selectedSlipUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 text-center relative shadow-2xl">
            <button
              onClick={() => setSelectedSlipUrl(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="font-bold text-white text-sm mb-3">รูปสลิปโอนเงิน PromptPay</h3>
            <div className="rounded-2xl overflow-hidden border border-slate-700 max-h-96">
              <img src={selectedSlipUrl} alt="Transfer Slip" className="w-full h-full object-contain" />
            </div>
            <button
              onClick={() => setSelectedSlipUrl(null)}
              className="mt-4 bg-slate-800 text-slate-300 font-bold px-6 py-2 rounded-xl text-xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Edit / Add Tour Modal */}
      <EditTourModal
        tour={editingTour}
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        onSave={async (tourData) => {
          if (editingTour && onUpdateTour) {
            await onUpdateTour(editingTour.id, tourData);
          } else {
            await onAddTour(tourData as Tour);
          }
        }}
      />

      {/* Selected Ticket Voucher Modal */}
      {selectedTicketBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl p-5 shadow-2xl relative space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <Ticket className="w-5 h-5 text-teal-400" />
                <span>ตรวจสอบและส่งรูปตั๋ว E-Ticket #{selectedTicketBooking.bookingRef}</span>
              </div>
              <button
                onClick={() => setSelectedTicketBooking(null)}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <TicketVoucher booking={selectedTicketBooking} settings={settings} />

            <div className="text-center pt-2">
              <button
                onClick={() => setSelectedTicketBooking(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2 rounded-xl text-xs font-bold transition"
              >
                ปิดหน้าต่างตั๋ว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Booking Modal */}
      {deleteBookingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ยืนยันลบคำสั่งซื้อทัวร์</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                คุณต้องการลบออเดอร์ <strong className="text-teal-300 font-mono">#{deleteBookingTarget.bookingRef}</strong> คุณ <strong className="text-amber-300">{deleteBookingTarget.customerName}</strong> ใช่หรือไม่?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBookingTarget(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteBookingTarget.id;
                  setDeleteBookingTarget(null);
                  if (onDeleteBooking) {
                    onDeleteBooking(targetId);
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบออเดอร์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tour Modal */}
      {deleteTourTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ยืนยันลบโปรแกรมทัวร์</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                คุณต้องการลบโปรแกรมทัวร์ <strong className="text-teal-300">{deleteTourTarget.title.TH}</strong> ใช่หรือไม่?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTourTarget(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteTourTarget.id;
                  setDeleteTourTarget(null);
                  if (onDeleteTour) {
                    onDeleteTour(targetId);
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบทัวร์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {deleteCustomerTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ยืนยันลบข้อมูลลูกค้า</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                คุณต้องการลบข้อมูลลูกค้า <strong className="text-teal-300">{deleteCustomerTarget.name}</strong> ({deleteCustomerTarget.phone}) ออกจากระบบ CRM ใช่หรือไม่?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCustomerTarget(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteCustomerTarget.id;
                  setDeleteCustomerTarget(null);
                  if (onDeleteCustomer) {
                    onDeleteCustomer(targetId);
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบข้อมูลลูกค้า</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Edit Modal */}
      {isCustomerModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setIsCustomerModalOpen(false);
                setEditingCustomer(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <span>แก้ไขข้อมูลลูกค้า (Edit Customer)</span>
              </h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateCustomer && editingCustomer) {
                  onUpdateCustomer(editingCustomer.id, {
                    name: editingCustomer.name,
                    phone: editingCustomer.phone,
                    email: editingCustomer.email,
                    lineId: editingCustomer.lineId,
                    nationality: editingCustomer.nationality,
                  });
                }
                setIsCustomerModalOpen(false);
                setEditingCustomer(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-slate-300 font-bold block mb-1">ชื่อลูกค้า</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={editingCustomer.lineId || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, lineId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">อีเมล</label>
                  <input
                    type="email"
                    required
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">สัญชาติ</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.nationality}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, nationality: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomerModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-teal-900/40 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
