import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';

// Register SW with periodic update checks (every 60 s)
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => { registration.update(); }, 60 * 1000);
    }
  },
});

// Auto-reload when a new service worker takes control
if ('serviceWorker' in navigator) {
  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    const toast = document.createElement('div');
    toast.textContent = '🔄 Nueva versión disponible — actualizando...';
    Object.assign(toast.style, {
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)', background: '#0D9A5E',
      color: 'white', padding: '12px 24px', borderRadius: '8px',
      zIndex: '9999', fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(toast);
    setTimeout(() => window.location.reload(), 1500);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
