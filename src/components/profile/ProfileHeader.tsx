/**
 * @file Profile Header Component
 *
 * Header component for profile pages showing user avatar, name, stats
 */

import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { Avatar } from "react-native-paper";
import { UserProfile } from "../../types/user";
import { colors } from "../../foundations/colors";

interface ProfileHeaderProps {
  profile: UserProfile;
  isCurrentUser?: boolean;
  onEditPress?: () => void;
  onSettingsPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isCurrentUser = false,
  onEditPress,
  onSettingsPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Profile info section (avatar, name, etc) */}
      <View style={styles.infoSection}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ?
            <Avatar.Image
              size={80}
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          : <Avatar.Text
              size={80}
              label={getInitials(
                profile.display_name || profile.username || ""
              )}
              style={styles.avatar}
            />
          }
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.displayName}>
            {profile.display_name || profile.username || "User"}
          </Text>
          {profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Action buttons (edit profile, settings) */}
        {isCurrentUser && (
          <View style={styles.actionsContainer}>
            {onEditPress && (
              <IconButton
                icon="account-edit-outline"
                size={24}
                onPress={onEditPress}
                style={styles.actionButton}
              />
            )}
            {onSettingsPress && (
              <IconButton
                icon="cog-outline"
                size={24}
                onPress={onSettingsPress}
                style={styles.actionButton}
              />
            )}
          </View>
        )}
      </View>

      {/* Stats section */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.reviews_count || 0}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {profile.contributions_count || 0}
          </Text>
          <Text style={styles.statLabel}>Contributions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.favorites_count || 0}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
      </View>
    </View>
  );
};

// Helper to get initials from a name
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

const styles = StyleSheet.create({
  actionButton: {
    margin: 0,
  },
  actionsContainer: {
    flexDirection: "row",
    marginLeft: "auto",
  },
  avatar: {
    backgroundColor: colors.brand.primary,
  },
  avatarContainer: {
    marginRight: 16,
  },
  bio: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  container: {
    padding: 16,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  infoSection: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statsSection: {
    borderColor: colors.ui.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
    paddingVertical: 12,
  },
  username: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});

export default ProfileHeader;
