# Surface brief: Reader (`front/`)

<!-- impeccable:surface-brief 1 -->

**Mode:** Read + Persuade (home/catalog persuade; reader operate)

**Job and audience:** Readers and prospective creators land on the public site to discover African manga, read chapters, manage account, and start creator onboarding.

**Outcome:** Find a series, open a chapter, or reach creator application — without broken mobile chrome (logo + language top, tabs bottom, no footer on mobile).

**Scope:** `front/src` — Navbar, InfoBar, Footer, library/manga routes, account/become-creator.

**States:** Empty library, loading API, auth modal, dark/light theme, mobile ≤900px.

**Interaction:** Search and filters on catalog; sticky header; bottom nav: Home, Library, Community paths per product docs.

**Constraints:** API `VITE_API_BASE_URL`; storage URLs absolute via api base; i18n on nav.

**Anti-goals:** No fake trending stats; no WebGas-only naming in new copy (prefer MangAfric).
