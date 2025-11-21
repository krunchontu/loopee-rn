# Loopee App - Issues & Bugs Log

**Last Updated:** 2025-11-21
**Status:** Active Development

---

## Issue Summary

| Severity | Count | Resolved | Pending |
|----------|-------|----------|---------|
| 🔴 CRITICAL | 3 | 0 | 3 |
| 🟠 HIGH | 11 | 0 | 11 |
| 🟡 MEDIUM | 18 | 0 | 18 |
| 🔵 LOW | 12 | 0 | 12 |
| **TOTAL** | **44** | **0** | **44** |

---

## Critical Issues (Must Fix Before Release)

### 🔴 ISSUE-001: Browser API Used in Mobile App
**Severity:** CRITICAL
**Status:** 🔴 Open
**Priority:** P0
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
`window.location.origin` is used in `services/supabase.ts:549` which will crash the app on mobile devices (React Native doesn't have `window.location`).

**Location:**
- File: `src/services/supabase.ts`
- Line: 549
- Function: Password reset flow

**Code:**
```typescript
// BROKEN CODE:
redirectTo: `${window.location.origin}/auth/callback`,
```

**Impact:**
- App crashes when user tries to reset password
- Blocks password recovery functionality
- Production blocker

**Recommended Fix:**
```typescript
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const redirectUrl = Platform.select({
  web: () => `${window.location.origin}/auth/callback`,
  default: () => Linking.createURL('auth/callback')
})();

// Use redirectUrl instead
```

**Effort:** 30 minutes
**Dependencies:** None
**Related Issues:** None

---

### 🔴 ISSUE-002: No Testing Infrastructure
**Severity:** CRITICAL
**Status:** 🔴 Open
**Priority:** P0
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
Zero test coverage across the entire application. No Jest configuration, no test files, no CI/CD pipeline.

**Impact:**
- Cannot verify functionality works
- High risk of regressions
- Risky deployments
- Hard to refactor code
- Production blocker

**Required Actions:**
1. Install testing dependencies (@testing-library/react-native, jest)
2. Configure Jest (jest.config.js)
3. Write first smoke test
4. Set up CI/CD with GitHub Actions
5. Achieve 60%+ coverage on services
6. Achieve 50%+ coverage on components

**Effort:** 1-2 weeks (Phase 1)
**Dependencies:** Phase 0 must complete first
**Related Issues:** None

---

### 🔴 ISSUE-003: ESLint Configuration Broken
**Severity:** CRITICAL
**Status:** 🔴 Open
**Priority:** P0
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
ESLint configuration uses old `.eslintrc.js` format incompatible with ESLint 9.x currently installed. Linting is completely disabled.

**Error:**
```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Impact:**
- Cannot enforce code quality
- No linting on commits
- Risk of bugs and inconsistencies

**Recommended Fix (Option A):**
Downgrade to ESLint 8.x
```bash
npm install --save-dev eslint@8.56.0
```

**Recommended Fix (Option B - Better):**
Migrate to new flat config format (eslint.config.js)

**Effort:** 1 hour
**Dependencies:** None
**Related Issues:** None

---

## High Priority Issues

### 🟠 ISSUE-004: No Dependencies Installed
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P0
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
`node_modules/` directory doesn't exist. App cannot build or run.

**Required Action:**
```bash
npm install --legacy-peer-deps
```

**Impact:**
- Cannot develop or build app
- Blocks all work

**Effort:** 30 minutes (includes download time)
**Dependencies:** None
**Related Issues:** None

---

### 🟠 ISSUE-005: Console Logging in Production Code
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
8+ instances of `console.log()` in production code should use the debug utility instead.

**Locations:**
- `src/services/location.ts` (4 instances)
- `src/components/contribute/AddToiletPhotos.tsx` (1 instance)
- `src/app/profile/edit.tsx` (1 instance)
- `src/app/profile/index.tsx` (2 instances)

**Impact:**
- Performance overhead in production
- Excessive logging
- May leak sensitive information

**Recommended Fix:**
```typescript
// Before:
console.log('Location:', location);

// After:
debug.log('Location', 'Location retrieved', { location });
```

**Effort:** 2 hours
**Dependencies:** None
**Related Issues:** ISSUE-006

---

### 🟠 ISSUE-006: Sensitive Data in Logs
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
User profiles and email addresses are logged without sanitization.

**Locations:**
- `src/providers/AuthProvider.tsx` (user object logged)
- `src/services/supabase.ts` (email in error logs)

**Impact:**
- Privacy violation
- GDPR compliance risk
- Sensitive data exposure

**Recommended Fix:**
Implement data sanitization before logging:
```typescript
const sanitizeUser = (user: User) => ({
  id: user.id.slice(0, 8) + '...',
  email: user.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
});

debug.log('Auth', 'User loaded', sanitizeUser(user));
```

**Effort:** 2 hours
**Dependencies:** ISSUE-005 (consolidate logging)
**Related Issues:** ISSUE-005

---

### 🟠 ISSUE-007: Weak Random Number Generation
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
`Math.random()` is used for generating operation IDs and usernames, which is not cryptographically secure.

**Locations:**
- `src/services/contributionService.ts` (operation IDs)
- Username generation (if any)

**Impact:**
- Predictable IDs
- Potential security vulnerability
- ID collisions possible

**Recommended Fix:**
```typescript
import { randomBytes } from 'expo-crypto';

export const generateId = (): string => {
  return randomBytes(16).toString('hex');
};
```

**Effort:** 1 hour
**Dependencies:** None
**Related Issues:** None

---

### 🟠 ISSUE-008: No Input Validation for Coordinates
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
Location coordinates accept any numeric value without validation. Could cause crashes or incorrect data.

**Locations:**
- `src/services/location.ts`
- `src/components/contribute/AddToiletLocation.tsx`

**Impact:**
- Invalid locations stored in database
- Map crashes with invalid coordinates
- Data integrity issues

**Recommended Fix:**
```typescript
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};

