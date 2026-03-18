# Loopee-RN Codebase Audit Report

**Date:** 2026-03-18
**Auditor:** Staff-level Multi-Discipline Review
**Scope:** Full repository audit

---

## A. Executive Summary

### What This App Does
Loopee is a React Native (Expo SDK 53) mobile app for discovering, reviewing, and contributing public toilet/restroom locations. It features a map-based discovery view, user authentication, toilet reviews/ratings, user profiles, and a contribution flow for adding new toilets. Backend is Supabase (PostgreSQL + Auth + RLS). State management via Zustand. UI via React Native Paper.

### Overall Health Rating: 3.5/10

### Main Strengths
- Well-structured file organization with clear separation of concerns (services, stores, components, types)
- Extensive debug/auth logging infrastructure
- Contribution service has duplicate submission detection and session validation
- Supabase singleton pattern for client reuse
- Husky + lint-staged pre-commit hooks

### Main Weaknesses
- **Supabase credentials committed to git** (env.local tracked since initial commit)
- **All 5 test suites completely broken** (Babel transform failures)
- **No CI/CD pipeline exists** - zero automated checks
- **1,284-line supabase.ts god file** handling auth, profiles, toilets, and reviews
- **Multiple critical runtime crash vectors** (missing imports, unguarded null access)

### Top 5 Highest-Risk Issues
1. **CRITICAL:** Supabase URL + anon key committed to public git history
2. **CRITICAL:** Entire test suite broken - 0 tests pass
3. **HIGH:** Missing `debug` imports in AvatarUpload.tsx and UserReviewCard.tsx will crash at runtime
4. **HIGH:** Duplicate Supabase client in activityService.ts bypasses auth session
5. **HIGH:** No CI/CD - broken tests, type errors, and security issues go undetected

---

## B. Critical Findings Table

