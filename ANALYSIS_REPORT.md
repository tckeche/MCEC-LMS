# MCEC LMS Audit – Phase 1 Analysis Report

## Local setup/run commands
> Documented commands to run locally (not executed here):

```bash
npm install
npm run dev
```

## Architecture mapping

### Frontend routing
- **Routing library**: `wouter` (`client/src/App.tsx`).
- **Route definitions**:
  - Auth routes: `/auth/login`, `/auth/parent-signup`, `/auth/staff-proposal`, `/auth/staff-login`.
  - Role-specific Switches: `StudentRoutes`, `ParentRoutes`, `TutorRoutes`, `ManagerRoutes`, `AdminRoutes`.
  - `NotFound` component as catch-all for each Switch (`client/src/pages/not-found.tsx`).
- **NotFound handling**:
  - `NotFound` currently displays developer-only copy: “Did you forget to add the page to the router?”

### Navigation / sidebar
- **Nav links** defined in `client/src/components/layout/app-sidebar.tsx` via `navItems`.
- Links use `wouter` `Link` with relative paths (good for domain/HTTPS correctness).
- Admin navigation links exist but are only rendered when `effectiveRole` is `admin`.

### Environment/base URL logic
- No explicit frontend base URL constant found. Navigation is mostly relative.
- Direct `window.location.href` usage in:
  - `client/src/pages/auth/login.tsx` and `client/src/pages/auth/staff-login.tsx`.
  - `client/src/components/notification-bell.tsx` for `notification.link`.
- Backend uses `req.hostname` in `server/replitAuth.ts` to build HTTPS callback URLs.

### Hard-coded domains/protocols
- **No hard-coded domain strings** found in the client codebase via search.
- HTTPS is used in `server/replitAuth.ts` for OAuth callback URLs.
- The only explicit `http`/`https` references in client are placeholders.

### API contract mismatches (confirmed)
- **Manager dashboard**
  - UI expects `{ stats.averageGrade, tutorPerformance, recentCourses }`.
  - API returns `{ stats: { totalCourses, totalStudents, totalTutors }, courses, tutors, students }`.
  - Files: `client/src/pages/manager/dashboard.tsx`, `server/routes.ts` (`/api/manager/dashboard`).
- **Manager tutors page**
  - UI expects `tutorPerformance` but API does not provide it.
  - Files: `client/src/pages/manager/tutors.tsx`, `server/routes.ts` (`/api/manager/dashboard`).
- **Announcements page**
  - UI expects `{ announcements, courses }`, but API returns only an array of announcements.
  - Files: `client/src/pages/announcements.tsx`, `server/routes.ts` (`/api/announcements`).
- **Manager courses**
  - UI expects `/api/courses` to include `tutor` and `enrollmentCount` on each course, but API returns raw course rows.
  - Files: `client/src/pages/manager/courses.tsx`, `server/routes.ts` (`/api/courses`).

---

## Routing table – expected vs actual

| Area | Expected route (from nav/UX) | Actual route defined | Notes |
| --- | --- | --- | --- |
| Staff login tile | `/auth/staff-login` | `/auth/staff-login` | Route exists; 404 reports likely from navigation/hosting mismatch. |
| Manager courses detail | `/manager/courses/:courseId` | **Missing** | No route defined for manager course detail. |
| Admin routes | `/admin/*` | Defined in `AdminRoutes` | Should work for admin role only; may 404 for other roles or if routing not reachable. |
| Announcements | `/announcements` | Defined for tutor/manager/admin | New announcement is modal; no standalone “new” route. |
| Staff signup/proposal | `/auth/staff-proposal` | Defined | Works, but landing tile points to login. |

---

## Issue-by-issue analysis (in scope)

