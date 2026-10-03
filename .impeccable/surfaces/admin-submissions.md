# Surface brief: Admin manga submissions (`admin-panel/`)

<!-- impeccable:surface-brief 1 -->

**Mode:** Operate

**Job and audience:** Moderators review creator series submissions with full visual evidence before approve / reject / resubmit.

**Outcome:** See square + vertical covers, summary, episode page grids; approve updates status and catalog; refresh reflects state.

**Scope:** `admin-panel/src/features/moderation`, Content catalog list.

**States:** Pending filter; expanded content panel; lightbox page view; API errors on episode endpoints (non-blocking).

**Interaction:** View manga content expander; wrapping page grid; Approve with success toast; Refresh list.

**Constraints:** Admin role; `apiAssetUrl` for storage paths; pink admin primary distinct from reader.

**Anti-goals:** Metadata-only review rows; horizontal scroll for pages.
