/**
 * @file AppHeader Component
 *
 * A shared header component that includes navigation to the profile screen.
 * Used across both phone and tablet layouts for consistent UI/UX.
 * Features enhanced profile access visibility in mobile view.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { colors } from "../../foundations/colors";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

/**
 * AppHeader component provides consistent navigation header with prominent profile access
 *
 * @param title - Header title text (defaults to "Loopee")
 * @param showBackButton - Whether to show a back button (optional)
 * @param onBackPress - Custom back button handler (optional)
 */
export function AppHeader({
  title = "Loopee",
  showBackButton = false,
  onBackPress,
}: AppHeaderProps) {
  const router = useRouter();

  // Navigate to profile screen
  const handleProfilePress = () => {
    router.push("/profile");
  };

  // Handle back button press
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <Appbar.Header style={styles.header}>
      {showBackButton && <Appbar.BackAction onPress={handleBack} />}

      {/* Left-aligned title */}
      <Appbar.Content
        title={title}
        titleStyle={styles.title}
        style={styles.content}
      />

      {/* Prominent profile button */}
      <Appbar.Action
        icon="account-circle"
        color={colors.primary || colors.text.primary}
        size={32}
        style={styles.profileAction}
        onPress={handleProfilePress}
        accessibilityLabel="Go to profile"
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "flex-start", // Left-align the title
  },
  header: {
    backgroundColor: colors.background.primary,
    elevation: 4,
    paddingRight: 4, // Add some padding to the right side
  },
  profileAction: {
    backgroundColor: colors.background.secondary || "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    marginLeft: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
});
