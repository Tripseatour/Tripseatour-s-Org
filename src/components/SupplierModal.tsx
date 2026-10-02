import React, { useState, useEffect } from 'react';
import { X, Building2, Check, PhoneCall, Mail, MessageCircle, MapPin, CreditCard, FileText } from 'lucide-react';
import { Supplier } from '../types';

interface SupplierModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (supplierData: Partial<Supplier>) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  supplier,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(supplier?.name || '');
  const [code, setCode] = useState(supplier?.code || '');
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [lineId, setLineId] = useState(supplier?.lineId || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [bankName, setBankName] = useState(supplier?.bankName || supplier?.bankAccount?.bankName || '');
  const [accountNo, setAccountNo] = useState(supplier?.accountNo || supplier?.bankAccount?.accountNo || '');
  const [accountName, setAccountName] = useState(supplier?.accountName || supplier?.bankAccount?.accountName || '');
  const [notes, setNotes] = useState(supplier?.notes || '');
  const [isActive, setIsActive] = useState(supplier ? supplier.isActive !== false : true);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setCode(supplier.code || '');
      setContactPerson(supplier.contactPerson || '');
      setPhone(supplier.phone || '');
      setLineId(supplier.lineId || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setBankName(supplier.bankName || supplier.bankAccount?.bankName || '');
      setAccountNo(supplier.accountNo || supplier.bankAccount?.accountNo || '');
      setAccountName(supplier.accountName || supplier.bankAccount?.accountName || '');
      setNotes(supplier.notes || '');
      setIsActive(supplier.isActive !== false);
    }
  }, [supplier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อบริษัทผู้ให้บริการ / ซัพพลายเออร์');
      return;
    }
    if (!code.trim()) {
      alert('กรุณากรอกรหัสซัพพลายเออร์ (Code)');
      return;
    }

    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || '',
      lineId: lineId.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      bankName: bankName.trim() || undefined,
      accountNo: accountNo.trim() || undefined,
      accountName: accountName.trim() || undefined,
      bankAccount: bankName && accountNo ? {
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        accountName: accountName.trim(),
      } : undefined,
      notes: notes.trim() || undefined,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl p-6 shadow-2xl relative space-y-5 my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {supplier ? 'แก้ไขข้อมูลซัพพลายเออร์ (Edit Supplier)' : 'เพิ่มซัพพลายเออร์ใหม่ (Add New Supplier)'}
            </h3>
            <p className="text-xs text-slate-400">
              {supplier ? `กำลังปรับปรุงข้อมูลของ ${supplier.name}` : 'ลงทะเบียนบริษัทผู้ให้บริการเรือ/ทัวร์ใหม่เข้าสู่ระบบ'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                ชื่อบริษัท / ซัพพลายเออร์ <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น SeaStar Andaman, Raya Princess"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                รหัสย่อซัพพลายเออร์ (Code) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น SEASTAR, RAYA, PHKBOAT"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-amber-300 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>ชื่อผู้ติดต่อ / เซลล์ดูแลงาน</span>
              </label>
              <input
                type="text"
                placeholder="เช่น คุณสมชาย (ฝ่ายขาย)"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                <span>เบอร์โทรศัพท์ติดต่อ</span>
              </label>
              <input
                type="text"
                placeholder="081-234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>LINE ID</span>
              </label>
              <input
                type="text"
                placeholder="@seastar, seastar_booking"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>อีเมล (Email)</span>
              </label>
              <input
                type="email"
                placeholder="booking@seastar.co.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>ที่อยู่สำนักงาน / ท่าเรือที่ขึ้นเรือ</span>
            </label>
            <input
              type="text"
              placeholder="เช่น ท่าเรือรอยัลภูเก็ตมารีน่า หรือ ท่าเรือวิสิษฐ์พันวา"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Bank Payout Info */}
          <div className="bg-slate-950/80 border border-amber-500/30 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <CreditCard className="w-4 h-4" />
              <span>ข้อมูลบัญชีธนาคารสำหรับโอนจ่ายเงินทุน (Payout / Settlement)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">ธนาคาร</label>
                <input
                  type="text"
                  placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">เลขที่บัญชี</label>
                <input
                  type="text"
                  placeholder="123-4-56789-0"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-300 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">ชื่อบัญชี</label>
                <input
                  type="text"
                  placeholder="บจก. ซีสตาร์ อันดามัน"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>หมายเหตุเพิ่มเติม</span>
              </label>
              <input
                type="text"
                placeholder="เช่น เงื่อนไขการยกเลิกทริป, เบอร์ฉุกเฉินกัปตัน..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">สถานะพร้อมเปิดงาน</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full p-3 rounded-xl font-bold transition flex items-center justify-center gap-2 border ${
                  isActive
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{isActive ? 'ใช้งานปกติ (Active)' : 'ปิดใช้งาน (Inactive)'}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition border border-slate-700"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกข้อมูลซัพพลายเออร์</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
