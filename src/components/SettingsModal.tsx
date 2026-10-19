import React from 'react';
import { SettingsView } from './SettingsView';
import { Preferences } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  preferences?: Preferences;
  onClose: () => void;
  onUpdatePreferences?: (patch: Partial<Preferences>) => void;
  onDataChange?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChange,
}) => {
  if (!isOpen) return null;

  return (
    /* SETTINGS-ISO-01: transparent full-surface container — NO own background and NO
       own clay surface. The single flat red gradient is the app root's glass-app-bg
       (popup.tsx) and the single raised glass-clay-surface is MainPopup's root, both
       of which this container sits inside (fixed inset-0 resolves against the surface).
       rounded-[26px] + overflow-hidden preserve the exact corner clipping the previous
       inner card provided, without painting any square-cornered layer over the
       surface's rounded silhouette (no more corner fragments) and without leaving a
       semi-transparent stack for the main popup content to ghost through (the popup
       content is display:none while Settings is open). */
    <div className="fixed inset-0 z-50 overflow-hidden rounded-[26px] animate-in fade-in duration-150 select-none">
      <SettingsView onClose={onClose} isModal={true} onDataChange={onDataChange} />
    </div>
  );
};
