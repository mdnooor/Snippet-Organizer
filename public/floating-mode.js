// CSP-INLINE-01: floating-mode early class application.
// Extracted from an inline <script> in popup.html — MV3 CSP (`script-src 'self'`)
// blocks inline scripts, so this ships as a packaged external file instead.
// Loaded as a classic (non-module) script from <head> so it executes
// synchronously before first paint, preserving the original inline timing:
// `document.documentElement` exists; `document.body` does not yet (hence the
// optional-chaining no-op, identical to the previous inline behavior).
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'floating') {
  document.documentElement.classList.add('floating');
  document.body?.classList.add('floating');
}
