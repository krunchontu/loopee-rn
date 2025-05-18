import React, { useCallback } from "react";
import { StyleSheet, RefreshControl, View, Text } from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { SkeletonList, LoadingState } from "../shared/LoadingState"; // Added LoadingState import
import { ErrorState } from "../shared/ErrorState";
import { Toilet } from "../../types/toilet";
import { ToiletCard } from "./ToiletCard";
import { colors, spacing, textVariants, borderRadius } from "../../foundations";
import { getResponsiveSpacing } from "../../foundations/responsive";
import { Dimensions } from "react-native";
import { debug } from "../../utils/debug";

export interface ToiletListProps {
  toilets: Toilet[];
  onToiletPress: (toilet: Toilet) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLoading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * ToiletList displays a scrollable list of toilets with optimized rendering
 *
 * Improvements:
 * - Better scrolling performance using FlashList
 * - Optimized item rendering and recycling
 * - Clear loading and error states
 * - Pull-to-refresh support
 */
export function ToiletList({
  toilets,
  onToiletPress,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  error = null,
  onRetry,
  compact = false,
}: ToiletListProps) {
  // Memoized press handler to avoid recreating on each render
  const handleToiletPress = useCallback(
    (toilet: Toilet) => {
      debug.log("ToiletList", "Toilet pressed", toilet.id);
      onToiletPress(toilet);
    },
    [onToiletPress]
  );

  // Optimized render function for list items
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Toilet>) => (
      <ToiletCard
        toilet={item}
        onPress={() => handleToiletPress(item)}
        compact={compact}
      />
    ),
    [handleToiletPress, compact]
  );

  // Handle error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ErrorState
          error={error}
          onRetry={onRetry}
          message="Failed to load toilets"
        />
      </View>
    );
  }

  // Handle loading state with skeleton UI
  if (isLoading && toilets.length === 0) {
    const skeletonItemHeight = compact ? 76 : 110;
    const renderSkeletonItem = () => (
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonMainInfo}>
          <LoadingState width="70%" height={20} borderRadius={4} />
          <View style={{ marginTop: spacing.xs }}>
            <LoadingState width="50%" height={16} borderRadius={4} />
          </View>
        </View>
        <View style={styles.skeletonMetaInfo}>
          <LoadingState width={50} height={20} borderRadius={4} />
          <View style={{ marginTop: spacing.sm }}>
            <LoadingState width={60} height={16} borderRadius={4} />
          </View>
        </View>
      </View>
    );
    return (
      <View style={styles.container}>
        <SkeletonList
          count={5}
          itemHeight={skeletonItemHeight}
          renderItem={renderSkeletonItem}
          spacing={compact ? spacing.sm : spacing.md}
        />
      </View>
    );
  }

  // Handle empty state
  if (toilets.length === 0) {
    // For the empty state, use a simpler message instead of the full ErrorState component
    // if no actual error occurred but the list is just empty.
    // The ListEmptyComponent of FlashList will handle this if data is empty after loading.
    // The explicit check here is for when `isLoading` is false and `toilets` is empty.
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No toilets found nearby.</Text>
        {onRetry && ( // Optionally, still offer a way to retry/refresh
          <Text style={styles.emptyRetryText} onPress={onRetry}>
            Try searching again or adjusting filters.
          </Text>
        )}
      </View>
    );
  }

  // Render optimized list
  return (
    <FlashList
      data={toilets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={true}
      contentContainerStyle={styles.listContent}
      estimatedItemSize={compact ? 88 : 120}
      refreshControl={
        onRefresh ?
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.secondary}
            colors={[colors.interactive.primary.default]}
          />
        : undefined
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No toilets found nearby</Text>
        </View>
      }
    />
  );
}

import type { ViewStyle, TextStyle } from "react-native";

type StyleProps = {
  centerContainer: ViewStyle;
  container: ViewStyle;
  emptyContainer: ViewStyle;
  emptyRetryText: TextStyle;
  emptyText: TextStyle;
  listContent: ViewStyle;
  skeletonCard: ViewStyle;
  skeletonMainInfo: ViewStyle;
  skeletonMetaInfo: ViewStyle;
};

const styles = StyleSheet.create<StyleProps>({
  centerContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginTop: spacing.xxl, // Add some top margin to push it down a bit
    padding: spacing.xl,
  },
  emptyRetryText: {
    ...textVariants.bodyDefault,
    color: colors.interactive.primary.default,
    marginTop: spacing.sm,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  emptyText: {
    ...textVariants.bodyLarge, // Slightly larger for emphasis
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: getResponsiveSpacing(
      spacing.xl,
      Dimensions.get("window").height
    ),
    paddingHorizontal: getResponsiveSpacing(
      spacing.sm,
      Dimensions.get("window").width
    ),
    paddingTop: getResponsiveSpacing(
      spacing.sm,
      Dimensions.get("window").height
    ),
  },
  skeletonCard: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.card,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: getResponsiveSpacing(60, Dimensions.get("window").height),
    padding: getResponsiveSpacing(spacing.sm, Dimensions.get("window").width),
  },
  skeletonMainInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  skeletonMetaInfo: {
    alignItems: "flex-end",
  },
});
