import { Stack, SplashScreen } from "expo-router";
import { useColorScheme, StatusBar } from "react-native";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundaryProvider } from "../components/ErrorBoundaryProvider";
import { colors } from "../foundations/colors";
import { debug } from "../utils/debug";

// Keep the splash screen visible while we initialize resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Initialize app resources
  useEffect(() => {
    // Log navigation initialization
    debug.log("Navigation", "Initializing root layout");

    // Hide splash screen once layout is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <ErrorBoundaryProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor:
                isDark ? colors.text.primary : colors.background.primary,
            },
            headerTintColor:
              isDark ? colors.background.primary : colors.text.primary,
            headerTitleStyle: {
              fontWeight: "bold",
            },
            // Improved animation and gesture handling
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Loopee",
            }}
          />
          {/* Remove direct references to group directories in Stack.Screen components */}
          {/* Group routing is handled automatically by the file system structure */}
        </Stack>
      </ErrorBoundaryProvider>
    </SafeAreaProvider>
  );
}