// Use before storing/displaying coordinates
```

**Effort:** 1 hour
**Dependencies:** None
**Related Issues:** None

---

### 🟠 ISSUE-009: Memory Leak in recentSubmissions Map
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
`recentSubmissions` Map in `contributionService.ts` grows unbounded without cleanup.

**Location:**
- File: `src/services/contributionService.ts`
- Variable: `recentSubmissions`

**Code:**
```typescript
private recentSubmissions = new Map<string, number>();
```

**Impact:**
- Memory usage grows over time
- Especially bad for power users
- App may slow down or crash

**Recommended Fix:**
Implement LRU cache with max size:
```typescript
class LRUMap<K, V> extends Map<K, V> {
  constructor(private maxSize: number) { super(); }

  set(key: K, value: V) {
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      this.delete(firstKey);
    }
    return super.set(key, value);
  }
}

private recentSubmissions = new LRUMap<string, number>(100);
```

**Effort:** 1 hour
**Dependencies:** None
**Related Issues:** None

---

### 🟠 ISSUE-010: No Error Tracking Service
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
No error tracking or monitoring (Sentry, Bugsnag, etc.) configured. Cannot debug production issues.

**Impact:**
- Flying blind in production
- Cannot diagnose user-reported crashes
- No performance monitoring
- Production blocker

**Required Actions:**
1. Create Sentry account (free tier: 5k events/month)
2. Install `@sentry/react-native`
3. Configure Sentry with environment detection
4. Integrate with error boundaries
5. Track API errors

**Effort:** 4 hours
**Dependencies:** None
**Related Issues:** None

---

### 🟠 ISSUE-011: Large Monolithic Files
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
7 files exceed 500 lines, making them hard to maintain and test.

**Files:**
- `src/services/supabase.ts` (1,244 lines)
- `src/services/contributionService.ts` (1,121 lines)
- `src/providers/AuthProvider.tsx` (830 lines)

**Impact:**
- Hard to understand and maintain
- Difficult to test
- Merge conflicts more likely
- Code smells

**Recommended Refactor:**

**supabase.ts** → Split into:
- `src/services/supabase/client.ts` (setup)
- `src/services/supabase/auth.ts` (auth methods)
- `src/services/supabase/toilets.ts` (toilet CRUD)
- `src/services/supabase/reviews.ts` (review methods)

**contributionService.ts** → Split into:
- `src/services/contribution/validation.ts`
- `src/services/contribution/submission.ts`
- `src/services/contribution/duplicateCheck.ts`

**Effort:** 8 hours total
**Dependencies:** Phase 1 testing setup (easier to refactor with tests)
**Related Issues:** None

---

### 🟠 ISSUE-012: No Onboarding Flow
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
New users are dropped into the app without guidance or permission requests.

**Impact:**
- Poor first-time user experience
- Users may not grant location permission
- Users may not understand app features
- Low retention

**Required Features:**
1. Welcome screens (3-4 slides)
2. Permission requests (location, camera)
3. Tutorial overlays
4. "Skip" option
5. Don't show again (AsyncStorage)

**Effort:** 1 week
**Dependencies:** Phase 1 complete
**Related Issues:** None

---

### 🟠 ISSUE-013: No Offline Support
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
App requires constant internet connection. Crashes or shows errors when offline.

**Impact:**
- Poor UX in buildings with bad reception
- Cannot view recently seen toilets
- Contributions lost if offline
- Major pain point for users

**Required Features:**
1. Offline data caching (last 50 toilets)
2. Offline action queue (queue contributions)
3. Network status detection
4. Offline indicator UI
5. Auto-sync when back online

**Effort:** 1 week
**Dependencies:** Phase 1 complete
**Related Issues:** None

---

### 🟠 ISSUE-014: No Search Functionality
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
Users cannot search for toilets by name or address. Must scroll through map.

**Impact:**
- Poor UX when looking for specific location
- Cannot find known toilets easily
- Feature gap vs. competitors

**Required Features:**
1. Search by toilet name
2. Search by address
3. Recent searches
4. Debounced input
5. Search results display

**Effort:** 4 days
**Dependencies:** Phase 1 complete
**Related Issues:** ISSUE-015

---

### 🟠 ISSUE-015: No Filter Functionality
**Severity:** HIGH
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
Users cannot filter toilets by accessibility, free/paid, amenities, or rating.

**Impact:**
- Users with accessibility needs cannot find suitable toilets
- Poor UX for users with specific requirements

**Required Features:**
1. Filter by accessibility
2. Filter by free/paid
3. Filter by amenities (checkboxes)
4. Filter by minimum rating
5. Clear filters button

**Effort:** 3 days
**Dependencies:** Phase 1 complete
**Related Issues:** ISSUE-014

---

## Medium Priority Issues

### 🟡 ISSUE-016: Unsafe Type Assertions
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
Widespread use of `as unknown as X` double assertions that bypass TypeScript's type safety.

**Locations:**
- `src/foundations/react-native-helpers.ts`
- `src/utils/AuthDebugger.ts`

**Impact:**
- Defeats purpose of TypeScript
- Runtime errors possible
- Type safety illusion

**Recommended Fix:**
Replace with proper type guards:
```typescript
// Before:
const style = value as unknown as ViewStyle;

