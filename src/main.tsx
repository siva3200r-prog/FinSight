import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Fix for "Cannot set property fetch of #<Window> which has only a getter"
try {
  const win = window as any;
  const descriptor = Object.getOwnPropertyDescriptor(win, 'fetch');
  if (descriptor && !descriptor.writable && !descriptor.set && descriptor.configurable) {
    Object.defineProperty(win, 'fetch', {
      value: win.fetch,
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
} catch (e) {}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
