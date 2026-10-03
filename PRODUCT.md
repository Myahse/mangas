# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Monorepo: **React + Vite** (reader `front/`, creator `creator-panel/`, admin `admin-panel/`, support, finance, ads panels), **Spring Boot (Java)** API (`backend/mangafrik/`), **PostgreSQL**, **Flutter** reader (`mobile/`) and creator studio (`mobile-creator/`). Local orchestration via `scripts/start-all.ps1`.

## Users

- **Readers** discover and read African manga/webtoons, follow creators, and use account features (library, community-oriented flows per product docs).
- **Creators** submit series, upload normalized episode pages, publish chapters, and track publication status.
- **Operators** (admin, support, finance, ads roles) moderate submissions, manage catalog/users, and run internal panels.

## Product Purpose

MangAfric is a community platform for **African manga and webtoons**: a catalog and reading experience for audiences, plus creator tooling to publish work and go through **moderation before catalog visibility**. Success means creators can ship readable chapters with consistent assets, readers can find and read approved series, and staff can review real content (covers + pages), not metadata alone.

## Positioning

Focus on **African-created serial art** with an integrated path from **creator upload → admin review → public catalog** (and parallel internal panels), rather than a generic file host or Western-centric manga aggregator.

## Design system

Visual tokens and panel-specific accents are documented in **`DESIGN.md`** (Impeccable) with sidecar **`.impeccable/design.json`**. Surface briefs for reader, creator episodes, and admin moderation live under **`.impeccable/surfaces/`**.

## Operating Context

- Multiple web apps share one API (`/api/v1`) and object storage for images (episode pages, thumbnails).
- Creator episode assets target defined formats (e.g. 800×1280 JPEG pages; square/vertical series thumbs).
- Dev: API ~8088; reader ~5173; creator panel ~5174; other panels on dedicated ports (see launcher script).
- Documentation also uses the name **WebGas** in older files (`OVERVIEW.md`, `PROJECT.md`); repo and primary branding in README is **MangAfric**.

## Capabilities and Constraints

**Shipped / in progress (repository evidence):**

- Reader web app: browse, account, become-creator flows.
- Creator panel: series submission, episode import (images, ZIP/CBZ, PDF), draft/publish, publications status.
- Admin: manga submissions review with content preview; catalog/content management.
- Backend: creator submissions, episodes, storage upload with server-side image normalization, admin moderation.

**Documented vision not fully verified in code:** real-time team editing, full social feed/messaging, wallet/coins flows may be partial—treat as roadmap unless implemented in target surface.

**Constraints:**

- Series moderation and episode publish are separate steps; creators should not re-enter series titles manually when context exists.
- Authentication and roles gate creator/admin APIs.

## Brand Commitments

- Product name: **MangAfric** (© notices in README).
- French-first UI copy in many creator/admin flows; i18n hooks exist on several panels.
- Do not invent testimonials, download numbers, or press claims not present in repo assets.

## Evidence on Hand

- `README.md`, `OVERVIEW.md`, `PROJECT.md` — product narrative and architecture (some WebGas naming).
- `scripts/start-all.ps1` — service map for local dev.
- No marketing screenshot or testimonial library path committed as canonical; use real uploads in storage for UI previews.

## Product Principles

1. **Show the work** — moderation and creator flows must surface actual pages and covers, not titles alone.
2. **One API, many surfaces** — reader, creator, and admin stay consistent on submissions and catalog state.
3. **Creator respect** — avoid duplicate data entry; persist series/episode context across sessions.
4. **Format discipline** — normalize uploads for reliable reading on web and mobile.
5. **Honest scope** — distinguish live features from vision docs when designing or shipping UI.

## Accessibility & Inclusion

Mobile layouts use shared breakpoints (~900px) for navigation chrome; aim for readable contrast and touch targets on creator/admin panels. No separate a11y standard beyond product-specific needs was recorded—**undecided** for WCAG target level.
