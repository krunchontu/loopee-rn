/**
 * Default location constants.
 *
 * The app is focused on Singapore. These defaults are used as fallbacks when
 * the user's real location is unavailable (no permission, GPS timeout, etc.).
 * Centralised here so a single change updates every map view, list screen,
 * and contribution form.
 */

/** Singapore city-centre coordinates */
export const DEFAULT_LOCATION = {
  latitude: 1.3521,
  longitude: 103.8198,
} as const;

/** Default map region — centres on Singapore with a reasonable zoom level */
export const DEFAULT_MAP_REGION = {
  ...DEFAULT_LOCATION,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
} as const;
