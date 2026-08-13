export type Language = 'TH' | 'EN' | 'ZH' | 'RU';

export interface TourItinerary {
  time: string;
  title: Record<Language, string>;
  description?: Record<Language, string>;
}

export interface Tour {
  id: string;
  slug: string;
  title: Record<Language, string>;
  category: 'island' | 'sunset' | 'yacht' | 'eco' | 'sightseeing';
  categoryLabel: Record<Language, string>;
  description: Record<Language, string>;
  highlights: Record<Language, string[]>;
  priceAdult: number;
  priceChild: number; // Age 4-11
  originalPriceAdult?: number;
  originalPriceChild?: number;
  duration: Record<Language, string>;
  location: string;
  pickupAreas: string[];
  included: Record<Language, string[]>;
  excluded?: Record<Language, string[]>;
  itinerary: TourItinerary[];
  images: string[];
  rating: number;
  reviewCount: number;
  tags: string[];
  isFeatured?: boolean;
  isAvailable?: boolean;
}

export type PaymentStatus = 'pending' | 'slip_uploaded' | 'verified' | 'cancelled' | 'refunded';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  bookingRef: string;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerLineId?: string;
  nationality: string;
  travelDate: string; // YYYY-MM-DD
  pickupHotel: string;
  pickupZone: string;
  roomNumber?: string;
  specialRequests?: string;
  adults: number;
  children: number;
  infants: number;
  totalAmount: number;
  paymentMethod: 'promptpay';
  promptPayIdUsed: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  slipUrl?: string;
  slipUploadedAt?: string;
  paidAt?: string;
  createdAt: string;
  lineNotifySent: boolean;
  reminderSent?: boolean;
  reminderSentAt?: string;
  notes?: string;
}

export interface Review {
  id: string;
  tourId: string;
  userName: string;
  userAvatar?: string;
  nationality?: string;
  rating: number;
  comment: string;
  date: string;
  verifiedBooking: boolean;
  photos?: string[];
  adminReply?: string;
  adminReplyDate?: string;
  isApproved: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  lineId?: string;
  nationality: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string;
  createdAt: string;
}

export interface AppSettings {
  siteName: string;
  companyName: string;
  promptPayId: string; // e.g. "0812345678" or Tax ID "0835560001234"
  promptPayName: string; // Account holder name e.g. "ทริปซีทัวร์ ภูเก็ต จำกัด"
  lineMessagingChannelAccessToken: string;
  lineMessagingUserId: string;
  lineNotifyToken?: string;
  lineOaId: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  adminPin?: string;
}

export interface LineNotificationLog {
  id: string;
  bookingRef: string;
  type: 'NEW_ORDER' | 'PAYMENT_VERIFIED' | 'ORDER_CONFIRMED' | 'REMINDER_24H' | 'TEST';
  message: string;
  status: 'sent' | 'simulated' | 'failed';
  timestamp: string;
}

export interface SalesStats {
  totalRevenue: number;
  totalBookings: number;
  pendingVerifications: number;
  confirmedBookings: number;
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
  categoryBreakdown: { category: string; count: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  recentBookings: Booking[];
}