// After:
function isViewStyle(value: unknown): value is ViewStyle {
  return typeof value === 'object' && value !== null;
}

if (isViewStyle(value)) {
  // TypeScript knows value is ViewStyle here
}
```

**Effort:** 3 hours
**Dependencies:** None
**Related Issues:** None

---

### 🟡 ISSUE-017: No Content Moderation System
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
No way to report spam, inappropriate content, or duplicates.

**Impact:**
- Spam accumulates
- Inappropriate content not removable
- Poor community experience

**Required Features:**
1. Report toilet functionality
2. Report review functionality
3. Report user functionality
4. Admin moderation panel
5. Auto-spam detection (basic)

**Effort:** 1 week
**Dependencies:** Phase 1 complete
**Related Issues:** None

---

### 🟡 ISSUE-018: No Analytics Implementation
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
PostHog is installed but not configured or used. No usage tracking.

**Impact:**
- Cannot measure user engagement
- Cannot identify popular features
- Cannot track conversion funnels
- No data for product decisions

**Required Actions:**
1. Initialize PostHog
2. Track screen views
3. Track search events
4. Track contribution events
5. Track toilet views
6. Set up analytics dashboard

**Effort:** 2 days
**Dependencies:** Phase 1 complete
**Related Issues:** None

---

### 🟡 ISSUE-019: No Database Schema Documentation
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
No schema documentation in the repo. Cannot understand data model without Supabase access.

**Impact:**
- New developers cannot understand data model
- Risk of schema drift
- Hard to plan features

**Required Actions:**
1. Export schema from Supabase
2. Document all tables in `database/SCHEMA.md`
3. Create ER diagram
4. Add to version control

**Effort:** 3 hours
**Dependencies:** None
**Related Issues:** None

---

### 🟡 ISSUE-020: Environment Configuration in Git
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
`.env.local` with Supabase keys committed to git. Should use `.env.local.example` instead.

**Impact:**
- Security risk (keys in git history)
- Accidental key exposure
- Cannot have separate dev/prod configs

**Recommended Fix:**
1. Create `.env.local.example` with placeholders
2. Add `.env.local` to `.gitignore`
3. Remove `.env.local` from git history (optional)
4. Document in README how to set up env vars

**Effort:** 30 minutes
**Dependencies:** None
**Related Issues:** None

---

### 🟡 ISSUE-021: No CI/CD Pipeline
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
No automated testing or deployment pipeline.

**Impact:**
- Manual testing required
- No automated quality gates
- Risky deployments
- Slow release cycle

**Required Actions:**
1. Set up GitHub Actions workflow
2. Run tests on pull requests
3. Run linter on pull requests
4. Auto-build on main branch
5. Optional: Auto-deploy to beta

**Effort:** 4 hours
**Dependencies:** ISSUE-002 (tests must exist first)
**Related Issues:** ISSUE-002

---

### 🟡 ISSUE-022: No Developer Documentation
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 0

**Description:**
No CONTRIBUTING.md or setup guide for new developers.

**Impact:**
- Hard for new developers to onboard
- Inconsistent development practices
- Knowledge siloed

**Required Actions:**
1. Create CONTRIBUTING.md
2. Update README.md with setup guide
3. Document coding standards
4. Document git workflow
5. Add PR template

**Effort:** 3 hours
**Dependencies:** None
**Related Issues:** None

---

### 🟡 ISSUE-023: Heavy Bundle Size
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 3

**Description:**
Extensive polyfills and multiple overlapping libraries may cause large bundle.

**Potential Issues:**
- browserify-zlib, stream-browserify, crypto polyfills
- react-native-modalize + @gorhom/bottom-sheet (2 modal libs)
- react-native-paper + custom design system (overlap)

**Impact:**
- Slow app startup
- Large download size
- Poor performance on older devices

**Recommended Actions:**
1. Run bundle analyzer
2. Remove unused dependencies
3. Consider removing react-native-modalize (use only bottom-sheet)
4. Lazy load heavy screens
5. Implement code splitting

**Effort:** 1 day
**Dependencies:** Phase 2 complete
**Related Issues:** None

---

### 🟡 ISSUE-024: Missing Accessibility Features
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 3

**Description:**
No accessibility labels on interactive elements. Not tested with screen readers.

**Impact:**
- App unusable for visually impaired users
- Legal compliance risk (ADA, WCAG)
- Excludes significant user base

**Required Actions:**
1. Add `accessibilityLabel` to all buttons
2. Add `accessibilityHint` where helpful
3. Test with TalkBack (Android)
4. Test with VoiceOver (iOS)
5. Ensure color contrast meets WCAG AA

**Effort:** 1 week
**Dependencies:** Phase 2 complete
**Related Issues:** None

---

### 🟡 ISSUE-025: No Rate Limiting
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2

**Description:**
No rate limiting on API calls or contributions.

**Impact:**
- Vulnerable to spam/abuse
- API costs could spike
- Database could be flooded

**Recommended Fix:**
1. Implement client-side rate limiting (max 5 contributions/hour)
2. Implement server-side rate limiting (Supabase Edge Functions)
3. Add cooldown UI feedback

**Effort:** 4 hours
**Dependencies:** None
**Related Issues:** ISSUE-017

---

### 🟡 ISSUE-026: No Image Optimization
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
Users can upload large unoptimized images, wasting storage and bandwidth.

**Impact:**
- High storage costs
- Slow image loading
- Poor UX on slow connections
- Exceeds Supabase free tier faster

**Recommended Fix:**
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri: string) => {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipulated.uri;
};
```

