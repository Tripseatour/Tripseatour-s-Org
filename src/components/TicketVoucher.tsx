import React, { useRef, useState, useEffect } from 'react';
import { Download, CheckCircle2, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
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

  // Auto-capture high-res voucher image upon mount and cache to server
  useEffect(() => {
    let isMounted = true;
    const captureAndCache = async () => {
      if (!ticketRef.current || !booking.bookingRef) return;
      try {
        await new Promise(r => setTimeout(r, 400));
        if (!ticketRef.current || !isMounted) return;

        const dataUrl = await toPng(ticketRef.current, {
          quality: 0.98,
          pixelRatio: 2,
          width: 920,
          height: 650,
          canvasWidth: 1840,
          canvasHeight: 1300,
          backgroundColor: '#ffffff',
        });

        if (dataUrl && isMounted) {
          // Push to memory server cache
          fetch('/api/cache-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: `ticket_${booking.bookingRef}`,
              dataUrl,
              mimeType: 'image/png'
            })
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Auto voucher capture failed (non-blocking):', e);
      }
    };

    captureAndCache();
    return () => { isMounted = false; };
  }, [booking.bookingRef]);

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
        width: 920,
        height: 650,
        canvasWidth: 1840,
        canvasHeight: 1300,
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

  const companyPhone = settings?.contactPhone || '(+66) 97 924 1399 / (+66) 62 681 6494';
  const companyEmail = settings?.contactEmail || 'tripseatourphuket@gmail.com';
  const companyAddress = settings?.address || 'ภูเก็ต ประเทศไทย (Phuket, Thailand)';
  const companyName = settings?.companyName || 'Trip Sea Tour Phuket Co., Ltd.';

  return (
    <div className="space-y-4">
      {/* Scrollable Container Wrapper for Mobile Responsive View */}
      <div className="w-full overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-teal-200">
        <div className="min-w-[920px] flex justify-center">
          {/* Printable / Downloadable Official E-Ticket Voucher (A5 Landscape Proportions: 920px x 650px) */}
          <div
            ref={ticketRef}
            style={{ width: '920px', height: '650px' }}
            className="bg-white text-slate-900 border-4 border-double border-slate-900 p-6 shadow-2xl font-sans select-none relative flex flex-col justify-between shrink-0"
            id={`ticket-voucher-${booking.bookingRef}`}
          >
            {/* Elegant Circular Ink Stamp overlay on the right side */}
            <div className="absolute right-36 bottom-36 w-28 h-28 border-4 border-double border-emerald-600/25 rounded-full flex flex-col items-center justify-center rotate-12 pointer-events-none select-none">
              <span className="text-[9px] font-black tracking-widest text-emerald-600/25 uppercase leading-none">TRIP SEA TOUR</span>
              <span className="text-xs font-black text-emerald-600/25 my-0.5">CONFIRMED</span>
              <span className="text-[8px] font-bold text-emerald-600/25">OFFICIAL VOUCHER</span>
            </div>

            {/* Header Section */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
              <div className="flex items-center gap-4">
                {/* Logo Image */}
                <img
                  src={tripSeaLogo}
                  alt="TRIP SEA Tour Logo"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-slate-900 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[#0d3b66] tracking-tight leading-none">
                      {companyName}
                    </h2>
                    <span className="bg-amber-100 text-amber-950 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-600" />
                      ททท. {settings?.tatLicenseNo || '33/11100'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-700 font-medium mt-1">
                    {companyAddress}
                  </p>
                  <div className="flex gap-x-3 text-[10px] text-slate-600 font-bold mt-0.5">
                    <span>Tel. {companyPhone}</span>
                    {companyEmail && <span>Email: {companyEmail}</span>}
                  </div>
                </div>
              </div>

              {/* Booking Reference Banner */}
              <div className="text-right flex flex-col items-end">
                <span className="bg-slate-900 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-t-lg tracking-wider block">
                  OFFICIAL BOOKING VOUCHER
                </span>
                <span className="border-2 border-t-0 border-slate-900 bg-teal-50 px-4 py-1.5 text-lg font-black font-mono text-teal-800 rounded-b-lg leading-none shadow-sm">
                  {booking.bookingRef}
                </span>
              </div>
            </div>

            {/* Main Content Layout (Left Details Table & Right QR/Verification panel) */}
            <div className="grid grid-cols-12 gap-4 my-2 flex-1 items-stretch">
              
              {/* Left Panel - Tour Details Table (col-span-8) */}
              <div className="col-span-8 border-2 border-slate-900 rounded-lg overflow-hidden flex flex-col justify-between">
                
                {/* Tour Program Row */}
                <div className="bg-teal-900 text-white px-3 py-2 border-b-2 border-slate-900">
                  <div className="text-[9px] uppercase font-bold text-teal-300 leading-none">Tour Program (โปรแกรมทัวร์)</div>
                  <div className="text-sm font-extrabold mt-1 tracking-tight leading-snug">
                    {booking.tourTitle}
                  </div>
                </div>

                <div className="grid grid-cols-12 divide-x divide-slate-900 border-b border-slate-900 flex-1">
                  {/* Guest Name & Mobile */}
                  <div className="col-span-6 p-2 space-y-1">
                    <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Guest Name (ชื่อลูกค้า)</div>
                    <div className="text-xs font-extrabold text-slate-900 truncate">{booking.customerName}</div>
                  </div>
                  <div className="col-span-6 p-2 space-y-1">
                    <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Mobile No. (เบอร์โทร)</div>
                    <div className="text-xs font-bold font-mono text-slate-900">{booking.customerPhone}</div>
                  </div>
                </div>

                {/* Date Highlight Row */}
                <div className="grid grid-cols-12 divide-x divide-slate-900 border-b border-slate-900 bg-amber-50/50 flex-1">
                  {/* Tour Date */}
                  <div className="col-span-6 p-2 bg-rose-50/70 space-y-1">
                    <div className="text-[9px] text-rose-800 font-black uppercase leading-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping"></span>
                      TOUR DATE (วันที่เดินทาง)
                    </div>
                    <div className="text-sm font-black text-rose-600">{booking.travelDate}</div>
                  </div>
                  {/* Pick up Time */}
                  <div className="col-span-6 p-2 bg-amber-50 space-y-1">
                    <div className="text-[9px] text-amber-800 font-black uppercase leading-none">PICKUP TIME (เวลารับ)</div>
                    <div className="text-sm font-black text-amber-600">{booking.pickupTime || '07:30 - 08:00 น.'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-12 divide-x divide-slate-900 border-b border-slate-900 flex-1">
                  {/* Booking Date & Nationality */}
                  <div className="col-span-6 p-2 space-y-1">
                    <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Booking Date (วันที่จอง)</div>
                    <div className="text-xs font-semibold text-slate-800">
                      {new Date(booking.createdAt).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                  <div className="col-span-6 p-2 space-y-1">
                    <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Nationality (สัญชาติ)</div>
                    <div className="text-xs font-semibold text-slate-800">{booking.nationality || 'Thai / -'}</div>
                  </div>
                </div>

                {/* Hotel Details Row */}
                <div className="border-b border-slate-900 p-2 space-y-1 flex-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Pick up Hotel (รับโรงแรม)</div>
                  <div className="text-xs font-extrabold text-slate-900">
                    🏨 {booking.pickupHotel} {booking.roomNumber ? `(ห้อง ${booking.roomNumber})` : ''} {booking.pickupZone ? `[โซน ${booking.pickupZone}]` : ''}
                  </div>
                </div>

                {/* Return Hotel Row */}
                <div className="border-b border-slate-900 p-2 space-y-1 flex-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Send back Hotel (ส่งกลับโรงแรม)</div>
                  <div className="text-xs font-bold text-slate-800">
                    🚐 {booking.sendBackHotel || booking.pickupHotel}
                  </div>
                </div>

                {/* Remarks Row */}
                <div className="p-2 space-y-1 flex-1 bg-slate-50">
                  <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Remarks / Special Requests (หมายเหตุ)</div>
                  <div className="text-xs text-slate-700 italic font-medium">
                    {booking.specialRequests || booking.notes || '-'}
                  </div>
                </div>

              </div>

              {/* Right Panel - Status, Pax Summary, and Boarding Notice (col-span-4) */}
              <div className="col-span-4 border-2 border-slate-900 rounded-lg p-3 bg-slate-50/60 flex flex-col justify-between items-center text-center space-y-2">
                
                {/* Official Status Banner */}
                <div className="w-full bg-teal-900 text-white py-2 px-3 rounded-lg border border-slate-900 shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 text-teal-300 text-[10px] font-black tracking-widest uppercase">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>BOOKING STATUS</span>
                  </div>
                  <div className="text-sm font-black text-emerald-300 mt-0.5 tracking-wide">
                    CONFIRMED (ยืนยันสิทธิ์แล้ว)
                  </div>
                </div>

                {/* Passenger Counts (PAX Summary) */}
                <div className="w-full bg-white border-2 border-slate-900 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                  <div className="text-[10px] text-slate-800 uppercase font-black tracking-wide border-b border-slate-200 pb-1">
                    PAX SUMMARY (จำนวนผู้เดินทาง)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-800 text-center">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="text-[9px] text-slate-500 block font-bold">ผู้ใหญ่ (Adult)</span>
                      <span className="text-base font-black text-teal-900 font-mono">{booking.adults} ท่าน</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="text-[9px] text-slate-500 block font-bold">เด็ก (Child)</span>
                      <span className="text-base font-black text-teal-900 font-mono">{booking.children || 0} ท่าน</span>
                    </div>
                    {booking.infants > 0 && (
                      <div className="col-span-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-[9px] text-slate-500 block font-bold">ทารก (Infant)</span>
                        <span className="text-sm font-black text-teal-900 font-mono">{booking.infants} ท่าน</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-teal-50 p-1.5 rounded border border-teal-300 text-center">
                    <span className="text-[10px] text-teal-900 font-bold">
                      ผู้เดินทางรวม: <span className="text-sm font-black font-mono text-teal-800">{booking.adults + (booking.children || 0) + (booking.infants || 0)}</span> ท่าน
                    </span>
                  </div>
                </div>

                {/* Boarding Notice & Hotline */}
                <div className="w-full bg-amber-50/90 border border-amber-300 rounded-lg p-2 text-center space-y-1">
                  <div className="text-[9.5px] font-black text-amber-900 leading-tight">
                    📌 แสดงตั๋วนี้แก่คนขับรถ / ไกด์ในวันเดินทาง
                  </div>
                  <div className="text-[8px] text-slate-600 font-medium leading-snug">
                    Please present this official E-Ticket voucher to the driver or tour guide upon boarding.
                  </div>
                  <div className="text-[8.5px] font-bold text-slate-700 pt-1 border-t border-amber-200">
                    📞 Hotline: {companyPhone}
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Section: Multi-Lingual Cautions */}
            <div className="border-t border-slate-300 pt-1.5 grid grid-cols-3 gap-2.5 text-[7.5px] leading-[1.1] text-slate-800">
              {/* THAI Cautions */}
              <div className="text-rose-700 font-bold space-y-0.5 pr-2 border-r border-slate-200">
                <p>1. โปรดรอที่ล็อบบี้ตรงเวลานัด คนขับรถตู้จะรอสูงสุดเพียง 5 นาที หากล่าช้าจะถือว่าสละสิทธิ์และไม่คืนเงินทุกกรณี</p>
                <p>2. สตรีมีครรภ์ ผู้ป่วยโรคหัวใจ โรคกระดูกสันหลัง หรือความดันโลหิตสูง ห้ามเดินทางออกทะเลเพื่อความปลอดภัย</p>
                <p>3. หากไม่พบรถรับภายใน 20 นาที หรือต้องการความช่วยเหลือด่วน กรุณาโทรติดต่อ {companyPhone}</p>
              </div>

              {/* CHINESE Cautions */}
              <div className="text-slate-700 font-medium space-y-0.5 pr-2 border-r border-slate-200">
                <p className="font-extrabold text-slate-900 leading-none">重要提醒 :</p>
                <p>1. 请准时在酒店大堂等候。司机最多等5分钟，逾期视为自动放弃，恕不予退款。</p>
                <p>2. 孕妇、患有心脏病、严重高血压及脊椎疾病患者禁止乘船出海，隐瞒行程风险自负。</p>
                <p>3. 若超过预定时间20分钟未见司机，请立即拨打客服热线: {companyPhone}</p>
              </div>

              {/* ENGLISH Cautions */}
              <div className="text-slate-700 font-medium space-y-0.5">
                <p className="font-extrabold text-slate-900 leading-none">Cautions & Policy:</p>
                <p>1. Please standby at lobby on time. Driver waits max 5 mins. No refund for late show.</p>
                <p>2. Pregnant women and guests with heart, bone, or hypertension conditions are strictly prohibited on tours.</p>
                <p>3. If driver is delayed over 20 mins, contact support immediately: {companyPhone}</p>
              </div>
            </div>

            {/* Bottom Bar Wish */}
            <div className="mt-1.5 p-1 text-center bg-teal-900 text-teal-100 font-black text-[9px] tracking-widest uppercase rounded">
              HAVE A NICE TRIP - ขอให้เป็นทริปที่สนุกและปลอดภัยนะครับ/ค่ะ - 祝您旅途愉快
            </div>

          </div>
        </div>
      </div>

      {/* Action Control Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {/* Save PNG Button */}
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isDownloading}
          className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isDownloading ? (
            <span>กำลังสร้างรูปตั๋ว...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>บันทึกรูปตั๋วลงเครื่อง (A5 แนวนอน PNG)</span>
            </>
          )}
        </button>
      </div>

      {/* Status Banner */}
      {downloadSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs text-center font-bold animate-in fade-in">
          ✅ บันทึกรูปตั๋ว E-Ticket ขนาด A5 แนวนอนลงเครื่องเรียบร้อยแล้ว! (E-Ticket-{booking.bookingRef}.png)
        </div>
      )}
    </div>
  );
};
