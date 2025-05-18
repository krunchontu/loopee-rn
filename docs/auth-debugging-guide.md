# Authentication Debugging Guide

## Overview

The Loopee application includes a comprehensive authentication debugging system that provides detailed insights into login, registration, and session management processes. This guide explains how to use these tools to troubleshoot auth-related issues.

## Architecture

The auth debugging system consists of:

1. **AuthDebugger** - A specialized logging utility for auth operations (`src/utils/AuthDebugger.ts`)
2. **Enhanced service layer** - Auth operations in `src/services/supabase.ts` with detailed logging
3. **UI component logging** - Form validation and interaction logging in auth screens
4. **Performance tracking** - Timers for measuring auth operation performance

## How to Enable Auth Debugging

Auth debugging is automatically enabled in development builds. To enable verbose logging:

```typescript
import { debug } from './utils/debug';

// Enable verbose debug mode
debug.enableVerboseLogging();
```

For production troubleshooting, you can selectively enable auth debugging in your app's debug screen.

## Understanding Auth Logs

### Log Format

All auth logs follow a consistent format:

```
[Auth] [EVENT_TYPE][STATUS] Details...
```

For example:
```
[Auth] [SIGNIN][attempt] { email: "j***e@example.com", hasPassword: true }
[Auth] [SIGNIN][success] { userId: "abc-123", hasSession: true }
```

### Event Types

The system tracks these event types:

- `SIGNUP` - User registration events
- `SIGNIN` - Login attempts
- `SIGNOUT` - Logout operations
- `PASSWORD_RESET` - Password reset requests
- `PASSWORD_UPDATE` - Password change operations
- `SESSION_REFRESH` - Session token refreshes
- `PROFILE_UPDATE` - User profile changes
- `STATE_CHANGE` - Auth state transitions

### Status Types

Each event has a status:

- `attempt` - Operation was initiated
- `success` - Operation completed successfully
- `failure` - Operation failed
- `validation_error` - Form validation failed
- `network_error` - Network/API communication error
- `info` - Informational event

## Performance Metrics

Auth operations are automatically timed and logged:

```
[Performance] auth_signin: 532.00ms
[Performance] login_form_submission: 1245.00ms
```

Key metrics include:

- `auth_initialization` - Time to initialize auth state on app launch
- `auth_state_update` - Time to process auth state changes
- `signup`/`signin`/`signout` - Backend auth operations
- `profile_fetch`/`profile_update` - User profile operations
- `session_fetch` - Session retrieval time
- `password_reset`/`password_update` - Password operations
- `*_ui_flow` - End-to-end UI operation time (e.g., `sign_in_ui_flow`)

## Common Debugging Scenarios

### 1. Login Failures

When a user can't log in, check:

- `[SIGNIN][validation_error]` logs - Form validation issues
- `[SIGNIN][failure]` logs - Backend auth failures with error codes
- `[SIGNIN][network_error]` logs - API communication problems

Example issue identification:
```
[Auth] [SIGNIN][failure] { errorCode: "auth/invalid-email", ... }
```

### 2. Registration Issues

When users can't register:

- `[SIGNUP][validation_error]` - Form validation problems
- `[SIGNUP][failure]` - API registration errors (e.g., duplicate email)

### 3. Session Problems

When sessions expire unexpectedly:

- `[SESSION_REFRESH][failure]` - Failed token refreshes
- `[STATE_CHANGE]` events - Auth state transitions

### 4. Performance Bottlenecks

If auth operations are slow:

- Compare performance metrics across different devices and network conditions
- Look for consistently slow operations
- Check UI flow timings vs. backend operation timings

### 5. User Profile Issues

When users encounter profile-related errors:

- Check for `[PROFILE_UPDATE][failure]` logs - Especially with code `PGRST116` which indicates missing profiles
- Verify profile creation during registration with `[PROFILE_UPDATE][success]` logs
- Look for `auto_create_profile` actions in logs which indicate the system found and fixed a missing profile

For comprehensive information about the profile system and recent fixes, refer to the [Auth Profile System Documentation](./auth-profile-system.md).

## Privacy & Security

The auth debugging system is designed with privacy in mind:

- Emails are automatically masked (e.g., `j***e@example.com`)
- Passwords are never logged
- Authentication tokens are redacted
- Only non-PII data is included in logs

## Extending the System

To add logging to new auth-related components:

1. Import the auth debugger:
   ```typescript
   import { authDebug } from '../utils/AuthDebugger';
   ```

2. Add logging at key points:
   ```typescript
   authDebug.log('EVENT_TYPE', 'status', { 
     // Include relevant debugging information
     relevantField: value,
     timestamp: new Date().toISOString()
   });
   ```

3. Track performance when needed:
   ```typescript
   const endTracking = authDebug.trackPerformance('operation_name');
   try {
     // Perform operation...
   } finally {
     endTracking(); // Complete timing
   }
   ```

## Troubleshooting Tips

1. **Check for form validation errors first** - Often issues occur before backend calls
2. **Look at performance metrics** - Unusually slow operations may indicate issues
3. **Check network conditions** - Auth failures often correlate with connectivity problems
4. **Compare failure patterns** - Look for common error codes across multiple failures
5. **Examine state change events** - Auth state transitions can reveal unexpected behavior

## Need Further Help?

For complex auth debugging scenarios, analyze the logs in this order:

1. UI component logs (validation, input changes)
2. Form submission logs
3. Auth provider logs
4. Supabase service logs
5. State change events

This top-down approach helps isolate whether issues occur in the UI layer, state management, or backend services.
