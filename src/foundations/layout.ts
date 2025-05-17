/**
 * @file Layout system for Loopee app
 *
 * This file defines layout-related design tokens including:
 * - Spacing values
 * - Border radius
 * - Shadows and elevation
 * - Screen breakpoints
 *
 * Note: Z-index values have been moved to a dedicated zIndex.ts file
 */

// Spacing values (in pixels)
export const spacing = {
  // Base spacing units
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic spacing
  screenEdge: 16, // Standard padding from screen edge
  contentGutter: 24, // Space between major content blocks
  itemSpacing: 8, // Space between items in a list
  sectionSpacing: 32, // Space between sections

  // Component-specific spacing
  buttonPadding: {
    horizontal: 16,
    vertical: 12,
  },
  cardPadding: 16,
  inputPadding: {
    horizontal: 12,
    vertical: 10,
  },
} as const;

// Border radius values
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 9999,

  // Semantic border radius
  button: 8,
  card: 12,
  input: 6,
  bottomSheet: 16,
  modal: 12,
  tooltip: 6,
} as const;

// Borders
export const borders = {
  width: {
    thin: 1,
    medium: 2,
    thick: 3,
  },
  style: {
    solid: "solid" as const,
    dashed: "dashed" as const,
    dotted: "dotted" as const,
  },
} as const;

// Shadows (for iOS) - values follow design token patterns
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
} as const;

// Elevation (for Android)
export const elevation = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 16,
  xxl: 24,
} as const;

// Screen breakpoints (for responsive design)
export const breakpoints = {
  xs: 320, // Small phones
  sm: 375, // iPhone X and similar
  md: 428, // iPhone 12 Pro Max and similar
  lg: 768, // Tablets (portrait)
  xl: 1024, // Tablets (landscape)
  xxl: 1280, // Larger tablets and small desktops
} as const;

// Helper to create consistent shadow objects for both platforms
export const createShadow = (level: keyof typeof shadows) => {
  const shadowObj = shadows[level];

  return {
    // iOS shadow properties
    ...shadowObj,
    // Android elevation
    elevation: elevation[level],
  };
};

// Helper to combine styles for components
export const createLayoutStyle = ({
  shadow = "none",
  radius = "none",
  ...otherStyles
} = {}) => {
  return {
    borderRadius:
      typeof radius === "string" ?
        borderRadius[radius as keyof typeof borderRadius]
      : radius,
    ...createShadow(shadow as keyof typeof shadows),
    ...otherStyles,
  };
};
