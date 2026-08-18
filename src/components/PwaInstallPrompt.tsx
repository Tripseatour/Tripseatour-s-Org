import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, Sparkles, Check, Info } from 'lucide-react';

interface PwaInstallPromptProps {
  currentLang?: string;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ currentLang = 'TH' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed PWA)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if previously dismissed in this session
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Capture beforeinstallprompt event for Android / Chrome / Edge / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if beforeinstallprompt wasn't triggered yet
      alert('สามารถกดปุ่มตัวเลือกเมนูของเบราว์เซอร์ (3 จุด) แล้วเลือก "ติดตั้งแอป" หรือ "เพิ่มไปยังหน้าจอโฮม" ได้เช่นกันครับ');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone) {
    return null; // Already running inside installed PWA
  }

  return (
    <>
      {/* Toast Banner for Installation */}
      {!isDismissed && (isInstallable || isIos) && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-white rounded-2xl p-4 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg border border-cyan-400/30">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="font-extrabold text-sm text-white">ติดตั้งแอป TripSea Tour</h4>
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> PWA
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    ติดตั้งแอปบนหน้าจอมือถือ/คอมพิวเตอร์ เพื่อเข้าใช้งาน จองทัวร์ และเช็คสถานะได้อย่างรวดเร็ว
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center gap-2 justify-end">
              <button
                onClick={handleDismiss}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition"
              >
                ไว้ทีหลัง
              </button>
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-cyan-900/40 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{isIos ? 'ดูวิธีติดตั้งบน iPhone' : 'ติดตั้งแอปทันที'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {installedSuccess && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-900/90 text-emerald-100 border border-emerald-500/50 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in">
          <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-xs">ติดตั้งแอป TripSea Tour สำเร็จ!</p>
            <p className="text-[11px] text-emerald-300">คุณสามารถเข้าใช้งานผ่านไอคอนหน้าจอโฮมได้แล้วครับ</p>
          </div>
        </div>
      )}

      {/* iOS Installation Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-white relative">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">วิธีติดตั้งบน iPhone / iPad</h3>
                <p className="text-xs text-slate-400">ผ่านเบราว์เซอร์ Safari</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-300 font-bold flex items-center justify-center shrink-0 border border-cyan-500/40 text-[11px]">1</span>
                <p>
                  กดปุ่มแชร์ <span className="inline-flex items-center gap-1 font-bold text-cyan-400"><Share className="w-3.5 h-3.5 inline" /> Share</span> ที่แถบล่างสุดของ Safari
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-300 font-bold flex items-center justify-center shrink-0 border border-cyan-500/40 text-[11px]">2</span>
                <p>
                  เลื่อนเมนูลงมาแล้วเลือก <span className="inline-flex items-center gap-1 font-bold text-amber-300"><PlusSquare className="w-3.5 h-3.5 inline" /> เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</span>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-300 font-bold flex items-center justify-center shrink-0 border border-cyan-500/40 text-[11px]">3</span>
                <p>
                  กดปุ่ม <span className="font-bold text-emerald-400">"เพิ่ม" (Add)</span> ที่มุมขวาบนของหน้าจอ
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
            >
              เข้าใจแล้ว ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
};
