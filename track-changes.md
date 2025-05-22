# Change Tracking Log

[System Generated - Append Only]

## 2025-05-22 09:17:05 (Asia/Singapore) - Iteration 10

**Action:** Fixed multiple dependent triggers in contribution tracking system

**Files Modified:**
- `supabase/migrations/20250531_fix_toilet_submission_columns.sql`:
  - Fixed dependency errors with multiple triggers for the contribution tracking system
  - Added handling for both insert and delete triggers (update_user_contribution_count_insert and update_user_contribution_count_delete)
  - Added a separate function for decrementing contributions when toilets are deleted
  - Recreated both triggers with their original names instead of using incorrect trigger name
  - Added safeguards to prevent negative contribution counts

**Database Trigger Dependency Fix Details:**
```diff
- Error: "cannot drop function update_user_contribution_count() because other objects depend on it"
+ Success: All dependent triggers properly dropped and recreated in correct order

- Trigger detection: Only identified one trigger dependency
+ Trigger detection: Properly identified both insert and delete trigger dependencies

- Trigger naming: Using wrong trigger name (update_user_stats_on_toilet_insert)
+ Trigger naming: Using correct names (update_user_contribution_count_insert and update_user_contribution_count_delete)

- Delete handling: Missing function for decrementing counts on toilet deletions
+ Delete handling: Added dedicated function with safeguards to prevent negative counts
```

**Root Cause Analysis:**
The error occurred because our migration script was attempting to drop only one trigger (with an incorrect name), but there were actually two triggers dependent on the `update_user_contribution_count()` function. PostgreSQL requires all dependent objects to be dropped before the function itself can be dropped.

**Verification:**
The modifications should:
1. Fix the "cannot drop function update_user_contribution_count() because other objects depend on it" error
2. Ensure user contribution counts are properly incremented and decremented
3. Handle database object dependencies correctly for both triggers
4. Maintain behavior consistency with the original system
5. Add safeguards to prevent negative user contribution counts

**Next Steps:**
1. Run the updated migration script to confirm it works without errors
2. Test that user contribution counts are properly incremented after approving submissions
3. Test that user contribution counts are properly decremented after deleting toilets
4. Consider adding a migration test framework to validate dependencies before deployment
5. Document the contribution tracking system functionality in the technical documentation

## 2025-05-22 09:08:41 (Asia/Singapore) - Iteration 9

**Action:** Fixed database field name mismatch in contribution tracking

**Files Modified:**
- `supabase/migrations/20250531_fix_toilet_submission_columns.sql`:
  - Fixed field name mismatch in the `update_user_contribution_count()` function
  - Added section to drop and recreate the user contribution counter trigger
  - Updated the function to use `submitted_by` field instead of `added_by`
  - Added proper documentation for the contribution tracking function
  - Improved dependency handling for the trigger creation/recreation

**Database Field Mismatch Fix Details:**
```diff
- Error: "record "new" has no field "added_by""
+ Success: Function now references "submitted_by" field which exists in the table

- Function reference: "WHERE id = NEW.added_by"
+ Function reference: "WHERE id = NEW.submitted_by"

- Trigger recreation: Missing for contribution counter
+ Trigger recreation: Explicitly recreated with proper field reference
```

**Root Cause Analysis:**
The issue occurred because the `update_user_contribution_count()` function was trying to access a field called `added_by` in the NEW record when updating user contribution counts, but our schema uses `submitted_by` as the field name in the toilets table. This mismatch caused the SQL error when trying to approve a toilet submission.

**Verification:**
The modifications should:
1. Fix the "record "new" has no field "added_by"" error
2. Ensure user contribution counts are properly updated when submissions are approved
3. Handle database object dependencies correctly
4. Add clear documentation about the field naming
5. Maintain a consistent naming scheme across the database schema

**Next Steps:**
1. Run the updated migration script to confirm it works without errors
2. Test that user contribution counts are properly incremented after approving submissions
3. Consider implementing a schema validation tool to catch field name mismatches in the future
4. Review other database functions for similar field name inconsistencies

## 2025-05-22 09:01:44 (Asia/Singapore) - Iteration 8

**Action:** Fixed database migration function dependency issue

**Files Modified:**
- `supabase/migrations/20250531_fix_toilet_submission_columns.sql`:
  - Fixed function dependency error by properly handling trigger dependencies
  - Modified DROP FUNCTION workflow to first drop dependent triggers
  - Added explicit recreation of the trigger after function definition
  - Added helpful comments on database functions
  - Improved migration script ordering to handle dependencies correctly

**Database Migration Fix Details:**
```diff
- Error: "cannot drop function process_approved_submission() because other objects depend on it"
+ Success: Function and dependent triggers properly dropped and recreated in correct order

- Migration approach: Direct function replacement (causing dependency errors)
+ Migration approach: Dependency-aware function replacement (drop trigger → drop function → create function → recreate trigger)

- Trigger handling: Missing explicit recreation
+ Trigger handling: Explicitly recreated with proper documentation
```

