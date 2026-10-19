# Task Specification: UI-NEUMORPH-01 — Phase 1: Universal Soft Neumorphic Styling for Interactive UI Elements

**Task ID**: UI-NEUMORPH-01 `[SOURCE-VERIFIED]`  
**Status**: VERIFIED `[COMMAND-VERIFIED]`  
**Created**: 2026-10-15  

---

## 1. Objective & User Rationale

Implement a consistent, reusable soft-neumorphism interaction pattern across the Snippet Organizer Chrome Extension's interactive UI elements:
- **Default interactive state**: soft, dual-shadow raised neumorphic elevation.
- **Hover state**: subtle raised/glowing elevation emphasis.
- **Pressed/clicked state**: visible inset/pressed neumorphic shadow.
- **Persistently selected state**: remains inset for as long as the option is active/selected.
- **Unselected options**: remain softly raised.
- **Static logo container**: recessed/inset neumorphic appearance without adding interactive behavior.

---

## 2. Scope & Boundaries

### In Scope
- Core CSS utility tokens in `src/index.css`: `.nm-raised`, `.nm-inset`, `.nm-primary-inset`, `.nm-primary-raised`, `.nm-logo-container`, `.nm-icon-btn`, `.nm-icon-btn-inset`, `.nm-danger-raised`, `.nm-success-inset`, `.nm-dropdown-panel`, `.nm-menu-item-*`.
- Header: static logo container, pin/unpin button, plus button, settings button, close button.
- Search & Filters: All tab, Favorites tab, All Categories trigger, Category dropdown panel and items.
- Snippet Cards: copy button, 3-dot overflow menu trigger, popover menu items.
- Preview Modal: Back button, Favorite toggle, Edit button, Close button, Copy to clipboard CTA.
- Editor Modal: Header buttons, Category dropdown & New Category button, Color swatches, Rich text format toolbar buttons, Action buttons (Favorite, Duplicate, Delete), Cancel and Save buttons.
- Settings View: Navigation sidebar tabs, Theme segmented buttons, Default View select, Export/Import buttons, Trash batch and per-item buttons.
- Web Preview: Download Extension, How to Install, Reset Position, Reopen Popup/Floating Window buttons.

### Strictly Out of Scope
- No changes to viewport dimensions (`712 × 512 px` strictly preserved).
- No changes to database schemas, IndexedDB keys, or sync logic.
- No changes to existing service worker communication protocols.
- No Phase 2 textarea or input inset redesign (existing recessed inputs preserved).
