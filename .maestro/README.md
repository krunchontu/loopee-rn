# Maestro E2E Tests

End-to-end testing for Loopee using [Maestro](https://maestro.mobile.dev/).

## Why Maestro?

We chose Maestro over Jest component tests because:

1. **Expo SDK 53 Compatibility** - Jest component tests require React Native bridge mocking that's incompatible with Expo SDK 53
2. **Real Device Testing** - Tests run on actual devices/simulators, not mocked environments
3. **YAML-based** - Easy to write and maintain tests without deep RN knowledge
4. **Visual Verification** - Screenshots captured at each step

## Prerequisites

Install Maestro CLI:

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or with Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

## Running Tests

### Start the app

```bash
# Start Expo development server
npx expo start

# In another terminal, run on simulator/device
npx expo run:ios
# or
npx expo run:android
```

### Run all E2E tests

```bash
# Run all flows
maestro test .maestro/

# Run specific flow
maestro test .maestro/flows/02-auth-login.yaml

# Run with verbose output
maestro test .maestro/ --debug-output
```

### Run in CI

```bash
# Run headless (for CI)
maestro test .maestro/ --format junit --output test-results.xml
```

## Test Flows

| Flow | File | Description |
|------|------|-------------|
| App Launch | `01-app-launch.yaml` | Verifies app starts successfully |
| Login | `02-auth-login.yaml` | Tests user authentication |
| Map Discovery | `03-map-discovery.yaml` | Tests map view and toilet discovery |
| Toilet Details | `04-toilet-details.yaml` | Tests viewing toilet information |
| Contribute | `05-contribute-toilet.yaml` | Tests contribution form |
| Profile | `06-user-profile.yaml` | Tests user profile navigation |

## Configuration

Edit `.maestro/config.yaml` to configure:

- Test user credentials
- App ID
- Execution order
- Environment variables

## Writing New Tests

```yaml
# Example: test-my-feature.yaml
appId: com.loopee.app

---

# Launch the app
- launchApp

# Assert element is visible
- assertVisible:
    text: "My Feature"

# Tap on element
- tapOn:
    id: "my-button"

# Input text
- inputText: "Hello World"

# Take screenshot
- takeScreenshot: my-feature-test
```

## Best Practices

1. **Use test IDs** - Add `testID` props to React Native components
2. **Avoid sleep** - Use `assertVisible` with timeouts instead
3. **Keep flows independent** - Each flow should work standalone
4. **Screenshot key states** - Capture screenshots for debugging
5. **Use environment variables** - Keep credentials out of flow files

## Troubleshooting

### App not launching
- Ensure Expo dev server is running
- Check app is installed on device/simulator

### Element not found
- Use `maestro studio` to interactively find elements
- Check if element has `testID` prop
- Increase timeout values

### Flaky tests
- Add explicit waits with `assertVisible`
- Check for animations completing
- Ensure stable test data

## Screenshots

Test screenshots are saved to `.maestro/screenshots/` after each run.

## CI Integration

See `TESTING_STRATEGY.md` for CI/CD integration details.