**Root Cause Analysis:**
The issue occurred because the migration script was trying to drop the `process_approved_submission()` function directly without first dropping the dependent trigger `on_submission_status_change`. PostgreSQL prevents dropping objects that have dependencies to avoid broken references.

**Verification:**
The modifications should:
1. Fix the "cannot drop function process_approved_submission() because other objects depend on it" error
2. Ensure the migration script runs in the correct order to handle dependencies
3. Properly recreate all objects in the right sequence
4. Include better documentation and comments for future maintenance
5. Maintain all previous fixes for the database schema and submission functions

**Next Steps:**
1. Run the updated migration script to confirm it works without errors
2. Consider implementing a more comprehensive testing strategy for database migrations
3. Add automated validation of database object dependencies in future migrations

## 2025-05-22 08:50:30 (Asia/Singapore) - Iteration 7

**Action:** Fixed database toilet submission schema issues

**Files Modified:**
- `supabase/migrations/20250531_fix_toilet_submission_columns.sql`:
  - Created new migration file to fix missing columns in the toilets table
  - Added missing columns: description, address, building_name, submitted_by, last_edited_by, updated_at
  - Updated process_approved_submission() function to handle proper field mapping
  - Added smart handling of location data conversion from JSON to PostGIS point
  - Implemented better data type handling for photos array
  - Fixed camelCase to snake_case field mapping issues
  - Created improved check_submission_eligibility() function without polpermission reference

**Database Schema Fix Details:**
```diff
- Schema mismatch: Function references columns that don't exist in toilets table
+ Schema aligned: All referenced columns now exist with appropriate data types

- Error on approval: "column "description" of relation "toilets" does not exist"
+ Successful approval: All submissions can be properly inserted into toilets table

- Field mapping: No conversion between submission JSON and database columns
+ Field mapping: Proper conversion with fallbacks (name → description)

- Location handling: Direct insertion causing data type mismatch
+ Location handling: Proper conversion from {latitude, longitude} to PostGIS point
```

**Root Cause Analysis:**
The issue occurred because the trigger function `process_approved_submission()` was trying to insert data into columns that didn't exist in the `toilets` table. Additionally, there were data format mismatches between the submission JSON structure and the expected database column formats.

**Verification:**
The modifications should:
1. Fix the "column "description" of relation "toilets" does not exist" error
2. Allow toilet submissions to be properly approved and inserted into the toilets table
3. Handle data format conversions appropriately (JSON → PostGIS, camelCase → snake_case)
4. Provide backwards compatibility with existing data
5. Fix the eligibility check function without reference to non-existent columns

**Next Steps:**
1. Deploy the migration and test the approval process with real submissions
2. Consider implementing schema validation for submissions to prevent future mismatches
3. Document the database schema and submission format for future reference

## 2025-05-22 08:24:50 (Asia/Singapore) - Iteration 6

**Action:** Fixed backend duplicate toilet submission issue

**Files Modified:**
- `src/services/contributionService.ts`:
  - Added backend submission deduplication mechanism
  - Implemented `generateSubmissionHash` for unique submission fingerprinting
  - Added `isDuplicateSubmission` check with configurable time window (default 10s)
  - Added `recordSubmission` to track successful submissions
  - Added memory management with `cleanupOldSubmissions`
  - Improved error messages for duplicate submission attempts

- `supabase/migrations/20250530_fix_polpermission_column_error.sql`:
  - Created new migration file to fix eligibility check database error
  - Replaced problematic function causing "column 'polpermission' does not exist" error
  - Added proper permissions and documentation

**Bug Fix Details:**
```diff
- Backend behavior: Multiple identical submissions processed even with frontend protection
+ Backend behavior: Duplicate submissions detected and rejected with clear error messages

- Error in logs: "column 'polpermission' does not exist" during eligibility check
+ Fixed eligibility check: Simplified function without reference to non-existent columns

- Database security: Session-only based protection (vulnerable to network race conditions)
+ Database security: Session protection + content-based deduplication with 10-second window
```

**Root Cause Analysis:**
Two separate issues were identified:
1. The frontend fix prevented button double-clicks but didn't protect against network/service level duplication
2. The eligibility check function in the database referenced a non-existent column "polpermission"

**Verification:**
The modifications should:
1. Prevent duplicate submissions at the service level, even if somehow multiple requests are sent
2. Provide clear error messages when duplicate submissions are detected
3. Fix the database error during eligibility checks
4. Track submissions with a configurable time window to prevent abuse
5. Include memory management to prevent memory leaks from submission tracking

