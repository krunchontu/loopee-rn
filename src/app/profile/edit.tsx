/**
 * @file Profile Edit Screen
 *
 * Screen for editing user profile information
 */

import { useRouter } from "expo-router";
import React, { useState, useCallback } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text, Appbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AvatarUpload from "../../components/profile/AvatarUpload";
import ProfileForm from "../../components/profile/ProfileForm";
import { ErrorState } from "../../components/shared/ErrorState";
import { LoadingState } from "../../components/shared/LoadingState";
import { colors, palette } from "../../foundations/colors";
import { useAuth } from "../../providers/AuthProvider";
import type { UserProfile } from "../../types/user";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, isLoading, isAuthenticated } =
    useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Handle avatar upload
  const handleAvatarSelected = useCallback(
    async (url: string) => {
      if (!profile?.id) return;

      try {
        await updateProfile({
          id: profile.id,
          avatar_url: url,
        });
      } catch (error) {
        console.error("Failed to update avatar:", error);
        setFormError("Failed to update avatar. Please try again.");
      }
    },
    [profile, updateProfile]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!profile?.id) return;

      try {
        setIsSubmitting(true);
        setFormError(null);

        await updateProfile({
          id: profile.id,
          ...data,
        });

        router.back();
      } catch (error) {
        console.error("Failed to update profile:", error);
        setFormError("Failed to update profile. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [profile, updateProfile, router]
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
  if (!isAuthenticated || !user || !profile) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState
          error="Authentication Required"
          message="Please sign in to edit your profile"
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
        <Appbar.Content title="Edit Profile" />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Avatar Upload Section */}
        <AvatarUpload
          userId={user.id}
          currentAvatarUrl={profile.avatar_url}
          onAvatarSelected={handleAvatarSelected}
          style={styles.avatarUpload}
        />

        {/* Form Error Message */}
        {formError && <Text style={styles.errorText}>{formError}</Text>}

        {/* Profile Form */}
        <ProfileForm
          profile={profile}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          style={styles.form}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarUpload: {
    alignItems: "center",
    marginBottom: 16,
  },
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  errorText: {
    color: palette.red[500],
    marginBottom: 16,
    textAlign: "center",
  },
  form: {
    flex: 1,
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
