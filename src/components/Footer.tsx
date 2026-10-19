import React from 'react';
import { User } from 'lucide-react';
import { GoogleDriveLogo } from './GoogleDriveLogo';

interface FooterProps {
  developerName?: string;
  /**
   * PR-1: REAL Drive connection state, probed silently at popup open
   * (src/gdrive/connection.ts). Undefined hides the status line entirely.
   * This is a truthful connection indicator only — it is NOT a sync status
   * (no synchronization exists; GD-06 blocked). The GD-07 rule stands: only
   * real-state-backed status may be displayed.
   */
  driveStatus?: 'connected' | 'not-connected' | 'checking';
}

/**
 * Footer — developer attribution + optional REAL Drive connection status.
 *
 * GD-07 removed the fabricated "Synced / Last synced" block (no synchronization
 * exists — GD-06 verdict: blocked) and replaced it with attribution only.
 * PR-1 reintroduces a status line that is strictly backed by the silent
 * connection probe: "Google Drive connected" / "Google Drive not connected".
 * It never claims sync, progress, or freshness — only the verified connection.
 *
 * GOOGLE-DRIVE-LOGO-01 (turn 19): the turn-17 generic Google "G" is replaced
 * by the official Google Drive triangular logo (`GoogleDriveLogo.tsx`) — this
 * extension integrates ONLY with Google Drive, so the Drive-specific mark is
 * the accurate brand. It appears ONLY where a Google Drive connection is
 * actually being represented or checked:
 *  - connected → static Drive logo + existing "Google Drive connected" label
 *    (no continuous animation — connection alone is not activity);
 *  - checking (a REAL silent probe in flight — popup open or Refresh click)
 *    → the Drive logo with a subtle pulse (reduced-motion freezes it) + "Google Drive…";
 *  - not-connected → the previous neutral dot + label, so a disconnected
 *    state can never be misread as a Google-backed connection.
 * Labels and semantics are unchanged; no polling, no sync claims.
 */
export const Footer: React.FC<FooterProps> = ({ developerName = 'AKASH', driveStatus }) => {
  return (
    <footer
      className={`mt-3.5 pt-3 border-t border-slate-200/80 flex items-center text-xs select-none ${
        driveStatus ? 'justify-between' : 'justify-end'
      }`}
    >
      {/* Left side: PR-1 connection status — real-state backed (silent probe). */}
      {driveStatus ? (
        <div className="flex items-center gap-1.5 text-[12px] font-medium min-w-0" role="status">
          {driveStatus === 'connected' ? (
            <GoogleDriveLogo className="w-[15px] h-[14px] shrink-0" />
          ) : driveStatus === 'checking' ? (
            <GoogleDriveLogo className="w-[15px] h-[14px] shrink-0 animate-pulse motion-reduce:animate-none" />
          ) : (
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          )}
          <span className={driveStatus === 'connected' ? 'text-emerald-700' : 'text-slate-500'}>
            {driveStatus === 'connected'
              ? 'Google Drive connected'
              : driveStatus === 'checking'
                ? 'Google Drive…'
                : 'Google Drive not connected'}
          </span>
        </div>
      ) : null}
      {/* Right side: Developer attribution — FOOTER-SYMBOL-01: the previous love symbol
          (❤) was replaced with the same lucide User icon the About section uses beside
          its "Developed by AKASH" attribution (same size and brand red). */}
      <div className="text-slate-600 font-medium text-[12px] flex items-center gap-1">
        <User className="w-3.5 h-3.5 text-[rgb(240,85,88)]" aria-hidden="true" />
        <span>Developed by</span>
        <span className="font-bold text-slate-800">{developerName}</span>
      </div>
    </footer>
  );
};
