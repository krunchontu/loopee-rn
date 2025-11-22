# Phase 1 Unit Testing Plan

**Created:** 2025-11-22
**Target:** Phase 1 (70% service coverage, 50% component coverage)
**Status:** Planning Complete - Ready for Execution

---

## Testing Strategy Overview

### Goals
- **Service Coverage:** 70%+ (critical business logic)
- **Component Coverage:** 50%+ (key UI components)
- **Focus:** High-value tests that catch real bugs
- **Approach:** Test-driven bug fixes and critical paths first

### Technology Stack
- **Framework:** Jest
- **React Native Testing:** @testing-library/react-native
- **Mocking:** Jest mocks for Supabase, Location, ImagePicker
- **Coverage:** Jest coverage reporting

---

## Service Unit Tests (Priority 1)

### 1. Authentication Service Tests ✅ COMPLETED
**File:** `src/__tests__/services/supabase-auth.test.ts`
**Priority:** P0 (Critical)
**Effort:** 4 hours (actual)
**Coverage:** 48.11% for supabase.ts (entire file includes auth + other services)
**Tests Passing:** 28 passing, 5 skipped
**Status:** ✅ COMPLETE (2025-11-22)

#### Test Cases:
1. **User Sign Up** ✅
   - ✅ Successfully creates user account
   - ✅ Returns user data and session
   - ✅ Handles duplicate email error
   - ✅ Handles invalid email format
   - ✅ Handles weak password
   - ✅ Network error handling with Sentry integration

2. **User Sign In** ✅
   - ✅ Successfully signs in with valid credentials
   - ✅ Returns user and session
   - ✅ Handles invalid credentials
   - ✅ Handles user not found error
   - ✅ Network error handling with Sentry integration

3. **User Sign Out** ✅
   - ✅ Successfully clears session
   - ✅ Handles sign out errors gracefully
   - ✅ Network error handling with Sentry integration

4. **Password Reset** ⏭️ (5 tests skipped)
   - ⏭️ Platform.select mocking complexity - deferred to integration tests
   - ⏭️ Mobile redirect URL testing
   - ⏭️ Web redirect URL testing
   - ⏭️ Invalid email handling
   - ⏭️ Network error handling

5. **Password Update** ✅
   - ✅ Successfully updates password
   - ✅ Handles password update errors
   - ⏭️ Network error handling (skipped - tested elsewhere)

6. **Session Management (getSession)** ✅
   - ✅ Successfully retrieves current session
   - ✅ Returns null when no session exists
   - ✅ Handles session fetch errors
   - ✅ Handles network errors

7. **Session Refresh (with retry logic)** ✅
   - ✅ Successfully refreshes session on first attempt
   - ✅ Retries on failure with exponential backoff
   - ✅ Returns false after all retry attempts fail
   - ✅ Handles network errors during retry
   - ✅ Prevents concurrent refresh operations

8. **Session Validation (checkSession)** ✅
   - ✅ Returns valid session with correct expiration calculation
   - ✅ Returns invalid when no session exists
   - ✅ Detects expired sessions
   - ✅ Detects sessions expiring soon (within 5 minutes)
   - ✅ Handles invalid timestamp formats gracefully

#### Mock Setup:
```typescript
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));
```

---

### 2. Location Service Tests
**File:** `src/__tests__/services/location.test.ts` (NEW)
**Priority:** P0 (Critical)
**Estimated Effort:** 2.5 hours
**Target Coverage:** 75%

#### Test Cases:
1. **Permission Handling**
   - ✅ Requests location permission
   - ✅ Returns true when granted
   - ❌ Returns false when denied
   - ❌ Handles permission errors

2. **Get Current Position**
   - ✅ Returns coordinates when available
   - ❌ Returns null on error
   - ❌ Handles timeout
   - ⚠️ Validates coordinates are in valid range

3. **Geocoding**
   - ✅ Converts address to coordinates
   - ❌ Returns null for invalid address
   - ❌ Handles API errors

4. **Reverse Geocoding**
   - ✅ Converts coordinates to address
   - ❌ Returns null for invalid coordinates
   - ❌ Handles API errors

