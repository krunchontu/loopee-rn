/**
 * @file Profile Screen
 *
 * Main profile screen for displaying user information,
 * stats, and their content/activity.
 */

import React, { useCallback, useState } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { Divider, Text, Card, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../providers/AuthProvider";
import { LoadingState } from "../../components/shared/LoadingState";
import { ErrorState } from "../../components/shared/ErrorState";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ContentList from "../../components/profile/content/ContentList";
import {
  UserReview,
  UserContribution,
  UserFavorite,
} from "../../types/profile-content";
import { colors } from "../../foundations/colors";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, isLoading, isAuthenticated, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Navigation callbacks
  const handleEditPress = useCallback(() => {
    router.push("/profile/edit");
  }, [router]);

  const handleSettingsPress = useCallback(() => {
    router.push("/profile/settings");
  }, [router]);

  // Logout handler with confirmation dialog
  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            // Call signOut and properly handle any returned errors
            const { error } = await signOut();

            if (error) {
              console.error("Logout failed:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
              return;
            }

            // Only navigate if logout was successful
            router.replace("/(auth)/login");
          } catch (error) {
            console.error("Logout failed with exception:", error);
            Alert.alert(
              "Error",
              "An unexpected error occurred. Please try again."
            );
          }
        },
      },
    ]);
  }, [signOut, router]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingState type="spinner" height={80} />
      </View>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !user || !profile) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState
          error="Authentication Required"
          message="Please sign in to view your profile"
          onRetry={() => router.push("/(auth)/login")}
          fullScreen
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header with Avatar, Name, Stats, etc. */}
        <ProfileHeader
          profile={profile}
          isCurrentUser={true}
          onEditPress={handleEditPress}
          onSettingsPress={handleSettingsPress}
          style={styles.header}
        />

        <Divider />

        {/* Content Sections */}
        <View style={styles.contentContainer}>
          {/* Navigation buttons */}
          <View style={styles.tabButtons}>
            <Card
              style={[
                styles.tabButton,
                activeTab === 0 ? styles.activeTab : null,
              ]}
              onPress={() => setActiveTab(0)}
            >
              <Card.Content style={styles.tabButtonContent}>
                <Text
                  style={
                    activeTab === 0 ? styles.activeTabText : styles.tabText
                  }
                >
                  Reviews
                </Text>
              </Card.Content>
            </Card>

            <Card
              style={[
                styles.tabButton,
                activeTab === 1 ? styles.activeTab : null,
              ]}
              onPress={() => setActiveTab(1)}
            >
              <Card.Content style={styles.tabButtonContent}>
                <Text
                  style={
                    activeTab === 1 ? styles.activeTabText : styles.tabText
                  }
                >
                  Contributions
                </Text>
              </Card.Content>
            </Card>

            <Card
              style={[
                styles.tabButton,
                activeTab === 2 ? styles.activeTab : null,
              ]}
              onPress={() => setActiveTab(2)}
            >
              <Card.Content style={styles.tabButtonContent}>
                <Text
                  style={
                    activeTab === 2 ? styles.activeTabText : styles.tabText
                  }
                >
                  Favorites
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 0 && (
              <ContentList
                data={null}
                isLoading={false}
                emptyStateIcon="note-text-outline"
                emptyStateTitle="No Reviews Yet"
                emptyStateMessage="Your reviews will appear here"
                keyExtractor={(item: UserReview) => item.id}
                renderItem={({ item: _ }) => <View />} // Placeholder for future implementation
              />
            )}

            {activeTab === 1 && (
              <ContentList
                data={null}
                isLoading={false}
                emptyStateIcon="source-commit"
                emptyStateTitle="No Contributions Yet"
                emptyStateMessage="Your contributions will appear here"
                keyExtractor={(item: UserContribution) => item.id}
                renderItem={({ item: _ }) => <View />} // Placeholder for future implementation
              />
            )}

            {activeTab === 2 && (
              <ContentList
                data={null}
                isLoading={false}
                emptyStateIcon="heart-outline"
                emptyStateTitle="No Favorites Yet"
                emptyStateMessage="Your favorite toilets will appear here"
                keyExtractor={(item: UserFavorite) => item.id}
                renderItem={({ item: _ }) => <View />} // Placeholder for future implementation
              />
            )}
          </View>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <Button
              mode="outlined"
              onPress={handleLogout}
              icon="logout"
              textColor={colors.status.error.foreground}
              style={styles.logoutButton}
            >
              Logout
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: colors.interactive.primary.default,
    borderColor: colors.interactive.primary.default,
  },
  activeTabText: {
    color: colors.text.inverse,
    fontWeight: "bold",
  },
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginTop: 8,
  },
  logoutButton: {
    borderColor: colors.status.error.foreground,
    width: "80%",
  },
  logoutContainer: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 40,
  },
  scrollView: {
    flex: 1,
  },
  stateContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  tabButton: {
    borderColor: colors.ui.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    overflow: "hidden",
  },
  tabButtonContent: {
    alignItems: "center",
    paddingVertical: 8,
  },
  tabButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 8,
  },
  tabContent: {
    flex: 1,
    minHeight: 300,
  },
  tabText: {
    color: colors.text.primary,
  },
});
