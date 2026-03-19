/**
 * @file Profile Screen
 *
 * Main profile screen for displaying user information,
 * stats, and their content/activity.
 */

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { Divider, Text, Card, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import ContentList from "../../components/profile/content/ContentList";
import ProfileHeader from "../../components/profile/ProfileHeader";
import { ErrorState } from "../../components/shared/ErrorState";
import { LoadingState } from "../../components/shared/LoadingState";
import { colors } from "../../foundations/colors";
import { useAuth } from "../../providers/AuthProvider";
import { contributionService } from "../../services/contributionService";
import { supabaseService } from "../../services/supabase";
import type { SubmissionPreview } from "../../types/contribution";
import type { UserReview, UserFavorite } from "../../types/profile-content";
import { debug } from "../../utils/debug";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, isLoading, isAuthenticated, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Tab data state
  const [reviews, setReviews] = useState<UserReview[] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [contributions, setContributions] = useState<
    SubmissionPreview[] | null
  >(null);
  const [contributionsLoading, setContributionsLoading] = useState(false);

  // Fetch data when tab changes
  useEffect(() => {
    if (!user) return;

    if (activeTab === 0 && reviews === null && !reviewsLoading) {
      setReviewsLoading(true);
      supabaseService.reviews
        .getByUserId(user.id)
        .then((data) => setReviews(data as UserReview[]))
        .catch((err) => {
          debug.error("Profile", "Failed to fetch reviews", err);
          setReviews([]);
        })
        .finally(() => setReviewsLoading(false));
    }

    if (activeTab === 1 && contributions === null && !contributionsLoading) {
      setContributionsLoading(true);
      contributionService
        .getMySubmissions()
        .then((data) => setContributions(data))
        .catch((err) => {
          debug.error("Profile", "Failed to fetch contributions", err);
          setContributions([]);
        })
        .finally(() => setContributionsLoading(false));
    }
  }, [
    activeTab,
    user,
    reviews,
    reviewsLoading,
    contributions,
    contributionsLoading,
  ]);

  // Pull-to-refresh handlers
  const refreshReviews = useCallback(() => {
    if (!user) return;
    setReviewsLoading(true);
    supabaseService.reviews
      .getByUserId(user.id)
      .then((data) => setReviews(data as UserReview[]))
      .catch((err) => {
        debug.error("Profile", "Failed to refresh reviews", err);
      })
      .finally(() => setReviewsLoading(false));
  }, [user]);

  const refreshContributions = useCallback(() => {
    setContributionsLoading(true);
    contributionService
      .getMySubmissions()
      .then((data) => setContributions(data))
      .catch((err) => {
        debug.error("Profile", "Failed to refresh contributions", err);
      })
      .finally(() => setContributionsLoading(false));
  }, []);

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
              debug.error("Profile", "Logout failed", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
              return;
            }

            // Only navigate if logout was successful
            router.replace("/(auth)/login");
          } catch (error) {
            debug.error("Profile", "Logout failed with exception", error);
            Alert.alert(
              "Error",
              "An unexpected error occurred. Please try again.",
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
              <ContentList<UserReview>
                data={reviews}
                isLoading={reviewsLoading}
                emptyStateIcon="note-text-outline"
                emptyStateTitle="No Reviews Yet"
                emptyStateMessage="Your reviews will appear here"
                keyExtractor={(item) => item.id}
                onRefresh={refreshReviews}
                isRefreshing={reviewsLoading}
                renderItem={({ item }) => (
                  <Card style={styles.itemCard}>
                    <Card.Content>
                      <Text style={styles.itemTitle}>
                        {item.toilet?.name || "Unknown Toilet"}
                      </Text>
                      <Text style={styles.itemSubtitle}>
                        {"★".repeat(item.rating)}
                        {"☆".repeat(5 - item.rating)}
                      </Text>
                      {item.comment ? (
                        <Text style={styles.itemBody} numberOfLines={2}>
                          {item.comment}
                        </Text>
                      ) : null}
                      <Text style={styles.itemDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </Card.Content>
                  </Card>
                )}
              />
            )}

            {activeTab === 1 && (
              <ContentList<SubmissionPreview>
                data={contributions}
                isLoading={contributionsLoading}
                emptyStateIcon="source-commit"
                emptyStateTitle="No Contributions Yet"
                emptyStateMessage="Your contributions will appear here"
                keyExtractor={(item) => item.id}
                onRefresh={refreshContributions}
                isRefreshing={contributionsLoading}
                renderItem={({ item }) => (
                  <Card style={styles.itemCard}>
                    <Card.Content>
                      <Text style={styles.itemTitle}>{item.toilet_name}</Text>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemBadge}>
                          {item.submission_type}
                        </Text>
                        <Text
                          style={[
                            styles.itemBadge,
                            item.status === "approved"
                              ? styles.badgeApproved
                              : item.status === "rejected"
                                ? styles.badgeRejected
                                : styles.badgePending,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                      <Text style={styles.itemDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </Card.Content>
                  </Card>
                )}
              />
            )}

            {activeTab === 2 && (
              <ContentList<UserFavorite>
                data={null}
                isLoading={false}
                emptyStateIcon="heart-outline"
                emptyStateTitle="No Favorites Yet"
                emptyStateMessage="Your favorite toilets will appear here"
                keyExtractor={(item) => item.id}
                renderItem={({ item: _ }) => <View />}
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
  badgeApproved: {
    backgroundColor: colors.status.success.background,
    color: colors.status.success.foreground,
  },
  badgePending: {
    backgroundColor: colors.status.warning.background,
    color: colors.status.warning.foreground,
  },
  badgeRejected: {
    backgroundColor: colors.status.error.background,
    color: colors.status.error.foreground,
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
  itemBadge: {
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
    textTransform: "capitalize",
  },
  itemBody: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  itemCard: {
    marginBottom: 8,
  },
  itemDate: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  itemSubtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  itemTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
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
