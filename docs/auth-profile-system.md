# Authentication Profile System

## Overview

The authentication profile system in Loopee connects Supabase's auth system with user profiles in our database. Each authenticated user should have a corresponding record in the `user_profiles` table that contains app-specific information.

## System Architecture

1. **Auth User**: Created in Supabase's `auth.users` table when users sign up
2. **User Profile**: Created in our `public.user_profiles` table to store app-specific user data
3. **Database Trigger**: Automatically creates profiles for new user signups
4. **Fallback Mechanism**: Auto-creates missing profiles during authentication

## Recent Fixes (May 18, 2025)

We've implemented a two-part solution to address the issue where some users had auth accounts but no matching profiles:

### Short-term Fix: Automatic Profile Creation

We've modified the `getProfile()` function in `src/services/supabase.ts` to automatically create a user profile when one doesn't exist. This provides immediate relief for existing users who are encountering the error:

```
ERROR [Auth] Get profile failed {"code": "PGRST116", "details": "The result contains 0 rows", "hint": null, "message": "JSON object requested, multiple (or no) rows returned"}
```

Key features of this fix:
- Detects the specific "no rows" error (PGRST116)
- Automatically creates a profile with sensible defaults
- Logs the action for monitoring and debugging
- Maintains a seamless user experience

### Long-term Fix: Database Migration for Backfill

We've created a migration (`20250519_backfill_user_profiles.sql`) that:
1. Creates a function to identify and create profiles for all existing users without profiles
2. Runs this function during migration to immediately fix existing accounts
3. Provides an admin function to run the backfill on-demand in the future if needed

## How The System Works

### Profile Creation Flow

1. **During Signup**: The database trigger `on_auth_user_created` automatically creates a profile
2. **Existing Users**: The backfill migration creates profiles for existing users
3. **Fallback**: If a user somehow falls through the cracks, the getProfile function creates a profile

### Data Structure

User profiles contain:
- `id`: UUID matching the auth.users table (primary key)
- `username`: Unique username (auto-generated if not provided)
- `display_name`: User's display name
- `avatar_url`: Optional profile picture URL
- `bio`: Optional user biography
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Troubleshooting

### Missing Profiles

If new users report missing profiles despite these fixes:

1. Check if the user exists in `auth.users` but is missing in `user_profiles`
2. Verify the `on_auth_user_created` trigger is active on the `auth.users` table
3. Run the `run_profile_backfill()` function to create any missing profiles

### Common Profile Errors

| Error Code | Error Message | Solution |
|------------|---------------|----------|
| PGRST116   | "JSON object requested, multiple (or no) rows returned" | This should be auto-fixed now, but can be resolved by running `run_profile_backfill()` |
| 23505      | "duplicate key value violates unique constraint" | Username conflict - the user needs to choose a different username |

## Technical Implementation Details

### Database Trigger for New Users

```sql
-- From 20250518_auth_user_profiles.sql
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id, 
    'user_' || floor(random() * 1000000)::text, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Auto-create Missing Profiles

```typescript
// From src/services/supabase.ts getProfile() function
if (error.code === "PGRST116") {
  // Profile doesn't exist - create one
  // ...creates profile with default values...
}
```

### Backfill Function

```sql
-- From 20250519_backfill_user_profiles.sql
CREATE OR REPLACE FUNCTION backfill_user_profiles()
RETURNS INTEGER AS $$
  -- ...finds and creates missing profiles...
$$ LANGUAGE plpgsql SECURITY DEFINER;
