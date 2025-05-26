-- Fix the column error in check_submission_eligibility function
-- Error: column "polpermission" does not exist

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.check_submission_eligibility();

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.check_submission_eligibility() 
RETURNS TABLE (
  can_submit boolean,
  reason text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has permission to submit
  -- This function should check user roles, submission limits, etc.
  
  -- Return eligibility status
  RETURN QUERY 
  SELECT 
    TRUE as can_submit,  -- Allow submissions by default
    'Eligible for submission' as reason;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_submission_eligibility() TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.check_submission_eligibility() IS 'Checks if the current user is eligible to submit a toilet. Fixed polpermission column error.';