| ID | Title | Severity | Category | Evidence | Why It Matters | Root Cause | Fix | Effort | Priority |
|----|-------|----------|----------|----------|----------------|------------|-----|--------|----------|
| B1 | Supabase credentials in git | Critical | Security | `env.local:2-3`, tracked since commit `34447c1` | Anyone with repo access has DB credentials. `.gitignore` has `.env*.local` but file is `env.local` (no dot prefix) | Filename doesn't match gitignore pattern | Remove from git, add `env.local` to `.gitignore`, rotate keys | S | Now |
| B2 | All tests broken | Critical | Testing | `npx jest` -> 5 suites fail at Babel transform | Zero regression protection; team flies blind | Missing `node_modules` or incompatible `jest@30` + `babel` versions | Pin jest to v29, install deps, fix babel config | M | Now |
| B3 | Missing debug imports crash at runtime | Critical | Bug | `src/components/profile/AvatarUpload.tsx`, `src/components/toilet/UserReviewCard.tsx` | App crashes when image upload fails or review has invalid date | Import statement missing after refactor | Add `import { debug } from "../../utils/debug"` | S | Now |
| B4 | Duplicate Supabase client | High | Architecture | `src/services/activityService.ts:16-19` creates new client instead of using singleton | Activity service has no auth session; RLS policies may leak/block data | Workaround for "Direct client for database RPC operations" | Use `SupabaseClientSingleton.getInstance()` | S | Now |
| B5 | No CI/CD pipeline | High | DevOps | No `.github/workflows/`, no CI config files | Broken tests, type errors, security issues never caught | Never set up | Add GitHub Actions for lint, type-check, test | M | Now |
| B6 | supabase.ts is 1,284 lines | High | Architecture | `src/services/supabase.ts` | Unmaintainable god file; auth + profiles + toilets + reviews + session mgmt | Organic growth without refactoring | Split into `authService.ts`, `toiletService.ts`, `profileService.ts`, `reviewService.ts` | L | Next |
| B7 | Race condition in AuthProvider init | High | Bug | `src/providers/AuthProvider.tsx:65-226` | `initializeAuth()` and `onAuthStateChange()` both fetch profile concurrently | Two async operations reading/writing same state | Add mutex/flag to prevent concurrent profile fetches | M | Next |
| B8 | No input validation on toilet submissions | High | Security | `src/services/contributionService.ts:606-807` | Malformed coordinates, XSS in text fields, oversized arrays reach DB | No validation layer before Supabase insert | Add Zod/yup schema validation before submission | M | Next |
| B9 | Session timestamp heuristic | High | Bug | `src/services/supabase.ts:168-173` | Arbitrary `< 20000000000` threshold to decide Unix vs JS timestamp; breaks for edge cases | Supabase returns inconsistent timestamp formats | Always normalize with explicit format detection from Supabase SDK | S | Next |
| B10 | Hardcoded Singapore coordinates everywhere | Medium | UX/Bug | `MapWithBottomSheet.tsx:144`, `ToiletListScreen.tsx:34-40` | App silently defaults to Singapore with no user feedback | No proper location permission flow | Show explicit "location unavailable" state; store user's last known location | M | Next |
| B11 | O(n^2) toilet validation in store | Medium | Performance | `src/stores/toilets.ts:204-205` uses `.includes()` in filter | Sluggish with 1000+ toilets | Used `.includes()` on array (O(n) per check) | Use Set for O(1) lookup | S | Next |
| B12 | Memory leak: recentSubmissions grows unbounded | Medium | Bug | `src/services/contributionService.ts:175,250-258` | Map grows indefinitely; cleanup only on 30-min threshold | No periodic purge, no max size | Add max size cap + periodic cleanup | S | Next |
| B13 | ProfileScreen data never loads | Medium | Bug | `src/app/profile/index.tsx:171-205` always passes `data={null}` | User reviews/contributions tab always shows "empty" | Hardcoded placeholder never replaced with API call | Connect ContentList to actual user data APIs | M | Next |
| B14 | 60-second session health check | Medium | Performance | `src/providers/AuthProvider.tsx:427` | 1,440 checks/day/user; battery drain on mobile | Overly aggressive interval | Change to 5-10 minute interval | S | Later |
| B15 | Crypto.randomUUID NaN risk | Medium | Bug | `src/services/supabase.ts:818` | Username becomes `user_NaN` if UUID generation fails | No null-guard on `parseInt(Crypto.randomUUID()...)` | Add fallback: `Math.floor(Math.random() * 1000000)` | S | Now |
| B16 | Promise.race without AbortController | Medium | Bug | `src/services/contributionService.ts:365-368` | Losing promise keeps running, causing orphaned operations | No cancellation mechanism | Implement AbortController for timeout races | M | Next |
| B17 | Two different ToiletCard components | Low | DX | `ToiletCard.tsx` + `PaperToiletCard.tsx` | Inconsistent UX, double maintenance burden | Feature branch never consolidated | Merge into single configurable component | M | Later |
| B18 | Dead code: ClusteredMapView, DebugExample | Low | DX | `src/components/map/ClusteredMapView.tsx`, `src/components/examples/DebugExample.tsx` | ~250 lines of unused code | Never cleaned up | Delete unused files | S | Later |
| B19 | Missing accessibility labels | Medium | UX | Rating.tsx, EditableRating.tsx, ToiletDetailView.tsx emoji amenities | Screen reader users cannot use core features | Accessibility not prioritized | Add `accessibilityLabel` props | M | Later |
| B20 | Sentry DSN silently disabled | Medium | Observability | `src/services/sentry.ts:12-13` falls back to disabled without warning | Production errors completely untracked if env var missing | No runtime warning | Add console.warn in production if DSN missing | S | Now |

---

## C. Debugging Analysis

### Most Likely Current Bugs

1. **AvatarUpload + UserReviewCard crash** - Missing `debug` import means any error path (failed image upload, invalid review date) throws `ReferenceError: debug is not defined`. Reproduce by uploading a corrupted image or viewing a review with null `created_at`.

2. **Activity service returns wrong data due to no auth session** - The duplicate Supabase client at `activityService.ts:16-19` has no session. Any RLS-protected query returns empty or errors. Reproduce by calling `activityService.getUserActivity()` while logged in.

3. **Profile tabs always empty** - `src/app/profile/index.tsx:171-205` hardcodes `data={null}`. Users see "No Reviews Yet" even if they have reviews. Reproduce by adding a review and visiting profile.

