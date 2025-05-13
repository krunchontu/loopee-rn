import React, {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { colors, spacing } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;
const MIN_TRANSLATE_Y = -SCREEN_HEIGHT * 0.4;

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
    const translateY = new Animated.Value(MIN_TRANSLATE_Y);

    const scrollTo = useCallback(
      (destination: number) => {
        setActive(destination !== 0);
        Animated.spring(translateY, {
          toValue: destination,
          damping: 20,
          useNativeDriver: true,
        }).start();

        if (onHeightChange) {
          onHeightChange(Math.abs(destination));
        }
      },
      [onHeightChange]
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

    // Create pan responder
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateY.setValue(currentPosition);
        translateY.setOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(currentPosition + gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        let finalPosition;
        if (gestureState.vy > 0.5) {
          finalPosition = MIN_TRANSLATE_Y;
        } else if (gestureState.vy < -0.5) {
          finalPosition = MAX_TRANSLATE_Y;
        } else {
          const position = currentPosition + gestureState.dy;
          finalPosition =
            position > (MIN_TRANSLATE_Y + MAX_TRANSLATE_Y) / 2 ?
              MIN_TRANSLATE_Y
            : MAX_TRANSLATE_Y;
        }

        scrollTo(finalPosition);
      },
    });

    return (
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        {children}
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    height: SCREEN_HEIGHT,
    position: "absolute",
    shadowColor: colors.text.primary,
    shadowOffset: {
      height: -2,
      width: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    top: SCREEN_HEIGHT,
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.text.light,
    borderRadius: 2,
    height: 4,
    marginVertical: spacing.sm,
    width: 40,
  },
});
