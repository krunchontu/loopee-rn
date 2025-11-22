import React, {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
} from "react-native";

import {
  colors,
  spacing,
  duration,
  easing,
  createAnimatedValue,
  createTimingAnimation,
  zIndex,
} from "../../foundations";
import { createComponentStyle } from "../../foundations/react-native-helpers";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// Sheet positions
const DEFAULT_HANDLE_HEIGHT = 24;
const VISIBLE_HANDLE_HEIGHT = DEFAULT_HANDLE_HEIGHT + spacing.sm * 2;
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + VISIBLE_HANDLE_HEIGHT; // Fully expanded (top position)
const MID_TRANSLATE_Y = -SCREEN_HEIGHT * 0.6; // Mid position
const MIN_TRANSLATE_Y = -SCREEN_HEIGHT * 0.3; // Collapsed position (default)

export interface BottomSheetProps {
  children: React.ReactNode;
  onHeightChange?: (height: number) => void;
}

export interface BottomSheetRef {
  scrollTo: (destination: number) => void;
  isActive: () => boolean;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, onHeightChange }, ref) => {
    const [active, setActive] = useState(false);
    const translateY = useRef(createAnimatedValue(MIN_TRANSLATE_Y)).current;

    // Background overlay opacity based on sheet position
    const backdropOpacity = translateY.interpolate({
      inputRange: [MAX_TRANSLATE_Y, MIN_TRANSLATE_Y],
      outputRange: [0.5, 0],
      extrapolate: "clamp",
    });

    const scrollTo = useCallback(
      (destination: number) => {
        setActive(destination !== 0);

        // Use our animation utilities for consistent animations
        createTimingAnimation(
          translateY,
          destination,
          duration.normal,
          easing.easeOut
        ).start(() => {
          if (onHeightChange) {
            onHeightChange(Math.abs(destination));
          }
        });
      },
      [onHeightChange, translateY]
    );

    const isActive = useCallback(() => {
      return active;
    }, [active]);

    useImperativeHandle(
      ref,
      () => ({
        scrollTo,
        isActive,
      }),
      [scrollTo, isActive]
    );

    // Initialize with default position
    useEffect(() => {
      translateY.setValue(MIN_TRANSLATE_Y);
    }, []);

    // Store current position for gesture handling
    const [currentPosition, setCurrentPosition] = useState(MIN_TRANSLATE_Y);

    // Update the stored position when animation completes
    useEffect(() => {
      translateY.addListener(({ value }) => {
        setCurrentPosition(value);
      });
      return () => {
        translateY.removeAllListeners();
      };
    }, []);

    // Enhanced pan responder with better gesture handling
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateY.setValue(currentPosition);
        translateY.setOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit drag to prevent pulling beyond max height
        const newPosition = Math.max(
          MAX_TRANSLATE_Y,
          Math.min(MIN_TRANSLATE_Y, currentPosition + gestureState.dy)
        );
        translateY.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        let finalPosition;

        // Fast flick handling
        if (gestureState.vy > 0.5) {
          // Fast downward flick - collapse to minimum
          finalPosition = MIN_TRANSLATE_Y;
        } else if (gestureState.vy < -0.5) {
          // Fast upward flick - expand to maximum
          finalPosition = MAX_TRANSLATE_Y;
        } else {
          // Determine position based on current position and gesture
          const position = currentPosition + gestureState.dy;

          // Three-state positioning logic (expanded, mid, collapsed)
          if (position < (MAX_TRANSLATE_Y + MID_TRANSLATE_Y) / 2) {
            finalPosition = MAX_TRANSLATE_Y; // Go to expanded
          } else if (position > (MID_TRANSLATE_Y + MIN_TRANSLATE_Y) / 2) {
            finalPosition = MIN_TRANSLATE_Y; // Go to collapsed
          } else {
            finalPosition = MID_TRANSLATE_Y; // Go to mid position
          }
        }

        scrollTo(finalPosition);
      },
    });

    return (
      <>
        {/* Backdrop overlay for tap-to-dismiss */}
        {active && (
          <TouchableWithoutFeedback onPress={() => scrollTo(MIN_TRANSLATE_Y)}>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropOpacity }]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* Bottom sheet container */}
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </>
    );
  }
);

const styles = StyleSheet.create({
  // Backdrop styling
  backdrop: {
    backgroundColor: colors.background.overlay,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: zIndex.modal - 1,
  },

  // Bottom sheet container
  container: createComponentStyle({
    backgroundColor: colors.background.primary,
    height: SCREEN_HEIGHT,
    position: "absolute",
    radius: "lg",
    shadow: "lg",
    top: SCREEN_HEIGHT,
    width: "100%",
    zIndex: "modal",
  }),

  // Content container
  content: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },

  // Handle styling
  handle: {
    alignSelf: "center",
    backgroundColor: colors.text.tertiary,
    borderRadius: 2,
    height: 4,
    width: 40,
  },

  // Handle container with touch area
  handleContainer: {
    alignItems: "center",
    height: DEFAULT_HANDLE_HEIGHT,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    width: "100%",
  },
});
