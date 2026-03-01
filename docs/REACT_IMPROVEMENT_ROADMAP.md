# React Improvement Roadmap — Production-Safe (Phase 1–3)

**Purpose:** Task-oriented checklist for the dev team. No live code is modified in production; all steps are **document, verify, or plan** only. Implementation happens in feature branches after sign-off.

**Audience:** Senior React architect / dev team lead.

---

## How to Use This Roadmap

| Priority | Meaning |
|----------|--------|
| **1** | High — address soon; impacts correctness, leaks, or critical UX |
| **2** | Medium — improves performance or maintainability |
| **3** | Low — nice-to-have; tech debt or future scalability |

**Production-safe:** Each step is either (a) documentation, (b) verification/audit, or (c) planning/design. Code changes are done in separate branches and released after QA.

---

## Phase 1: Quick Wins (Document & Verify)

*Low-risk, high-value: documentation, dependency checks, and verification.*

| Step | Area / Component | Description of Safe Action | Priority | Acceptance Criteria / Checkpoints |
|------|------------------|----------------------------|----------|-----------------------------------|
| **1.1** | **Dependencies** | Document current React, React-DOM, and build-tool versions in a single `docs/DEPENDENCIES.md`. Note any deprecated or insecure packages from `npm audit`. | **1** | File exists; versions listed; audit findings (if any) summarized with severity. |
| **1.2** | **useEffect dependency arrays** | Audit all `useEffect` calls across `App.tsx`, views (`CustomerView`, `MerchantView`, `AdminView`, `BrokerView`), and key components (`Auth`, `Layout`). Document each effect’s intent and list any missing or stale dependencies. Do not change code. | **1** | Checklist or table: file, effect purpose, dependency array, “OK” or “needs review” with reason. |
| **1.3** | **Event listener & subscription cleanup** | Search for `addEventListener`, `setInterval`, `setTimeout`, subscriptions (e.g. store/event bus). Document which have cleanup in `useEffect` return and which do not. | **1** | List of locations with “has cleanup” / “missing cleanup”; risk level (memory leak / stale callback) noted. |
| **1.4** | **Prop drilling map** | Document main data flows: e.g. `lang`, `user`, `cart`, `onTabChange`, `onRefresh` from `App` → Layout → Views. Identify the deepest propagation and list components that only pass props through. | **2** | One-page diagram or table showing “source → intermediate → consumer” for main props. |
| **1.5** | **Translation keys** | Verify that all user-facing strings in `PublicWebsite`, `ComingSoonHero`, and `Auth` use translation keys (e.g. `t.hero.join`, `t.comingSoon.earlyAccess`) and that no hardcoded AR/EN/HE strings remain in critical UI. Document exceptions. | **2** | List of files and any hardcoded strings that should be moved to `translations`. |
| **1.6** | **Accessibility (a11y)** | Quick audit: document presence of `aria-label`, `role`, and focus management in modals (e.g. Auth, Checkout, Merchant terms). List forms missing `htmlFor`/`id` or visible focus styles. | **2** | Bullet list of a11y gaps by screen/component; no code change. |

---

## Phase 2: Performance (Measure & Plan)

*Focus on re-renders, bundle size, and runtime performance—verify first, then plan.*

| Step | Area / Component | Description of Safe Action | Priority | Acceptance Criteria / Checkpoints |
|------|------------------|----------------------------|----------|-----------------------------------|
| **2.1** | **Re-render hotspots** | Document which top-level components receive frequently changing props (e.g. `cart`, `user`, `currentView`). List child components that are large (e.g. `CustomerView`, `MerchantView`) and could be memoized later. | **1** | Table: component, main props, “candidate for React.memo / useMemo” (yes/no) and brief reason. |
| **2.2** | **Expensive computations** | Identify `useMemo`/`useCallback` usage across views and services. Document any heavy work (filtering, sorting, mapping) done on every render without memoization. | **1** | List of computations (with file/location) and recommendation: “already memoized” or “add useMemo/useCallback in branch X”. |
| **2.3** | **Route/code splitting** | List all lazy-loaded routes (if any) and document which views are loaded eagerly (e.g. `AdminView`, `MerchantView`, `BrokerView`, `PublicWebsite`). Produce a short plan for splitting by route (e.g. `React.lazy` + `Suspense` per role or hash). | **2** | Plan doc: current load map, proposed chunks, fallback UI; no implementation in main. |
| **2.4** | **Bundle size baseline** | Run production build and record bundle size (e.g. main chunk, vendor). Document which libraries contribute most (e.g. recharts, date-fns, auth). | **2** | Numbers in `docs/BUNDLE_BASELINE.md`; optional: link to source-map or bundle analyzer output. |
| **2.5** | **API call patterns** | Document where API calls run (e.g. in `useEffect` on mount, on tab switch, on user action). List duplicate or redundant calls (same endpoint called from multiple places or on every render). | **2** | Table: endpoint/source, trigger, “single source” or “duplicate”; suggest consolidation in a later branch. |
| **2.6** | **Store subscriptions** | Document how views subscribe to `marketStore` (or global state). Identify components that re-render on any store change vs. only on specific slices. | **3** | Short doc: subscription points and “broad” vs “narrow” subscription; recommendation for selectors if applicable. |

