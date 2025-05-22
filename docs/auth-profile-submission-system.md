# Auth, Profile, and Submission System

## Overview

This document explains the relationship between authentication (auth.users), user profiles (user_profiles), and submissions (toilet_submissions) in the Loopee application. Understanding this relationship is crucial for maintaining and extending user-generated content features.

## System Architecture

### 1. Authentication Layer

- **Auth Provider**: Supabase Auth manages user registration, login, and session management
- **Auth Table**: `auth.users` contains core user authentication data
- **User IDs**: Each authenticated user has a UUID in the `id` column of `auth.users`

### 2. Profile Layer

- **Profile Table**: `user_profiles` stores user-specific information and preferences
- **Profile ID**: The `id` column in `user_profiles` corresponds exactly to the `id` in `auth.users`
- **Profile Creation**: Automatically created during first authentication or on-demand
- **Profile Validation**: Ensures a profile exists before attempting critical operations

### 3. Submission Layer

- **Submission Tables**: Tables like `toilet_submissions` store user-contributed content
- **Submitter ID**: The `submitter_id` column references the corresponding `id` in `user_profiles`
- **RLS Policies**: Row-Level Security policies verify the submitter has a valid profile

### 4. Activity & Notification System

- **Activity Tracking**: The `user_activity` table automatically records user actions
- **Notifications**: The `user_notifications` table stores system notifications for users
- **Trigger Functions**: Automatic recording of activities and notifications via triggers
- **RLS Protection**: Users can only see their own activities and notifications

## Row-Level Security (RLS) Policies

### Toilet Submissions Policy

The following RLS policy is applied to the `toilet_submissions` table:

```sql
CREATE POLICY "Users can create their own submissions"
  ON toilet_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own submissions"
  ON toilet_submissions
  FOR SELECT
  TO authenticated
  USING (submitter_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own submissions"
  ON toilet_submissions
  FOR UPDATE
  TO authenticated
  USING (submitter_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own submissions"
  ON toilet_submissions
  FOR DELETE
  TO authenticated
  USING (submitter_id::text = auth.uid()::text);
```

This policy ensures that:
1. Users can only insert rows where `submitter_id` matches their own `auth.uid()`
2. Users can only select/view submissions that they themselves created
3. The database enforces this at the lowest level for security
4. Explicit type casting (`::text`) ensures consistent comparison regardless of UUID implementation

## Common Issues and Solutions

### RLS Policy Violations

The error message "new row violates row-level security policy for table 'toilet_submissions'" typically indicates one of these issues:

1. **UUID String Comparison**: Different implementations of UUID comparison can cause issues
   - Solution: Use explicit type casting (`::text`) in RLS policies for consistent comparison
   
2. **Foreign Key Constraint**: The `submitter_id` must reference a valid user profile
   - Solution: Ensure profile creation before submission

3. **ID Mismatch**: The `submitter_id` doesn't match user's `auth.uid()`
   - Solution: Use a secure database function instead of direct inserts
   
4. **Authentication Issues**: User's session is invalid or expired
   - Solution: Use session validation and proactive refresh (see Session Management section below)

### Database Function Approach with Prefixed Parameters

For maximum reliability, the application now uses secure database functions with explicit user ID passing and prefixed parameters:

```typescript
// Example code for robust submission handling with explicit user ID and prefixed parameters
async function submitContent() {
  // Get authenticated user
  const user = await supabaseService.auth.getUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  
  // Use secure database function with explicit user ID and prefixed parameters
  const response = await supabase.rpc("submit_toilet", {
    p_data: toiletData,                // Prefixed parameter
    p_submission_type: "new",          // Prefixed parameter
    p_explicit_user_id: user.id        // Prefixed parameter
  });
  
  // Result includes the submission ID and status
  return response.data;
}
```

This approach has several advantages:
1. **Unambiguous Parameter References**: The `p_` prefix differentiates parameters from table columns
2. **Explicit Authentication**: Passes user ID directly to prevent auth context loss
3. **Automatic Profile Validation**: Creates profile if needed
4. **Security Context Preservation**: Using `SECURITY INVOKER` to maintain auth context
5. **Atomic Operations**: All database operations in a single transaction
6. **Consistent Type Handling**: Proper UUID handling in the database

## Session Management and Authentication Persistence

To ensure consistent authentication across the application and prevent "User not authenticated" errors when making submissions, we've implemented several key improvements:

### Supabase Client Singleton Pattern

