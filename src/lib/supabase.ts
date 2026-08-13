import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Booking, Tour, Review, AppSettings, LineNotificationLog } from '../types';

// Retrieve Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project-id'));

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

/* ========================================================================
   SQL SCHEMA INITIALIZATION SCRIPT FOR SUPABASE
   (Copy & Paste into Supabase SQL Editor)
   ========================================================================

-- 1. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref TEXT UNIQUE NOT NULL,
  tour_id TEXT NOT NULL,
  tour_title TEXT NOT NULL,
  tour_image TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_line_id TEXT,
  nationality TEXT DEFAULT 'Thai',
  travel_date DATE NOT NULL,
  pickup_hotel TEXT NOT NULL,
  pickup_zone TEXT,
  room_number TEXT,
  special_requests TEXT,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  infants INT DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'promptpay',
  promptpay_id_used TEXT,
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  slip_url TEXT,
  slip_uploaded_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  line_notify_sent BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- 2. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  nationality TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  verified_booking BOOLEAN DEFAULT FALSE,
  photos TEXT[],
  admin_reply TEXT,
  admin_reply_date TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT,
  company_name TEXT,
  promptpay_id TEXT,
  promptpay_name TEXT,
  line_messaging_channel_access_token TEXT,
  line_messaging_user_id TEXT,
  line_notify_token TEXT,
  line_oa_id TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  admin_pin TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access policies (for client app)
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);

======================================================================== */

// Supabase helper API calls with fallback to local state if Supabase is not configured yet
export const supabaseApi = {
  // Fetch all bookings from Supabase
  async getBookings(): Promise<Booking[] | null> {
    const client = getSupabase();
    if (!client) return null;

    const { data, error } = await client
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings from Supabase:', error);
      return null;
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      bookingRef: b.booking_ref,
      tourId: b.tour_id,
      tourTitle: b.tour_title,
      tourImage: b.tour_image || '',
      customerName: b.customer_name,
      customerEmail: b.customer_email,
      customerPhone: b.customer_phone,
      customerLineId: b.customer_line_id,
      nationality: b.nationality,
      travelDate: b.travel_date,
      pickupHotel: b.pickup_hotel,
      pickupZone: b.pickup_zone,
      roomNumber: b.room_number,
      specialRequests: b.special_requests,
      adults: b.adults,
      children: b.children,
      infants: b.infants,
      totalAmount: Number(b.total_amount),
      paymentMethod: b.payment_method || 'promptpay',
      promptPayIdUsed: b.promptpay_id_used,
      paymentStatus: b.payment_status,
      orderStatus: b.order_status,
      slipUrl: b.slip_url,
      slipUploadedAt: b.slip_uploaded_at,
      paidAt: b.paid_at,
      createdAt: b.created_at,
      lineNotifySent: b.line_notify_sent,
      reminderSent: b.reminder_sent,
      notes: b.notes,
    }));
  },

  // Save a new booking to Supabase
  async createBooking(booking: Booking): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    const { error } = await client.from('bookings').insert([{
      booking_ref: booking.bookingRef,
      tour_id: booking.tourId,
      tour_title: booking.tourTitle,
      tour_image: booking.tourImage,
      customer_name: booking.customerName,
      customer_email: booking.customerEmail,
      customer_phone: booking.customerPhone,
      customer_line_id: booking.customerLineId,
      nationality: booking.nationality,
      travel_date: booking.travelDate,
      pickup_hotel: booking.pickupHotel,
      pickup_zone: booking.pickupZone,
      room_number: booking.roomNumber,
      special_requests: booking.specialRequests,
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
      total_amount: booking.totalAmount,
      payment_method: booking.paymentMethod,
      promptpay_id_used: booking.promptPayIdUsed,
      payment_status: booking.paymentStatus,
      order_status: booking.orderStatus,
      slip_url: booking.slipUrl,
      created_at: booking.createdAt,
      line_notify_sent: booking.lineNotifySent,
    }]);

    if (error) {
      console.error('Failed to create booking in Supabase:', error);
      return false;
    }

    return true;
  },

  // Update booking status or slip in Supabase
  async updateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    const payload: any = {};
    if (updates.paymentStatus) payload.payment_status = updates.paymentStatus;
    if (updates.orderStatus) payload.order_status = updates.orderStatus;
    if (updates.slipUrl) payload.slip_url = updates.slipUrl;
    if (updates.slipUploadedAt) payload.slip_uploaded_at = updates.slipUploadedAt;
    if (updates.paidAt) payload.paid_at = updates.paidAt;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { error } = await client
      .from('bookings')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Failed to update booking in Supabase:', error);
      return false;
    }

    return true;
  }
};

export const SUPABASE_SQL_SCHEMA = `-- Supabase SQL Setup for TripSeaTour Phuket
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref TEXT UNIQUE NOT NULL,
  tour_id TEXT NOT NULL,
  tour_title TEXT NOT NULL,
  tour_image TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_line_id TEXT,
  nationality TEXT DEFAULT 'Thai',
  travel_date DATE NOT NULL,
  pickup_hotel TEXT NOT NULL,
  pickup_zone TEXT,
  room_number TEXT,
  special_requests TEXT,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  infants INT DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'promptpay',
  promptpay_id_used TEXT,
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  slip_url TEXT,
  slip_uploaded_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  line_notify_sent BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  nationality TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  verified_booking BOOLEAN DEFAULT FALSE,
  photos TEXT[],
  admin_reply TEXT,
  admin_reply_date TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public RLS policies
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
`;
