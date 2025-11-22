/**
 * @file Auth Layout
 *
 * Layout component for all authentication screens
 * Provides consistent styling, navigation headers and common elements
 */

import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../../components/shared/AppHeader";
import { colors } from "../../foundations";

/**
 * Auth layout component
 *
 * Applied to all screens in the (auth) route group.
 * Handles:
 * - Navigation header configuration with user-friendly titles
 * - SafeArea behavior
 * - Common styling elements
 */
export default function AuthLayout() {
  // Get the current pathname to determine which screen we're on
  const pathname = usePathname();

  // Determine the appropriate header title based on the route
  const getHeaderTitle = () => {
    if (pathname.includes("login")) {
      return "Sign In";
    } else if (pathname.includes("register")) {
      return "Create Account";
    } else if (pathname.includes("reset-password")) {
      return "Reset Password";
    }
    return "Account";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader
        title={getHeaderTitle()}
        showBackButton={pathname !== "/login"}
      />
      <View style={styles.innerContainer}>
        <Stack
          // The root layout already sets headerShown: false globally
          screenOptions={{
            contentStyle: {
              backgroundColor: colors.background.primary,
            },
            animation: "slide_from_right",
            // Hide route names that appear in the UI
            title: "", // This prevents the route name from showing
            // Ensure no default navigation elements appear
            headerBackVisible: false, // Explicitly hide the back button
            headerLeft: () => null, // Remove any header left items
            navigationBarHidden: true, // Hide the navigation bar completely
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
});
