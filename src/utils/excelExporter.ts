// CSV & Excel Exporter Utility for Trip Sea Tour Phuket

function downloadCsvFile(filename: string, csvContent: string) {
  // Add UTF-8 BOM so Thai characters render properly in Excel & Google Sheets
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// 1. Export Bookings / Orders to CSV
export function exportBookingsToCsv(bookings: any[]) {
  const headers = [
    'Booking Ref',
    'Tour Title',
    'Customer Name',
    'Phone',
    'Email',
    'LINE ID',
    'Travel Date',
    'Adults',
    'Children',
    'Infants',
    'Total Amount (THB)',
    'Payment Status',
    'Order Status',
    'Pickup Hotel',
    'Pickup Zone',
    'Room Number',
    'Supplier',
    'Created At'
  ];

  const rows = bookings.map(b => [
    escapeCsvValue(b.bookingRef),
    escapeCsvValue(b.tourTitle),
    escapeCsvValue(b.customerName),
    escapeCsvValue(b.customerPhone),
    escapeCsvValue(b.customerEmail || ''),
    escapeCsvValue(b.customerLineId || ''),
    escapeCsvValue(b.travelDate),
    b.adults || 1,
    b.children || 0,
    b.infants || 0,
    b.totalAmount || 0,
    escapeCsvValue(b.paymentStatus || 'pending'),
    escapeCsvValue(b.orderStatus || 'pending'),
    escapeCsvValue(b.pickupHotel || ''),
    escapeCsvValue(b.pickupZone || ''),
    escapeCsvValue(b.roomNumber || ''),
    escapeCsvValue(b.supplierName || ''),
    escapeCsvValue(b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : '')
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`tripseatour_bookings_${dateStr}.csv`, csvContent);
}

// 2. Export Customers CRM to CSV
export function exportCustomersToCsv(customers: any[]) {
  const headers = [
    'Customer ID',
    'Name',
    'Phone',
    'Email',
    'LINE ID',
    'Nationality',
    'Total Bookings',
    'Total Spent (THB)',
    'Last Booking Date',
    'Created At'
  ];

  const rows = customers.map(c => [
    escapeCsvValue(c.id),
    escapeCsvValue(c.name),
    escapeCsvValue(c.phone || ''),
    escapeCsvValue(c.email || ''),
    escapeCsvValue(c.lineId || ''),
    escapeCsvValue(c.nationality || 'Thai'),
    c.totalBookings || 1,
    c.totalSpent || 0,
    escapeCsvValue(c.lastBookingDate || ''),
    escapeCsvValue(c.createdAt || '')
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`tripseatour_customers_${dateStr}.csv`, csvContent);
}

// 3. Export Suppliers to CSV
export function exportSuppliersToCsv(suppliers: any[]) {
  const headers = [
    'Supplier Code',
    'Company Name',
    'Contact Person',
    'Phone',
    'Email',
    'LINE ID',
    'Bank Name',
    'Account No',
    'Account Name',
    'Status'
  ];

  const rows = suppliers.map(s => [
    escapeCsvValue(s.code || ''),
    escapeCsvValue(s.name),
    escapeCsvValue(s.contactPerson || ''),
    escapeCsvValue(s.phone || ''),
    escapeCsvValue(s.email || ''),
    escapeCsvValue(s.lineId || ''),
    escapeCsvValue(s.bankName || ''),
    escapeCsvValue(s.accountNo || ''),
    escapeCsvValue(s.accountName || ''),
    escapeCsvValue(s.isActive !== false ? 'Active' : 'Inactive')
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`tripseatour_suppliers_${dateStr}.csv`, csvContent);
}

// 4. Export Tours to CSV
export function exportToursToCsv(tours: any[]) {
  const headers = [
    'Tour ID',
    'Title (TH)',
    'Title (EN)',
    'Category',
    'Price Adult (THB)',
    'Price Child (THB)',
    'Cost Adult (THB)',
    'Cost Child (THB)',
    'Rating',
    'Review Count',
    'Status'
  ];

  const rows = tours.map(t => [
    escapeCsvValue(t.id),
    escapeCsvValue(t.title?.TH || t.title?.EN || ''),
    escapeCsvValue(t.title?.EN || ''),
    escapeCsvValue(t.category || ''),
    t.priceAdult || 0,
    t.priceChild || 0,
    t.costAdult || 0,
    t.costChild || 0,
    t.rating || 5,
    t.reviewCount || 0,
    escapeCsvValue(t.isVisible !== false ? 'Visible' : 'Hidden')
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`tripseatour_tours_${dateStr}.csv`, csvContent);
}
