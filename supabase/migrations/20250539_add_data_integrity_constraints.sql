-- Migration: Add CHECK constraints for data integrity
-- Date: 2026-03-22
-- Purpose: Enforce text length limits, array bounds, and numeric ranges at the
--          database level as defense-in-depth behind client-side validation.
--
-- Strategy: Use ADD CONSTRAINT ... NOT VALID to avoid scanning existing rows
-- during constraint creation (instant DDL), then VALIDATE CONSTRAINT separately
-- so existing data is checked without holding an exclusive lock.

-- ============================================================================
-- 1. user_profiles — prevent negative stat counters and bound text fields
-- ============================================================================

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_reviews_count_non_negative
    CHECK (reviews_count >= 0) NOT VALID;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_contributions_count_non_negative
    CHECK (contributions_count >= 0) NOT VALID;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_favorites_count_non_negative
    CHECK (favorites_count >= 0) NOT VALID;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_username_length
    CHECK (username IS NULL OR length(username) <= 50) NOT VALID;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_display_name_length
    CHECK (display_name IS NULL OR length(display_name) <= 100) NOT VALID;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_bio_length
    CHECK (bio IS NULL OR length(bio) <= 500) NOT VALID;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_avatar_url_length
    CHECK (avatar_url IS NULL OR length(avatar_url) <= 2048) NOT VALID;

-- ============================================================================
-- 2. toilets — bound text fields, photos array, and rating range
-- ============================================================================

ALTER TABLE public.toilets
  ADD CONSTRAINT chk_toilet_name_length
    CHECK (length(name) <= 255) NOT VALID;

ALTER TABLE public.toilets
  ADD CONSTRAINT chk_toilet_rating_range
    CHECK (rating >= 0.0 AND rating <= 5.0) NOT VALID;

-- array_length returns NULL for empty arrays, so we must allow NULL
ALTER TABLE public.toilets
  ADD CONSTRAINT chk_toilet_photos_count
    CHECK (array_length(photos, 1) IS NULL OR array_length(photos, 1) <= 20) NOT VALID;

-- ============================================================================
-- 3. reviews — bound comment length and photos array
-- ============================================================================

ALTER TABLE public.reviews
  ADD CONSTRAINT chk_review_comment_length
    CHECK (comment IS NULL OR length(comment) <= 5000) NOT VALID;

ALTER TABLE public.reviews
  ADD CONSTRAINT chk_review_photos_count
    CHECK (array_length(photos, 1) IS NULL OR array_length(photos, 1) <= 20) NOT VALID;

-- ============================================================================
-- 4. buildings — bound text fields and photos array
-- ============================================================================

ALTER TABLE public.buildings
  ADD CONSTRAINT chk_building_name_length
    CHECK (length(name) <= 255) NOT VALID;

ALTER TABLE public.buildings
  ADD CONSTRAINT chk_building_description_length
    CHECK (description IS NULL OR length(description) <= 2000) NOT VALID;

ALTER TABLE public.buildings
  ADD CONSTRAINT chk_building_photos_count
    CHECK (array_length(photos, 1) IS NULL OR array_length(photos, 1) <= 20) NOT VALID;

-- ============================================================================
-- 5. toilet_submissions — bound reason text
-- ============================================================================

ALTER TABLE public.toilet_submissions
  ADD CONSTRAINT chk_submission_reason_length
    CHECK (reason IS NULL OR length(reason) <= 2000) NOT VALID;

-- ============================================================================
-- 6. Validate all constraints against existing data
--    This acquires a SHARE UPDATE EXCLUSIVE lock (allows reads and writes)
--    rather than the ACCESS EXCLUSIVE lock that inline CHECK would require.
-- ============================================================================

ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_reviews_count_non_negative;
ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_contributions_count_non_negative;
ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_favorites_count_non_negative;
ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_username_length;
ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_display_name_length;
ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_bio_length;
ALTER TABLE public.user_profiles VALIDATE CONSTRAINT chk_avatar_url_length;

ALTER TABLE public.toilets VALIDATE CONSTRAINT chk_toilet_name_length;
ALTER TABLE public.toilets VALIDATE CONSTRAINT chk_toilet_rating_range;
ALTER TABLE public.toilets VALIDATE CONSTRAINT chk_toilet_photos_count;

ALTER TABLE public.reviews VALIDATE CONSTRAINT chk_review_comment_length;
ALTER TABLE public.reviews VALIDATE CONSTRAINT chk_review_photos_count;

ALTER TABLE public.buildings VALIDATE CONSTRAINT chk_building_name_length;
ALTER TABLE public.buildings VALIDATE CONSTRAINT chk_building_description_length;
ALTER TABLE public.buildings VALIDATE CONSTRAINT chk_building_photos_count;

ALTER TABLE public.toilet_submissions VALIDATE CONSTRAINT chk_submission_reason_length;
