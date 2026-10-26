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
  ArrowRight
} from 'lucide-react';
import { Tour, Supplier, Customer, Booking, Review, AppSettings } from '../types';
import { normalizeTours } from '../utils/tourNormalizer';

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
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccessInfo, setValidationSuccessInfo] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

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

          {/* TAB 3: RESET TO DEFAULT (For tours) */}
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