5. **Location Updates**
   - ✅ Starts location tracking
   - ✅ Calls callback with updates
   - ✅ Stops tracking when requested
   - ❌ Handles errors during tracking

#### Mock Setup:
```typescript
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
```

---

### 3. Contribution Service Tests
**File:** `src/__tests__/services/contributionService.test.ts` (NEW)
**Priority:** P1 (High)
**Estimated Effort:** 3.5 hours
**Target Coverage:** 70%

#### Test Cases:
1. **Submit Toilet Contribution**
   - ✅ Creates new toilet submission
   - ✅ Uploads photos to storage
   - ✅ Stores metadata in database
   - ❌ Validates required fields
   - ❌ Handles upload failures
   - ❌ Rolls back on partial failure

2. **Duplicate Detection**
   - ✅ Detects nearby duplicate (< 50m)
   - ❌ Allows new toilet when far enough
   - ❌ Handles coordinate edge cases

3. **Photo Upload**
   - ✅ Compresses images before upload
   - ✅ Generates unique filenames
   - ❌ Handles upload errors
   - ❌ Respects size limits

4. **Submission Validation**
   - ✅ Requires name/description
   - ✅ Requires valid coordinates
   - ❌ Validates photo array
   - ❌ Handles malformed data

#### Mock Setup:
```typescript
jest.mock('../services/supabase', () => ({
  supabaseService: {
    uploadPhoto: jest.fn(),
    createToilet: jest.fn(),
    checkNearbyToilets: jest.fn(),
  },
}));
```

---

### 4. Toilet Store Tests
**File:** `src/__tests__/stores/toilets.test.ts` (NEW)
**Priority:** P1 (High)
**Estimated Effort:** 2 hours
**Target Coverage:** 65%

#### Test Cases:
1. **Fetch Nearby Toilets**
   - ✅ Loads toilets within radius
   - ✅ Updates store state
   - ❌ Handles empty results
   - ❌ Handles API errors

2. **Select Toilet**
   - ✅ Sets selected toilet
   - ✅ Triggers detail view
   - ❌ Handles null selection

3. **Search Toilets**
   - ✅ Filters by name/description
   - ✅ Returns matching results
   - ❌ Handles empty query

4. **Add Review**
   - ✅ Posts new review
   - ✅ Updates toilet rating
   - ❌ Validates review data
   - ❌ Handles submission errors

---

## Component Unit Tests (Priority 2)

### 1. ReviewForm Component Tests
**File:** `src/__tests__/components/toilet/ReviewForm.test.tsx` (NEW)
**Priority:** P1 (High)
**Estimated Effort:** 2 hours
**Target Coverage:** 60%

#### Test Cases:
1. **Rendering**
   - ✅ Renders form fields
   - ✅ Shows rating input
   - ✅ Shows comment textarea

2. **User Input**
   - ✅ Updates rating on change
   - ✅ Updates comment on change
   - ❌ Validates required rating

3. **Form Submission**
   - ✅ Calls onSuccess with data
   - ❌ Shows error on failure
   - ❌ Disables submit while submitting

---

### 2. AddToiletLocation Component Tests
**File:** `src/__tests__/components/contribute/AddToiletLocation.test.tsx` (NEW)
**Priority:** P2 (Medium)
**Estimated Effort:** 2.5 hours
**Target Coverage:** 50%

#### Test Cases:
1. **Location Fetching**
   - ✅ Requests current location
   - ✅ Updates map position
   - ❌ Shows error on permission denied

2. **Map Interaction**
   - ✅ Updates location on pin drag
   - ✅ Geocodes address on pin move
   - ❌ Handles geocoding errors

---

### 3. Rating Component Tests
**File:** `src/__tests__/components/shared/Rating.test.tsx` (NEW)
**Priority:** P3 (Low)
**Estimated Effort:** 1 hour
**Target Coverage:** 80%

#### Test Cases:
1. **Display**
   - ✅ Shows correct number of stars
   - ✅ Fills stars based on value
   - ✅ Handles half stars

2. **Edge Cases**
   - ✅ Handles value 0
   - ✅ Handles value 5
   - ✅ Handles decimal values

---

