# Loopee-RN Execution Plan

**Generated:** 2026-03-18 | **Source:** Codebase Audit (48 findings)

---

## 1. Prioritized Risk Matrix (Business Impact x Technical Risk x Effort)

Each finding scored 1-5 per axis. **Composite = Impact x Risk x (6 - Effort)** so quick fixes rank higher.

| Rank | ID | Finding | Impact | Risk | Effort | Composite | Action |
|------|-----|---------|--------|------|--------|-----------|--------|
| 1 | B1 | Supabase credentials in git | 5 | 5 | 1 (S) | **125** | Fix #1 |
| 2 | B3 | Missing `debug` imports crash app | 5 | 5 | 1 (S) | **125** | Fix #2 |
| 3 | B4 | Duplicate Supabase client (no auth) | 4 | 5 | 1 (S) | **100** | Fix #3 |
| 4 | B2 | All 5 test suites broken | 5 | 4 | 3 (M) | **60** | Fix #4 |
| 5 | B5 | No CI/CD pipeline | 4 | 4 | 3 (M) | **48** | Fix #5 |
| 6 | B15 | `user_NaN` username generation | 4 | 4 | 1 (S) | 80 | Sprint 2 |
| 7 | B20 | Sentry DSN silently disabled | 3 | 4 | 1 (S) | 60 | Sprint 2 |
| 8 | B7 | AuthProvider race condition | 4 | 4 | 3 (M) | 48 | Sprint 2 |
| 9 | B8 | No input validation on submissions | 4 | 4 | 3 (M) | 48 | Sprint 2 |
| 10 | N-RLS | RLS policy gaps on toilets/buildings | 4 | 5 | 2 (S-M) | 80 | Sprint 2 |
| 11 | B13 | Profile tabs always empty | 4 | 3 | 3 (M) | 36 | Sprint 2 |
| 12 | N-IDX | Missing database indexes | 3 | 4 | 2 (S-M) | 48 | Sprint 2 |
| 13 | B11 | O(n^2) toilet validation | 3 | 3 | 1 (S) | 45 | Sprint 3 |
| 14 | B6 | supabase.ts 1284-line god file | 5 | 3 | 5 (L) | 15 | Sprint 3 |
| 15 | M-AMN | Amenities schema chaos | 3 | 3 | 3 (M) | 27 | Sprint 3 |
| 16 | B9 | Session timestamp heuristic | 3 | 3 | 1 (S) | 45 | Sprint 3 |
| 17 | B10 | Hardcoded Singapore coords | 3 | 2 | 3 (M) | 18 | Sprint 3 |
| 18 | B12 | Memory leak in recentSubmissions | 3 | 3 | 1 (S) | 45 | Sprint 3 |
| 19 | B14 | 60s session health check | 2 | 2 | 1 (S) | 20 | Sprint 3 |
| 20 | B16 | Promise.race no AbortController | 3 | 3 | 3 (M) | 27 | Sprint 3 |

**Effort key:** S = < 1 hour, M = 1-4 hours, L = 1+ days

---

## 2. First 5 Fixes — Detailed Plans

---

### Fix #1: Remove Supabase Credentials from Git History

**Severity:** CRITICAL | **Composite Score:** 125 | **Effort:** Small

