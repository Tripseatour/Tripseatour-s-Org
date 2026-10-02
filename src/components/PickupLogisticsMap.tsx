import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Clock, Calendar, Users, Phone, Navigation,
  Search, CheckCircle2, AlertTriangle, ShieldCheck,
  Building2, Ship, Printer, ExternalLink, RefreshCw, Filter, UserCheck
} from 'lucide-react';
import { Booking, Tour } from '../types';

// Fix Leaflet Default Icon URLs for Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Known Phuket Zone & Landmark Coordinates Dictionary
export const PHUKET_ZONE_COORDS: Record<string, [number, number]> = {
  'patong': [7.8962, 98.2965],
  'ป่าตอง': [7.8962, 98.2965],
  'kata': [7.8188, 98.3001],
  'กะตะ': [7.8188, 98.3001],
  'karon': [7.8427, 98.2982],
  'กะรน': [7.8427, 98.2982],
  'kamala': [7.9519, 98.2828],
  'กมลา': [7.9519, 98.2828],
  'bangtao': [7.9902, 98.2933],
  'บางเทา': [7.9902, 98.2933],
  'laguna': [7.9980, 98.2990],
  'ลากูนา': [7.9980, 98.2990],
  'phuket town': [7.8804, 98.3923],
  'ตัวเมืองภูเก็ต': [7.8804, 98.3923],
  'เมืองภูเก็ต': [7.8804, 98.3923],
  'chalong': [7.8206, 98.3582],
  'ฉลอง': [7.8206, 98.3582],
  'rawai': [7.7781, 98.3243],
  'ราไวย์': [7.7781, 98.3243],
  'nai harn': [7.7730, 98.3050],
  'ในหาน': [7.7730, 98.3050],
  'cape panwa': [7.8080, 98.4069],
  'แหลมพันวา': [7.8080, 98.4069],
  'พันวา': [7.8080, 98.4069],
  'surin': [7.9750, 98.2800],
  'สุรินทร์': [7.9750, 98.2800],
  'naiyang': [8.0850, 98.3050],
  'ในยาง': [8.0850, 98.3050],
  'maikhao': [8.1400, 98.3000],
  'ไม้ขาว': [8.1400, 98.3000],
  'kathu': [7.9000, 98.3400],
  'กะทู้': [7.9000, 98.3400],
  'cherngtalay': [7.9800, 98.3300],
  'เชิงทะเล': [7.9800, 98.3300],
  'rassada': [7.8820, 98.4180],
  'รัษฎา': [7.8820, 98.4180]
};

export const PHUKET_HOTEL_COORDS: Record<string, [number, number]> = {
  'kee': [7.8930, 98.2970],
  'amari': [7.8860, 98.2910],
  'grand mercure': [7.8890, 98.2980],
  'duangjitt': [7.8830, 98.2950],
  'beyond': [7.8170, 98.2990],
  'novotel': [7.8500, 98.2990],
  'hyatt': [7.9380, 98.2750],
  'dusit': [7.9930, 98.2930],
  'banyan tree': [8.0050, 98.2970],
  'graceland': [7.9030, 98.2960],
  'holiday inn': [7.8880, 98.2960],
  'burasari': [7.8870, 98.2950],
  'clover': [7.8920, 98.2980],
  'crest': [7.8820, 98.2830],
  'pullman': [8.0280, 98.2780],
  'sri panwa': [7.8060, 98.4080],
};

// Helper to determine lat/lng for a booking
function resolveBookingCoords(b: Booking, index: number): [number, number] {
  const hotelLower = (b.pickupHotel || '').toLowerCase();
  const zoneLower = (b.pickupZone || '').toLowerCase();

  // 1. Try Hotel Name Match
  for (const [key, coords] of Object.entries(PHUKET_HOTEL_COORDS)) {
    if (hotelLower.includes(key)) {
      return jitterCoords(coords, index);
    }
  }

  // 2. Try Zone Name Match
  for (const [key, coords] of Object.entries(PHUKET_ZONE_COORDS)) {
    if (zoneLower.includes(key) || hotelLower.includes(key)) {
      return jitterCoords(coords, index);
    }
  }

  // Default Patong Center
  return jitterCoords([7.8962, 98.2965], index);
}

