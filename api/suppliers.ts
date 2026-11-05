let memorySuppliers: any[] | null = null;

export const defaultSuppliers = [
  {
    id: 'sup-1793032576875',
    name: 'SEE SEA SKY',
    code: 'SSSPHUKET',
    phone: '',
    notes: 'เกาะไข่ เกาะเจมส์บอนด์',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1792743963575',
    name: 'GreenView Tour',
    code: 'SURINGV',
    phone: '',
    notes: 'เกาะสุรินทร์',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1792743939663',
    name: 'Nikorn Marine',
    code: 'NKMARINE',
    phone: '',
    notes: 'เกาะเฮ เกาะราชา',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1792743848553',
    name: 'Relax PhiPhi',
    code: 'RELAXPHI',
    phone: '',
    notes: 'เกาะพีพีออกสาย',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1792743821975',
    name: 'P.H.Marine',
    code: 'PHMARINE',
    phone: '',
    notes: 'เกาะไข่ ครึ่งวัน เต็มวัน',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1792743788272',
    name: 'Phi Phi Natthicha Marine',
    code: 'NATTHICHA',
    phone: '',
    notes: '',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1792743396698',
    name: 'Golden Region Travel',
    code: 'GOLDRT',
    phone: '',
    notes: 'เการาชา เกาะเฮ',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'sup-1',
    name: 'บริษัท พีพี ซีสตาร์ อันดามัน จำกัด (SeaStar Andaman)',
    code: 'SEASTAR',
    contactPerson: 'คุณวิชัย (ฝ่ายการตลาด/จองเรือ)',
    phone: '076-390123',
    email: 'booking@seastartours.co.th',
    lineId: '@seastartours',
    address: '88/12 หมู่ 5 ต.รัษฎา อ.เมือง จ.ภูเก็ต 83000',
    bankAccount: {
      bankName: 'ธนาคารกสิกรไทย (KBANK)',
      accountNo: '123-4-56789-0',
      accountName: 'บจก. พีพี ซีสตาร์ อันดามัน'
    },
    notes: 'ผู้ให้บริการเรือสปีดโบ๊ท VIP ไปเกาะพีพี และเกาะไข่',
    isActive: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'sup-2',
    name: 'บริษัท รายา พรินเซส ทัวร์ จำกัด (Raya Princess Tour)',
    code: 'RAYAPIN',
    contactPerson: 'คุณอารียา (ผู้จัดการการขาย)',
    phone: '076-281455',
    email: 'rsv@rayaprincess.com',
    lineId: '@rayaprincess',
    address: '45/99 หมู่ 1 ต.ฉลอง อ.เมือง จ.ภูเก็ต 83130',
    bankAccount: {
      bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
      accountNo: '987-6-54321-0',
      accountName: 'บจก. รายา พรินเซส ทัวร์'
    },
    notes: 'เชี่ยวชาญเส้นทางเกาะราชาใหญ่ เกาะราชาน้อย และเกาะเฮ',
    isActive: true,
    createdAt: '2026-01-12'
  },
  {
    id: 'sup-3',
    name: 'บริษัท ภูเก็ต สปีดโบ๊ท มารีน่า จำกัด (Phuket Speedboat Marina)',
    code: 'PHKBOAT',
    contactPerson: 'คุณอนุรักษ์ (นายท่าเรือ)',
    phone: '081-9982345',
    email: 'ops@phuketspeedboat.com',
    lineId: 'phk_boat_ops',
    address: '12/4 ท่าเรือรอยัลภูเก็ตมารีน่า ต.เกาะแก้ว จ.ภูเก็ต',
    bankAccount: {
      bankName: 'ธนาคารกรุงเทพ (BBL)',
      accountNo: '456-0-12345-6',
      accountName: 'บจก. ภูเก็ต สปีดโบ๊ท มารีน่า'
    },
    notes: 'บริการเรือยอชท์แคททามารันและเรือสปีดโบ๊ทเหมาลำชมพระอาทิตย์ตก',
    isActive: true,
    createdAt: '2026-01-15'
  },
  {
    id: 'sup-4',
    name: 'บริษัท เจมส์บอนด์ มารีน ทัวร์ จำกัด (James Bond Marine Tours)',
    code: 'JMBOND',
    contactPerson: 'คุณธนพล (ฝ่ายปฏิบัติการ)',
    phone: '076-412890',
    email: 'booking@jamesbondmarine.com',
    lineId: '@jmbondmarine',
    address: '108/5 หมู่ 2 ต.คลองเคียน อ.ตะกั่วทุ่ง จ.พังงา',
    bankAccount: {
      bankName: 'ธนาคารกรุงไทย (KTB)',
      accountNo: '302-1-88902-3',
      accountName: 'บจก. เจมส์บอนด์ มารีน ทัวร์'
    },
    notes: 'นำเที่ยวอ่าวพังงา เกาะปันหยี และเกาะเจมส์บอนด์ พายเรือแคนู',
    isActive: true,
    createdAt: '2026-01-20'
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Helper to load suppliers
  const loadSuppliersFromDb = async (): Promise<any[]> => {
    if (!memorySuppliers) memorySuppliers = defaultSuppliers;
    return memorySuppliers;
  };

  // Helper to save suppliers
  const saveSuppliersToDb = async (suppliers: any[]) => {
    memorySuppliers = suppliers;
  };

  try {
    const action = req.query?.action;
    const id = req.query?.id;

    // 1. GET: Return all suppliers
    if (req.method === 'GET') {
      const list = await loadSuppliersFromDb();
      return res.status(200).json(list);
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // 2. POST save-all: Save full array of suppliers
    if (req.method === 'POST' && (action === 'save-all' || Array.isArray(body?.suppliers) || Array.isArray(body))) {
      const listToSave = Array.isArray(body?.suppliers) ? body.suppliers : Array.isArray(body) ? body : [];
      if (!Array.isArray(listToSave) || listToSave.length === 0) {
        return res.status(400).json({ error: 'suppliers array is required' });
      }
      await saveSuppliersToDb(listToSave);
      return res.status(200).json({
        success: true,
        count: listToSave.length,
        suppliers: listToSave,
        version: Date.now()
      });
    }

    // 3. POST single: Add or update supplier
    if (req.method === 'POST') {
      const currentList = await loadSuppliersFromDb();
      const newSup = {
        id: body.id || `sup-${Date.now()}`,
        name: body.name || 'ซัพพลายเออร์ใหม่',
        code: (body.code || 'SUP').toUpperCase(),
        phone: body.phone || '',
        email: body.email || '',
        lineId: body.lineId || '',
        address: body.address || '',
        notes: body.notes || '',
        isActive: body.isActive !== false,
        createdAt: body.createdAt || new Date().toISOString().split('T')[0],
        ...body
      };

      const existingIdx = currentList.findIndex(s => s.id === newSup.id || (s.code && s.code === newSup.code));
      if (existingIdx !== -1) {
        currentList[existingIdx] = { ...currentList[existingIdx], ...newSup };
      } else {
        currentList.unshift(newSup);
      }

      await saveSuppliersToDb(currentList);
      return res.status(200).json({ ...(existingIdx !== -1 ? currentList[existingIdx] : newSup), version: Date.now() });
    }

    // 4. PUT: Update supplier by ID
    if (req.method === 'PUT') {
      const targetId = id || body.id;
      const currentList = await loadSuppliersFromDb();
      const idx = currentList.findIndex(s => s.id === targetId);
      if (idx !== -1) {
        currentList[idx] = { ...currentList[idx], ...body };
        await saveSuppliersToDb(currentList);
        return res.status(200).json({ ...currentList[idx], version: Date.now() });
      }
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // 5. DELETE: Delete supplier by ID
    if (req.method === 'DELETE') {
      const targetId = id;
      let currentList = await loadSuppliersFromDb();
      currentList = currentList.filter(s => s.id !== targetId);
      await saveSuppliersToDb(currentList);
      return res.status(200).json({ success: true, count: currentList.length, version: Date.now() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API suppliers handler error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