**Next Steps:**
1. Consider making the duplicate detection window configurable via environment variables
2. Implement similar protection for edit/report submissions
3. Add analytics to track how often duplicates are prevented

## 2025-05-22 08:04:00 (Asia/Singapore) - Iteration 5

**Action:** Fixed duplicate toilet submission issue

**Files Modified:**
- `src/components/contribute/AddToiletReview.tsx`:
  - Added `useRef` hook to track submission status synchronously
  - Implemented submission guard with `isSubmittingRef` to prevent multiple submissions
  - Enhanced handleSubmit function with ref-based protection
  - Improved comments explaining the duplicate submission prevention
  - Added early return when submission is already in progress

**Bug Fix Details:**
```diff
- Form submission: Vulnerable to rapid double-clicks causing duplicate submissions
+ Form submission: Protected by synchronous ref check before state updates

- Protection mechanism: Only React state (updates asynchronously)
+ Protection mechanism: Dual protection (synchronous ref + asynchronous state)

- Console output: Multiple identical submission attempts within milliseconds
+ Console output: "Prevented duplicate submission attempt" logged when detected
```

**Root Cause Analysis:**
The issue occurred because React's state updates are asynchronous. When a user clicked the submit button multiple times in quick succession, multiple submission attempts could occur before the UI updated to disable the button. This caused duplicate toilet entries in the database with different IDs but identical content.

**Verification:**
The modifications should:
1. Prevent duplicate submissions even with rapid button clicks
2. Provide immediate synchronous protection before React state updates
3. Add helpful debug logging when duplicate submission attempts are detected
4. Maintain proper submission state tracking even during async operations
5. Resolve the reported issue of "duplicate entry" in toilet submissions

**Next Steps:**
1. Consider investigating the eligibility check warning in logs: `"column "polpermission" does not exist"`
2. Explore adding server-side deduplication as an additional safety layer
3. Consider applying similar protection to other submission forms in the app

## 2025-05-22 00:14:00 (Asia/Singapore) - Iteration 1

**Action:** Fixed excessive location and toilet list refreshing issues

**Files Modified:**
- `src/services/location.ts`:
  - Increased location update time interval from 10s to 60s
  - Increased location update distance interval from 10m to 100m

- `src/stores/toilets.ts`:
  - Added Coordinates interface for location tracking
  - Implemented calculateDistance function using Haversine formula
  - Added shouldFetchNewData function with time and distance thresholds
  - Updated ToiletState interface with lastFetchLocation and lastFetchTime
  - Modified fetchNearbyToilets to use caching logic
  - Added proper state updates to track fetch history

- `src/components/map/MapView.tsx`:
  - Added isRefreshing state to track location updates
  - Modified handleLocationUpdate to only animate map on first fix
  - Added visual refresh indicator to show data loading status
  - Added styling for refresh indicator

**Performance Improvements:**
```diff
- Location updates: Every 10 seconds or 10 meters
+ Location updates: Every 60 seconds or 100 meters

- Toilet data fetch: On every location change
+ Toilet data fetch: Only when moved >100m or cache >5min old

- UI behavior: Constant map centering on every update
+ UI behavior: Map centers only on first fix or manual tap
```

**Verification:**
The modifications should:
1. Significantly reduce the frequency of location updates
2. Dramatically decrease the number of API calls to fetch toilet data
3. Provide better visual feedback during refresh operations
4. Eliminate the annoying constant refreshing reported by the user

**Next Steps:**
1. Test the solution with varying location scenarios
2. Consider implementing offline data capabilities
3. Explore options for further battery optimization

## 2025-05-22 00:24:40 (Asia/Singapore) - Iteration 2

**Action:** Implemented log throttling to reduce excessive console output

**Files Modified:**
- `src/utils/debug.ts`:
  - Added new `throttledLog` method to support time-based log filtering
  - Maintains log history with a Map to track when specific logs were last shown

- `src/components/map/AnimatedMarker.tsx`:
  - Replaced direct debug.log calls with throttled version
  - Applied 60-second throttle interval for marker rendering logs
  - Added unique log keys based on marker coordinates

- `src/components/map/MapView.tsx`:
  - Replaced location update logs with throttled version
  - Implemented 30-second throttle interval for location updates
  - Added explanatory comments

- `src/stores/toilets.ts`:
  - Added 30-second throttling to cache check logs
  - Added 30-second throttling to "skipping fetch" logs
  - Kept critical logs like cache expiration and significant movement unthrottled
  - Enhanced logging with more descriptive keys

**Performance Improvements:**
```diff
- Debug logs: Displayed on every render/update (multiple times per second)
+ Debug logs: Throttled by component (markers: 60s, location/cache: 30s)

- Console output: Repetitive, noisy, and hard to follow
+ Console output: Cleaner, meaningful, and focused on important events

- Developer experience: Overwhelmed with redundant information
+ Developer experience: Clear visibility of system state changes
```