**Effort:** 2 hours
**Dependencies:** None
**Related Issues:** ISSUE-035 (consider Cloudinary)

---

### 🟡 ISSUE-027: Inconsistent Error Handling
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 1

**Description:**
Error handling varies across services - some log comprehensively, others just return null.

**Impact:**
- Hard to debug issues
- Inconsistent error messages
- Silent failures possible

**Recommended Fix:**
Standardize error handling pattern:
```typescript
try {
  // operation
} catch (error) {
  debug.error('ServiceName', 'Method failed', error);
  Sentry.captureException(error, { tags: { service, method } });
  throw new AppError('User-friendly message', error);
}
```

**Effort:** 4 hours
**Dependencies:** ISSUE-010 (Sentry setup)
**Related Issues:** ISSUE-010

---

### 🟡 ISSUE-028: No Privacy Policy or Terms
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 4

**Description:**
No privacy policy or terms of service. Required for app store submission.

**Impact:**
- Cannot submit to app stores
- Legal compliance issues
- GDPR violations

**Required Actions:**
1. Draft privacy policy (use generator or lawyer)
2. Draft terms of service
3. Host on website or in-app
4. Add links to app
5. Require acceptance on signup

**Effort:** 6 hours (including legal review)
**Dependencies:** None
**Related Issues:** None

