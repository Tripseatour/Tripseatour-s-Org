import { initialBookings, initialTours } from '../src/data/mockData';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const bookings = initialBookings || [];
    const tours = initialTours || [];

    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'verified' || b.paymentStatus === 'slip_uploaded')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    const totalBookings = bookings.length;
    const pendingVerifications = bookings.filter(b => b.paymentStatus === 'slip_uploaded' || b.paymentStatus === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.orderStatus === 'confirmed').length;

    const monthlyRevenue = [
      { month: 'พ.ค. 26', revenue: 145000, bookings: 32 },
      { month: 'มิ.ย. 26', revenue: 182000, bookings: 41 },
      { month: 'ก.ค. 26', revenue: 220000, bookings: 54 },
      { month: 'ส.ค. 26', revenue: totalRevenue + 95000, bookings: totalBookings + 18 }
    ];

    const catMap: Record<string, { count: number; revenue: number }> = {};
    tours.forEach(t => {
      if (t.category) catMap[t.category] = { count: 0, revenue: 0 };
    });

    bookings.forEach(b => {
      const tourId = b.tourId;
      const tour = tours.find(t => t.id === tourId);
      const cat = tour ? tour.category : 'island';
      if (!catMap[cat]) catMap[cat] = { count: 0, revenue: 0 };
      catMap[cat].count += 1;
      catMap[cat].revenue += (Number(b.totalAmount) || 0);
    });

    const categoryBreakdown = Object.keys(catMap).map(cat => ({
      category: cat,
      count: catMap[cat].count,
      revenue: catMap[cat].revenue
    }));

    const statusBreakdown = [
      { status: 'ชำระเงินแล้ว', count: bookings.filter(b => b.paymentStatus === 'verified').length },
      { status: 'รอตรวจสอบสลิป', count: bookings.filter(b => b.paymentStatus === 'slip_uploaded').length },
      { status: 'รอชำระเงิน', count: bookings.filter(b => b.paymentStatus === 'pending').length }
    ];

    return res.status(200).json({
      totalRevenue,
      totalBookings,
      pendingVerifications,
      confirmedBookings,
      monthlyRevenue,
      categoryBreakdown,
      statusBreakdown,
      recentBookings: bookings.slice(0, 10)
    });
  } catch (err: any) {
    return res.status(200).json({
      totalRevenue: 0,
      totalBookings: 0,
      pendingVerifications: 0,
      confirmedBookings: 0,
      monthlyRevenue: [],
      categoryBreakdown: [],
      statusBreakdown: [],
      recentBookings: []
    });
  }
}
