import { Booking, Tour, Review, AppSettings, Customer, Supplier, VisitorAnalytics } from '../types';

// Supabase is completely removed from this application.
// All persistence and data operations are handled by local server APIs / local disk storage.
export const isSupabaseConfigured = false;

export const getSupabase = (): any => null;

// Helper API wrapper that forwards requests to local Express backend /api endpoints
export const supabaseApi = {
  async getBookings(): Promise<Booking[] | null> {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getBookings local API fetch error:', e);
    }
    return null;
  },

  async getSettings(): Promise<AppSettings | null> {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getSettings local API fetch error:', e);
    }
    return null;
  },

  async getTours(): Promise<Tour[] | null> {
    try {
      const res = await fetch('/api/tours');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getTours local API fetch error:', e);
    }
    return null;
  },

  async createBooking(booking: Booking): Promise<boolean> {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      return res.ok;
    } catch (e) {
      console.warn('createBooking local API error:', e);
      return false;
    }
  },

  async updateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return res.ok;
    } catch (e) {
      console.warn('updateBooking local API error:', e);
      return false;
    }
  },

  async deleteBooking(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('deleteBooking local API error:', e);
      return false;
    }
  },

  async saveSettings(settings: AppSettings): Promise<boolean> {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveSettings local API error:', e);
      return false;
    }
  },

  async saveTours(tours: Tour[]): Promise<boolean> {
    try {
      const res = await fetch('/api/tours/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tours)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveTours local API error:', e);
      return false;
    }
  },

  async saveReviews(reviews: Review[]): Promise<boolean> {
    try {
      const res = await fetch('/api/reviews/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviews)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveReviews local API error:', e);
      return false;
    }
  },

  async getReviews(): Promise<Review[] | null> {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getReviews local API fetch error:', e);
    }
    return null;
  },

  async saveBookingsBackup(bookings: Booking[]): Promise<boolean> {
    try {
      const res = await fetch('/api/bookings/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookings)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveBookingsBackup local API error:', e);
      return false;
    }
  },

  async saveCustomers(customers: Customer[]): Promise<boolean> {
    try {
      const res = await fetch('/api/customers/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customers)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveCustomers local API error:', e);
      return false;
    }
  },

  async getCustomers(): Promise<Customer[] | null> {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getCustomers local API fetch error:', e);
    }
    return null;
  },

  async saveSuppliers(suppliers: Supplier[]): Promise<boolean> {
    try {
      const res = await fetch('/api/suppliers/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suppliers)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveSuppliers local API error:', e);
      return false;
    }
  },

  async getSuppliers(): Promise<Supplier[] | null> {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getSuppliers local API fetch error:', e);
    }
    return null;
  },

  async saveVisitorAnalytics(analytics: VisitorAnalytics): Promise<boolean> {
    try {
      const res = await fetch('/api/analytics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytics)
      });
      return res.ok;
    } catch (e) {
      console.warn('saveVisitorAnalytics local API error:', e);
      return false;
    }
  },

  async getVisitorAnalytics(): Promise<VisitorAnalytics | null> {
    try {
      const res = await fetch('/api/analytics/stats');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('getVisitorAnalytics local API fetch error:', e);
    }
    return null;
  }
};

export const SUPABASE_SQL_SCHEMA = `-- Supabase completely removed. Storage is 100% Local Disk.`;
