import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { ErrorState } from "../shared/ErrorState";
import { Toilet } from "../../types/toilet";
import { PaperToiletCard } from "./PaperToiletCard";
import { colors, spacing, textVariants } from "../../foundations";
import { getResponsiveSpacing } from "../../foundations/responsive";
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
 * ToiletList displays a scrollable list of toilets
 *
 * A simplified, performant implementation using React Native's FlatList
 * that provides a clean, beautiful UI with appropriate loading, error,
 * and empty states.
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
  // Memoized handlers for better performance
  const handleToiletPress = useCallback(
    (toilet: Toilet) => {
      debug.log("ToiletList", "Toilet pressed", toilet.id);
      onToiletPress(toilet);
    },
    [onToiletPress]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Toilet>) => (
      <PaperToiletCard
        toilet={item}
        onPress={() => handleToiletPress(item)}
        compact={compact}
      />
    ),
    [handleToiletPress, compact]
  );

  const keyExtractor = useCallback((item: Toilet) => item.id, []);

  // Optional item separator component
  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  // Memoized empty component to avoid recreation
  const EmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No toilets found nearby</Text>
        {onRetry && (
          <Text style={styles.emptyRetryText} onPress={onRetry}>
            Try searching again
          </Text>
        )}
      </View>
    ),
    [onRetry]
  );

  // Memoized refresh control
  const refreshControlElement = useMemo(
    () =>
      onRefresh ?
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.text.secondary}
          colors={[colors.interactive.primary.default]}
        />
      : undefined,
    [isRefreshing, onRefresh]
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

  // Handle initial loading state
  if (isLoading && toilets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={colors.interactive.primary.default}
        />
        <Text style={styles.loadingText}>Finding toilets nearby...</Text>
      </View>
    );
  }

  // Render the FlatList
  return (
    <FlatList
      data={toilets}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.listContent,
        toilets.length === 0 && styles.emptyListContent,
      ]}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={EmptyComponent}
      refreshControl={refreshControlElement}
      showsVerticalScrollIndicator={true}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
}

type StyleProps = {
  centerContainer: ViewStyle;
  emptyContainer: ViewStyle;
  emptyListContent: ViewStyle;
  emptyRetryText: TextStyle;
  emptyText: TextStyle;
  listContent: ViewStyle;
  loadingText: TextStyle;
  separator: ViewStyle;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create<StyleProps>({
  centerContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: getResponsiveSpacing(spacing.xl, SCREEN_WIDTH),
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyRetryText: {
    ...textVariants.bodyDefault,
    color: colors.interactive.primary.default,
    marginTop: getResponsiveSpacing(spacing.sm, SCREEN_HEIGHT),
    textAlign: "center",
    textDecorationLine: "underline",
  },
  emptyText: {
    ...textVariants.bodyLarge,
    color: colors.text.secondary,
    marginBottom: getResponsiveSpacing(spacing.md, SCREEN_HEIGHT),
    textAlign: "center",
  },
  listContent: {
    paddingBottom: getResponsiveSpacing(spacing.xl, SCREEN_HEIGHT),
    paddingHorizontal: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    paddingTop: getResponsiveSpacing(spacing.sm, SCREEN_HEIGHT),
  },
  loadingText: {
    ...textVariants.bodyDefault,
    color: colors.text.secondary,
    marginTop: getResponsiveSpacing(spacing.md, SCREEN_HEIGHT),
    textAlign: "center",
  },
  separator: {
    backgroundColor: colors.border.light,
    height: 1,
    marginVertical: getResponsiveSpacing(spacing.xs / 2, SCREEN_HEIGHT),
    opacity: 0.5,
    width: "100%",
  },
});
