# Surface brief: Creator episodes (`creator-panel/`)

<!-- impeccable:surface-brief 1 -->

**Mode:** Operate

**Job and audience:** Approved or pending creators upload episode pages, save drafts, publish chapters for a series already registered.

**Outcome:** Series title auto-restored; pages visible (local + server); publish succeeds with normalized JPEG pages; status visible under Publications.

**Scope:** `creator-panel/src/features/episodes`, Publications, Series create flow.

**States:** Importing/converting files; archive ZIP/PDF; server-only pages reload; publish blocked with listed reasons; saving.

**Interaction:** Sticky bottom bar (Brouillon / Publier); server episode cards with “Afficher dans l'éditeur”; 5:8 thumb grid; preview PC/mobile.

**Constraints:** 20MB / 100 files quota; episode_page normalization; auth CREATOR role.

**Anti-goals:** No retyping series title; no empty uploader when admin can see pages.
