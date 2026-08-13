import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Booking, AppSettings } from '../types';
import tripSeaLogo from '../assets/images/trip_sea_tour_logo_1786613886795.jpg';

interface TicketVoucherProps {
  booking: Booking;
  settings?: AppSettings;
}

export const TicketVoucher: React.FC<TicketVoucherProps> = ({
  booking,
  settings,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Download ticket as high-quality PNG image
  const handleDownloadPng = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      await new Promise(r => setTimeout(r, 200));

      const dataUrl = await toPng(ticketRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `E-Ticket-${booking.bookingRef}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate ticket image:', err);
      alert('ไม่สามารถบันทึกรูปตั๋วได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  const companyPhone = settings?.companyPhone || '(+66) 97 924 1399';
  const companyEmail = settings?.companyEmail || '';
  const companyAddress = settings?.companyAddress || '71/47 Moo.2 ,Kathu,Phuket';
  const companyName = settings?.companyName || 'Trip Sea Tour';

  return (
    <div className="space-y-4">
      {/* Printable / Downloadable Official E-Ticket Voucher (Paper Standard Layout) */}
      <div
        ref={ticketRef}
        className="bg-white text-slate-900 border-2 border-slate-900 rounded-lg p-4 sm:p-6 shadow-2xl font-sans select-none max-w-4xl mx-auto overflow-hidden text-xs"
        id={`ticket-voucher-${booking.bookingRef}`}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 mb-2">
          <div className="flex items-center gap-3">
            {/* Logo Image */}
            <img
              src={tripSeaLogo}
              alt="TRIP SEA Tour Logo"
              className="w-16 h-16 rounded-xl object-cover border-2 border-slate-900 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />

            <div>
              <h2 className="text-xl font-extrabold text-[#0d3b66] tracking-tight leading-none">
                {companyName}
              </h2>
              <p className="text-[11px] text-slate-700 font-medium mt-1">
                {companyAddress}
              </p>
              <div className="flex flex-wrap gap-x-3 text-[11px] text-slate-700 font-medium">
                <span>Tel. {companyPhone}</span>
                {companyEmail && <span>Email: {companyEmail}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Table */}
        <div className="border border-slate-900 divide-y divide-slate-900 text-slate-900">
          {/* ROW 1: Program & Booking Date */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Program(โปรแกรม):
            </div>
            <div className="col-span-3 p-2 font-bold text-slate-900 flex items-center text-sm">
              {booking.tourTitle}
            </div>
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Booking Date (วันที่จอง):
            </div>
            <div className="col-span-3 p-2 font-semibold text-slate-900 flex items-center">
              {new Date(booking.createdAt).toLocaleDateString('th-TH')}
            </div>
          </div>

          {/* ROW 2: Booking No & Pick up Time */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Booking No (เลขบุ๊คกิ้ง):
            </div>
            <div className="col-span-3 p-2 font-black text-rose-600 text-sm font-mono flex items-center">
              {booking.bookingRef}
            </div>
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Pick up Time (เวลารับ):
            </div>
            <div className="col-span-3 p-2 font-black text-rose-600 text-sm flex items-center">
              {booking.pickupTime || '07:30 - 08:00 น.'}
            </div>
          </div>

          {/* ROW 3: Tour Date & Nationality */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex flex-col justify-center">
              <span>Tour Date (วันที่ไป):</span>
              <span className="text-[10px] text-slate-500 font-normal">出发日期:</span>
            </div>
            <div className="col-span-3 p-2 font-black text-rose-600 text-sm flex items-center">
              {booking.travelDate}
            </div>
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Nation Ality(สัญชาติ):
            </div>
            <div className="col-span-3 p-2 font-semibold text-slate-900 flex items-center">
              {booking.nationality || 'Thai / -'}
            </div>
          </div>

          {/* ROW 4: Guest Name & Mobile No */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Guest Name (ชื่อลูกค้า):
            </div>
            <div className="col-span-3 p-2 font-bold text-slate-900 flex items-center">
              {booking.customerName}
            </div>
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Mobile No (เบอร์โทร):
            </div>
            <div className="col-span-3 p-2 font-mono font-bold text-slate-900 flex items-center">
              {booking.customerPhone}
            </div>
          </div>

          {/* ROW 5: PAX Passengers */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              PAX (คน):
            </div>
            <div className="col-span-9 p-2 font-bold text-slate-900 flex items-center gap-6">
              <span>Adult(ผู้ใหญ่): <strong className="text-slate-900 font-mono text-sm">{booking.adults}</strong></span>
              <span>Child (เด็ก): <strong className="text-slate-900 font-mono text-sm">{booking.children || 0}</strong></span>
              <span>Infant(ทารก): <strong className="text-slate-900 font-mono text-sm">{booking.infants || 0}</strong></span>
            </div>
          </div>

          {/* ROW 6: Pick up Hotel */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Pick up Hotel (รับโรงแรม):
            </div>
            <div className="col-span-9 p-2 font-semibold text-slate-900 flex items-center">
              {booking.pickupHotel} {booking.roomNumber ? `(ห้อง ${booking.roomNumber})` : ''} {booking.pickupZone ? `[โซน ${booking.pickupZone}]` : ''}
            </div>
          </div>

          {/* ROW 7: Send back Hotel */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Send back Hotel (ส่งกลับโรงแรม):
            </div>
            <div className="col-span-9 p-2 font-semibold text-slate-900 flex items-center">
              {booking.sendBackHotel || booking.pickupHotel}
            </div>
          </div>

          {/* ROW 8: Remark */}
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            <div className="col-span-3 p-2 bg-slate-50 font-bold text-slate-800 flex items-center">
              Remark (หมายเหตุ):
            </div>
            <div className="col-span-9 p-2 text-slate-800 flex items-center">
              {booking.notes || '-'}
            </div>
          </div>

          {/* ROW 9: Multi-Lingual Terms & Conditions */}
          <div className="p-3 space-y-2 text-[10px] leading-tight">
            {/* THAI WARNINGS */}
            <div className="text-red-600 font-bold space-y-0.5">
              <p>1. กรุณารอที่ล็อบบี้ของโรงแรมหรือสถานที่ที่กำหนดให้ตรงรถตามเวลานัดรับ คนขับรถจะรอเพียง 5 นาทีหลังจากมาถึงโรงแรม หากคุณไม่มาเนื่องจากคุณมาถึงล่าช้า พนักงานขับรถจะ ออกเดินทางทันทีและจะไม่มีการคืนเงินหรือกำหนดเวลาใหม่</p>
              <p>2. โปรดคาดเข็มขัดนิรภัยตลอดเวลาที่อยู่ในรถ ไม่เช่นนั้นคุณอาจถูกปรับอย่างหนัก</p>
              <p>3. เนื่องจากมีสถานการณ์ที่ไม่สามารถควบคุมได้บนท้องถนนหลายประการ โปรดอย่ากังวลหากคนขับมาสาย หากไม่พบคนขับภายใน 20 นาที โปรดติดต่อ {companyPhone}</p>
              <p>4. ห้ามสตรีมีครรภ์ ผู้ป่วยโรคหัวใจ ความดันโลหิตสูงขั้นรุนแรง และโรคกระดูกสันหลังเข้าร่วมทริปที่น่าตื่นเต้น เช่น เที่ยวทะเล กระโดดร่ม ล่องแก่ง หากคุณปกปิดข้อเท็จจริงที่เกี่ยวข้อง คุณจะต้องรับผิดชอบต่อผลที่ตามมา</p>
            </div>

            {/* CHINESE WARNINGS */}
            <div className="text-slate-800 font-medium space-y-0.5 border-t border-slate-200 pt-1 text-[9.5px]">
              <p className="font-bold text-slate-900">重要提醒 :</p>
              <p>1. 请按人时间准时到酒店大堂或指定地点等待，司机到后将最多等待5分钟，如果由于您的迟到没有赶上行程，司机会自行离开，且无法退款和改期。</p>
              <p>2. 在车上请务必系好安全带。</p>
              <p>3. 因为路上有各种不可控的情况，如果超过20分钟没见到司机，请联系 {companyPhone}。</p>
              <p>4. 禁止孕妇、患有心脏病、严重高血压患者参加出海、漂流等刺激行程，如隐瞒相关事实后果自负。</p>
            </div>

            {/* ENGLISH WARNINGS */}
            <div className="text-slate-800 font-medium space-y-0.5 border-t border-slate-200 pt-1 text-[9.5px]">
              <p className="font-bold text-slate-900">Cautions:</p>
              <p>1. Please stand by at hotel lobby on time. Driver will leave if you late over 5 minutes and your order will not cancel and change.</p>
              <p>2. Please fasten the seat belt during the journey on the vehicle.</p>
              <p>3. If you don't met the driver for more than 20 mins, please contact {companyPhone}.</p>
            </div>
          </div>

          {/* VOUCHER FOOTER WISH */}
          <div className="p-2 text-center bg-slate-50 font-bold text-slate-900 text-xs tracking-wider space-y-0.5">
            <div>HAVE A NICE TRIP</div>
            <div>ขอให้เป็นทริปที่สนุกนะครับ/ค่ะ</div>
            <div className="text-[11px] font-normal text-slate-700">祝您旅途愉快</div>
          </div>
        </div>
      </div>

      {/* Action Control Buttons */}
      <div className="flex items-center justify-center pt-2">
        {/* Save PNG Button */}
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isDownloading}
          className="w-full max-w-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {isDownloading ? (
            <span>กำลังบันทึกรูปตั๋ว...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>บันทึกรูปตั๋วลงเครื่อง (PNG)</span>
            </>
          )}
        </button>
      </div>

      {/* Status Banner */}
      {downloadSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs text-center font-bold animate-in fade-in">
          ✅ บันทึกรูปตั๋วลงอุปกรณ์เรียบร้อยแล้ว! (E-Ticket-{booking.bookingRef}.png)
        </div>
      )}
    </div>
  );
};