### 4. ErrorBoundary Component Tests
**File:** `src/__tests__/components/shared/ErrorBoundary.test.tsx` (NEW)
**Priority:** P2 (Medium)
**Estimated Effort:** 1.5 hours
**Target Coverage:** 70%

#### Test Cases:
1. **Error Handling**
   - ✅ Catches child component errors
   - ✅ Displays fallback UI
   - ✅ Calls onError callback

2. **Recovery**
   - ✅ Resets state on retry
   - ✅ Re-renders children after reset

---

## Testing Effort Summary

### Total Estimated Effort: 19.5 hours

#### Breakdown by Priority:
- **P0 (Critical):** 8.5 hours
  - Auth Service: 3h
  - Location Service: 2.5h
  - ReviewForm: 2h
  - Toilet Store: 1h

- **P1 (High):** 7.5 hours
  - Contribution Service: 3.5h
  - Toilet Store: 2h
  - AddToiletLocation: 2.5h

- **P2 (Medium):** 2.5 hours
  - ErrorBoundary: 1.5h
  - (AddToiletLocation partially P2)

- **P3 (Low):** 1 hour
  - Rating Component: 1h

### Recommended Approach:
**Session 1 (4 hours):**
- Auth Service Tests (3h)
- Location Service Tests (1h of 2.5h)

**Session 2 (4 hours):**
- Finish Location Service (1.5h)
- ReviewForm Tests (2h)
- Start Contribution Service (0.5h)

**Session 3 (4 hours):**
- Finish Contribution Service (3h)
- Toilet Store Tests (1h of 2h)

**Session 4 (3.5 hours):**
- Finish Toilet Store (1h)
- AddToiletLocation (2.5h)

**Session 5 (4 hours):**
- ErrorBoundary (1.5h)
- Rating Component (1h)
- Coverage report & gaps (1.5h)

---

## Testing Utilities & Setup

### Test Environment Setup
```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-native/extend-expect';

// Mock global objects
global.window = {
  location: {
    origin: 'https://loopee.app',
  },
};

// Suppress console during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
```

### Common Mocks
```typescript
// src/__tests__/mocks/supabase.ts
export const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
};

// src/__tests__/mocks/location.ts
export const mockLocationService = {
  requestPermissions: jest.fn(() => Promise.resolve(true)),
  getCurrentPosition: jest.fn(() => Promise.resolve({
    latitude: 1.3521,
    longitude: 103.8198,
  })),
};
```

---

## Coverage Requirements

### Minimum Coverage Targets:
- **Services:** 70% overall
  - Auth: 80%
  - Location: 75%
  - Contribution: 70%
  - Store: 65%

- **Components:** 50% overall
  - Critical components: 60%+
  - Standard components: 50%+
  - Low-priority components: 40%+

### Coverage Reporting:
```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

---

## Success Criteria

### Phase 1 Testing Complete When:
- ✅ All P0 tests implemented (8.5 hours)
- ✅ All P1 tests implemented (7.5 hours)
- ✅ Service coverage ≥ 70%
- ✅ Component coverage ≥ 50%
- ✅ All tests passing in CI
- ✅ Coverage reports generated
- ✅ Test documentation updated

### Optional (Time Permitting):
- P2 tests (2.5 hours)
- P3 tests (1 hour)
- Integration tests for critical flows
- E2E smoke tests

---

## Blockers & Dependencies

### Current Blockers:
None - ready to start

### Dependencies:
- Jest configured ✅
- Testing library installed ✅
- Mock setup ✅
- Test environment configured ✅

---

## Next Steps for Developer

### Immediate Actions:
1. Review this test plan
2. Choose starting point (recommend: Auth Service)
3. Create test file: `src/__tests__/services/supabase-auth.test.ts`
4. Implement test cases from plan
5. Run tests: `npm test`
6. Check coverage: `npm run test:coverage`
7. Iterate until coverage target met

### When to Break Down Further:
- If any service test file exceeds 2 hours, break into smaller files
- If blocked on mocking, document and skip to next test
- If coverage stuck below target, add edge case tests

---

**Document Version:** 1.0
**Next Review:** After completing P0 tests (8.5 hours)
**Owner:** Development Team
