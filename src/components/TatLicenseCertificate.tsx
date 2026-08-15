import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  ExternalLink,
  ZoomIn,
  X,
  FileCheck,
  CheckCircle,
  Building,
  Calendar,
  MapPin,
  UserCheck,
  Printer,
  Download
} from 'lucide-react';

interface TatLicenseCertificateProps {
  currentLang: string;
  className?: string;
  showFullDocument?: boolean;
}

export const TatLicenseCertificate: React.FC<TatLicenseCertificateProps> = ({
  currentLang,
  className = '',
  showFullDocument = true
}) => {
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [modalViewTab, setModalViewTab] = useState<'image' | 'formatted'>('image');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main License Card Showcase */}
      <div className="bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 border-2 border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        {/* Certificate Badge Ribbon */}
        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[11px] font-extrabold px-5 py-2 rounded-bl-2xl uppercase tracking-wider shadow-sm flex items-center gap-1.5 z-10">
          <Award className="w-3.5 h-3.5 text-amber-200" />
          <span>แบบ ธ.1 • เอกสารต้นฉบับ</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Certificate Document Thumbnail / Interactive Preview */}
          <div className="w-full lg:w-5/12 flex flex-col items-center">
            <div
              onClick={() => {
                setModalViewTab('image');
                setIsZoomModalOpen(true);
              }}
              className="group relative cursor-pointer w-full max-w-sm bg-white p-2 rounded-2xl border-2 border-slate-300 shadow-md hover:shadow-2xl hover:border-teal-500 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              {/* Actual Document Image Frame */}
              <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-[3/4] border border-slate-200 shadow-inner">
                <img
                  src="/tat_license_original.jpg"
                  alt="ใบอนุญาตประกอบธุรกิจนำเที่ยว ทริป ซี ทัวร์ เลขที่ 33/11100"
                  className="w-full h-full object-cover object-top filter brightness-[0.98] contrast-[1.02] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                  <ZoomIn className="w-3 h-3 text-amber-300" />
                  <span>ภาพสแกนต้นฉบับ</span>
                </div>
              </div>

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 text-white">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-lg">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold bg-slate-900/90 px-3 py-1.5 rounded-full shadow">
                  คลิกเพื่อดูใบอนุญาตฉบับเต็ม
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setModalViewTab('image');
                setIsZoomModalOpen(true);
              }}
              className="mt-3 text-xs font-extrabold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5 border border-teal-200/60"
            >
              <ZoomIn className="w-4 h-4 text-teal-600" />
              <span>{currentLang === 'TH' ? 'คลิกขยายดูรูปใบอนุญาตต้นฉบับ' : 'View High-Res Original Document'}</span>
            </button>
          </div>

          {/* Structured Official License Information */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-200 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>สถานะ: ได้รับอนุญาตถูกต้องตามกฎหมาย 100% (Active & Verified)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentLang === 'TH' ? 'ใบอนุญาตประกอบธุรกิจนำเที่ยว เลขที่ 33/11100' :
                 currentLang === 'EN' ? 'Official TAT Tourism Business License No. 33/11100' :
                 currentLang === 'ZH' ? '泰国国家旅游局官方特许营业执照 编号 33/11100' : 'Лицензия туроператора TAT № 33/11100'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === 'TH' ? 'ออกตามมาตรา 15 แห่งพระราชบัญญัติธุรกิจนำเที่ยวและมัคคุเทศก์ พ.ศ. 2551 โดยกรมการท่องเที่ยว สาขาภาคใต้ เขต 2' :
                 'Issued under Section 15 of the Tourism Business and Guide Act B.E. 2551 by the Department of Tourism, Southern Region Branch 2.'}
              </p>
            </div>

            {/* Detailed Spec Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ชื่อผู้รับใบอนุญาต</span>
                <strong className="text-slate-900 text-sm">นางสาว พรทิพย์ แดงทัด</strong>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ชื่อธุรกิจนำเที่ยว</span>
                <strong className="text-teal-700 text-sm">ทริป ซี ทัวร์ (TRIP SEA TOUR)</strong>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ประเภทธุรกิจนำเที่ยว</span>
                <strong className="text-slate-900">เฉพาะพื้นที่ (ภูเก็ตและทะเลอันดามัน)</strong>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">อายุใบอนุญาต (2 ปี)</span>
                <strong className="text-emerald-700 font-mono">7 ก.พ. 2569 ถึง 6 ก.พ. 2571</strong>
              </div>

              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ที่ตั้งสำนักงานจดทะเบียน</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  71/47 หมู่ที่ 2 ตำบลกะทู้ อำเภอกะทู้ จังหวัดภูเก็ต รหัสไปรษณีย์ 83120
                </p>
              </div>

              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ผู้ออกและลงนามในใบอนุญาต</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  (นางสาวเล็กคนางค์ ศิลลา) นายทะเบียนธุรกิจนำเที่ยวและมัคคุเทศก์ สาขาภาคใต้ เขต 2 • ออก ณ วันที่ 26 มกราคม 2569
                </p>
              </div>
            </div>

            {/* Official Portal Verification Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="https://esvcs.dot.go.th/e-service/LicenseInformationPage"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ตรวจสอบกับระบบกรมการท่องเที่ยว</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => setIsZoomModalOpen(true)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs transition border border-slate-300 flex items-center justify-center gap-2"
              >
                <ZoomIn className="w-4 h-4 text-slate-600" />
                <span>ดูรูปใบอนุญาตต้นฉบับ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* High-Resolution Zoom Lightbox Modal */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#faf9f5] rounded-3xl shadow-2xl border-4 border-amber-100 overflow-hidden my-auto">
            {/* Modal Top Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-extrabold text-sm text-white">ใบอนุญาตประกอบธุรกิจนำเที่ยว (แบบ ธ.1)</h4>
                  <p className="text-[10px] text-teal-300">TRIP SEA TOUR • ใบอนุญาตเลขที่ 33/11100</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Switcher */}
                <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
                  <button
                    onClick={() => setModalViewTab('image')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      modalViewTab === 'image'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>🖼️ ภาพสแกนต้นฉบับ</span>
                  </button>
                  <button
                    onClick={() => setModalViewTab('formatted')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      modalViewTab === 'formatted'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>📜 ข้อความพิมพ์</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsZoomModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            {modalViewTab === 'image' ? (
              <div className="p-4 sm:p-6 bg-slate-950/90 flex flex-col items-center justify-center min-h-[450px]">
                <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                  <img
                    src="/tat_license_original.jpg"
                    alt="รูปภาพใบอนุญาตประกอบธุรกิจนำเที่ยวฉบับจริง ทริป ซี ทัวร์"
                    className="w-full h-auto object-contain max-h-[70vh] mx-auto"
                  />
                  <div className="absolute top-3 right-3 bg-slate-900/85 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm border border-slate-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>ต้นฉบับทางการ 100%</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 text-center">
                  ภาพถ่ายสแกนใบอนุญาตประกอบธุรกิจนำเที่ยว แบบ ธ.1 ออกโดยกรมการท่องเที่ยว สาขาภาคใต้ เขต 2
                </p>
              </div>
            ) : (
              /* High-Def Rendered Certificate Body */
              <div className="p-6 sm:p-10 text-slate-900 space-y-6 relative select-text font-serif">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                  <span className="text-6xl font-black rotate-[-30deg]">TRIP SEA TOUR</span>
                </div>

                {/* Top Header */}
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-slate-400 font-sans font-bold">ต้นฉบับเอกสารทางการ</span>
                  <span className="border-2 border-slate-900 px-3 py-1 font-bold text-xs rounded font-sans">
                    แบบ ธ.1
                  </span>
                </div>

                {/* Garuda Emblem */}
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 mx-auto flex items-center justify-center text-slate-900">
                    <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current text-slate-900" aria-label="ตราครุฑ">
                      <path d="M50 8 C48 15, 42 20, 35 24 C28 28, 15 28, 8 36 C18 38, 28 35, 36 32 C30 40, 20 48, 10 56 C22 55, 34 49, 42 42 C40 50, 36 60, 30 70 C38 66, 44 58, 48 50 C49 60, 48 72, 44 84 C48 80, 52 74, 54 68 C56 74, 60 80, 64 84 C60 72, 59 60, 60 50 C64 58, 70 66, 78 70 C72 60, 68 50, 66 42 C74 49, 86 55, 98 56 C88 48, 78 40, 72 32 C80 35, 90 38, 100 36 C93 28, 80 28, 73 24 C66 20, 60 15, 58 8 Z" />
                      <circle cx="50" cy="22" r="6" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold text-slate-800">กรมการท่องเที่ยว</h2>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950">ใบอนุญาตประกอบธุรกิจนำเที่ยว</h1>
                </div>

                {/* Certificate Formal Text */}
                <div className="space-y-3.5 text-sm leading-relaxed border-t-2 border-b-2 border-slate-300 py-6">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span>ใบอนุญาต เลขที่</span>
                    <span className="font-extrabold text-base border-b-2 border-dotted border-slate-700 px-3 py-0.5 text-teal-800">
                      33/11100
                    </span>
                  </div>

                  <div className="leading-loose">
                    นายทะเบียนธุรกิจนำเที่ยวและมัคคุเทศก์ สาขาภาคใต้ เขต 2 <br />
                    ออกใบอนุญาตให้{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">นางสาว พรทิพย์ แดงทัด</span> <br />
                    ทะเบียนนิติบุคคลเลขที่ <span className="border-b border-dotted border-slate-600 px-4">-</span> <br />
                    ประกอบธุรกิจนำเที่ยวตามมาตรา 15 แห่งพระราชบัญญัติธุรกิจนำเที่ยวและมัคคุเทศก์ พ.ศ. 2551 <br />
                    ประเภท <span className="font-bold border-b border-dotted border-slate-600 px-2">เฉพาะพื้นที่</span> <br />
                    โดยใช้ชื่อเป็นภาษาไทยว่า{' '}
                    <span className="font-extrabold text-slate-950 border-b-2 border-dotted border-slate-700 px-2 text-base">
                      ทริป ซี ทัวร์
                    </span> <br />
                    หรือใช้ชื่อภาษาต่างประเทศว่า{' '}
                    <span className="font-extrabold text-slate-950 border-b-2 border-dotted border-slate-700 px-2 text-base font-sans">
                      TRIP SEA TOUR
                    </span> <br />
                    ซึ่งอ่านเป็นภาษาไทยว่า{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">ทริป ซี ทัวร์</span> <br />
                    สำนักงานตั้งอยู่เลขที่{' '}
                    <span className="font-medium border-b border-dotted border-slate-600 px-2">71/47 หมู่ที่ 2</span>{' '}
                    ตรอก/ซอย <span className="border-b border-dotted border-slate-600 px-2">-</span> ถนน <span className="border-b border-dotted border-slate-600 px-2">-</span> <br />
                    ตำบล/แขวง <span className="font-medium border-b border-dotted border-slate-600 px-2">กะทู้</span>{' '}
                    อำเภอ/เขต <span className="font-medium border-b border-dotted border-slate-600 px-2">กะทู้</span>{' '}
                    จังหวัด <span className="font-medium border-b border-dotted border-slate-600 px-2">ภูเก็ต</span>{' '}
                    รหัสไปรษณีย์ <span className="font-medium border-b border-dotted border-slate-600 px-2 font-sans">83120</span> <br />
                    ใบอนุญาตฉบับนี้มีอายุ 2 ปี นับตั้งแต่วันที่{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">7</span> เดือน{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">กุมภาพันธ์</span> พ.ศ.{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">2569</span> <br />
                    ถึงวันที่{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">6</span> เดือน{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">กุมภาพันธ์</span> พ.ศ.{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">2571</span>
                  </div>

                  <div className="text-right pt-2">
                    ออกให้ ณ วันที่{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">26</span> เดือน{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">มกราคม</span> พ.ศ.{' '}
                    <span className="font-bold border-b border-dotted border-slate-600 px-2">2569</span>
                  </div>
                </div>

                {/* Bottom Sign-off & QR Code */}
                <div className="flex items-end justify-between pt-2">
                  <div className="space-y-1 text-center">
                    <div className="h-10 flex items-center justify-center">
                      {/* Stylized official signature stroke */}
                      <span className="font-serif italic font-black text-xl text-slate-800">Lekkanang S.</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">(นางสาวเล็กคนางค์ ศิลลา)</div>
                    <div className="text-[11px] text-slate-600">นายทะเบียนธุรกิจนำเที่ยวและมัคคุเทศก์ สาขาภาคใต้ เขต 2</div>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="w-16 h-16 bg-white p-1 rounded-xl border-2 border-slate-800 shadow-sm mx-auto">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://esvcs.dot.go.th/e-service/LicenseInformationPage"
                        alt="TAT Official QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[9px] font-sans font-bold text-slate-500 block">สแกนตรวจสอบ</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>ตรวจสอบความถูกต้องได้โดยตรงกับกรมการท่องเที่ยว</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs border border-slate-300 transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>พิมพ์เอกสาร</span>
                </button>

                <a
                  href="https://esvcs.dot.go.th/e-service/LicenseInformationPage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดเว็บกรมการท่องเที่ยว</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
