export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    connected: true,
    storageType: 'Local Server Disk Storage (data/*.json)',
    supabaseRemoved: true,
    message: 'ระบบเปลี่ยนเป็นระบบจัดเก็บไฟล์ในดิสก์ 100% เรียบร้อยแล้ว (ไม่ใช้ Supabase)',
    timestamp: new Date().toISOString()
  });
}
