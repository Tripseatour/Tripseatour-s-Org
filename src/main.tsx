import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const isWebsocketError = (msg: string) => {
    const m = msg.toLowerCase();
    return m.includes('websocket') || m.includes('vite') || m.includes('ws:') || m.includes('wss:');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (isWebsocketError(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || event.error?.message || '');
    if (isWebsocketError(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('PWA Service Worker registered successfully:', reg.scope);
      }).catch((err) => {
        console.warn('PWA Service Worker registration failed:', err);
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

