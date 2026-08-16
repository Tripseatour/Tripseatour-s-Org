import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Booking, Tour, Review, AppSettings, LineNotificationLog, Customer } from '../types';
import { initialSettings } from '../data/mockData';

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
ALTER TABLE public.app_store ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access policies (for client app)
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public delete bookings" ON public.bookings;
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete bookings" ON public.bookings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public delete reviews" ON public.reviews;
CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reviews" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reviews" ON public.reviews FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update settings" ON public.settings;
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON public.settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read app_store" ON public.app_store;
DROP POLICY IF EXISTS "Allow public insert app_store" ON public.app_store;
DROP POLICY IF EXISTS "Allow public update app_store" ON public.app_store;
DROP POLICY IF EXISTS "Allow public delete app_store" ON public.app_store;
CREATE POLICY "Allow public read app_store" ON public.app_store FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_store" ON public.app_store FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update app_store" ON public.app_store FOR UPDATE USING (true);
CREATE POLICY "Allow public delete app_store" ON public.app_store FOR DELETE USING (true);

-- 4. SEED / UPDATE DEFAULT SETTINGS WITH LINE CHANNEL ACCESS TOKEN
INSERT INTO public.settings (
  id, 
  site_name, 
  company_name, 
  promptpay_id, 
  promptpay_name, 
  line_messaging_channel_access_token, 
  line_messaging_user_id, 
  line_oa_id, 
  contact_phone, 
  contact_email, 
  address, 
  admin_pin
)
VALUES (
  1, 
  'Trip Sea Tour Phuket', 
  'บจก. ทริปซีทัวร์ ภูเก็ต', 
  '0825257914', 
  'นายธนพล สุขสวัสดิ์', 
  'Na3ekdkIyTshDZwZItjOQGv4MXBqo/j6zzXfoES2K6Od6HEjLXDjookdpV5QzuUA6FqXknMZL3MwgiPNmupdAy9oZweKN5QKlTjdloODikwIgrlJEeyrWJW7vAzydq38jHDmKR1NZE58ji2oYNy9VwdB04t89/1O/w1cDnyilFU=', 
  'C1bb0d71ad5dbb960801dad6bd5208afa', 
  '@056hxinu', 
  '082-525-7914, 076-123-456', 
  'contact@tripseatour.com', 
  '123/45 หมู่ 5 ต.รัษฎา อ.เมือง จ.ภูเก็ต 83000', 
  '1234'
)
ON CONFLICT (id) DO UPDATE SET
  line_messaging_channel_access_token = EXCLUDED.line_messaging_channel_access_token,
  line_messaging_user_id = EXCLUDED.line_messaging_user_id,
  line_oa_id = EXCLUDED.line_oa_id,
  promptpay_id = EXCLUDED.promptpay_id,
  promptpay_name = EXCLUDED.promptpay_name,
  company_name = EXCLUDED.company_name;

======================================================================== */

// Supabase helper API calls with fallback to local state if Supabase is not configured yet
export const supabaseApi = {
  // Fetch all bookings from Supabase
  async getBookings(): Promise<Booking[] | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      // 1. Check app_store backup key 'bookings' FIRST because it holds the authoritative array (including deletions)
      const { data: storeData } = await client.from('app_store').select('value').eq('key', 'bookings').maybeSingle();
      if (storeData && storeData.value) {
        return JSON.parse(storeData.value);
      }

      // 2. Fallback to relational 'bookings' table if app_store key not set yet
      const { data, error } = await client
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((b: any) => ({
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
      }

      if (!error && data && data.length === 0) {
        return [];
      }
    } catch (e) {
      console.error('getBookings error:', e);
    }

    return null;
  },

  // Get Settings from Supabase
  async getSettings(): Promise<AppSettings | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      // 1. Try from app_store settings key first (it contains the complete full JSON of all settings)
      const { data: kvData, error: kvError } = await client.from('app_store').select('value').eq('key', 'settings').maybeSingle();
      if (!kvError && kvData && kvData.value) {
        try {
          const parsed = JSON.parse(kvData.value);
          if (parsed && parsed.promptPayId) {
            // Ensure adminGoogleEmails is present
            if (!parsed.adminGoogleEmails || !Array.isArray(parsed.adminGoogleEmails)) {
              parsed.adminGoogleEmails = ['asmr9941@gmail.com', 'admin@tripseatour.com'];
            }
            return parsed;
          }
        } catch (jsonErr) {}
      }

      // 2. Fallback to dedicated 'settings' table if app_store key is missing or corrupted
      const { data, error } = await client.from('settings').select('*').limit(1);
      if (error || !data || data.length === 0) {
        return null;
      }
      const s = data[0];
      return {
        siteName: s.site_name || initialSettings.siteName,
        companyName: s.company_name || initialSettings.companyName,
        promptPayId: s.promptpay_id || initialSettings.promptPayId,
        promptPayName: (s.promptpay_name && !s.promptpay_name.includes('บริษัท')) ? s.promptpay_name : 'พรทิพย์ แดงทัด',
        lineMessagingChannelAccessToken: s.line_messaging_channel_access_token || s.line_notify_token || initialSettings.lineMessagingChannelAccessToken,
        lineMessagingUserId: s.line_messaging_user_id || initialSettings.lineMessagingUserId,
        lineNotifyToken: s.line_notify_token || initialSettings.lineNotifyToken,
        lineOaId: s.line_oa_id || initialSettings.lineOaId,
        contactPhone: s.contact_phone || initialSettings.contactPhone,
        contactEmail: s.contact_email || initialSettings.contactEmail,
        address: s.address || initialSettings.address,
        adminPin: s.admin_pin || initialSettings.adminPin,
        adminGoogleEmails: s.admin_google_emails || initialSettings.adminGoogleEmails
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

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = client.from('bookings').update(payload);
    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('booking_ref', id);
    }

    const { error } = await query;

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

    try {
      // Attempt deleting by both id and booking_ref to guarantee deletion
      const { error: err1 } = await client.from('bookings').delete().eq('id', id);
      const { error: err2 } = await client.from('bookings').delete().eq('booking_ref', id);

      if (err1 && err2) {
        console.warn('Booking deletion warning:', err1, err2);
      }
    } catch (e) {
      console.error('Failed to delete booking in Supabase:', e);
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
        admin_google_emails: settings.adminGoogleEmails,
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

  // Get Reviews from Supabase ('app_store' key 'reviews')
  async getReviews(): Promise<Review[] | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client.from('app_store').select('value').eq('key', 'reviews').maybeSingle();
      if (data && data.value) {
        return JSON.parse(data.value);
      }
    } catch (e) {
      console.error('getReviews error:', e);
    }
    return null;
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
  },

  // Get Customers from Supabase ('app_store' key 'customers')
  async getCustomers(): Promise<Customer[] | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client.from('app_store').select('value').eq('key', 'customers').maybeSingle();
      if (data && data.value) {
        return JSON.parse(data.value);
      }
    } catch (e) {
      console.error('getCustomers error:', e);
    }
    return null;
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
DROP POLICY IF EXISTS "Allow public all app_store" ON public.app_store;
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public write settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public all settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public all reviews" ON public.reviews;

CREATE POLICY "Allow public all app_store" ON public.app_store FOR ALL USING (true);
CREATE POLICY "Allow public all settings" ON public.settings FOR ALL USING (true);
CREATE POLICY "Allow public all bookings" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Allow public all reviews" ON public.reviews FOR ALL USING (true);
`;
