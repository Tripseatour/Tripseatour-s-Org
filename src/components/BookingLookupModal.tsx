import React, { useState } from 'react';
import { X, Search, Ticket, CheckCircle2, Clock, MapPin, Upload, FileText, AlertCircle } from 'lucide-react';
import { Booking, Language } from '../types';
import { translations } from '../data/translations';
import { TicketVoucher } from './TicketVoucher';

interface BookingLookupModalProps {
  currentLang: Language;
  onClose: () => void;
  bookings: Booking[];
}

export const BookingLookupModal: React.FC<BookingLookupModalProps> = ({
  currentLang,
  onClose,
  bookings,
}) => {
  const t = translations[currentLang];
  const [searchKey, setSearchKey] = useState('');
  const [foundBooking, setFoundBooking] = useState<Booking | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const keyClean = searchKey.trim().toLowerCase();
    const result = bookings.find(
      b => b.bookingRef.toLowerCase() === keyClean || b.customerPhone.includes(keyClean) || b.customerEmail.toLowerCase() === keyClean
    );
    setFoundBooking(result || null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white text-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-base">{t.checkStatus}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              กรอกรหัสอ้างอิงการจอง (เช่น TST-202608-0101) หรือ เบอร์โทรศัพท์
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="TST-202608-0101 หรือ 0819876543"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0 shadow-md shadow-blue-200"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {searched && (
            <div>
              {foundBooking ? (
                <div className="space-y-3 animate-in fade-in">
                  <TicketVoucher booking={foundBooking} />
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">ไม่พบข้อมูลการจองในระบบ</p>
                  <p className="text-[11px] mt-1">โปรดตรวจสอบรหัสการจองหรือเบอร์โทรศัพท์อีกครั้ง</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