### Issue #1: Broken links due to domain mismatch (double-hyphen domain)
- **Root cause hypothesis**: Absolute navigation is being used somewhere (e.g., `window.location.href` or `notification.link`) and may carry a stale or incorrect domain/protocol from data or environment configuration.
- **Confirmed cause**:
  - No hard-coded domains found in the frontend code. Absolute navigation occurs in `window.location.href` usages and in `notification.link` (which is stored in the DB and may be absolute).
  - Likely mismatch stems from runtime data or from non-relative links (e.g., `notification.link` or login redirect payloads) rather than hard-coded strings.
- **Impacted files**:
  - `client/src/pages/auth/login.tsx`
  - `client/src/pages/auth/staff-login.tsx`
  - `client/src/components/notification-bell.tsx`
  - `server/replitAuth.ts` (callbackURL logic)
- **Fix plan**:
  - Replace absolute navigations with `wouter` `Link` or `setLocation` for in-app navigation.
  - Sanitize/normalize `notification.link` to be relative before navigation.
  - Avoid using `window.location.href` for internal navigation.

### Issue #2: Staff Sign In tile points to a 404 route
- **Root cause hypothesis**: The tile route is incorrect or the router cannot resolve `/auth/staff-login` on refresh.
- **Confirmed cause**:
  - The landing tile links to `/auth/staff-login`, which **is** defined in `client/src/App.tsx`.
  - If 404 occurs, it is likely due to host-level routing or domain mismatch rather than missing route.
- **Impacted files**:
  - `client/src/pages/landing.tsx`
  - `client/src/App.tsx`
- **Fix plan**:
  - Ensure `wouter` `Link` is used (already is).
  - Validate any external host redirects that could be sending users to a bad origin.
  - If a separate staff login route is intended (e.g., `/auth/staff-proposal`), align the tile accordingly.

### Issue #3: Manager dashboard shows totals but lists empty and “undefined %”
- **Root cause hypothesis**: API contract mismatch between `/api/manager/dashboard` and UI expectations.
- **Confirmed cause**:
  - API returns `courses`, `tutors`, `students` while UI expects `recentCourses` and `tutorPerformance`.
  - `stats.averageGrade` is missing in the API response, resulting in `undefined%`.
- **Impacted files**:
  - `client/src/pages/manager/dashboard.tsx`
  - `server/routes.ts` (`/api/manager/dashboard`)
- **Fix plan**:
  - Update API response shape to include `recentCourses`, `tutorPerformance`, and `stats.averageGrade`.
  - Or update UI to consume the existing response fields and compute values safely.
  - Ensure `averageGrade` fallback is rendered as `--` when null/undefined.

### Issue #4: Tutors page shows no tutors / missing list/actions
- **Root cause hypothesis**: Tutors page depends on manager dashboard endpoint that doesn’t include performance arrays.
- **Confirmed cause**:
  - `/api/manager/dashboard` doesn’t return `tutorPerformance`.
- **Impacted files**:
  - `client/src/pages/manager/tutors.tsx`
  - `server/routes.ts` (`/api/manager/dashboard`)
- **Fix plan**:
  - Add `tutorPerformance` data in the backend and return it.
  - Alternatively add a new endpoint for manager tutors list with proper stats.
  - Add a basic “View profile” route or action if required by UX.

### Issue #5: Courses table rows inert (no navigation to details)
- **Root cause hypothesis**: There is no course detail route for managers and rows don’t link anywhere.
- **Confirmed cause**:
  - No `/manager/courses/:courseId` route is defined.
  - Manager courses table renders rows without links/buttons.
- **Impacted files**:
  - `client/src/pages/manager/courses.tsx`
  - `client/src/App.tsx` (routing)
- **Fix plan**:
  - Add `/manager/courses/:courseId` route to `ManagerRoutes`.
  - Add a minimal course detail page (title/code/status/tutor/enrollment count).
  - Add row click handler or “View” action to navigate.

### Issue #6: Hours Wallets page incomplete (wallet list missing, modal unclear)
- **Root cause hypothesis**: UI has multi-step flow but lacks explicit guidance and may rely on data that isn’t clearly presented to the user.
- **Confirmed cause**:
  - Wallet list depends on `/api/hour-wallets` and should render; unclear copy/guidance and allocation step lacks explicit “what happens next” explanation.
