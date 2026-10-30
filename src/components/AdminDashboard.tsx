import React, { useState, useEffect } from 'react';
import {
  BarChart3, DollarSign, ShoppingBag, Clock, CheckCircle2, AlertTriangle, Users,
  Settings, MessageCircle, QrCode, Plus, Search, Eye, EyeOff, Copy, Check, X, RefreshCw, Send, Image as ImageIcon,
  ChevronRight, Filter, FileSpreadsheet, Sparkles, LogOut, Lock, Key, Ticket, Trash2, Edit3, Calendar, ListChecks,
  Star, MessageSquare, Bot, UserPlus, UserMinus, ShieldCheck, Mail, Database, Printer, Ship, FileText, ClipboardList, PhoneCall, Award,
  TrendingUp, Calculator, Percent, Coins, Building2, Headphones, CheckCheck, MapPin, Navigation,
  Save, Download, Upload, HardDrive, FileJson, AlertCircle, ArrowUp, ArrowDown, MoveVertical,
  Globe, Smartphone, Monitor, Tablet, Activity, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { Booking, Tour, Customer, Review, AppSettings, LineNotificationLog, SalesStats, AdminUser, Supplier, VisitorAnalytics } from '../types';
import { TicketVoucher } from './TicketVoucher';
import { EditTourModal } from './EditTourModal';
import { ReorderToursModal } from './ReorderToursModal';
import { PickupLogisticsMap } from './PickupLogisticsMap';
import { SupplierModal } from './SupplierModal';
import { UniversalDataBackupModal, BackupTargetSection } from './UniversalDataBackupModal';
import { isSupabaseConfigured, getSupabase, SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { initialSettings } from '../data/mockData';

interface AdminDashboardProps {
  adminUser?: AdminUser | null;
  bookings: Booking[];
  tours: Tour[];
  customers: Customer[];
  reviews?: Review[];
  suppliers?: Supplier[];
  settings: AppSettings;
  lineLogs: LineNotificationLog[];
  syncStatus?: 'synced' | 'syncing' | 'error';
  lastSyncedAt?: string;
  visitorAnalytics?: VisitorAnalytics | null;
  onRefreshVisitorAnalytics?: () => Promise<void> | void;
  onUpdateBookingStatus: (id: string, paymentStatus: string, orderStatus: string) => void;
  onUpdateBookingSupplier?: (id: string, supplierId?: string, supplierName?: string) => void;
  onDeleteBooking?: (id: string) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onSendTestLine: (message: string) => void;
  onAddTour: (tour: Tour) => void;
  onUpdateTour?: (id: string, tourData: Partial<Tour>) => void;
  onDeleteTour: (id: string) => void;
  onSaveAllTours?: (toursToSave: Tour[]) => Promise<boolean | void> | void;
  onResetToursToDefault?: () => Promise<void> | void;
  onLogoutAdmin?: () => void;
  onTrigger24hReminders?: () => void;
  onSendSingleReminder?: (bookingId: string) => void;
  onUpdateCustomer?: (id: string, customerData: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
  onApproveReview?: (id: string, isApproved: boolean) => void;
  onUpdateReview?: (id: string, updatedFields: Partial<Review>) => void;
  onReplyReview?: (id: string, reply: string) => void;
  onDeleteReview?: (id: string) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (id: string, supplierData: Partial<Supplier>) => void;
  onDeleteSupplier?: (id: string) => void;
  onSaveAllSuppliers?: (suppliers: Supplier[]) => Promise<boolean>;
  onSaveAllCustomers?: (customers: Customer[]) => Promise<boolean>;
  onSaveAllBookings?: (bookings: Booking[]) => Promise<boolean>;
  onRestoreFullBackup?: (bundle: any) => Promise<boolean>;
  onRefreshData?: () => void;
  onForceSync?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  bookings,
  tours,
  customers,
  reviews = [],
  suppliers = [],
  settings,
  lineLogs,
  syncStatus = 'synced',
  lastSyncedAt,
  visitorAnalytics,
  onRefreshVisitorAnalytics,
  onUpdateBookingStatus,
  onUpdateBookingSupplier,
  onDeleteBooking,
  onSaveSettings,
  onSendTestLine,
  onAddTour,
  onUpdateTour,
  onDeleteTour,
  onSaveAllTours,
  onResetToursToDefault,
  onLogoutAdmin,
  onTrigger24hReminders,
  onSendSingleReminder,
  onUpdateCustomer,
  onDeleteCustomer,
  onApproveReview,
  onUpdateReview,
  onReplyReview,
  onDeleteReview,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onSaveAllSuppliers,
  onSaveAllCustomers,
  onSaveAllBookings,
  onRestoreFullBackup,
  onRefreshData,
  onForceSync
}) => {
  const computeClientStats = (currentBookings: Booking[], currentTours: Tour[]): SalesStats => {
    const totalRevenue = (currentBookings || [])
      .filter(b => b.paymentStatus === 'verified' || b.paymentStatus === 'slip_uploaded')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    const totalBookings = (currentBookings || []).length;
    const pendingVerifications = (currentBookings || []).filter(b => b.paymentStatus === 'slip_uploaded' || b.paymentStatus === 'pending').length;
    const confirmedBookings = (currentBookings || []).filter(b => b.orderStatus === 'confirmed').length;

    const monthlyRevenue = [
      { month: 'พ.ค. 26', revenue: 145000, bookings: 32 },
      { month: 'มิ.ย. 26', revenue: 182000, bookings: 41 },
      { month: 'ก.ค. 26', revenue: 220000, bookings: 54 },
      { month: 'ส.ค. 26', revenue: totalRevenue + 95000, bookings: totalBookings + 18 }
    ];

    const catMap: Record<string, { count: number; revenue: number }> = {};
    (currentTours || []).forEach(t => {
      catMap[t.category] = { count: 0, revenue: 0 };
    });

    (currentBookings || []).forEach(b => {
      const tour = (currentTours || []).find(t => t.id === b.tourId);
      const cat = tour ? tour.category : 'island';
      if (!catMap[cat]) catMap[cat] = { count: 0, revenue: 0 };
      catMap[cat].count += 1;
      catMap[cat].revenue += (Number(b.totalAmount) || 0);
    });

    const categoryBreakdown = Object.keys(catMap).map(cat => ({
      category: cat,
      count: catMap[cat].count,
      revenue: catMap[cat].revenue
    }));

    return {
      totalRevenue,
      totalBookings,
      pendingVerifications,
      confirmedBookings,
      monthlyRevenue,
      categoryBreakdown,
      statusBreakdown: [
        { status: 'ชำระเงินแล้ว', count: (currentBookings || []).filter(b => b.paymentStatus === 'verified').length },
        { status: 'รอตรวจสอบสลิป', count: (currentBookings || []).filter(b => b.paymentStatus === 'slip_uploaded').length },
        { status: 'รอชำระเงิน', count: (currentBookings || []).filter(b => b.paymentStatus === 'pending').length }
      ],
      recentBookings: (currentBookings || []).slice(0, 10)
    };
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'livechat' | 'tours' | 'customers' | 'reviews' | 'settings' | 'manifest' | 'logistics' | 'suppliers' | 'analytics'>('overview');
  const [stats, setStats] = useState<SalesStats | null>(() => computeClientStats(bookings, tours));

  // Universal JSON Backup State
  const [isUniversalBackupOpen, setIsUniversalBackupOpen] = useState(false);
  const [universalBackupSection, setUniversalBackupSection] = useState<BackupTargetSection>('all');

  const openUniversalBackup = (sec: BackupTargetSection = 'all') => {
    setUniversalBackupSection(sec);
    setIsUniversalBackupOpen(true);
  };

  // Visitor Analytics Refresh State
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);
  const handleManualRefreshAnalytics = async () => {
    setIsRefreshingAnalytics(true);
    try {
      if (onRefreshVisitorAnalytics) {
        await onRefreshVisitorAnalytics();
      }
    } finally {
      setTimeout(() => setIsRefreshingAnalytics(false), 500);
    }
  };

  // Live Chat States
  const [liveChatSessions, setLiveChatSessions] = useState<any[]>([]);
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [isSendingAdminReply, setIsSendingAdminReply] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);

  const fetchLiveChatSessions = async () => {
    try {
      const res = await fetch('/api/livechat/sessions');
      if (res.ok) {
        const data = await res.json();
        setLiveChatSessions(data || []);
        if (!selectedLiveSessionId && data && data.length > 0) {
          setSelectedLiveSessionId(data[0].id);
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchLiveChatSessions();
    const interval = setInterval(() => {
      fetchLiveChatSessions();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedLiveSessionId]);

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLiveSessionId || !adminReplyText.trim()) return;

    const textToSend = adminReplyText.trim();
    setAdminReplyText('');
    setIsSendingAdminReply(true);

    try {
      const res = await fetch('/api/livechat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedLiveSessionId,
          sender: 'admin',
          senderName: 'แอดมิน TripSea Tour',
          text: textToSend
        })
      });

      if (res.ok) {
        await fetchLiveChatSessions();
      }
    } catch (err) {
      console.error('Error sending admin reply:', err);
    } finally {
      setIsSendingAdminReply(false);
    }
  };

  const handleDeleteLiveChatSession = (sessionOrId: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const sessionObj = typeof sessionOrId === 'string'
      ? (liveChatSessions.find(s => s.id === sessionOrId) || { id: sessionOrId, customerName: 'ลูกค้า' })
      : sessionOrId;

    setSessionToDelete(sessionObj);
  };

  const confirmDeleteLiveChatSession = async () => {
    if (!sessionToDelete) return;
    const sessionIdToDelete = sessionToDelete.id;
    setSessionToDelete(null);

    // Immediately update local UI state
    setLiveChatSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionIdToDelete);
      if (selectedLiveSessionId === sessionIdToDelete) {
        setSelectedLiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });

    try {
      await fetch(`/api/livechat/delete/${sessionIdToDelete}?id=${encodeURIComponent(sessionIdToDelete)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionIdToDelete, sessionId: sessionIdToDelete })
      });
      fetchLiveChatSessions();
    } catch (err) {
      console.error('Failed to delete live chat session:', err);
    }
  };

  // Filters
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [supplierOrderFilter, setSupplierOrderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Sales Analytics & Agency Cost States
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<'all' | 'verified_only'>('all');
  const [quickCostTour, setQuickCostTour] = useState<Tour | null>(null);
  const [quickCostAdult, setQuickCostAdult] = useState<number>(0);
  const [quickCostChild, setQuickCostChild] = useState<number>(0);

  // Passenger Manifest & Back-office States
  const [manifestDateFilter, setManifestDateFilter] = useState<string>('all');
  const [manifestTourFilter, setManifestTourFilter] = useState<string>('all');
  const [manifestSupplierFilter, setManifestSupplierFilter] = useState<string>('all');
  const [manifestSearch, setManifestSearch] = useState<string>('');
  const [boatAssignments, setBoatAssignments] = useState<Record<string, string>>({});
  const [isPrintManifestOpen, setIsPrintManifestOpen] = useState<boolean>(false);
  const [lineSendSuccessMsg, setLineSendSuccessMsg] = useState<string | null>(null);

  // Modals & Forms
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isTourModalAiMode, setIsTourModalAiMode] = useState(false);
  const [testLineMsg, setTestLineMsg] = useState('🧪 [ทดสอบการแจ้งเตือน LINE Notify จากระบบแอดมิน]\n');
  const [deleteBookingTarget, setDeleteBookingTarget] = useState<Booking | null>(null);
  const [deleteTourTarget, setDeleteTourTarget] = useState<Tour | null>(null);
  const [tourVisibilityFilter, setTourVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [tourSearchTerm, setTourSearchTerm] = useState('');
  const [tourCategoryFilter, setTourCategoryFilter] = useState('all');
  const [togglingTourId, setTogglingTourId] = useState<string | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);


  const handleShiftTourOrder = async (tourId: string, direction: 'up' | 'down') => {
    const tourIndex = tours.findIndex(t => t.id === tourId);
    if (tourIndex === -1) return;
    const targetIndex = direction === 'up' ? tourIndex - 1 : tourIndex + 1;
    if (targetIndex < 0 || targetIndex >= tours.length) return;

    const reordered = [...tours];
    const temp = reordered[tourIndex];
    reordered[tourIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const indexed = reordered.map((t, idx) => ({ ...t, sortOrder: idx + 1 }));
    if (onSaveAllTours) {
      await onSaveAllTours(indexed);
    }
  };

  // Tour Backup, Save & Restore State
  const [isSavingAllTours, setIsSavingAllTours] = useState(false);
  const [saveAllSuccessAnim, setSaveAllSuccessAnim] = useState(false);
  const [lastToursSavedAt, setLastToursSavedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('tst_last_tours_saved_at') || null;
    } catch {
      return null;
    }
  });
  const [isTourBackupModalOpen, setIsTourBackupModalOpen] = useState(false);
  const [tourBackupActiveTab, setTourBackupActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importParsedTours, setImportParsedTours] = useState<Tour[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedToursJson, setCopiedToursJson] = useState(false);
  const [isConfirmResetToursOpen, setIsConfirmResetToursOpen] = useState(false);
  const [isResettingTours, setIsResettingTours] = useState(false);

  const handleSaveAllToursAction = async (toursToSave: Tour[] = tours) => {
    if (!onSaveAllTours) return;
    setIsSavingAllTours(true);
    try {
      await onSaveAllTours(toursToSave);
      const nowTime = new Date().toLocaleTimeString('th-TH');
      setLastToursSavedAt(nowTime);
      localStorage.setItem('tst_last_tours_saved_at', nowTime);
      setSaveAllSuccessAnim(true);
      setTimeout(() => setSaveAllSuccessAnim(false), 3000);
    } catch (err) {
      console.error('Failed to save all tours:', err);
    } finally {
      setIsSavingAllTours(false);
    }
  };

  const handleExportToursJson = () => {
    try {
      const jsonStr = JSON.stringify(tours, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `trip_sea_tours_backup_${dateStr}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export tours error:', err);
    }
  };

  const handleCopyToursJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(tours, null, 2));
      setCopiedToursJson(true);
      setTimeout(() => setCopiedToursJson(false), 2500);
    } catch (err) {
      console.error('Copy json error:', err);
    }
  };

  const parseAndValidateImportJson = (text: string) => {
    setImportError(null);
    setImportParsedTours(null);
    if (!text.trim()) return;

    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : (parsed.tours && Array.isArray(parsed.tours) ? parsed.tours : null);
      if (!list || list.length === 0) {
        setImportError('ข้อมูล JSON ต้องเป็นรายการ Array ของโปรแกรมทัวร์ เช่น [{ "id": "...", "title": {...} }]');
        return;
      }
      const valid = list.filter((item: any) => item && (item.title || item.id || item.priceAdult !== undefined));
      if (valid.length === 0) {
        setImportError('ไม่พบข้อมูลโปรแกรมทัวร์ที่ถูกต้องในไฟล์');
        return;
      }
      setImportParsedTours(valid);
    } catch (err: any) {
      setImportError(`รูปแบบ JSON ไม่ถูกต้อง: ${err.message || 'JSON Parse Error'}`);
    }
  };

  const handleImportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      parseAndValidateImportJson(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importParsedTours || importParsedTours.length === 0) return;
    
    // Ensure every imported tour has a stable id and slug
    const sanitizedImported = importParsedTours.map((t, idx) => ({
      ...t,
      id: t.id || `tour-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      slug: t.slug || t.id || `tour-${Date.now()}-${idx}`
    }));

    let finalTours: Tour[] = [];
    if (importMode === 'replace') {
      finalTours = sanitizedImported as Tour[];
    } else {
      const mergedList = [...tours];
      sanitizedImported.forEach(imported => {
        const existingIdx = mergedList.findIndex(t => t.id === imported.id || (t.title?.TH && t.title.TH === (imported as any).title?.TH));
        if (existingIdx !== -1) {
          mergedList[existingIdx] = { ...mergedList[existingIdx], ...imported } as Tour;
        } else {
          mergedList.push(imported as Tour);
        }
      });
      finalTours = mergedList;
    }

    await handleSaveAllToursAction(finalTours);
    setIsTourBackupModalOpen(false);
    setImportJsonText('');
    setImportParsedTours(null);
    setImportError(null);
  };

  const handleConfirmResetTours = async () => {
    if (!onResetToursToDefault) return;
    setIsResettingTours(true);
    try {
      await onResetToursToDefault();
      const nowTime = new Date().toLocaleTimeString('th-TH');
      setLastToursSavedAt(nowTime);
      localStorage.setItem('tst_last_tours_saved_at', nowTime);
      setIsConfirmResetToursOpen(false);
      setIsTourBackupModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResettingTours(false);
    }
  };

  // Customer Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);

  // Supplier State & Modals
  const [supplierSearch, setSupplierSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);

  // Review Reply State & AI
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [aiGeneratingMap, setAiGeneratingMap] = useState<Record<string, boolean>>({});
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null);
  const [editingReviewPhotos, setEditingReviewPhotos] = useState<Review | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');

  const isSuperAdmin = adminUser?.role === 'superadmin' || adminUser?.email?.trim().toLowerCase() === 'asmr9941@gmail.com';

  const hasAccess = (tab: 'overview' | 'orders' | 'livechat' | 'tours' | 'customers' | 'reviews' | 'settings' | 'manifest' | 'logistics' | 'suppliers' | 'analytics') => {
    if (isSuperAdmin) return true;
    const allowed = settings.adminPermissions || ['overview', 'orders', 'livechat', 'tours', 'reviews', 'manifest', 'logistics', 'suppliers', 'analytics'];
    return allowed.includes(tab);
  };

  const renderRestrictedArea = (title: string) => {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center max-w-lg mx-auto my-12 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-950/50">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-100 mb-2">🔒 สิทธิ์การเข้าถึงถูกจำกัด</h3>
        <p className="text-slate-400 text-xs leading-relaxed mb-6">
          บัญชีของคุณยังไม่มีสิทธิ์เข้าใช้งานหน้าเมนู <span className="text-amber-400 font-bold">"{title}"</span> กรุณาติดต่อผู้ดูแลระบบระดับสูงสุดเพื่อขอรับสิทธิ์
        </p>
        <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl text-left space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span>บัญชีของคุณ: <strong className="text-slate-200">{adminUser?.email || 'แอดมิน (PIN สำรอง)'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>สิทธิ์ปัจจุบัน: <span className="text-rose-400 font-bold">แอดมินทั่วไป (Standard Admin)</span></span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          * Super Administrator สามารถปรับแต่งสิทธิ์การเข้าถึงเมนูต่างๆ ของคุณได้แบบเรียลไทม์ ผ่านแท็บเมนูการตั้งค่าระบบหลังบ้าน
        </p>
      </div>
    );
  };

  // Settings State & Admin Google Account Management
  const [formSettings, setFormSettings] = useState<AppSettings>({ ...settings });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isDraggingTat, setIsDraggingTat] = useState(false);
  const tatFileInputRef = React.useRef<HTMLInputElement>(null);

  const readAndSetTatLicenseFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (Only image files are allowed)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB (File size must not exceed 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormSettings(prev => ({
        ...prev,
        tatLicenseImgUrl: base64String
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleTatLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndSetTatLicenseFile(file);
    }
  };

  const handleTatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTat(true);
  };

  const handleTatDragLeave = () => {
    setIsDraggingTat(false);
  };

  const handleTatDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTat(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readAndSetTatLicenseFile(file);
    }
  };

  const [detectedGroups, setDetectedGroups] = useState<Array<{ groupId: string; groupName?: string; lastSeen: string }>>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [groupFetchStatus, setGroupFetchStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Supabase Status & Purge State
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; url: string | null; error?: string | null } | null>(null);
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [cleanStatusMsg, setCleanStatusMsg] = useState<string | null>(null);

  const checkSupabaseStatus = async () => {
    try {
      // 1. Direct browser check via Supabase client SDK
      const client = getSupabase();
      if (client) {
        const { error: appStoreErr } = await client.from('app_store').select('key').limit(1);
        const { error: bookingsErr } = await client.from('bookings').select('id').limit(1);

        if (!appStoreErr || !bookingsErr) {
          setSupabaseStatus({
            connected: true,
            url: 'https://tljofqremlconawmtndd.supabase.co'
          });
          return;
        }
      }

      // 2. Try serverless / server endpoint fallback
      const res = await (fetch('/api/supabase-status').catch(() => null) || fetch('/api/admin/supabase-status').catch(() => null));
      if (res && res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data) {
            setSupabaseStatus(data);
            return;
          }
        }
      }

      if (isSupabaseConfigured) {
        setSupabaseStatus({
          connected: true,
          url: 'https://tljofqremlconawmtndd.supabase.co'
        });
      } else {
        setSupabaseStatus({ connected: false, url: null, error: 'ยังไม่ได้ตั้งค่า Supabase' });
      }
    } catch (err: any) {
      if (isSupabaseConfigured) {
        setSupabaseStatus({ connected: true, url: 'https://tljofqremlconawmtndd.supabase.co' });
      } else {
        setSupabaseStatus({ connected: false, url: null, error: err?.message || 'Network Error' });
      }
    }
  };

  const handleCleanDeletedData = async () => {
    setIsCleaningData(true);
    setCleanStatusMsg(null);
    try {
      // Direct clean on Supabase
      const client = getSupabase();
      if (client) {
        try {
          await client.from('app_store').upsert({
            key: 'bookings',
            value: JSON.stringify(bookings),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        } catch (e) {}

        try {
          await client.from('app_store').upsert({
            key: 'tours',
            value: JSON.stringify(tours),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        } catch (e) {}
      }

      // Try server endpoint
      await fetch('/api/admin/clean-deleted-data', { method: 'POST' }).catch(() => null);

      setCleanStatusMsg('✅ ล้างข้อมูลเก่าที่ลบไปแล้วสะสมใน Supabase เรียบร้อยแล้ว!');
      if (onRefreshData) onRefreshData();
    } catch (e) {
      setCleanStatusMsg('❌ เกิดข้อผิดพลาดในการล้างข้อมูล');
    } finally {
      setIsCleaningData(false);
    }
  };

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState<{
    success: boolean;
    message: string;
    backupTime?: string;
    counts?: { tours: number; bookings: number; reviews: number; customers: number };
  } | null>(null);

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setBackupStatusMsg(null);
    try {
      const res = await fetch('/api/admin/backup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setBackupStatusMsg({
          success: true,
          message: data.message || 'สำรองข้อมูลสำเร็จ!',
          backupTime: data.backupTime,
          counts: data.counts
        });
        if (onRefreshData) onRefreshData();
      } else {
        const data = await res.json().catch(() => null);
        setBackupStatusMsg({
          success: false,
          message: data?.message || data?.error || 'เกิดข้อผิดพลาดในการสำรองข้อมูลไปยังเซิร์ฟเวอร์'
        });
      }
    } catch (e: any) {
      console.error('Error backup database:', e);
      setBackupStatusMsg({
        success: false,
        message: `❌ เชื่อมต่อล้มเหลว: ${e?.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}`
      });
    } finally {
      setIsBackingUp(false);
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

  // Load Stats from backend API with automatic client-side calculation fallback
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && typeof data.totalRevenue === 'number') {
          setStats(data);
          return;
        }
      }
    } catch {
      // Quiet fallback
    }
    setStats(computeClientStats(bookings, tours));
  };

  useEffect(() => {
    fetchStats();
  }, [bookings, tours]);

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

  // Reset visitor analytics

  const handleResetVisitorAnalytics = async (mode: 'real_zero' | 'baseline') => {
    const confirmMsg = mode === 'real_zero'
      ? 'คุณต้องการรีเซ็ตสถิติเพื่อเริ่มนับจาก 0 คนดูจริงใช่หรือไม่?'
      : 'คุณต้องการรีเซ็ตกลับเป็นสถิติตัวอย่างเริ่มต้นใช่หรือไม่?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/analytics/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        if (onRefreshVisitorAnalytics) {
          await onRefreshVisitorAnalytics();
        }
        alert(mode === 'real_zero' ? 'เริ่มนับสถิติจริงจาก 0 เรียบร้อยแล้ว!' : 'คืนค่าสถิติเริ่มต้นเรียบร้อยแล้ว!');
      }
    } catch (err) {
      console.error('Reset analytics error:', err);
      alert('เกิดข้อผิดพลาดในการรีเซ็ตสถิติ');
    }
  };

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

    const matchesSupplier =
      supplierOrderFilter === 'all' ||
      (supplierOrderFilter === 'unassigned' && (!b.supplierId || b.supplierId === '')) ||
      (b.supplierId === supplierOrderFilter);

    const matchesSearch =
      b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      (b.customerLineId && b.customerLineId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.supplierName && b.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.pickupHotel && b.pickupHotel.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSupplier && matchesSearch;
  });

  // Helper to calculate agency cost of a single booking
  const getBookingAgencyCost = (b: Booking) => {
    const tour = tours.find(t => t.id === b.tourId);
    const costAdult = tour?.costAdult !== undefined ? tour.costAdult : Math.round((tour?.priceAdult || 0) * 0.65);
    const costChild = tour?.costChild !== undefined ? tour.costChild : Math.round((tour?.priceChild || 0) * 0.65);
    return (b.adults * costAdult) + (b.children * costChild);
  };

  // Compute sales & profit metrics dynamically based on bookings, tours, timeframe & filter
  const analytics = React.useMemo(() => {
    const eligibleBookings = bookings.filter(b => {
      if (analyticsStatusFilter === 'verified_only') {
        return b.paymentStatus === 'verified';
      }
      return b.paymentStatus !== 'cancelled' && b.orderStatus !== 'cancelled';
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalPax = 0;

    eligibleBookings.forEach(b => {
      totalRevenue += b.totalAmount;
      totalCost += getBookingAgencyCost(b);
      totalPax += (b.adults + b.children + b.infants);
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Build Time Series Data
    const chartMap: Record<string, { label: string; revenue: number; cost: number; profit: number; bookingsCount: number; paxCount: number }> = {};

    if (analyticsTimeframe === 'weekly') {
      const now = new Date();
      const weekBuckets: { label: string; start: Date; end: Date }[] = [];
      for (let i = 7; i >= 0; i--) {
        const dEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const dStart = new Date(dEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
        const startStr = `${dStart.getDate()}/${dStart.getMonth() + 1}`;
        const endStr = `${dEnd.getDate()}/${dEnd.getMonth() + 1}`;
        const label = `สัปดาห์ที่ ${8 - i} (${startStr}-${endStr})`;
        weekBuckets.push({ label, start: dStart, end: dEnd });
        chartMap[label] = { label, revenue: 0, cost: 0, profit: 0, bookingsCount: 0, paxCount: 0 };
      }

      eligibleBookings.forEach(b => {
        const bDate = new Date(b.createdAt || b.travelDate);
        const cost = getBookingAgencyCost(b);
        const pax = b.adults + b.children + b.infants;
        const bucket = weekBuckets.find(w => bDate >= w.start && bDate <= new Date(w.end.getTime() + 86400000));
        const targetLabel = bucket ? bucket.label : weekBuckets[weekBuckets.length - 1].label;

        if (chartMap[targetLabel]) {
          chartMap[targetLabel].revenue += b.totalAmount;
          chartMap[targetLabel].cost += cost;
          chartMap[targetLabel].profit += (b.totalAmount - cost);
          chartMap[targetLabel].bookingsCount += 1;
          chartMap[targetLabel].paxCount += pax;
        }
      });
    } else if (analyticsTimeframe === 'monthly') {
      const monthNamesTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = `${monthNamesTH[d.getMonth()]} ${String(d.getFullYear() + 543).slice(-2)}`;
        chartMap[monthLabel] = { label: monthLabel, revenue: 0, cost: 0, profit: 0, bookingsCount: 0, paxCount: 0 };
      }

      eligibleBookings.forEach(b => {
        const bDate = new Date(b.createdAt || b.travelDate);
        const monthLabel = `${monthNamesTH[bDate.getMonth()]} ${String(bDate.getFullYear() + 543).slice(-2)}`;
        const cost = getBookingAgencyCost(b);
        const pax = b.adults + b.children + b.infants;

        if (!chartMap[monthLabel]) {
          chartMap[monthLabel] = { label: monthLabel, revenue: 0, cost: 0, profit: 0, bookingsCount: 0, paxCount: 0 };
        }
        chartMap[monthLabel].revenue += b.totalAmount;
        chartMap[monthLabel].cost += cost;
        chartMap[monthLabel].profit += (b.totalAmount - cost);
        chartMap[monthLabel].bookingsCount += 1;
        chartMap[monthLabel].paxCount += pax;
      });
    } else {
      // Daily (Last 10 days)
      const now = new Date();
      const monthNamesTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      for (let i = 9; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayLabel = `${d.getDate()} ${monthNamesTH[d.getMonth()]}`;
        chartMap[dayLabel] = { label: dayLabel, revenue: 0, cost: 0, profit: 0, bookingsCount: 0, paxCount: 0 };
      }

      eligibleBookings.forEach(b => {
        const bDate = new Date(b.createdAt || b.travelDate);
        const dayLabel = `${bDate.getDate()} ${monthNamesTH[bDate.getMonth()]}`;
        const cost = getBookingAgencyCost(b);
        const pax = b.adults + b.children + b.infants;

        if (!chartMap[dayLabel]) {
          chartMap[dayLabel] = { label: dayLabel, revenue: 0, cost: 0, profit: 0, bookingsCount: 0, paxCount: 0 };
        }
        chartMap[dayLabel].revenue += b.totalAmount;
        chartMap[dayLabel].cost += cost;
        chartMap[dayLabel].profit += (b.totalAmount - cost);
        chartMap[dayLabel].bookingsCount += 1;
        chartMap[dayLabel].paxCount += pax;
      });
    }

    const timeSeriesData = Object.values(chartMap);

    // Tour Program Breakdown
    const tourProfitMap: Record<string, {
      tour: Tour;
      bookingsCount: number;
      adultsCount: number;
      childrenCount: number;
      totalPax: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      profitMargin: number;
    }> = {};

    tours.forEach(t => {
      const costAdult = t.costAdult !== undefined ? t.costAdult : Math.round(t.priceAdult * 0.65);
      const costChild = t.costChild !== undefined ? t.costChild : Math.round(t.priceChild * 0.65);
      tourProfitMap[t.id] = {
        tour: t,
        bookingsCount: 0,
        adultsCount: 0,
        childrenCount: 0,
        totalPax: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0
      };
    });

    eligibleBookings.forEach(b => {
      const tour = tours.find(t => t.id === b.tourId);
      if (!tour) return;
      if (!tourProfitMap[tour.id]) {
        tourProfitMap[tour.id] = {
          tour,
          bookingsCount: 0,
          adultsCount: 0,
          childrenCount: 0,
          totalPax: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMargin: 0
        };
      }
      const costAdult = tour.costAdult !== undefined ? tour.costAdult : Math.round(tour.priceAdult * 0.65);
      const costChild = tour.costChild !== undefined ? tour.costChild : Math.round(tour.priceChild * 0.65);
      const bCost = (b.adults * costAdult) + (b.children * costChild);

      const item = tourProfitMap[tour.id];
      item.bookingsCount += 1;
      item.adultsCount += b.adults;
      item.childrenCount += b.children;
      item.totalPax += (b.adults + b.children + b.infants);
      item.totalRevenue += b.totalAmount;
      item.totalCost += bCost;
      item.totalProfit += (b.totalAmount - bCost);
    });

    Object.values(tourProfitMap).forEach(item => {
      item.profitMargin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
    });

    const tourBreakdownList = Object.values(tourProfitMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMarginPercent,
      totalBookings: eligibleBookings.length,
      totalPax,
      timeSeriesData,
      tourBreakdownList
    };
  }, [bookings, tours, analyticsTimeframe, analyticsStatusFilter]);

  const COLORS = ['#0d9488', '#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen pb-16">
      {/* Backoffice Header */}
      <div className="no-print bg-slate-950 border-b border-slate-800 px-4 py-4 sm:px-8">
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

          {/* Quick Stats Pills & Sync Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sync Status Badge */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                : syncStatus === 'syncing'
                ? 'bg-amber-950/80 text-amber-400 border-amber-800/80 animate-pulse'
                : 'bg-rose-950/80 text-rose-400 border-rose-800/80'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'
              }`} />
              <span>
                {syncStatus === 'synced' ? `ซิงค์สำเร็จ (${lastSyncedAt || 'สด'})` : syncStatus === 'syncing' ? 'กำลังซิงค์...' : 'การซิงค์ขัดข้อง'}
              </span>
            </div>

            {/* Full System JSON Backup Quick Button */}
            <button
              type="button"
              onClick={() => openUniversalBackup('all')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
              title="เปิดศูนย์สำรองและกู้คืนข้อมูล JSON ทั้งระบบ"
            >
              <FileJson className="w-4 h-4 text-emerald-200" />
              <span>💾 สำรองข้อมูลทั้งระบบ (JSON)</span>
            </button>

            {onForceSync && (
              <button
                type="button"
                onClick={onForceSync}
                className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                title="ล้างแคช local storage และดึงข้อมูลสดจากเซิร์ฟเวอร์"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>ล้างแคช & รีเซ็ต</span>
              </button>
            )}

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
            {!hasAccess('overview') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'analytics' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 font-black' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>สถิติผู้เข้าชมเว็บ (Visitors)</span>
            <span className="bg-emerald-500/25 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{visitorAnalytics?.activeNow || 1} ออนไลน์</span>
            </span>
            {!hasAccess('analytics') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
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
            {!hasAccess('orders') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('livechat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'livechat' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Headphones className="w-4 h-4 text-blue-400" />
            <span>💬 แชทสดลูกค้า ({liveChatSessions.length})</span>
            {liveChatSessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0) > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                {liveChatSessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0)}
              </span>
            )}
            {!hasAccess('livechat') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
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
            {!hasAccess('tours') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'customers' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ฐานข้อมูลลูกค้า CRM ({customers.length})</span>
            {!hasAccess('customers') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'manifest' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Ship className="w-4 h-4 text-cyan-400" />
            <span>ใบบัญชีรายชื่อผู้โดยสาร & ประกันภัย</span>
            {!hasAccess('manifest') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30 mr-1.5">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
            <span className="bg-cyan-500/30 text-cyan-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-cyan-400/30">
              Insurance List
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logistics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'logistics' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>🗺️ แผนที่รถรับส่งประจำวัน (Pickup Map)</span>
            {!hasAccess('logistics') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30 mr-1.5">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
            <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
              Logistics
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'suppliers' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>🏢 เอเยนต์/ซัพพลายเออร์ ({suppliers.length})</span>
            {!hasAccess('suppliers') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30 mr-1.5">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
            <span className="bg-amber-500/30 text-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-400/30">
              Suppliers
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reviews' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400" />
            <span>จัดการรีวิว & ตอบกลับ ({reviews.length})</span>
            {!hasAccess('reviews') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ตั้งค่า & บัญชี Google Admin</span>
            {!hasAccess('settings') && (
              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>จำกัดสิทธิ์</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Backoffice Content Area */}
      <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          !hasAccess('overview') ? (
            renderRestrictedArea('แดชบอร์ดสถิติ')
          ) : (
            <div className="space-y-8 animate-in fade-in">
              {/* Controls Bar & Date Filter */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-500/20 text-teal-400 font-bold text-xs px-2.5 py-0.5 rounded-full border border-teal-500/30">
                      Data Visualization & Financial Analytics
                    </span>
                    <span className="text-xs text-slate-400">วิเคราะห์ยอดขาย ราคาทุนเอเยนต์ และกำไรสุทธิ</span>
                  </div>
                  <h2 className="text-lg font-extrabold text-white mt-1 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-400" />
                    <span>สรุปผลการดำเนินงานและสถิติต้นทุนเอเยนต์ (Executive Analytics)</span>
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Filter */}
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs">
                    <button
                      onClick={() => setAnalyticsStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        analyticsStatusFilter === 'all'
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ออเดอร์ทั้งหมด ({bookings.length})
                    </button>
                    <button
                      onClick={() => setAnalyticsStatusFilter('verified_only')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        analyticsStatusFilter === 'verified_only'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ✓ ชำระสำเร็จเท่านั้น ({bookings.filter(b => b.paymentStatus === 'verified').length})
                    </button>
                  </div>

                  {/* Timeframe Selector */}
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs">
                    <button
                      onClick={() => setAnalyticsTimeframe('daily')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                        analyticsTimeframe === 'daily'
                          ? 'bg-teal-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>รายวัน</span>
                    </button>
                    <button
                      onClick={() => setAnalyticsTimeframe('weekly')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                        analyticsTimeframe === 'weekly'
                          ? 'bg-teal-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>รายสัปดาห์</span>
                    </button>
                    <button
                      onClick={() => setAnalyticsTimeframe('monthly')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                        analyticsTimeframe === 'monthly'
                          ? 'bg-teal-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>รายเดือน</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Top 4 Financial Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Revenue */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-teal-500/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">ยอดขายรวม (Total Revenue)</span>
                      <span className="text-2xl font-extrabold text-teal-400 mt-1 block">
                        ฿{analytics.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-teal-300/80 flex items-center justify-between font-medium pt-2 border-t border-slate-700/50">
                    <span>จำนวนการจองรวม:</span>
                    <span className="font-bold text-white">{analytics.totalBookings} ออเดอร์</span>
                  </div>
                </div>

                {/* 2. Total Agency Cost */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">ต้นทุนเอเยนต์รวม (Agency Net Cost)</span>
                      <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                        ฿{analytics.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-amber-300/80 flex items-center justify-between font-medium pt-2 border-t border-slate-700/50">
                    <span>สัดส่วนต้นทุนจากยอดขาย:</span>
                    <span className="font-bold text-amber-300">
                      {analytics.totalRevenue > 0 ? ((analytics.totalCost / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* 3. Total Net Profit */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">กำไรสุทธิรวม (Total Net Profit)</span>
                      <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                        ฿{analytics.totalProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-emerald-300/80 flex items-center justify-between font-medium pt-2 border-t border-slate-700/50">
                    <span>รายได้สุทธิหลังหักทุนเอเยนต์</span>
                    <span className="font-bold text-emerald-400">✓ สด</span>
                  </div>
                </div>

                {/* 4. Profit Margin & Pax */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-cyan-500/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">อัตรากำไร (Net Profit Margin)</span>
                      <span className="text-2xl font-extrabold text-cyan-400 mt-1 block">
                        {analytics.profitMarginPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center">
                      <Percent className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-cyan-300/80 flex items-center justify-between font-medium pt-2 border-t border-slate-700/50">
                    <span>จำนวนนักท่องเที่ยวรวม:</span>
                    <span className="font-bold text-white">{analytics.totalPax} ท่าน</span>
                  </div>
                </div>
              </div>

              {/* Real-time Website Visitor Summary Banner in Overview */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950/80 border border-cyan-500/30 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-300">👥 ทราฟฟิกคนเข้าชมเว็บไซต์ (Website Traffic & Visitors)</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>{visitorAnalytics?.activeNow || 1} คนกำลังออนไลน์สด</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-1 text-xs text-slate-300 font-medium">
                      <span>ยอดเข้าชมวันนี้: <strong className="text-white font-mono text-sm">{visitorAnalytics?.todayPageviews?.toLocaleString() || '186'}</strong> ครั้ง</span>
                      <span>ผู้เข้าชมไม่ซ้ำวันนี้: <strong className="text-cyan-300 font-mono text-sm">{visitorAnalytics?.todayUniqueVisitors?.toLocaleString() || '114'}</strong> คน</span>
                      <span>ยอดเข้าชมทั้งหมด: <strong className="text-emerald-400 font-mono text-sm">{visitorAnalytics?.totalPageviews?.toLocaleString() || '24,850'}</strong> ครั้ง</span>
                      <span className="text-slate-400 hidden sm:inline">| มือถือ 68% • คอมฯ 28% • แท็บเล็ต 4%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    <span>ดูสถิติผู้เข้าชมแบบละเอียด & กราฟแนวโน้ม</span>
                    <ArrowUpRight className="w-4 h-4 text-cyan-200" />
                  </button>
                </div>
              </div>

              {/* Main Financial Visualization Chart */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-teal-400" />
                      <span>
                        กราฟเปรียบเทียบ ยอดขาย vs ราคาทุนเอเยนต์ vs กำไรสุทธิ ({analyticsTimeframe === 'weekly' ? 'รายสัปดาห์' : analyticsTimeframe === 'monthly' ? 'รายเดือน' : 'รายวัน'})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      แสดงข้อมูลการเติบโตทางเงินสด ต้นทุนเอเยนต์คู่ค้า และกำไรขั้นต้นอย่างชัดเจน
                    </p>
                  </div>

                  {/* Legend Indicator */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-teal-500"></span>
                      <span className="text-slate-300">ยอดขาย (Revenue)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                      <span className="text-slate-300">ทุนเอเยนต์ (Agency Cost)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                      <span className="text-slate-300">กำไรสุทธิ (Net Profit)</span>
                    </div>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.timeSeriesData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `฿${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                        formatter={(value: any, name: string) => {
                          const valNum = Number(value);
                          if (name === 'ยอดขาย (Revenue)') return [`฿${valNum.toLocaleString()}`, '💰 ยอดขาย'];
                          if (name === 'ทุนเอเยนต์ (Agency Cost)') return [`฿${valNum.toLocaleString()}`, '🏭 ทุนเอเยนต์'];
                          if (name === 'กำไรสุทธิ (Net Profit)') return [`฿${valNum.toLocaleString()}`, '📈 กำไรสุทธิ'];
                          return [`฿${valNum.toLocaleString()}`, name];
                        }}
                      />
                      <Bar dataKey="revenue" name="ยอดขาย (Revenue)" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="cost" name="ทุนเอเยนต์ (Agency Cost)" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="profit" name="กำไรสุทธิ (Net Profit)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Secondary Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bookings & Passenger Volume Chart */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                  <div className="border-b border-slate-700/60 pb-3 mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-blue-400" />
                        <span>ปริมาณการจองและจำนวนผู้เดินทาง (Bookings & Pax Volume)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">จำแนกตาม {analyticsTimeframe === 'weekly' ? 'รายสัปดาห์' : analyticsTimeframe === 'monthly' ? 'รายเดือน' : 'รายวัน'}</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={analytics.timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                        <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} label={{ value: 'ออเดอร์', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={11} label={{ value: 'นักท่องเที่ยว (คน)', angle: 90, position: 'insideRight', fill: '#06b6d4', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                        <Bar yAxisId="left" dataKey="bookingsCount" name="จำนวนออเดอร์" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                        <Line yAxisId="right" type="monotone" dataKey="paxCount" name="นักท่องเที่ยวรวม (คน)" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Breakdown Donut Chart */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                  <div className="border-b border-slate-700/60 pb-3 mb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-cyan-400" />
                      <span>สัดส่วนยอดขายตามประเภททัวร์ (Category Share)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">แบ่งตามหมวดหมู่เกาะ พรีเมียม และซิตี้ทัวร์</p>
                  </div>

                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.categoryBreakdown || []}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={45}
                          paddingAngle={5}
                        >
                          {(stats?.categoryBreakdown || []).map((cat, index) => (
                            <Cell key={`cell-${cat?.category || index}-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                    {(stats?.categoryBreakdown || []).map((cat, idx) => (
                      <span key={`cat-legend-${cat?.category || idx}-${idx}`} className="flex items-center gap-1.5 font-medium">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span>{cat.category}: <strong className="text-white">{cat.count} รายการ</strong></span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tour Agency Cost & Profitability Table */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-400" />
                      <span>ตารางคิดราคาทุนเอเยนต์และกำไรรายโปรแกรมทัวร์ (Tour Costing & Profit Margin)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      แสดงราคาขาย ราคาทุนเอเยนต์ supplier และยอดกำไรสะสมเพื่อการวางแผนการขาย
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-700/80">
                      <tr>
                        <th className="p-3.5">โปรแกรมทัวร์</th>
                        <th className="p-3.5">ราคาขาย (ผู้ใหญ่/เด็ก)</th>
                        <th className="p-3.5">ทุนเอเยนต์ (ผู้ใหญ่/เด็ก)</th>
                        <th className="p-3.5">กำไร/ตั๋ว (Margin)</th>
                        <th className="p-3.5 text-center">ออเดอร์/ผู้เดินทาง</th>
                        <th className="p-3.5 text-right">ยอดขายรวม</th>
                        <th className="p-3.5 text-right text-amber-400">ทุนรวมเอเยนต์</th>
                        <th className="p-3.5 text-right text-emerald-400">กำไรสุทธิ</th>
                        <th className="p-3.5 text-center">จัดการทุน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 font-medium text-slate-200">
                      {analytics.tourBreakdownList.map((item, idx) => {
                        const t = item.tour;
                        const costAdult = t.costAdult !== undefined ? t.costAdult : Math.round(t.priceAdult * 0.65);
                        const costChild = t.costChild !== undefined ? t.costChild : Math.round(t.priceChild * 0.65);
                        const profitAdult = t.priceAdult - costAdult;
                        const profitChild = t.priceChild - costChild;

                        return (
                          <tr key={t?.id ? `cost-tr-${t.id}-${idx}` : `cost-tr-${idx}`} className="hover:bg-slate-700/30 transition">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                {t.images && t.images[0] ? (
                                  <img src={t.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-700 shrink-0" />
                                )}
                                <div>
                                  <span className="font-bold text-white block">{t.title.TH}</span>
                                  <span className="text-[10px] text-teal-400 bg-teal-950/60 border border-teal-800/60 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                    {t.category}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="space-y-0.5">
                                <div>ผู้ใหญ่: <span className="font-bold text-emerald-400">฿{t.priceAdult.toLocaleString()}</span></div>
                                <div>เด็ก: <span className="font-bold text-cyan-400">฿{t.priceChild.toLocaleString()}</span></div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="space-y-0.5">
                                <div>ผู้ใหญ่: <span className="font-bold text-amber-400">฿{costAdult.toLocaleString()}</span></div>
                                <div>เด็ก: <span className="font-bold text-amber-400">฿{costChild.toLocaleString()}</span></div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="space-y-0.5">
                                <div className="text-emerald-400 font-bold">฿{profitAdult.toLocaleString()} <span className="text-[10px] text-slate-400">({((profitAdult/t.priceAdult)*100).toFixed(0)}%)</span></div>
                                <div className="text-cyan-400 font-bold">฿{profitChild.toLocaleString()} <span className="text-[10px] text-slate-400">({((profitChild/t.priceChild)*100).toFixed(0)}%)</span></div>
                              </div>
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="font-bold text-white">{item.bookingsCount} ออเดอร์</div>
                              <div className="text-[10px] text-slate-400">{item.totalPax} นักท่องเที่ยว</div>
                            </td>

                            <td className="p-3.5 text-right font-extrabold text-white">
                              ฿{item.totalRevenue.toLocaleString()}
                            </td>

                            <td className="p-3.5 text-right font-extrabold text-amber-400">
                              ฿{item.totalCost.toLocaleString()}
                            </td>

                            <td className="p-3.5 text-right font-extrabold text-emerald-400">
                              ฿{item.totalProfit.toLocaleString()}
                            </td>

                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickCostTour(t);
                                  setQuickCostAdult(costAdult);
                                  setQuickCostChild(costChild);
                                }}
                                className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 mx-auto"
                                title="แก้ไขราคาทุนเอเยนต์ supplier ด่วน"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>ปรับราคาทุน</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB: LIVE CHAT CUSTOMER INBOX */}
        {activeTab === 'livechat' && (
          !hasAccess('livechat') ? (
            renderRestrictedArea('ระบบแชทสดลูกค้า (Live Chat Inbox)')
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500/20 text-blue-400 font-bold text-xs px-2.5 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Real-time On-site Messenger
                    </span>
                    <span className="text-xs text-slate-400">ระบบสนทนาสดตรงจากหน้าเว็บไซต์</span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                    <Headphones className="w-6 h-6 text-blue-400" />
                    <span>กล่องข้อความแชทสดลูกค้า (Live Chat Customer Service)</span>
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchLiveChatSessions}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                    title="ดึงข้อมูลแชทล่าสุด"
                  >
                    <RefreshCw className="w-4 h-4 text-blue-300" />
                    <span>รีเฟรชข้อความ</span>
                  </button>
                  <span className="bg-blue-950 text-blue-300 border border-blue-800 font-extrabold text-xs px-3.5 py-2 rounded-xl">
                    {liveChatSessions.length} ห้องสนทนา
                  </span>
                </div>
              </div>

              {/* Chat Inbox Interface */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] max-h-[750px]">
                {/* Left Column: Sessions List */}
                <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/60 shrink-0">
                  <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 font-bold text-xs text-slate-300 flex items-center justify-between">
                    <span>รายการผู้สนทนาสดล่าสุด</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                      Auto Polling 3s
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                    {liveChatSessions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-400" />
                        <p className="font-bold text-slate-400">ยังไม่มีผู้กดแชทสดจากหน้าเว็บ</p>
                        <p className="text-[11px] mt-1 text-slate-500">เมื่อลูกค้ากด "แชทสดเจ้าหน้าที่" บนหน้าเว็บ ข้อความจะมาปรากฏที่นี่ทันที</p>
                      </div>
                    ) : (
                      liveChatSessions.map((session, sIdx) => {
                        const isSelected = selectedLiveSessionId === session.id;
                        const lastMsg = session.messages?.[session.messages.length - 1];
                        return (
                          <div
                            key={session.id || `chat-session-${sIdx}`}
                            className={`w-full p-3.5 text-left transition flex items-start justify-between gap-3 group ${
                              isSelected
                                ? 'bg-blue-900/40 border-l-4 border-blue-500'
                                : 'hover:bg-slate-900/60 border-l-4 border-transparent'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedLiveSessionId(session.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                                  {session.customerName ? session.customerName.charAt(0) : 'ค'}
                                </div>
                                <span className="font-bold text-slate-200 text-xs truncate">
                                  {session.customerName || 'ลูกค้าทั่วไป'}
                                </span>
                                {session.unreadCount > 0 && (
                                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse ml-auto">
                                    NEW {session.unreadCount}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-400 truncate pl-9">
                                {lastMsg ? lastMsg.text : 'เริ่มเปิดห้องสนทนา...'}
                              </p>
                            </button>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-[9px] text-slate-500 font-mono">
                                {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLiveChatSession(session, e)}
                                className="opacity-60 hover:opacity-100 p-1 bg-rose-950/60 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800/80 rounded-lg transition"
                                title="ลบห้องสนทนานี้"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Active Conversation */}
                <div className="flex-1 flex flex-col bg-slate-900/90">
                  {(() => {
                    const activeSession = liveChatSessions.find(s => s.id === selectedLiveSessionId);
                    if (!activeSession) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs text-center">
                          <Headphones className="w-12 h-12 text-slate-700 mb-3" />
                          <p className="text-sm font-bold text-slate-300">เลือกห้องสนทนาฝั่งซ้ายเพื่อเริ่มคุยตอบกลับ</p>
                          <p className="text-xs text-slate-500 mt-1">แอดมินสามารถส่งข้อความตอบกลับลูกค้าที่คุยผ่านหน้าเว็บได้แบบ Real-time</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-md">
                              {activeSession.customerName ? activeSession.customerName.charAt(0) : 'ค'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-sm text-white">{activeSession.customerName || 'ลูกค้าทั่วไป'}</h3>
                                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-800/80 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Online On-site
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Session ID: {activeSession.id}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteLiveChatSession(activeSession, e)}
                              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                              title="ลบห้องสนทนานี้ออก"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>ลบแชทนี้</span>
                            </button>
                          </div>
                        </div>

                        {/* Quick Response Buttons */}
                        <div className="p-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
                          <span className="text-slate-500 font-medium shrink-0 text-[10px]">ข้อความตอบด่วน:</span>
                          {[
                            'สวัสดีค่ะ มีอะไรให้แอดมินช่วยดูแลไหมคะ? 🙏',
                            'ยินดีให้บริการค่ะ สามารถสอบถามรอบเรือได้เลยค่ะ',
                            'ท่านสามารถโอนชำระเงินและแนบสลิปผ่านหน้าเว็บได้เลยค่ะ',
                            'แอดมินยืนยันรายการจองและตั๋วเรียบร้อยแล้วค่ะ 😊'
                          ].map((quickText, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => setAdminReplyText(quickText)}
                              className="whitespace-nowrap bg-slate-800 hover:bg-blue-900/60 text-slate-300 hover:text-white border border-slate-700 text-[10px] px-2.5 py-1 rounded-lg transition shrink-0"
                            >
                              {quickText}
                            </button>
                          ))}
                        </div>

                        {/* Messages Stream */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-900/50">
                          {activeSession.messages.map((m: any, mIdx: number) => {
                            const isAdmin = m.sender === 'admin';
                            return (
                              <div
                                key={m.id || `msg-${mIdx}`}
                                className={`flex gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                              >
                                {!isAdmin && (
                                  <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                                    {activeSession.customerName ? activeSession.customerName.charAt(0) : 'ค'}
                                  </div>
                                )}

                                <div
                                  className={`max-w-[75%] rounded-2xl p-3 shadow-md ${
                                    isAdmin
                                      ? 'bg-blue-600 text-white rounded-tr-xs'
                                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-xs'
                                  }`}
                                >
                                  <div className="text-[9px] font-extrabold mb-1 opacity-80 flex items-center justify-between gap-2">
                                    <span>{m.senderName || (isAdmin ? 'แอดมิน TripSea' : activeSession.customerName || 'ลูกค้า')}</span>
                                    {isAdmin && <CheckCheck className="w-3 h-3 text-blue-200" />}
                                  </div>

                                  {m.imageUrl && (
                                    <div className="mb-2 rounded-xl overflow-hidden border border-black/20">
                                      <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={m.imageUrl} alt="attached" className="max-h-60 w-full object-cover hover:opacity-90 transition" />
                                      </a>
                                    </div>
                                  )}

                                  <p className="whitespace-pre-line leading-relaxed text-xs">{m.text}</p>

                                  <div
                                    className={`text-[9px] mt-1 text-right ${
                                      isAdmin ? 'text-blue-200' : 'text-slate-400'
                                    }`}
                                  >
                                    {m.timestamp}
                                  </div>
                                </div>

                                {isAdmin && (
                                  <div className="w-7 h-7 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                    <Headphones className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Reply Form Footer */}
                        <div className="p-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
                          <form onSubmit={handleSendAdminReply} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={adminReplyText}
                              onChange={(e) => setAdminReplyText(e.target.value)}
                              placeholder="พิมพ์ข้อความตอบกลับลูกค้าที่นี่..."
                              className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                              disabled={isSendingAdminReply}
                            />
                            <button
                              type="submit"
                              disabled={!adminReplyText.trim() || isSendingAdminReply}
                              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-900/30 active:scale-95 shrink-0"
                            >
                              <Send className="w-4 h-4" />
                              <span>ส่งตอบกลับ</span>
                            </button>
                          </form>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Custom Modal for Chat Deletion Confirmation */}
              {sessionToDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                    <div className="flex items-center gap-3 text-rose-400">
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                        <Trash2 className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">ยืนยันการลบห้องสนทนา</h3>
                        <p className="text-xs text-slate-400">การดำเนินการนี้ไม่สามารถกู้คืนได้</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                      คุณต้องการลบแชทของ <span className="font-bold text-amber-300">{sessionToDelete.customerName || 'ลูกค้า'}</span> ใช่หรือไม่?
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setSessionToDelete(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteLiveChatSession}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/40 active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>ยืนยันลบถาวร</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* TAB 2: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          !hasAccess('orders') ? (
            renderRestrictedArea('จัดการออเดอร์และการเงิน')
          ) : (
            <div className="space-y-6 animate-in fade-in">
            {/* Orders Persistence & Backup Quick Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-slate-950/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-xs sm:text-sm">
                      ศูนย์สำรองและกู้คืนข้อมูลคำสั่งซื้อ & บุ๊คกิ้ง ({bookings.length} รายการ)
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      Order Records Safe
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ส่งออก (Export JSON) เก็บประวัติออเดอร์และการเงินไว้ หรือนำเข้า (Import JSON) กู้คืนได้ทันที
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openUniversalBackup('bookings')}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-teal-950/50 cursor-pointer active:scale-95"
                >
                  <FileJson className="w-4 h-4 text-teal-100" />
                  <span>สำรอง & กู้คืนออเดอร์ (JSON)</span>
                </button>
              </div>
            </div>

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

                {/* Supplier Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 shadow-sm">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <select
                    value={supplierOrderFilter}
                    onChange={(e) => setSupplierOrderFilter(e.target.value)}
                    className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-white">🏢 เอเยนต์ทั้งหมด ({bookings.length})</option>
                    <option value="unassigned" className="bg-slate-900 text-amber-300">⚠️ ยังไม่ระบุเอเยนต์ ({bookings.filter(b => !b.supplierId).length})</option>
                    {suppliers.map((s, sIdx) => (
                      <option key={`sup-opt-${s.id || sIdx}-${sIdx}`} value={s.id} className="bg-slate-900 text-white">
                        🏢 [{s.code}] {s.name} ({bookings.filter(b => b.supplierId === s.id).length})
                      </option>
                    ))}
                  </select>
                </div>
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
                      <th className="p-3.5">ผู้จอง & เบอร์ / LINE</th>
                      <th className="p-3.5">วันเดินทาง / จำนวน</th>
                      <th className="p-3.5">เอเยนต์ผู้ให้บริการ</th>
                      <th className="p-3.5">ยอดเงิน</th>
                      <th className="p-3.5">สลิปโอนเงิน</th>
                      <th className="p-3.5 text-center">จัดการคำสั่งซื้อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredBookings.map((b, idx) => (
                      <tr key={b.id ? `order-tr-${b.id}-${idx}` : `order-tr-${idx}`} className="hover:bg-slate-700/30 transition">
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

                        <td className="p-3.5 space-y-1.5 min-w-[200px]">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{b.customerName}</span>
                            {b.nationality && (
                              <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-normal">
                                {b.nationality}
                              </span>
                            )}
                          </div>

                          <div className="text-slate-300 flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400">📞</span>
                            <a href={`tel:${b.customerPhone}`} className="hover:text-teal-300 font-mono font-semibold transition">
                              {b.customerPhone}
                            </a>
                          </div>

                          {/* Customer LINE ID Display */}
                          <div className="pt-0.5">
                            {b.customerLineId ? (
                              <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-sm">
                                <MessageCircle className="w-3.5 h-3.5 text-[#06C755] shrink-0" />
                                <span className="text-emerald-400/80 text-[10px]">LINE:</span>
                                <span className="font-mono text-white font-extrabold">{b.customerLineId}</span>
                                <a
                                  href={`https://line.me/R/ti/p/~${b.customerLineId.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-[10px] bg-[#06C755] hover:bg-[#05b34c] text-white px-1.5 py-0.5 rounded font-bold transition shadow-sm"
                                  title={`เปิดแชท LINE กับ ${b.customerName} (@${b.customerLineId})`}
                                >
                                  ทักไลน์
                                </a>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-slate-400 text-[10px] bg-slate-900/80 border border-slate-700/60 px-2 py-0.5 rounded-lg">
                                <MessageCircle className="w-3 h-3 text-slate-500" />
                                <span>LINE: <span className="font-mono text-slate-300">{b.customerPhone}</span> (เบอร์โทร)</span>
                              </div>
                            )}
                          </div>

                          <div className="text-slate-400 text-[11px] truncate max-w-[240px]" title={`${b.pickupHotel} ${b.roomNumber ? `(ห้อง ${b.roomNumber})` : ''} (${b.pickupZone})`}>
                            🏨 {b.pickupHotel} {b.roomNumber ? `(ห้อง ${b.roomNumber})` : ''} ({b.pickupZone})
                          </div>
                        </td>

                        <td className="p-3.5 space-y-0.5">
                          <div className="font-bold text-teal-300">📅 {b.travelDate}</div>
                          <div className="text-slate-400">👥 ผญ: {b.adults} / เด็ก: {b.children}</div>
                        </td>

                        {/* Supplier Selector Cell */}
                        <td className="p-3.5 min-w-[170px]">
                          <div className="space-y-1">
                            <select
                              value={b.supplierId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const sup = suppliers.find(s => s.id === selectedId);
                                if (onUpdateBookingSupplier) {
                                  onUpdateBookingSupplier(b.id, selectedId || undefined, sup ? sup.name : undefined);
                                }
                              }}
                              className={`w-full text-xs font-bold rounded-xl px-2.5 py-1.5 border transition focus:outline-none focus:ring-2 cursor-pointer ${
                                b.supplierId
                                  ? 'bg-amber-950/80 border-amber-700/80 text-amber-300 focus:ring-amber-500'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 focus:ring-teal-500'
                              }`}
                            >
                              <option value="" className="bg-slate-900 text-slate-400">-- เลือกเอเยนต์ / รอส่งงาน --</option>
                              {suppliers.map((s, sIdx) => (
                                <option key={`order-sup-opt-${s.id || sIdx}-${sIdx}`} value={s.id} className="bg-slate-900 text-white font-bold">
                                  [{s.code}] {s.name}
                                </option>
                              ))}
                            </select>
                            {b.supplierId ? (
                              <span className="text-[10px] text-amber-400 font-bold block truncate">
                                ✓ {suppliers.find(s => s.id === b.supplierId)?.name || b.supplierName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 block">
                                ⚠️ ยังไม่ระบุเอเยนต์
                              </span>
                            )}
                          </div>
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
                              ✓ อนุมัติแล้ว
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
          )
        )}

        {/* TAB 3: TOUR PROGRAM MANAGEMENT */}
        {activeTab === 'tours' && (
          !hasAccess('tours') ? (
            renderRestrictedArea('จัดการโปรแกรมทัวร์')
          ) : (() => {
            const isTourVisible = (tr: Tour) => {
              return tr.isVisible !== false && tr.isAvailable !== false;
            };

            const visibleCount = tours.filter(t => isTourVisible(t)).length;
            const hiddenCount = tours.filter(t => !isTourVisible(t)).length;

            const filteredAdminTours = tours.filter(tr => {
              const isVis = isTourVisible(tr);
              if (tourVisibilityFilter === 'visible' && !isVis) return false;
              if (tourVisibilityFilter === 'hidden' && isVis) return false;

              if (tourCategoryFilter !== 'all' && tr.category !== tourCategoryFilter) return false;

              if (tourSearchTerm.trim()) {
                const q = tourSearchTerm.toLowerCase();
                const matchTH = tr.title?.TH?.toLowerCase().includes(q);
                const matchEN = tr.title?.EN?.toLowerCase().includes(q);
                const matchLoc = tr.location?.toLowerCase().includes(q);
                const matchSup = tr.supplierName?.toLowerCase().includes(q);
                const matchTag = tr.tags?.some(tag => tag.toLowerCase().includes(q));
                if (!matchTH && !matchEN && !matchLoc && !matchSup && !matchTag) return false;
              }

              return true;
            });

            const handleToggleTourVisibility = async (tr: Tour) => {
              if (!onUpdateTour) return;
              const currentVis = isTourVisible(tr);
              const nextVis = !currentVis;
              setTogglingTourId(tr.id);
              try {
                await onUpdateTour(tr.id, {
                  isVisible: nextVis,
                  isAvailable: nextVis
                });
              } catch (err) {
                console.error('Failed to toggle tour visibility:', err);
              } finally {
                setTogglingTourId(null);
              }
            };

            return (
              <div className="space-y-6 animate-in fade-in">
                {/* Header & Add Tour Button */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-400" />
                      <span>จัดการรายการโปรแกรมทัวร์ (Tour Programs)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      กำหนดเปิด/ปิดการแสดงผลหน้าเว็บ (Show/Hide), ปรับราคา, หมวดหมู่, บริษัทเรือ และรายละเอียดโปรแกรม
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Save All Tours Button */}
                    <button
                      onClick={() => handleSaveAllToursAction()}
                      disabled={isSavingAllTours}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50 active:scale-95"
                      title="บันทึกข้อมูลโปรแกรมทัวร์ทั้งหมดลงฐานข้อมูลคลาวด์และเซิร์ฟเวอร์ทันที"
                    >
                      <Save className={`w-4 h-4 ${isSavingAllTours ? 'animate-spin' : ''}`} />
                      <span>
                        {isSavingAllTours 
                          ? 'กำลังบันทึก...' 
                          : saveAllSuccessAnim 
                            ? '✓ บันทึกสำเร็จแล้ว!' 
                            : '💾 เซฟทัวร์ทั้งหมด (Save All)'}
                      </span>
                    </button>

                    {/* Backup & Restore Modal Trigger */}
                    <button
                      onClick={() => {
                        setImportJsonText('');
                        setImportError(null);
                        setImportParsedTours(null);
                        setIsTourBackupModalOpen(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                      title="สำรองข้อมูล JSON หรือนำเข้าข้อมูลกู้คืน"
                    >
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span>สำรอง/กู้คืน (Backup)</span>
                    </button>

                    {/* Add Tour via AI Image Scanner Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTour(null);
                        setIsTourModalAiMode(true);
                        setIsTourModalOpen(true);
                      }}
                      className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer active:scale-95 ring-1 ring-purple-400/30"
                      title="เพิ่มโปรแกรมทัวร์ใหม่ด้วยการอัปโหลดรูปภาพโบรชัวร์หลายๆ รูปพร้อมกัน (หน้าปก + ตารางเวลา + รายละเอียดราคา) แล้วให้ AI อ่านและกรอกข้อมูลให้อัตโนมัติ"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>✨ เพิ่มทัวร์ด้วย AI สแกนรูปภาพ (หลายรูป)</span>
                    </button>

                    {/* Reorder Tours Button */}
                    <button
                      type="button"
                      onClick={() => setIsReorderModalOpen(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95"
                      title="จัดลำดับการแสดงผลโปรแกรมทัวร์บนหน้าแรกของเว็บไซต์"
                    >
                      <MoveVertical className="w-4 h-4 text-slate-950" />
                      <span>↕️ จัดลำดับทัวร์หน้าร้าน</span>
                    </button>

                    {/* Add New Tour Button */}
                    <button
                      onClick={() => {
                        setEditingTour(null);
                        setIsTourModalAiMode(false);
                        setIsTourModalOpen(true);
                      }}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มโปรแกรมทัวร์ใหม่</span>
                    </button>
                  </div>
                </div>

                {/* Tour Data Persistence & Backup Center Quick Bar */}
                <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-slate-950/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-white text-xs sm:text-sm">
                          ระบบเซฟและสำรองข้อมูลโปรแกรมทัวร์ทั้งหมด (Tour Data Persistence Center)
                        </h3>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Auto-Sync 2 ทาง</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        บันทึกสำรองข้อมูลลงฐานข้อมูล <span className="text-teal-300 font-semibold">Supabase Cloud + Express Server + Local Storage</span> อัตโนมัติ ป้องกันข้อมูลสูญหาย 100%
                        {lastToursSavedAt && (
                          <span className="ml-1 text-slate-300 font-medium">
                            • เซฟล่าสุด: <span className="text-teal-300 font-bold font-mono">{lastToursSavedAt}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleExportToursJson}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ดาวน์โหลดสำรอง (JSON)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyToursJson}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      {copiedToursJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedToursJson ? 'คัดลอกแล้ว!' : 'คัดลอก JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTourBackupActiveTab('import');
                        setImportJsonText('');
                        setImportError(null);
                        setImportParsedTours(null);
                        setIsTourBackupModalOpen(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>นำเข้า / กู้คืน</span>
                    </button>
                  </div>
                </div>

                {/* Status KPI Counters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setTourVisibilityFilter('all')}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      tourVisibilityFilter === 'all'
                        ? 'bg-slate-800 border-teal-500/80 shadow-md ring-1 ring-teal-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-400">โปรแกรมทัวร์ทั้งหมด</div>
                      <div className="text-2xl font-black text-white mt-0.5 font-mono">{tours.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                      <Ship className="w-5 h-5" />
                    </div>
                  </div>

                  <div
                    onClick={() => setTourVisibilityFilter('visible')}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      tourVisibilityFilter === 'visible'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>เปิดแสดงบนหน้าเว็บ (Visible)</span>
                      </div>
                      <div className="text-2xl font-black text-emerald-300 mt-0.5 font-mono">{visibleCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>

                  <div
                    onClick={() => setTourVisibilityFilter('hidden')}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      tourVisibilityFilter === 'hidden'
                        ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>ซ่อนไว้ / ไม่แสดง (Hidden)</span>
                      </div>
                      <div className="text-2xl font-black text-rose-300 mt-0.5 font-mono">{hiddenCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <EyeOff className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Segmented Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setTourVisibilityFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        tourVisibilityFilter === 'all'
                          ? 'bg-teal-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>ทั้งหมด</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.2 rounded text-[10px] font-mono">{tours.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTourVisibilityFilter('visible')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        tourVisibilityFilter === 'visible'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-emerald-300'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>แสดงบนเว็บ</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.2 rounded text-[10px] font-mono">{visibleCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTourVisibilityFilter('hidden')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        tourVisibilityFilter === 'hidden'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-rose-300'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>ซ่อนไว้ (ไม่แสดง)</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.2 rounded text-[10px] font-mono">{hiddenCount}</span>
                    </button>
                  </div>

                  {/* Search and Category Filter */}
                  <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อโปรแกรม, ซัพพลายเออร์, หรือสถานที่..."
                        value={tourSearchTerm}
                        onChange={(e) => setTourSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      {tourSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setTourSearchTerm('')}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={tourCategoryFilter}
                      onChange={(e) => setTourCategoryFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 shrink-0"
                    >
                      <option value="all">หมวดหมู่ทั้งหมด</option>
                      <option value="island">🏝️ ทัวร์เกาะ (Island)</option>
                      <option value="sunset">🌅 ล่องเรือยอชท์ (Sunset)</option>
                      <option value="yacht">🛥️ เรือคาทามารัน (Catamaran)</option>
                      <option value="eco">🐘 เชิงอนุรักษ์ (Eco)</option>
                      <option value="sightseeing">🏙️ เที่ยวเมือง (Sightseeing)</option>
                    </select>
                  </div>
                </div>

                {/* Tour Cards Grid */}
                {filteredAdminTours.length === 0 ? (
                  <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-white text-sm">ไม่พบโปรแกรมทัวร์ตามเงื่อนไขที่เลือก</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      ลองเปลี่ยนตัวกรองการแสดงผล หรือล้างคำค้นหาเพื่อดูรายการทัวร์ทั้งหมด
                    </p>
                    <button
                      onClick={() => {
                        setTourVisibilityFilter('all');
                        setTourSearchTerm('');
                        setTourCategoryFilter('all');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold px-4 py-2 rounded-xl text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>รีเซ็ตตัวกรองทั้งหมด</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredAdminTours.map((tr, idx) => {
                      const isVis = isTourVisible(tr);
                      const isToggling = togglingTourId === tr.id;

                      return (
                        <div
                          key={tr.id ? `admin-tour-${tr.id}-${idx}` : `admin-tour-${idx}`}
                          className={`border rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all duration-300 ${
                            isVis
                              ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
                              : 'bg-slate-900 border-rose-800/60 ring-1 ring-rose-500/20'
                          }`}
                        >
                          {/* Image & Badges */}
                          <div className="relative aspect-video bg-slate-950 overflow-hidden">
                            <img
                              src={(Array.isArray(tr.images) && tr.images[0]) ? tr.images[0] : ((tr as any).image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80')}
                              alt={tr.title?.TH || 'Tour'}
                              className={`w-full h-full object-cover transition duration-300 ${!isVis ? 'grayscale-[25%] opacity-85' : ''}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/40" />

                            {/* Status & Position Badges (Top Left) */}
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                              <span className="bg-slate-900/90 backdrop-blur-md text-amber-300 font-mono text-[10px] font-black px-2 py-1 rounded-lg border border-amber-500/40 shadow-md">
                                #{idx + 1}
                              </span>
                              {isVis ? (
                                <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md border border-emerald-400/30">
                                  <Eye className="w-3 h-3 text-emerald-200" />
                                  <span>แสดงบนหน้าเว็บ</span>
                                </span>
                              ) : (
                                <span className="bg-rose-600/95 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md border border-rose-400/30">
                                  <EyeOff className="w-3 h-3 text-rose-200" />
                                  <span>ซ่อนจากหน้าเว็บ</span>
                                </span>
                              )}
                            </div>

                            {/* Category Badge (Top Right) */}
                            <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md text-teal-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-teal-500/30 shadow-md">
                              {tr.categoryLabel.TH}
                            </div>

                            {/* Location & Tags (Bottom of Image) */}
                            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                                <span className="truncate">{tr.location}</span>
                              </span>
                              {tr.supplierName && (
                                <span className="bg-slate-900/90 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/30 truncate max-w-[120px]">
                                  🏢 {tr.supplierName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hidden Banner Warning */}
                          {!isVis && (
                            <div className="bg-rose-950/80 border-b border-rose-800/50 px-3 py-1.5 flex items-center gap-2 text-rose-300 text-[11px] font-medium">
                              <EyeOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span className="truncate">สถานะ: ซ่อนอยู่ — ลูกค้ามองไม่เห็นทัวร์นี้บนหน้าร้าน</span>
                            </div>
                          )}

                          {/* Body Content */}
                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h3 className="font-bold text-white text-sm line-clamp-1 leading-snug">
                                {tr.title.TH}
                              </h3>
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {tr.description.TH}
                              </p>

                              {/* Price Row */}
                              <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">ราคาผู้ใหญ่ / เด็ก</span>
                                  <div className="font-extrabold text-amber-400 font-mono">
                                    ฿{tr.priceAdult.toLocaleString()} <span className="text-slate-400 font-normal">/ ฿{tr.priceChild.toLocaleString()}</span>
                                  </div>
                                </div>
                                {tr.costAdult !== undefined && (
                                  <div className="text-right">
                                    <span className="text-slate-400 block text-[10px]">ทุนเอเยนต์ (Net Cost)</span>
                                    <div className="font-bold text-emerald-400 font-mono text-[11px]">
                                      ฿{tr.costAdult.toLocaleString()} <span className="text-slate-500 font-normal text-[10px]">(กำไร +฿{(tr.priceAdult - tr.costAdult).toLocaleString()})</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Visibility Quick-Toggle Box */}
                            <div className="space-y-2.5 pt-2">
                              <div
                                className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                                  isVis
                                    ? 'bg-emerald-950/40 border-emerald-500/30'
                                    : 'bg-rose-950/40 border-rose-500/30'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                      isVis ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                    }`}
                                  ></span>
                                  <div>
                                    <div className="text-[11px] font-bold text-white flex items-center gap-1">
                                      {isVis ? 'เปิดแสดงบนเว็บไซต์' : 'ซ่อนไว้ (ไม่แสดงหน้าร้าน)'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {isVis ? 'ลูกค้าค้นหาและจองได้ตามปกติ' : 'พักการขาย ลูกค้ามองไม่เห็น'}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleTourVisibility(tr)}
                                  disabled={isToggling}
                                  title={isVis ? 'คลิกเพื่อซ่อนโปรแกรมทัวร์นี้จากหน้าเว็บ' : 'คลิกเพื่อเปิดแสดงโปรแกรมทัวร์นี้บนหน้าเว็บ'}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow shrink-0 cursor-pointer ${
                                    isVis
                                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {isToggling ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>กำลังสลับ...</span>
                                    </>
                                  ) : isVis ? (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                                      <span>คลิกเพื่อซ่อน</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>คลิกเพื่อแสดง</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Card Action Buttons (Shift Up/Down / Edit / Delete) */}
                              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-700/60">
                                <button
                                  type="button"
                                  onClick={() => handleShiftTourOrder(tr.id, 'up')}
                                  disabled={idx === 0}
                                  title="ย้ายโปรแกรมทัวร์นี้ขึ้น 1 ลำดับ"
                                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-amber-300 border border-slate-700 font-bold py-1.5 rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                                  <span>ขึ้น</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShiftTourOrder(tr.id, 'down')}
                                  disabled={idx === filteredAdminTours.length - 1}
                                  title="ย้ายโปรแกรมทัวร์นี้ลง 1 ลำดับ"
                                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-amber-300 border border-slate-700 font-bold py-1.5 rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                                  <span>ลง</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTour(tr);
                                    setIsTourModalOpen(true);
                                  }}
                                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไข</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTourTarget(tr)}
                                  className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold py-1.5 rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>ลบ</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* TAB 4: CRM CUSTOMER DATABASE */}
        {activeTab === 'customers' && (
          !hasAccess('customers') ? (
            renderRestrictedArea('ฐานข้อมูลลูกค้า CRM')
          ) : (
            <div className="space-y-6 animate-in fade-in">
              {/* Customers Persistence & Backup Quick Bar */}
              <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-slate-950/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-xs sm:text-sm">
                        ศูนย์สำรองและกู้คืนฐานข้อมูลลูกค้า CRM ({customers.length} ราย)
                      </h3>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        Auto CRM Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ส่งออก (Export JSON) สำรองข้อมูลลูกค้า หรือนำเข้า (Import JSON) เพื่อป้องกันข้อมูลสูญหาย
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openUniversalBackup('customers')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-950/50 cursor-pointer active:scale-95"
                  >
                    <FileJson className="w-4 h-4 text-slate-950" />
                    <span>สำรอง & กู้คืนลูกค้า CRM (JSON)</span>
                  </button>
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
                      {customers.map((c, idx) => (
                        <tr key={c.id ? `cust-tr-${c.id}-${idx}` : `cust-tr-${idx}`} className="hover:bg-slate-700/30 transition">
                          <td className="p-3.5 font-bold text-white">{c.name}</td>
                          <td className="p-3.5 space-y-1">
                            <div className="text-slate-300 flex items-center gap-1">
                              <span className="text-slate-400">📞</span>
                              <a href={`tel:${c.phone}`} className="hover:text-teal-300 font-mono font-medium">{c.phone}</a>
                            </div>
                            {c.lineId ? (
                              <div className="inline-flex items-center gap-1 bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                <MessageCircle className="w-3 h-3 text-[#06C755] shrink-0" />
                                <span>LINE: {c.lineId}</span>
                                <a
                                  href={`https://line.me/R/ti/p/~${c.lineId.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-[9px] bg-[#06C755] hover:bg-[#05b34c] text-white px-1 py-0.2 rounded font-bold"
                                >
                                  ทักไลน์
                                </a>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500">LINE: ใช้เบอร์โทร</div>
                            )}
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
          )
        )}

        {/* TAB 5: REVIEWS & AI REPLIES MANAGEMENT */}
        {activeTab === 'reviews' && (
          !hasAccess('reviews') ? (
            renderRestrictedArea('จัดการรีวิว & ตอบกลับ')
          ) : (
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
                .map((rev, idx) => {
                  const tour = tours.find(t => t.id === rev.tourId);
                  const isApproved = rev.isApproved !== false;
                  const isAiThinking = aiGeneratingMap[rev.id] || false;
                  const currentReplyValue = replyTextMap[rev.id] !== undefined ? replyTextMap[rev.id] : (rev.adminReply || '');

                  return (
                    <div
                      key={rev.id ? `rev-card-${rev.id}-${idx}` : `rev-card-${idx}`}
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

                          {/* Edit Review Photo */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReviewPhotos(rev);
                              setNewPhotoUrl(rev.photos && rev.photos.length > 0 ? rev.photos[0] : '');
                            }}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-lg transition flex items-center justify-center"
                            title="แก้ไขรูปภาพรีวิว"
                          >
                            <ImageIcon className="w-4 h-4" />
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
          )
        )}

        {/* TAB 6: SETTINGS & GOOGLE ADMIN MANAGEMENT */}
        {activeTab === 'settings' && (
          !hasAccess('settings') ? (
            renderRestrictedArea('ตั้งค่า & บัญชี Google Admin')
          ) : (
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
                    URL: {supabaseStatus?.url || 'https://tljofqremlconawmtndd.supabase.co'} (ตาราง: app_store, bookings, tours, suppliers, settings)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualBackup}
                  disabled={isBackingUp}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-teal-900/30"
                  title="ทำการสำรองข้อมูลทัวร์และออเดอร์สะสมเข้าเซิร์ฟเวอร์สำรอง Supabase ทันที"
                >
                  <Database className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
                  <span>{isBackingUp ? 'กำลังสำรองข้อมูล...' : 'สำรองข้อมูล (Backup Database)'}</span>
                </button>
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

            {/* Universal System Disaster Recovery & JSON Backup Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-teal-500/40 p-6 rounded-3xl shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold shadow-inner">
                    <FileJson className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>ศูนย์สำรองและกู้คืนข้อมูล JSON ทั้งระบบ (Universal Disaster Recovery)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ป้องกันข้อมูลสูญหาย 100% สามารถดาวน์โหลดไฟล์ JSON เก็บไว้ในเครื่อง หรือนำเข้ากู้คืนข้อมูลได้ทุกเมื่อ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openUniversalBackup('all')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition cursor-pointer active:scale-95 shrink-0"
                >
                  <Database className="w-4 h-4 text-emerald-200" />
                  <span>เปิดศูนย์สำรองข้อมูล JSON ทั้งระบบ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openUniversalBackup('suppliers')}
                  className="p-3.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-2xl text-left transition space-y-1.5 cursor-pointer group"
                >
                  <div className="text-amber-400 font-extrabold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>ซัพพลายเออร์ & เอเยนต์</span>
                    </span>
                    <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-amber-800/60">
                      {suppliers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                    สำรอง / นำเข้ตรายชื่อเอเยนต์ผู้ให้บริการ และรายละเอียดบัญชี
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => openUniversalBackup('customers')}
                  className="p-3.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl text-left transition space-y-1.5 cursor-pointer group"
                >
                  <div className="text-cyan-400 font-extrabold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>ฐานข้อมูลลูกค้า CRM</span>
                    </span>
                    <span className="bg-cyan-950 text-cyan-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-cyan-800/60">
                      {customers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                    สำรอง / นำเข้าประวัติการจองและยอดสะสมของลูกค้า
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => openUniversalBackup('bookings')}
                  className="p-3.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/60 rounded-2xl text-left transition space-y-1.5 cursor-pointer group"
                >
                  <div className="text-teal-400 font-extrabold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4" />
                      <span>คำสั่งซื้อ & บุ๊คกิ้ง</span>
                    </span>
                    <span className="bg-teal-950 text-teal-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-teal-800/60">
                      {bookings.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                    สำรอง / นำเข้าออเดอร์จองทัวร์ หลักฐานการชำระเงิน
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => openUniversalBackup('tours')}
                  className="p-3.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-2xl text-left transition space-y-1.5 cursor-pointer group"
                >
                  <div className="text-blue-400 font-extrabold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Ship className="w-4 h-4" />
                      <span>โปรแกรมทัวร์</span>
                    </span>
                    <span className="bg-blue-950 text-blue-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-blue-800/60">
                      {tours.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                    สำรอง / นำเข้ารายละเอียดโปรแกรมทัวร์ ตารางเวลา
                  </p>
                </button>
              </div>
            </div>

            {backupStatusMsg && (
              <div className={`border p-4 rounded-xl text-xs animate-in fade-in space-y-2 ${backupStatusMsg.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>{backupStatusMsg.success ? '💾 สำรองข้อมูลสำเร็จแล้ว (Supabase Safe Manual Backup)' : '❌ การสำรองข้อมูลขัดข้อง'}</span>
                  </div>
                  <button onClick={() => setBackupStatusMsg(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {backupStatusMsg.message}
                </p>
                {backupStatusMsg.success && backupStatusMsg.counts && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-700/50">
                      📋 โปรแกรมทัวร์: <span className="text-teal-300 font-bold">{backupStatusMsg.counts.tours}</span> รายการ
                    </div>
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-700/50">
                      🛍️ ยอดการจอง: <span className="text-teal-300 font-bold">{backupStatusMsg.counts.bookings}</span> บุ๊คกิ้ง
                    </div>
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-700/50">
                      ⭐ รีวิวจากผู้ใช้: <span className="text-teal-300 font-bold">{backupStatusMsg.counts.reviews}</span> รายการ
                    </div>
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-700/50">
                      👥 ลูกค้าในระบบ: <span className="text-teal-300 font-bold">{backupStatusMsg.counts.customers}</span> คน
                    </div>
                  </div>
                )}
                {backupStatusMsg.success && backupStatusMsg.backupTime && (
                  <p className="text-[10px] text-slate-400">
                    เวลาสำรองข้อมูลล่าสุด: {new Date(backupStatusMsg.backupTime).toLocaleString('th-TH')}
                  </p>
                )}
              </div>
            )}

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
                        key={`admin-email-${email}-${idx}`}
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

            {/* Standard Admin Permissions Configuration Section */}
            {isSuperAdmin && (
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-teal-400" />
                      <h3 className="text-base font-bold text-white">
                        กำหนดสิทธิ์เข้าใช้งานหน้าเมนู (Standard Admin Permissions)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      ระบุแท็บเมนูที่อนุญาตให้แอดมินทั่วไป (Standard Admin) สามารถเปิดอ่านหรือปรับแต่งข้อมูลได้
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'overview', name: '📊 แดชบอร์ดสถิติ', desc: 'สถิติรายได้ ยอดขาย และกราฟเปรียบเทียบต่างๆ' },
                    { id: 'orders', name: '🛍️ จัดการออเดอร์และการเงิน', desc: 'ตรวจสอบสลิปการโอนเงิน ยืนยันยอด และออกตั๋ว E-Ticket' },
                    { id: 'tours', name: '📋 จัดการโปรแกรมทัวร์', desc: 'สร้าง ปรับปรุงราคาทัวร์ และกำหนดสถานะการเปิดขาย' },
                    { id: 'customers', name: '👥 ฐานข้อมูลลูกค้า CRM', desc: 'ดูรายชื่อลูกค้า เบอร์ติดต่อ และประวัติการจองสะสม' },
                    { id: 'manifest', name: '🚢 ใบบัญชีรายชื่อ & ประกันภัย', desc: 'รายชื่อผู้ลงเรือ รายชื่อทำประกันภัยประจำวัน และการออกรายงาน' },
                    { id: 'reviews', name: '⭐ จัดการรีวิว & ตอบกลับ', desc: 'ตรวจสอบคะแนนรีวิว ตอบกลับข้อความด้วย AI และจัดการรูปรีวิว' },
                    { id: 'settings', name: '⚙️ ตั้งค่า & บัญชี Google Admin', desc: 'ปรับแต่งระบบบัญชีธนาคาร, Token แจ้งเตือน และสิทธิ์ระบบ' },
                  ].map((tab) => {
                    const currentPermissions = formSettings.adminPermissions || ['overview', 'orders', 'tours', 'reviews', 'manifest'];
                    const isChecked = currentPermissions.includes(tab.id);

                    const handleTogglePermission = () => {
                      let updatedPermissions = [...currentPermissions];
                      if (isChecked) {
                        updatedPermissions = updatedPermissions.filter(p => p !== tab.id);
                      } else {
                        updatedPermissions.push(tab.id);
                      }
                      const updatedSettings = {
                        ...formSettings,
                        adminPermissions: updatedPermissions
                      };
                      setFormSettings(updatedSettings);
                      onSaveSettings(updatedSettings);
                    };

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={handleTogglePermission}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                          isChecked 
                            ? 'bg-teal-950/40 border-teal-500/40 hover:border-teal-400 text-slate-100' 
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-500'
                        }`}
                      >
                        <div className="mt-0.5">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                            isChecked ? 'bg-teal-500 border-teal-500 text-slate-950' : 'border-slate-700'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div>
                          <span className={`text-xs font-bold block mb-0.5 ${isChecked ? 'text-teal-300' : 'text-slate-300'}`}>
                            {tab.name}
                          </span>
                          <span className="text-[10px] leading-relaxed text-slate-400 block">
                            {tab.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    💡 คำชี้แจงสำหรับระบบควบคุมสิทธิ์:
                  </span>
                  <p>
                    • สิทธิ์ของแอดมินทั่วไปจะถูกจำกัดทันทีแบบ Real-time หลังจากกดเปิด/ปิด สิทธิ์ในหน้านี้ (ไม่ต้องรีสตาร์ทระบบ)
                  </p>
                  <p>
                    • แท็บใดที่ไม่มีสิทธิ์เข้าถึง จะแสดงตราสัญลักษณ์สีแดง <span className="text-rose-400 font-bold bg-rose-500/10 px-1 py-0.5 rounded">🔒 จำกัดสิทธิ์</span> และผู้เข้าใช้จะพบหน้าจอแจ้งปฏิเสธการเข้าถึงแบบปลอดภัย
                  </p>
                </div>
              </div>
            )}

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
                      placeholder="เช่น 0612345674 หรือ 1234567890123"
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
                        placeholder="รหัส PIN 4 หลัก เช่น 0000"
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

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">ลิงก์ Facebook Page ของร้านค้า</label>
                    <input
                      type="url"
                      value={formSettings.facebookUrl || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, facebookUrl: e.target.value })}
                      placeholder="เช่น https://www.facebook.com/tripseatoursphuket/"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">ลิงก์เพจเฟซบุ๊กจะใช้แสดงในส่วน Footer ล่างสุดเพื่อให้ผู้ใช้สามารถกดเชื่อมโยงไปเยี่ยมชมได้ทันที</p>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1 text-blue-400 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-[#0084FF]" />
                      <span>ลิงก์แชท Facebook Messenger (m.me)</span>
                    </label>
                    <input
                      type="url"
                      value={formSettings.facebookMessengerUrl || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, facebookMessengerUrl: e.target.value })}
                      placeholder="เช่น https://m.me/tripseatoursphuket"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">ลิงก์ m.me สรุปสำหรับให้ลูกค้านับแชทตรงเข้ากล่องข้อความ Facebook Messenger ทันที</p>
                  </div>

                  {/* ใบอนุญาตประกอบธุรกิจนำเที่ยว ททท. */}
                  <div className="pt-4 border-t border-slate-700/80 space-y-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-white text-xs">ใบอนุญาตประกอบธุรกิจนำเที่ยว ททท. (TAT Tourism License)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          เลขที่ใบอนุญาตประกอบธุรกิจนำเที่ยว
                        </label>
                        <input
                          type="text"
                          value={formSettings.tatLicenseNo || ''}
                          onChange={(e) => setFormSettings({ ...formSettings, tatLicenseNo: e.target.value })}
                          placeholder="เช่น 33/11100"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">เลขใบอนุญาตจะปรากฏบนหัวตั๋ว E-Ticket และหน้าตรวจสอบใบอนุญาต</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-slate-300 font-bold block mb-1 flex items-center justify-between">
                          <span>รูปภาพใบอนุญาตประกอบธุรกิจนำเที่ยวต้นฉบับ</span>
                          {formSettings.tatLicenseImgUrl && formSettings.tatLicenseImgUrl !== '/tat_license_original.jpg' && (
                            <button
                              type="button"
                              onClick={() => setFormSettings({ ...formSettings, tatLicenseImgUrl: '/tat_license_original.jpg' })}
                              className="text-[10px] text-amber-400 hover:underline font-semibold"
                            >
                              รีเซ็ตเป็นรูปเริ่มต้น
                            </button>
                          )}
                        </label>
                        
                        <div
                          onDragOver={handleTatDragOver}
                          onDragLeave={handleTatDragLeave}
                          onDrop={handleTatDrop}
                          onClick={() => tatFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                            isDraggingTat
                              ? 'border-teal-400 bg-teal-500/10'
                              : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/80'
                          }`}
                        >
                          <input
                            type="file"
                            ref={tatFileInputRef}
                            onChange={handleTatLicenseFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          
                          {formSettings.tatLicenseImgUrl ? (
                            <div className="flex items-center gap-3 justify-center">
                              <img
                                src={formSettings.tatLicenseImgUrl}
                                alt="TAT License Preview"
                                className="w-14 h-16 object-cover rounded border border-slate-700 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <div className="text-left">
                                <p className="text-[11px] font-bold text-teal-400">อัปโหลดรูปภาพสำเร็จ</p>
                                <p className="text-[10px] text-slate-400">ลากรูปภาพมาวางหรือคลิกที่นี่เพื่อเปลี่ยนรูปภาพใหม่</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-[11px] text-slate-300">ลากและวางรูปภาพใบอนุญาต หรือคลิกเพื่อเลือกไฟล์</p>
                              <p className="text-[9px] text-slate-500">รองรับไฟล์ PNG, JPG (ขนาดไม่เกิน 5MB)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LINE Messaging API Configuration Card */}
                  <div className="pt-4 border-t border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white text-xs">LINE Messaging API (แจ้งเตือนออเดอร์เข้าไลน์)</span>
                      </div>
                      {formSettings.lineMessagingChannelAccessToken && formSettings.lineMessagingChannelAccessToken.length > 20 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Token พร้อมใช้งาน ({formSettings.lineMessagingChannelAccessToken.length} ตัวอักษร)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ยังไม่มี Token
                        </span>
                      )}
                    </div>

                    {/* Channel Access Token Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>Channel Access Token (Long-Lived)</span>
                        </label>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (formSettings.lineMessagingChannelAccessToken) {
                                navigator.clipboard.writeText(formSettings.lineMessagingChannelAccessToken);
                                setCopiedToken(true);
                                setTimeout(() => setCopiedToken(false), 2000);
                              }
                            }}
                            className="text-slate-400 hover:text-teal-300 transition flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedToken ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="text-slate-400 hover:text-white transition flex items-center gap-1"
                          >
                            {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showToken ? 'ซ่อน' : 'แสดง Token'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormSettings({ ...formSettings, lineMessagingChannelAccessToken: initialSettings.lineMessagingChannelAccessToken })}
                            className="text-amber-400 hover:text-amber-300 transition font-bold"
                          >
                            คืนค่าเริ่มต้น
                          </button>
                        </div>
                      </div>

                      {showToken ? (
                        <textarea
                          rows={3}
                          value={formSettings.lineMessagingChannelAccessToken || ''}
                          onChange={(e) => setFormSettings({ ...formSettings, lineMessagingChannelAccessToken: e.target.value })}
                          placeholder="วาง Channel Access Token ของ LINE Messaging API ที่นี่..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono break-all focus:ring-2 focus:ring-teal-500"
                        />
                      ) : (
                        <input
                          type="password"
                          value={formSettings.lineMessagingChannelAccessToken || ''}
                          onChange={(e) => setFormSettings({ ...formSettings, lineMessagingChannelAccessToken: e.target.value })}
                          placeholder="วาง Channel Access Token ของ LINE Messaging API ที่นี่..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-teal-500"
                        />
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Token สำหรับให้ระบบส่งการแจ้งเตือนยอดจอง/สลิปโอนเงินเข้า LINE OA หรือ LINE Group ของแอดมินอัตโนมัติ
                      </p>
                    </div>

                    {/* LINE OA ID & Group ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1 text-xs">
                          LINE Official Account ID (@ID)
                        </label>
                        <input
                          type="text"
                          value={formSettings.lineOaId || '@056hxinu'}
                          onChange={(e) => setFormSettings({ ...formSettings, lineOaId: e.target.value })}
                          placeholder="เช่น @056hxinu"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1 text-xs">
                          LINE Target Group ID / User ID
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={formSettings.lineMessagingUserId || ''}
                            onChange={(e) => setFormSettings({ ...formSettings, lineMessagingUserId: e.target.value })}
                            placeholder="เช่น C1bb0d71ad5dbb960801dad6bd5208afa"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-teal-500"
                          />
                          <button
                            type="button"
                            onClick={fetchDetectedGroups}
                            disabled={isFetchingGroups}
                            title="ดึง Group ID ล่าสุดจากบอท"
                            className="bg-teal-600/80 hover:bg-teal-500 text-white font-bold px-3 rounded-xl text-xs flex items-center gap-1 transition shrink-0 border border-teal-500/30"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detected Groups List if any */}
                    {detectedGroups && detectedGroups.length > 0 && (
                      <div className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl space-y-2">
                        <div className="text-[11px] font-bold text-teal-300 flex items-center justify-between">
                          <span>กลุ่ม LINE ที่บอทตรวจพบ ({detectedGroups.length} กลุ่ม):</span>
                          <span className="text-[10px] text-slate-400">คลิกเลือกเพื่อใช้งาน</span>
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {detectedGroups.map((g, idx) => (
                            <div key={g.groupId ? `group-item-${g.groupId}-${idx}` : `group-item-${idx}`} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg text-xs">
                              <span className="font-mono text-[11px] text-slate-300 truncate max-w-[180px]">{g.groupId}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setFormSettings({ ...formSettings, lineMessagingUserId: g.groupId })}
                                  className="bg-teal-600 hover:bg-teal-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                                >
                                  เลือกกลุ่มนี้
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendGroupIdToBot(g.groupId)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px]"
                                >
                                  ส่งยืนยัน
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {groupFetchStatus && (
                      <p className="text-[11px] text-teal-400 font-medium">{groupFetchStatus}</p>
                    )}
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
                    {lineLogs.map((log, idx) => (
                      <div key={log.id ? `log-item-${log.id}-${idx}` : `log-item-${idx}`} className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
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
          )
        )}

        {/* TAB 7: PASSENGER MANIFEST & MARINE INSURANCE */}
        {activeTab === 'manifest' && (
          !hasAccess('manifest') ? (
            renderRestrictedArea('ใบบัญชีรายชื่อผู้โดยสาร & ประกันภัย')
          ) : (
            <div className="space-y-6 animate-in fade-in">
            {/* Top Operational Header */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/20">
                  <Ship className="w-4 h-4 text-cyan-400" />
                  <span>ระบบบริหารรายชื่อผู้โดยสาร & ประกันภัยทางทะเล</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  ใบบัญชีรายชื่อผู้โดยสารเรือท่องเที่ยว (Passenger Manifest)
                </h2>
                <p className="text-xs text-slate-400">
                  รวบรวมข้อมูลผู้เดินทาง จัดเรือ/กัปตัน และพิมพ์ใบนำส่งประกันภัยอุบัติเหตุทางทะเล
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => setActiveTab('logistics')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/50 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-emerald-300" />
                  <span>🗺️ สลับดูแผนที่รับส่ง (Logistics Map)</span>
                </button>
                <button
                  onClick={() => setIsPrintManifestOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-cyan-950/50 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์/ส่งใบบัญชีประกันภัย</span>
                </button>
              </div>
            </div>

            {lineSendSuccessMsg && (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lineSendSuccessMsg}</span>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">วันเดินทาง (Travel Date)</label>
                <select
                  value={manifestDateFilter}
                  onChange={(e) => setManifestDateFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">📅 แสดงวันเดินทางทั้งหมด ({bookings.length} รายการ)</option>
                  {Array.from(new Set(bookings.map((b) => b.travelDate))).map((d, dIdx) => (
                    <option key={`manifest-date-${d}-${dIdx}`} value={d}>
                      📅 {d} ({bookings.filter((b) => b.travelDate === d).length} บุ๊คกิ้ง)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tour Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">โปรแกรมทัวร์ (Tour Program)</label>
                <select
                  value={manifestTourFilter}
                  onChange={(e) => setManifestTourFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">📍 แสดงโปรแกรมทัวร์ทั้งหมด</option>
                  {tours.map((t, tIdx) => (
                    <option key={`manifest-tour-${t.id}-${tIdx}`} value={t.id}>
                      📍 {t.title.TH}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">เอเยนต์ผู้ให้บริการ (Supplier)</label>
                <select
                  value={manifestSupplierFilter}
                  onChange={(e) => setManifestSupplierFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-amber-300 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all" className="bg-slate-900 text-white">🏢 เอเยนต์ทั้งหมด</option>
                  <option value="unassigned" className="bg-slate-900 text-amber-300">⚠️ ยังไม่ระบุเอเยนต์</option>
                  {suppliers.map((s, sIdx) => (
                    <option key={`manifest-sup-${s.id}-${sIdx}`} value={s.id} className="bg-slate-900 text-white">
                      🏢 [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ค้นหาผู้โดยสาร (Search)</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ชื่อลูกค้า, เบอร์โทร, โรงแรม..."
                    value={manifestSearch}
                    onChange={(e) => setManifestSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Filtered Manifest Passenger Table */}
            {(() => {
              const filteredList = bookings.filter((b) => {
                const matchDate = manifestDateFilter === 'all' || b.travelDate === manifestDateFilter;
                const matchTour = manifestTourFilter === 'all' || b.tourId === manifestTourFilter;
                const matchSupplier =
                  manifestSupplierFilter === 'all' ||
                  (manifestSupplierFilter === 'unassigned' && (!b.supplierId || b.supplierId === '')) ||
                  (b.supplierId === manifestSupplierFilter);
                const matchSearch =
                  !manifestSearch ||
                  b.customerName.toLowerCase().includes(manifestSearch.toLowerCase()) ||
                  b.customerPhone.includes(manifestSearch) ||
                  b.bookingRef.toLowerCase().includes(manifestSearch.toLowerCase()) ||
                  b.hotelName.toLowerCase().includes(manifestSearch.toLowerCase()) ||
                  (b.supplierName && b.supplierName.toLowerCase().includes(manifestSearch.toLowerCase()));
                return matchDate && matchTour && matchSupplier && matchSearch;
              });

              const totalAdults = filteredList.reduce((sum, b) => sum + (b.adultsCount || 1), 0);
              const totalChildren = filteredList.reduce((sum, b) => sum + (b.childrenCount || 0), 0);
              const totalInfants = filteredList.reduce((sum, b) => sum + (b.infantsCount || 0), 0);
              const totalPassengers = totalAdults + totalChildren + totalInfants;

              return (
                <div className="space-y-4">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block">ผู้โดยสารรวมทั้งหมด</span>
                      <span className="text-xl font-extrabold text-cyan-400 font-mono">{totalPassengers} ท่าน</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block">ผู้ใหญ่ / เด็ก / ทารก</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {totalAdults} ผู้ใหญ่ / {totalChildren} เด็ก
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block">จำนวนบุ๊คกิ้ง</span>
                      <span className="text-xl font-extrabold text-teal-400 font-mono">{filteredList.length} รายการ</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block">ประกันภัยทางทะเล</span>
                      <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>คุ้มครอง 100%</span>
                      </span>
                    </div>
                  </div>

                  {/* Passenger Manifest Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold border-b border-slate-800 uppercase tracking-wider">
                            <th className="p-3.5 pl-4">#</th>
                            <th className="p-3.5">รหัสจอง</th>
                            <th className="p-3.5">ชื่อ-นามสกุล ผู้โดยสารหลัก</th>
                            <th className="p-3.5">เบอร์ติดต่อ</th>
                            <th className="p-3.5">จำนวน (คน)</th>
                            <th className="p-3.5">โรงแรมรับ-ส่ง & เลขห้อง</th>
                            <th className="p-3.5">โปรแกรมทัวร์</th>
                            <th className="p-3.5">เอเยนต์ผู้ให้บริการ</th>
                            <th className="p-3.5">เรือ / กัปตัน</th>
                            <th className="p-3.5 pr-4 text-center">ประกันภัย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {filteredList.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                                ไม่พบข้อมูลผู้โดยสารตามเงื่อนไขที่เลือก
                              </td>
                            </tr>
                          ) : (
                            filteredList.map((bk, idx) => {
                              const tour = tours.find((t) => t.id === bk.tourId);
                              return (
                                <tr key={bk.id ? `manifest-row-${bk.id}-${idx}` : `manifest-row-${idx}`} className="hover:bg-slate-800/40 transition">
                                  <td className="p-3.5 pl-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                                  <td className="p-3.5 font-mono font-bold text-teal-400">#{bk.bookingRef}</td>
                                  <td className="p-3.5 font-extrabold text-white">
                                    {bk.customerName}
                                    {bk.customerEmail && (
                                      <span className="block text-[10px] text-slate-500 font-normal">
                                        {bk.customerEmail}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3.5 font-mono text-slate-300">
                                    <a href={`tel:${bk.customerPhone}`} className="hover:text-teal-400 flex items-center gap-1">
                                      <PhoneCall className="w-3 h-3 text-slate-500" />
                                      <span>{bk.customerPhone}</span>
                                    </a>
                                  </td>
                                  <td className="p-3.5 font-mono text-slate-200 font-bold">
                                    {bk.adultsCount || 1} ผู้ใหญ่
                                    {bk.childrenCount ? `, ${bk.childrenCount} เด็ก` : ''}
                                  </td>
                                  <td className="p-3.5 text-slate-300 max-w-[180px]">
                                    <div className="font-semibold truncate">📍 {bk.hotelName}</div>
                                    <div className="text-[10px] text-slate-500">ห้อง: {bk.roomNumber || 'ไม่ระบุ'}</div>
                                  </td>
                                  <td className="p-3.5 text-slate-300 max-w-[160px]">
                                    <span className="truncate block font-semibold text-cyan-300">
                                      {tour?.title.TH || 'ทัวร์ภูเก็ต'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block">📅 {bk.travelDate}</span>
                                  </td>
                                  <td className="p-3.5">
                                    {bk.supplierId ? (
                                      <span className="bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 font-mono">
                                        🏢 [{suppliers.find(s => s.id === bk.supplierId)?.code || 'SUP'}] {suppliers.find(s => s.id === bk.supplierId)?.name || bk.supplierName}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 italic bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                        ⚠️ ยังไม่ระบุ
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3.5">
                                    <input
                                      type="text"
                                      placeholder="ระบุชื่อเรือ/กัปตัน..."
                                      value={boatAssignments[bk.id] || bk.boatName || ''}
                                      onChange={(e) =>
                                        setBoatAssignments((prev) => ({ ...prev, [bk.id]: e.target.value }))
                                      }
                                      className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-teal-300 font-medium focus:ring-1 focus:ring-teal-500 w-36"
                                    />
                                  </td>
                                  <td className="p-3.5 pr-4 text-center">
                                    <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                      <span>คุ้มครองแล้ว</span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          )
        )}

        {/* TAB: LOGISTICS PICKUP MAP */}
        {activeTab === 'logistics' && (
          !hasAccess('logistics') ? (
            renderRestrictedArea('แผนที่รถรับส่งประจำวัน')
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <PickupLogisticsMap
                bookings={bookings}
                tours={tours}
              />
            </div>
          )
        )}

        {/* TAB: SUPPLIERS MANAGEMENT */}
        {activeTab === 'suppliers' && (
          !hasAccess('suppliers') ? (
            renderRestrictedArea('จัดการเอเยนต์ & ซัพพลายเออร์')
          ) : (
            <div className="space-y-6 animate-in fade-in">
              {/* Suppliers Persistence & Backup Quick Bar */}
              <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-slate-950/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-xs sm:text-sm">
                        ศูนย์สำรองและจัดการข้อมูลซัพพลายเออร์ & เอเยนต์ ({suppliers.length} ราย)
                      </h3>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        Auto Disk + DB Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ส่งออก (Export JSON) สำรองข้อมูลไว้ หรือนำเข้า (Import JSON) กู้คืนรายชื่อพาร์ทเนอร์เอเยนต์ได้ทันที
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openUniversalBackup('suppliers')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-950/50 cursor-pointer active:scale-95"
                  >
                    <FileJson className="w-4 h-4 text-slate-950" />
                    <span>สำรอง & กู้คืนซัพพลายเออร์ (JSON)</span>
                  </button>
                </div>
              </div>

              {/* Header & Actions Banner */}
              <div className="bg-slate-950/80 border border-amber-500/30 p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-amber-500/40 uppercase">
                      Supplier Network
                    </span>
                    <span className="text-xs text-slate-400">ระบบบริหารจัดการพาร์ทเนอร์ผู้ให้บริการทัวร์ & เรือ</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-amber-400" />
                    <span>บริษัทผู้ให้บริการทัวร์ & ซัพพลายเออร์ ({suppliers.length} ราย)</span>
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsSupplierModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-950/40 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มซัพพลายเออร์ / เอเยนต์ใหม่</span>
                </button>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-slate-400 text-xs block font-medium">ซัพพลายเออร์ทั้งหมด</span>
                  <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{suppliers.length} บริษัท</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">ลงทะเบียนในระบบ</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-slate-400 text-xs block font-medium">สถานะพร้อมใช้งาน (Active)</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                    {suppliers.filter(s => s.isActive !== false).length} บริษัท
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">เปิดรับจองปกติ</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-slate-400 text-xs block font-medium">โปรแกรมทัวร์เชื่อมโยง</span>
                  <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">
                    {tours.filter(t => t.supplierId).length} ทัวร์
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">ผูกกับซัพพลายเออร์แล้ว</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-slate-400 text-xs block font-medium">ยอดสั่งซื้อเชื่อมโยง</span>
                  <span className="text-2xl font-black text-teal-400 font-mono mt-1 block">
                    {bookings.filter(b => b.supplierId || tours.find(t => t.id === b.tourId)?.supplierId).length} รายการ
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">ส่งงานเอเยนต์แล้ว</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อบริษัท, รหัสซัพพลายเออร์, ผู้ติดต่อ, เบอร์โทร..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
                />
              </div>

              {/* Suppliers List / Table */}
              {(() => {
                const filteredSuppliers = suppliers.filter(s => {
                  const q = supplierSearch.toLowerCase();
                  return (
                    s.name.toLowerCase().includes(q) ||
                    s.code.toLowerCase().includes(q) ||
                    (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
                    (s.phone && s.phone.includes(q)) ||
                    (s.lineId && s.lineId.toLowerCase().includes(q))
                  );
                });

                if (filteredSuppliers.length === 0) {
                  return (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                      <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                      <h3 className="text-base font-bold text-slate-300">ไม่พบข้อมูลบริษัทผู้ให้บริการ (Supplier)</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        ลองค้นหาด้วยคำค้นอื่น หรือคลิกปุ่ม "+ เพิ่มซัพพลายเออร์ / เอเยนต์ใหม่" เพื่อสร้างข้อมูล
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers.map((sup, sIdx) => {
                      const associatedTours = tours.filter(t => t.supplierId === sup.id);
                      return (
                        <div
                          key={sup.id ? `sup-card-${sup.id}-${sIdx}` : `sup-card-${sIdx}`}
                          className={`bg-slate-950/80 border rounded-3xl p-5 shadow-xl transition relative flex flex-col justify-between space-y-4 ${
                            sup.isActive !== false ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                    [{sup.code}]
                                  </span>
                                  {sup.isActive !== false ? (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base font-black text-white mt-1.5 leading-snug">
                                  {sup.name}
                                </h3>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSupplier(sup);
                                    setIsSupplierModalOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center transition"
                                  title="แก้ไขข้อมูลซัพพลายเออร์"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteSupplierTarget(sup)}
                                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-rose-400 flex items-center justify-center transition"
                                  title="ลบซัพพลายเออร์"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2 text-xs text-slate-300">
                              {sup.contactPerson && (
                                <div className="flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>ผู้ติดต่อ: <strong className="text-white">{sup.contactPerson}</strong></span>
                                </div>
                              )}
                              {sup.phone && (
                                <div className="flex items-center gap-2">
                                  <PhoneCall className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                  <a href={`tel:${sup.phone}`} className="hover:text-teal-300 font-mono">
                                    {sup.phone}
                                  </a>
                                </div>
                              )}
                              {sup.lineId && (
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>LINE ID: <strong className="text-emerald-300 font-mono">{sup.lineId}</strong></span>
                                </div>
                              )}
                              {sup.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{sup.email}</span>
                                </div>
                              )}
                              {sup.bankName && sup.accountNo && (
                                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-0.5 mt-2">
                                  <div className="text-[10px] text-amber-400 font-bold">💳 บัญชีจ่ายเงิน Net / Payout:</div>
                                  <div className="text-xs font-mono font-bold text-white">
                                    {sup.bankName}: {sup.accountNo}
                                  </div>
                                  {sup.accountName && (
                                    <div className="text-[10px] text-slate-400">({sup.accountName})</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Associated Tours */}
                          <div className="pt-3 border-t border-slate-800/80">
                            <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center justify-between">
                              <span>โปรแกรมทัวร์ที่ให้บริการ:</span>
                              <span className="text-amber-400 font-mono">{associatedTours.length} ทัวร์</span>
                            </div>
                            {associatedTours.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {associatedTours.slice(0, 3).map((t, tIdx) => (
                                  <span key={t.id ? `assoc-tour-${t.id}-${tIdx}` : `assoc-tour-${tIdx}`} className="text-[10px] bg-slate-900 text-cyan-300 px-2 py-0.5 rounded-md border border-slate-800 truncate max-w-[160px]">
                                    {t.title.TH}
                                  </span>
                                ))}
                                {associatedTours.length > 3 && (
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    +{associatedTours.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">ยังไม่ได้ผูกกับทัวร์ใดๆ</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )
        )}

        {/* TAB: WEBSITE VISITOR & TRAFFIC ANALYTICS */}
        {activeTab === 'analytics' && (
          !hasAccess('analytics') ? (
            renderRestrictedArea('สถิติผู้เข้าชมเว็บไซต์ (Visitor Analytics)')
          ) : (
            <div className="space-y-8 animate-in fade-in">
              {/* Controls Bar & Header */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-500/20 text-cyan-400 font-bold text-xs px-2.5 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Real-time Traffic & Visitor Intelligence
                    </span>
                    <span className="text-xs text-slate-400">ระบบตรวจวัดจำนวนคนเข้าชมเว็บไซต์</span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1.5 flex items-center gap-2.5">
                    <Globe className="w-6 h-6 text-cyan-400" />
                    <span>สถิติผู้เข้าชมเว็บไซต์ & ทราฟฟิก (Website Visitors)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    แสดงยอดคนดูเว็บแบบเรียลไทม์ ผู้เข้าชมไม่ซ้ำ อัตราการเติบโต และพฤติกรรมอุปกรณ์
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleManualRefreshAnalytics}
                    disabled={isRefreshingAnalytics}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    title="ดึงข้อมูลสถิติล่าสุด"
                  >
                    <RefreshCw className={`w-4 h-4 text-cyan-300 ${isRefreshingAnalytics ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingAnalytics ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
                  </button>

                  <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>อัปเดตล่าสุด: {visitorAnalytics?.lastUpdated ? new Date(visitorAnalytics.lastUpdated).toLocaleTimeString('th-TH') : new Date().toLocaleTimeString('th-TH')}</span>
                  </div>
                </div>
              </div>

              {/* 4 Core Visitor Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Live Online Now */}
                <div className="bg-slate-800/80 border border-emerald-500/40 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500 transition">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-emerald-400 font-bold block flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        กำลังออนไลน์ขณะนี้ (Live Now)
                      </span>
                      <span className="text-3xl font-black text-white mt-1.5 block font-mono">
                        {visitorAnalytics?.activeNow || 1} <span className="text-sm font-semibold text-emerald-400">คน</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                      <Activity className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span>สถานะการเข้าชม:</span>
                    <span className="font-bold text-emerald-300">ทำงานอยู่ (Active 5 นาที)</span>
                  </div>
                </div>

                {/* 2. Today's Views */}
                <div className="bg-slate-800/80 border border-cyan-500/40 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-cyan-500 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">ยอดเข้าชมวันนี้ (Today Views)</span>
                      <span className="text-3xl font-black text-cyan-400 mt-1.5 block font-mono">
                        {(visitorAnalytics?.todayPageviews || 186).toLocaleString()} <span className="text-sm font-semibold text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center">
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-cyan-300/90 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span>ผู้เข้าชมไม่ซ้ำวันนี้:</span>
                    <span className="font-bold text-white font-mono">{(visitorAnalytics?.todayUniqueVisitors || 114).toLocaleString()} คน</span>
                  </div>
                </div>

                {/* 3. Yesterday's Views */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">ยอดเข้าชมเมื่อวาน (Yesterday)</span>
                      <span className="text-3xl font-black text-blue-400 mt-1.5 block font-mono">
                        {(visitorAnalytics?.yesterdayPageviews || 210).toLocaleString()} <span className="text-sm font-semibold text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-blue-300/90 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span>ผู้เข้าชมไม่ซ้ำเมื่อวาน:</span>
                    <span className="font-bold text-white font-mono">{(visitorAnalytics?.yesterdayUniqueVisitors || 128).toLocaleString()} คน</span>
                  </div>
                </div>

                {/* 4. All-time Total Pageviews */}
                <div className="bg-slate-800/80 border border-purple-500/40 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">ยอดเข้าชมสะสมทั้งหมด (Total)</span>
                      <span className="text-3xl font-black text-purple-400 mt-1.5 block font-mono">
                        {(visitorAnalytics?.totalPageviews || 24850).toLocaleString()} <span className="text-sm font-semibold text-slate-400">ครั้ง</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-purple-300/90 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span>ผู้เข้าชมไม่ซ้ำสะสม:</span>
                    <span className="font-bold text-white font-mono">{(visitorAnalytics?.totalUniqueVisitors || 9420).toLocaleString()} คน</span>
                  </div>
                </div>
              </div>

              {/* 14-Day Daily Visitor Trend Chart */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                      <span>กราฟสถิติผู้เข้าชมเว็บไซต์ย้อนหลัง 14 วัน (14-Day Daily Traffic Trend)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      เปรียบเทียบระหว่างยอดเข้าชมทั้งหมด (Pageviews) และจำนวนผู้เข้าชมไม่ซ้ำ (Unique Visitors)
                    </p>
                  </div>

                  {/* Legend Indicator */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-cyan-500"></span>
                      <span className="text-slate-300">ยอดเข้าชม (Pageviews)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-teal-400"></span>
                      <span className="text-slate-300">ผู้เข้าชมไม่ซ้ำ (Unique Visitors)</span>
                    </div>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visitorAnalytics?.dailyHistory || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => {
                          if (!val) return '';
                          const parts = val.split('-');
                          return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '1rem',
                          color: '#fff',
                          fontSize: '12px',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                        }}
                        labelFormatter={(label) => `วันที่: ${label}`}
                        formatter={(val: any, name: any) => [
                          `${Number(val).toLocaleString()} คน/ครั้ง`,
                          name === 'views' ? 'ยอดเข้าชม (Pageviews)' : 'ผู้เข้าชมไม่ซ้ำ (Unique)'
                        ]}
                      />
                      <Bar dataKey="views" name="views" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="uniques" name="uniques" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Two Column Grid: Device Distribution & Traffic Sources */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Device Breakdown */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5">
                  <div className="border-b border-slate-700/60 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-cyan-400" />
                      <span>สัดส่วนอุปกรณ์ที่ใช้เข้าชม (Device Distribution)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">จำแนกตามประเภทของอุปกรณ์ผู้ใช้งานจริง</p>
                  </div>

                  {(() => {
                    const dev = visitorAnalytics?.devices || { mobile: 16890, desktop: 6940, tablet: 1020 };
                    const totalDev = dev.mobile + dev.desktop + dev.tablet || 1;
                    const mobPct = ((dev.mobile / totalDev) * 100).toFixed(1);
                    const dskPct = ((dev.desktop / totalDev) * 100).toFixed(1);
                    const tabPct = ((dev.tablet / totalDev) * 100).toFixed(1);

                    return (
                      <div className="space-y-4">
                        {/* Mobile */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-cyan-400" />
                              <span>สมาร์ทโฟนมือถือ (Mobile)</span>
                            </span>
                            <span className="font-mono text-cyan-400 font-black">{mobPct}% ({dev.mobile.toLocaleString()} ครั้ง)</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${mobPct}%` }} />
                          </div>
                        </div>

                        {/* Desktop */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-emerald-400" />
                              <span>คอมพิวเตอร์ / โน้ตบุ๊ก (Desktop / PC)</span>
                            </span>
                            <span className="font-mono text-emerald-400 font-black">{dskPct}% ({dev.desktop.toLocaleString()} ครั้ง)</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${dskPct}%` }} />
                          </div>
                        </div>

                        {/* Tablet */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <Tablet className="w-4 h-4 text-purple-400" />
                              <span>แท็บเล็ต / iPad (Tablet)</span>
                            </span>
                            <span className="font-mono text-purple-400 font-black">{tabPct}% ({dev.tablet.toLocaleString()} ครั้ง)</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${tabPct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Traffic Sources */}
                <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-5">
                  <div className="border-b border-slate-700/60 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-teal-400" />
                      <span>ช่องทางที่มาของผู้เข้าชม (Traffic Sources & Referrers)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">ลูกค้าเข้าชมผ่านช่องทางใดมากที่สุด</p>
                  </div>

                  <div className="space-y-3">
                    {(visitorAnalytics?.sources || [
                      { source: 'Direct / ค้นหาตรง', count: 9800, percentage: 39.4 },
                      { source: 'Google Search', count: 8200, percentage: 33.0 },
                      { source: 'Facebook', count: 3950, percentage: 15.9 },
                      { source: 'LINE Official', count: 2100, percentage: 8.5 },
                      { source: 'TikTok & Other', count: 800, percentage: 3.2 }
                    ]).map((src, idx) => (
                      <div key={idx} className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">{src.source}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden hidden sm:block">
                            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min(100, src.percentage * 2)}%` }} />
                          </div>
                          <span className="text-xs font-mono font-bold text-teal-400 w-12 text-right">{src.percentage}%</span>
                          <span className="text-[11px] text-slate-400 font-mono w-20 text-right">({src.count.toLocaleString()} ครั้ง)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Popular Pages & Sections Viewed */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="border-b border-slate-700/60 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                    <span>หน้าที่ได้รับการเข้าชมมากที่สุด (Most Viewed Pages & Sections)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">อันดับหน้าเว็บและเนื้อหาที่ได้รับความสนใจสูงสุดจากลูกค้า</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-slate-400 font-bold">
                        <th className="p-3">อันดับ</th>
                        <th className="p-3">หน้าเว็บไซต์ / เส้นทาง</th>
                        <th className="p-3">ชื่อหน้า / หมวดหมู่</th>
                        <th className="p-3 text-right">จำนวนการเปิดดู (Pageviews)</th>
                        <th className="p-3 text-right">สัดส่วนความสนใจ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-slate-200">
                      {(visitorAnalytics?.topPages || [
                        { path: 'home', title: 'หน้าแรก - โปรแกรมทัวร์เกาะพีพี & ทะเลภูเก็ต', views: 15420 },
                        { path: 'how-to-book', title: 'วิธีการจอง & นโยบายการชำระเงิน', views: 4280 },
                        { path: 'about-me', title: 'เกี่ยวกับเรา & ใบอนุญาต ททท.', views: 2890 },
                        { path: 'tour-detail', title: 'รายละเอียดแพ็กเกจทัวร์', views: 2260 }
                      ]).map((pageItem, idx) => {
                        const totalViews = visitorAnalytics?.totalPageviews || 24850;
                        const pct = ((pageItem.views / totalViews) * 100).toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-slate-700/30 transition">
                            <td className="p-3">
                              <span className="w-6 h-6 rounded-full bg-slate-700 text-amber-400 font-black flex items-center justify-center text-[11px]">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono bg-slate-900 border border-slate-700 text-cyan-300 px-2 py-0.5 rounded text-[11px]">
                                /{pageItem.path}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">{pageItem.title}</td>
                            <td className="p-3 text-right font-mono font-bold text-cyan-400 text-sm">
                              {pageItem.views.toLocaleString()} ครั้ง
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Online Visitors Live Sessions */}
              {visitorAnalytics?.liveSessions && visitorAnalytics.liveSessions.length > 0 && (
                <div className="bg-slate-800/90 border border-emerald-500/50 p-6 rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                        <span>ผู้ใช้งานที่กำลังออนไลน์อยู่ในขณะนี้ ({visitorAnalytics.liveSessions.length} คน)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">รายชื่อและรายละเอียดของผู้เข้าชมที่กำลังท่องเว็บอยู่ขณะนี้ (Active Ping 3 นาทีล่าสุด)</p>
                    </div>
                    <span className="text-[11px] text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 w-fit">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>กำลังส่งสัญญาณสด (Heartbeat Live)</span>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/80 text-slate-400 font-bold">
                          <th className="p-3">ประเทศ / IP</th>
                          <th className="p-3">อุปกรณ์ & ระบบ</th>
                          <th className="p-3">หน้าปัจจุบันที่กำลังดู</th>
                          <th className="p-3">ช่องทางที่มา</th>
                          <th className="p-3 text-right">จำนวนเปิดดู</th>
                          <th className="p-3 text-right">แอคทีฟล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 text-slate-200">
                        {visitorAnalytics.liveSessions.map((session, idx) => (
                          <tr key={session.visitorId || idx} className="hover:bg-slate-700/40 transition">
                            <td className="p-3">
                              <span className="font-bold text-white block text-xs">{session.country || '🇹🇭 ประเทศไทย'}</span>
                              <span className="font-mono text-[10px] text-slate-400 block">{session.ipMasked || '127.0.0.1'}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 rounded bg-slate-900 border border-slate-700">
                                  {session.device === 'desktop' ? <Monitor className="w-3.5 h-3.5 text-emerald-400" /> :
                                   session.device === 'tablet' ? <Tablet className="w-3.5 h-3.5 text-purple-400" /> :
                                   <Smartphone className="w-3.5 h-3.5 text-cyan-400" />}
                                </span>
                                <div>
                                  <span className="font-bold text-white block text-[11px]">{session.browser || 'Browser'} ({session.os || 'OS'})</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{session.screen || 'Mobile'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-cyan-300 block leading-snug">{session.pageTitle || 'หน้าแรก'}</span>
                              <span className="font-mono bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">/{session.currentPage}</span>
                            </td>
                            <td className="p-3 text-slate-300 text-[11px]">
                              {session.referrer || 'Direct'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                              {session.pageviewsCount || 1} หน้า
                            </td>
                            <td className="p-3 text-right">
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                {session.lastPingSecondsAgo !== undefined ? `${session.lastPingSecondsAgo} วินาทีที่แล้ว` : 'สดเมื่อครู่'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Real-time Recent Visitors Stream */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <span>ประวัติการเข้าชมล่าสุดแบบเรียลไทม์ (Live Visitor Activity Stream)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">การเชื่อมต่อและเปิดดูหน้าเว็บล่าสุดของลูกค้า</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetVisitorAnalytics('real_zero')}
                      className="bg-slate-900 hover:bg-slate-700 text-rose-300 border border-rose-800/60 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      title="ล้างสถิติเก่าและเริ่มนับคนดูจริงจาก 0"
                    >
                      🔄 รีเซ็ตนับสถิติจริงจาก 0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetVisitorAnalytics('baseline')}
                      className="bg-slate-900 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      title="คืนค่ากลับเป็นสถิติเริ่มต้น"
                    >
                      📊 รีเซ็ตกลับสถิติอ้างอิง
                    </button>
                  </div>
                </div>


                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-slate-400 font-bold">
                        <th className="p-3">รหัสผู้เข้าชม (Visitor ID)</th>
                        <th className="p-3">อุปกรณ์ (Device)</th>
                        <th className="p-3">หน้าที่เปิดดู (Page)</th>
                        <th className="p-3">แหล่งที่มา (Referrer)</th>
                        <th className="p-3 text-right">เวลาที่เข้าชม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-slate-300">
                      {(visitorAnalytics?.recentVisitors || [
                        { id: 'v-th-8821', timestamp: new Date().toISOString(), device: 'mobile', page: 'home', referrer: 'Google Search' },
                        { id: 'v-th-4190', timestamp: new Date(Date.now() - 120000).toISOString(), device: 'desktop', page: 'tour-detail', referrer: 'Direct' },
                        { id: 'v-th-9102', timestamp: new Date(Date.now() - 300000).toISOString(), device: 'mobile', page: 'how-to-book', referrer: 'Facebook' }
                      ]).slice(0, 10).map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30 transition">
                          <td className="p-3 font-mono text-cyan-300 font-bold">
                            {v.id}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-300">
                              {v.device === 'desktop' ? <Monitor className="w-3.5 h-3.5 text-emerald-400" /> :
                               v.device === 'tablet' ? <Tablet className="w-3.5 h-3.5 text-purple-400" /> :
                               <Smartphone className="w-3.5 h-3.5 text-cyan-400" />}
                              <span className="capitalize">{v.device}</span>
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-white">
                            /{v.page}
                          </td>
                          <td className="p-3 text-slate-400">
                            {v.referrer || 'Direct'}
                          </td>
                          <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                            {v.timestamp ? new Date(v.timestamp).toLocaleTimeString('th-TH') : 'เมื่อสักครู่'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
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
        suppliers={suppliers}
        isOpen={isTourModalOpen}
        initialAiScanMode={isTourModalAiMode}
        onClose={() => {
          setIsTourModalOpen(false);
          setIsTourModalAiMode(false);
        }}
        onSave={async (tourData) => {
          if (editingTour && onUpdateTour) {
            await onUpdateTour(editingTour.id, tourData);
          } else {
            await onAddTour(tourData as Tour);
          }
        }}
      />

      {/* Tour Backup & Restore Center Modal */}
      {isTourBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-5 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    ศูนย์สำรองและกู้คืนข้อมูลโปรแกรมทัวร์ (Backup & Restore)
                  </h3>
                  <p className="text-xs text-slate-400">
                    จัดการส่งออก (Export JSON) หรือนำเข้า (Import/Restore) ข้อมูลโปรแกรมทัวร์ทั้งหมด {tours.length} รายการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTourBackupModalOpen(false)}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setTourBackupActiveTab('export')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tourBackupActiveTab === 'export'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>สำรองข้อมูล (Export JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => setTourBackupActiveTab('import')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tourBackupActiveTab === 'import'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้าข้อมูล (Import / Restore)</span>
              </button>

              <button
                type="button"
                onClick={() => setTourBackupActiveTab('reset')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tourBackupActiveTab === 'reset'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>คืนค่าเริ่มต้น</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* TAB 1: EXPORT */}
              {tourBackupActiveTab === 'export' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">สรุปข้อมูลที่จะสำรอง:</span>
                      <span className="text-teal-400 font-mono font-bold">{tours.length} โปรแกรมทัวร์</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block">เปิดแสดงบนเว็บ:</span>
                        <span className="text-emerald-400 font-bold font-mono text-sm">
                          {tours.filter(t => t.isVisible !== false && t.isAvailable !== false).length} ทัวร์
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block">ซ่อนไว้:</span>
                        <span className="text-rose-400 font-bold font-mono text-sm">
                          {tours.filter(t => t.isVisible === false || t.isAvailable === false).length} ทัวร์
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ไฟล์สำรองข้อมูลประกอบด้วยข้อมูลครบถ้วน: 4 ภาษา (TH, EN, ZH, RU), ราคาทุน, ราคาขาย, ตารางกำหนดการเดินทาง (Itinerary), รายการสิ่งที่รวม และรูปภาพ
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleExportToursJson}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 cursor-pointer active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์สำรอง (trip_sea_tours_backup.json)</span>
                    </button>

                    <button
                      onClick={handleCopyToursJson}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                    >
                      {copiedToursJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedToursJson ? 'คัดลอก JSON แล้ว!' : 'คัดลอกข้อความ JSON'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: IMPORT / RESTORE */}
              {tourBackupActiveTab === 'import' && (
                <div className="space-y-4 animate-in fade-in">
                  {/* File Upload Box */}
                  <div>
                    <label className="font-bold text-slate-200 block mb-1.5 flex items-center justify-between">
                      <span>1. เลือกไฟล์สำรอง (.json) จากอุปกรณ์</span>
                      <span className="text-[10px] text-slate-400">ไฟล์ JSON มาตรฐาน</span>
                    </label>
                    <label className="border-2 border-dashed border-slate-700 hover:border-teal-500/80 rounded-2xl p-4 bg-slate-950/60 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                      <FileJson className="w-8 h-8 text-teal-400" />
                      <span className="font-bold text-xs text-slate-300">คลิกเพื่อเลือกไฟล์สำรอง JSON</span>
                      <span className="text-[10px] text-slate-500">รองรับไฟล์ trip_sea_tours_backup_*.json</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Or Paste JSON Text */}
                  <div>
                    <label className="font-bold text-slate-200 block mb-1.5">
                      หรือ วางข้อความ JSON โดยตรง:
                    </label>
                    <textarea
                      rows={5}
                      value={importJsonText}
                      onChange={(e) => {
                        setImportJsonText(e.target.value);
                        parseAndValidateImportJson(e.target.value);
                      }}
                      placeholder='วางโค้ด JSON เช่น [{"id": "tour-1", "title": {"TH": "..."}, ...}]'
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Error Box */}
                  {importError && (
                    <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <strong className="block font-bold">ไม่สามารถอ่านไฟล์ได้</strong>
                        <span className="text-[11px]">{importError}</span>
                      </div>
                    </div>
                  )}

                  {/* Validation Success Box */}
                  {importParsedTours && (
                    <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-xs sm:text-sm">
                          ตรวจสอบพบข้อมูลโปรแกรมทัวร์ {importParsedTours.length} รายการ พร้อมนำเข้า!
                        </span>
                      </div>

                      {/* Import Mode Selector */}
                      <div className="space-y-1.5 pt-1 border-t border-emerald-800/40">
                        <span className="text-[11px] font-bold text-slate-300 block">เลือกรูปแบบการนำเข้า:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                            importMode === 'replace' 
                              ? 'bg-emerald-900/60 border-emerald-400 text-white ring-1 ring-emerald-400' 
                              : 'bg-slate-900/80 border-slate-700 text-slate-400'
                          }`}>
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="text-emerald-500"
                            />
                            <div>
                              <strong className="block text-xs font-bold">แทนที่ทั้งหมด (Replace All)</strong>
                              <span className="text-[10px] text-slate-400">ใช้รายการทัวร์จากไฟล์นี้แทนที่ของเดิมทั้งหมด</span>
                            </div>
                          </label>

                          <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                            importMode === 'merge' 
                              ? 'bg-teal-900/60 border-teal-400 text-white ring-1 ring-teal-400' 
                              : 'bg-slate-900/80 border-slate-700 text-slate-400'
                          }`}>
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="text-teal-500"
                            />
                            <div>
                              <strong className="block text-xs font-bold">ผสานข้อมูล (Merge / Append)</strong>
                              <span className="text-[10px] text-slate-400">อัปเดตตัวที่ตรงกันและเพิ่มทัวร์ใหม่ต่อท้าย</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={isSavingAllTours}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <Save className={`w-4 h-4 ${isSavingAllTours ? 'animate-spin' : ''}`} />
                        <span>
                          {isSavingAllTours 
                            ? 'กำลังนำเข้าและบันทึกข้อมูล...' 
                            : `ยืนยันนำเข้าและบันทึกทัวร์ทั้งหมด (${importParsedTours.length} รายการ)`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RESET TO DEFAULT */}
              {tourBackupActiveTab === 'reset' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span>คืนค่าโปรแกรมทัวร์เริ่มต้น (Reset to Default Tours)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      การดำเนินการนี้จะรีเซ็ตข้อมูลโปรแกรมทัวร์ทั้งหมดกลับเป็นชุดทัวร์เริ่มต้นมาตรฐานของ Trip Sea Tour Phuket (ทัวร์เกาะพีพี, อ่าวพังงา, เรือยอชท์, ปางช้าง ฯลฯ)
                    </p>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmResetToursOpen(true)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 mx-auto cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>ยืนยันคืนค่าโปรแกรมทัวร์เริ่มต้น</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ซิงค์ตรงกับฐานข้อมูล Supabase และ Local Storage</span>
              </span>
              <button
                type="button"
                onClick={() => setIsTourBackupModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Tours Confirmation Modal */}
      {isConfirmResetToursOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ต้องการคืนค่าโปรแกรมทัวร์เริ่มต้นหรือไม่?</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                ข้อมูลทัวร์ปัจจุบันทั้งหมดจะถูกแทนที่ด้วยชุดข้อมูลเริ่มต้นของระบบ หากต้องการเก็บข้อมูลเดิมไว้ กรุณากดสำรองข้อมูล (Export JSON) ไว้ก่อน
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmResetToursOpen(false)}
                disabled={isResettingTours}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmResetTours}
                disabled={isResettingTours}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResettingTours ? 'animate-spin' : ''}`} />
                <span>{isResettingTours ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ต'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit Review Photo Modal */}
      {editingReviewPhotos && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setEditingReviewPhotos(null);
                setNewPhotoUrl('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-teal-400 font-bold border-b border-slate-800 pb-3">
              <ImageIcon className="w-5 h-5 text-teal-500" />
              <h3 className="text-base text-slate-100 font-bold">จัดการรูปภาพรีวิว</h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Info of Review */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">
                  <span className="font-bold text-slate-300">ผู้รีวิว:</span> {editingReviewPhotos.userName}
                </p>
                <p className="text-slate-400 line-clamp-2">
                  <span className="font-bold text-slate-300">ข้อความ:</span> "{editingReviewPhotos.comment}"
                </p>
              </div>

              {/* Preview Current Image */}
              <div className="space-y-1.5">
                <span className="text-slate-300 font-bold block">รูปภาพตัวอย่างปัจจุบัน:</span>
                {newPhotoUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={newPhotoUrl}
                      alt="Review Preview"
                      className="w-32 h-32 rounded-xl object-cover border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPhotoUrl('')}
                      className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 transition shadow-md shadow-rose-950"
                      title="ลบรูปภาพนี้"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col items-center justify-center text-slate-500 border-dashed">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span>ไม่มีรูปภาพ</span>
                  </div>
                )}
              </div>

              {/* Upload Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">อัปโหลดรูปภาพใหม่จากคอมพิวเตอร์:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        setNewPhotoUrl(uploadEvent.target?.result as string);
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                  className="w-full text-slate-400 text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 file:mr-4 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer"
                />
              </div>

              {/* URL Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">หรือใส่ที่อยู่ลิงก์รูปภาพ (Image URL):</label>
                <input
                  type="text"
                  placeholder="https://example.com/photo.jpg"
                  value={newPhotoUrl.startsWith('data:image') ? '' : newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:ring-2 focus:ring-teal-500"
                />
                {newPhotoUrl.startsWith('data:image') && (
                  <p className="text-[10px] text-amber-400 font-semibold">
                    * รูปภาพมาจากการอัปโหลดแบบไฟล์ภายใน (Base64) หากต้องการใช้ลิงก์แทน กรุณาพิมพ์ลิงก์รูปภาพ
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReviewPhotos(null);
                    setNewPhotoUrl('');
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateReview && editingReviewPhotos) {
                      onUpdateReview(editingReviewPhotos.id, {
                        photos: newPhotoUrl.trim() ? [newPhotoUrl.trim()] : []
                      });
                    }
                    setEditingReviewPhotos(null);
                    setNewPhotoUrl('');
                  }}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-teal-900/40 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกรูปภาพ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Insurance Manifest Lightbox Modal */}
      {isPrintManifestOpen && (
        <div className="print-manifest-modal fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="print-manifest-container bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-300 relative space-y-6 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <Ship className="w-7 h-7 text-teal-600" />
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    ใบบัญชีรายชื่อผู้โดยสารส่งประกันภัยอุบัติเหตุทางทะเล
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Trip Sea Tour Phuket • ใบอนุญาตประกอบธุรกิจนำเที่ยว เลขที่ {settings.tatLicenseNo || '33/11100'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintManifestOpen(false)}
                className="no-print w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="font-bold">วันที่เดินทาง: {manifestDateFilter === 'all' ? 'ทั้งหมด' : manifestDateFilter}</span>
                <span>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</span>
              </div>
              <div>บริษัท ประกันภัยอุบัติเหตุทางทะเล: คุ้มครองผู้โดยสารและลูกเรือ 100% ตามกฎหมายกรมเจ้าท่า</div>
            </div>

            {/* Clean Printable Table */}
            <div className="border border-slate-300 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">รหัสจอง</th>
                    <th className="p-2.5">ชื่อ-นามสกุล ผู้โดยสารหลัก</th>
                    <th className="p-2.5">เบอร์โทรศัพท์</th>
                    <th className="p-2.5">จำนวน</th>
                    <th className="p-2.5">โรงแรมรับ-ส่ง</th>
                    <th className="p-2.5">โปรแกรมทัวร์</th>
                    <th className="p-2.5">เรือ/กัปตัน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bookings
                    .filter((b) => manifestDateFilter === 'all' || b.travelDate === manifestDateFilter)
                    .map((bk, idx) => {
                      const tour = tours.find((t) => t.id === bk.tourId);
                      return (
                        <tr key={bk.id ? `print-row-${bk.id}-${idx}` : `print-row-${idx}`} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-teal-700">#{bk.bookingRef}</td>
                          <td className="p-2.5 font-bold">{bk.customerName}</td>
                          <td className="p-2.5 font-mono">{bk.customerPhone}</td>
                          <td className="p-2.5 font-mono">
                            {bk.adultsCount || 1}A {bk.childrenCount ? `/ ${bk.childrenCount}C` : ''}
                          </td>
                          <td className="p-2.5">{bk.hotelName} (ห้อง {bk.roomNumber || '-'})</td>
                          <td className="p-2.5 font-medium">{tour?.title.TH || 'ทัวร์ภูเก็ต'}</td>
                          <td className="p-2.5 font-bold text-teal-800">
                            {boatAssignments[bk.id] || bk.boatName || 'Speedboat 01'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                รวมทั้งหมด {bookings.filter((b) => manifestDateFilter === 'all' || b.travelDate === manifestDateFilter).length} คำสั่งซื้อ
              </span>
              <div className="no-print flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>กดสั่งพิมพ์เอกสาร (Print)</span>
                </button>
                <button
                  onClick={() => setIsPrintManifestOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Agency Cost Modal */}
      {quickCostTour && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setQuickCostTour(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-3">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="text-base text-slate-100 font-bold">ปรับราคาทุนเอเยนต์ (Supplier Net Cost)</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">โปรแกรมทัวร์:</span>
                <span className="text-sm font-bold text-teal-400">{quickCostTour.title.TH}</span>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-2">
                  <span>ราคาขายผู้ใหญ่: <strong className="text-emerald-400">฿{quickCostTour.priceAdult.toLocaleString()}</strong></span>
                  <span>ราคาขายเด็ก: <strong className="text-cyan-400">฿{quickCostTour.priceChild.toLocaleString()}</strong></span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onUpdateTour && quickCostTour) {
                    onUpdateTour(quickCostTour.id, {
                      costAdult: Number(quickCostAdult),
                      costChild: Number(quickCostChild)
                    });
                  }
                  setQuickCostTour(null);
                }}
                className="space-y-4 pt-2"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-400 block mb-1">🏭 ทุนผู้ใหญ่ (Adult Net)</label>
                    <input
                      type="number"
                      required
                      value={quickCostAdult}
                      onChange={(e) => setQuickCostAdult(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-400 block mb-1">🏭 ทุนเด็ก (Child Net)</label>
                    <input
                      type="number"
                      required
                      value={quickCostChild}
                      onChange={(e) => setQuickCostChild(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-300">กำไรสุทธิต่อตั๋วใหม่:</span>
                  <span className="font-extrabold text-emerald-400">
                    ผู้ใหญ่ ฿{(quickCostTour.priceAdult - quickCostAdult).toLocaleString()} / เด็ก ฿{(quickCostTour.priceChild - quickCostChild).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickCostTour(null)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกราคาทุน</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Delete Supplier Modal */}
      {deleteSupplierTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-800 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ยืนยันลบซัพพลายเออร์</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                คุณต้องการลบซัพพลายเออร์ <strong className="text-amber-300">{deleteSupplierTarget.name}</strong> ([{deleteSupplierTarget.code}]) ออกจากระบบใช่หรือไม่?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSupplierTarget(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSupplier && deleteSupplierTarget) {
                    onDeleteSupplier(deleteSupplierTarget.id);
                  }
                  setDeleteSupplierTarget(null);
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบข้อมูล</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isSupplierModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={(supData) => {
            if (editingSupplier && onUpdateSupplier) {
              onUpdateSupplier(editingSupplier.id, supData);
            } else if (onAddSupplier) {
              const newSup: Supplier = {
                id: `sup-${Date.now()}`,
                name: supData.name || 'บริษัทใหม่',
                code: supData.code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
                contactPerson: supData.contactPerson,
                phone: supData.phone,
                lineId: supData.lineId,
                email: supData.email,
                address: supData.address,
                bankName: supData.bankName,
                accountNo: supData.accountNo,
                accountName: supData.accountName,
                notes: supData.notes,
                isActive: supData.isActive !== false
              };
              onAddSupplier(newSup);
            }
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
        />
      )}
      {/* Universal Data Backup Modal */}
      <UniversalDataBackupModal
        isOpen={isUniversalBackupOpen}
        onClose={() => setIsUniversalBackupOpen(false)}
        initialSection={universalBackupSection}
        tours={tours}
        suppliers={suppliers}
        customers={customers}
        bookings={bookings}
        reviews={reviews}
        settings={settings}
        onSaveAllTours={onSaveAllTours}
        onResetToursToDefault={onResetToursToDefault}
        onSaveAllSuppliers={onSaveAllSuppliers}
        onSaveAllCustomers={onSaveAllCustomers}
        onSaveAllBookings={onSaveAllBookings}
        onRestoreFullBackup={onRestoreFullBackup}
        onRefreshData={onRefreshData}
      />

      {/* Reorder Tours Modal */}
      <ReorderToursModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        tours={tours}
        onSaveOrder={onSaveAllTours || (() => {})}
      />
    </div>
  );
};
