import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import { applyAppearanceToDom, useAppearanceStore } from './stores/appearanceStore';
import { isDebugUiEnabled, logUi } from './utils/debugUi';

async function bootstrap() {
  try {
    localStorage.removeItem('auth-storage');
  } catch {
    /* ignore */
  }
  if (isDebugUiEnabled()) {
    logUi('bootstrap', 'app-start', { href: typeof window !== 'undefined' ? window.location.href : '' });
  }
  await useAuthStore.persist.rehydrate();
  await useAppearanceStore.persist.rehydrate();
  applyAppearanceToDom(useAppearanceStore.getState().appearance);
  await useAuthStore.getState().initAuth();
}

void bootstrap().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});
