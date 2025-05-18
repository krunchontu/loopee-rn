/**
 * @file Responsive layout utilities and hooks
 * Provides responsive design tools including:
 * - Screen size detection
 * - Orientation handling
 * - Device type detection
 * - Dynamic scaling
 */

import { useEffect, useState } from "react";
import { Dimensions, ScaledSize, Platform } from "react-native";
import { breakpoints } from "./layout";

// Types
export interface ResponsiveInfo {
  // Screen dimensions
  width: number;
  height: number;

  // Device type
  isSmallPhone: boolean; // < 375px
  isMediumPhone: boolean; // 375-428px
  isLargePhone: boolean; // 428-768px
  isTablet: boolean; // >= 768px

  // Orientation
  isLandscape: boolean;

  // Platform specific
  isAndroid: boolean;
  isIOS: boolean;

  // Scaling factors
  scale: number;
  fontScale: number;
}

/**
 * Hook to get responsive layout information
 * Updates automatically on dimension changes
 */
export function useResponsiveLayout(): ResponsiveInfo {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);

    return () => {
      if (typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, []);

  const { width, height, scale, fontScale } = dimensions;

  return {
    // Raw dimensions
    width,
    height,

    // Device type checks
    isSmallPhone: width < breakpoints.sm,
    isMediumPhone: width >= breakpoints.sm && width < breakpoints.md,
    isLargePhone: width >= breakpoints.md && width < breakpoints.lg,
    isTablet: width >= breakpoints.lg,

    // Orientation
    isLandscape: width > height,

    // Platform
    isAndroid: Platform.OS === "android",
    isIOS: Platform.OS === "ios",

    // Scaling
    scale,
    fontScale,
  };
}

/**
 * Calculate responsive value based on screen size
 * @param dimension Screen width or height
 * @param small Value for small screens
 * @param medium Value for medium screens
 * @param large Value for large screens
 * @param tablet Value for tablets
 */
export function getResponsiveValue<T>(
  dimension: number,
  small: T,
  medium: T,
  large: T,
  tablet: T
): T {
  if (dimension >= breakpoints.lg) return tablet;
  if (dimension >= breakpoints.md) return large;
  if (dimension >= breakpoints.sm) return medium;
  return small;
}

/**
 * Calculate responsive spacing
 * @param baseSize Base spacing value
 * @param dimension Screen dimension to check against
 */
export function getResponsiveSpacing(
  baseSize: number,
  dimension: number
): number {
  return getResponsiveValue(
    dimension,
    baseSize * 0.8, // Smaller for tiny screens
    baseSize, // Base size for normal phones
    baseSize * 1.1, // Slightly larger for big phones
    baseSize * 1.25 // Much larger for tablets
  );
}

/**
 * Calculate responsive font size
 * @param baseSize Base font size
 * @param dimension Screen dimension to check against
 */
export function getResponsiveFontSize(
  baseSize: number,
  dimension: number
): number {
  return getResponsiveValue(
    dimension,
    baseSize * 0.9, // Slightly smaller for tiny screens
    baseSize, // Base size for normal phones
    baseSize * 1.1, // Slightly larger for big phones
    baseSize * 1.2 // Larger for tablets
  );
}
