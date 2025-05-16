import React, { memo } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Toilet } from "../../types/toilet";
import { colors, spacing } from "../../constants/colors";
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
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, compact && styles.containerCompact]}
    >
      <View style={[styles.content, compact && styles.contentCompact]}>
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

        {/* Building and floor information */}
        {(toilet.buildingName || toilet.floorName) && (
          <Text style={styles.buildingInfo} numberOfLines={1}>
            {toilet.buildingName && toilet.floorName ?
              `${toilet.buildingName} • ${toilet.floorName}`
            : toilet.buildingName || toilet.floorName}
          </Text>
        )}

        <View style={styles.details}>
          <Rating value={toilet.rating} size="small" />
          <Text style={styles.reviewCount}>
            ({toilet.reviewCount}{" "}
            {toilet.reviewCount === 1 ? "review" : "reviews"})
          </Text>
        </View>

        <Text style={styles.address} numberOfLines={compact ? 1 : 2}>
          {toilet.address}
        </Text>

        {toilet.distance && (
          <Text style={styles.distance}>
            {(toilet.distance / 1000).toFixed(1)}km away
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  accessibleBadge: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  accessibleText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  address: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  buildingInfo: {
    color: colors.text.secondary,
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    elevation: 3,
    marginBottom: spacing.md,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
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
  distance: {
    color: colors.text.light,
    fontSize: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginRight: spacing.sm,
  },
  reviewCount: {
    color: colors.text.light,
    fontSize: 12,
    marginLeft: spacing.xs,
  },
});
