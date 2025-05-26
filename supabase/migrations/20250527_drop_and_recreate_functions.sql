-- Migration: 20250527_drop_and_recreate_functions.sql
-- Purpose: Drop existing functions before recreating them with new parameter names

-- 1. Drop and recreate diagnostic function
DROP FUNCTION IF EXISTS public.debug_submission_auth();

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
    array_agg(pol.polname) 
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
  WHERE cls.relname = 'toilet_submissions'
  AND nsp.nspname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.debug_submission_auth() TO authenticated;

-- 2. Drop and recreate submission function with parameter prefixes
DROP FUNCTION IF EXISTS public.submit_toilet(jsonb, text, uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.submit_toilet(
  p_data JSONB,
  p_submission_type TEXT DEFAULT 'new',
  p_toilet_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_explicit_user_id UUID DEFAULT NULL  -- Optional explicit user ID parameter
) RETURNS JSONB AS $$
DECLARE
  auth_user_id UUID := COALESCE(p_explicit_user_id, auth.uid());
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
    p_submission_type,  -- Use prefixed parameter to avoid ambiguity
    'pending', 
    p_data,             -- Use prefixed parameter
    p_toilet_id,        -- Use prefixed parameter
    p_reason            -- Use prefixed parameter
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execute permissions for the updated function with prefixed parameters
GRANT EXECUTE ON FUNCTION public.submit_toilet(JSONB, TEXT, UUID, TEXT, UUID) TO authenticated;