---

## Phase 3: Architecture (Design & Document)

*Longer-term: state shape, testing, and structure—design only.*

| Step | Area / Component | Description of Safe Action | Priority | Acceptance Criteria / Checkpoints |
|------|------------------|----------------------------|----------|-----------------------------------|
| **3.1** | **State ownership** | Document where critical state lives: auth (e.g. `App` + localStorage), cart (e.g. `useCart` + backend), view/hash (e.g. `App` + `applyHashToState`). List any conflicting sources of truth. | **1** | One-page “state map”: state name, owner component/hook, sync mechanism (e.g. localStorage, API), conflicts if any. |
| **3.2** | **Error boundaries** | Verify presence and placement of React error boundaries. Document which trees are wrapped and what fallback UI is shown. Plan where to add boundaries (e.g. per view or per role). | **1** | List of existing boundaries + planned locations; no code in main. |
| **3.3** | **Custom hooks extraction** | List view components with large logic (e.g. `CustomerView` checkout/shipping, `MerchantView` product form, `Auth` flows). Produce a short plan: which hooks to extract (e.g. `useCheckoutForm`, `useMerchantProducts`), and what would remain in the UI component. | **2** | Plan doc: component → proposed hook name + responsibilities; no extraction in main. |
| **3.4** | **Testing strategy** | Document current test coverage (if any) and list critical paths: login, merchant registration, checkout, admin actions. Propose which flows to cover first (e.g. auth, add to cart, place order) and with what (unit vs integration). | **2** | `docs/TESTING_STRATEGY.md`: scope, tools, priority flows; no new tests in main until approved. |
| **3.5** | **Folder structure alignment** | Compare current structure with any existing refactor doc (e.g. `CLEAN_CODE_REFACTOR.md`). List discrepancies (e.g. services vs api, hooks location, view subfolders). Propose a migration order (by module) without moving files yet. | **3** | Table: current path vs target path; optional: “Phase A/B/C” migration order. |
| **3.6** | **Types and API contracts** | Document where API response types are defined and whether they match backend. List any `any` or loose types in key flows (auth, cart, checkout, products). Plan a single source of truth for API types (e.g. shared types file or codegen). | **3** | List of files and types; short “API types strategy” paragraph; no type changes in main. |

---

## High-Priority Summary (Immediate Attention)

| Step | Area | Why High Priority |
|------|------|-------------------|
| **1.2** | useEffect dependencies | Incorrect deps can cause stale closures, duplicate requests, or missed updates. |
| **1.3** | Cleanup (listeners, timers) | Prevents memory leaks and unexpected behavior after unmount. |
| **2.1** | Re-render hotspots | Large views re-rendering often can hurt UX on low-end devices. |
| **2.2** | Expensive computations | Unmemoized work on every render can cause jank. |
| **3.1** | State ownership | Clarifies where to fix bugs and add features without conflicts. |
| **3.2** | Error boundaries | Ensures one failing component does not blank the whole app. |

---

## Suggested Execution Order

1. **Week 1:** Complete Phase 1 (all steps). Produce the dependency doc, useEffect audit, cleanup audit, and prop-drilling map.
2. **Week 2:** Complete Phase 2 (steps 2.1–2.5). Deliver re-render memo plan, bundle baseline, and API-call consolidation notes.
3. **Week 3:** Complete Phase 3 (steps 3.1–3.4). Deliver state map, error-boundary plan, hook-extraction plan, and testing strategy.
4. **Ongoing:** Use this roadmap in sprint planning. Each **implementation** of a planned change is done in a separate branch and merged after review and QA; this document remains the single source of “what to do” and “what to verify.”

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| (Initial) | — | Roadmap created; production-safe, no live code changes. |
