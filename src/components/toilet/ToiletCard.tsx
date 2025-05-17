import React, { memo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Toilet } from "../../types/toilet";
import {
  colors,
  spacing,
  createAnimatedValue,
  duration,
  easing,
} from "../../foundations";
import {
  createComponentStyle,
  createTextStyle,
} from "../../foundations/react-native-helpers";
import { Rating } from "../shared/Rating";

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
  // Create animated scale value for touch feedback
  const scaleValue = useRef(createAnimatedValue(1)).current;

  // Enhanced animation for hover effect
  const animateCard = (toValue: number) => {
    Animated.timing(scaleValue, {
      toValue,
      duration: duration.fast,
      useNativeDriver: true,
      easing: easing.easeOut,
    }).start();
  };

  // Format distance for better readability
  const formatDistance = (meters: number) => {
    return meters < 1000 ?
        `${meters.toFixed(0)}m away`
      : `${(meters / 1000).toFixed(1)}km away`;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => animateCard(0.97)}
        onPressOut={() => animateCard(1)}
        style={[styles.container, compact && styles.containerCompact]}
        activeOpacity={0.7}
      >
        <View style={[styles.content, compact && styles.contentCompact]}>
          {/* Card Header */}
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {toilet.name}
            </Text>
            {toilet.isAccessible && (
              <View style={styles.accessibleBadge}>
                <Text style={styles.accessibleText}>♿ Accessible</Text>
              </View>
            )}
          </View>

          {/* Rating Section */}
          <View style={styles.details}>
            <Rating value={toilet.rating} size="small" />
            <Text style={styles.reviewCount}>
              ({toilet.reviewCount}{" "}
              {toilet.reviewCount === 1 ? "review" : "reviews"})
            </Text>
          </View>

          {/* Building and floor information */}
          {(toilet.buildingName || toilet.floorName) && (
            <View style={styles.locationContainer}>
              <Text style={styles.buildingInfo} numberOfLines={1}>
                📍{" "}
                {toilet.buildingName && toilet.floorName ?
                  `${toilet.buildingName} • ${toilet.floorName}`
                : toilet.buildingName || toilet.floorName}
              </Text>
            </View>
          )}

          {/* Address */}
          <Text style={styles.address} numberOfLines={compact ? 1 : 2}>
            {toilet.address}
          </Text>

          {/* Distance */}
          {toilet.distance && (
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceIcon}>🚶</Text>
              <Text style={styles.distance}>
                {formatDistance(toilet.distance)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  accessibleBadge: createComponentStyle({
    backgroundColor: colors.interactive.secondary.default,
    radius: "pill",
    padding: {
      horizontal: spacing.sm,
      vertical: spacing.xs,
    },
  }),
  accessibleText: createTextStyle("caption", {
    color: colors.text.inverse,
    fontWeight: "600",
  }),
  address: createTextStyle("bodySmall", {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  }),
  buildingInfo: createTextStyle("bodySmall", {
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  }),
  container: createComponentStyle({
    backgroundColor: colors.background.primary,
    radius: "card",
    shadow: "md",
    marginBottom: spacing.md,
  }),
  containerCompact: {
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.md,
  },
  contentCompact: {
    padding: spacing.sm,
  },
  details: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  distance: createTextStyle("caption", {
    color: colors.text.tertiary,
    marginLeft: spacing.xs / 2,
  }),
  distanceContainer: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xs / 2,
  },
  distanceIcon: {
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  locationContainer: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xs / 2,
  },
  name: createTextStyle("h4", {
    flex: 1,
    marginRight: spacing.sm,
  }),
  reviewCount: createTextStyle("caption", {
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  }),
});
