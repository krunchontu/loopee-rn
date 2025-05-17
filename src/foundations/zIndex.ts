/**
 * Z-index system for consistent layering across the app
 *
 * This system establishes clear stacking contexts to prevent z-index conflicts
 * Higher values will appear above lower values in the visual stack
 */

export const zIndex = {
  // Base layers
  base: 1,
  map: 10,
  mapControls: 50,

  // UI elements
  card: 100,
  header: 200,
  navigationBar: 250,

  // Overlay elements
  overlay: 500,
  tooltip: 600,

  // Modal elements
  modal: 1000,
  bottomSheet: 2000,
  dialog: 3000,
  toast: 4000,

  // System elements (always on top)
  systemNotification: 9000,
  debugOverlay: 9500,
} as const;

/**
 * Utility to get the appropriate elevation based on z-index
 * This helps maintain consistency between z-index and elevation on Android
 */
export function getElevationForZIndex(zIndex: number): number {
  // Map z-index ranges to appropriate elevation values (0-24 in Android)
  if (zIndex < 50) return 1;
  if (zIndex < 100) return 2;
  if (zIndex < 200) return 4;
  if (zIndex < 500) return 6;
  if (zIndex < 1000) return 8;
  if (zIndex < 2000) return 12;
  if (zIndex < 3000) return 16;
  if (zIndex < 4000) return 20;
  return 24; // Maximum elevation
}