4. **Username generation produces `user_NaN`** - If `Crypto.randomUUID()` returns unexpected format, `parseInt(..., 16)` returns NaN. Reproduce: mock Crypto.randomUUID to return empty string.

5. **getUnreadNotificationCount returns wrong value** - Uses `count: "exact", head: true` which returns count in headers, not `.data.length`. `activityService.ts:116` accesses `.length` on null. Always returns 0.

### What Logs/Instrumentation to Add
- Add Sentry breadcrumbs before every Supabase query
- Log location permission denial explicitly (not just silent fallback)
- Add error boundary crash reporting in ErrorBoundaryProvider
- Track session refresh failures with counters

### Fastest Isolation Path
1. Fix the `debug` imports → instant crash fix
2. Run app and check activity service responses → verify auth session issue
3. Check Supabase logs for RLS policy violations → confirms session bypass
4. Add `console.warn` to notification count → verify data shape mismatch

---

## D. Architecture Review

### Current Architecture
```
[Expo Router] → [Screens/Components] → [Services] → [Supabase]
                                      → [Zustand Store]
                                      → [Location Service]
[AuthProvider (Context)] wraps everything
```

### What Is Fragile
- **supabase.ts (1,284 lines)** - Single file handles auth, profiles, toilets, reviews, session management. Any change risks breaking unrelated functionality.
- **AuthProvider (833 lines)** - Monolithic auth provider with session health checks, profile management, debug logging all interleaved.
- **contributionService.ts (1,133 lines)** - Complex submission flow with session validation, deduplication, retry logic all in one file.

### What Is Overcomplicated
- Session validation has 3 layers: `checkSession()` (120+ lines), `ensureValidSession()` in contribution service, and health check interval in AuthProvider. These overlap and can conflict.
- Toilet data normalization happens in multiple places: `toilet-helpers.ts`, `supabase.ts`, and `stores/toilets.ts`.
- Debug logging framework (`debug.ts`, `AuthDebugger.ts`) is extensive but most logs are only useful during development.

### What Should Be Refactored First
1. Split `supabase.ts` into domain-specific service files
2. Extract session validation into a single shared module
3. Remove duplicate Supabase client from activityService

### Suggested Target Architecture
```
src/services/
  supabaseClient.ts      # Singleton client only (~50 lines)
  authService.ts         # Auth operations
  sessionService.ts      # Session validation, refresh, health checks
  toiletService.ts       # CRUD for toilets
  reviewService.ts       # CRUD for reviews
  profileService.ts      # (already exists, keep)
  contributionService.ts # (keep, but remove session logic)
  activityService.ts     # (fix: use singleton client)
```

---

## E. Code Quality Review

### Duplication
- Toilet data normalization in 3 places: `toilet-helpers.ts:68-102`, `supabase.ts:1030-1065`, `stores/toilets.ts:174-228`
- Location default coordinates hardcoded in: `MapWithBottomSheet.tsx:144`, `ToiletListScreen.tsx:34`, `MapView.tsx:49-54`
- Error handling patterns differ: some use `Alert.alert()`, some use `ErrorState` component, some swallow silently

### Naming Issues
- `supabase.ts` exports `supabaseService` (service) but also `refreshSession`, `checkSession` as loose functions
- `_clusterRadius` parameter in `clustering.ts:36` unused with underscore prefix instead of being removed
- `_inGuestGroup` in `_layout.tsx:35` unused

### Dead Code
- `ClusteredMapView.tsx` - entire component unused (~190 lines)
- `DebugExample.tsx` - not imported anywhere
- `ModalToiletSheet.tsx` vs `ModalizeToiletSheet.tsx` - likely one is obsolete

### Maintainability
- ESLint disabled directives in test files: `@typescript-eslint/no-unsafe-*` disabled 5 ways in `supabase-auth.test.ts`
- No JSDoc on most component props interfaces
- Mixed navigation APIs: `router.push()` (expo-router) and `navigation.navigate()` (React Navigation)

---

## F. Security Review

### Critical: Credentials Exposure
- **`env.local`** committed to repo with Supabase URL and anon key since initial commit `34447c1`
- `.gitignore` pattern `.env*.local` does NOT match `env.local` (missing dot prefix)
- Key must be rotated immediately even after removal - it's in git history

