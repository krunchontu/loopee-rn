-- Migration: 20250525_fix_auth_context_issue.sql
-- Purpose: Fix authorization context issues in the submission and diagnostic functions

-- 1. Fix diagnostic function to use proper pg_policy column name (relname instead of tablename)
CREATE OR REPLACE FUNCTION public.debug_submission_auth() 
RETURNS TABLE (
  auth_uid TEXT,
  auth_role TEXT,
  user_has_profile BOOLEAN,
  profile_id TEXT,
  submission_policies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid()::TEXT,
    auth.role()::TEXT,
    EXISTS(SELECT 1 FROM user_profiles WHERE id::text = auth.uid()::text) AS user_has_profile,
    (SELECT id::text FROM user_profiles WHERE id::text = auth.uid()::text) AS profile_id,
    array_agg(polname) FROM pg_policy 
    WHERE relname = 'toilet_submissions';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.debug_submission_auth() TO authenticated;

-- 2. Fix submission function to preserve authentication context and allow explicit user_id
CREATE OR REPLACE FUNCTION public.submit_toilet(
  data JSONB,
  submission_type TEXT DEFAULT 'new',
  toilet_id UUID DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  explicit_user_id UUID DEFAULT NULL  -- Optional explicit user ID parameter
) RETURNS JSONB AS $$
DECLARE
  auth_user_id UUID := COALESCE(explicit_user_id, auth.uid());
  profile_id UUID;
  submission_id UUID;
  result JSONB;
BEGIN
  -- Validate auth state
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for toilet submission';
  END IF;
  
  -- Check if user profile exists, create if not
  SELECT id INTO profile_id FROM user_profiles WHERE id::text = auth_user_id::text;
  
  IF profile_id IS NULL THEN
    -- Generate default username and display name
    INSERT INTO user_profiles (
      id, 
      username, 
      display_name, 
      created_at, 
      updated_at,
      reviews_count,
      contributions_count,
      favorites_count
    )
    VALUES (
      auth_user_id, 
      'user_' || floor(random() * 1000000)::text, 
      coalesce(
        (SELECT user_metadata->>'full_name' FROM auth.users WHERE id = auth_user_id),
        'User'
      ), 
      now(), 
      now(),
      0,
      0,
      0
    )
    RETURNING id INTO profile_id;
  END IF;
  
  -- Insert submission using the verified profile ID
  INSERT INTO toilet_submissions (
    submitter_id, 
    submission_type, 
    status, 
    data,
    toilet_id,
    reason
  )
  VALUES (
    profile_id, 
    submission_type, 
    'pending', 
    data,
    toilet_id,
    reason
  )
  RETURNING 
    jsonb_build_object(
      'id', id,
      'submitter_id', submitter_id,
      'submission_type', submission_type,
      'status', status,
      'created_at', created_at
    ) INTO result;
  
  -- Increment the user's contribution count
  UPDATE user_profiles
  SET 
    contributions_count = contributions_count + 1,
    updated_at = NOW()
  WHERE id = profile_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- Changed from SECURITY DEFINER to INVOKER

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.submit_toilet(JSONB, TEXT, UUID, TEXT, UUID) TO authenticated;
