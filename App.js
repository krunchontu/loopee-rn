import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundaryProvider } from "./src/components/ErrorBoundaryProvider";
import { debug } from "./src/utils/debug";
import { LogBox } from "react-native";
import { ExpoRoot } from "expo-router";

// Ignore specific warnings that are not actionable
LogBox.ignoreLogs([
  // Add any warnings that should be ignored here
  "ViewPropTypes will be removed",
  "ColorPropType will be removed",
  // Adding New Architecture warning as we're keeping the configuration in app.json
  "React Native's New Architecture is always enabled in Expo Go",
]);

/**
 * This component serves as the entry point for the app.
 * It sets up global providers and error boundaries.
 * The actual app content is handled by Expo Router.
 */
export default function App() {
  // Log app initialization with debug utility
  debug.log("App", "Initializing app with Expo Router");

  // Define the root app directory and proper context for Expo Router
  // This helps Expo Router correctly locate and load your routes
  const ctx = require.context("./src/app");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundaryProvider>
        <ExpoRoot context={ctx} />
      </ErrorBoundaryProvider>
    </GestureHandlerRootView>
  );
}
