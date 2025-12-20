# Loopee Testing Strategy

**Last Updated:** 2025-12-07
**Status:** Active

---

## Overview

Loopee uses a **hybrid testing approach** combining:

1. **Unit Tests (Jest)** - Service layer and business logic
2. **E2E Tests (Maestro)** - UI components and user flows

This strategy was adopted due to React Native bridge compatibility issues with Expo SDK 53 that prevented Jest component testing.

---

## Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ← Maestro (6 flows)
                    │  (Maestro)  │     User journeys
                    ├─────────────┤
                    │             │
                    │    Unit     │  ← Jest (123 tests)
                    │   (Jest)    │     Services, stores
                    │             │
                    └─────────────┘
```

---

## Unit Tests (Jest)

### What We Test

| Layer | Coverage Target | Current | Status |
|-------|-----------------|---------|--------|
| Services | 60%+ | 48-75% | On Track |
| Stores | 80%+ | 89% | Excellent |
| Utils | 30%+ | 3% | Needs Work |

### Running Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific file
npx jest src/__tests__/services/supabase-auth.test.ts
```

### Test Files

```
src/__tests__/
├── services/
│   ├── supabase-auth.test.ts   # 42 tests - Auth flows
│   ├── location.test.ts        # 21 tests - Location services
│   ├── contribution.test.ts    # 36 tests - Contribution logic
│   └── setup.test.ts           # 3 tests - Basic setup
└── stores/
    └── toilets.test.ts         # 22 tests - Zustand store
```

### Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 30,
    functions: 30,
    lines: 35,
    statements: 35,
  },
}
```

---

## E2E Tests (Maestro)

### What We Test

| Flow | Tests | Priority |
|------|-------|----------|
| App Launch | Startup, initialization | Critical |
| Authentication | Login, session handling | Critical |
| Map Discovery | View map, find toilets | Critical |
| Toilet Details | View info, reviews | High |
| Contribution | Add new toilet | High |
| User Profile | View/edit profile | Medium |

### Running E2E Tests

```bash
# Install Maestro (one-time)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Start the app
npx expo start
npx expo run:ios  # or run:android

# Run all E2E tests
maestro test .maestro/

# Run specific flow
maestro test .maestro/flows/02-auth-login.yaml

# Interactive mode
maestro studio
```

### Test Files

```
.maestro/
├── config.yaml                   # Configuration
├── README.md                     # Documentation
└── flows/
    ├── 01-app-launch.yaml        # App startup
    ├── 02-auth-login.yaml        # Login flow
    ├── 03-map-discovery.yaml     # Map interaction
    ├── 04-toilet-details.yaml    # Viewing details
    ├── 05-contribute-toilet.yaml # Adding toilets
    └── 06-user-profile.yaml      # Profile navigation
```

---

## When to Use Each

### Use Unit Tests (Jest) For:

- Service layer functions
- State management logic
- Utility functions
- Data transformations
- API response handling
- Error scenarios
- Business rule validation

### Use E2E Tests (Maestro) For:

- User journeys
- Navigation flows
- Form submissions
- Authentication flows
- Visual verification
- Integration between screens
- Real device behavior

---

## Adding testID for E2E

Add `testID` props to components for reliable E2E testing:

```tsx
// Component
<TextInput
  testID="email-input"
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
/>

<TouchableOpacity testID="login-button" onPress={handleLogin}>
  <Text>Login</Text>
</TouchableOpacity>
```

```yaml
# Maestro flow
- tapOn:
    id: "email-input"
- inputText: "user@example.com"
- tapOn:
    id: "login-button"
```

---

## CI/CD Integration

### GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci --legacy-peer-deps
      - run: npm test -- --coverage

  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mobile-dev-inc/action-maestro-cloud@v1
        with:
          api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
          app-file: app.tar.gz
```

---

## Pre-commit Hook

The pre-commit hook runs unit tests before each commit:

```bash
# .husky/pre-commit
npm test
```

E2E tests run in CI only (too slow for pre-commit).

---

## Best Practices

### Unit Tests

1. **Mock external dependencies** - Supabase, location services
2. **Test edge cases** - Errors, timeouts, empty data
3. **Keep tests fast** - Avoid real network calls
4. **One assertion per test** - Clear failure messages
5. **Use descriptive names** - `should_return_error_when_session_expired`

### E2E Tests

1. **Use testID props** - Reliable element selection
2. **Avoid sleeps** - Use `assertVisible` with timeouts
3. **Keep flows independent** - Each can run standalone
4. **Screenshot key states** - Debug failing tests
5. **Use environment variables** - Secure credentials

---

## Metrics & Goals

### Current Status (2025-12-07)

| Metric | Current | Goal | Status |
|--------|---------|------|--------|
| Unit Test Count | 123 | 150+ | On Track |
| Service Coverage | ~50% | 60% | On Track |
| Store Coverage | 89% | 80% | Excellent |
| E2E Flows | 6 | 10+ | In Progress |
| CI Integration | No | Yes | Planned |

### Roadmap

1. **Phase 1 (Current):** Core service tests, basic E2E flows
2. **Phase 2:** Increase coverage, add testIDs to components
3. **Phase 3:** CI/CD integration, automated E2E in cloud
4. **Phase 4:** Performance testing, visual regression

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- [React Native Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)

---

**Document Owner:** Development Team
**Next Review:** After Phase 2 completion
