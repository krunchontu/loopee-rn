import { Stack, SplashScreen, useSegments, useRouter } from "expo-router";
import {
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { ErrorBoundaryProvider } from "../components/ErrorBoundaryProvider";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { colors } from "../foundations/colors";
import { debug } from "../utils/debug";
import { getPaperTheme } from "../foundations/paper-theme";

// Keep the splash screen visible while we initialize resources
SplashScreen.preventAutoHideAsync();

// Protected route guard component
function ProtectedRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent handling redirects when already in progress or still loading
    if (isLoading || isRedirecting) return;

    const inAuthGroup = segments[0] === "(auth)";
    const _inGuestGroup = segments[0] === "(guest)"; // Keeping for future guest route logic

    // Handle navigation in the next tick to avoid React update conflicts
    const handleNavigation = () => {
      if (!user && !inAuthGroup) {
        // Redirect to login if not authenticated and not in auth group
        debug.log("Auth", "Not authenticated, redirecting to login");
        setIsRedirecting(true);

        // Use setTimeout to defer the navigation after the current render cycle
        setTimeout(() => {
          router.replace("/login");
          // Reset the redirecting flag after a short delay
          setTimeout(() => setIsRedirecting(false), 100);
        }, 0);
      } else if (user && inAuthGroup) {
        // Redirect to home if authenticated and in auth group
        debug.log("Auth", "Already authenticated, redirecting to home");
        setIsRedirecting(true);

        // Use setTimeout to defer the navigation after the current render cycle
        setTimeout(() => {
          router.replace("/");
          // Reset the redirecting flag after a short delay
          setTimeout(() => setIsRedirecting(false), 100);
        }, 0);
      }
    };

    // Process navigation after rendering is complete
    handleNavigation();
  }, [user, segments, isLoading, router, isRedirecting]);

  // Show a loading indicator when redirecting or determining auth state
  if (isRedirecting || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    flex: 1,
    justifyContent: "center",
  },
});

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
      <PaperProvider theme={getPaperTheme(isDark)}>
        <AuthProvider>
          <ErrorBoundaryProvider>
            <ProtectedRouteGuard>
              <Stack
                screenOptions={{
                  // Hide all headers by default - we'll use custom headers in layout files
                  headerShown: false,
                  // Improved animation and gesture handling
                  animation: "slide_from_right",
                  gestureEnabled: true,
                  // Keep these styles for screens that do show headers
                  headerStyle: {
                    backgroundColor:
                      isDark ? colors.text.primary : colors.background.primary,
                  },
                  headerTintColor:
                    isDark ? colors.background.primary : colors.text.primary,
                  headerTitleStyle: {
                    fontWeight: "bold",
                  },
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
            </ProtectedRouteGuard>
          </ErrorBoundaryProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
