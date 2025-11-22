/**
 * @file React Native specific helpers for the design system
 *
 * This file provides utilities specifically adapted for React Native
 * that handle proper typing and ensure compatibility with React Native's
 * style system.
 */

import type { ViewStyle, TextStyle } from "react-native";

import {
  createComponentStyle as baseCreateComponentStyle,
  createTextStyle as baseCreateTextStyle,
} from "./index";

/**
 * Type-safe version of createComponentStyle for React Native
 * This ensures the returned style object is properly typed for React Native
 */
export const createComponentStyle = (
  options: Parameters<typeof baseCreateComponentStyle>[0]
): ViewStyle => {
  return baseCreateComponentStyle(options) as unknown as ViewStyle;
};

/**
 * Type-safe version of createTextStyle for React Native
 * This ensures the returned style object is properly typed for React Native
 */
export const createTextStyle = (
  variant: Parameters<typeof baseCreateTextStyle>[0],
  overrides?: Parameters<typeof baseCreateTextStyle>[1]
): TextStyle => {
  return baseCreateTextStyle(variant, overrides) as unknown as TextStyle;
};