// Add a small deterministic spread so pins don't stack directly on top of each other
function jitterCoords(coords: [number, number], index: number): [number, number] {
  const offsetX = ((index * 7) % 11 - 5) * 0.0025;
  const offsetY = ((index * 13) % 11 - 5) * 0.0025;
  return [coords[0] + offsetX, coords[1] + offsetY];
}

// Custom DivIcon creator for Leaflet
function createCustomMarkerIcon(status: string, indexNumber: number, pickupTime?: string) {
  let bgColor = 'bg-emerald-500 border-emerald-300 text-white';
  let pinRing = 'ring-emerald-400/50';

  if (status === 'slip_uploaded') {
    bgColor = 'bg-amber-500 border-amber-300 text-slate-950';
    pinRing = 'ring-amber-400/50';
  } else if (status === 'pending') {
    bgColor = 'bg-sky-500 border-sky-300 text-white';
    pinRing = 'ring-sky-400/50';
  }

  const html = `
    <div class="relative group flex items-center justify-center">
      <div class="w-8 h-8 rounded-full ${bgColor} border-2 font-black text-xs flex items-center justify-center shadow-lg ring-4 ${pinRing} transform transition-transform hover:scale-125">
        ${indexNumber}
      </div>
      ${pickupTime ? `<div class="absolute -bottom-5 bg-slate-900/90 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap border border-slate-700">${pickupTime}</div>` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

// Component to dynamically adjust map bounds based on markers
function MapBoundsAdapter({ markers }: { markers: Array<{ coords: [number, number] }> }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.coords));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [markers, map]);

  return null;
}

interface PickupLogisticsMapProps {
  bookings: Booking[];
  tours: Tour[];
  onSelectBooking?: (b: Booking) => void;
}

export const PickupLogisticsMap: React.FC<PickupLogisticsMapProps> = ({
  bookings,
  tours,
  onSelectBooking
}) => {
  // Today's date in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateQuickFilter, setDateQuickFilter] = useState<'today' | 'tomorrow' | 'all' | 'custom'>('today');
  const [selectedTourId, setSelectedTourId] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  // Compute Tomorrow's date string
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter Bookings for logistics
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Date filter
      if (dateQuickFilter === 'today' && b.travelDate !== todayStr) return false;
      if (dateQuickFilter === 'tomorrow' && b.travelDate !== tomorrowStr) return false;
      if (dateQuickFilter === 'custom' && selectedDate && b.travelDate !== selectedDate) return false;

      // Tour filter
      if (selectedTourId !== 'all' && b.tourId !== selectedTourId) return false;

      // Zone filter
      if (selectedZone !== 'all' && (b.pickupZone || '').toLowerCase() !== selectedZone.toLowerCase()) return false;

      // Exclude cancelled bookings from pickup logistics
      if (b.paymentStatus === 'cancelled' || b.orderStatus === 'cancelled') return false;

      // Search Filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = b.customerName.toLowerCase().includes(q);
        const matchesHotel = (b.pickupHotel || '').toLowerCase().includes(q);
        const matchesRef = b.bookingRef.toLowerCase().includes(q);
        const matchesPhone = b.customerPhone.includes(q);
        if (!matchesName && !matchesHotel && !matchesRef && !matchesPhone) return false;
      }

      return true;
    });
  }, [bookings, dateQuickFilter, todayStr, tomorrowStr, selectedDate, selectedTourId, selectedZone, searchFilter]);

  // Map markers with geocoded coordinates
  const mappedMarkers = useMemo(() => {
    return filteredBookings.map((b, idx) => ({
      booking: b,
      index: idx + 1,
      coords: resolveBookingCoords(b, idx)
    }));
  }, [filteredBookings]);

  // Zone Breakdown Stats
  const zoneStats = useMemo(() => {
    const counts: Record<string, { count: number; pax: number }> = {};
    filteredBookings.forEach(b => {
      const zone = b.pickupZone || 'ไม่ระบุโซน (Unspecified)';
      if (!counts[zone]) counts[zone] = { count: 0, pax: 0 };
      counts[zone].count += 1;
      counts[zone].pax += (b.adults + b.children + b.infants);
    });
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  }, [filteredBookings]);

  // Total passengers sum
  const totalPaxSum = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + b.adults + b.children + b.infants, 0);
  }, [filteredBookings]);

  // Handle Quick Date Switch
  const handleDateQuickSwitch = (mode: 'today' | 'tomorrow' | 'all' | 'custom') => {
    setDateQuickFilter(mode);
    if (mode === 'today') setSelectedDate(todayStr);
    if (mode === 'tomorrow') setSelectedDate(tomorrowStr);
  };

  // Build batch Google Maps route link
  const googleMapsBatchRouteUrl = useMemo(() => {
    if (mappedMarkers.length === 0) return '#';
    const origin = encodeURIComponent('Phuket Town');
    const waypoints = mappedMarkers
      .slice(0, 8) // Google Maps URL limit for free waypoints
      .map(m => encodeURIComponent(m.booking.pickupHotel || 'Patong Beach'))
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&waypoints=${waypoints}`;
  }, [mappedMarkers]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              LOGISTICS MAP
            </span>
            <span className="text-xs text-slate-400 font-medium">แผนที่รถรับส่งประจำวันสำหรับจัดคิวคนขับ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <span>แผนที่พิกัดจุดรับส่งลูกค้า (Pickup Logistics Map)</span>
          </h2>
        </div>

        {/* Quick Date Switch Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDateQuickSwitch('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              dateQuickFilter === 'today'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>วันนี้ ({todayStr})</span>
          </button>

          <button
            onClick={() => handleDateQuickSwitch('tomorrow')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              dateQuickFilter === 'tomorrow'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>พรุ่งนี้ ({tomorrowStr})</span>
          </button>

          <button
            onClick={() => handleDateQuickSwitch('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateQuickFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ทริปทั้งหมด
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setDateQuickFilter('custom');
            }}
            className="bg-slate-950 border border-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">จุดรับส่งทั้งหมด</span>
            <span className="text-lg font-black text-white">{filteredBookings.length} <span className="text-xs font-normal text-slate-400">จุด</span></span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-xl flex items-center justify-center shrink-0 font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">รวมผู้เดินทาง (Pax)</span>
            <span className="text-lg font-black text-cyan-300">{totalPaxSum} <span className="text-xs font-normal text-slate-400">คน</span></span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl flex items-center justify-center shrink-0 font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">รอบรับเช้าสุด</span>
            <span className="text-lg font-black text-amber-300">07:00 - 08:30 <span className="text-xs font-normal text-slate-400">น.</span></span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">นำทางหลายจุด</span>
            <a
              href={googleMapsBatchRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 mt-1 transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>เปิด Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-slate-950 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, โรงแรม, เลขบุ๊กกิ้ง หรือ เบอร์โทร..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tour Filter */}
          <select
            value={selectedTourId}
            onChange={(e) => setSelectedTourId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none"
          >
            <option value="all">🚢 ทุกโปรแกรมทัวร์</option>
            {tours.map(t => (
              <option key={t.id} value={t.id}>{t.title.TH || t.title.EN}</option>
            ))}
          </select>

          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none"
          >
            <option value="all">📍 ทุกโซนรับส่ง</option>
            {Object.keys(PHUKET_ZONE_COORDS).filter(k => !k.match(/[a-z]/i)).map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Pickup Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Container (2 Columns on Desktop) */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative min-h-[420px] sm:min-h-[520px] shadow-inner">
          <MapContainer
            center={[7.8804, 98.3923]}
            zoom={11}
            scrollWheelZoom={true}
            className="w-full h-full min-h-[420px] sm:min-h-[520px] z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors & CartoDB'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <MapBoundsAdapter markers={mappedMarkers} />

            {mappedMarkers.map(({ booking: b, index, coords }) => (
              <Marker
                key={b.id}
                position={coords}
                icon={createCustomMarkerIcon(b.paymentStatus, index, b.pickupTime)}
                eventHandlers={{
                  click: () => setActiveMarkerId(b.id)
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                      <span className="font-mono text-[11px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{b.bookingRef}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        b.paymentStatus === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.paymentStatus === 'slip_uploaded'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {b.paymentStatus === 'verified' ? '✓ ยืนยันแล้ว' : b.paymentStatus === 'slip_uploaded' ? '⏳ รอตรวจสลิป' : 'รอชำระ'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm mb-1 leading-tight">
                      🏨 {b.pickupHotel}
                    </h4>

                    {b.roomNumber && (
                      <p className="text-xs text-slate-700 font-bold mb-1">
                        🔑 ห้องพัก: <span className="text-emerald-700">{b.roomNumber}</span>
                      </p>
                    )}

                    <div className="text-xs text-slate-600 space-y-1 mb-2.5">
                      <p className="flex items-center gap-1 font-semibold text-slate-800">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.customerName}</span>
                      </p>

                      <p className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>เวลาแปะรับ: <strong className="text-slate-900">{b.pickupTime || '07:30 - 08:30 น.'}</strong></span>
                      </p>

                      <p className="flex items-center gap-1">
                        <Ship className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[180px]">{b.tourTitle}</span>
                      </p>

                      <p className="text-[11px] font-bold text-slate-500">
                        👥 จำนวน: ผู้ใหญ่ {b.adults} | เด็ก {b.children} {b.infants > 0 ? `| ทารก ${b.infants}` : ''}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                      <a
                        href={`tel:${b.customerPhone}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[11px] inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>โทรหาลูกค้า</span>
                      </a>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.pickupHotel)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-2.5 py-1 rounded text-[11px] inline-flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>นำทาง</span>
                      </a>
                    </div>
                  </div>
                </Popup>

                <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                  <div className="text-xs font-bold text-slate-900">
                    {index}. {b.pickupHotel} ({b.customerName})
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Status Legend */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1.5 backdrop-blur-md">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">สัญลักษณ์สีหมุดรับส่ง</div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs" />
              <span className="text-slate-200">ยืนยันการชำระแล้ว (Verified)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs" />
              <span className="text-slate-200">อัพโหลดสลิปแล้ว (Slip Uploaded)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-sky-500 border border-white shadow-xs" />
              <span className="text-slate-200">รอชำระเงิน (Pending)</span>
            </div>
          </div>
        </div>

        {/* Pickup List Sidebar */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-[520px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>รายชื่อโรงแรมจุดรับ ({filteredBookings.length})</span>
              </h3>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {selectedDate}
              </span>
            </div>

            {/* Zone Breakdown Summary Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-20 overflow-y-auto pr-1">
              {zoneStats.map(([zone, stat]) => (
                <span key={zone} className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                  <span className="text-emerald-400">{zone}:</span>
                  <span className="text-white">{stat.count} จุด ({stat.pax} คน)</span>
                </span>
              ))}
            </div>

            {/* Scrollable Bookings List */}
            <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b, idx) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setActiveMarkerId(b.id);
                      if (onSelectBooking) onSelectBooking(b);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      activeMarkerId === b.id
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-white truncate max-w-[140px]">
                          {b.pickupHotel}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">
                        #{b.bookingRef}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-medium mb-1">
                      👤 {b.customerName} {b.roomNumber ? `(ห้อง ${b.roomNumber})` : ''}
                    </p>

                    <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{b.pickupTime || '07:30 น.'}</span>
                      </span>
                      <span className="text-cyan-300 font-bold">
                        👥 {b.adults + b.children + b.infants} คน
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-medium">ไม่มีรายการรับส่งในวันที่เลือก</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action */}
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>พิมพ์ใบลิสต์รถรับส่ง (Print Pickup Manifest)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