The application now uses a singleton pattern for the Supabase client to ensure that all services use the same authentication state:

```typescript
// src/services/supabase.ts
export class SupabaseClientSingleton {
  private static instance: SupabaseClient | null = null;
  private static isRefreshing: boolean = false;
  
  // Get shared client instance
  static getClient(): SupabaseClient {
    if (!this.instance) {
      this.instance = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            storage: AsyncStorage,
          }
        }
      );
    }
    return this.instance;
  }
  
  // Check session health and expiration
  static async checkSession(): Promise<{
    valid: boolean;
    expiresIn: number | null;
    session: Session | null;
  }> {
    try {
      const { data, error } = await this.getClient().auth.getSession();
      if (error || !data.session) {
        return { valid: false, expiresIn: null, session: null };
      }
      
      const expiresAt = data.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = expiresAt ? expiresAt - now : null;
      
      return {
        valid: true,
        expiresIn,
        session: data.session,
      };
    } catch (error) {
      return { valid: false, expiresIn: null, session: null };
    }
  }
  
  // Refresh session token
  static async refreshSession(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing) return false;
    
    try {
      this.isRefreshing = true;
      const { data, error } = await this.getClient().auth.refreshSession();
      return !!data.session && !error;
    } catch (error) {
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }
}

// Export convenience methods
export const getSupabaseClient = () => SupabaseClientSingleton.getClient();
export const refreshSession = () => SupabaseClientSingleton.refreshSession();
export const checkSession = () => SupabaseClientSingleton.checkSession();
```

### Proactive Session Health Monitoring

The AuthProvider now includes proactive session health monitoring to prevent token expiration:

```typescript
// In AuthProvider.tsx
useEffect(() => {
  // Skip in loading state
  if (state.isLoading) return;

  // Check session every minute
  const sessionHealthInterval = setInterval(async () => {
    try {
      // Skip checks if not authenticated
      if (!state.isAuthenticated || !state.user) {
        return;
      }

      // Get session health info
      const sessionInfo = await checkSession();
      
      // If session is about to expire in less than 5 minutes, refresh it
      if (
        sessionInfo.session &&
        sessionInfo.expiresIn &&
        sessionInfo.expiresIn < 300
      ) {
        await refreshSession();
      }
    } catch (error) {
      // Log monitoring errors without crashing the app
    }
  }, 60000); // Check health every minute

  return () => clearInterval(sessionHealthInterval);
}, [state.isLoading, state.isAuthenticated, state.user]);
```

### Session Validation Before Critical Operations

The contribution service now validates the session before attempting to submit data:

```typescript
// src/services/contributionService.ts
export class ContributionService {
  // Ensure valid session before proceeding
  private async ensureValidSession(): Promise<User> {
    // Get current session
    const { data: { session }, error: sessionError } = 
      await getSupabaseClient().auth.getSession();
    
    if (sessionError || !session) {
      throw new Error("You must be logged in to submit a toilet");
    }
    
    // Check if token is about to expire and refresh if needed
    const sessionInfo = await checkSession();
    if (sessionInfo.expiresIn && sessionInfo.expiresIn < 600) {
      await refreshSession();
    }
    
    // Get current user
    const { data: { user }, error: userError } = 
      await getSupabaseClient().auth.getUser();
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }
    
    return user;
  }
  
  // Submit a new toilet with session validation
  async submitNewToilet(data: Partial<Toilet>): Promise<any> {
    try {
      // Ensure valid session and get user
      const user = await this.ensureValidSession();
      
      // Proceed with submission using the validated user
      const { data: result, error } = await getSupabaseClient()
        .rpc("submit_toilet", {
          p_data: data,
          p_submission_type: "new",
          p_explicit_user_id: user.id
        });
      
      if (error) throw error;
      return result;
    } catch (error) {
      debug.error("contributionService", "Error in submission process", error);
      throw error;
    }
  }
}
```

### AuthError Type Safety

To properly handle authentication errors, we now use proper type assertions:

```typescript
// Example of proper error handling with AuthError typing
try {
  // Auth operation
} catch (error) {
  // Handle auth error with proper typing
  const authError = error as AuthError;
  debug.log("AUTH_ERROR", {
    message: error.message,
    code: authError.code || "unknown"
  });
}
```

This comprehensive approach ensures that:
1. All services use the same authentication state
2. Sessions are refreshed before they expire
3. Operations are guarded with session validation
4. Errors are properly typed and handled

## User Activity & Notification System

