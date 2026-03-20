-- Migration: Normalize amenities in process_approved_submission trigger
--
-- Problem: The process_approved_submission trigger stores amenities JSONB as-is
-- from user submissions (line 77: "Use as is (may need transformation...)").
-- Even though client-side validation sends the correct "has" prefix format,
-- a defense-in-depth approach requires the DB to also normalize on write.
--
-- This migration:
-- 1. Creates a reusable normalize_amenities() SQL function
-- 2. Updates process_approved_submission to call it on insert and update

-----------------------------------------
-- SECTION 1: Create normalize_amenities helper function
-----------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_amenities(raw JSONB)
RETURNS JSONB AS $$
BEGIN
  IF raw IS NULL THEN
    RETURN '{
      "hasBabyChanging": false,
      "hasShower": false,
      "isGenderNeutral": false,
      "hasPaperTowels": false,
      "hasHandDryer": false,
      "hasWaterSpray": false,
      "hasSoap": false
    }'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'hasBabyChanging', COALESCE((raw->>'hasBabyChanging')::boolean, (raw->>'babyChanging')::boolean, false),
    'hasShower',       COALESCE((raw->>'hasShower')::boolean,       (raw->>'shower')::boolean,       false),
    'isGenderNeutral', COALESCE((raw->>'isGenderNeutral')::boolean, (raw->>'genderNeutral')::boolean, false),
    'hasPaperTowels',  COALESCE((raw->>'hasPaperTowels')::boolean,  (raw->>'paperTowels')::boolean,  false),
    'hasHandDryer',    COALESCE((raw->>'hasHandDryer')::boolean,    (raw->>'handDryer')::boolean,    false),
    'hasWaterSpray',   COALESCE((raw->>'hasWaterSpray')::boolean,   (raw->>'waterSpray')::boolean,   false),
    'hasSoap',         COALESCE((raw->>'hasSoap')::boolean,         (raw->>'soap')::boolean,         false)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_amenities(JSONB) IS
'Normalizes amenities JSONB to canonical format with "has"/"is" prefixed keys.
Handles both old format (babyChanging) and new format (hasBabyChanging).
Unknown keys are stripped; missing keys default to false.';

-----------------------------------------
-- SECTION 2: Update process_approved_submission trigger
-----------------------------------------

-- Drop the trigger first to allow function replacement
DROP TRIGGER IF EXISTS on_submission_status_change ON public.toilet_submissions;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.process_approved_submission();

-- Recreate with amenities normalization on both insert and update paths
CREATE OR REPLACE FUNCTION public.process_approved_submission()
RETURNS TRIGGER AS $$
DECLARE
  new_toilet_id UUID;
  location_point geography;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- Process location data from JSON to PostGIS point
    IF NEW.data->'location' IS NOT NULL AND
       NEW.data->'location'->>'latitude' IS NOT NULL AND
       NEW.data->'location'->>'longitude' IS NOT NULL THEN

      location_point := ST_SetSRID(ST_MakePoint(
        (NEW.data->'location'->>'longitude')::float,
        (NEW.data->'location'->>'latitude')::float
      ), 4326)::geography;
    END IF;

    -- For new toilet submissions
    IF NEW.submission_type = 'new' THEN
      INSERT INTO public.toilets (
        name,
        description,
        location,
        address,
        building_name,
        floor_level,
        is_accessible,
        amenities,
        photos,
        submitted_by
      )
      VALUES (
        NEW.data->>'name',
        COALESCE(NEW.data->>'description', NEW.data->>'name'),
        location_point,
        NEW.data->>'address',
        NEW.data->>'buildingName',
        (NEW.data->>'floorLevel')::int,
        (NEW.data->>'isAccessible')::boolean,
        normalize_amenities(NEW.data->'amenities'),  -- NORMALIZED
        COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.data->'photos'))), ARRAY[]::text[]),
        NEW.submitter_id
      )
      RETURNING id INTO new_toilet_id;

      UPDATE public.toilet_submissions
      SET toilet_id = new_toilet_id
      WHERE id = NEW.id;

    -- For edit submissions
    ELSIF NEW.submission_type = 'edit' AND NEW.toilet_id IS NOT NULL THEN
      UPDATE public.toilets
      SET
        name = COALESCE(NEW.data->>'name', name),
        description = COALESCE(NEW.data->>'description', description),
        location = CASE
          WHEN location_point IS NOT NULL THEN location_point
          ELSE location
        END,
        address = COALESCE(NEW.data->>'address', address),
        building_name = COALESCE(NEW.data->>'buildingName', building_name),
        floor_level = COALESCE((NEW.data->>'floorLevel')::int, floor_level),
        is_accessible = COALESCE((NEW.data->>'isAccessible')::boolean, is_accessible),
        amenities = CASE
          WHEN NEW.data->'amenities' IS NOT NULL THEN normalize_amenities(NEW.data->'amenities')  -- NORMALIZED
          ELSE amenities
        END,
        photos = CASE
          WHEN NEW.data->'photos' IS NOT NULL THEN
            COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.data->'photos'))), ARRAY[]::text[])
          ELSE photos
        END,
        updated_at = NOW(),
        last_edited_by = NEW.submitter_id
      WHERE id = NEW.toilet_id;
    END IF;

    -- Notify the submitter via user_notifications
    INSERT INTO public.user_notifications (
      user_id,
      notification_type,
      title,
      message,
      entity_type,
      entity_id,
      metadata
    )
    VALUES (
      NEW.submitter_id,
      'submission_approved',
      'Submission Approved',
      CASE
        WHEN NEW.submission_type = 'new' THEN 'Your toilet submission has been approved and published!'
        WHEN NEW.submission_type = 'edit' THEN 'Your toilet edit has been approved and published!'
        ELSE 'Your submission has been approved!'
      END,
      'toilet_submission',
      NEW.id,
      jsonb_build_object(
        'submission_id', NEW.id,
        'toilet_id', COALESCE(NEW.toilet_id, new_toilet_id)
      )
    );
  END IF;

  -- Handle rejection notifications
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected') THEN
    INSERT INTO public.user_notifications (
      user_id,
      notification_type,
      title,
      message,
      entity_type,
      entity_id,
      metadata
    )
    VALUES (
      NEW.submitter_id,
      'submission_rejected',
      'Submission Rejected',
      CASE
        WHEN NEW.submission_type = 'new' THEN 'Your toilet submission has been rejected.'
        WHEN NEW.submission_type = 'edit' THEN 'Your toilet edit has been rejected.'
        ELSE 'Your submission has been rejected.'
      END,
      'toilet_submission',
      NEW.id,
      jsonb_build_object(
        'submission_id', NEW.id,
        'toilet_id', NEW.toilet_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_approved_submission() IS
'Handles the approval process for toilet submissions, converting JSON data to appropriate database formats.
Amenities are normalized via normalize_amenities() to ensure consistent "has"/"is" prefix format.';

-- Recreate the trigger
CREATE TRIGGER on_submission_status_change
  AFTER UPDATE OF status ON public.toilet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.process_approved_submission();
