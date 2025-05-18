import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  BackHandler,
  PanResponder,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  spacing,
  zIndex,
  duration,
  easing,
  borderRadius,
  createAnimatedValue,
  createParallel,
  createTimingAnimation,
  createSpringAnimation,
  fontSizes,
  fontWeights,
  lineHeights,
} from "../../foundations";
import {
  useResponsiveLayout,
  getResponsiveValue,
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../foundations/responsive";
import {
  createComponentStyle,
  createTextStyle,
} from "../../foundations/react-native-helpers";
import { ToiletList } from "./ToiletList";
import { Toilet } from "../../types/toilet";
import { debug } from "../../utils/debug";

// Animation configuration
const DISMISS_THRESHOLD = 100; // Increased threshold for more intentional dismissal
const SPRING_CONFIG = { friction: 8, tension: 40 }; // Spring animation feel

// Types
interface ModalToiletSheetProps {
  visible: boolean;
  toilets: Toilet[]; // Kept for now, but might be refactored if only one toilet is shown
  selectedToilet: Toilet | null; // New prop
  onToiletPress: (toilet: Toilet) => void;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * Custom hook for modal animations with improved gesture handling
 */
function useModalAnimations(visible: boolean, onClose: () => void) {
  // Window dimensions
  const { height: windowHeight } = Dimensions.get("window");

  // Animation values
  const slideAnim = useRef(createAnimatedValue(0)).current;
  const fadeAnim = useRef(createAnimatedValue(0)).current;
  const scaleAnim = useRef(createAnimatedValue(0.98)).current;
  const touchOpacity = useRef(createAnimatedValue(1)).current;

  // Animation calculations
  const slideTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  const backdropOpacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5], // Reduced backdrop opacity for a lighter feel
  });

  // Handle showing animations
  useEffect(() => {
    if (visible) {
      debug.log("ModalToiletSheet", "Opening modal sheet");

      // Smooth, spring-based entry animation
      createParallel([
        createSpringAnimation(
          slideAnim,
          1,
          SPRING_CONFIG.friction,
          SPRING_CONFIG.tension
        ),
        createTimingAnimation(fadeAnim, 1),
        createSpringAnimation(
          scaleAnim,
          1,
          SPRING_CONFIG.friction,
          SPRING_CONFIG.tension
        ),
      ]).start();
    } else {
      // Reset animation values when hidden
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.98);
    }
  }, [visible, slideAnim, fadeAnim, scaleAnim]);

  // Handle Android back button
  useEffect(() => {
    const handleBackPress = () => {
      if (visible) {
        onClose();
        return true; // Prevents default behavior
      }
      return false; // Allows default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Create pan responder for swipe gestures
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Don't capture all touches
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only handle strong vertical swipes from the top area
        // This prevents conflict with list scrolling
        return (
          gestureState.dy > 12 &&
          Math.abs(gestureState.dx) < Math.abs(gestureState.dy) / 2
        );
      },
      onPanResponderGrant: () => {
        // Feedback when touch starts
        createTimingAnimation(touchOpacity, 0.97, duration.fast).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement (prevent upward pull)
        const newPosition = Math.max(0, gestureState.dy / windowHeight);
        slideAnim.setValue(1 - newPosition);
        // Fade backdrop as sheet moves down
        fadeAnim.setValue(1 - newPosition * 1.5); // Faster backdrop fade
      },
      onPanResponderRelease: (_, gestureState) => {
        // Restore normal opacity
        createTimingAnimation(touchOpacity, 1, duration.fast).start();

        // If dragged down past threshold, dismiss
        if (gestureState.dy > DISMISS_THRESHOLD && gestureState.vy > 0) {
          // Animate out and close
          createTimingAnimation(
            slideAnim,
            0,
            gestureState.vy * 100, // Faster animation for quick flicks
            easing.easeOut
          ).start(() => onClose());
          createTimingAnimation(fadeAnim, 0, duration.normal).start();
        } else {
          // Spring back to opened position
          createSpringAnimation(
            slideAnim,
            1,
            SPRING_CONFIG.friction,
            SPRING_CONFIG.tension
          ).start();
          createTimingAnimation(fadeAnim, 1).start();
        }
      },
    });
  }, [slideAnim, fadeAnim, touchOpacity, windowHeight, onClose]);

  return {
    animatedValues: {
      slideAnim,
      fadeAnim,
      scaleAnim,
      touchOpacity,
    },
    animatedStyles: {
      slideTransform,
      backdropOpacity,
    },
    panHandlers: panResponder.panHandlers,
  };
}

