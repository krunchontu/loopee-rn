/**
 * @file React Native Paper theme configuration
 *
 * Configures the React Native Paper theming system to match
 * the app's existing design language. This ensures consistency
 * between Paper components and custom components.
 */

import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

import { colors, palette } from "./colors";

/**
 * Custom light theme for React Native Paper
 * Extends the Material Design 3 light theme with app-specific colors
 */
export const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.interactive.primary.default,
    onPrimary: colors.background.primary,
    primaryContainer: palette.purple[100],
    onPrimaryContainer: palette.purple[900],
    secondary: colors.interactive.secondary.default,
    onSecondary: colors.background.primary,
    secondaryContainer: palette.teal[100],
    onSecondaryContainer: palette.teal[900],
    tertiary: colors.interactive.tertiary.default,
    background: colors.background.primary,
    onBackground: colors.text.primary,
    surface: colors.background.primary,
    onSurface: colors.text.primary,
    surfaceVariant: colors.background.secondary,
    onSurfaceVariant: colors.text.secondary,
    error: colors.status.error.foreground,
    outline: colors.border.medium,
  },
};

/**
 * Custom dark theme for React Native Paper
 * Extends the Material Design 3 dark theme with app-specific colors
 */
export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.interactive.primary.default,
    onPrimary: colors.text.inverse,
    primaryContainer: palette.purple[800],
    onPrimaryContainer: palette.purple[50],
    secondary: colors.interactive.secondary.default,
    onSecondary: colors.text.inverse,
    secondaryContainer: palette.teal[800],
    onSecondaryContainer: palette.teal[50],
    tertiary: colors.interactive.tertiary.default,
    background: colors.background.inverse,
    onBackground: colors.text.inverse,
    surface: colors.background.inverse,
    onSurface: colors.text.inverse,
    surfaceVariant: palette.gray[700],
    onSurfaceVariant: colors.text.secondary,
    error: colors.status.error.foreground,
    outline: colors.border.medium,
  },
};

/**
 * Get the appropriate theme based on dark mode setting
 * @param isDark Whether to use dark theme
 * @returns The appropriate Paper theme
 */
export function getPaperTheme(isDark: boolean) {
  return isDark ? paperDarkTheme : paperLightTheme;
}
