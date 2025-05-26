/**
 * @file Account Settings Screen
 *
 * Screen for managing account settings including password change,
 * email preferences, and account deletion
 */

import React, { useCallback, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Appbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../providers/AuthProvider";
import { LoadingState } from "../../components/shared/LoadingState";
import { ErrorState } from "../../components/shared/ErrorState";
import AccountSettings, {
  EmailPreferences,
} from "../../components/profile/AccountSettings";
import { colors, palette } from "../../foundations/colors";

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, updatePassword, signOut } =
    useAuth();
  const [error, setError] = useState<string | null>(null);

  // Handle password change
  const handleChangePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      try {
        setError(null);
        // Note: In a real implementation, we would verify the old password first
        const { error } = await updatePassword(newPassword);

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("Failed to change password:", error);
        setError(
          "Failed to change password. Please check your input and try again."
        );
        throw error;
      }
    },
    [updatePassword]
  );

  // Handle account deletion
  const handleDeleteAccount = useCallback(async () => {
    try {
      setError(null);
      // In a real implementation, we would have a deleteAccount method
      // For now, just sign out and redirect
      await signOut();

      // Redirect to login page
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setError("Failed to delete account. Please try again later.");
      throw error;
    }
  }, [signOut, router]);

  // Handle email preferences update
  const handleUpdateEmailPreferences = useCallback(
    (_preferences: EmailPreferences) => {
      // In a real implementation, this would be async and update user preferences
      // in the database. For now, it's just a placeholder.
      setError(null);
      return Promise.resolve();
    },
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingState type="spinner" />
      </View>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState
          error="Authentication Required"
          message="Please sign in to access account settings"
          onRetry={() => router.push("/(auth)/login")}
          fullScreen
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Account Settings" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <AccountSettings
          onChangePassword={handleChangePassword}
          onDeleteAccount={handleDeleteAccount}
          onUpdateEmailPreferences={handleUpdateEmailPreferences}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  errorText: {
    backgroundColor: palette.red[100],
    borderRadius: 4,
    color: palette.red[700],
    margin: 16,
    padding: 8,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  stateContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
