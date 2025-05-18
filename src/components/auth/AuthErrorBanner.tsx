/**
 * @file Auth Error Banner Component
 *
 * A user-friendly error notification component specifically for authentication-related errors
 * that are actionable by the user. Technical errors should be logged but not displayed
 * using this component.
 */

import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Surface, Text, Icon } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { colors, spacing } from "../../foundations";

interface AuthErrorBannerProps {
  /** Error message to display */
  message: string;
  /** Whether to auto-dismiss the error after a period */
  autoDismiss?: boolean;
  /** Auto-dismiss timeout in ms (default 5000) */
  timeout?: number;
  /** Optional callback when banner is dismissed */
  onDismiss?: () => void;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * A user-friendly banner for displaying authentication errors
 *
 * Designed specifically for displaying errors that users can take action on,
 * such as invalid credentials, password requirements not met, etc.
 *
 * Technical errors should be logged to console but not displayed with this component.
 */
export const AuthErrorBanner = ({
  message,
  autoDismiss = false,
  timeout = 5000,
  onDismiss,
  accessibilityLabel = "Authentication error notification",
}: AuthErrorBannerProps) => {
  // Animation states
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-10);

  // Control visibility
  const [visible, setVisible] = useState(!!message);

  // Animation effect
  useEffect(() => {
    if (message) {
      setVisible(true);
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });

      // Add subtle attention animation
      translateY.value = withSequence(
        withTiming(0, { duration: 300 }),
        withTiming(-3, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );

      // Set up auto-dismiss if enabled
      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, timeout);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [message]);

  // Handle dismissal
  const handleDismiss = () => {
    opacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.ease),
    });
    translateY.value = withTiming(
      -10,
      { duration: 200, easing: Easing.in(Easing.ease) },
      () => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }
    );
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || !message) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      testID="auth-error-banner"
    >
      <Surface style={styles.surface}>
        <View style={styles.contentContainer}>
          <Icon
            source="alert-circle-outline"
            size={20}
            color={colors.status.error.foreground}
          />
          <Text style={styles.message} accessibilityLabel={accessibilityLabel}>
            {message}
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss error"
          accessibilityRole="button"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Icon source="close" size={16} color={colors.text.secondary} />
        </Pressable>
      </Surface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: "100%",
  },
  contentContainer: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  dismissButton: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  message: {
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  surface: {
    backgroundColor: colors.status.error.background,
    borderRadius: 8,
    elevation: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
});