#### Exact Files/Modules
- `env.local` — contains `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `.gitignore` — pattern `.env*.local` does NOT match `env.local` (no leading dot)
- `babel.config.js:19` — configured to read `.env.local` (with dot)

#### Root Cause
The file is named `env.local` (no dot prefix). The `.gitignore` pattern `.env*.local` requires a leading dot, so `env.local` was never ignored. It's been tracked since commit `34447c1`. Additionally, `babel.config.js` is configured to read `.env.local` (with dot), so there's a naming mismatch — the app likely works because `react-native-dotenv` falls back or someone renamed it at runtime.

#### Step-by-Step Fix Plan
1. **Add `env.local` to `.gitignore`** — Add explicit line: `env.local`
2. **Remove from git tracking** — `git rm --cached env.local`
3. **Rename file to `.env.local`** — Matches both the gitignore glob AND babel config expectation
4. **Verify `.env.local.example` exists** — Ensure it documents required vars (without real values)
5. **Rotate Supabase keys** — In Supabase Dashboard → Settings → API → Regenerate anon key
6. **Update local `.env.local`** with new keys
7. **Communicate to team** — Anyone with repo access should assume the old key is compromised

#### Regression Risks
- If file rename breaks `react-native-dotenv` resolution → app won't start
- If babel is caching old config → `npx expo start --clear` needed
- Other developers need to create `.env.local` locally after pull

#### Tests to Add
- Add a CI check that no `*.local` env files are tracked: `git ls-files | grep -E 'env.*local' && exit 1`
- Add pre-commit hook validation: reject commits containing Supabase URLs

#### Definition of Done
- [ ] `git ls-files | grep env.local` returns nothing
- [ ] `.gitignore` contains explicit `env.local` line
- [ ] File renamed to `.env.local`
- [ ] App starts successfully with renamed file
- [ ] Supabase keys rotated in dashboard
- [ ] `.env.local.example` updated with all required var names (no values)

---

### Fix #2: Add Missing `debug` Imports (Runtime Crash Prevention)

**Severity:** CRITICAL | **Composite Score:** 125 | **Effort:** Small

#### Exact Files/Modules
- `src/components/profile/AvatarUpload.tsx` — uses `debug()` in error handler but no import
- `src/components/toilet/UserReviewCard.tsx` — uses `debug()` in date formatting but no import
- `src/utils/debug.ts` — the module to import from

#### Root Cause
Refactoring removed or moved the `debug` import but left `debug()` call sites in error handling paths. Since these are in catch blocks / edge case paths, they weren't caught during manual testing — they only crash when an error actually occurs (image upload failure, invalid date).

#### Step-by-Step Fix Plan
1. **Add import to `AvatarUpload.tsx`:**
   ```typescript
   import { debug } from "../../utils/debug";
   ```
2. **Add import to `UserReviewCard.tsx`:**
   ```typescript
   import { debug } from "../../utils/debug";
   ```
3. **Search for other missing imports:**
   ```bash
   grep -rn "debug(" src/ --include="*.ts" --include="*.tsx" | grep -v "import.*debug" | grep -v "__tests__" | grep -v "node_modules"
   ```
4. **Verify each file that calls `debug()` has the import**

#### Regression Risks
- None — adding an import has zero side effects
- If `debug.ts` export signature changed, import would fail at compile time (caught by tsc)

#### Tests to Add
- Add lint rule: `no-undef` should catch this (verify it's enabled)
- Add CI step: `npx tsc --noEmit` would catch `ReferenceError` at compile time
- Unit test for AvatarUpload error path: mock image picker failure, verify no crash
- Unit test for UserReviewCard: pass `created_at: null`, verify no crash

#### Definition of Done
- [ ] Both files have correct `debug` import
- [ ] `grep -rn "debug(" src/ --include="*.tsx" | grep -v import | grep -v "//"` returns 0 unimported usages
- [ ] `npx tsc --noEmit` passes (no unresolved references)
- [ ] Manual test: trigger image upload failure in AvatarUpload → no crash

---

### Fix #3: Fix Duplicate Supabase Client in Activity Service

**Severity:** HIGH | **Composite Score:** 100 | **Effort:** Small

#### Exact Files/Modules
- `src/services/activityService.ts:8-19` — creates standalone `createClient()` instead of using singleton
- `src/services/supabase.ts` — exports `supabaseService` singleton with `getClient()` method

#### Root Cause
Developer comment on line 15 says "Direct client for database RPC operations" — this was a workaround, likely because the developer couldn't access the singleton easily or didn't know it existed. The standalone client has no auth session attached, so all RLS-protected queries either fail silently or return empty data. This is why activity feeds and notification counts are broken.

#### Step-by-Step Fix Plan
1. **Replace import block in `activityService.ts`:**
   ```diff
   -import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
   -import { createClient } from "@supabase/supabase-js";

   -// Direct client for database RPC operations
   -const supabase = createClient(
   -  EXPO_PUBLIC_SUPABASE_URL,
   -  EXPO_PUBLIC_SUPABASE_ANON_KEY
   -);
   +// Use singleton client to share auth session for RLS
   +const getClient = () => supabaseService.getClient();
   ```
2. **Update all `supabase.` calls to `getClient().`** — or assign at call time:
   ```typescript
   const supabase = supabaseService.getClient();
   ```
   (Use top-level const since the singleton initializes once)
3. **Verify `supabaseService.getClient()` returns the authenticated client** — read `supabase.ts` to confirm
4. **Test activity feed with authenticated user** — should now return real data

#### Regression Risks
- If `supabaseService.getClient()` is called before auth initialization, it could return an unauthenticated client — same as current state, no worse
- If the singleton client has a different API surface than raw `createClient()`, method calls might differ (unlikely — same SDK)
- RPC operations that previously ran without auth might now be subject to RLS — this is correct behavior but could surface new permission errors if RLS policies are too restrictive

#### Tests to Add
- Unit test: mock `supabaseService.getClient()` and verify activity service uses it
- Integration test: call `activityService.getUserActivity()` with authenticated session, verify data returns
- Test: call `getUnreadNotificationCount()` with authenticated session, verify non-null response

#### Definition of Done
- [ ] `activityService.ts` no longer imports `createClient` or `@env`
- [ ] `activityService.ts` uses `supabaseService.getClient()`
- [ ] Activity feed returns data when user is logged in
- [ ] Notification count returns correct number (not always 0)
- [ ] No new ESLint errors introduced

---

### Fix #4: Fix Broken Test Suite (All 5 Suites Failing)

**Severity:** CRITICAL | **Composite Score:** 60 | **Effort:** Medium

#### Exact Files/Modules
- `package.json:67` — `"jest": "^30.2.0"` (v30 has breaking changes with babel-jest)
- `package.json:56` — `"@types/jest": "^30.0.0"` (matches jest v30)
- `jest.config.js:14-15` — uses `babel-jest` transform
- `babel.config.js` — uses `babel-preset-expo`
- `jest.setup.js` — setup file
- `src/__tests__/services/` — 4 test files
- `src/__tests__/stores/` — 1 test file

#### Root Cause
Jest v30 introduced breaking changes in its transform pipeline. `babel-jest` integration with `babel-preset-expo` fails because:
1. Jest 30 changed the transformer API
2. `babel-preset-expo` targets a specific Babel version that may not match Jest 30's expectations
3. The `transformIgnorePatterns` regex (line 17-19) may not correctly handle Jest 30's module resolution
4. No `node_modules` installed in audit environment (but the config itself is the deeper issue)

#### Step-by-Step Fix Plan
1. **Downgrade Jest to v29** (last stable version with full babel-jest compat):
   ```bash
   npm install --save-dev jest@^29.7.0 @types/jest@^29.5.0 --legacy-peer-deps
   ```
2. **Verify `babel-jest` version matches** — Jest 29 bundles its own `babel-jest`; don't install separately
3. **Run tests:**
   ```bash
   npx jest --verbose 2>&1 | head -50
   ```
4. **If tests still fail, check for missing Babel plugins:**
   ```bash
   npx jest --showConfig | grep transform
   ```
5. **Fix any remaining transform issues** — may need `@babel/plugin-transform-modules-commonjs`
6. **Enable `detectOpenHandles: true`** in `jest.config.js` (currently disabled, masks leaks)
7. **Remove `forceExit: true`** and fix any hanging async operations

#### Regression Risks
- Downgrading Jest may lose v30-specific features (unlikely to be used given tests don't even run)
- `@types/jest` v29 may have slightly different type signatures — test files may need minor type adjustments
- If Expo SDK 53 specifically requires Jest 30, we'd need a different approach (use `jest-expo` preset instead)

#### Tests to Add
- All existing 5 test suites should pass (123 tests per audit):
  - `src/__tests__/services/supabase-auth.test.ts` (42 tests)
  - `src/__tests__/services/location.test.ts` (21 tests)
  - `src/__tests__/services/contribution.test.ts` (36 tests)
  - `src/__tests__/stores/toilets.test.ts` (22 tests)
  - `src/__tests__/setup.test.ts` (3 tests)
- Add CI smoke test: `npm test -- --ci --forceExit` in GitHub Actions

#### Definition of Done
- [ ] `npx jest` runs to completion without Babel transform errors
- [ ] All 5 test suites execute (even if some individual tests fail for logic reasons)
- [ ] `jest.config.js` has `detectOpenHandles: true`
- [ ] `jest.config.js` has `forceExit` removed or set to `false`
- [ ] `package.json` shows `jest@^29.x` and `@types/jest@^29.x`

---

### Fix #5: Add GitHub Actions CI Pipeline

**Severity:** HIGH | **Composite Score:** 48 | **Effort:** Medium

#### Exact Files/Modules
- **New:** `.github/workflows/ci.yml` — main CI pipeline
- `package.json` — has `lint`, `test`, `test:coverage` scripts already
- `tsconfig.json` — for type checking
- `.eslintrc.js` — for lint step

#### Root Cause
CI/CD was never set up. The project relies solely on Husky pre-commit hooks (which only run `lint-staged` + `npm test`). Since tests are broken (Fix #4), the pre-commit hook effectively does nothing. There's no branch protection, no automated builds, no security scanning.

#### Step-by-Step Fix Plan
1. **Create `.github/workflows/` directory**
2. **Create `ci.yml`** with these jobs:
   - **lint**: `npm run lint` with warnings cap
   - **typecheck**: `npx tsc --noEmit`
   - **test**: `npm test -- --ci --coverage`
   - **security**: `npm audit --audit-level=high`
   - **env-check**: verify no secrets in tracked files
3. **Set up Node.js 18 + npm caching** for fast runs
4. **Add branch protection rules** (manual — via GitHub Settings):
   - Require CI to pass before merge to `main`
   - Require at least 1 review
5. **Fix pre-commit hook** to use `set -e` and chain with `&&`

#### Regression Risks
- CI may fail immediately due to existing lint warnings (978 warnings) — set `--max-warnings=1000` initially, then ratchet down
- Type checking may fail due to missing type definitions — fix in separate PR
- `npm audit` may block PRs for transitive dependency issues — use `--audit-level=high` to only block on high/critical
- If the repo is private, GitHub Actions minutes may be limited

#### Tests to Add
- The CI pipeline IS the test — it validates that lint, types, and tests pass on every push
- Add workflow status badge to README
- Add a simple integration test that CI runs end-to-end

#### Definition of Done
- [ ] `.github/workflows/ci.yml` exists and runs on push/PR
- [ ] Pipeline has 4 jobs: lint, typecheck, test, security
- [ ] Pipeline passes on current `main` branch (with appropriate warning thresholds)
- [ ] Pre-commit hook uses `set -e` for early exit
- [ ] Branch protection configured (or documented as manual step)

---

## 3. GitHub-Ready Backlog

### Epic 1: Security Hardening
**Priority:** P0 — Must do before any release
**Goal:** Eliminate credential exposure and add security guardrails

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a developer, I want credentials removed from git so that our Supabase keys are not publicly exposed | P0 | Keys not in `git ls-files`; old keys rotated | See Fix #1 |
| Task | Add `env.local` to `.gitignore` | P0 | `.gitignore` has explicit `env.local` line | Line 33 area |
| Task | Remove `env.local` from git tracking | P0 | `git rm --cached env.local` committed | Do NOT delete file from disk |
| Task | Rename `env.local` → `.env.local` | P0 | Babel config at `babel.config.js:19` matches; app starts | Test with `npx expo start --clear` |
| Task | Rotate Supabase anon key | P0 | New key in dashboard; old key invalidated | Supabase Dashboard → Settings → API |
| Task | Update `.env.local.example` with all required vars | P0 | Lists `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SENTRY_DSN` | No actual values |
| Story | As a developer, I want Maestro test credentials externalized so they aren't in version control | P1 | `.maestro/config.yaml` uses `${TEST_EMAIL}` env vars | Currently hardcoded |
| Task | Replace hardcoded credentials in `.maestro/config.yaml` | P1 | Config uses `${TEST_EMAIL}` and `${TEST_PASSWORD}` | Document in README how to set |
| Story | As a developer, I want RLS policies on all tables so data access is properly controlled | P1 | `toilets`, `buildings` tables have RLS enabled | See audit Section N |
| Task | Enable RLS on `toilets` table with public SELECT | P1 | `ALTER TABLE public.toilets ENABLE ROW LEVEL SECURITY` | Add via new migration |
| Task | Enable RLS on `buildings` table with public SELECT | P1 | Same pattern as toilets | Same migration file |
| Task | Add DELETE policy on `reviews` table | P1 | Users can delete own reviews | `USING (auth.uid() = user_id)` |
| Task | Fix `user_activity` INSERT policy | P1 | Triggers can insert activities | Remove `WITH CHECK (FALSE)`, use SECURITY DEFINER |

---

### Epic 2: Crash Bug Fixes
**Priority:** P0 — Blocking user experience
**Goal:** Fix all known runtime crash vectors

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a user, I want the app to not crash when image upload fails or dates are invalid | P0 | No ReferenceError on error paths | See Fix #2 |
| Task | Add `debug` import to `AvatarUpload.tsx` | P0 | File has `import { debug } from "../../utils/debug"` | Line 1 area |
| Task | Add `debug` import to `UserReviewCard.tsx` | P0 | Same pattern | Check for other missing imports with grep |
| Task | Audit all files for missing `debug` imports | P0 | `grep` shows 0 unimported `debug()` calls | One-liner grep command in Fix #2 |
| Story | As a user, I want my username to be valid when auto-generated | P1 | No `user_NaN` usernames created | See B15 |
| Task | Add NaN fallback in `supabase.ts:818` username generation | P1 | `isNaN()` check with `Math.random()` fallback | See Patch 5 in audit |
| Story | As a user, I want notification counts to be accurate | P1 | `getUnreadNotificationCount()` returns real count | Currently always returns 0 |
| Task | Fix `activityService.ts` count query | P1 | Use `.data` length or proper Supabase count API | Line ~116 |

---

### Epic 3: Activity Service Auth Fix
**Priority:** P0 — Data integrity issue
**Goal:** All services use authenticated Supabase client

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a user, I want my activity feed to show my actual activities | P0 | Activity service queries with user's auth session | See Fix #3 |
| Task | Replace standalone `createClient()` with `supabaseService.getClient()` in `activityService.ts` | P0 | No direct `createClient` import; uses singleton | Lines 8-19 |
| Task | Verify all RPC calls work with authenticated client | P0 | Activity feed, notifications, unread count all return data | Manual test + unit test |
| Task | Remove unused `@env` import from `activityService.ts` | P0 | No `EXPO_PUBLIC_*` imports in file | Cleanup |

---

### Epic 4: Test Infrastructure Recovery
**Priority:** P0 — Foundation for all future work
**Goal:** Restore working test suite with passing tests

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a developer, I want tests to run so I have regression protection | P0 | `npx jest` executes all 5 suites without transform errors | See Fix #4 |
| Task | Downgrade `jest` to `^29.7.0` | P0 | `package.json` shows `jest@^29.x` | `npm install --save-dev jest@^29.7.0 --legacy-peer-deps` |
| Task | Downgrade `@types/jest` to `^29.5.0` | P0 | Types match runtime | Same install command |
| Task | Verify all 5 test suites execute | P0 | `npx jest --verbose` shows 5 suites, test counts | May need babel plugin fixes |
| Task | Enable `detectOpenHandles: true` in `jest.config.js` | P1 | Config line 51 set to `true` | Catches memory leaks |
| Task | Remove `forceExit: true` from `jest.config.js` | P1 | Config line 53 removed | Fix hanging async instead |
| Story | As a developer, I want test coverage enforced so quality doesn't regress | P2 | Coverage thresholds block PRs with < 30% coverage | Already configured, just needs CI |

---

### Epic 5: CI/CD Pipeline
**Priority:** P1 — Prevents regression of all fixes
**Goal:** Automated quality gates on every push/PR

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a developer, I want automated checks on every PR so bugs don't reach main | P1 | GitHub Actions runs lint, typecheck, test on push/PR | See Fix #5 |
| Task | Create `.github/workflows/ci.yml` | P1 | File exists with 4 jobs | Node 18, npm cache |
| Task | Add lint job: `npm run lint -- --max-warnings=1000` | P1 | Ratchet warnings down over time | Start permissive, tighten |
| Task | Add typecheck job: `npx tsc --noEmit` | P1 | Catches compile errors | May need `tsconfig` fixes first |
| Task | Add test job: `npm test -- --ci --coverage` | P1 | All tests pass in CI | Depends on Fix #4 |
| Task | Add security job: `npm audit --audit-level=high` | P2 | Blocks on high/critical vulns | May need `--production` flag |
| Task | Add env-check job: reject tracked secret files | P1 | `git ls-files \| grep env` fails build | Simple script |
| Task | Fix `.husky/pre-commit` with `set -e` | P1 | Hook exits on first failure | Add `set -e` at top |
| Story | As a developer, I want branch protection so no one bypasses checks | P2 | Main branch requires CI pass + 1 review | Manual GitHub Settings step |

---

### Epic 6: Database Hardening (Sprint 2)
**Priority:** P1

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a user, I want fast query performance as the app scales | P1 | Key queries use indexes | New migration file |
| Task | Add indexes on `reviews` (user_id, created_at, toilet_id+user_id) | P1 | `CREATE INDEX IF NOT EXISTS` in migration | See audit Section N |
| Task | Add indexes on `toilets` (created_at, rating) | P1 | Same pattern | |
| Task | Add indexes on `toilet_submissions` (status, submitter_id+status, created_at) | P2 | Same pattern | |
| Story | As a developer, I want data integrity constraints so invalid data can't enter DB | P1 | CHECK constraints on key columns | New migration |
| Task | Add CHECK on photos array length (max 20) | P1 | `array_length(photos, 1) <= 20` | |
| Task | Add CHECK on description/address length | P2 | `length(description) <= 5000` | |
| Task | Add CHECK on profile stats non-negative | P1 | `reviews_count >= 0` etc. | |
| Story | As a developer, I want migrations to work on fresh installs | P1 | All migrations run sequentially without error | Fix ordering |
| Task | Fix migration `20250522` dependency on `user_activity` | P1 | Add existence check or reorder | `user_activity` created in `20250529` |

---

### Epic 7: Input Validation Layer (Sprint 2)
**Priority:** P1

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a developer, I want runtime validation so malformed data never reaches the DB | P1 | All submissions validated with Zod schemas | Install `zod` |
| Task | Install `zod` dependency | P1 | In `package.json` dependencies | `npm install zod` |
| Task | Create `src/utils/validators.ts` with Toilet, Review, Profile schemas | P1 | Schemas match DB constraints | Export reusable schemas |
| Task | Add validation to `contributionService.submitNewToilet()` | P1 | Coordinates in range, required fields present, strings bounded | Before `supabase.rpc()` call |
| Task | Add validation to review submission | P1 | Rating 1-5, comment length bounded | Before insert |
| Task | Replace `as Type` casts with `schema.parse()` in `supabase.ts` | P2 | 7+ unsafe casts replaced | Lines 805, 862, 945, 1145, 1241 |

---

### Epic 8: Architecture Refactoring (Sprint 3)
**Priority:** P2

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a developer, I want `supabase.ts` split into domain services so the codebase is maintainable | P2 | No file > 400 lines; clear domain boundaries | See audit Section D |
| Task | Extract `authService.ts` from `supabase.ts` | P2 | Auth methods moved; imports updated | ~300 lines |
| Task | Extract `toiletService.ts` from `supabase.ts` | P2 | CRUD toilet methods moved | ~400 lines |
| Task | Extract `reviewService.ts` from `supabase.ts` | P2 | Review methods moved | ~200 lines |
| Task | Extract `sessionService.ts` (consolidate 3 validation paths) | P2 | Single session validation module | From supabase.ts + AuthProvider + contributionService |
| Task | Reduce `supabase.ts` to client singleton only | P2 | < 100 lines, exports only `supabaseService` | |
| Story | As a developer, I want dead code removed | P3 | Unused files deleted | |
| Task | Delete `ClusteredMapView.tsx` | P3 | Not imported anywhere | ~190 lines |
| Task | Delete `DebugExample.tsx` | P3 | Not imported anywhere | |
| Task | Consolidate `ToiletCard` + `PaperToiletCard` | P3 | Single component | |

---

### Epic 9: UX Fixes (Sprint 3)
**Priority:** P2

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Story | As a user, I want my profile tabs to show my actual data | P2 | Reviews/contributions tabs load real data | See B13 |
| Task | Connect ContentList in `profile/index.tsx` to user data APIs | P2 | Replace `data={null}` with API calls | Lines 171-205 |
| Story | As a user, I want feedback when location permission is denied | P2 | Show explicit message instead of silent Singapore fallback | See B10 |
| Task | Add location unavailable state in `MapWithBottomSheet.tsx` | P2 | Banner/toast when using fallback coordinates | |
| Story | As a user, I want accessible labels on interactive elements | P3 | Screen readers can navigate core features | See B19 |
| Task | Add `accessibilityLabel` to Rating, EditableRating, amenity icons | P3 | VoiceOver/TalkBack usable | |

---

### Epic 10: Performance Optimization (Sprint 3)
**Priority:** P2

| Type | Title | Priority | Acceptance Criteria | Technical Notes |
|------|-------|----------|--------------------|----|
| Task | Fix O(n^2) toilet validation with Set | P2 | `stores/toilets.ts:204-205` uses `Set.has()` | 1-line fix |
| Task | Reduce session health check to 5 minutes | P2 | `AuthProvider.tsx:427` interval = 300000 | 1-line fix |
| Task | Add max size to `recentSubmissions` Map | P2 | Cap at 100 entries, purge oldest | `contributionService.ts:175` |
| Task | Debounce map clustering on region change | P3 | `MapView.tsx:226-259` debounced | Use `useMemo` or `setTimeout` |

---

## 4. Sprint Plan Summary

| Sprint | Theme | Epics | Key Deliverables |
|--------|-------|-------|-----------------|
| **Sprint 1** (now) | Security + Stability | 1, 2, 3, 4, 5 | Credentials rotated, crashes fixed, tests working, CI running |
| **Sprint 2** | Correctness + Safety | 6, 7 | DB hardened, input validated, RLS complete, profile data loads |
| **Sprint 3** | Architecture + Polish | 8, 9, 10 | God file split, UX fixed, performance optimized, dead code removed |

---

## 5. Dependencies Between Fixes

```
Fix #1 (credentials) ──→ standalone (do first, no deps)
Fix #2 (debug imports) ──→ standalone (do first, no deps)
Fix #3 (activity auth) ──→ standalone (do first, no deps)
Fix #4 (test suite) ──→ blocks Fix #5 (CI needs passing tests)
Fix #5 (CI pipeline) ──→ depends on Fix #4
                       ──→ enhanced by Fix #1 (env-check job)

Epic 6 (DB) ──→ standalone
Epic 7 (validation) ──→ standalone, but benefits from Epic 4 (tests)
Epic 8 (refactor) ──→ should come AFTER Epics 2-7 (avoid merge conflicts)
Epic 9 (UX) ──→ depends on Epic 3 (activity service fix)
Epic 10 (perf) ──→ standalone
```

Fixes #1, #2, #3 can be done in parallel. Fix #4 before #5. All Sprint 1 fixes are independent of Sprint 2/3 work.
