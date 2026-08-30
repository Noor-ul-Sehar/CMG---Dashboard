# Phase 12 — Final UI/UX & Real-World Usability Polish

## Objective
Close the remaining real-world usability gaps in the CMG Case Management
dashboard and apply a final layer of professional polish, accessibility, and
responsive refinement — without changing backend logic, permissions, or data.

## UI Improvements Delivered

### 1. Real Search page (was a broken placeholder)
- `/search` previously rendered a "coming soon" placeholder while the header
  search box and the "Search Cases" nav item both sent users to
  `/search?q=...`. This was a dead end.
- Replaced with the shared `CasesView` (full-text `q`, status, team,
  investigator, brand filters, and pagination). The header search now works
  end-to-end.

### 2. Dashboard
- **Clickable KPI cards** — each stat card links to the matching filtered view
  (Total → `/cases`, Open → `/cases/open`, Pending / Pending Review →
  `/cases/pending`, On Hold → `/cases?status=on_hold`, Closed → `/cases/closed`).
- **Cases by Investigator** summary card added (the data was already fetched
  by `getDashboardStats` but never displayed).
- **Cases by Team** rows are now links into `/cases?team=<id>`.
- **Recent cases** table rows are clickable via a stretched-link overlay.
- **Important Pending Items** are now links to their case profiles.
- "View all →" links added to Recent Cases and Important Pending Items.

### 3. Cases lists (All / Open / Closed / Pending)
- Whole rows are clickable (stretched-link overlay, no client JS needed),
  with a richer empty state ("No cases match the current filters").

### 4. Enforcement page (was a "coming soon" placeholder)
- Real read-only overview: KPI cards per enforcement status (Pending,
  In Progress, Escalated, Completed) plus a table of every case with an
  enforcement action recorded, with clickable rows to case profiles.
- Backed by a new `listEnforcementCases()` service (read-only).

### 5. Settings page (was a "coming soon" placeholder)
- Now shows **My Account** (name, email, role, team, last login), a
  **Security** card linking to Change Password, and an **About** card with
  system information.

### 6. Import wizard
- Added a visible 4-step indicator (Upload → Mapping → Validation → Result)
  with completed-step checkmarks and an `aria-current` current step.

### 7. Accessibility
- **Modal**: now `role="dialog"` + `aria-modal="true"`, `aria-labelledby`
  (stable `useId`), initial focus, Escape-to-close, Tab focus trap, scroll
  lock, and focus restore to the trigger.
- **Global focus visibility**: `:focus-visible` outline for all interactive
  elements in `globals.css`.
- Header search input now has an `aria-label`; rows are keyboard-accessible
  (the stretched link is a real anchor).
- Accessible KPI-card and bar links with `focus-visible` outlines.

### 8. Cleanup
- Removed the now-unused `PlaceholderPage` component.

## Files Modified
| File | Change |
| --- | --- |
| `src/app/(app)/search/page.tsx` | Real search via `CasesView` |
| `src/app/(app)/enforcement/page.tsx` | Enforcement overview (replaced placeholder) |
| `src/app/(app)/settings/page.tsx` | Account + system info (replaced placeholder) |
| `src/app/(app)/dashboard/page.tsx` | Clickable KPIs, investigator summary, view-all links, clickable rows |
| `src/components/ui/data-table.tsx` | Optional `rowHref` stretched-link overlay |
| `src/components/ui/stat-card.tsx` | Optional `href` → clickable KPI card |
| `src/components/ui/modal.tsx` | Dialog semantics, focus trap, Escape, scroll lock |
| `src/components/cases/cases-view.tsx` | Clickable rows, richer empty state |
| `src/components/import/import-wizard.tsx` | Step indicator |
| `src/components/layout/header.tsx` | `aria-label` on search input |
| `src/lib/services/case-service.ts` | Added `listEnforcementCases()` (read-only) |
| `src/lib/services/dashboard-service.ts` | by-team/by-investigator now include `id` for filtered links |
| `src/types/index.ts` | `DashboardStats` distribution rows carry `id` |
| `src/app/globals.css` | Global `:focus-visible` styles |
| `src/components/ui/placeholder-page.tsx` | **Removed** (no longer used) |

## Preserved Functionality
- No backend endpoints changed. The only backend additions are two read-only
  queries (`listEnforcementCases`, and `id` added to dashboard distribution
  queries).
- No permissions, roles, or auth logic touched. RBAC verified at runtime:
  - `reporting` / `viewer` roles are redirected away from `/import` and
    `/users` (correct — they lack those capabilities).
  - All view-level pages (dashboard, cases, search, teams, investigators,
    reports, enforcement, settings) remain accessible to lower-privilege roles.
- Import wizard logic untouched — only a visual step indicator added.

## Accessibility & Responsiveness Checks
- Keyboard: global `:focus-visible` outlines; table rows are real anchors;
  modal traps Tab and closes on Escape; focus is restored on close.
- Screen readers: modal `role`/`aria-modal`/`aria-labelledby`; header search
  labelled; KPI links carry descriptive `aria-label`.
- Responsive: existing responsive grids retained; new layouts use the same
  breakpoint system; the step indicator collapses labels on small screens.

## Database Integrity & Data Safety
- No reset, truncate, reseed, or schema change was performed.
- Verified row counts before/after Phase 12 (unchanged):
  cases **16**, users **6**, teams **5**, investigators **9**, remarks **9**,
  reviews **6**, case_documents **5**, import_batches **0**.
- No test cases, remarks, documents, or import batches were created. Only
  ordinary login sessions were used for smoke testing and were logged out.

## Build / Type / Lint
- `npm run build` — ✅ passed
- `npx tsc --noEmit` — ✅ exit 0
- `npm run lint` — ✅ no errors (fixed 1 tsc error, 2 react-hooks ref lint
  errors during the pass)

## Runtime Smoke Test
Started `npm start`, logged in as `reporting`, `viewer`, and `manager`, and
verified (HTTP 200 unless noted):
- Dashboard, All/Open/Pending/Closed cases, Search (`/search?q=CMG` returns
  real results), Teams, Investigators, Reports, Enforcement, Settings.
- Case profile (`/cases/1`) renders with documents.
- Clickable rows present on cases lists and dashboard (stretched-link anchor).
- Dashboard KPI/team/investigator/pending links resolve to correct filtered
  views (spot-checked `/cases?team=1` and `/cases?status=on_hold`).
- Import wizard shows the step indicator for a manager.
- `/import` and `/users` redirect to `/dashboard` for non-privileged roles.
- Logout works; server log shows no errors.