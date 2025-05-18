import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Modalize } from "react-native-modalize";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { ToiletList } from "./ToiletList";
import { Toilet } from "../../types/toilet";
import { colors, spacing, fontSizes, fontWeights } from "../../foundations";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../../foundations/responsive";
import { debug } from "../../utils/debug";

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

  return (
    <Modalize
      ref={modalizeRef}
      alwaysOpen={initialSnapPoint}
      modalHeight={height * 0.8}
      handlePosition="inside"
      modalStyle={styles.modal}
      handleStyle={styles.handle}
      childrenStyle={styles.content}
      overlayStyle={styles.overlay}
      HeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Nearby Toilets</Text>
          {toilets.length > 0 && (
            <Text style={styles.count}>({toilets.length})</Text>
          )}
        </View>
      }
    >
      <ToiletList
        toilets={toilets}
        onToiletPress={handleToiletPress}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onRefresh={onRetry}
        isRefreshing={isLoading}
      />
    </Modalize>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  count: {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(fontSizes.lg, SCREEN_WIDTH),
    marginLeft: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
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
  title: {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(fontSizes.xxl, SCREEN_WIDTH),
    fontWeight: fontWeights.bold,
  },
});
