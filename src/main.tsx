import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Development check for multiple React instances
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const reactInstances = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers || new Map();
  if (reactInstances.size > 1) {
    console.warn('Multiple React instances detected! This may cause hooks to break.');
  }
}

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
