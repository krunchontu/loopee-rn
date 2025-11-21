import React, { memo, useCallback } from "react";
import type {
  ViewStyle,
  TextStyle} from "react-native";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions
} from "react-native";

import {
  colors,
  spacing,
  borderRadius,
  fontWeights,
  fontSizes,
} from "../../foundations";
import { createShadow } from "../../foundations/layout";
import { createTextStyle } from "../../foundations/react-native-helpers";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../../foundations/responsive";
import type { Toilet } from "../../types/toilet";
import { Rating } from "../shared/Rating";

export interface ToiletCardProps {
  toilet: Toilet;
  onPress: () => void;
  compact?: boolean;
}

/**
 * A minimalist card displaying essential toilet information: name, distance, and rating.
 * Designed to be simple, beautiful, and consistent across all device sizes.
 */
export const ToiletCard = memo(function ToiletCard({
  toilet,
  onPress,
  compact = false,
}: ToiletCardProps) {
  // Format distance helper
  const formatDistance = useCallback((meters: number) => {
    if (!meters) return "—";
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
      accessibilityLabel={`${toilet.name} toilet, ${formatDistance(toilet.distance || 0)} away, rating ${toilet.rating} out of 5`}
    >
      <View style={styles.content}>
        {/* Left: Toilet Name */}
        <Text style={styles.name} numberOfLines={1}>
          {toilet.name}
        </Text>

        {/* Right: Distance and Rating */}
        <View style={styles.metaInfo}>
          <Text style={styles.distance}>
            {formatDistance(toilet.distance || 0)}
          </Text>
          <Rating value={toilet.rating} size="small" />
        </View>
      </View>
    </Pressable>
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type StyleProps = {
  compactContainer: ViewStyle;
  container: ViewStyle;
  content: ViewStyle;
  distance: TextStyle;
  metaInfo: ViewStyle;
  name: TextStyle;
  pressed: ViewStyle;
};

const styles = StyleSheet.create<StyleProps>({
  compactContainer: {
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
    marginHorizontal: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.card,
    marginBottom: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    marginHorizontal: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
    ...createShadow("sm"),
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  },
  distance: createTextStyle("bodySmall", {
    color: colors.text.secondary,
    fontWeight: fontWeights.medium,
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  }),
  metaInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  name: createTextStyle("h5", {
    color: colors.text.primary,
    fontWeight: fontWeights.semibold,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
    flex: 1,
    marginRight: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  }),
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
