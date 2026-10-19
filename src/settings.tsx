import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsView } from './components/SettingsView';
import './index.css';

function SettingsPage() {
  return (
    <div className="glass-app-bg min-h-screen w-full flex items-center justify-center p-4 sm:p-8 select-none">
      {/* Decorative ambient background accents matching the red glass theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-rose-300/30 via-red-200/20 to-transparent blur-3xl" />
        <div className="absolute top-[20%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-bl from-rose-400/25 via-red-200/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-[15%] left-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-red-300/30 via-rose-200/20 to-transparent blur-3xl" />
      </div>

      <div className="glass-clay-surface relative z-10 w-full max-w-2xl overflow-hidden flex flex-col h-[640px] max-h-[92vh]">
        <SettingsView onClose={() => window.close()} isModal={false} />
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <SettingsPage />
    </React.StrictMode>
  );
}
