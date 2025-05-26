/**
 * @file Profile Layout
 *
 * Layout component for all profile-related screens
 * Provides consistent styling, navigation headers and common elements
 */

import React from "react";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../foundations";
import { AppHeader } from "../../components/shared/AppHeader";

/**
 * Profile layout component
 *
 * Applied to all screens in the profile route group.
 * Handles:
 * - Navigation header configuration with user-friendly titles
 * - SafeArea behavior
 * - Common styling elements
 */
export default function ProfileLayout() {
  // Get the current pathname to determine which screen we're on
  const pathname = usePathname();

  // Determine the appropriate header title based on the route
  const getHeaderTitle = () => {
    if (pathname.includes("/profile/edit")) {
      return "Edit Profile";
    } else if (pathname.includes("/profile/settings")) {
      return "Account Settings";
    } else {
      return "My Profile"; // More user-friendly than generic "Profile"
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader
        title={getHeaderTitle()}
        showBackButton={!pathname.endsWith("/profile")}
      />
      <View style={styles.innerContainer}>
        <Stack
          screenOptions={{
            headerShown: false, // We're using our custom AppHeader instead
            contentStyle: {
              backgroundColor: colors.background.primary,
            },
            animation: "slide_from_right",
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
