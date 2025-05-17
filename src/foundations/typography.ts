/**
 * @file Typography system for Loopee app
 *
 * Defines a comprehensive typography system including:
 * - Font families
 * - Font sizes
 * - Font weights
 * - Line heights
 * - Letter spacing
 * - Text styles with semantic meanings
 */

// Font families
export const fontFamilies = {
  // System fonts provide the best performance and native experience
  // These fonts automatically adapt to the user's system settings
  // Use a custom font as needed but be aware of the performance tradeoffs
  primary: {
    regular: "System",
    medium: "System",
    bold: "System",
  },
  // Alternate family for special cases or headings
  secondary: {
    regular: "System",
    medium: "System",
    bold: "System",
  },
} as const;

// Font sizes (in pixels for React Native)
export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
  giant: 48,
} as const;

// Font weights
export const fontWeights = {
  regular: "400", // normal
  medium: "500", // medium
  semibold: "600", // semi-bold
  bold: "700", // bold
  extrabold: "800", // extra bold
} as const;

// Line heights (multiplier of the font size)
export const lineHeights = {
  tight: 1.2, // Headings
  normal: 1.5, // Body text
  loose: 1.8, // For text that needs more space
} as const;

// Letter spacing
export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
} as const;

// Text variant combinations for different purposes
export const textVariants = {
  // Headings
  h1: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Body text
  bodyLarge: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodyDefault: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Special text styles
  caption: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  button: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  },
  label: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },

  // Navigation text
  navItem: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },

  // Input text
  input: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Error and help text
  error: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Links
  link: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
    textDecorationLine: "underline" as const,
  },
} as const;

// Helper function to create text style objects (for use in StyleSheet)
export const createTextStyle = (
  variant: keyof typeof textVariants,
  overrides = {}
) => {
  return {
    ...textVariants[variant],
    ...overrides,
  };
};