// Handle component - visual indicator at top of modal
const ModalHandle = React.memo(() => (
  <View style={styles.handleContainer}>
    <View style={styles.handle} />
  </View>
));

// Header component with title, count and close button
interface ModalHeaderProps {
  toiletCount: number;
  onClose: () => void;
}

const ModalHeader = React.memo(({ toiletCount, onClose }: ModalHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Nearby Toilets</Text>
        {toiletCount > 0 && (
          <Text style={styles.countText}>({toiletCount})</Text>
        )}
      </View>

      <Pressable
        onPress={onClose}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} // Slightly larger hotslop
      >
        <Text style={styles.closeButtonIcon}>✕</Text>
      </Pressable>
    </View>
  );
});

/**
 * ModalToiletSheet - A redesigned modal component for displaying nearby toilets
 *
 * Improvements:
 * - Fixed scrolling issues by improving gesture handling
 * - Optimized performance with better animation configurations
 * - Enhanced visual design with cleaner margins and spacing
 * - Improved accessibility and touch targets
 * - Better keyboard handling for form fields
 */
export const ModalToiletSheet = React.memo(
  ({
    visible,
    toilets,
    onToiletPress,
    onClose,
    isLoading,
    error,
    onRetry,
    selectedToilet, // Destructure new prop
  }: ModalToiletSheetProps) => {
    // Use our custom animation hook
    const { animatedValues, animatedStyles, panHandlers } = useModalAnimations(
      visible,
      onClose
    );

    // Memoize the toilet selection handler
    const handleToiletSelection = useCallback(
      (toilet: Toilet) => {
        debug.log("ModalToiletSheet", "Toilet selected", toilet.id);
        onToiletPress(toilet);
      },
      [onToiletPress]
    );

    // Determine the toilet(s) to display. If a single `selectedToilet` is provided,
    // wrap it in an array for `ToiletList`. Otherwise, use the `toilets` prop.
    const toiletsToDisplay = useMemo(() => {
      if (selectedToilet) {
        return [selectedToilet];
      }
      return toilets; // Fallback to the list if no single toilet is selected (or for future list view in modal)
    }, [selectedToilet, toilets]);

    // Use responsive layout hook for adaptive sizing
    const { isTablet, isLandscape, height } = useResponsiveLayout();

    // Calculate dynamic dimensions based on device and orientation
    const modalDimensions = useMemo(() => {
      type PercentageString = `${number}%`;

      // Height calculation based on device size
      const maxHeight = getResponsiveValue<PercentageString>(
        height,
        "95%", // Small phones
        "90%", // Medium phones
        "85%", // Large phones
        "80%" // Tablets
      );

      // Width calculation for tablets in landscape
      const modalWidth: PercentageString =
        isTablet && isLandscape ? "50%" : "100%";

      return {
        maxHeight,
        width: modalWidth,
      };
    }, [isTablet, isLandscape, height]);

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        {/* Backdrop with tap to close */}
        <Animated.View
          style={[styles.backdrop, { opacity: animatedStyles.backdropOpacity }]}
        >
          <Pressable
            style={styles.backdropPressable}
            onPress={onClose}
            android_disableSound={true}
            accessibilityRole="button"
            accessibilityLabel="Close toilet list"
          />
        </Animated.View>

        {/* Main content container with animations */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidingContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              styles.contentContainerShadow,
              {
                maxHeight: modalDimensions.maxHeight,
                width: modalDimensions.width,
                alignSelf: "center" as const,
                transform: [
                  { translateY: animatedStyles.slideTransform },
                  { scale: animatedValues.scaleAnim },
                ],
                opacity: animatedValues.touchOpacity,
              } as const,
            ]}
          >
            <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
              {/* Pull indicator - ONLY apply pan handlers here */}
              <View {...panHandlers}>
                <ModalHandle />

                {/* Header with title and close button */}
                <ModalHeader
                  toiletCount={toiletsToDisplay.length}
                  onClose={onClose}
                />
              </View>

              {/* Content area with toilet list - NO pan handlers to avoid conflicts */}
              <View style={styles.contentWrapper}>
                <ToiletList
                  toilets={toiletsToDisplay}
                  onToiletPress={handleToiletSelection}
                  isLoading={isLoading}
                  error={error}
                  onRetry={onRetry}
                  onRefresh={onRetry} // Assuming onRetry can serve as onRefresh for simplicity here
                  isRefreshing={isLoading}
                  // If we only show one toilet, compact view might be good.
                  // Or, we might design a dedicated "ToiletDetailView" instead of using ToiletList.
                  // For now, keeping ToiletList for structure.
                  compact={toiletsToDisplay.length === 1}
                />
              </View>
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

// Display names for enhanced debugging
ModalHandle.displayName = "ModalToiletSheet.Handle";
ModalHeader.displayName = "ModalToiletSheet.Header";
ModalToiletSheet.displayName = "ModalToiletSheet";

import type { ViewStyle, TextStyle } from "react-native";

type StyleProps = {
  backdrop: ViewStyle;
  backdropPressable: ViewStyle;
  closeButton: ViewStyle;
  closeButtonIcon: TextStyle;
  contentContainer: ViewStyle;
  contentContainerShadow: ViewStyle;
  contentWrapper: ViewStyle;
  countText: TextStyle;
  handle: ViewStyle;
  handleContainer: ViewStyle;
  header: ViewStyle;
  keyboardAvoidingContainer: ViewStyle;
  safeArea: ViewStyle;
  title: TextStyle;
  titleContainer: ViewStyle;
};

const styles = StyleSheet.create<StyleProps>({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.text.primary,
    zIndex: zIndex.overlay,
  },
  backdropPressable: {
    flex: 1,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: getResponsiveSpacing(44, Dimensions.get("window").width),
    justifyContent: "center",
    width: getResponsiveSpacing(44, Dimensions.get("window").width),
  },
  closeButtonIcon: createTextStyle("h3", {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(
      fontSizes.xl,
      Dimensions.get("window").width
    ),
    fontWeight: fontWeights.regular,
  }),
  contentContainer: createComponentStyle({
    backgroundColor: colors.background.primary,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: "hidden",
    zIndex: zIndex.modal,
  }),
  contentContainerShadow: {
    elevation: 10,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  contentWrapper: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  countText: createTextStyle("bodyLarge", {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(
      fontSizes.lg,
      Dimensions.get("window").width
    ),
    marginLeft: getResponsiveSpacing(
      spacing.sm,
      Dimensions.get("window").width
    ),
  }),
  handle: {
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.pill,
    height: getResponsiveSpacing(4, Dimensions.get("window").height),
    width: getResponsiveSpacing(40, Dimensions.get("window").width),
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: getResponsiveSpacing(
      spacing.sm,
      Dimensions.get("window").height
    ),
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderBottomColor: colors.border.light,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveSpacing(
      spacing.lg,
      Dimensions.get("window").width
    ),
    paddingVertical: getResponsiveSpacing(
      spacing.md,
      Dimensions.get("window").width
    ),
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  safeArea: {
    flex: 1,
  },
  title: createTextStyle("h2", {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(
      fontSizes.xxl,
      Dimensions.get("window").width
    ),
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
  }),
  titleContainer: {
    flex: 1,
  },
});
