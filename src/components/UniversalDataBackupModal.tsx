import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileJson,
  RefreshCw,
  Database,
  ShieldCheck,
  Building2,
  Users,
  ShoppingBag,
  Ship,
  Sparkles,
  Save,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Tour, Supplier, Customer, Booking, Review, AppSettings } from '../types';
import { normalizeTours } from '../utils/tourNormalizer';
import { exportBookingsToCsv, exportCustomersToCsv, exportSuppliersToCsv, exportToursToCsv } from '../utils/excelExporter';
import { initAuth, googleSignIn, logoutGoogle, getAccessToken } from '../lib/googleAuth';
import { createAndSyncGoogleSpreadsheet, SyncToSheetsResult, loadSavedSpreadsheetInfo, setActiveSpreadsheetInfo, getActiveSpreadsheetInfo } from '../lib/googleSheetsSync';
import { User } from 'firebase/auth';



export type BackupTargetSection = 'all' | 'suppliers' | 'customers' | 'bookings' | 'tours';

export interface UniversalDataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: BackupTargetSection;
  tours: Tour[];
  suppliers: Supplier[];
  customers: Customer[];
  bookings: Booking[];
  reviews: Review[];
  settings: AppSettings;
  onSaveAllTours?: (tours: Tour[]) => Promise<boolean | void> | void;
  onResetToursToDefault?: () => Promise<void> | void;
  onSaveAllSuppliers?: (suppliers: Supplier[]) => Promise<boolean>;
  onSaveAllCustomers?: (customers: Customer[]) => Promise<boolean>;
  onSaveAllBookings?: (bookings: Booking[]) => Promise<boolean>;
  onRestoreFullBackup?: (bundle: any) => Promise<boolean>;
  onRefreshData?: () => void;
}

