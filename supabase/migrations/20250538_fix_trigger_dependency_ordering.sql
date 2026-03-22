-- Fix: Ensure trigger functions have error handling for table dependency gaps.
--
-- Background: 20250522_toilet_submissions.sql originally created
-- record_submission_activity() and process_approved_submission() that
-- reference user_activity and user_notifications respectively. Those
-- tables are only created in 20250529_add_activity_tables.sql.
-- The original functions had NO error handling, so any submission
-- between those two migrations would crash and roll back the user's data.
--
-- 20250529 already replaces both functions with error-handling versions,
-- and 20250522 has now been patched to match. This migration is a
-- safety net for any existing dev databases to ensure the functions
-- match the corrected 20250529 versions.

-- Recreate record_submission_activity with error handling
CREATE OR REPLACE FUNCTION public.record_submission_activity()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.user_activity (
      user_id,
      activity_type,
      entity_id,
      metadata
    )
    VALUES (
      NEW.submitter_id,
      'toilet_' || NEW.submission_type,
      COALESCE(NEW.toilet_id, NEW.id),
      jsonb_build_object(
        'submission_id', NEW.id,
        'submission_type', NEW.submission_type,
        'data', jsonb_build_object(
          'name', NEW.data->>'name',
          'status', NEW.status
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'record_submission_activity: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate process_approved_submission with error handling on notifications
CREATE OR REPLACE FUNCTION public.process_approved_submission()
RETURNS TRIGGER AS $$
DECLARE
  new_toilet_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    IF NEW.submission_type = 'new' THEN
      INSERT INTO public.toilets (
        name, description, location, address, building_name,
        floor_level, is_accessible, amenities, photos, submitted_by
      )
      VALUES (
        NEW.data->>'name',
        NEW.data->>'description',
        (NEW.data->>'location')::jsonb,
        NEW.data->>'address',
        NEW.data->>'buildingName',
        (NEW.data->>'floorLevel')::int,
        (NEW.data->>'isAccessible')::boolean,
        (NEW.data->>'amenities')::jsonb,
        (NEW.data->>'photos')::jsonb,
        NEW.submitter_id
      )
      RETURNING id INTO new_toilet_id;

      UPDATE public.toilet_submissions
      SET toilet_id = new_toilet_id
      WHERE id = NEW.id;

    ELSIF NEW.submission_type = 'edit' AND NEW.toilet_id IS NOT NULL THEN
      UPDATE public.toilets
      SET
        name = COALESCE(NEW.data->>'name', name),
        description = COALESCE(NEW.data->>'description', description),
        location = COALESCE((NEW.data->>'location')::jsonb, location),
        address = COALESCE(NEW.data->>'address', address),
        building_name = COALESCE(NEW.data->>'buildingName', building_name),
        floor_level = COALESCE((NEW.data->>'floorLevel')::int, floor_level),
        is_accessible = COALESCE((NEW.data->>'isAccessible')::boolean, is_accessible),
        amenities = COALESCE((NEW.data->>'amenities')::jsonb, amenities),
        photos = CASE
          WHEN NEW.data->>'photos' IS NOT NULL THEN
            (NEW.data->>'photos')::jsonb
          ELSE photos
        END,
        updated_at = NOW(),
        last_edited_by = NEW.submitter_id
      WHERE id = NEW.toilet_id;
    END IF;

    BEGIN
      INSERT INTO public.user_notifications (
        user_id, notification_type, title, message,
        entity_type, entity_id, metadata
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'process_approved_submission (approval notification): %', SQLERRM;
    END;
  END IF;

  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected') THEN
    BEGIN
      INSERT INTO public.user_notifications (
        user_id, notification_type, title, message,
        entity_type, entity_id, metadata
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'process_approved_submission (rejection notification): %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
