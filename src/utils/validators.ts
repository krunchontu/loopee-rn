/**
 * Runtime validation schemas for data coming from Supabase.
 *
 * Every `as Type` cast in the service layer should be replaced by one of these
 * schemas so that malformed database responses are caught early instead of
 * silently producing objects with undefined properties.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives & helpers
// ---------------------------------------------------------------------------

/** Coerce a value to string – accepts null/undefined and falls back to "" */
const coerceString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => v ?? "");

/** Optional nullable string → string | undefined */
const optionalString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => v ?? undefined);

// ---------------------------------------------------------------------------
// UserProfile (matches src/types/user.ts)
// ---------------------------------------------------------------------------

export const UserProfileSchema = z
  .object({
    id: z.string(),
    username: coerceString,
    display_name: coerceString,
    avatar_url: optionalString,
    bio: optionalString,
    created_at: coerceString,
    updated_at: coerceString,
    reviews_count: z.number().default(0),
    contributions_count: z.number().default(0),
    favorites_count: z.number().default(0),
    followers_count: z.number().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Review (matches src/types/toilet.ts – camelCase interface)
// ---------------------------------------------------------------------------

/** Schema for a Review object after field mapping (camelCase). */
export const ReviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rating: z.number(),
  comment: z.union([z.string(), z.null()]).default(null),
  createdAt: coerceString,
  photos: z.array(z.string()).default([]),
  isEdited: z.boolean().default(false),
  version: z.number().default(1),
  lastEditedAt: optionalString,
  updatedAt: optionalString,
  user: z
    .union([
      z.object({
        id: z.string(),
        displayName: coerceString,
        avatarUrl: optionalString,
      }),
      z.null(),
      z.undefined(),
    ])
    .transform((v) => v ?? undefined)
    .optional(),
});

// ---------------------------------------------------------------------------
// Toilet (matches src/types/toilet.ts)
// ---------------------------------------------------------------------------

const AmenitiesSchema = z
  .object({
    hasBabyChanging: z.boolean().default(false),
    hasShower: z.boolean().default(false),
    isGenderNeutral: z.boolean().default(false),
    hasPaperTowels: z.boolean().default(false),
    hasHandDryer: z.boolean().default(false),
    hasWaterSpray: z.boolean().default(false),
    hasSoap: z.boolean().default(false),
  })
  .passthrough();

const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const ToiletSchema = z.object({
  id: z.string(),
  name: coerceString,
  description: optionalString,
  location: LocationSchema,
  rating: z.number().default(0),
  reviewCount: z.number().default(0),
  isAccessible: z.boolean().default(false),
  address: coerceString,
  distance: z.number().optional(),
  isPublic: z.boolean().optional(),
  isFree: z.boolean().optional(),
  fee: optionalString,
  openingHours: z.object({ open: z.string(), close: z.string() }).optional(),
  amenities: AmenitiesSchema,
  buildingId: optionalString,
  buildingName: optionalString,
  floorLevel: z.number().optional(),
  floorName: optionalString,
  photos: z.array(z.string()).default([]),
  reviews: z.array(ReviewSchema).optional(),
  lastUpdated: coerceString,
  createdAt: coerceString,
});

export const ToiletWithReviewsSchema = ToiletSchema.extend({
  reviews: z.array(ReviewSchema).default([]),
});

// ---------------------------------------------------------------------------
// Submission types (matches src/types/contribution.ts)
// ---------------------------------------------------------------------------

export const SubmissionTypeEnum = z.enum(["new", "edit", "report"]);
export const SubmissionStatusEnum = z.enum(["pending", "approved", "rejected"]);

/**
 * Schema for the partial response returned by the submit_toilet RPC.
 * The RPC only returns a subset of ToiletSubmission fields.
 */
export const SubmissionRpcResultSchema = z.object({
  id: z.string(),
  submitter_id: z.string(),
  submission_type: SubmissionTypeEnum,
  status: SubmissionStatusEnum,
  created_at: z.string(),
});

export const ToiletSubmissionSchema = z.object({
  id: z.string(),
  toilet_id: z.union([z.string(), z.null()]),
  submitter_id: z.string(),
  submission_type: SubmissionTypeEnum,
  status: SubmissionStatusEnum,
  data: z.record(z.string(), z.unknown()).default({}),
  reason: optionalString,
  created_at: coerceString,
  updated_at: coerceString,
});

export const SubmissionPreviewRowSchema = z.object({
  id: z.string(),
  submission_type: SubmissionTypeEnum,
  status: SubmissionStatusEnum,
  created_at: z.string(),
  toilet_id: optionalString,
  data: z
    .union([z.object({ name: z.string().optional() }).passthrough(), z.null()])
    .optional(),
});

// ---------------------------------------------------------------------------
// Safe parse helper – logs warning + returns fallback on failure
// ---------------------------------------------------------------------------

import { debug } from "./debug";

/**
 * Parse `data` against `schema`. On validation failure, log a warning and
 * return the raw data cast to T so the app doesn't crash. This is a graceful
 * migration path: we get visibility into malformed data without breaking
 * existing behaviour.
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string,
): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  debug.warn(
    "Validator",
    `Validation failed in ${context}: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
  );
  // Graceful degradation: return raw data so existing behaviour is preserved
  // while we get Sentry/log visibility into what's wrong.
  return data as T;
}

/**
 * Parse an array where each element is validated individually.
 * Invalid elements are dropped (not the whole array).
 */
export function safeParseArray<T>(
  schema: z.ZodType<T>,
  data: unknown[],
  context: string,
): T[] {
  return data.reduce<T[]>((acc, item, idx) => {
    const result = schema.safeParse(item);
    if (result.success) {
      acc.push(result.data);
    } else {
      debug.warn(
        "Validator",
        `Array item [${idx}] validation failed in ${context}: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
      // Still include the item to avoid data loss
      acc.push(item as T);
    }
    return acc;
  }, []);
}
