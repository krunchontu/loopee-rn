# Next Development Session - Action Plan

**Created:** 2025-11-22
**Session Focus:** Complete Sentry Integration & Start Unit Testing
**Estimated Duration:** 4-5 hours

---

## 🎯 Session Objectives

### Primary Goals:
1. **Complete Sentry integration** (1 hour)
2. **Start unit testing** - Auth Service (3 hours)
3. **Document progress** (30 minutes)

### Success Metrics:
- Sentry fully operational
- Auth service tests: 80%+ coverage
- All tests passing
- Documentation updated

---

## 📋 Pre-Session Checklist

### Required Manual Steps (DO BEFORE CODING):
- [ ] Create Sentry account at https://sentry.io/signup/
- [ ] Create new React Native project in Sentry
- [ ] Copy DSN key from Sentry project settings
- [ ] Add DSN to `.env.local`:
  ```env
  EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/7891011
  ```
- [ ] Verify `.env.local` is in `.gitignore`

### Development Environment:
- [x] ESLint configured and working (0 errors)
- [x] All tests passing (3/3)
- [x] Debug utility implemented
- [x] Sentry SDK installed
- [x] Test plan created

---

## 🚀 Session Execution Plan

### Phase 1: Sentry Integration (60 minutes)

#### Task 1.1: Initialize Sentry in App (15 min)
**File:** `src/app/_layout.tsx`
```typescript
import { initSentry } from './services/sentry';

// Add at the very top of the component
useEffect(() => {
  initSentry();
}, []);
```

#### Task 1.2: Integrate with ErrorBoundaryProvider (20 min)
**File:** `src/components/ErrorBoundaryProvider.tsx`
```typescript
import { captureException, setUserContext } from '../services/sentry';

// Update error handlers
export const SafeMapView = withErrorBoundary(CustomMapView, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    debug.error("MapView", "Map Error", { error, errorInfo });
    captureException(error, { errorInfo });
  },
});
```

#### Task 1.3: Add Error Tracking to Services (25 min)
**Files:**
- `src/services/location.ts`
- `src/services/supabase.ts`

```typescript
import { captureException } from './sentry';

catch (error) {
  debug.error("Location", "Error message", error);
  captureException(error as Error, {
    service: 'location',
    method: 'getCurrentPosition'
  });
  throw error;
}
```

#### Task 1.4: Verify Sentry Integration (10 min)
- Test error capture
- Check Sentry dashboard for events
- Verify breadcrumbs working

---

### Phase 2: Auth Service Unit Tests (180 minutes)

#### Task 2.1: Setup Test File (30 min)
**File:** `src/__tests__/services/supabase-auth.test.ts` (NEW)

```typescript
import { supabaseService } from '../../services/supabase';
import { mockSupabaseClient } from '../mocks/supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests here
});
```

#### Task 2.2: Sign Up Tests (40 min)
- ✅ Successfully creates user account
- ❌ Handles duplicate email error
- ❌ Handles invalid email format
- ❌ Handles weak password

#### Task 2.3: Sign In Tests (30 min)
- ✅ Successfully signs in
- ❌ Handles invalid credentials
- ❌ Handles network errors

#### Task 2.4: Sign Out Tests (20 min)
- ✅ Clears session
- ❌ Handles errors

#### Task 2.5: Password Reset Tests (30 min)
- ✅ Sends reset email
- ❌ Handles invalid email
- ⚠️ Document browser API issue

#### Task 2.6: Session Management Tests (30 min)
- ✅ Gets current session
- ✅ Refreshes expired session
- ❌ Handles missing session

---

### Phase 3: Verification & Documentation (30 minutes)

#### Task 3.1: Run Tests & Check Coverage (15 min)
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

**Verify:**
- All auth tests passing
- Auth service coverage ≥ 80%
- No new failing tests

#### Task 3.2: Update Documentation (15 min)
**Files to update:**
- `MVP_DEVELOPMENT_PLAN.md`
  - Mark 1.4.4 complete (Sentry integration)
  - Mark 1.2.1 complete (Auth service tests)
  - Update Phase 1 progress percentage

