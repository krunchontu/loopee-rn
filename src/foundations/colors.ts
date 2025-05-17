/**
 * @file Color system for Loopee app
 *
 * This file defines a comprehensive color system that includes:
 * - Base palette: The core colors in different shade variations
 * - Semantic colors: Purpose-driven colors for specific UI scenarios
 * - Theming support: Colors that adapt to light/dark modes
 */

// Opacity levels for consistent transparency
export const opacity = {
  0: 0,
  25: 0.25,
  40: 0.4,
  50: 0.5,
  75: 0.75,
  90: 0.9,
  95: 0.95,
  100: 1,
} as const;

// Base palette with variations (expanded from original colors)
export const palette = {
  // Primary brand colors
  purple: {
    50: "#EDE9F6",
    100: "#D6CCEC",
    200: "#B29AD9",
    300: "#906BC7",
    400: "#6B46C1", // Original primary
    500: "#5A39A7",
    600: "#4A2D89",
    700: "#3A226A",
    800: "#29184C",
    900: "#190D2E",
  },

  // Secondary brand colors
  teal: {
    50: "#E6F6F6",
    100: "#C3ECEA",
    200: "#8BD9D6",
    300: "#62CCC7",
    400: "#38B2AC", // Original secondary
    500: "#2D9A94",
    600: "#237F7A",
    700: "#19615D",
    800: "#0F4441",
    900: "#052725",
  },

  // Neutrals for backgrounds, text, borders
  gray: {
    50: "#F7FAFC", // Original background.secondary
    100: "#EDF2F7",
    200: "#E2E8F0", // Original border.light
    300: "#CBD5E0", // Original border.medium
    400: "#A0AEC0", // Original border.dark, text.light
    500: "#718096",
    600: "#4A5568", // Original text.secondary
    700: "#2D3748",
    800: "#1A202C", // Original text.primary
    900: "#171923",
  },

  // Status colors
  green: {
    100: "#C6F6D5",
    300: "#9AE6B4",
    400: "#68D391", // Added for gradient compatibility
    500: "#48BB78", // Original status.success
    600: "#38A169", // Added for gradient compatibility
    700: "#276749",
    900: "#1C4532",
  },

  red: {
    100: "#FED7D7",
    300: "#FC8181",
    400: "#F56565", // Added for gradient compatibility
    500: "#E53E3E", // Original status.error
    600: "#C53030", // Added for gradient compatibility
    700: "#9B2C2C",
    900: "#63171B",
  },

  yellow: {
    100: "#FEFCBF",
    300: "#F6E05E", // Original rating.filled
    400: "#ECC94B", // Added for gradient compatibility
    500: "#ECC94B", // Original status.warning
    600: "#D69E2E", // Added for gradient compatibility
    700: "#B7791F",
    900: "#744210",
  },

  blue: {
    100: "#BEE3F8",
    300: "#90CDF4",
    400: "#63B3ED", // Added for gradient compatibility
    500: "#4299E1", // Original status.info
    600: "#3182CE", // Added for gradient compatibility
    700: "#2B6CB0",
    900: "#1A365D",
  },

  // Base colors
  white: "#FFFFFF", // Original background.primary
  black: "#000000",
  transparent: "transparent",
} as const;

// Theme-aware semantic color system
export const colors = {
  // Brand colors - Core identity colors
  brand: {
    primary: palette.purple[400],
    secondary: palette.teal[400],
    tertiary: palette.blue[500],
  },

  // UI colors - For application interface elements
  ui: {
    focus: palette.blue[500],
    border: palette.gray[200],
    divider: palette.gray[200],
  },

  // Background colors - Surface colors for different levels
  background: {
    primary: palette.white,
    secondary: palette.gray[50],
    tertiary: palette.gray[100],
    inverse: palette.gray[800],
    branded: palette.purple[50],
    overlay: `rgba(0, 0, 0, ${opacity[50]})`,
  },

  // Text colors - For typography at various emphasis levels
  text: {
    primary: palette.gray[800],
    secondary: palette.gray[600],
    tertiary: palette.gray[400],
    inverse: palette.white,
    link: palette.purple[500],
    linkHover: palette.purple[600],
    branded: palette.purple[500],
  },

  // Interactive element colors
  interactive: {
    primary: {
      default: palette.purple[400],
      hover: palette.purple[500],
      active: palette.purple[600],
      disabled: palette.gray[300],
    },
    secondary: {
      default: palette.teal[400],
      hover: palette.teal[500],
      active: palette.teal[600],
      disabled: palette.gray[300],
    },
    tertiary: {
      default: palette.blue[500],
      hover: palette.blue[600],
      active: palette.blue[700],
      disabled: palette.gray[300],
    },
  },

  // Status/feedback colors
  status: {
    success: {
      background: palette.green[100],
      foreground: palette.green[500],
      border: palette.green[300],
    },
    error: {
      background: palette.red[100],
      foreground: palette.red[500],
      border: palette.red[300],
    },
    warning: {
      background: palette.yellow[100],
      foreground: palette.yellow[500],
      border: palette.yellow[300],
    },
    info: {
      background: palette.blue[100],
      foreground: palette.blue[500],
      border: palette.blue[300],
    },
  },

  // Component specific colors
  rating: {
    filled: palette.yellow[300],
    empty: palette.gray[100],
  },

  // Special areas
  navigation: {
    background: palette.purple[400],
    text: palette.white,
    activeBackground: palette.purple[500],
    activeText: palette.white,
    border: palette.purple[300],
  },

  // Backward compatibility with original color system
  // These are included to prevent breaking changes during migration
  primary: palette.purple[400],
  secondary: palette.teal[400],
  border: {
    light: palette.gray[200],
    medium: palette.gray[300],
    dark: palette.gray[400],
  },
} as const;

// Gradients for visual interest
export const gradients = {
  primary: `linear-gradient(135deg, ${palette.purple[400]}, ${palette.purple[600]})`,
  secondary: `linear-gradient(135deg, ${palette.teal[400]}, ${palette.teal[600]})`,
  success: `linear-gradient(135deg, ${palette.green[400]}, ${palette.green[600]})`,
  warning: `linear-gradient(135deg, ${palette.yellow[400]}, ${palette.yellow[600]})`,
  error: `linear-gradient(135deg, ${palette.red[400]}, ${palette.red[600]})`,
  info: `linear-gradient(135deg, ${palette.blue[400]}, ${palette.blue[600]})`,
  cool: `linear-gradient(135deg, ${palette.blue[400]}, ${palette.teal[400]})`,
  warm: `linear-gradient(135deg, ${palette.yellow[400]}, ${palette.red[400]})`,
  gray: `linear-gradient(135deg, ${palette.gray[200]}, ${palette.gray[400]})`,
} as const;
