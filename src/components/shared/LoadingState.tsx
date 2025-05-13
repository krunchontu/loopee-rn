import React from "react";
import {
  StyleSheet,
  View,
  Animated,
  Easing,
  ViewStyle,
  DimensionValue,
} from "react-native";
import { colors, spacing } from "../../constants/colors";

interface LoadingStateProps {
  type?: "skeleton" | "spinner";
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

export function LoadingState({
  type = "skeleton",
  width = "100%",
  height = 100,
  borderRadius = 8,
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
        } as ViewStyle,
      ]}
    />
  );
}

export function SkeletonList({
  count = 3,
  itemHeight = 100,
  spacing: gap = spacing.md,
}: {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}) {
  return (
    <View style={{ gap } as ViewStyle}>
      {Array.from({ length: count }).map((_, index) => (
        <LoadingState key={index} height={itemHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: "transparent",
  },
  skeleton: {
    backgroundColor: colors.text.light,
  },
});
