-- Migration: 20250529_add_activity_tables.sql
-- Purpose: Add missing tables and fix authentication handling
-- Author: AI Co-pilot
-- Date: 2025-05-29

/*
This migration addresses the following issues:
1. Missing user_activity table referenced in record_submission_activity trigger
2. Missing user_notifications table referenced in process_approved_submission
3. Improves error resilience in trigger functions to prevent cascading failures
4. Updates security context handling for better authentication management
*/

-- SECTION 1: Create user activity table
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  activity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);

-- SECTION 2: Add Row-Level Security for user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own activity
CREATE POLICY view_own_activity ON public.user_activity
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- No direct inserts allowed (only through system functions)
CREATE POLICY function_insert_activity ON public.user_activity
  FOR INSERT WITH CHECK (FALSE);  -- Block direct inserts, functions use SECURITY DEFINER

-- SECTION 3: Fix submission activity trigger function with error handling
CREATE OR REPLACE FUNCTION public.record_submission_activity() 
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert the activity but don't fail if it errors
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
    -- Log error but don't block the submission
    RAISE WARNING 'Failed to record activity: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 4: Add notification table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add notification system indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Add RLS for notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own notifications
CREATE POLICY view_own_notifications ON public.user_notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);
  
-- Allow users to update read status of their own notifications
CREATE POLICY update_own_notifications ON public.user_notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- No direct inserts allowed (only through system functions)
CREATE POLICY function_insert_notifications ON public.user_notifications
  FOR INSERT WITH CHECK (FALSE);  -- Block direct inserts, functions use SECURITY DEFINER

-- SECTION 5: Fix the approved submission handler to be more resilient
CREATE OR REPLACE FUNCTION public.process_approved_submission() 
RETURNS TRIGGER AS $$
DECLARE
  new_toilet_id UUID;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- For new toilet submissions
    IF NEW.submission_type = 'new' THEN
      -- Insert into toilets table
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
    
    -- Try to notify the submitter but don't fail if notifications table issues
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't block the processing
      RAISE WARNING 'Failed to create notification: %', SQLERRM;
    END;
  END IF;
  
  -- Also handle rejection notifications with error handling
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected') THEN
    -- Try to notify but don't fail if notifications table issues
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't block the processing
      RAISE WARNING 'Failed to create rejection notification: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 6: Add convenience function for getting user activities
CREATE OR REPLACE FUNCTION public.get_user_activity(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) 
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.activity_type,
    a.entity_id,
    a.metadata,
    a.created_at
  FROM 
    public.user_activity a
  WHERE 
    a.user_id = auth.uid()
  ORDER BY 
    a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_activity(INTEGER, INTEGER) TO authenticated;

-- SECTION 7: Add convenience function for managing notifications
CREATE OR REPLACE FUNCTION public.get_user_notifications(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
) 
RETURNS TABLE (
  id UUID,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.notification_type,
    n.title,
    n.message,
    n.entity_type,
    n.entity_id,
    n.metadata,
    n.is_read,
    n.created_at
  FROM 
    public.user_notifications n
  WHERE 
    n.user_id = auth.uid() AND
    (NOT p_unread_only OR NOT n.is_read)
  ORDER BY 
    n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_notifications(INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- Add function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_is_read BOOLEAN DEFAULT TRUE
) 
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.user_notifications
  SET is_read = p_is_read
  WHERE id = p_notification_id AND user_id = auth.uid()
  RETURNING 1 INTO updated_count;
  
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID, BOOLEAN) TO authenticated;

-- SECTION 8: Add documentation comments
COMMENT ON TABLE public.user_activity IS 
'Stores user activity events for generating feeds and tracking user contributions.
Used by system triggers to automatically track submission events.';

COMMENT ON TABLE public.user_notifications IS
'Stores user notifications for the app notification system.
Automatically populated by triggers when key events occur.';

COMMENT ON FUNCTION public.record_submission_activity() IS
'Trigger function that records user activity when toilet submissions are created.
Uses SECURITY DEFINER to ensure it can write to user_activity regardless of RLS.';

COMMENT ON FUNCTION public.process_approved_submission() IS
'Trigger function that processes approved submissions and creates notifications.
Uses SECURITY DEFINER to ensure it can write regardless of RLS policies.';

COMMENT ON FUNCTION public.get_user_activity(INTEGER, INTEGER) IS
'Retrieves activity records for the authenticated user with pagination support.';

COMMENT ON FUNCTION public.get_user_notifications(INTEGER, INTEGER, BOOLEAN) IS
'Retrieves notifications for the authenticated user with pagination and filtering.';

COMMENT ON FUNCTION public.mark_notification_read(UUID, BOOLEAN) IS
'Marks a notification as read or unread if the authenticated user owns it.';
