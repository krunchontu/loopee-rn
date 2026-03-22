/**
 * @file Submission Validation
 *
 * Input validation and sanitization for toilet submissions.
 * Enforces string length limits, coordinate ranges, array bounds,
 * and whitelists known amenity keys.
 */

import type { Toilet } from "../../types/toilet";

// ── Constants ───────────────────────────────────────────────────────────────

/** Maximum allowed lengths for text fields */
export const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 255,
  ADDRESS_MAX_LENGTH: 500,
  BUILDING_NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 2000,
  FEE_MAX_LENGTH: 100,
  FLOOR_NAME_MAX_LENGTH: 100,
  FLOOR_LEVEL_MIN: -10,
  FLOOR_LEVEL_MAX: 200,
  PHOTOS_MAX_COUNT: 5,
  PHOTO_URI_MAX_LENGTH: 2048,
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180,
} as const;

/**
 * Maximum number of recent submissions to track in memory.
 * Each entry is ~200 bytes (hash key + timestamp + ID), so 100 entries ≈ 20KB.
 */
export const MAX_RECENT_SUBMISSIONS = 100;

/**
 * Known amenity keys — any other keys are stripped.
 */
const VALID_AMENITY_KEYS = new Set([
  "hasBabyChanging",
  "hasShower",
  "isGenderNeutral",
  "hasPaperTowels",
  "hasHandDryer",
  "hasWaterSpray",
  "hasSoap",
]);

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates and sanitizes toilet submission data before it reaches the database.
 * Strips unknown fields, enforces string length limits, coordinate ranges, and array bounds.
 *
 * @param data Raw toilet data from the form
 * @returns Sanitized Partial<Toilet> safe for submission
 * @throws Error with a user-friendly message if required fields are invalid
 */
export function validateToiletSubmission(
  data: Partial<Toilet>,
): Partial<Toilet> {
  const errors: string[] = [];

  // ── Required: name ──────────────────────────────────────────────────────
  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.push("Name is required");
  }
  const name =
    typeof data.name === "string"
      ? data.name.trim().slice(0, VALIDATION_LIMITS.NAME_MAX_LENGTH)
      : undefined;

  // ── Required: location ──────────────────────────────────────────────────
  if (!data.location || typeof data.location !== "object") {
    errors.push("Location is required");
  } else {
    const { latitude, longitude } = data.location;
    if (typeof latitude !== "number" || !Number.isFinite(latitude)) {
      errors.push("Latitude must be a valid number");
    } else if (
      latitude < VALIDATION_LIMITS.LATITUDE_MIN ||
      latitude > VALIDATION_LIMITS.LATITUDE_MAX
    ) {
      errors.push(
        `Latitude must be between ${VALIDATION_LIMITS.LATITUDE_MIN} and ${VALIDATION_LIMITS.LATITUDE_MAX}`,
      );
    }
    if (typeof longitude !== "number" || !Number.isFinite(longitude)) {
      errors.push("Longitude must be a valid number");
    } else if (
      longitude < VALIDATION_LIMITS.LONGITUDE_MIN ||
      longitude > VALIDATION_LIMITS.LONGITUDE_MAX
    ) {
      errors.push(
        `Longitude must be between ${VALIDATION_LIMITS.LONGITUDE_MIN} and ${VALIDATION_LIMITS.LONGITUDE_MAX}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid submission: ${errors.join("; ")}`);
  }

  // ── Build sanitized object (whitelist approach) ─────────────────────────
  const sanitized: Partial<Toilet> = {
    name: name!,
    location: {
      latitude: data.location!.latitude,
      longitude: data.location!.longitude,
    },
  };

  // Optional string fields — truncate, never crash
  if (typeof data.address === "string") {
    sanitized.address = data.address
      .trim()
      .slice(0, VALIDATION_LIMITS.ADDRESS_MAX_LENGTH);
  }
  if (typeof data.buildingName === "string") {
    sanitized.buildingName = data.buildingName
      .trim()
      .slice(0, VALIDATION_LIMITS.BUILDING_NAME_MAX_LENGTH);
  }
  if (typeof data.description === "string") {
    sanitized.description = data.description
      .trim()
      .slice(0, VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH);
  }
  if (typeof data.fee === "string") {
    sanitized.fee = data.fee.trim().slice(0, VALIDATION_LIMITS.FEE_MAX_LENGTH);
  }
  if (typeof data.floorName === "string") {
    sanitized.floorName = data.floorName
      .trim()
      .slice(0, VALIDATION_LIMITS.FLOOR_NAME_MAX_LENGTH);
  }

  // Optional numeric fields — range check
  if (data.floorLevel != null) {
    const fl = Number(data.floorLevel);
    if (
      Number.isFinite(fl) &&
      fl >= VALIDATION_LIMITS.FLOOR_LEVEL_MIN &&
      fl <= VALIDATION_LIMITS.FLOOR_LEVEL_MAX
    ) {
      sanitized.floorLevel = Math.round(fl);
    }
    // silently drop if out of range — not worth blocking submission
  }

  // Boolean fields
  if (typeof data.isAccessible === "boolean")
    sanitized.isAccessible = data.isAccessible;
  if (typeof data.isPublic === "boolean") sanitized.isPublic = data.isPublic;
  if (typeof data.isFree === "boolean") sanitized.isFree = data.isFree;

  // Opening hours — simple structural check
  if (data.openingHours && typeof data.openingHours === "object") {
    const { open, close } = data.openingHours;
    if (typeof open === "string" && typeof close === "string") {
      sanitized.openingHours = {
        open: open.slice(0, 10),
        close: close.slice(0, 10),
      };
    }
  }

  // Amenities — whitelist known boolean keys only
  if (data.amenities && typeof data.amenities === "object") {
    const cleanAmenities: Record<string, boolean> = {};
    for (const key of VALID_AMENITY_KEYS) {
      const val = (data.amenities as Record<string, unknown>)[key];
      cleanAmenities[key] = val === true;
    }
    sanitized.amenities = cleanAmenities as Toilet["amenities"];
  }

  // Photos — cap count, validate each URI is a string within length limit
  if (Array.isArray(data.photos)) {
    sanitized.photos = data.photos
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .slice(0, VALIDATION_LIMITS.PHOTOS_MAX_COUNT)
      .map((uri) => uri.slice(0, VALIDATION_LIMITS.PHOTO_URI_MAX_LENGTH));
  }

  // Building ID — UUID-like check
  if (
    typeof data.buildingId === "string" &&
    /^[0-9a-f-]{36}$/i.test(data.buildingId)
  ) {
    sanitized.buildingId = data.buildingId;
  }

  return sanitized;
}
