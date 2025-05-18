import React, { memo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Card, Text, Title, Caption } from "react-native-paper";
import { spacing, colors, borderRadius } from "../../foundations";
import { getResponsiveFontSize } from "../../foundations/responsive";
import { Dimensions } from "react-native";
import { Toilet } from "../../types/toilet";
import { Rating } from "../shared/Rating";

export interface PaperToiletCardProps {
  toilet: Toilet;
  onPress: () => void;
  compact?: boolean;
}

/**
 * PaperToiletCard displays essential toilet information
 * in a clean, accessible card format using React Native Paper
 *
 * Features:
 * - Responsive design that adapts to different device sizes
 * - Built-in compact mode for small screens
 * - Automatically scales text based on system font settings
 * - Responsive icon sizing for better readability
 * - Consistent appearance across device types
 *
 * The component solves text scaling issues and improves
 * accessibility by utilizing Paper's typography components
 * that respect system font size settings.
 *
 * @param toilet - The toilet object containing details to display
 * @param onPress - Function called when the card is pressed
 * @param compact - When true, displays a condensed version with fewer details,
 *                  ideal for small screens or space-constrained layouts
 */
export const PaperToiletCard = memo(
  ({ toilet, onPress, compact = false }: PaperToiletCardProps) => {
    // Format distance for display
    const formattedDistance = formatDistance(toilet.distance);

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            <View style={styles.mainInfo}>
              <View style={styles.nameRow}>
                <Title style={styles.name} numberOfLines={1}>
                  {toilet.name}
                </Title>
                <View style={styles.distanceRow}>
                  <Text style={styles.distanceIcon}>📍</Text>
                  <Text style={styles.distance}>{formattedDistance}</Text>
                </View>
              </View>

              {!compact && (
                <View style={styles.metaInfo}>
                  {/* Location info */}
                  <View style={styles.location}>
                    <Text style={styles.metaIcon}>🏢</Text>
                    <Caption style={styles.locationText} numberOfLines={1}>
                      {toilet.buildingName || "Public Facility"}
                      {toilet.floorLevel && `, Level ${toilet.floorLevel}`}
                    </Caption>
                  </View>

                  {/* Rating info */}
                  <View style={styles.ratingContainer}>
                    <Rating value={toilet.rating || 0} size="small" />
                    {toilet.reviewCount > 0 && (
                      <Caption style={styles.reviewCount}>
                        ({toilet.reviewCount})
                      </Caption>
                    )}
                  </View>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  }
);

// Format distance for display (e.g., "50m", "1.2km")
function formatDistance(distanceInMeters?: number): string {
  if (distanceInMeters === undefined) return "—";

  // If less than 1km, show in meters
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  }

  // Otherwise show in kilometers with 1 decimal place
  const km = distanceInMeters / 1000;
  return `${km.toFixed(1)}km`;
}

// Style definitions
type StylesType = {
  card: ViewStyle;
  content: ViewStyle;
  distance: TextStyle;
  distanceIcon: TextStyle;
  distanceRow: ViewStyle;
  location: ViewStyle;
  locationText: TextStyle;
  mainInfo: ViewStyle;
  metaIcon: TextStyle;
  metaInfo: ViewStyle;
  name: TextStyle;
  nameRow: ViewStyle;
  ratingContainer: ViewStyle;
  reviewCount: TextStyle;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create<StylesType>({
  card: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  content: {
    paddingVertical: spacing.sm,
  },
  distance: {
    color: colors.text.secondary,
    marginLeft: spacing.xs / 2,
  },
  distanceIcon: {
    fontSize: getResponsiveFontSize(12, SCREEN_WIDTH),
  },
  distanceRow: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: spacing.sm,
  },
  location: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xs / 2,
  },
  locationText: {
    color: colors.text.secondary,
    flexShrink: 1,
    marginLeft: spacing.xs / 2,
  },
  mainInfo: {
    flex: 1,
  },
  metaIcon: {
    fontSize: getResponsiveFontSize(12, SCREEN_WIDTH),
  },
  metaInfo: {
    marginTop: spacing.xs,
  },
  name: {
    color: colors.text.primary,
    flex: 1,
    fontWeight: "700",
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingContainer: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  reviewCount: {
    color: colors.text.tertiary,
    marginLeft: spacing.xs / 2,
  },
});
