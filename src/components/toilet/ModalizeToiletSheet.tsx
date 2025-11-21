import type {
  NavigationProp,
  ParamListBase} from "@react-navigation/native";
import {
  useNavigation
} from "@react-navigation/native";
import React, { useRef, useEffect, useCallback } from "react";
import type {
  ListRenderItemInfo} from "react-native";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Modalize } from "react-native-modalize";

import { PaperToiletCard } from "./PaperToiletCard";
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  textVariants,
} from "../../foundations";
import { breakpoints } from "../../foundations/layout";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../../foundations/responsive";
import type { Toilet } from "../../types/toilet";
import { debug } from "../../utils/debug";
import { ErrorState } from "../shared/ErrorState";

interface ModalizeToiletSheetProps {
  toilets: Toilet[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * ModalizeToiletSheet
 *
 * A more reliable bottom sheet implementation using react-native-modalize
 * that displays a list of nearby toilets and handles navigation to detail view.
 *
 * Features:
 * - Consistent snapping behavior
 * - Better support for different screen sizes
 * - Improved gesture handling
 * - Higher contrast visuals for better readability
 * - Direct FlatList integration to avoid nested scrolling errors
 * - Responsive card UI with compact mode for small screens
 * - Uses PaperToiletCard for consistent UI across the app
 * - Adapts to different screen densities automatically
 */
export const ModalizeToiletSheet: React.FC<ModalizeToiletSheetProps> = ({
  toilets,
  isLoading,
  error,
  onRetry,
}) => {
  const modalizeRef = useRef<Modalize>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // Open the sheet when toilets are loaded
  useEffect(() => {
    if (toilets.length > 0 && !isLoading) {
      modalizeRef.current?.open();
    }
  }, [toilets, isLoading]);

  const handleToiletPress = (toilet: Toilet) => {
    debug.log("ModalizeToiletSheet", "Toilet selected", toilet.id);
    navigation.navigate("ToiletDetails", { toilet });
  };

  // Calculate initial height based on screen size
  const { height } = Dimensions.get("window");
  const initialSnapPoint = Math.min(height * 0.3, 300); // Smaller initial height

  // Memoized render item function for performance with responsive compact mode
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Toilet>) => {
      // Determine if compact mode should be used based on screen width
      const { width } = Dimensions.get("window");
      const useCompact = width < breakpoints.sm; // Small phones use compact mode

      return (
        <PaperToiletCard
          toilet={item}
          onPress={() => handleToiletPress(item)}
          compact={useCompact}
        />
      );
    },
    [handleToiletPress]
  );

  // Key extractor for list items
  const keyExtractor = useCallback((item: Toilet) => item.id, []);

  // Empty component when no toilets are found
  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No toilets found nearby</Text>
        <Text style={styles.emptyRetryText} onPress={onRetry}>
          Try searching again
        </Text>
      </View>
    ),
    [onRetry]
  );

  // If there's an error, show the error state
  if (error && !isLoading) {
    return (
      <Modalize
        ref={modalizeRef}
        alwaysOpen={initialSnapPoint}
        modalHeight={height * 0.5}
        handlePosition="inside"
        modalStyle={styles.modal}
        handleStyle={styles.handle}
        HeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Nearby Toilets</Text>
          </View>
        }
      >
        <View style={styles.errorContainer}>
          <ErrorState
            error={error}
            onRetry={onRetry}
            message="Failed to load toilets"
          />
        </View>
      </Modalize>
    );
  }

  // Loading state with initialSnapPoint height
  if (isLoading && toilets.length === 0) {
    return (
      <Modalize
        ref={modalizeRef}
        alwaysOpen={initialSnapPoint}
        modalHeight={height * 0.5}
        handlePosition="inside"
        modalStyle={styles.modal}
        handleStyle={styles.handle}
        HeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Nearby Toilets</Text>
          </View>
        }
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.interactive.primary.default}
          />
          <Text style={styles.loadingText}>Finding toilets nearby...</Text>
        </View>
      </Modalize>
    );
  }

  return (
    <Modalize
      ref={modalizeRef}
      alwaysOpen={initialSnapPoint}
      modalHeight={height * 0.8}
      handlePosition="inside"
      modalStyle={styles.modal}
      handleStyle={styles.handle}
      overlayStyle={styles.overlay}
      HeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Nearby Toilets</Text>
          {toilets.length > 0 && (
            <Text style={styles.count}>({toilets.length})</Text>
          )}
        </View>
      }
      flatListProps={{
        data: toilets,
        renderItem: renderItem,
        keyExtractor: keyExtractor,
        showsVerticalScrollIndicator: true,
        ListEmptyComponent: EmptyComponent,
        refreshControl: (
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRetry}
            tintColor={colors.text.secondary}
            colors={[colors.interactive.primary.default]}
          />
        ),
        contentContainerStyle: [
          styles.listContent,
          toilets.length === 0 && styles.emptyListContent,
        ],
        ItemSeparatorComponent: () => <View style={styles.separator} />,
        initialNumToRender: 8,
        maxToRenderPerBatch: 10,
        windowSize: 5,
        removeClippedSubviews: true,
      }}
    />
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  count: {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(fontSizes.lg, SCREEN_WIDTH),
    marginLeft: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
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
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  handle: {
    backgroundColor: colors.border.light,
    height: 5,
    width: 40,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border.light,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
    paddingVertical: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  },
  listContent: {
    paddingBottom: getResponsiveSpacing(spacing.xl, SCREEN_HEIGHT),
    paddingHorizontal: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    paddingTop: getResponsiveSpacing(spacing.sm, SCREEN_HEIGHT),
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  loadingText: {
    ...textVariants.bodyDefault,
    color: colors.text.secondary,
    marginTop: getResponsiveSpacing(spacing.md, SCREEN_HEIGHT),
    textAlign: "center",
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  overlay: {
    backgroundColor: colors.background.overlay,
  },
  separator: {
    backgroundColor: colors.border.light,
    height: 1,
    marginVertical: getResponsiveSpacing(spacing.xs / 2, SCREEN_HEIGHT),
    opacity: 0.5,
    width: "100%",
  },
  title: {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(fontSizes.xxl, SCREEN_WIDTH),
    fontWeight: fontWeights.bold,
  },
});
