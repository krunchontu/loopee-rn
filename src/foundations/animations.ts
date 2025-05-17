/**
 * @file Animation system for Loopee app
 *
 * This file defines animation-related tokens and utilities including:
 * - Animation timing
 * - Easing functions
 * - Animation presets
 * - Animation utilities
 */

import { Animated, Easing } from "react-native";

// Animation durations (in milliseconds)
export const duration = {
  instant: 0,
  extraFast: 100,
  fast: 200,
  normal: 300,
  slow: 400,
  extraSlow: 500,
} as const;

// Easing presets for different animation types
export const easing = {
  // Standard easings
  linear: Easing.linear,
  ease: Easing.ease,

  // Accelerating from zero velocity
  easeIn: Easing.in(Easing.ease),
  easeInQuad: Easing.in(Easing.quad),
  easeInCubic: Easing.in(Easing.cubic),

  // Decelerating to zero velocity
  easeOut: Easing.out(Easing.ease),
  easeOutQuad: Easing.out(Easing.quad),
  easeOutCubic: Easing.out(Easing.cubic),

  // Accelerating until halfway, then decelerating
  easeInOut: Easing.inOut(Easing.ease),
  easeInOutQuad: Easing.inOut(Easing.quad),
  easeInOutCubic: Easing.inOut(Easing.cubic),

  // Additional easings for specific cases
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
  back: Easing.back(1.5),
} as const;

// Animation presets for common use cases
export const presets = {
  // Fade animations
  fadeIn: {
    property: "opacity",
    from: 0,
    to: 1,
    duration: duration.normal,
    easing: easing.easeOut,
  },
  fadeOut: {
    property: "opacity",
    from: 1,
    to: 0,
    duration: duration.normal,
    easing: easing.easeOut,
  },

  // Scale animations
  scaleUp: {
    property: "scale",
    from: 0.95,
    to: 1,
    duration: duration.normal,
    easing: easing.easeOut,
  },
  scaleDown: {
    property: "scale",
    from: 1,
    to: 0.95,
    duration: duration.fast,
    easing: easing.easeOut,
  },

  // Movement animations
  slideInRight: {
    property: "translateX",
    from: 100,
    to: 0,
    duration: duration.normal,
    easing: easing.easeOut,
  },
  slideOutRight: {
    property: "translateX",
    from: 0,
    to: 100,
    duration: duration.normal,
    easing: easing.easeOut,
  },
  slideInUp: {
    property: "translateY",
    from: 100,
    to: 0,
    duration: duration.normal,
    easing: easing.easeOut,
  },
  slideOutDown: {
    property: "translateY",
    from: 0,
    to: 100,
    duration: duration.normal,
    easing: easing.easeOut,
  },

  // Button feedback
  buttonPress: {
    property: "scale",
    from: 1,
    to: 0.97,
    duration: duration.fast,
    easing: easing.easeOut,
  },
  buttonRelease: {
    property: "scale",
    from: 0.97,
    to: 1,
    duration: duration.fast,
    easing: easing.easeOut,
  },
} as const;

/**
 * Creates an Animated.Value configured for an animation
 *
 * @param initialValue The starting value for the animation
 * @returns Animated.Value initialized with the specified value
 */
export const createAnimatedValue = (initialValue: number) => {
  return new Animated.Value(initialValue);
};

/**
 * Creates a timing-based animation with standard configurations
 *
 * @param animatedValue The Animated.Value to animate
 * @param toValue Target value
 * @param animDuration Duration in milliseconds
 * @param animEasing Easing function to use
 * @returns Animated.CompositeAnimation that can be started, stopped, etc.
 */
export const createTimingAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  animDuration: number = duration.normal,
  animEasing = easing.easeOut
) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration: animDuration,
    easing: animEasing,
    useNativeDriver: true,
  });
};

/**
 * Creates a spring-based animation with standard configurations
 *
 * @param animatedValue The Animated.Value to animate
 * @param toValue Target value
 * @param friction Friction (default: 7)
 * @param tension Tension (default: 40)
 * @returns Animated.CompositeAnimation that can be started, stopped, etc.
 */
export const createSpringAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  friction = 7,
  tension = 40
) => {
  return Animated.spring(animatedValue, {
    toValue,
    friction,
    tension,
    useNativeDriver: true,
  });
};

/**
 * Creates an animation sequence from multiple animations
 *
 * @param animations Array of animations to run in sequence
 * @returns Animated.CompositeAnimation for the sequence
 */
export const createSequence = (animations: Animated.CompositeAnimation[]) => {
  return Animated.sequence(animations);
};

/**
 * Creates an animation that runs multiple animations in parallel
 *
 * @param animations Array of animations to run in parallel
 * @returns Animated.CompositeAnimation for the parallel group
 */
export const createParallel = (animations: Animated.CompositeAnimation[]) => {
  return Animated.parallel(animations);
};

/**
 * Helper for creating touch feedback for touchable components
 *
 * @param scaleValue Animated.Value for scale transform
 * @returns Object with onPressIn and onPressOut handlers
 */
export const createTouchFeedback = (scaleValue: Animated.Value) => {
  return {
    onPressIn: () => {
      createTimingAnimation(
        scaleValue,
        presets.buttonPress.to,
        presets.buttonPress.duration as number,
        easing.easeOut
      ).start();
    },
    onPressOut: () => {
      createTimingAnimation(
        scaleValue,
        presets.buttonRelease.to,
        presets.buttonRelease.duration as number,
        easing.easeOut
      ).start();
    },
  };
};
