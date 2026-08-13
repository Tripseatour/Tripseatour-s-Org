import React, { useState, useEffect } from 'react';
import {
  BarChart3, DollarSign, ShoppingBag, Clock, CheckCircle2, AlertTriangle, Users,
  Settings, MessageCircle, QrCode, Plus, Search, Eye, Check, X, RefreshCw, Send, Image as ImageIcon,
  ChevronRight, Filter, FileSpreadsheet, Sparkles, LogOut, Lock, Key, Ticket, Trash2, Edit3, Calendar, ListChecks
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Booking, Tour, Customer, AppSettings, LineNotificationLog, SalesStats } from '../types';
import { TicketVoucher } from './TicketVoucher';
import { EditTourModal } from './EditTourModal';
import { isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from '../lib/supabase';

interface AdminDashboardProps {
  bookings: Booking[];
  tours: Tour[];
  customers: Customer[];
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
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  tours,
  customers,
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
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'tours' | 'customers' | 'settings'>('overview');
  const [stats, setStats] = useState<SalesStats | null>(null);

  // Filters
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Forms
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [testLineMsg, setTestLineMsg] = useState('🧪 [ทดสอบการแจ้งเตือน LINE Notify จากระบบแอดมิน]\n🌐 เว็บไซต์: https://tripseatour-s-org.vercel.app');
  const [deleteBookingTarget, setDeleteBookingTarget] = useState<Booking | null>(null);
  const [deleteTourTarget, setDeleteTourTarget] = useState<Tour | null>(null);

  // Settings State
  const [formSettings, setFormSettings] = useState<AppSettings>({ ...settings });
  const [detectedGroups, setDetectedGroups] = useState<Array<{ groupId: string; groupName?: string; lastSeen: string }>>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [groupFetchStatus, setGroupFetchStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
  }, []);

  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  // New Tour Form State
  const [newTourTitle, setNewTourTitle] = useState('');
  const [newTourCategory, setNewTourCategory] = useState<'island' | 'sunset' | 'yacht' | 'eco' | 'sightseeing'>('island');
  const [newPriceAdult, setNewPriceAdult] = useState(1500);
  const [newPriceChild, setNewPriceChild] = useState(1000);
  const [newDuration, setNewDuration] = useState('08:00 - 17:00');
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');

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

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
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

  const COLORS = ['#06b6d4', '#14b8a6', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen pb-16">
      {/* Backoffice Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase">
                ADMIN BACKOFFICE
              </span>
              <span className="text-xs text-slate-400">ระบบจัดการคำสั่งซื้อและสถิติยอดขาย</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              แดชบอร์ดแอดมิน - Trip Sea Tour Phuket
            </h1>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>อัปเดตข้อมูล</span>
            </button>
            {onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800/80 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                title="ออกจากระบบแอดมินและล็อคการเข้าถึง"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>ออกจากระบบแอดมิน (Lock)</span>
              </button>
            )}
          </div>
        </div>

        {/* Backoffice Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>แดชบอร์ดสถิติ</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>จัดการออเดอร์</span>
            {bookings.filter(b => b.paymentStatus === 'slip_uploaded').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                {bookings.filter(b => b.paymentStatus === 'slip_uploaded').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tours')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tours' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>โปรแกรมทัวร์ ({tours.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ฐานข้อมูลลูกค้า CRM</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ตั้งค่า PromptPay & LINE</span>
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
                    <span className="text-2xl font-extrabold text-cyan-400 mt-1 block">
                      ฿{(stats?.totalRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <span>↑ +18.4% จากเดือนที่แล้ว</span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">จำนวนออเดอร์ทั้งหมด</span>
                    <span className="text-2xl font-extrabold text-white mt-1 block">
                      {stats?.totalBookings || 0}
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
                      {stats?.pendingVerifications || 0}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-amber-400 font-semibold">
                  {stats?.pendingVerifications ? '⚠️ มีสลิปรอให้แอนมินคอนเฟิร์ม' : '✓ ตรวจสอบครบหมดแล้ว'}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">ออเดอร์ยืนยันสำเร็จ</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                      {stats?.confirmedBookings || 0}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-emerald-400">
                  ออกตั๋ว e-Voucher เรียบร้อย
                </div>
              </div>
            </div>

            {/* Sales Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Sales Revenue Chart */}
              <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
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
                      <Bar dataKey="revenue" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown Pie Chart */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-teal-400" />
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
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-700">
                  <div>🏝️ ทัวร์เกาะ: <strong className="text-cyan-400">58%</strong></div>
                  <div>🏙️ เที่ยวเมือง: <strong className="text-purple-400">6%</strong></div>
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-cyan-400" />
                  <span>คำสั่งจองล่าสุด (Recent Bookings)</span>
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-cyan-400 hover:underline font-semibold"
                >
                  ดูทั้งหมด →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3">รหัสการจอง</th>
                      <th className="p-3">โปรแกรมทัวร์</th>
                      <th className="p-3">ชื่อลูกค้า</th>
                      <th className="p-3">วันเดินทาง</th>
                      <th className="p-3">ยอดชำระ</th>
                      <th className="p-3">สถานะ</th>
                      <th className="p-3">แอคชั่น</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-300">
                    {bookings.slice(0, 5).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-3 font-mono font-bold text-cyan-300">{b.bookingRef}</td>
                        <td className="p-3 font-semibold max-w-[200px] truncate">{b.tourTitle}</td>
                        <td className="p-3">{b.customerName}</td>
                        <td className="p-3">{b.travelDate}</td>
                        <td className="p-3 font-bold text-amber-400">฿{b.totalAmount.toLocaleString()}</td>
                        <td className="p-3">
                          {b.paymentStatus === 'verified' ? (
                            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                              ✓ ชำระแล้ว
                            </span>
                          ) : b.paymentStatus === 'slip_uploaded' ? (
                            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-500/30 animate-pulse">
                              ⏳ รอตรวจสลิป
                            </span>
                          ) : (
                            <span className="bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                              รอชำระ
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setActiveTab('orders');
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-bold"
                          >
                            จัดการ
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

        {/* TAB 2: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสการจอง, ชื่อลูกค้า, เบอร์โทร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {onTrigger24hReminders && (
                  <button
                    onClick={onTrigger24hReminders}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-900/30 shrink-0"
                    title="สแกนและส่งแจ้งเตือนใกล้วันเดินทาง (24 ชม.) ให้รายการที่ยังไม่ได้ส่ง"
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-200" />
                    <span>รันแจ้งเตือน 24 ชม. LINE</span>
                  </button>
                )}
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    orderFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
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
                          <span className="font-mono font-extrabold text-cyan-300 block text-sm">
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
                          <span className="text-[10px] text-cyan-400 font-mono">PromptPay QR</span>
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
                              className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 text-cyan-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
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
                            className="w-full mt-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/80 font-bold px-2 py-1 rounded-lg text-[10px] transition flex items-center justify-center gap-1 shadow-sm"
                            title="เปิดดู ตั๋ว E-Ticket บันทึกรูป หรือส่งเข้า LINE"
                          >
                            <Ticket className="w-3 h-3 text-cyan-300 shrink-0" />
                            <span>ดู/ส่งตั๋ว E-Ticket</span>
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
                              title="ส่งแจ้งเตือนใกล้วันเดินทาง 24 ชม. เข้า LINE Notify"
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
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มโปรแกรมทัวร์ใหม่</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tours.map((t) => (
                <div key={t.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="aspect-video rounded-xl overflow-hidden relative">
                      <img src={t.images[0]} alt={t.title.TH} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-slate-900/90 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-cyan-500/40">
                        {t.categoryLabel?.TH || t.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-2">{t.title.TH}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.duration?.TH}</p>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                        <ListChecks className="w-3 h-3 text-emerald-400" />
                        <span>รวมในทัวร์: {t.included?.TH ? t.included.TH.length : 0} รายการ</span>
                      </span>

                      <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>ตารางเดินทาง: {t.itinerary ? t.itinerary.length : 0} ช่วง</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-xs pt-2 border-t border-slate-700">
                      <span className="text-slate-400">ผู้ใหญ่: <strong className="text-emerald-400 font-extrabold text-sm">฿{t.priceAdult.toLocaleString()}</strong></span>
                      <span className="text-slate-400">เด็ก: <strong className="text-cyan-400 font-bold">฿{t.priceChild.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/80">
                    <button
                      onClick={() => {
                        setEditingTour(t);
                        setIsTourModalOpen(true);
                      }}
                      className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>แก้ไขทัวร์ & ตารางเวลา</span>
                    </button>

                    <button
                      onClick={() => setDeleteTourTarget(t)}
                      className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>ลบรายการนี้</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMER CRM DATABASE */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-lg font-bold text-white">ฐานข้อมูลลูกค้าอัตโนมัติ (Customer CRM)</h2>
              <p className="text-xs text-slate-400">รวบรวมประวัติการจองและยอดใช้จ่ายของลูกค้าแต่ละท่าน</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-700 font-bold">
                    <tr>
                      <th className="p-3.5">ชื่อลูกค้า</th>
                      <th className="p-3.5">ช่องทางติดต่อ (เบอร์ / LINE)</th>
                      <th className="p-3.5">สัญชาติ</th>
                      <th className="p-3.5">จำนวนทริปที่เคยจอง</th>
                      <th className="p-3.5">ยอดใช้จ่ายรวม (THB)</th>
                      <th className="p-3.5">จองล่าสุดเมื่อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-300">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-3.5 font-bold text-white">{c.name}</td>
                        <td className="p-3.5 space-y-0.5">
                          <div>📞 {c.phone}</div>
                          <div className="text-slate-400 text-[11px]">✉️ {c.email}</div>
                        </td>
                        <td className="p-3.5">{c.nationality}</td>
                        <td className="p-3.5 font-bold text-cyan-400">{c.totalBookings} ทริป</td>
                        <td className="p-3.5 font-extrabold text-amber-400">฿{c.totalSpent.toLocaleString()}</td>
                        <td className="p-3.5 text-slate-400">{c.lastBookingDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROMPTPAY & LINE NOTIFY SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PromptPay & LINE Form */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  <span>ตั้งค่าการรับชำระเงิน PromptPay QR</span>
                </h3>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      หมายเลขพร้อมเพย์ (เบอร์โทรศัพท์ 10 หลัก หรือ เลขประจำตัวผู้เสียภาษี 13 หลัก)
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.promptPayId}
                      onChange={(e) => setFormSettings({ ...formSettings, promptPayId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      ชื่อบัญชีพร้อมเพย์ (แสดงบนหน้าสแกนจ่าย)
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.promptPayName}
                      onChange={(e) => setFormSettings({ ...formSettings, promptPayName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-bold focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <hr className="border-slate-700 my-4" />

                  <h4 className="text-sm font-bold text-white flex items-center gap-2 pt-1">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span>ตั้งค่าความปลอดภัยระบบแอดมิน (Admin Security Lock)</span>
                  </h4>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      รหัสผ่านเข้าใช้งานระบบแอดมิน (Admin PIN / Password)
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.adminPin || '1234'}
                      onChange={(e) => setFormSettings({ ...formSettings, adminPin: e.target.value })}
                      placeholder="เช่น 1234 หรือ MySecretPass"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * รหัสผ่านนี้จะใช้สำหรับปลดล็อคการเข้าถึงระบบแอดมินป้องกันลูกค้าทั่วไปแอบเข้ามาดูข้อมูล
                    </p>
                  </div>

                  <hr className="border-slate-700 my-4" />

                  <h4 className="text-sm font-bold text-white flex items-center gap-2 pt-1">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>ตั้งค่าการแจ้งเตือน LINE Messaging API (LINE Official Account)</span>
                  </h4>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      LINE Messaging Channel Access Token (Long-lived Token)
                    </label>
                    <input
                      type="text"
                      value={formSettings.lineMessagingChannelAccessToken || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, lineMessagingChannelAccessToken: e.target.value })}
                      placeholder="วาง Channel Access Token จาก LINE Developers Console..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      LINE Target User ID หรือ Group ID (สำหรับส่งข้อความตรง Push Message เข้ากลุ่มแอดมิน)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formSettings.lineMessagingUserId || ''}
                        onChange={(e) => setFormSettings({ ...formSettings, lineMessagingUserId: e.target.value })}
                        placeholder="ระบุ Group ID เช่น C1234567890abcdef1234567890abcdef (ขึ้นต้นด้วย C...)"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={fetchDetectedGroups}
                        disabled={isFetchingGroups}
                        className="bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0 border border-emerald-500/30"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                        <span>ดึง Group ID ล่าสุด</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      * เมื่อใส่ Group ID (ขึ้นต้นด้วย C...) การแจ้งเตือนออเดอร์ใหม่ การสลิป และแจ้งเตือน 24 ชม. จะเด้งเข้ากลุ่มไลน์แอดมินโดยตรง
                    </p>
                  </div>

                  {/* Detected Groups Auto-Select List */}
                  {detectedGroups.length > 0 && (
                    <div className="bg-slate-900/90 border border-emerald-500/40 p-3.5 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span>พบ Group ID จากแชทกลุ่ม LINE ({detectedGroups.length} รายการ):</span>
                        </span>
                        <span className="text-[10px] text-slate-400">คลิกเพื่อเลือกบันทึกลง AppSettings</span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {detectedGroups.map((group, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 p-2.5 rounded-lg flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{group.groupName || 'กลุ่ม LINE'}</p>
                              <p className="text-[11px] font-mono text-emerald-400 truncate">{group.groupId}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormSettings({ ...formSettings, lineMessagingUserId: group.groupId });
                                  setGroupFetchStatus(`เลือก Group ID: ${group.groupId} ลงในแบบฟอร์มแล้ว`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition"
                              >
                                ใช้ ID นี้
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendGroupIdToBot(group.groupId)}
                                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] px-2 py-1 rounded-md transition flex items-center gap-1"
                              >
                                <Send className="w-3 h-3 text-cyan-400" />
                                <span>ทักเข้ากลุ่ม</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {groupFetchStatus && (
                        <p className="text-[11px] text-cyan-300 font-medium pt-1 border-t border-slate-800">{groupFetchStatus}</p>
                      )}
                    </div>
                  )}

                  {/* LINE Group ID Setup Guide Box */}
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>💡 ขั้นตอนการตั้งค่าส่งแจ้งเตือนเข้ากลุ่ม LINE (Group ID)</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                      <li>
                        <strong className="text-white">อนุญาตให้บอทเข้ากลุ่ม:</strong> ไปที่ <span className="text-emerald-400">LINE Official Account Manager</span> &gt; ตั้งค่าสิทธิ์ &gt; เปิดใช้ <span className="text-amber-300">"Allow bot to join group chats"</span>
                      </li>
                      <li>
                        <strong className="text-white">ดึงบอทเข้ากลุ่ม:</strong> ดึง LINE OA ของคุณเข้ามาในกลุ่ม LINE ของทีมงาน/แอดมิน
                      </li>
                      <li>
                        <strong className="text-white">หา Group ID (เลือกใช้ตามสะดวก):</strong>
                        <div className="pl-4 pt-1 space-y-1.5 text-slate-400">
                          <p>• <strong className="text-emerald-300">วิธีที่ 1 (ผ่าน Webhook ของเว็บ):</strong> ใน LINE Developers Console ตั้ง Webhook URL เป็น <code className="bg-slate-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono select-all">{window.location.origin}/api/line/webhook</code> จากนั้นเปิด <span className="text-emerald-300">Use webhook</span> แล้วพิมพ์ข้อความอะไรก็ได้ในกลุ่ม บอทจะตอบกลับ Group ID มาทันที</p>
                          <p>• <strong className="text-emerald-300">วิธีที่ 2 (ผ่าน Google Apps Script):</strong> สร้าง Webhook ฟรีด้วย Google Apps Script เพื่อดักจับ Group ID แล้วส่งข้อความตอบกลับเข้ากลุ่ม (ดูโค้ดสำเร็จรูปด้านล่าง)</p>
                        </div>
                      </li>
                      <li>
                        <strong className="text-white">วาง Group ID:</strong> นำรหัส Group ID (ขึ้นต้นด้วย C...) มาวางในช่องด้านบนแล้วกด <span className="text-cyan-400 font-bold">บันทึกการตั้งค่า</span>
                      </li>
                    </ol>
                  </div>

                  {saveSuccess && (
                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in duration-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>💾 บันทึกการตั้งค่าทั้งหมดเรียบร้อยแล้ว (ข้อมูลถูกเซฟลงคลาวด์ถาวร)</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`w-full font-extrabold py-3 rounded-xl transition text-xs shadow-lg flex items-center justify-center gap-2 ${
                      saveSuccess 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' 
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                    }`}
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        <span>บันทึกสำเร็จเรียบร้อย!</span>
                      </>
                    ) : (
                      <span>บันทึกการตั้งค่าทั้งหมด</span>
                    )}
                  </button>
                </form>

                {/* Supabase Database Status & Setup Box */}
                <div className="bg-slate-900/90 border border-emerald-500/30 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                      <span>ฐานข้อมูล Supabase (PostgreSQL Database)</span>
                    </div>
                    {isSupabaseConfigured ? (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/40">
                        ⚡ เชื่อมต่อเรียบร้อยแล้ว
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-500/40">
                        ⏳ รอใส่ VITE_SUPABASE_URL ใน .env
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    ระบบรองรับการจัดเก็บข้อมูลการจอง รีวิว และการตั้งค่าลงฐานข้อมูล <strong>Supabase</strong> โดยอัตโนมัติ คุณสามารถนำโค้ด SQL ด้านล่างไปรันใน <strong>Supabase SQL Editor</strong> เพื่อสร้างตารางข้อมูล:
                  </p>

                  <div className="relative">
                    <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400 max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {SUPABASE_SQL_SCHEMA}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                      className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-1 px-2.5 rounded-lg border border-slate-700 transition"
                    >
                      {copiedSql ? '✅ คัดลอก SQL แล้ว!' : '📋 คัดลอกโค้ด SQL'}
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE Notification Tester & Live Feed */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5">
                {/* 24-Hour Automated Reminder Feature Box */}
                <div className="bg-blue-950/50 border border-blue-800/80 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>ระบบส่งแจ้งเตือนเตือนความจำ 24 ชม. ก่อนวันเดินทาง (LINE 24h Reminder)</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 leading-relaxed">
                    ระบบจะทำการสแกนคำสั่งซื้อที่ได้รับการยืนยันการชำระเงินแล้วที่มีกำหนดการเดินทางล่วงหน้า 24 ชั่วโมง โดยอัตโนมัติในเบื้องหลังทุกๆ 1 ชั่วโมง เพื่อส่งการแจ้งเตือนเตือนความจำพร้อมรายละเอียดทัวร์ โรงแรม และห้องพักให้ทีมงานเตรียมพร้อมดูแลลูกค้า
                  </p>
                  {onTrigger24hReminders && (
                    <button
                      type="button"
                      onClick={onTrigger24hReminders}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-900/40"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>สแกนและส่งการแจ้งเตือน 24 ชม. ตอนนี้ (Manual Trigger)</span>
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-white flex items-center gap-2 pt-2">
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
                    <span>ส่งข้อความทดสอบไปยัง LINE Messaging API</span>
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
                          <span className="font-mono text-cyan-400">{log.bookingRef}</span>
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
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Ticket className="w-5 h-5 text-cyan-400" />
                <span>ตรวจสอบและจัดการตั๋ว E-Ticket #{selectedTicketBooking.bookingRef}</span>
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

      {/* Custom Confirm Delete Booking Modal */}
      {deleteBookingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800/80 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ยืนยันลบคำสั่งซื้อทัวร์</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                คุณต้องการลบออเดอร์ <strong className="text-cyan-300 font-mono">#{deleteBookingTarget.bookingRef}</strong> คุณ <strong className="text-amber-300">{deleteBookingTarget.customerName}</strong> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-rose-400 mt-2 bg-rose-950/50 p-2.5 rounded-xl border border-rose-900">
                ⚠️ การลบนี้จะมีผลทันทีในระบบและฐานข้อมูล
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

      {/* Custom Confirm Delete Tour Modal */}
      {deleteTourTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800/80 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ยืนยันลบโปรแกรมทัวร์</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                คุณต้องการลบโปรแกรมทัวร์ <strong className="text-cyan-300">{deleteTourTarget.title.TH}</strong> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-rose-400 mt-2 bg-rose-950/50 p-2.5 rounded-xl border border-rose-900">
                ⚠️ รายการทัวร์จะถูกลบออกจากหน้าเว็บและฐานข้อมูล
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
    </div>
  );
};
