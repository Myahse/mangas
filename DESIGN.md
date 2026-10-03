---
name: MangAfric
description: Community platform for African manga and webtoons — reader, creator, and operator surfaces.
colors:
  reader-primary: "#ff6a00"
  reader-primary-dark: "#e63946"
  reader-accent: "#e63946"
  creator-primary: "#2563eb"
  creator-accent: "#22c55e"
  admin-primary: "#ff2d7d"
  admin-primary-dark: "#e11d48"
  page-bg: "#f4f4f6"
  surface-bg: "#ffffff"
  text: "#111111"
  text-muted: "#888888"
  surface-border: "#e0e0e0"
  bg-dark: "#0d0d0d"
  bg-dark-2: "#1a1a1a"
typography:
  body:
    fontFamily: "'Lufga', Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontFamily: "'Lufga', Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 1000
    lineHeight: 1.2
  label:
    fontFamily: "'Lufga', Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 900
    letterSpacing: "0.06em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  container-pad: "20px"
  section-gap: "14px"
components:
  button-primary:
    backgroundColor: "{colors.reader-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.reader-primary-dark}"
    textColor: "#ffffff"
  surface-card:
    backgroundColor: "{colors.surface-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: MangAfric

## Overview

**Creative North Star: "The African Serial Shelf"**

MangAfric reads like a focused cultural bookstore plus studio: warm reader energy (orange–red), calm creator tooling (blue–green), and distinct operator chrome (pink–red admin). Density is **medium** — cards, tabs, and sticky actions for long forms (episode upload). Dark mode reuses the same semantic tokens (`--page-bg`, `--surface-bg`, `--nav-text`).

**Key characteristics:**

- CSS-variable theming per app shell; shared layout tokens (`--container-max: 1280px`, `--navbar-height: 64px`, mobile `--bottom-nav-height` at ≤900px).
- French-first copy on creator/admin; reader supports i18n.
- Operate-mode panels: surfaces, bold labels (800–1000 weight), primary CTAs full-width on mobile.

## Colors

Reader (`front/`) uses **MangAfric Flame** orange `#ff6a00` with **Ember** red `#e63946` for hover and accent. Creator panel uses **Studio Blue** `#2563eb` and **Growth Green** `#22c55e`. Admin overrides to **Moderation Pink** `#ff2d7d` / `#e11d48` in `admin-panel/src/styles/admin.css`. Neutrals: page `#f4f4f6`, surfaces `#ffffff`, muted text `#888888`.

### Primary

- **MangAfric Flame** (#ff6a00): Reader CTAs, links, active nav.
- **Studio Blue** (#2563eb): Creator panel primary actions.
- **Moderation Pink** (#ff2d7d): Admin primary buttons and KPI accents.

### Neutral

- **Shelf Gray** (#f4f4f6): Page background (light).
- **Panel White** (#ffffff): Cards and form surfaces.
- **Ink** (#111111): Body text (light mode).
- **Whisper** (#888888): Secondary labels and meta.

### Named Rules

**The Panel Identity Rule.** Each web shell keeps its own `--primary` override; do not copy reader orange into creator or admin without intentional unification.

## Typography

**Display / UI Font:** Lufga with Inter and system-ui fallback (defined on `body` in each app's `global.css`).

**Character:** Heavy titles (900–1000 weight), confident UI labels, comfortable 1.6 body line-height for French copy.

### Hierarchy

- **Title** (1000, ~1.7rem): Page H1 (`creator__title`, `pub__title`, admin section titles).
- **Label** (900, 0.75–0.92rem, often uppercase in nav tabs): Section headers, table heads.
- **Body** (400, 1rem, 1.6): Forms, help text, moderation reasons.

## Layout

- **Container:** `max-width: 1280px`, horizontal padding `20px`.
- **Mobile (≤900px):** Bottom tab navigation; footer hidden; info bar pinned top; safe-area insets on sticky bars.
- **Creator episode editor:** Two-column grid collapses to one column ≤980px; sticky publish bar above bottom nav.
- **Admin tables:** Full-width surfaces; moderation actions right-aligned on desktop.

## Elevation & Depth

Hybrid: light **card shadows** (`--card-shadow`, `--card-shadow-hover`) on surfaces; borders via `--surface-border`. Modals use `--panel-shadow` and `--overlay-bg`. No heavy neumorphism.

### Shadow Vocabulary

- **Card rest:** `0 2px 12px rgba(0,0,0,0.08)` (light).
- **Card hover:** `0 8px 24px rgba(0,0,0,0.14)`.
- **Panel / modal:** `0 12px 40px rgba(0,0,0,0.14)`.

## Shapes

- **Radius scale:** sm 6px, md 10px, lg 16px on cards and modals.
- **Episode thumbs:** 5:8 aspect ratio, `object-fit: cover`, 8–12px inner radius.
- **Dropzones:** Dashed border, 14px outer radius.

## Components

### Buttons

- **Shape:** `border-radius: var(--radius-sm)` to `12px` on panel buttons.
- **Primary:** Filled `--primary`, white text, font-weight 800–950.
- **Danger:** Light red wash background, red text (admin reject).
- **Sticky publish (creator):** Full-width bar, grid 1fr + 1.2fr for draft/publish.

### Cards / Containers

- **`.admin-surface` / `.ep__section` / `.pub__card`:** Bordered surface, 14–16px radius, 14–18px padding.

### Inputs

- **Style:** 1px `--surface-border`, 12px radius, transparent or subtle fill.
- **Read-only series field:** Tinted background when auto-filled from server.

### Navigation

- **Top:** Logo + language; desktop links.
- **Bottom (mobile):** Icon + label tabs, 56px + safe-bottom.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens (`--surface-bg`, `--nav-text`, `--primary`) instead of hard-coded hex in new components.
- **Do** show real uploaded page thumbnails in creator and admin moderation flows.
- **Do** keep touch targets ≥44px on mobile bottom nav and sticky CTAs.

### Don't:

- **Don't** scale full wordmark PNGs with extreme CSS `scale()` on admin logos (crop + blend instead).
- **Don't** use horizontal-only scroll strips for manga page review grids (use wrapping grids).
- **Don't** invent social proof, stats, or testimonials not in repo evidence.
