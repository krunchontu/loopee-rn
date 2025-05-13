import React, { useCallback } from "react";
import { StyleSheet, RefreshControl, View } from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { LoadingState, SkeletonList } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { Toilet } from "../../types/toilet";
import { ToiletCard } from "./ToiletCard";
import { colors, spacing } from "../../constants/colors";
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
  const handleToiletPress = useCallback(
    (toilet: Toilet) => {
      debug.log("ToiletList", "Toilet pressed", toilet.id);
      onToiletPress(toilet);
    },
    [onToiletPress]
  );

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

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          error={error}
          onRetry={onRetry}
          message="Failed to load toilets"
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonList count={5} itemHeight={compact ? 80 : 120} />
      </View>
    );
  }

  if (toilets.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorState
          error="No toilets found nearby"
          onRetry={onRetry}
          message="Try searching in a different area"
        />
      </View>
    );
  }

  return (
    <FlashList
      data={toilets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      estimatedItemSize={compact ? 80 : 120}
      refreshControl={
        onRefresh ?
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
});