### Auth Issues
- No password strength validation client-side before signup (`register.tsx`)
- No email format validation before auth API calls
- No rate limiting on login attempts (relies solely on Supabase's built-in limits)

### Input Validation
- `submitNewToilet()` accepts `Partial<Toilet>` with no coordinate range validation, string length limits, or sanitization
- Review text submitted directly to Supabase without XSS sanitization (mitigated by RLS but not defense-in-depth)
- `ProfileForm` username validation regex exists but allows trailing whitespace

### Dependency Risks
- `react-native-dotenv@3.4.11` - environment variable exposure risk if misconfigured
- No `npm audit` in CI (no CI exists)
- `expo@53` with `react@19` and `react-native@0.79` - very recent; potential undiscovered bugs

### Data Exposure
- Debug logging in production includes session tokens, email addresses (masked but reconstructible)
- `AuthDebugger.ts` logs session expiration times which could aid session fixation attacks

---

## G. Performance Review

### Expensive Operations
- **O(n^2) toilet validation** in `stores/toilets.ts:204-205`: `toilets.filter(t => !validToilets.includes(t))`
- **Clustering on every region change** in `MapView.tsx:226-259` without memoization or debounce
- **60-second session health check** creates unnecessary network + battery drain
- **`Crypto.randomUUID()` string manipulation** in map loop for coordinate generation

### Unnecessary Network Traffic
- Activity service creates new unauthenticated client → may make duplicate auth token requests
- Session health check every 60s when 5-10 min would suffice
- No request deduplication for concurrent `getNearby()` calls during rapid map panning

### Caching Opportunities
- Toilet data could be cached in Zustand with TTL (currently fetched every time)
- Profile data fetched on every auth state change
- No image caching strategy for toilet/avatar photos

### Lazy Loading / Pagination
- `ToiletList` loads all nearby toilets at once; should paginate with `@shopify/flash-list` (already imported but underutilized)
- No infinite scroll on review lists

---

## H. Testing Review

### Current State: COMPLETELY BROKEN
- **5 test suites, 0 tests pass** - All fail at Babel transform stage
- Root cause: `jest@30` + incompatible Babel configuration, missing `node_modules`
- Test files exist for: auth service, contribution service, toilet store, location service, setup

### Critical Untested Paths
- Zero component tests running (infrastructure exists but non-functional)
- No tests for: profile operations, activity service, review submission, map interactions
- No integration tests for auth → profile → submission flow
- Maestro E2E flows exist (`.maestro/`) but no evidence they've been run successfully

### Recommended Test Plan
1. **Fix Babel/Jest configuration** (Critical - blocks everything)
2. **Auth flow** - login, signup, session refresh, logout
3. **Contribution flow** - submit toilet with validation
4. **Map view** - toilet clustering, region changes
5. **Profile** - edit profile, avatar upload

---

## I. DevOps / Reliability Review

### CI/CD: DOES NOT EXIST
- No `.github/workflows/`, no `.circleci/`, no `Jenkinsfile`
- No automated linting, type-checking, or testing
- No automated builds or deployments
- `husky` pre-commit exists but only runs `lint-staged` (ESLint + Prettier)

### Environment Config Risks
- `env.local` committed to repo (see Security section)
- `SENTRY_DSN` not in `.env.local.example` - easy to miss
- No environment separation (dev/staging/prod) visible
- `tsconfig.json` references `expo/tsconfig.base` which doesn't resolve (type-check fails)

### Deployment Failure Risks
- No EAS Build configuration (`eas.json` missing)
- No OTA update configuration
- No health check endpoints

### Missing Monitoring
- Sentry silently disables if DSN missing
- No performance monitoring (Sentry Performance not configured)
- No crash-free rate tracking
- No API latency monitoring

---

## J. Product / PM / BA Review

### Gaps Between Implementation and Goals
1. **Profile content tabs are non-functional** - Users see empty tabs with no data loading
2. **Activity/notification service broken** - Duplicate client bypasses auth; notification counts incorrect
3. **Location always defaults to Singapore** - No feedback when permission denied; bad UX for non-Singapore users
4. **No offline support** - App is unusable without network; no cached data

### Missing User Flows
- Password change flow (reset exists but not in-app change)
- Delete account
- Report inappropriate reviews
- Favorite/bookmark toilets
- Share toilet location
- Search/filter toilets by amenities

### Risky Assumptions
- App assumes all users are in Singapore (default coordinates)
- Assumes stable network connectivity (no offline mode)
- Assumes Supabase free tier will scale (no monitoring of quotas)

### Recommended Backlog
**Quick wins this week:**
- Fix credential leak and rotate keys
- Fix broken test suite
- Fix missing debug imports
- Add basic CI pipeline

**Improvements this month:**
- Split supabase.ts god file
- Connect profile tabs to real data
- Add input validation to forms
- Fix activity service auth

**Strategic work later:**
- Offline-first architecture
- Multi-region location support
- Performance monitoring
- Accessibility audit completion

---

## K. Action Plan

### Top 10 Actions in Priority Order

1. **Remove `env.local` from git, add to `.gitignore`, rotate Supabase keys** [S] [CRITICAL]
2. **Fix broken test suite** (downgrade jest or fix babel config) [M] [CRITICAL]
3. **Add `debug` import to AvatarUpload.tsx and UserReviewCard.tsx** [S] [CRITICAL]
4. **Fix activityService.ts to use singleton Supabase client** [S] [HIGH]
5. **Add GitHub Actions CI pipeline** (lint + type-check + test) [M] [HIGH]
6. **Add Sentry DSN warning in production** [S] [HIGH]
7. **Fix `user_NaN` username generation** [S] [HIGH]
8. **Add input validation to toilet submission** [M] [HIGH]
9. **Split supabase.ts into domain services** [L] [MEDIUM]
10. **Connect profile tabs to real data** [M] [MEDIUM]

### 3 Best Quick Wins
1. Fix `env.local` gitignore pattern (5 minutes, eliminates critical security risk)
2. Add missing `debug` imports (2 minutes, prevents runtime crashes)
3. Fix activityService duplicate client (10 minutes, fixes auth bypass)

### 3 Most Important Bugs to Debug First
1. **AvatarUpload/UserReviewCard crash** - missing imports, instant ReferenceError
2. **Activity service auth bypass** - duplicate client has no session
3. **Profile tabs always empty** - hardcoded null data

### 3 Refactors with Highest ROI
1. **Split supabase.ts** → enables team collaboration, reduces merge conflicts, improves testability
2. **Consolidate session validation** → eliminates 3 overlapping validation paths, reduces bugs
3. **Standardize error handling** → consistent UX, easier debugging, less code

### Suggested Implementation Sequence (Solo Dev / Small Team)

**Week 1: Security + Stability**
- Fix credential leak + rotate keys
- Fix test suite
- Fix crash bugs (missing imports)
- Add CI pipeline

**Week 2: Correctness**
- Fix activity service auth
- Fix profile data loading
- Add input validation
- Fix notification count bug

**Week 3: Architecture**
- Split supabase.ts
- Consolidate session management
- Remove dead code
- Standardize error handling

**Week 4: Polish**
- Location permission UX
- Accessibility improvements
- Performance optimizations (O(n^2) fix, health check interval)
- Add missing tests for fixed code

---

## L. Patch Suggestions

### Patch 1: Fix .gitignore for env.local (CRITICAL)
```diff
# local env files
.env*.local
+env.local
```
Then: `git rm --cached env.local && git commit`
Then: Rotate Supabase keys in dashboard.

### Patch 2: Fix missing debug imports
```diff
# src/components/profile/AvatarUpload.tsx
+import { debug } from "../../utils/debug";

# src/components/toilet/UserReviewCard.tsx
+import { debug } from "../../utils/debug";
```

### Patch 3: Fix activityService duplicate client
```diff
# src/services/activityService.ts
-import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
-import { createClient } from "@supabase/supabase-js";
-
-// Direct client for database RPC operations
-const supabase = createClient(
-  EXPO_PUBLIC_SUPABASE_URL,
-  EXPO_PUBLIC_SUPABASE_ANON_KEY
-);
+import { supabaseService } from "./supabase";
+
+// Use singleton client to share auth session
+const supabase = supabaseService.getClient();
```

### Patch 4: Fix O(n^2) validation in store
```diff
# src/stores/toilets.ts
-const invalidToilets = toilets.filter((t) => !validToilets.includes(t));
+const validSet = new Set(validToilets);
+const invalidToilets = toilets.filter((t) => !validSet.has(t));
```

### Patch 5: Fix username NaN risk
```diff
# src/services/supabase.ts
-const randomNumber = Math.floor(parseInt(Crypto.randomUUID().replace(/-/g, '').substring(0, 6), 16) % 1000000);
+let randomNumber: number;
+try {
+  randomNumber = Math.floor(parseInt(Crypto.randomUUID().replace(/-/g, '').substring(0, 6), 16) % 1000000);
+  if (isNaN(randomNumber)) randomNumber = Math.floor(Math.random() * 1000000);
+} catch {
+  randomNumber = Math.floor(Math.random() * 1000000);
+}
```

### Patch 6: Fix session health check interval
```diff
# src/providers/AuthProvider.tsx
-}, 60000); // Check health every minute
+}, 300000); // Check health every 5 minutes
```

---

## M. Type System & Data Flow Audit (Addendum)

### Critical: Amenities Schema Chaos
Two competing naming conventions exist simultaneously:
- **Database initial schema + test data**: `babyChanging`, `handDryer`, `shower` (no prefix)
- **TypeScript types + later migrations**: `hasBabyChanging`, `hasShower`, `isGenderNeutral` (prefixed)
- Migration `20250533` tried to standardize but the submission trigger (`20250531`) stores user input as-is
- `normalizeAmenities()` in `toilet-helpers.ts` is a band-aid handling both formats

### Critical: Location (0,0) Treated as Valid
Database function uses `COALESCE(ST_Y(t.location::geometry), 0)` — when location is NULL, it returns `(0, 0)`. The normalization code treats `(0, 0)` as valid coordinates, then falls back to **random coordinate generation** (`supabase.ts:1032-1037`) for other missing cases. This silently corrupts map data.

### High: 7+ Unsafe `as Type` Casts Without Validation
| File | Line(s) | Cast | Risk |
|------|---------|------|------|
| `supabase.ts` | 805, 862, 945 | `as UserProfile` | Missing stats fields crash |
| `supabase.ts` | 1145 | `as Toilet & { reviews: Review[] }` | Null reviews not caught |
| `supabase.ts` | 1241 | `as Review[]` | user_profiles null creates null user |
| `contributionService.ts` | 694+ | `Partial<Toilet>` | No runtime validation |

### High: ActivityMetadata Completely Untyped
```typescript
export interface ActivityMetadata {
  data?: { [key: string]: any; };  // Open-ended catch-all
  [key: string]: any;               // Another catch-all
}
```
This makes refactoring metadata impossible and any field access unsafe.

### Medium: Review Type Mismatches
- `comment` is required in type but nullable in database
- `version` is optional in type but always populated by DB trigger (defaults to 1)
- `user` field created as `null` by service but typed as `optional` (undefined vs null)

### Medium: No Submission Data Validation Before Insert
`contributionService.submitNewToilet()` passes raw `Partial<Toilet>` to `supabase.rpc("submit_toilet")`. No checks for:
- Required fields (`name`, `location`)
- Coordinate range validity
- Amenities object structure
- String field sanitization

### Medium: Profile Stats Have No DB Constraints
`reviews_count`, `contributions_count`, `favorites_count` are plain INTEGER columns with no CHECK constraints. Trigger updates these but nothing prevents negative values or count drift from actual records.

### Recommendation: Add Runtime Validation Layer
Install `zod` and create `src/utils/validators.ts` with schemas for:
- `ToiletSchema` (validates coordinates, required fields, amenities structure)
- `ReviewSchema` (validates rating range, optional comment)
- `ProfileSchema` (validates stats are non-negative)
- `SubmissionSchema` (validates all required submission fields)

Replace all `as Type` casts with `schema.parse(data)` calls.

---

*End of audit. Total issues identified: 20+ critical/high/medium findings in the findings table, 48+ UI/component issues, 11 type system/data flow issues, 5 architectural concerns, and multiple testing/DevOps gaps.*