### Activity Tracking System

The app includes a comprehensive activity tracking system:

```sql
-- User activity table structure
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  activity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Activities are automatically recorded through database triggers like `record_submission_activity()`, which fires when users make submissions:

```sql
-- Trigger behavior (simplified)
CREATE TRIGGER on_toilet_submission
  AFTER INSERT ON public.toilet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.record_submission_activity();
```

### Notification System

The app includes a notification system for alerting users about status changes:

```sql
-- User notifications table structure
CREATE TABLE public.user_notifications (
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
```

### Error Resilience

Both systems use exception handling to prevent cascading failures:

```sql
-- Error resilient activity recording
BEGIN
  INSERT INTO public.user_activity (...) VALUES (...);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to record activity: %', SQLERRM;
END;
```

This ensures that even if the activity or notification features encounter issues, they won't prevent the core submission functionality from working.

## Implemented Safeguards

The application includes multiple layers of protection:

1. **Auth Provider**: Ensures session validity before operations
2. **Type-Safe RLS Policies**: Explicit text casting ensures consistent comparisons
3. **Database Functions**: Handle profile validation and submission in one atomic operation
4. **Diagnostic Functions**: Help identify authentication and permission issues
5. **UI Components**: Show clear error messages for authentication issues
6. **Error Handling**: Detailed error messages guide users through issues
7. **Non-blocking Activity Tracking**: Activity recording never blocks critical operations
8. **SECURITY DEFINER**: Critical functions bypass RLS when needed

## Debugging Authentication and SQL Issues

When troubleshooting system problems:

1. Use the `debug_submission_auth()` database function to diagnose auth state
2. Check authentication state with `AuthDebugger`
3. Verify profile existence in database
4. Look for profile validation logs in the console
5. Check for RLS policy violations or SQL errors in the console messages

### Using the Diagnostic Function

```sql
-- Call the diagnostic function in SQL
SELECT * FROM debug_submission_auth();
```

This returns a detailed report including:
- Current auth.uid()
- Whether the user has a profile
- The user's profile ID
- Current role (authenticated/anon)
- List of RLS policies on the table

The diagnostic function uses proper PostgreSQL catalog table joins:

```sql
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE cls.relname = 'toilet_submissions'
AND nsp.nspname = 'public';
```

### Common Implementation Issues

1. **Auth Context Loss in RPC Calls**: When using RPC (Remote Procedure Call) to invoke database functions, the auth context can sometimes be lost
   - Solution: Pass the user ID explicitly as a parameter

2. **Security Context Issues**: SECURITY DEFINER functions run as the function owner, not the calling user
   - Solution: Use SECURITY INVOKER for functions that need the caller's auth context

3. **PostgreSQL Catalog Table Differences**: Different PostgreSQL versions use different catalog table structures
   - Solution: Use proper table joins instead of direct column references

4. **Ambiguous Column References**: When function parameter names match table column names
   - Solution: Use prefixed parameter names (e.g., `p_data` instead of `data`)

5. **Function Parameter Renaming Limitations**: PostgreSQL does not allow changing parameter names with CREATE OR REPLACE
   - Solution: DROP the function first, then CREATE it with new parameter names

6. **Missing System Tables**: References to tables like `user_activity` that don't exist
   - Solution: Ensure all referenced tables are created, with error handling as backup

## Enhanced Submission Process Flow

The enhanced toilet submission process now works as follows:

1. **Client Side**:
   - User enters toilet data in the UI
   - Client gets authenticated user ID with `supabaseService.auth.getUser()`
   - Client calls `contributionService.submitNewToilet(data)`
   - Service invokes `submit_toilet` database function with prefixed parameters

2. **Database Side**:
   - Function receives prefixed parameters (`p_data`, `p_submission_type`, etc.)
   - Uses explicit user ID from `p_explicit_user_id` or falls back to auth.uid()
   - Checks if the user has a profile, creates one if not
   - Inserts the submission using the validated profile ID
   - Updates the user's contribution count
   - Records the activity in the `user_activity` table
   - Returns submission details to client

3. **Response Handling**:
   - Client receives success response with submission ID
   - UI displays confirmation and updates submission list

## Future Improvements

1. **Transaction Monitoring**: Add detailed logging for submission transactions
2. **Context Preservation**: Standardize auth context passing for all database operations
3. **Parameter Naming Convention**: Standardize parameter prefixing across all database functions
4. **Profile Recovery**: Add mechanism to recreate profiles if accidentally deleted
5. **Profile Merging**: Support for merging profiles if users have multiple accounts
6. **Enhanced Validation**: Additional checks for profile completeness
7. **Bulk Submission Support**: Enable batched submissions for efficiency
8. **Activity Feed UI**: Build UI components for displaying user activity
9. **Notification Center**: Create a notification center UI component
10. **Real-time Updates**: Add real-time functionality for notifications

## Related Files

- `supabase/migrations/20250529_add_activity_tables.sql` - Activity and notification tables with functions
- `supabase/migrations/20250528_fix_toilet_submission_system_v2.sql` - Latest database functions with type fixing and SECURITY DEFINER
- `supabase/migrations/20250527_drop_and_recreate_functions.sql` - Database functions with prefixed parameters
- `supabase/migrations/20250526_fix_pg_catalog_and_ambiguous_column.sql` - Catalog table join fixes
- `supabase/migrations/20250525_fix_auth_context_issue.sql` - Auth context preservation
- `supabase/migrations/20250524_fix_toilet_submission_system.sql` - Original database functions
- `src/services/supabase.ts` - Supabase client singleton and session management utilities
- `src/services/contributionService.ts` - Service with session validation and explicit user ID
- `src/services/profileService.ts` - Core profile management
- `src/providers/AuthProvider.tsx` - Authentication state management with session health monitoring
- `src/components/contribute/AddToiletReview.tsx` - UI for submission
- `track-changes.md` - Change history including authentication session persistence fix
- `progress.md` - Project progress tracking with completed tasks

## Troubleshooting the Submission System

### Common Error Messages and Solutions

#### RLS Policy Violations

Error: `new row violates row-level security policy for table "toilet_submissions"`

This occurs when:
1. The authenticated user's UUID doesn't match the submitter_id
2. The auth context is lost during database operations
3. The user doesn't have a valid profile

**Solution:**
- Use the `check_submission_eligibility()` function to diagnose permission issues
- Ensure explicit user ID passing with `p_explicit_user_id` parameter
- Log out and log back in to refresh authentication tokens
- Verify the database function uses `SECURITY DEFINER` to bypass RLS policies

#### Type Mismatch Errors

Error: `structure of query does not match function result type`

This usually indicates mismatched PostgreSQL types in function declarations vs. actual query results.

**Solution:**
- Use explicit type casting in aggregate functions: `array_agg(pol.polname::TEXT)::TEXT[]`
- Use variables to capture and cast results before returning
- Verify PostgreSQL version compatibility with catalog table queries

#### Missing Table References

Error: `relation "public.user_activity" does not exist`

This occurs when trigger functions reference tables that don't exist in the database.

**Solution:**
- Create all required tables before deploying trigger functions
- Add error handling in trigger functions to prevent cascading failures
- Use TRY/CATCH blocks in database functions to capture table-related errors
- Update migration scripts to create tables in the correct order

### Debugging Commands

Run these commands to diagnose issues:

```sql
-- Check authentication status and permissions
SELECT * FROM check_submission_eligibility();

-- Verify RLS policies
SELECT * FROM debug_submission_auth();

-- Test submission with diagnostic mode
SELECT * FROM submit_toilet(
  '{"name": "Test Toilet", "isAccessible": true}'::jsonb,
  'new', 
  NULL, 
  NULL, 
  '2e62a449-be20-401b-bee0-c4c6c56ff299'::uuid
);

-- Check if activity is being recorded
SELECT * FROM user_activity
WHERE user_id = '2e62a449-be20-401b-bee0-c4c6c56ff299'::uuid
ORDER BY created_at DESC LIMIT 5;

-- Check notifications
SELECT * FROM user_notifications
WHERE user_id = '2e62a449-be20-401b-bee0-c4c6c56ff299'::uuid
ORDER BY created_at DESC LIMIT 5;
```

### Client-Side Authentication Tips

- When getting the authenticated user, always use the proper unpacking pattern:
  ```typescript
  const userResponse = await supabaseService.auth.getUser();
  const user = userResponse?.data?.user;
  ```

- Pass the user ID explicitly to database functions:
  ```typescript
  await supabase.rpc("submit_toilet", {
    p_data: toiletData,
    p_submission_type: "new",
    p_explicit_user_id: user.id
  });
  ```

- Always include try/catch blocks with specific error handling:
  ```typescript
  if (pgError.code === "42501") { // Permission denied
    throw new Error("Permission denied: Please log out and log back in.");
  }
