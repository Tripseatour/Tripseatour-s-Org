import React, { useState } from 'react';
import { 
  X, Search, Ticket, CheckCircle2, Clock, MapPin, 
  Calendar, AlertCircle, Sparkles, Layers, 
  User, Phone, ChevronRight, Download, RefreshCw
} from 'lucide-react';
import { Booking, Language, AppSettings } from '../types';
import { translations } from '../data/translations';
import { TicketVoucher } from './TicketVoucher';

interface BookingLookupModalProps {
  currentLang: Language;
  onClose: () => void;
  bookings: Booking[];
  settings?: AppSettings;
}

export const BookingLookupModal: React.FC<BookingLookupModalProps> = ({
  currentLang,
  onClose,
  bookings,
  settings,
}) => {
  const t = translations[currentLang];
  const [searchKey, setSearchKey] = useState('');
  const [foundBookings, setFoundBookings] = useState<Booking[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'tabs' | 'all'>('tabs');
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Normalize phone / strings for flexible matching
  const normalizeText = (str: string) => {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const executeSearch = (query: string, sourceBookings: Booking[]) => {
    const rawKey = (query || '').trim().toLowerCase();
    const cleanKey = normalizeText(rawKey);

    if (!rawKey) {
      setFoundBookings([]);
      return;
    }

    const matched = sourceBookings.filter((b) => {
      const bRef = (b.bookingRef || '').toLowerCase();
      const bPhoneClean = normalizeText(b.customerPhone || '');
      const bEmail = (b.customerEmail || '').toLowerCase();
      const bName = (b.customerName || '').toLowerCase();
      const bLine = (b.customerLineId || '').toLowerCase();

      // Check phone match
      if (cleanKey.length >= 3 && bPhoneClean.includes(cleanKey)) return true;

      // Check booking reference match
      if (bRef.includes(rawKey)) return true;

      // Check email match
      if (bEmail.includes(rawKey)) return true;

      // Check name match
      if (bName.includes(rawKey)) return true;

      // Check LINE ID match
      if (bLine && bLine.includes(rawKey)) return true;

      return false;
    });

    // Sort newest travelDate / createdAt first
    matched.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.travelDate).getTime();
      const timeB = new Date(b.createdAt || b.travelDate).getTime();
      return timeB - timeA;
    });

    setFoundBookings(matched);
    setSelectedIndex(0);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKey.trim()) return;

    setIsSearching(true);
    setSearched(true);

    try {
      // 1. Fetch latest bookings directly from server to ensure newly added multi-bookings are present
      let latestBookings = bookings;
      try {
        const res = await fetch('/api/bookings', { cache: 'no-store' });
        if (res.ok) {
          const serverList: Booking[] = await res.json();
          if (Array.isArray(serverList) && serverList.length > 0) {
            latestBookings = serverList;
          }
        }
      } catch (err) {
        console.warn('Could not fetch server bookings, falling back to state bookings:', err);
      }

      // 2. Perform comprehensive multi-result search
      executeSearch(searchKey, latestBookings);
    } finally {
      setIsSearching(false);
    }
  };

  const activeBooking = foundBookings[selectedIndex] || foundBookings[0] || null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {t.checkStatus}
                </h3>
                {searched && foundBookings.length > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                    พบ {foundBookings.length} ตั๋ว
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                ค้นหาตั๋วทัวร์ E-Ticket และตรวจสอบสถานะคำสั่งจองทั้งหมดของท่าน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
              <span>ค้นหาด้วย เบอร์โทรศัพท์, รหัสอ้างอิงการจอง (TST-...), หรือ ชื่อผู้จอง</span>
              <span className="text-[10px] text-slate-400 font-normal">ระบบจะแสดงตั๋วทุกใบที่ตรงกับข้อมูล</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder="เช่น 081-123-4567 หรือ TST-202608-0101 หรือ สมชาย"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden shadow-xs"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shrink-0 shadow-md shadow-blue-200 flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังค้นหา...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>ค้นหาตั๋ว</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Search Results Area */}
          {searched && (
            <div>
              {foundBookings.length > 0 ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  
                  {/* Results Summary Header */}
                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {foundBookings.length}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-blue-950 flex items-center gap-2">
                          <span>พบรายการจองทั้งหมด {foundBookings.length} โปรแกรมทัวร์</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-blue-800 font-medium mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-blue-600" />
                            {foundBookings[0].customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-blue-600" />
                            {foundBookings[0].customerPhone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Ticket View Toggle if > 1 ticket */}
                    {foundBookings.length > 1 && (
                      <div className="flex items-center bg-white border border-blue-200 rounded-xl p-0.5 shadow-xs shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setViewMode('tabs')}
                          className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                            viewMode === 'tabs'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ดูทีละตั๋ว (Tab View)
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('all')}
                          className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                            viewMode === 'all'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ดูทั้งหมด ({foundBookings.length})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multi-Ticket Tabs Switcher (when in Tab Mode and multiple tickets found) */}
                  {foundBookings.length > 1 && viewMode === 'tabs' && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600 px-1">
                        เลือกโปรแกรมทัวร์เพื่อเปิดดู E-Ticket Voucher:
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {foundBookings.map((b, idx) => {
                          const isSelected = selectedIndex === idx;
                          return (
                            <button
                              key={b.id || b.bookingRef || idx}
                              type="button"
                              onClick={() => setSelectedIndex(idx)}
                              className={`flex-1 min-w-[200px] max-w-[280px] text-left p-2.5 rounded-xl border transition shrink-0 ${
                                isSelected
                                  ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  ตั๋วที่ {idx + 1}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                  {b.bookingRef}
                                </span>
                              </div>
                              <div className="text-xs font-extrabold text-slate-900 truncate">
                                {b.tourTitle}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-medium">
                                <Calendar className="w-3 h-3 text-teal-600" />
                                <span>{b.travelDate}</span>
                                <span>•</span>
                                <span>{b.adults + b.children} ท่าน</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vouchers Display */}
                  {viewMode === 'tabs' ? (
                    activeBooking && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Ticket className="w-4 h-4 text-teal-600" />
                            <span>E-Ticket Voucher: {activeBooking.tourTitle}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {activeBooking.bookingRef}
                          </span>
                        </div>
                        <TicketVoucher booking={activeBooking} settings={settings} />
                      </div>
                    )
                  ) : (
                    /* All Vouchers View */
                    <div className="space-y-8 pt-2">
                      {foundBookings.map((booking, idx) => (
                        <div 
                          key={booking.id || booking.bookingRef || idx}
                          className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="bg-teal-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                                รายการที่ {idx + 1}/{foundBookings.length}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900">
                                {booking.tourTitle}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded">
                              {booking.bookingRef}
                            </span>
                          </div>
                          <TicketVoucher booking={booking} settings={settings} />
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ) : (
                /* Not Found State */
                <div className="text-center py-10 px-4 bg-slate-50 rounded-3xl border border-slate-200 space-y-3 animate-in fade-in duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">
                      ไม่พบข้อมูลการจองในระบบ
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      ไม่พบรายการที่ตรงกับ "{searchKey}" โปรดตรวจสอบเบอร์โทรศัพท์ที่ใช้จอง หรือ รหัสอ้างอิง TST-... อีกครั้ง
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600 font-medium">
                    <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg">
                      💡 คำแนะนำ: ลองพิมพ์เฉพาะตัวเลขเบอร์โทร เช่น 0812345678
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            หากต้องการสอบถามเพิ่มเติม โทร <span className="font-bold text-slate-700">097-924-1399 / 062-681-6494</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
