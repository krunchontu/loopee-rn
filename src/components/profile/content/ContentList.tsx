/**
 * @file ContentList Component
 *
 * A reusable content list component for displaying user content
 * such as reviews, contributions, and favorites.
 */

import React from "react";
import type {
  StyleProp,
  ViewStyle} from "react-native";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text
} from "react-native";
import { IconButton } from "react-native-paper";

import { colors } from "../../../foundations/colors";

interface ContentListProps<T> {
  data: T[] | null;
  isLoading: boolean;
  emptyStateIcon: string;
  emptyStateTitle: string;
  emptyStateMessage: string;
  keyExtractor: (item: T) => string;
  renderItem: ({ item }: { item: T }) => React.ReactElement;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A reusable content list component that handles loading,
 * empty, and error states gracefully.
 */
function ContentList<T>({
  data,
  isLoading,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateMessage,
  keyExtractor,
  renderItem,
  onRefresh,
  isRefreshing = false,
  style,
}: ContentListProps<T>): React.ReactElement {
  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, style]}>
        <ActivityIndicator
          size="large"
          color={colors.interactive.primary.default}
        />
      </View>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={[styles.centeredContainer, style]}>
        <IconButton
          icon={emptyStateIcon}
          size={48}
          iconColor={colors.text.secondary}
        />
        <View style={styles.emptyStateText}>
          <Text style={styles.emptyStateTitle}>{emptyStateTitle}</Text>
          <Text style={styles.emptyStateMessage}>{emptyStateMessage}</Text>
        </View>
      </View>
    );
  }

  // Data display
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      style={[styles.list, style]}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyStateMessage: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  emptyStateText: {
    alignItems: "center",
    marginTop: 16,
  },
  emptyStateTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
});

export default ContentList;