---

### 🟡 ISSUE-029: No App Store Assets
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P1
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 4

**Description:**
No app icon, screenshots, or promotional graphics for app stores.

**Impact:**
- Cannot publish to app stores
- Poor app store presentation
- Low conversion rate

**Required Assets:**
1. App icon (1024x1024 + adaptive icon)
2. Screenshots (5-8 per platform)
3. Feature graphic (Android)
4. App preview video (optional)
5. App store descriptions

**Effort:** 1 day (with designer)
**Dependencies:** Phase 3 complete (need polished app for screenshots)
**Related Issues:** None

---

### 🟡 ISSUE-030: No User Feedback Mechanism
**Severity:** MEDIUM
**Status:** 🔴 Open
**Priority:** P3
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Post-MVP

**Description:**
No in-app way for users to provide feedback or report bugs.

**Impact:**
- Cannot collect user feedback
- Users frustrated with no response channel
- Miss improvement opportunities

**Recommended Features:**
1. Feedback form in settings
2. Bug report button
3. Rate app prompt
4. Send to email or support platform

**Effort:** 3 hours
**Dependencies:** None
**Related Issues:** None

---

## Low Priority Issues

### 🔵 ISSUE-031: No Dark Mode Implementation
**Severity:** LOW
**Status:** 🔴 Open
**Priority:** P3
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Post-MVP

**Description:**
Dark mode foundation exists in design system but not fully implemented.

**Impact:**
- Poor UX for users who prefer dark mode
- Battery drain on OLED screens
- Feature gap

**Effort:** 1 week
**Dependencies:** Post-MVP
**Related Issues:** None

---

### 🔵 ISSUE-032: No Push Notifications
**Severity:** LOW
**Status:** 🔴 Open
**Priority:** P3
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Post-MVP

**Description:**
No push notification system for nearby toilets, contribution approvals, etc.

**Impact:**
- Lower user engagement
- Users don't know when contributions approved

**Effort:** 1 week
**Dependencies:** Post-MVP
**Related Issues:** None

---

### 🔵 ISSUE-033: No Multi-language Support
**Severity:** LOW
**Status:** 🔴 Open
**Priority:** P3
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Post-MVP

