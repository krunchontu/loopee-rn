/**
 * Toilet Data Utilities
 *
 * Utility functions for standardizing toilet data access and handling.
 * Ensures consistent access to properties regardless of data source or naming conventions.
 */

import type { Toilet } from "../types/toilet";

/**
 * Normalizes toilet amenities regardless of property naming convention.
 * Handles both camelCase and hasPrefix formats.
 *
 * This utility solves the inconsistency between different data sources:
 * - Pre-generated toilets may use: babyChanging, shower, handDryer, etc.
 * - Submitted toilets use: hasBabyChanging, hasShower, hasHandDryer, etc.
 *
 * @param amenities The amenities object from a toilet record
 * @returns Normalized amenities with consistent property access
 */
export const normalizeAmenities = (amenities: any = {}) => {
  if (!amenities)
    return {
      hasBabyChanging: false,
      hasShower: false,
      isGenderNeutral: false,
      hasPaperTowels: false,
      hasHandDryer: false,
      hasWaterSpray: false,
      hasSoap: false,
    };

  return {
    hasBabyChanging: !!amenities.hasBabyChanging || !!amenities.babyChanging,
    hasShower: !!amenities.hasShower || !!amenities.shower,
    isGenderNeutral: !!amenities.isGenderNeutral || !!amenities.genderNeutral,
    hasPaperTowels: !!amenities.hasPaperTowels || !!amenities.paperTowels,
    hasHandDryer: !!amenities.hasHandDryer || !!amenities.handDryer,
    hasWaterSpray: !!amenities.hasWaterSpray || !!amenities.waterSpray,
    hasSoap: !!amenities.hasSoap || !!amenities.soap,
  };
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
      typeof toilet.rating === "string" ?
        parseFloat(toilet.rating)
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
