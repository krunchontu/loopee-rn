/**
 * @file Design system foundation exports
 *
 * This file serves as the main entry point for all design tokens and foundational elements.
 * Import from this file rather than individual token files for cleaner imports.
 *
 * Example usage:
 * import { colors, spacing, textVariants } from '../foundations';
 */

// Re-export all design token categories
export * from "./colors";
export * from "./typography";
export * from "./layout";
export * from "./animations";

// Export combined token object for easier theme access
import * as colorTokens from "./colors";
import * as typographyTokens from "./typography";
import * as layoutTokens from "./layout";
import * as animationTokens from "./animations";

/**
 * Combined design tokens for easier theme access
 */
export const designTokens = {
  colors: colorTokens,
  typography: typographyTokens,
  layout: layoutTokens,
  animations: animationTokens,
};

/**
 * Helper function to create consistent component styles
 *
 * @param options Configuration options for the component style
 * @returns Style object with consistent properties
 *
 * @example
 * // Create a card style
 * const cardStyle = createComponentStyle({
 *   backgroundColor: colors.background.primary,
 *   shadow: 'md',
 *   radius: 'card',
 *   padding: spacing.md,
 * });
 */
export const createComponentStyle = (options: {
  // Visual properties
  backgroundColor?: string;
  shadow?: keyof typeof layoutTokens.shadows;
  radius?: keyof typeof layoutTokens.borderRadius | number;
  padding?: number | { horizontal?: number; vertical?: number };
  margin?: number | { horizontal?: number; vertical?: number };
  border?: {
    width?: keyof typeof layoutTokens.borders.width | number;
    color?: string;
    style?: keyof typeof layoutTokens.borders.style;
  };
  // Layout properties
  width?: number | string;
  height?: number | string;
  zIndex?: keyof typeof layoutTokens.zIndex | number;
  // Additional custom styles
  [key: string]: any;
}) => {
  const {
    backgroundColor,
    shadow = "none",
    radius = "none",
    padding,
    margin,
    border,
    width,
    height,
    zIndex,
    ...customStyles
  } = options;

  // Process padding
  let paddingStyle = {};
  if (typeof padding === "number") {
    paddingStyle = { padding };
  } else if (padding) {
    if (padding.horizontal)
      paddingStyle = { ...paddingStyle, paddingHorizontal: padding.horizontal };
    if (padding.vertical)
      paddingStyle = { ...paddingStyle, paddingVertical: padding.vertical };
  }

  // Process margin
  let marginStyle = {};
  if (typeof margin === "number") {
    marginStyle = { margin };
  } else if (margin) {
    if (margin.horizontal)
      marginStyle = { ...marginStyle, marginHorizontal: margin.horizontal };
    if (margin.vertical)
      marginStyle = { ...marginStyle, marginVertical: margin.vertical };
  }

  // Process border
  let borderStyle = {};
  if (border) {
    const borderWidth =
      typeof border.width === "string" ?
        layoutTokens.borders.width[
          border.width as keyof typeof layoutTokens.borders.width
        ]
      : border.width;

    borderStyle = {
      borderWidth: borderWidth || layoutTokens.borders.width.thin,
      borderColor: border.color || colorTokens.colors.border.light,
      borderStyle:
        border.style ?
          layoutTokens.borders.style[border.style]
        : layoutTokens.borders.style.solid,
    };
  }

  // Process z-index
  const zIndexValue =
    typeof zIndex === "string" ?
      layoutTokens.zIndex[zIndex as keyof typeof layoutTokens.zIndex]
    : zIndex;

  return {
    backgroundColor,
    width,
    height,
    zIndex: zIndexValue,
    ...layoutTokens.createLayoutStyle({
      shadow,
      radius: typeof radius === "string" ? radius : undefined,
    }),
    ...(typeof radius === "number" ? { borderRadius: radius } : {}),
    ...paddingStyle,
    ...marginStyle,
    ...borderStyle,
    ...customStyles,
  };
};
