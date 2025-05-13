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
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  accessibleBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  accessibleText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  reviewCount: {
    marginLeft: spacing.xs,
    color: colors.text.light,
    fontSize: 12,
  },
  address: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  distance: {
    color: colors.text.light,
    fontSize: 12,
  },
});
