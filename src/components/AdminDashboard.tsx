import React, { useState, useEffect } from 'react';
import {
  BarChart3, DollarSign, ShoppingBag, Clock, CheckCircle2, AlertTriangle, Users,
  Settings, MessageCircle, QrCode, Plus, Search, Eye, EyeOff, Copy, Check, X, RefreshCw, Send, Image as ImageIcon,
  ChevronRight, Filter, FileSpreadsheet, Sparkles, LogOut, Lock, Key, Ticket, Trash2, Edit3, Calendar, ListChecks,
  Star, MessageSquare, Bot, UserPlus, UserMinus, ShieldCheck, Mail, Database, Printer, Ship, FileText, ClipboardList, PhoneCall, Award,
  TrendingUp, Calculator, Percent, Coins, Building2, Headphones, CheckCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { Booking, Tour, Customer, Review, AppSettings, LineNotificationLog, SalesStats, AdminUser } from '../types';
import { TicketVoucher } from './TicketVoucher';
import { EditTourModal } from './EditTourModal';
import { isSupabaseConfigured, getSupabase, SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { initialSettings } from '../data/mockData';

interface AdminDashboardProps {
  adminUser?: AdminUser | null;
  bookings: Booking[];
  tours: Tour[];
  customers: Customer[];
  reviews?: Review[];
  settings: AppSettings;
  lineLogs: LineNotificationLog[];
  syncStatus?: 'synced' | 'syncing' | 'error';
  lastSyncedAt?: string;
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
  onUpdateReview?: (id: string, updatedFields: Partial<Review>) => void;
  onReplyReview?: (id: string, reply: string) => void;
  onDeleteReview?: (id: string) => void;
  onRefreshData?: () => void;
  onForceSync?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  bookings,
  tours,
  customers,
  reviews = [],
  settings,
  lineLogs,
  syncStatus = 'synced',
  lastSyncedAt,
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
  onUpdateReview,
  onReplyReview,
  onDeleteReview,
  onRefreshData,
  onForceSync
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'livechat' | 'tours' | 'customers' | 'reviews' | 'settings' | 'manifest'>('overview');
  const [stats, setStats] = useState<SalesStats | null>(null);

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
  const [manifestSearch, setManifestSearch] = useState<string>('');
  const [boatAssignments, setBoatAssignments] = useState<Record<string, string>>({});
  const [isPrintManifestOpen, setIsPrintManifestOpen] = useState<boolean>(false);
  const [lineSendSuccessMsg, setLineSendSuccessMsg] = useState<string | null>(null);

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
  const [editingReviewPhotos, setEditingReviewPhotos] = useState<Review | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');

  const isSuperAdmin = adminUser?.role === 'superadmin' || adminUser?.email?.trim().toLowerCase() === 'asmr9941@gmail.com';

  const hasAccess = (tab: 'overview' | 'orders' | 'livechat' | 'tours' | 'customers' | 'reviews' | 'settings' | 'manifest') => {
    if (isSuperAdmin) return true;
    const allowed = settings.adminPermissions || ['overview', 'orders', 'livechat', 'tours', 'reviews', 'manifest'];
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
      b.customerPhone.includes(searchQuery) ||
      (b.customerLineId && b.customerLineId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.pickupHotel && b.pickupHotel.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
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
                          {(stats?.categoryBreakdown || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                    {(stats?.categoryBreakdown || []).map((cat, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 font-medium">
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
                      {analytics.tourBreakdownList.map((item) => {
                        const t = item.tour;
                        const costAdult = t.costAdult !== undefined ? t.costAdult : Math.round(t.priceAdult * 0.65);
                        const costChild = t.costChild !== undefined ? t.costChild : Math.round(t.priceChild * 0.65);
                        const profitAdult = t.priceAdult - costAdult;
                        const profitChild = t.priceChild - costChild;

                        return (
                          <tr key={t.id} className="hover:bg-slate-700/30 transition">
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
                      <th className="p-3.5">ผู้จอง & เบอร์ / LINE</th>
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
          ) : (
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
          )
        )}

        {/* TAB 4: CRM CUSTOMER DATABASE */}
        {activeTab === 'customers' && (
          !hasAccess('customers') ? (
            renderRestrictedArea('ฐานข้อมูลลูกค้า CRM')
          ) : (
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
                    URL: {supabaseStatus?.url || 'https://tljofqremlconawmtndd.supabase.co'} (ตาราง: app_store, bookings, tours, settings)
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
                          {detectedGroups.map((g) => (
                            <div key={g.groupId} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg text-xs">
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
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">วันเดินทาง (Travel Date)</label>
                <select
                  value={manifestDateFilter}
                  onChange={(e) => setManifestDateFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">📅 แสดงวันเดินทางทั้งหมด ({bookings.length} รายการ)</option>
                  {Array.from(new Set(bookings.map((b) => b.travelDate))).map((d) => (
                    <option key={d} value={d}>
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
                  {tours.map((t) => (
                    <option key={t.id} value={t.id}>
                      📍 {t.title.TH}
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
                const matchSearch =
                  !manifestSearch ||
                  b.customerName.toLowerCase().includes(manifestSearch.toLowerCase()) ||
                  b.customerPhone.includes(manifestSearch) ||
                  b.bookingRef.toLowerCase().includes(manifestSearch.toLowerCase()) ||
                  b.hotelName.toLowerCase().includes(manifestSearch.toLowerCase());
                return matchDate && matchTour && matchSearch;
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
                            <th className="p-3.5">เรือ / กัปตัน</th>
                            <th className="p-3.5 pr-4 text-center">ประกันภัย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {filteredList.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                                ไม่พบข้อมูลผู้โดยสารตามเงื่อนไขที่เลือก
                              </td>
                            </tr>
                          ) : (
                            filteredList.map((bk, idx) => {
                              const tour = tours.find((t) => t.id === bk.tourId);
                              return (
                                <tr key={bk.id} className="hover:bg-slate-800/40 transition">
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
                        <tr key={bk.id} className="hover:bg-slate-50">
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
    </div>
  );
};
