# Authentication Debugging Guide

## Session Persistence Issues

This document outlines common authentication issues related to session persistence and provides guidance on troubleshooting and fixing them.

### Common Issues

1. **Session Expiration Problems**
   - Invalid expiration timestamps causing premature session invalidation
   - Timeout errors during session validation or refresh
   - Failed session refresh attempts due to network issues
   - "Authentication check failed" errors during critical operations

2. **Authentication Error Messages**
   - "Authentication check failed: Please log in again"
   - "Authentication check timed out"
   - "Operation 'session refresh' timed out after 5000ms"
   - "Authentication expired: Please log in again"

### Session Validation Flow

Our application uses the following flow for validating sessions:

1. Check session validity and expiration time
2. If session is valid and not expiring soon, proceed with operation
3. If session is invalid or expiring soon, attempt to refresh it
4. Verify the refreshed session is valid
5. If all refresh attempts fail, prompt user to log in again

### Timeout and Retry Configuration

| Operation | Timeout (ms) | Retries | Backoff Strategy |
|-----------|--------------|---------|------------------|
| Session validation | 10000 | 0 | N/A |
| Session refresh | 12000 | 2 | Exponential (1s, 2s, 4s) |
| General API operations | 15000 | 0 | N/A |

### Debugging Tips

#### Diagnosing Session Issues

Look for these log patterns to identify session problems:

```
WARN  [Supabase] Session expiration date is far in the past
LOG   [Auth] [SESSION_REFRESH][attempt]
ERROR [contributionService] [ensureValidSession] Session validation error
```

#### Debugging Invalid Timestamps

The system now detects and handles these edge cases:
- Expiration timestamps more than a day in the past
- Expiration timestamps more than 30 days in the future
- Invalid or non-parseable timestamp formats

#### Network-Related Issues

To diagnose if the issue is network related:
- Check for "timed out" messages in the logs
- Look for retry attempts in logs (e.g., "Retry attempt 1/2")
- Verify if all retry attempts failed with "all_attempts_failed" status

### Timestamp Format Issues

A critical issue we identified and fixed was related to timestamp format interpretation:

1. **Unix Timestamp vs. ISO String Date Format**
   - Problem: The Supabase session expiration (`expires_at`) can be returned as a Unix timestamp (seconds since epoch) or an ISO string date
   - Symptoms: Error logs showing "Session expiration date is far in the past" with extremely negative `expiresIn` values
   - Impact: Authentication checks failing with "Please log in again" errors, especially during data submissions

2. **Timestamp Normalization Fix**
   - Implemented a smart timestamp detection and normalization function
   - Automatically detects and handles:
     - Unix timestamps (seconds since epoch, ~10 digits)
     - JavaScript timestamps (milliseconds since epoch, ~13 digits)
     - ISO string dates (e.g., "2025-05-21T16:27:23.966Z")
     - Other parseable date strings
   - Provides a consistent Date object output regardless of input format

3. **Detailed Session Status Reporting**
   - Added a `detailedStatus` field to session checks with values like:
     - `"valid"` - Everything is normal
     - `"expired_past"` - Expiration date is far in the past
     - `"suspicious_future"` - Expiration date is suspiciously far in the future
     - `"just_expired"` - Session just expired
     - `"expiring_soon"` - Session expires in less than 10 minutes
     - `"invalid_date"` - Unparseable timestamp format
     - `"missing_expiration"` - No expiration time found
   - This provides more specific handling for different error conditions

### Recent Improvements

We recently implemented the following enhancements to improve session persistence:

1. **Enhanced Session Validation**
   - Added robust timestamp normalization and validation
   - Implemented comprehensive timestamp format detection
   - Added `detailedStatus` reporting for better error diagnosis
   - Increased validation timeout from 5s to 10s for slower connections

2. **Improved Session Refresh Mechanism**
   - Added retry mechanism with smarter retry counts based on error type
   - Implemented verification step after refresh to confirm success
   - Increased refresh timeout from 5s to 12s
   - Added up to 3 retries for timestamp-related issues

3. **More Proactive Session Management**
   - Session health monitoring every minute with detailed status checks
   - Proactive refresh when session is <10 minutes from expiration
   - Better error categorization for user feedback
   - Session queue management to prevent duplicate refresh operations

### Fixing Common Problems

#### "Authentication check failed" Errors

If users report this error:
1. Check if they're on a slow or unstable connection
2. Verify if there are session expiration issues in logs
3. Look for "all_attempts_failed" messages in logs

#### Network Timeout Issues

For timeout-related errors:
1. Confirm user's network stability
2. Check if the issue happens with specific API operations
3. Consider increasing the timeout for problematic operations

#### Session Not Persisting Between App Launches

If session state is lost between app launches:
1. Verify Supabase client configuration has `persistSession: true`
2. Ensure secure storage is working correctly
3. Check for any clearing of storage during app lifecycle events

### Future Considerations

- Implement offline submission with later synchronization
- Add user-facing session recovery mechanisms
- Improve network failure resilience with Circuit Breaker pattern