**Description:**
App is English-only.

**Impact:**
- Limited to English-speaking markets
- Excludes non-English users

**Effort:** 2 weeks
**Dependencies:** Post-MVP
**Related Issues:** None

---

### 🔵 ISSUE-034: No Social Features
**Severity:** LOW
**Status:** 🔴 Open
**Priority:** P3
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Post-MVP

**Description:**
No friend system, sharing, or social features.

**Impact:**
- Lower viral growth
- Less engaging

**Effort:** 2-3 weeks
**Dependencies:** Post-MVP
**Related Issues:** None

---

### 🔵 ISSUE-035: Google Maps Costs
**Severity:** LOW
**Status:** 🔴 Open
**Priority:** P2
**Assigned:** Unassigned
**Created:** 2025-11-21
**Target:** Phase 2 (optional)

**Description:**
Google Maps has limited free tier ($200/mo credit = ~28.5k map loads). Could get expensive.

**Impact:**
- Costs spike with growth
- $100-500/mo at moderate scale

**Recommended Alternative:**
Switch to Mapbox (50k MAU free, better economics)

**Effort:** 3 days
**Dependencies:** None (can defer to later)
**Related Issues:** None

---

### 🔵 ISSUE-036-044: Minor Code Quality Issues

**ISSUE-036:** Missing JSDoc comments on complex functions
**ISSUE-037:** Inconsistent naming conventions (some camelCase, some PascalCase)
**ISSUE-038:** Magic numbers in code (should use constants)
**ISSUE-039:** Duplicate code in multiple components
**ISSUE-040:** Missing PropTypes/TypeScript interfaces on some components
**ISSUE-041:** Empty catch blocks in some error handlers
**ISSUE-042:** Hardcoded strings (should use i18n)
**ISSUE-043:** Long function parameter lists (>5 params)
**ISSUE-044:** Nested ternaries (hard to read)

**Collective Impact:** Code maintainability
**Collective Effort:** 1-2 days
**Target:** Phase 3 (polish)

---

## Resolved Issues

_No issues resolved yet._

---

## Issue Statistics

### By Phase

| Phase | Critical | High | Medium | Low | Total |
|-------|----------|------|--------|-----|-------|
| Phase 0 | 3 | 1 | 3 | 0 | 7 |
| Phase 1 | 0 | 5 | 7 | 0 | 12 |
| Phase 2 | 0 | 5 | 3 | 1 | 9 |
| Phase 3 | 0 | 0 | 2 | 0 | 2 |
| Phase 4 | 0 | 0 | 2 | 0 | 2 |
| Post-MVP | 0 | 0 | 0 | 12 | 12 |

### By Category

| Category | Count |
|----------|-------|
| Code Quality | 12 |
| Infrastructure | 8 |
| Features | 10 |
| Security | 5 |
| UX/UI | 6 |
| Documentation | 3 |

---

## Issue Tracking Workflow

### Status Labels
- 🔴 **Open** - Issue identified, not started
- 🟡 **In Progress** - Actively being worked on
- 🟢 **Resolved** - Fixed and verified
- ⚫ **Closed** - Won't fix or duplicate

### Priority Levels
- **P0** - Critical, blocks release
- **P1** - High, must fix for MVP
- **P2** - Medium, should fix for MVP
- **P3** - Low, defer to post-MVP

### Severity Levels
- 🔴 **CRITICAL** - App crashes, data loss, security breach
- 🟠 **HIGH** - Major feature broken, bad UX, security risk
- 🟡 **MEDIUM** - Minor feature issue, moderate UX problem
- 🔵 **LOW** - Cosmetic, nice-to-have, minor inconvenience

---

## Next Actions

1. **Review and prioritize** this issues log
2. **Assign ownership** for Phase 0 critical issues
3. **Create GitHub Issues** from this log (optional)
4. **Start with ISSUE-001** (window.location.origin fix)
5. **Update this log** as issues are resolved

---

**Document Version:** 1.0
**Maintained By:** Development Team
**Review Cadence:** Weekly during active development