- `ISSUES_LOG.md`
  - Resolve ISSUE-045 (Sentry DSN)
  - Resolve ISSUE-010 fully (Error tracking)

- `NEXT_SESSION_PLAN.md`
  - Create new plan for Session 2 (Location Service tests)

---

## 🔍 Testing & Validation

### Sentry Validation:
```bash
# Trigger a test error
# Add to App.tsx temporarily:
throw new Error('Sentry test error');

# Check Sentry dashboard for error event
# Verify:
# - Error appears in Sentry
# - Stack trace is correct
# - Breadcrumbs captured
# - Environment is correct
```

### Test Validation:
```bash
# Run specific test file
npm test supabase-auth.test.ts

# Run all tests
npm test

# Generate coverage
npm run test:coverage

# Expected results:
# - All tests passing
# - Auth service: 80%+ coverage
# - Overall services: 30%+ coverage (1 of 4 services done)
```

---

## ⚠️ Potential Blockers

### Known Issues:
1. **ISSUE-001:** Browser API in password reset
   - **Workaround:** Mock or skip test, document in comments
   - **Long-term:** Fix in separate PR

2. **Supabase Mocking Challenges**
   - **Solution:** Use jest.mock with factory function
   - **Reference:** See `PHASE1_UNIT_TEST_PLAN.md` mock examples

3. **Async Testing**
   - **Solution:** Use `async/await` in tests
   - **Pattern:**
     ```typescript
     it('should sign in', async () => {
       const result = await supabaseService.signIn(email, password);
       expect(result).toBeDefined();
     });
     ```

---

## 📊 Progress Tracking

### Before Session:
- Phase 1: 4/24 tasks (17%)
- Service Coverage: 0%
- Component Coverage: 0%

### After Session (Target):
- Phase 1: 6/24 tasks (25%)
- Service Coverage: 20% (1 of 4 services)
- Component Coverage: 0%

### Commits Expected:
1. `feat: integrate Sentry error tracking with error boundaries`
2. `test: add comprehensive auth service unit tests (80% coverage)`
3. `docs: update Phase 1 progress - Sentry complete, auth tests done`

---

## 🎯 Definition of Done

### Sentry Integration Complete When:
- ✅ Sentry initialized in App.tsx
- ✅ Error boundaries send to Sentry
- ✅ Service errors tracked
- ✅ Test error confirmed in Sentry dashboard
- ✅ DSN environment variable secured

### Auth Tests Complete When:
- ✅ All test cases from plan implemented
- ✅ Coverage ≥ 80%
- ✅ All tests passing
- ✅ Edge cases covered
- ✅ Mocks working correctly

---

## 📝 Notes for Future Sessions

### Session 2 Will Focus On:
1. Location Service tests (2.5 hours)
2. ReviewForm Component tests (2 hours)

### Session 3 Will Focus On:
1. Contribution Service tests (3.5 hours)
2. Start Toilet Store tests (1 hour)

### Technical Debt to Address:
- ISSUE-001: Browser API in password reset
- ISSUE-009: Memory leak in recentSubmissions
- ISSUE-011: Large monolithic files (supabase.ts, contributionService.ts)

---

## 🆘 If Stuck

### Resources:
- **Test Plan:** `PHASE1_UNIT_TEST_PLAN.md`
- **MVP Plan:** `MVP_DEVELOPMENT_PLAN.md`
- **Issues:** `ISSUES_LOG.md`

### Quick Help:
- **Mock not working?** Check jest.mock() factory function
- **Async test failing?** Use `async/await` and `waitFor`
- **Coverage too low?** Add edge case tests
- **Sentry not capturing?** Check DSN format and initialization

### Escalation:
- If blocked > 30 min on any task, document and move to next
- Update NEXT_SESSION_PLAN.md with blockers
- Create new issue in ISSUES_LOG.md if needed

---

**Document Version:** 1.0
**Next Update:** End of next session
**Owner:** Development Team
