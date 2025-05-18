import React, { memo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useResponsiveLayout } from "../../foundations/responsive";
import { Toilet } from "../../types/toilet";
import {
  colors,
  spacing,
  borderRadius,
  fontWeights,
  fontSizes,
} from "../../foundations";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../../foundations/responsive";
import {
  createComponentStyle,
  createTextStyle,
} from "../../foundations/react-native-helpers";
import { Rating } from "../shared/Rating";
import { createShadow as createFoundationShadow } from "../../foundations/layout";

export interface ToiletCardProps {
  toilet: Toilet;
  onPress: () => void;
  compact?: boolean;
}

export const ToiletCard = memo(function ToiletCard({
  toilet,
  onPress,
  compact = false,
}: ToiletCardProps) {
  const { isSmallPhone, isMediumPhone } = useResponsiveLayout();

  const shouldShowAmenities = !isSmallPhone;
  const shouldShowReviewCount = !isSmallPhone;
  const shouldShowFullAddress = !isSmallPhone && !isMediumPhone;
  const formatDistance = useCallback((meters: number) => {
    if (!meters) return "";
    return meters < 1000 ?
        `${Math.round(meters)}m`
      : `${(meters / 1000).toFixed(1)}km`;
  }, []);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        compact && styles.compactContainer,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${toilet.name} toilet, ${formatDistance(toilet.distance || 0)} away, ${
        toilet.isAccessible ? "wheelchair accessible" : ""
      }${toilet.amenities.hasBabyChanging ? ", baby changing available" : ""}${
        toilet.amenities.hasShower ? ", shower available" : ""
      }`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View
        style={[
          styles.content,
          compact && {
            padding: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
          },
        ]}
      >
        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {toilet.name}
            </Text>
            {toilet.isAccessible && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>♿</Text>
              </View>
            )}
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.emojiIcon}>📍</Text>
            <Text style={styles.location} numberOfLines={1}>
              {shouldShowFullAddress ?
                toilet.address
              : toilet.buildingName || toilet.floorName ?
                [toilet.buildingName, toilet.floorName]
                  .filter(Boolean)
                  .join(" • ")
              : toilet.address.split(",")[0]}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.metaInfo,
            compact && { minWidth: getResponsiveSpacing(50, SCREEN_WIDTH) },
          ]}
        >
          {toilet.distance && (
            // Consider adding a distance icon here using styles.metaIcon
            <View style={styles.distanceRow}>
              {/* <Text style={styles.metaIcon}>...</Text> */}
              <Text style={styles.distance}>
                {formatDistance(toilet.distance)}
              </Text>
            </View>
          )}
          {shouldShowAmenities && (
            <View style={styles.amenities}>
              {toilet.amenities.hasBabyChanging && (
                <Text style={styles.emojiIcon}>👶</Text>
              )}
              {toilet.amenities.hasShower && (
                <Text style={styles.emojiIcon}>🚿</Text>
              )}
              {toilet.amenities.hasWaterSpray && (
                <Text style={styles.emojiIcon}>💦</Text>
              )}
            </View>
          )}
          <View style={styles.ratingContainer}>
            <Rating value={toilet.rating} size="small" />
            {shouldShowReviewCount && toilet.reviewCount > 0 && (
              <Text style={styles.reviewCount}>({toilet.reviewCount})</Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type StyleProps = {
  amenities: ViewStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
  compactContainer: ViewStyle;
  container: ViewStyle;
  content: ViewStyle;
  distance: TextStyle;
  distanceRow: ViewStyle;
  emojiIcon: TextStyle;
  location: TextStyle;
  locationRow: ViewStyle;
  mainInfo: ViewStyle;
  metaIcon: TextStyle;
  metaInfo: ViewStyle;
  name: TextStyle;
  nameRow: ViewStyle;
  pressed: ViewStyle;
  ratingContainer: ViewStyle;
  reviewCount: TextStyle;
};

const styles = StyleSheet.create<StyleProps>({
  amenities: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: getResponsiveSpacing(spacing.xxs, SCREEN_WIDTH),
    justifyContent: "flex-end" as const,
    marginTop: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  badge: createComponentStyle({
    alignItems: "center" as const,
    backgroundColor: colors.interactive.secondary.default,
    borderRadius: borderRadius.pill,
    height: getResponsiveSpacing(28, SCREEN_WIDTH),
    justifyContent: "center" as const,
    marginLeft: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    width: getResponsiveSpacing(28, SCREEN_WIDTH),
  }),
  badgeText: createTextStyle("bodySmall", {
    color: colors.text.inverse,
    fontSize: getResponsiveFontSize(fontSizes.sm, SCREEN_WIDTH),
    fontWeight: fontWeights.bold,
  }),
  compactContainer: {
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
    marginHorizontal: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
    minHeight: getResponsiveSpacing(60, SCREEN_HEIGHT),
    paddingVertical: getResponsiveSpacing(spacing.xs, SCREEN_HEIGHT),
  },
  container: createComponentStyle({
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.card,
    marginBottom: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
    marginHorizontal: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
    ...createFoundationShadow("sm"),
  }),
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
  },
  distance: createTextStyle("bodySmall", {
    color: colors.text.secondary,
    fontWeight: fontWeights.medium,
    textAlign: "right",
  }),
  distanceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: getResponsiveSpacing(spacing.xxs, SCREEN_WIDTH),
  },
  emojiIcon: {
    fontSize: fontSizes.md,
    marginRight: spacing.xs,
  },
  location: createTextStyle("bodySmall", {
    color: colors.text.secondary,
    flexShrink: 1,
    marginLeft: spacing.xs,
  }),
  locationRow: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    marginTop: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  mainInfo: {
    flex: 1,
    gap: getResponsiveSpacing(spacing.xxs, SCREEN_WIDTH),
    marginRight: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
  },
  metaIcon: {
    color: colors.text.secondary,
    fontSize: fontSizes.sm,
    marginRight: spacing.xxs,
  },
  metaInfo: {
    alignItems: "flex-end" as const,
    justifyContent: "flex-start" as const,
    minWidth: getResponsiveSpacing(70, SCREEN_WIDTH),
  },
  name: createTextStyle("h5", {
    color: colors.text.primary,
    fontWeight: fontWeights.semibold,
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
    fontSize: getResponsiveFontSize(fontSizes.lg, SCREEN_WIDTH),
  }),
  nameRow: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  ratingContainer: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: getResponsiveSpacing(spacing.xxs, SCREEN_WIDTH),
    justifyContent: "flex-end" as const,
    marginTop: "auto",
    paddingTop: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  reviewCount: createTextStyle("caption", {
    color: colors.text.tertiary,
    marginLeft: spacing.xxs,
  }),
});
