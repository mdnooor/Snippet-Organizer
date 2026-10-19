import React from 'react';

/**
 * GOOGLE-DRIVE-LOGO-01 (turn 19) — Official Google Drive product logo as an
 * inline SVG. Replaces the turn-17 generic Google "G" (`GoogleLogo.tsx`,
 * removed): this extension integrates ONLY with Google Drive, so the
 * Drive-specific triangular logo is the accurate brand mark.
 *
 * Vector data follows the official Google Drive logo geometry (the 2020
 * tricolor "Drive" triangle; viewBox 0 0 87.3 78) with its canonical brand
 * colors — no dependency, no runtime request, scales crisply at any size.
 * `aria-hidden` is intentional: the surrounding footer element is a live
 * `role="status"` region whose text label carries the accessible meaning.
 */
export const GoogleDriveLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 87.3 78"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA" />
    <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00AC47" />
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335" />
    <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D" />
    <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC" />
    <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00" />
  </svg>
);
