-- Backfill missing user profiles migration
-- This migration creates profiles for any existing users that don't have them

-- Create a function to backfill user profiles
CREATE OR REPLACE FUNCTION backfill_user_profiles()
RETURNS INTEGER AS $$
DECLARE
    user_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Loop through all auth users that don't have profiles
    FOR user_record IN
        SELECT au.id, au.email, au.raw_user_meta_data 
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.id
        WHERE up.id IS NULL
    LOOP
        -- Insert profile for each user
        INSERT INTO public.user_profiles (
            id, 
            username, 
            display_name,
            created_at,
            updated_at
        )
        VALUES (
            user_record.id,
            'user_' || floor(random() * 1000000)::text,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name',
                user_record.email,
                'User ' || floor(random() * 1000000)::text
            ),
            NOW(),
            NOW()
        );
        
        -- Increment counter
        user_count := user_count + 1;
    END LOOP;
    
    -- Return the number of profiles created
    RETURN user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the backfill function and record results in a temporary table
DO $$
DECLARE
    backfilled_count INTEGER;
BEGIN
    -- Run the backfill
    SELECT backfill_user_profiles() INTO backfilled_count;
    
    -- Log the result
    RAISE NOTICE 'User profile backfill complete: % profiles created', backfilled_count;
END;
$$;

-- Create a helper function to run backfill on-demand (useful for admin operations)
CREATE OR REPLACE FUNCTION run_profile_backfill()
RETURNS INTEGER AS $$
DECLARE
    result INTEGER;
BEGIN
    SELECT backfill_user_profiles() INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the backfill function to authenticated users
GRANT EXECUTE ON FUNCTION run_profile_backfill() TO authenticated;

-- Comment on functions to document their purpose
COMMENT ON FUNCTION backfill_user_profiles() IS 'Internal function to create user profiles for existing users without profiles';
COMMENT ON FUNCTION run_profile_backfill() IS 'Admin function to create profiles for users that are missing them';