**Verification:**
The modifications should:
1. Drastically reduce the number of logs appearing in the console
2. Maintain important debugging information at reasonable intervals
3. Preserve critical logs for significant events (cache expiration, location changes)
4. Fix the "repetitive and annoying" logging issue reported by the user
5. Improve development experience with cleaner console output

**Next Steps:**
1. Test the solution during active app usage
2. Consider adding a debug settings screen to enable/disable specific log categories
3. Explore extending the throttling approach to other verbose components

## 2025-05-22 00:37:15 (Asia/Singapore) - Iteration 3

**Action:** Fixed authentication session persistence issues

**Files Modified:**
- `src/services/supabase.ts`:
  - Enhanced session expiration validation with better timestamp handling
  - Added needsForceRefresh flag to detect invalid expiration timestamps
  - Implemented retry mechanism with exponential backoff for session refresh
  - Added verification after refresh to ensure session validity

- `src/services/contributionService.ts`:
  - Increased session validation timeout from 5s to 10s
  - Increased session refresh timeout from 5s to 12s
  - Implemented withRetry utility for robust operation retries
  - Added better error categorization for different authentication errors
  - Improved session validation flow with verification step

- `src/providers/AuthProvider.tsx`:
  - Enhanced session health monitoring
  - Increased session refresh threshold from 5 minutes to 10 minutes
  - Added verification step after session refresh
  - Improved handling for invalid session timestamps

**Authentication Improvements:**
```diff
- Session validation: Simple timestamp check with 5s timeout
+ Session validation: Enhanced timestamp validation with 10s timeout

- Session refresh: Single attempt with 5s timeout
+ Session refresh: Multiple retries with exponential backoff and 12s timeout

- Session monitoring: Refresh if <5 minutes remaining
+ Session monitoring: Refresh if <10 minutes remaining or invalid timestamp

- Error handling: Generic "Authentication check failed" message
+ Error handling: Specific messages for timeout, refresh failure, etc.
```

**Verification:**
The modifications should:
1. Fix the "Authentication check failed: Please log in again" errors during toilet submissions
2. Make the application more resilient to network issues during authentication
3. Handle invalid session timestamps more gracefully
4. Provide better feedback to users when authentication issues occur
5. Reduce the frequency of auth-related errors by proactively handling sessions

**Next Steps:**
1. Test the solution with various network conditions
2. Monitor session refresh success rates in production
3. Consider implementing offline submission capability with later sync

## 2025-05-22 00:54:00 (Asia/Singapore) - Iteration 4

**Action:** Enhanced authentication session persistence with timestamp normalization

**Files Modified:**
- `src/services/supabase.ts`:
  - Added smart timestamp normalization to handle multiple date formats
  - Implemented automatic detection and conversion between Unix timestamps and ISO dates
  - Added detailed session status reporting with specific error conditions
  - Fixed the issue with Unix seconds vs. milliseconds timestamp confusion

- `src/services/contributionService.ts`:
  - Improved session validation queue management to prevent duplicate operations
  - Fixed private method issues causing TypeScript errors in object literal
  - Added detailed error messages based on specific session issues
  - Enhanced error handling with more granular session status checks
  - Fixed validation promise tracking with proper clean-up

- `src/providers/AuthProvider.tsx`:
  - Updated session health monitoring to utilize detailed status reporting
  - Added specific handling for different timestamp format issues
  - Implemented smarter retry logic based on error type
  - Better diagnostic reporting for timestamp-related issues

- `docs/auth-debugging-guide.md`:
  - Added detailed section on timestamp format issues and normalization
  - Documented the `detailedStatus` field and its possible values
  - Updated recent improvements section with timestamp normalization details
  - Added more comprehensive error diagnosis guidance

**Authentication Improvements:**
```diff
- Timestamp handling: Assumed consistent format (causing validation failures)
+ Timestamp handling: Smart normalization of Unix timestamps and ISO dates

- Session status: Simple valid/invalid binary state
+ Session status: Detailed status with specific error conditions

- Session queue: Multiple parallel refresh attempts
+ Session queue: Managed queue with deduplication of refresh operations

- Error diagnosis: Generic "Authentication failed" messages
+ Error diagnosis: Specific messages based on timestamp issues
```

**Verification:**
The modifications should:
1. Fix the critical issue of "Session expiration date is far in the past" errors
2. Properly handle the conversion between Unix timestamps and ISO date strings
3. Provide much better diagnostic information for auth-related issues
4. Prevent duplicate session refresh operations that could cause conflicts
5. Make the authentication system more resilient against format inconsistencies

**Next Steps:**
1. Monitor logs for any remaining timestamp-related issues
2. Consider adding a visual session health indicator for users
3. Explore adding an automatic re-authentication flow for persistent issues