- **Impacted files**:
  - `client/src/pages/admin/wallets.tsx`
- **Fix plan**:
  - Add inline guidance text/tooltips in Step 1 and Step 2.
  - If backend allocation endpoint fails, show placeholder/disabled state with explicit message.

### Issue #7: Announcements page wrong interaction (navigates away instead of modal)
- **Root cause hypothesis**: Navigation may be triggered by absolute links or cross-domain location changes rather than the Dialog.
- **Confirmed cause**:
  - Announcements page uses a Radix `Dialog` correctly, but other app-level links/buttons (e.g., header/logo) could still navigate away.
  - Additionally, the `New Announcement` behavior can be affected if data loading or routing triggers a full page reload.
- **Impacted files**:
  - `client/src/pages/announcements.tsx`
  - `client/src/components/notification-bell.tsx` (if links are used to navigate)
- **Fix plan**:
  - Ensure the modal uses in-place `Dialog` and the button does not wrap an anchor.
  - Avoid `window.location.href` for in-app navigation paths.
  - Refetch announcements on submit using `queryClient.invalidateQueries` (already implemented but confirm shape).

### Issue #9: Admin routes missing (404)
- **Root cause hypothesis**: Admin routes may be missing in routing for certain roles or on refresh.
- **Confirmed cause**:
  - Admin routes are present in `AdminRoutes`, but are only reachable when `effectiveRole` is `admin`.
  - If a non-admin user tries `/admin/*` they will hit `NotFound`, leading to 404 reports.
- **Impacted files**:
  - `client/src/App.tsx`
  - `client/src/components/layout/app-sidebar.tsx`
- **Fix plan**:
  - Confirm admin routes are registered in the top-level router (possibly add global route stubs for `/admin/*`).
  - Add minimal placeholder pages for any missing admin paths.

### Issue #10: HTTP vs HTTPS confusion
- **Root cause hypothesis**: Some navigation uses absolute URLs or untrusted data that may include `http://`.
- **Confirmed cause**:
  - No explicit `http://` links found in source, but `notification.link` or server redirects can include absolute URLs.
- **Impacted files**:
  - `client/src/components/notification-bell.tsx`
  - `client/src/pages/auth/login.tsx`
  - `client/src/pages/auth/staff-login.tsx`
- **Fix plan**:
  - Normalize internal links to relative paths.
  - For any absolute URLs, ensure they use `window.location.origin` and HTTPS.

### Issue #11: 404 page has developer text
- **Root cause hypothesis**: The NotFound view contains internal developer copy.
- **Confirmed cause**:
  - `client/src/pages/not-found.tsx` includes “Did you forget to add the page to the router?”
- **Impacted files**:
  - `client/src/pages/not-found.tsx`
- **Fix plan**:
  - Replace with user-friendly copy and optional dev-only detail behind a flag.

### Issue #12: No in-app guidance/tooltips
- **Root cause hypothesis**: Pages for complex workflows (wallets, courses, announcements) lack helper text or tooltips.
- **Confirmed cause**:
  - Limited inline guidance in `AdminWallets`, `ManagerCourses`, and `Announcements` for next steps.
- **Impacted files**:
  - `client/src/pages/admin/wallets.tsx`
  - `client/src/pages/manager/courses.tsx`
  - `client/src/pages/announcements.tsx`
- **Fix plan**:
  - Add small inline hints/tooltips near key actions (Add Hours, Allocate, Course rows, New Announcement).

---

## Phase 1 conclusion
- Primary issues are API contract mismatches (manager dashboard/tutors/courses, announcements) and missing routes (manager course detail).
- Domain/protocol issues appear related to absolute navigation rather than explicit hard-coded domains.
- Phase 2 should focus on aligning API responses with UI expectations, adding missing routes/components, and improving guidance/tooltips.
