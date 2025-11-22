import React from "react";
import type {
  ViewStyle,
  DimensionValue} from "react-native";
import {
  StyleSheet,
  View,
  Animated,
  Easing
} from "react-native";

import { colors, spacing, palette } from "../../foundations"; // Changed import, added palette

interface LoadingStateProps {
  type?: "skeleton" | "spinner";
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  children?: React.ReactNode; // Added children prop
}

export function LoadingState({
  type = "skeleton",
  width = "100%",
  height = 100,
  borderRadius = 8,
  children, // Added children prop
}: LoadingStateProps) {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (type === "spinner") {
    return (
      <View style={[styles.container, { width, height } as ViewStyle]}>
        <Animated.View
          style={[
            styles.spinner,
            {
              opacity,
              transform: [
                {
                  rotate: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
          overflow: children ? "visible" : "hidden", // Allow children to overflow if needed, or keep hidden
        } as ViewStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  spacing?: number; // Renamed 'gap' back to 'spacing' for clarity in props
  itemStyle?: ViewStyle; // Style for an optional wrapper around each LoadingState, if needed
  renderItem?: (index: number) => React.ReactNode;
}

export function SkeletonList({
  count = 3,
  itemHeight = 100,
  spacing: listSpacing = spacing.md, // Use 'listSpacing' to avoid conflict with 'spacing' from import
  // itemStyle, // itemStyle is not directly used on LoadingState, would need a wrapper
  renderItem,
}: SkeletonListProps) {
  return (
    <View style={{ gap: listSpacing } as ViewStyle}>
      {Array.from({ length: count }).map((_, index) => (
        // If itemStyle was meant for LoadingState, its properties (width, height, borderRadius)
        // would need to be passed individually or LoadingState updated.
        // For now, not applying itemStyle directly to LoadingState to fix TS error.
        <LoadingState key={index} height={itemHeight}>
          {renderItem ? renderItem(index) : null}
        </LoadingState>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  skeleton: {
    backgroundColor: colors.text.tertiary, // Corrected to use tertiary text color
  },
  spinner: {
    borderColor: colors.primary,
    borderRadius: 12,
    borderTopColor: palette.transparent, // Using palette.transparent from foundations
    borderWidth: 2,
    height: 24,
    width: 24,
  },
});
