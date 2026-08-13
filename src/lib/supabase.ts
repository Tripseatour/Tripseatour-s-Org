import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Booking, Tour, Review, AppSettings, LineNotificationLog, Customer } from '../types';

// Retrieve Supabase environment variables
const DEFAULT_SUPABASE_URL = 'https://tljofqremlconawmtndd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsam9mcXJlbWxjb25hd210bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTE1MTYsImV4cCI6MjEwMjE4NzUxNn0.lUUYnc0jOMl6JU1SS8RLoxZu2mir70qgcO2J8kvSHn0';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = (envUrl && !envUrl.includes('your-supabase-project-id')) ? envUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (envKey && !envKey.includes('your-supabase-anon-key')) ? envKey : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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

  // Get Settings from Supabase
  async getSettings(): Promise<AppSettings | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      // Try from dedicated 'settings' table first
      const { data, error } = await client.from('settings').select('*').limit(1);
      if (error || !data || data.length === 0) {
        // Fallback to app_store settings key
        const { data: kvData } = await client.from('app_store').select('value').eq('key', 'settings').maybeSingle();
        if (kvData && kvData.value) {
          return JSON.parse(kvData.value);
        }
        return null;
      }
      const s = data[0];
      return {
        siteName: s.site_name || '',
        companyName: s.company_name || '',
        promptPayId: s.promptpay_id || '',
        promptPayName: s.promptpay_name || '',
        lineMessagingChannelAccessToken: s.line_messaging_channel_access_token || s.line_notify_token || '',
        lineMessagingUserId: s.line_messaging_user_id || '',
        lineNotifyToken: s.line_notify_token || '',
        lineOaId: s.line_oa_id || '',
        contactPhone: s.contact_phone || '',
        contactEmail: s.contact_email || '',
        address: s.address || '',
        adminPin: s.admin_pin || '1234'
      };
    } catch (e) {
      console.error('getSettings error, fallback to local:', e);
      return null;
    }
  },

  // Get Tours from Supabase
  async getTours(): Promise<Tour[] | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client.from('app_store').select('value').eq('key', 'tours').maybeSingle();
      if (data && data.value) {
        return JSON.parse(data.value);
      }
    } catch (e) {
      console.error('getTours error:', e);
    }
    return null;
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
  },

  // Delete booking from Supabase
  async deleteBooking(id: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    const { error } = await client
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete booking in Supabase:', error);
      return false;
    }
    return true;
  },

  // Save full settings to Supabase (uses 'settings' table and tries 'app_store' as fallback/extra)
  async saveSettings(settings: AppSettings): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    // 1. Try updating the dedicated 'settings' table
    try {
      const { error } = await client.from('settings').upsert({
        id: 1,
        site_name: settings.siteName,
        company_name: settings.companyName,
        promptpay_id: settings.promptPayId,
        promptpay_name: settings.promptPayName,
        line_messaging_channel_access_token: settings.lineMessagingChannelAccessToken,
        line_messaging_user_id: settings.lineMessagingUserId,
        line_notify_token: settings.lineNotifyToken,
        line_oa_id: settings.lineOaId,
        contact_phone: settings.contactPhone,
        contact_email: settings.contactEmail,
        address: settings.address,
        admin_pin: settings.adminPin,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) {
        console.warn('Upsert into dedicated settings table failed:', error.message);
      }
    } catch (e) {
      console.error('Settings table save failed, trying app_store:', e);
    }

    // 2. Try updating the 'app_store' key-value table
    try {
      await client.from('app_store').upsert({
        key: 'settings',
        value: JSON.stringify(settings),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (e) {
      // app_store might not exist, ignore
    }

    return true;
  },

  // Save tours array to Supabase ('app_store' key 'tours')
  async saveTours(tours: Tour[]): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client.from('app_store').upsert({
        key: 'tours',
        value: JSON.stringify(tours),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      return !error;
    } catch (e) {
      console.error('Failed to save tours in app_store:', e);
      return false;
    }
  },

  // Save reviews to Supabase
  async saveReviews(reviews: Review[]): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    try {
      await client.from('app_store').upsert({
        key: 'reviews',
        value: JSON.stringify(reviews),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (e) {}
    return true;
  },

  // Save bookings backup to app_store for recovery
  async saveBookingsBackup(bookings: Booking[]): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    try {
      await client.from('app_store').upsert({
        key: 'bookings',
        value: JSON.stringify(bookings),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (e) {}
    return true;
  },

  // Save customers array to Supabase ('app_store' key 'customers')
  async saveCustomers(customers: Customer[]): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client.from('app_store').upsert({
        key: 'customers',
        value: JSON.stringify(customers),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      return !error;
    } catch (e) {
      console.error('Failed to save customers in app_store:', e);
      return false;
    }
  }
};

export const SUPABASE_SQL_SCHEMA = `-- Supabase SQL Setup for TripSeaTour Phuket
-- 1. APP_STORE KEY-VALUE TABLE (Crucial for storing general settings, tours, customers and reviews)
CREATE TABLE IF NOT EXISTS public.app_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SETTINGS TABLE
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS TABLE
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

-- 4. REVIEWS TABLE
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
ALTER TABLE public.app_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public RLS policies (Safe drop & create)
DROP POLICY IF EXISTS "Allow public read app_store" ON public.app_store;
DROP POLICY IF EXISTS "Allow public write app_store" ON public.app_store;
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public write settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;

CREATE POLICY "Allow public read app_store" ON public.app_store FOR SELECT USING (true);
CREATE POLICY "Allow public write app_store" ON public.app_store FOR ALL USING (true);

CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public write settings" ON public.settings FOR ALL USING (true);

CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
`;
