-- Migration 20250531_fix_toilet_submission_columns.sql
-- Purpose: Fix missing columns and function issues in the toilet submission system
-- Date: 2025-05-31

-----------------------------------------
-- SECTION 1: Add missing columns to toilets table
-----------------------------------------

-- Add columns that are referenced in the submission process but missing in the toilets table
ALTER TABLE public.toilets
  ADD COLUMN IF NOT EXISTS description TEXT, -- For toilet descriptions
  ADD COLUMN IF NOT EXISTS address TEXT, -- For street address
  ADD COLUMN IF NOT EXISTS building_name TEXT, -- In addition to building_id
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.user_profiles, -- Who submitted it
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES public.user_profiles, -- Who last edited it
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); -- When it was last updated

-- Add updated_at trigger to toilets table if not present
DROP TRIGGER IF EXISTS update_toilets_updated_at ON public.toilets;
CREATE TRIGGER update_toilets_updated_at
  BEFORE UPDATE ON public.toilets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-----------------------------------------
-- SECTION 2: Update the process_approved_submission function
-----------------------------------------

-- First drop the trigger that depends on the function to avoid dependency errors
DROP TRIGGER IF EXISTS on_submission_status_change ON public.toilet_submissions;

-- Now drop the existing function safely
DROP FUNCTION IF EXISTS public.process_approved_submission();

-- Create a modified version that handles field mapping correctly
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
      -- Insert into toilets table with proper field mapping
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
        COALESCE(NEW.data->>'description', NEW.data->>'name'), -- Use name as fallback for description
        location_point,
        NEW.data->>'address',
        NEW.data->>'buildingName', -- Will be NULL if missing
        (NEW.data->>'floorLevel')::int,
        (NEW.data->>'isAccessible')::boolean,
        NEW.data->'amenities', -- Use as is (may need transformation if structures differ)
        COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.data->'photos'))), ARRAY[]::text[]),
        NEW.submitter_id
      )
      RETURNING id INTO new_toilet_id;
      
      -- Update the submission with the created toilet_id
      UPDATE public.toilet_submissions 
      SET toilet_id = new_toilet_id
      WHERE id = NEW.id;
      
    -- For edit submissions
    ELSIF NEW.submission_type = 'edit' AND NEW.toilet_id IS NOT NULL THEN
      -- Update the existing toilet with the new data
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
        amenities = COALESCE(NEW.data->'amenities', amenities),
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
  
  -- Also handle rejection notifications
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected') THEN
    -- Notify the submitter about rejection
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

-----------------------------------------
-- SECTION 3: Fix check_submission_eligibility function
-----------------------------------------

-- Drop the existing function (which has the polpermission error)
DROP FUNCTION IF EXISTS public.check_submission_eligibility();

-- Create a corrected version without using polpermission
CREATE OR REPLACE FUNCTION public.check_submission_eligibility() 
RETURNS TABLE (
  can_submit boolean,
  reason text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID := auth.uid();
  user_role TEXT := auth.role();
  submission_count INT;
  pending_count INT;
BEGIN
  -- Check if user is authenticated
  IF user_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE as can_submit,
      'Authentication required' as reason;
    RETURN;
  END IF;

  -- Check if user has a profile
  IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_id) THEN
    RETURN QUERY SELECT 
      FALSE as can_submit,
      'User profile required' as reason;
    RETURN;
  END IF;
  
  -- Check pending submissions (limit to 5 pending at a time)
  SELECT COUNT(*) INTO pending_count
  FROM toilet_submissions
  WHERE submitter_id = user_id AND status = 'pending';
  
  IF pending_count >= 5 THEN
    RETURN QUERY SELECT 
      FALSE as can_submit,
      'Maximum pending submissions limit reached (5)' as reason;
    RETURN;
  END IF;
  
  -- Check daily submission limit (10 per day)
  SELECT COUNT(*) INTO submission_count
  FROM toilet_submissions
  WHERE 
    submitter_id = user_id AND 
    created_at > (CURRENT_TIMESTAMP - INTERVAL '1 day');
  
  IF submission_count >= 10 THEN
    RETURN QUERY SELECT 
      FALSE as can_submit,
      'Daily submission limit reached (10 per day)' as reason;
    RETURN;
  END IF;
  
  -- Default: Allow submissions
  RETURN QUERY SELECT 
    TRUE as can_submit,
    'Eligible for submission' as reason;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_submission_eligibility() TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.check_submission_eligibility() IS 'Checks if the current user is eligible to submit a toilet. Enforces rate limits and validates user authentication.';

-- Recreate the trigger that was dropped earlier
CREATE TRIGGER on_submission_status_change
  AFTER UPDATE OF status ON public.toilet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.process_approved_submission();

-- Add comments for the function
COMMENT ON FUNCTION public.process_approved_submission() IS 'Handles the approval process for toilet submissions, converting JSON data to appropriate database formats.';

-----------------------------------------
-- SECTION 4: Fix the update_user_contribution_count function
-----------------------------------------

-- First drop all existing triggers that depend on this function
DROP TRIGGER IF EXISTS update_user_contribution_count_insert ON public.toilets;
DROP TRIGGER IF EXISTS update_user_contribution_count_delete ON public.toilets;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS public.update_user_contribution_count();

-- Recreate the function using the correct field name (submitted_by instead of added_by)
CREATE OR REPLACE FUNCTION public.update_user_contribution_count() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contribution count for the user who submitted the toilet
  UPDATE public.user_profiles
  SET contributions_count = contributions_count + 1
  WHERE id = NEW.submitted_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION public.update_user_contribution_count() IS 'Updates user contribution count when a new toilet is added.';

-- Recreate both triggers with their original names
CREATE TRIGGER update_user_contribution_count_insert
  AFTER INSERT ON public.toilets
  FOR EACH ROW EXECUTE FUNCTION public.update_user_contribution_count();

-- Create a separate function for decrementing contributions on delete
CREATE OR REPLACE FUNCTION public.update_user_contribution_count_on_delete() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contribution count for the user who submitted the toilet (decrement on delete)
  IF OLD.submitted_by IS NOT NULL THEN
    UPDATE public.user_profiles
    SET contributions_count = GREATEST(0, contributions_count - 1)
    WHERE id = OLD.submitted_by;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for the delete function
COMMENT ON FUNCTION public.update_user_contribution_count_on_delete() IS 'Decrements user contribution count when a toilet is deleted.';

-- Recreate the delete trigger
CREATE TRIGGER update_user_contribution_count_delete
  AFTER DELETE ON public.toilets
  FOR EACH ROW EXECUTE FUNCTION public.update_user_contribution_count_on_delete();
