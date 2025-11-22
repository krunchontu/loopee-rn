import type {
  NavigationProp,
  ParamListBase} from "@react-navigation/native";
import {
  useNavigation
} from "@react-navigation/native";
import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

import { ToiletList } from "./ToiletList";
import { colors, spacing } from "../../foundations";
import { getResponsiveSpacing } from "../../foundations/responsive";
import { useToiletStore } from "../../stores/toilets";
import type { Toilet } from "../../types/toilet";
import { debug } from "../../utils/debug";

/**
 * ToiletListScreen
 *
 * A dedicated screen component for displaying the list of toilets in tablet mode.
 * This component is used in the Drawer Navigator for tablets and handles
 * navigation to the detailed view.
 */
export default function ToiletListScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { toilets, loading, error, fetchNearbyToilets } = useToiletStore();

  const handleToiletPress = (toilet: Toilet) => {
    debug.log("ToiletListScreen", "Toilet selected", toilet.id);
    navigation.navigate("ToiletDetails", { toilet });
  };

  // Get current location and retry fetching
  const handleRetry = () => {
    debug.log("ToiletListScreen", "Retrying toilet fetch");
    // Default coordinates for Singapore (use location service in production)
    const defaultLatitude = 1.3521;
    const defaultLongitude = 103.8198;
    fetchNearbyToilets(defaultLatitude, defaultLongitude);
  };

  return (
    <View style={styles.container}>
      <ToiletList
        toilets={toilets}
        onToiletPress={handleToiletPress}
        isLoading={loading}
        error={error}
        onRetry={handleRetry}
        onRefresh={handleRetry}
        isRefreshing={loading}
      />
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
    padding: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
  },
});
