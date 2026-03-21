/**
 * Toilet Data Utilities
 *
 * Utility functions for standardizing toilet data access and handling.
 * Ensures consistent access to properties regardless of data source or naming conventions.
 */

import type { Toilet } from "../types/toilet";

/**
 * The canonical default amenities object with all keys set to false.
 * Used as the fallback when amenities are missing or null.
 */
export const DEFAULT_AMENITIES: Toilet["amenities"] = {
  hasBabyChanging: false,
  hasShower: false,
  isGenderNeutral: false,
  hasPaperTowels: false,
  hasHandDryer: false,
  hasWaterSpray: false,
  hasSoap: false,
};

/**
 * Map from legacy un-prefixed amenity keys to their canonical prefixed equivalents.
 * Used during normalization to convert old-format DB data.
 */
const LEGACY_KEY_MAP: Record<string, keyof Toilet["amenities"]> = {
  babyChanging: "hasBabyChanging",
  shower: "hasShower",
  genderNeutral: "isGenderNeutral",
  paperTowels: "hasPaperTowels",
  handDryer: "hasHandDryer",
  waterSpray: "hasWaterSpray",
  soap: "hasSoap",
};

/**
 * Input type for raw amenities from the database or API.
 * Accepts both legacy (un-prefixed) and canonical (prefixed) keys.
 */
type RawAmenities = Partial<Toilet["amenities"]> & Record<string, unknown>;

/**
 * Normalizes toilet amenities regardless of property naming convention.
 * Handles both legacy un-prefixed (babyChanging) and canonical prefixed (hasBabyChanging) formats.
 *
 * Once all legacy data has been migrated (migration 20250533 + trigger 20250536),
 * the legacy fallback paths can be removed.
 *
 * @param amenities The amenities object from a toilet record (may be in any format)
 * @returns Normalized amenities with all 7 canonical keys as booleans
 */
export const normalizeAmenities = (
  amenities: RawAmenities | null | undefined = {},
): Toilet["amenities"] => {
  if (!amenities) {
    return { ...DEFAULT_AMENITIES };
  }

  const result = { ...DEFAULT_AMENITIES };

  // Apply canonical (prefixed) keys
  for (const key of Object.keys(DEFAULT_AMENITIES) as Array<
    keyof Toilet["amenities"]
  >) {
    if (key in amenities) {
      result[key] = !!(amenities as Record<string, unknown>)[key];
    }
  }

  // Apply legacy (un-prefixed) keys as fallback — only if canonical key wasn't already true
  for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_KEY_MAP)) {
    if (legacyKey in amenities && !result[canonicalKey]) {
      result[canonicalKey] = !!(amenities as Record<string, unknown>)[
        legacyKey
      ];
    }
  }

  return result;
};

/**
 * Normalizes toilet building and floor information with fallbacks for missing values
 *
 * @param toilet Toilet object or raw database result to normalize
 * @returns Object with normalized building and floor info
 */
export const normalizeBuildingInfo = (toilet: any) => {
  return {
    buildingName:
      toilet.buildingName || toilet.building_name || "Public Facility",
    floorLevel: toilet.floorLevel || toilet.floor_level || 1,
    floorName:
      toilet.floorName ||
      toilet.floor_name ||
      `Level ${toilet.floorLevel || toilet.floor_level || 1}`,
  };
};

/**
 * Comprehensive toilet data normalization that handles all potential inconsistencies
 *
 * @param toilet Raw toilet data from any source
 * @returns Fully normalized toilet object with consistent property access
 */
export const normalizeToiletData = (toilet: any): Toilet => {
  if (!toilet) {
    throw new Error("Cannot normalize null or undefined toilet data");
  }

  // Extract core properties with fallbacks
  const normalizedAmenities = normalizeAmenities(toilet.amenities);
  const { buildingName, floorLevel, floorName } = normalizeBuildingInfo(toilet);

  // Return a fully normalized toilet object
  return {
    id: toilet.id,
    name: toilet.name,
    description: toilet.description || toilet.name,
    location: toilet.location,
    rating:
      typeof toilet.rating === "string"
        ? parseFloat(toilet.rating)
        : toilet.rating || 0,
    reviewCount: toilet.reviewCount || 0,
    isAccessible: !!toilet.isAccessible || !!toilet.is_accessible,
    address: toilet.address || `${toilet.name}, Singapore`,
    distance: toilet.distance,
    buildingId: toilet.buildingId || toilet.building_id,
    buildingName,
    floorLevel,
    floorName,
    amenities: normalizedAmenities,
    photos: toilet.photos || [],
    lastUpdated:
      toilet.lastUpdated || toilet.updated_at || new Date().toISOString(),
    createdAt:
      toilet.createdAt || toilet.created_at || new Date().toISOString(),
  };
};
