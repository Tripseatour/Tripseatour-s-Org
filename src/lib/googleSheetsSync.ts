// Google Sheets Direct REST Sync Service for Trip Sea Tour Phuket

import { Booking, Customer, Supplier, Tour } from '../types';

export interface SyncToSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  createdTime: string;
}

export async function createAndSyncGoogleSpreadsheet(
  accessToken: string,
  data: {
    bookings: Booking[];
    customers: Customer[];
    suppliers: Supplier[];
    tours: Tour[];
  }
): Promise<SyncToSheetsResult> {
  const dateStr = new Date().toISOString().split('T')[0];
  const title = `Trip Sea Tour Phuket - Full Backup (${dateStr})`;

  // 1. Create Spreadsheet with multiple sheets (tabs)
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: [
        { properties: { title: 'คำสั่งซื้อ (Bookings)' } },
        { properties: { title: 'ลูกค้า (Customers CRM)' } },
        { properties: { title: 'เอเยนต์ (Suppliers)' } },
        { properties: { title: 'โปรแกรมทัวร์ (Tours)' } }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Google Sheets API Error (${createRes.status}): ${errText}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Data Arrays for Each Sheet
  const bookingRows = [
    ['Booking Ref', 'Tour Title', 'Customer Name', 'Phone', 'Email', 'LINE ID', 'Travel Date', 'Adults', 'Children', 'Infants', 'Total Amount (THB)', 'Payment Status', 'Order Status', 'Pickup Hotel', 'Supplier', 'Created At'],
    ...data.bookings.map(b => [
      b.bookingRef || '',
      b.tourTitle || '',
      b.customerName || '',
      b.customerPhone || '',
      b.customerEmail || '',
      b.customerLineId || '',
      b.travelDate || '',
      b.adults || 1,
      b.children || 0,
      b.infants || 0,
      b.totalAmount || 0,
      b.paymentStatus || 'pending',
      b.orderStatus || 'pending',
      b.pickupHotel || '',
      b.supplierName || '',
      b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : ''
    ])
  ];

  const customerRows = [
    ['Customer ID', 'Name', 'Phone', 'Email', 'LINE ID', 'Nationality', 'Total Bookings', 'Total Spent (THB)', 'Last Booking Date'],
    ...data.customers.map(c => [
      c.id || '',
      c.name || '',
      c.phone || '',
      c.email || '',
      c.lineId || '',
      c.nationality || 'Thai',
      c.totalBookings || 1,
      c.totalSpent || 0,
      c.lastBookingDate || ''
    ])
  ];

  const supplierRows = [
    ['Supplier Code', 'Company Name', 'Contact Person', 'Phone', 'Email', 'LINE ID', 'Bank Name', 'Account No', 'Account Name', 'Status'],
    ...data.suppliers.map(s => [
      s.code || '',
      s.name || '',
      s.contactPerson || '',
      s.phone || '',
      s.email || '',
      s.lineId || '',
      s.bankName || '',
      s.accountNo || '',
      s.accountName || '',
      s.isActive !== false ? 'Active' : 'Inactive'
    ])
  ];

  const tourRows = [
    ['Tour ID', 'Title (TH)', 'Title (EN)', 'Category', 'Price Adult (THB)', 'Price Child (THB)', 'Cost Adult (THB)', 'Cost Child (THB)', 'Rating', 'Review Count'],
    ...data.tours.map(t => [
      t.id || '',
      t.title?.TH || t.title?.EN || '',
      t.title?.EN || '',
      t.category || '',
      t.priceAdult || 0,
      t.priceChild || 0,
      t.costAdult || 0,
      t.costChild || 0,
      t.rating || 5,
      t.reviewCount || 0
    ])
  ];

  // 3. Batch Update Values
  const valueRanges = [
    { range: "'คำสั่งซื้อ (Bookings)'!A1", values: bookingRows },
    { range: "'ลูกค้า (Customers CRM)'!A1", values: customerRows },
    { range: "'เอเยนต์ (Suppliers)'!A1", values: supplierRows },
    { range: "'โปรแกรมทัวร์ (Tours)'!A1", values: tourRows }
  ];

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges
    })
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Google Sheets Update Error (${updateRes.status}): ${errText}`);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    createdTime: new Date().toLocaleTimeString('th-TH')
  };
}