export const UniversalDataBackupModal: React.FC<UniversalDataBackupModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'all',
  tours,
  suppliers,
  customers,
  bookings,
  reviews,
  settings,
  onSaveAllTours,
  onResetToursToDefault,
  onSaveAllSuppliers,
  onSaveAllCustomers,
  onSaveAllBookings,
  onRestoreFullBackup,
  onRefreshData
}) => {
  const [activeSection, setActiveSection] = useState<BackupTargetSection>(initialSection);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'google_sheets' | 'reset'>('export');
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccessInfo, setValidationSuccessInfo] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // Google Sheets Integration States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsResult, setSheetsResult] = useState<SyncToSheetsResult | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [isAccessDeniedTestUser, setIsAccessDeniedTestUser] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  useEffect(() => {
    if (isOpen) {
      initAuth(
        (u, t) => {
          setGoogleUser(u);
          setGoogleToken(t);
        },
        () => {
          setGoogleUser(null);
          setGoogleToken(null);
        }
      );
    }
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    setSheetsError(null);
    setIsUnauthorizedDomain(false);
    setIsAccessDeniedTestUser(false);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setIsUnauthorizedDomain(false);
        setIsAccessDeniedTestUser(false);
      }
    } catch (err: any) {
      const isCancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request');

      if (isCancelled) {
        // User closed or dismissed popup voluntarily - not an error
        return;
      }

      const isBlocked = err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked');
      if (isBlocked) {
        setSheetsError('เบราว์เซอร์บล็อกหน้าต่าง Pop-up กรุณาอนุญาตให้แสดง Pop-up ในแถบที่อยู่ของเบราว์เซอร์');
        return;
      }

      const isUnauth =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('auth/unauthorized-domain') ||
        err?.message?.includes('unauthorized-domain');

      if (isUnauth) {
        setIsUnauthorizedDomain(true);
        setSheetsError(`โดเมน "${window.location.hostname}" ยังไม่ได้รับอนุญาตใน Firebase Authentication (auth/unauthorized-domain)`);
        return;
      }

      const isAccessDenied =
        err?.code === 'auth/access-denied' ||
        err?.message?.includes('access_denied') ||
        err?.message?.includes('403') ||
        err?.message?.includes('ยังไม่ผ่านกระบวนการยืนยันตัวตน') ||
        err?.message?.includes('ผู้ทดสอบที่นักพัฒนาแอปอนุมัติ');

      if (isAccessDenied) {
        setIsAccessDeniedTestUser(true);
        setSheetsError('การเข้าถึงถูกบล็อก (403: access_denied): บัญชี Google นี้ยังไม่ได้ถูกเพิ่มในรายชื่อ Test users (ผู้ใช้ทดสอบ) ใน Google Cloud Console');
        return;
      }

      console.warn('Google login exception:', err);
      setSheetsError(`เข้าสู่ระบบ Google ไม่สำเร็จ: ${err?.message || 'ข้อผิดพลาดระบบ'}`);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const [realtimeSyncInfo, setRealtimeSyncInfo] = useState(() => loadSavedSpreadsheetInfo());

  const handleToggleRealtimeSync = (enabled: boolean) => {
    const current = getActiveSpreadsheetInfo();
    setActiveSpreadsheetInfo(current.spreadsheetId, current.spreadsheetUrl, enabled);
    setRealtimeSyncInfo(getActiveSpreadsheetInfo());
  };

  const handleSyncToGoogleSheets = async () => {
    const token = googleToken || await getAccessToken();
    if (!token) {
      setSheetsError('กรุณาเข้าสู่ระบบด้วย Google ก่อนส่งออกไปยัง Google Sheets');
      return;
    }

    const confirmed = window.confirm('ยืนยันสร้างสเปรดชีต Google Sheets ใหม่ใน Google Drive ของคุณ เพื่อซิงค์ข้อมูล Realtime หรือไม่?');
    if (!confirmed) return;

    setIsSyncingSheets(true);
    setSheetsError(null);
    setSheetsResult(null);

    try {
      const res = await createAndSyncGoogleSpreadsheet(token, {
        bookings,
        customers,
        suppliers,
        tours
      });
      setSheetsResult(res);
      setRealtimeSyncInfo(getActiveSpreadsheetInfo());
    } catch (err: any) {
      console.error('Sheets sync error:', err);
      setSheetsError(`สร้าง Google Sheets ไม่สำเร็จ: ${err?.message || 'โปรดตรวจสอบสิทธิ์ Google'}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
      setActiveTab('export');
      setImportJsonText('');
      setParsedData(null);
      setValidationError(null);
      setValidationSuccessInfo(null);
      setIsCopied(false);
      setIsConfirmResetOpen(false);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  // Prepare Export Data based on active section
  const getExportData = () => {
    const timestamp = new Date().toISOString();
    if (activeSection === 'all') {
      return {
        system: 'Trip Sea Tour Phuket - Full System Backup',
        exportVersion: '2.0',
        exportedAt: timestamp,
        itemCounts: {
          tours: tours.length,
          suppliers: suppliers.length,
          customers: customers.length,
          bookings: bookings.length,
          reviews: reviews.length
        },
        data: {
          tours,
          suppliers,
          customers,
          bookings,
          reviews,
          settings
        }
      };
    } else if (activeSection === 'suppliers') {
      return {
        system: 'Trip Sea Tour Phuket - Suppliers Backup',
        exportedAt: timestamp,
        count: suppliers.length,
        suppliers
      };
    } else if (activeSection === 'customers') {
      return {
        system: 'Trip Sea Tour Phuket - Customers CRM Backup',
        exportedAt: timestamp,
        count: customers.length,
        customers
      };
    } else if (activeSection === 'bookings') {
      return {
        system: 'Trip Sea Tour Phuket - Bookings & Orders Backup',
        exportedAt: timestamp,
        count: bookings.length,
        bookings
      };
    } else {
      return {
        system: 'Trip Sea Tour Phuket - Tours Backup',
        exportedAt: timestamp,
        count: tours.length,
        tours
      };
    }
  };

  const getExportFileName = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    if (activeSection === 'all') return `tripseatour_FULL_BACKUP_${dateStr}.json`;
    if (activeSection === 'suppliers') return `tripseatour_suppliers_${dateStr}.json`;
    if (activeSection === 'customers') return `tripseatour_customers_${dateStr}.json`;
    if (activeSection === 'bookings') return `tripseatour_bookings_${dateStr}.json`;
    return `tripseatour_tours_${dateStr}.json`;
  };

  const handleDownloadJson = () => {
    try {
      const exportObj = getExportData();
      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = getExportFileName();
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleCopyJson = () => {
    try {
      const exportObj = getExportData();
      navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleExportCsv = () => {
    try {
      if (activeSection === 'bookings' || activeSection === 'all') {
        exportBookingsToCsv(bookings);
      }
      if (activeSection === 'customers' || activeSection === 'all') {
        exportCustomersToCsv(customers);
      }
      if (activeSection === 'suppliers' || activeSection === 'all') {
        exportSuppliersToCsv(suppliers);
      }
      if (activeSection === 'tours' || activeSection === 'all') {
        exportToursToCsv(tours);
      }
    } catch (err) {
      console.error('Export CSV error:', err);
    }
  };

  // Validate incoming import JSON based on target section

  const validateImportJson = (text: string) => {
    setValidationError(null);
    setValidationSuccessInfo(null);
    setParsedData(null);
    if (!text.trim()) return;

    try {
      const parsed = JSON.parse(text);

      if (activeSection === 'all') {
        const bundle = parsed.data || parsed;
        const tourCount = Array.isArray(bundle.tours) ? bundle.tours.length : 0;
        const supCount = Array.isArray(bundle.suppliers) ? bundle.suppliers.length : 0;
        const custCount = Array.isArray(bundle.customers) ? bundle.customers.length : 0;
        const bkCount = Array.isArray(bundle.bookings) ? bundle.bookings.length : 0;
        const revCount = Array.isArray(bundle.reviews) ? bundle.reviews.length : 0;

        if (tourCount === 0 && supCount === 0 && custCount === 0 && bkCount === 0) {
          setValidationError('ไม่พบโครงสร้างข้อมูลสำรองระบบในไฟล์ (ต้องมีอย่างน้อย tours, suppliers, customers หรือ bookings)');
          return;
        }

        setParsedData(bundle);
        setValidationSuccessInfo(
          `ตรวจพบข้อมูลสำรองครบชุด: 🏝️ ทัวร์ ${tourCount} รายการ • 🏢 ซัพพลายเออร์ ${supCount} บริษัท • 👥 ลูกค้า ${custCount} ราย • 🛍️ บุ๊คกิ้ง ${bkCount} รายการ • ⭐ รีวิว ${revCount} รายการ`
        );
      } else if (activeSection === 'suppliers') {
        const list = Array.isArray(parsed) ? parsed : (parsed.suppliers && Array.isArray(parsed.suppliers) ? parsed.suppliers : null);
        if (!list || list.length === 0) {
          setValidationError('ข้อมูล JSON ต้องเป็น Array ของซัพพลายเออร์ เช่น [{"id": "sup-1", "name": "..."}] หรือมีคีย์ "suppliers"');
          return;
        }
        setParsedData(list);
        setValidationSuccessInfo(`ตรวจพบข้อมูลซัพพลายเออร์ & เอเยนต์ ${list.length} บริษัท พร้อมนำเข้า!`);
      } else if (activeSection === 'customers') {
        const list = Array.isArray(parsed) ? parsed : (parsed.customers && Array.isArray(parsed.customers) ? parsed.customers : null);
        if (!list || list.length === 0) {
          setValidationError('ข้อมูล JSON ต้องเป็น Array ของลูกค้า เช่น [{"id": "cust-1", "name": "..."}] หรือมีคีย์ "customers"');
          return;
        }
        setParsedData(list);
        setValidationSuccessInfo(`ตรวจพบข้อมูลลูกค้าในระบบ CRM ${list.length} ราย พร้อมนำเข้า!`);
      } else if (activeSection === 'bookings') {
        const list = Array.isArray(parsed) ? parsed : (parsed.bookings && Array.isArray(parsed.bookings) ? parsed.bookings : null);
        if (!list || list.length === 0) {
          setValidationError('ข้อมูล JSON ต้องเป็น Array ของคำสั่งซื้อ เช่น [{"id": "bk-1", "bookingRef": "..."}] หรือมีคีย์ "bookings"');
          return;
        }
        setParsedData(list);
        setValidationSuccessInfo(`ตรวจพบข้อมูลคำสั่งซื้อ & บุ๊คกิ้ง ${list.length} รายการ พร้อมนำเข้า!`);
      } else {
        // tours
        const list = Array.isArray(parsed) ? parsed : (parsed.tours && Array.isArray(parsed.tours) ? parsed.tours : null);
        if (!list || list.length === 0) {
          setValidationError('ข้อมูล JSON ต้องเป็น Array ของโปรแกรมทัวร์ เช่น [{"id": "tour-1", "title": {...}}] หรือมีคีย์ "tours"');
          return;
        }
        setParsedData(list);
        setValidationSuccessInfo(`ตรวจพบข้อมูลโปรแกรมทัวร์ ${list.length} รายการ พร้อมนำเข้า!`);
      }
    } catch (err: any) {
      setValidationError(`รูปแบบ JSON ผิดพลาด: ${err.message || 'JSON Parse Error'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      validateImportJson(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!parsedData) return;
    setIsExecuting(true);
    try {
      if (activeSection === 'all') {
        if (onRestoreFullBackup) {
          await onRestoreFullBackup(parsedData);
        }
      } else if (activeSection === 'suppliers') {
        let finalSuppliers: Supplier[] = [];
        const sanitized: Supplier[] = parsedData.map((s: any, idx: number) => ({
          ...s,
          id: s.id || `sup-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: s.name || 'ซัพพลายเออร์',
          code: s.code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
          isActive: s.isActive !== false
        }));

        if (importMode === 'replace') {
          finalSuppliers = sanitized;
        } else {
          const merged = [...suppliers];
          sanitized.forEach(item => {
            const idx = merged.findIndex(s => s.id === item.id || (s.code && s.code === item.code));
            if (idx !== -1) merged[idx] = { ...merged[idx], ...item };
            else merged.push(item);
          });
          finalSuppliers = merged;
        }

        if (onSaveAllSuppliers) {
          await onSaveAllSuppliers(finalSuppliers);
        }
      } else if (activeSection === 'customers') {
        let finalCustomers: Customer[] = [];
        const sanitized: Customer[] = parsedData.map((c: any, idx: number) => ({
          ...c,
          id: c.id || `cust-${Date.now()}-${idx}`,
          name: c.name || 'ลูกค้า',
          phone: c.phone || '',
          email: c.email || '',
          totalBookings: Number(c.totalBookings) || 1,
          totalSpent: Number(c.totalSpent) || 0
        }));

        if (importMode === 'replace') {
          finalCustomers = sanitized;
        } else {
          const merged = [...customers];
          sanitized.forEach(item => {
            const idx = merged.findIndex(c => c.id === item.id || (c.phone && c.phone === item.phone));
            if (idx !== -1) merged[idx] = { ...merged[idx], ...item };
            else merged.push(item);
          });
          finalCustomers = merged;
        }

        if (onSaveAllCustomers) {
          await onSaveAllCustomers(finalCustomers);
        }
      } else if (activeSection === 'bookings') {
        let finalBookings: Booking[] = [];
        const sanitized: Booking[] = parsedData.map((b: any, idx: number) => ({
          ...b,
          id: b.id || `bk-${Date.now()}-${idx}`,
          bookingRef: b.bookingRef || `TST-${Date.now().toString().slice(-6)}`,
          totalAmount: Number(b.totalAmount) || 0,
          customerName: b.customerName || 'ลูกค้า'
        }));

        if (importMode === 'replace') {
          finalBookings = sanitized;
        } else {
          const merged = [...bookings];
          sanitized.forEach(item => {
            const idx = merged.findIndex(b => b.id === item.id || b.bookingRef === item.bookingRef);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...item };
            else merged.push(item);
          });
          finalBookings = merged;
        }

        if (onSaveAllBookings) {
          await onSaveAllBookings(finalBookings);
        }
      } else {
        // tours
        const sanitizedTours = (parsedData as any[]).map((t, idx) => ({
          ...t,
          id: t.id || `tour-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          slug: t.slug || t.id || `tour-${Date.now()}-${idx}`
        }));

        let finalTours: Tour[] = [];
        if (importMode === 'replace') {
          finalTours = normalizeTours(sanitizedTours);
        } else {
          const mergedList = [...tours];
          sanitizedTours.forEach(imported => {
            const existingIdx = mergedList.findIndex(t => t.id === imported.id || (t.title?.TH && t.title.TH === imported.title?.TH));
            if (existingIdx !== -1) {
              mergedList[existingIdx] = { ...mergedList[existingIdx], ...imported } as Tour;
            } else {
              mergedList.push(imported as Tour);
            }
          });
          finalTours = normalizeTours(mergedList);
        }

        if (onSaveAllTours) {
          await onSaveAllTours(finalTours);
        }
      }

      onClose();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Import execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!onResetToursToDefault) return;
    setIsExecuting(true);
    try {
      await onResetToursToDefault();
      setIsConfirmResetOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  const sectionOptions: Array<{ id: BackupTargetSection; label: string; icon: any; count: number; badgeColor: string }> = [
    { id: 'all', label: 'ทั้งระบบ (All-in-One)', icon: Database, count: tours.length + suppliers.length + customers.length + bookings.length, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { id: 'suppliers', label: 'ซัพพลายเออร์ & เอเยนต์', icon: Building2, count: suppliers.length, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { id: 'customers', label: 'ฐานข้อมูลลูกค้า CRM', icon: Users, count: customers.length, badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { id: 'bookings', label: 'คำสั่งซื้อ & บุ๊คกิ้ง', icon: ShoppingBag, count: bookings.length, badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    { id: 'tours', label: 'โปรแกรมทัวร์', icon: Ship, count: tours.length, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' }
  ];

  const currentSectionMeta = sectionOptions.find(s => s.id === activeSection) || sectionOptions[0];

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-4xl w-full rounded-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
              <Database className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                  <span>ศูนย์สำรอง & กู้คืนข้อมูล JSON (Universal Backup Center)</span>
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 hidden sm:inline">
                  กันข้อมูลหาย 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ส่งออก (Export) เก็บเป็นไฟล์ JSON ไว้ในคอมพิวเตอร์ และนำเข้า (Import) กู้คืนได้ทันทีทุกเมื่อ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
          {sectionOptions.map(sec => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveSection(sec.id);
                  setImportJsonText('');
                  setParsedData(null);
                  setValidationError(null);
                  setValidationSuccessInfo(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 ring-2 ring-teal-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-teal-400'}`} />
                <span>{sec.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  isSelected ? 'bg-slate-900/30 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
                }`}>
                  {sec.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Selector (Export vs Import vs Reset) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>ดาวน์โหลดสำรอง (Export JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>นำเข้า / กู้คืน (Import JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('google_sheets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'google_sheets'
                  ? 'bg-slate-800 text-emerald-300 border border-emerald-500/50 shadow-sm font-black'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>📊 ซิงค์ตรงกับ Google Sheets (Google Drive)</span>
            </button>


            {activeSection === 'tours' && (
              <button
                type="button"
                onClick={() => setActiveTab('reset')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reset'
                    ? 'bg-slate-800 text-rose-300 border border-rose-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                <span>คืนค่าเริ่มต้น</span>
              </button>
            )}
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${currentSectionMeta.badgeColor} hidden sm:inline`}>
            หมวด: {currentSectionMeta.label} ({currentSectionMeta.count} รายการ)
          </span>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* TAB 1: EXPORT JSON */}
          {activeTab === 'export' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold text-white flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-teal-400" />
                    <span>ไฟล์สำรอง: <strong className="font-mono text-teal-300">{getExportFileName()}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {activeSection === 'all'
                      ? 'รวมข้อมูลทุกส่วน: ทัวร์, ซัพพลายเออร์, ลูกค้า CRM, ออเดอร์การจอง, รีวิว และการตั้งค่าระบบ'
                      : `สำรองเฉพาะข้อมูลในหมวด ${currentSectionMeta.label} (${currentSectionMeta.count} รายการ)`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{isCopied ? 'คัดลอกสำเร็จ!' : 'คัดลอก JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 active:scale-95"
                    title="ดาวน์โหลดเป็นไฟล์ตาราง CSV สามารถเปิดใน Google Sheets หรือ Microsoft Excel ได้ทันที"
                  >
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>📊 ส่งออกตาราง CSV (Google Sheets / Excel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-950/50 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์ JSON (.json)</span>
                  </button>

                </div>
              </div>

              {/* JSON Live Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400 font-bold">
                  <span>ตัวอย่างโครงสร้าง JSON (Preview):</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ขนาดประมาณ {Math.round(JSON.stringify(getExportData()).length / 1024)} KB
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 max-h-64 overflow-y-auto font-mono text-[11px] text-teal-300/90 leading-relaxed">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(getExportData(), null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE JSON */}
          {activeTab === 'import' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-200/90 leading-relaxed">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>นำเข้าข้อมูลหมวด: {currentSectionMeta.label}</span>
                </div>
                เลือกไฟล์ JSON จากคอมพิวเตอร์ หรือวางข้อความ JSON ในช่องด้านล่างเพื่อกู้คืนข้อมูล
              </div>

              {/* File Upload Box */}
              <div>
                <label className="border-2 border-dashed border-slate-700 hover:border-teal-500/80 rounded-2xl p-4 bg-slate-950/60 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                  <FileJson className="w-8 h-8 text-teal-400" />
                  <span className="font-bold text-xs text-slate-200">คลิกเพื่อเลือกไฟล์สำรอง JSON จากเครื่อง</span>
                  <span className="text-[10px] text-slate-400">รองรับไฟล์ .json (เช่น {getExportFileName()})</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste JSON Text Area */}
              <div>
                <label className="font-bold text-xs text-slate-300 block mb-1.5">
                  หรือ วางข้อความโค้ด JSON โดยตรง:
                </label>
                <textarea
                  rows={5}
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    validateImportJson(e.target.value);
                  }}
                  placeholder={`วางโค้ด JSON ของ ${currentSectionMeta.label} ที่นี่...`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Error Box */}
              {validationError && (
                <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-xs">ไม่สามารถอ่านไฟล์ได้</strong>
                    <span className="text-[11px]">{validationError}</span>
                  </div>
                </div>
              )}

              {/* Validation Success Box */}
              {validationSuccessInfo && parsedData && (
                <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="font-bold text-xs sm:text-sm">
                      {validationSuccessInfo}
                    </span>
                  </div>

                  {/* Mode Selector for non-all sections */}
                  {activeSection !== 'all' && (
                    <div className="space-y-1.5 pt-2 border-t border-emerald-800/40">
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
                            <span className="text-[10px] text-slate-400">ใช้ข้อมูลจากไฟล์นี้แทนที่ของเดิมทั้งหมด</span>
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
                            <span className="text-[10px] text-slate-400">อัปเดตตัวที่ตรงกัน และเพิ่มรายการใหม่ต่อท้าย</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Submit Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isExecuting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Save className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                    <span>
                      {isExecuting ? 'กำลังนำเข้าและบันทึกข้อมูล...' : `ยืนยันนำเข้าและบันทึก ${currentSectionMeta.label}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GOOGLE SHEETS DIRECT SYNC */}
          {activeTab === 'google_sheets' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border border-emerald-500/40 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>สำรองข้อมูลตรงไปยัง Google Sheets (Google Drive)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        100% Real Google Workspace API
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      ระบบจะสร้างไฟล์สเปรดชีตใหม่บน Google Drive ของคุณอัตโนมัติ โดยแยกเป็น 4 แท็บข้อมูลภาษาไทย (คำสั่งซื้อ, ลูกค้า CRM, เอเยนต์, โปรแกรมทัวร์)
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Authentication Box */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-300">สถานะการเข้าสู่ระบบ Google Account:</span>
                  {googleUser ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>เชื่อมต่อแล้ว: {googleUser.email || googleUser.displayName || 'Google Account'}</span>
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold">
                      ยังไม่ได้เข้าสู่ระบบ
                    </span>
                  )}
                </div>

                {!googleUser ? (
                  <div className="text-center space-y-3 py-2">
                    <p className="text-xs text-slate-400">
                      กรุณาเข้าสู่ระบบด้วย Google เพื่อมอบสิทธิ์ให้ระบบสร้างสเปรดชีตใหม่ใน Google Drive
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingInGoogle}
                      className="inline-flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>{isLoggingInGoogle ? 'กำลังเข้าสู่ระบบ Google...' : 'เข้าสู่ระบบด้วย Google (Sign in with Google)'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        {googleUser.photoURL ? (
                          <img src={googleUser.photoURL} alt="Google Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                            G
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white text-xs block">{googleUser.displayName || 'Google Account'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{googleUser.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutGoogle();
                            setGoogleUser(null);
                            setGoogleToken(null);
                            setTimeout(() => {
                              handleGoogleLogin();
                            }, 100);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>🔄 สลับ / เปลี่ยนบัญชี Google</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutGoogle();
                            setGoogleUser(null);
                            setGoogleToken(null);
                          }}
                          className="text-[11px] text-rose-400 hover:underline font-bold ml-1"
                        >
                          ออกจากระบบ
                        </button>
                      </div>
                    </div>

                    {/* Real-time Sync Status Card */}
                    <div className="bg-slate-900/90 border border-emerald-500/40 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${realtimeSyncInfo.isRealtimeSyncEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${realtimeSyncInfo.isRealtimeSyncEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          </span>
                          <span className="font-extrabold text-xs text-white">⚡ ระบบซิงค์ข้อมูลเรียลไทม์ (Real-time Google Sheets Auto-Sync)</span>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={realtimeSyncInfo.isRealtimeSyncEnabled}
                            onChange={(e) => handleToggleRealtimeSync(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          <span className="ml-2 text-[11px] font-bold text-slate-300">
                            {realtimeSyncInfo.isRealtimeSyncEnabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}
                          </span>
                        </label>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {realtimeSyncInfo.isRealtimeSyncEnabled
                          ? '🟢 ทุกครั้งที่มีลูกค้ารายใหม่สั่งจองทัวร์ ระบบจะนำข้อมูลเข้าตารางใน Google Sheets บน Google Drive ของคุณทันทีโดยอัตโนมัติ'
                          : '⚪ ระบบซิงค์เรียลไทม์ปิดอยู่ สามารถเปิดสวิตช์เพื่อเริ่มซิงค์ออเดอร์ใหม่อัตโนมัติได้ทุกเมื่อ'}
                      </p>

                      {realtimeSyncInfo.spreadsheetUrl && (
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800/80 mt-1">
                          <a
                            href={realtimeSyncInfo.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline font-bold"
                          >
                            <span>🔗 เปิดสเปรดชีต Realtime ที่กำลังซิงค์อยู่ (Google Sheets)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('คุณต้องการยกเลิกการเชื่อมโยงสเปรดชีตนี้หรือไม่? (ไฟล์เดิมบน Google Drive จะยังคงอยู่ แต่ระบบจะไม่ซิงค์ไปยังไฟล์นี้อีกต่อไป)')) {
                                setActiveSpreadsheetInfo(null, null, false);
                                setRealtimeSyncInfo(getActiveSpreadsheetInfo());
                              }
                            }}
                            className="text-[11px] text-slate-400 hover:text-rose-400 transition underline cursor-pointer"
                          >
                            ยกเลิกการเชื่อมโยงไฟล์นี้
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncToGoogleSheets}
                      disabled={isSyncingSheets}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Sparkles className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                      <span>{isSyncingSheets ? 'กำลังสร้างและส่งออกข้อมูลไปยัง Google Sheets...' : '🚀 สร้างไฟล์ Google Sheets Realtime ใหม่บน Google Drive'}</span>
                    </button>
                  </div>
                )}

                {sheetsError && (
                  <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3.5 rounded-xl flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{sheetsError}</span>
                  </div>
                )}

                {isUnauthorizedDomain && (
                  <div className="bg-amber-950/60 border-2 border-amber-500/60 text-amber-200 p-4 sm:p-5 rounded-2xl space-y-3.5 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>วิธีแก้: เพิ่มชื่อโดเมนใน Firebase Console (ใช้เวลาเพียง 30 วินาที)</span>
                        </h5>
                        <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                          เนื่องจาก Firebase มีระบบความปลอดภัยสูง จึงต้องระบุชื่อโดเมนของเว็บไซต์นี้ลงในรายการ <strong>Authorized domains</strong> ก่อน Google จึงจะอนุญาตให้เข้าสู่ระบบได้
                        </p>
                      </div>
                    </div>

                    {/* Current Domain Box with Copy Button */}
                    <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">โดเมนที่ต้องเพิ่ม:</span>
                        <code className="text-xs font-mono font-bold bg-slate-950 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/40 select-all">
                          {currentHostname}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator?.clipboard) {
                            navigator.clipboard.writeText(currentHostname);
                            setCopiedDomain(true);
                            setTimeout(() => setCopiedDomain(false), 3000);
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                      >
                        {copiedDomain ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5 text-slate-950" />}
                        <span>{copiedDomain ? 'คัดลอกโดเมนแล้ว!' : 'คัดลอกชื่อโดเมน'}</span>
                      </button>
                    </div>

                    {/* Step by step */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                      <div className="font-bold text-white text-xs mb-1">ขั้นตอนการตั้งค่า (ทำเพียงครั้งเดียว):</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                        <li>
                          เปิดไปที่{' '}
                          <a
                            href="https://console.firebase.google.com/project/gen-lang-client-0325240090/authentication/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline font-bold inline-flex items-center gap-1"
                          >
                            <span>Firebase Console ➔ Authentication ➔ Settings</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </li>
                        <li>
                          เลื่อนลงมาที่หัวข้อ <strong>"Authorized domains" (โดเมนที่ได้รับอนุญาต)</strong> แล้วคลิก <strong>"Add domain"</strong>
                        </li>
                        <li>
                          วางโดเมน <code className="text-amber-300 font-mono font-bold">{currentHostname}</code> (และแนะนำเพิ่ม <code className="text-amber-300 font-mono font-bold">vercel.app</code> ไว้ด้วย) แล้วกด <strong>Save (บันทึก)</strong>
                        </li>
                        <li>
                          กลับมาที่หน้านี้แล้วกดปุ่ม <strong>"เข้าสู่ระบบด้วย Google"</strong> ใหม่อีกครั้ง
                        </li>
                      </ol>
                    </div>

                    {/* Quick Alternatives */}
                    <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('export')}
                        className="w-full sm:w-auto flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition border border-slate-700 text-center cursor-pointer"
                      >
                        📥 หรือใช้ดาวน์โหลดสำรอง JSON (ทำได้ทันที ไม่ต้องตั้งค่า)
                      </button>
                    </div>
                  </div>
                )}

                {isAccessDeniedTestUser && (
                  <div className="bg-amber-950/70 border-2 border-amber-500/70 text-amber-200 p-4 sm:p-5 rounded-2xl space-y-3.5 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shrink-0">
                        <ShieldCheck className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>วิธีแก้: การเข้าถึงถูกบล็อก 403: access_denied (แอปอยู่ระหว่างการทดสอบ)</span>
                        </h5>
                        <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                          Google บล็อกการเข้าถึงเนื่องจากโปรเจกต์ Google Cloud อยู่ในโหมด <strong>Testing (การทดสอบ)</strong> ซึ่งอนุญาตเฉพาะอีเมลที่อยู่ในรายชื่อ <strong>Test users (ผู้ใช้ทดสอบ)</strong> เท่านั้น
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3">
                      <div>
                        <strong className="text-emerald-400 block mb-1">✅ วิธีที่ 1 (เร็วที่สุด - 20 วินาที): เพิ่มอีเมลเป็น Test User</strong>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1">
                          <li>
                            คลิกเปิด{' '}
                            <a
                              href="https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0325240090"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>Google Cloud Console ➔ OAuth consent screen</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </li>
                          <li>เลื่อนลงมาที่หัวข้อ <strong>"Test users (ผู้ใช้ทดสอบ)"</strong> ➔ กดปุ่ม <strong>"+ ADD USERS"</strong></li>
                          <li>ใส่อีเมลที่คุณต้องการใช้ (เช่น <code className="text-amber-300 font-mono font-bold">tripseatourphuket@gmail.com</code>) ➔ กด <strong>SAVE</strong></li>
                          <li>กลับมากดปุ่ม <strong>"เข้าสู่ระบบด้วย Google"</strong> ใหม่อีกครั้ง จะเข้าสู่ระบบได้ทันที!</li>
                        </ol>
                      </div>

                      <div className="border-t border-slate-800 pt-2.5">
                        <strong className="text-teal-400 block mb-1">🌐 วิธีที่ 2: เผยแพร่แอป (Publish App)</strong>
                        <p className="text-slate-300 leading-relaxed">
                          ในหน้า Google Cloud Console เดียวกัน ตรงหัวข้อ <strong>Publishing status</strong> กดปุ่ม <strong>"PUBLISH APP"</strong> เพื่อให้อีเมลใดๆ ก็ตามสามารถเข้าสู่ระบบและสร้างชีตได้ทันที
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('export')}
                        className="w-full sm:w-auto flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition border border-slate-700 text-center cursor-pointer"
                      >
                        📥 หรือใช้ดาวน์โหลดสำรอง JSON / CSV (ทำได้ทันที ไม่ต้องตั้งค่า)
                      </button>
                    </div>
                  </div>
                )}

                {sheetsResult && (
                  <div className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 p-4 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>สร้างและส่งออกไฟล์ Google Sheets สำเร็จเรียบร้อยแล้ว! ({sheetsResult.createdTime})</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      ข้อมูลคำสั่งซื้อ, ลูกค้า CRM, ซัพพลายเออร์ และโปรแกรมทัวร์ ถูกส่งออกไปยัง Google Drive ของคุณเรียบร้อยแล้ว
                    </p>

                    <a
                      href={sheetsResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-md transition"
                    >
                      <span>🔗 คลิกที่นี่เพื่อเปิดดูสเปรดชีตใน Google Sheets</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RESET TO DEFAULT (For tours) */}

          {activeTab === 'reset' && activeSection === 'tours' && (
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
                  onClick={() => setIsConfirmResetOpen(true)}
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
            <span>ซิงค์ตรงกับฐานข้อมูล Supabase และ Local Storage ปลอดภัย 100%</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
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
                onClick={() => setIsConfirmResetOpen(false)}
                disabled={isExecuting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isExecuting}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                <span>{isExecuting ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ต'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
