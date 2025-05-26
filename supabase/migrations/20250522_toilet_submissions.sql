-- Migration for toilet contributions system
-- Creating tables and triggers for user contributions

-- Create toilet submissions table
CREATE TABLE IF NOT EXISTS public.toilet_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID REFERENCES public.toilets, -- Null for new toilet submissions
  submitter_id UUID REFERENCES public.user_profiles NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('new', 'edit', 'report')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  data JSONB NOT NULL, -- The submitted toilet data
  reason TEXT, -- Reason for edit/report
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for toilet submissions
ALTER TABLE public.toilet_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY select_own_submissions ON public.toilet_submissions
  FOR SELECT USING (auth.uid() = submitter_id);

-- Users can insert their own submissions
CREATE POLICY insert_own_submissions ON public.toilet_submissions
  FOR INSERT WITH CHECK (auth.uid() = submitter_id);

-- Only authenticated users can access submissions
CREATE POLICY authenticated_users_only ON public.toilet_submissions
  USING (auth.role() = 'authenticated');

-- Create function to record submission activity in user_activity table
CREATE OR REPLACE FUNCTION public.record_submission_activity() 
RETURNS TRIGGER AS $$
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
    jsonb_build_object('submission_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to record submission activity
DROP TRIGGER IF EXISTS on_toilet_submission ON public.toilet_submissions;
CREATE TRIGGER on_toilet_submission
  AFTER INSERT ON public.toilet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.record_submission_activity();

-- Function to update toilets when submissions are approved
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

-- Create trigger for processing approved submissions
DROP TRIGGER IF EXISTS on_submission_status_change ON public.toilet_submissions;
CREATE TRIGGER on_submission_status_change
  AFTER UPDATE OF status ON public.toilet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.process_approved_submission();

-- Update trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to submissions
DROP TRIGGER IF EXISTS update_toilet_submissions_updated_at ON public.toilet_submissions;
CREATE TRIGGER update_toilet_submissions_updated_at
  BEFORE UPDATE ON public.toilet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
