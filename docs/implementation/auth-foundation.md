# Authentication System Implementation

This document details the implementation of the authentication system for Loopee.

## Overview

The authentication system provides:
- User registration and login
- Profile management
- Session handling with state persistence
- Authorization controls
- Proactive token management

## Feature Branch

- **Branch Name**: `feature/auth-foundation`
- **Based On**: `develop`
- **Merge Target**: `develop`

## Database Schema Changes

```sql
-- Users Profile Table
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profile on user signup
CREATE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id, 
    'user_' || floor(random() * 1000000)::text, 
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Component Structure

```
src/
├── providers/
│   └── AuthProvider.tsx       # Auth context provider with session monitoring
│
├── components/
│   └── auth/
│       ├── FormInput.tsx      # Reusable form input
│       ├── SocialButtons.tsx  # Social login buttons
│       └── PasswordField.tsx  # Password input with toggle
│
├── screens/
│   └── auth/
│       ├── LoginScreen.tsx    # Login screen
│       ├── RegisterScreen.tsx # Registration screen 
│       └── ProfileScreen.tsx  # Profile management
│
└── services/
    ├── supabase.ts           # Supabase client singleton & session utilities
    ├── authService.ts        # Auth API functions
    ├── contributionService.ts # User content submission with session validation
    └── profileService.ts     # Profile management with auth integration
```

## Architecture Improvements

### Supabase Client Singleton

To ensure consistent authentication state across the application, we've implemented a singleton pattern:

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

  // Additional session management methods
  static async refreshSession(): Promise<boolean> {
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

### Session Health Monitoring

To prevent authentication failures due to expired tokens, we've added proactive monitoring:

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
      // Log monitoring errors
    }
  }, 60000); // Check health every minute

  return () => clearInterval(sessionHealthInterval);
}, [state.isLoading, state.isAuthenticated, state.user]);
```

## Implementation Steps

### Step 1: Configure Supabase Auth

1. Update Supabase configuration
2. Configure auth providers (email, social)
3. Set up auth redirects
4. Configure persistent storage (AsyncStorage for React Native)

### Step 2: Create Supabase Client Singleton

1. Implement the `SupabaseClientSingleton` class
2. Add session management utilities
3. Add session health check functionality
4. Create export convenience methods

### Step 3: Create Enhanced Auth Provider

Implement React Context for global auth state with advanced features:

```typescript
// src/providers/AuthProvider.tsx - Enhanced version
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { 
  supabaseService,
  refreshSession,
  checkSession 
} from '../services/supabase';
import { profileService } from '../services/profileService';
import { debug } from '../utils/debug';
import { authDebug } from '../utils/AuthDebugger';

// Enhanced interface with additional methods and proper typing
interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: Error }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
  updatePassword: (newPassword: string) => Promise<{ error?: AuthError }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile | null>;
}

// Create context with proper typing
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true, 
    isAuthenticated: false,
  });

  // Initialize auth state with performance tracking
  useEffect(() => {
    const initializeAuth = async () => {
      // Start tracking performance
      const endTracking = authDebug.trackPerformance("auth_initialization");
      
      try {
        // Get current session with enhanced error handling
        const { data, error } = await supabaseService.auth.getSession();
        
        if (error) {
          authDebug.log("STATE_CHANGE", "failure", {
            action: "get_session",
            error: error.message,
          });
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        
        // If no session, set not authenticated
        if (!data.session) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Get user and profile data
        const user = await supabaseService.auth.getUser();
        const profile = await supabaseService.auth.getProfile();
        
        setState({
          user,
          profile,
          isLoading: false,
          isAuthenticated: !!user,
        });
      } catch (error) {
        debug.error("Auth", "Failed to initialize auth", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      } finally {
        // End performance tracking
        endTracking();
      }
    };

    initializeAuth();
    
    // Subscribe to auth changes with enhanced logging
    const { data } = supabaseService.auth.onAuthStateChange(
      async (event, session) => {
        // Handle auth state changes with proper logging
        // and automatic profile management
      }
    );
    
    return () => data?.subscription.unsubscribe();
  }, []);
  
  // Add session health monitoring
  useEffect(() => {
    // Session health check implementation
    // ...
  }, [state.isLoading, state.isAuthenticated, state.user]);

  // Enhanced auth methods with proper error handling
  // and type safety...

  return (
    <AuthContext.Provider value={...}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Step 3: Build Auth UI Components

Create reusable components:
- Form inputs with validation
- Login form
- Registration form
- Password reset flow
- Error handling components with proper error messages

### Step 4: Implement Profile Management

Create profile screens:
- View profile
- Edit profile
- Avatar upload
- Account settings

### Step 5: Add Authorization Controls

Implement access controls:
- Protected routes
- Permission checks
- Role-based access

## Testing Strategy

- **Unit Tests**: Test authentication services, validation logic
- **Component Tests**: Test UI components in isolation
- **Integration Tests**: Test the auth flow end-to-end
- **Security Tests**: Test for vulnerabilities, token handling

## Accessibility Considerations

- Proper form labeling
- Error announcements with specific error messages
- Keyboard navigation
- Color contrast compliance
- Screen reader support
- Session timeout warnings
- Auth state indicators

## Rollout Plan

1. Deploy auth backend changes
2. Enable new user registration
3. Add profile management
4. Implement authorization controls

## Monitoring and Authentication Debugging

Track:
- Registration conversion rate
- Login success/failure rates
- Password reset usage
- Profile completion rate
- Session duration and health
- Token refresh patterns
- Authentication error types and frequency

Enhanced debugging capabilities:
```typescript
// src/utils/AuthDebugger.ts
export class AuthDebugger {
  // Log authentication events with structured data
  static log(category: string, level: string, data: any) {
    debug.log(`[Auth] [${category}][${level}]`, data);
  }
  
  // Track performance metrics
  static trackPerformance(operation: string) {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      debug.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`);
    };
  }
}
```

## Rollback Plan

If issues occur:
1. Disable new user registration
2. Fallback to previous authentication if needed
3. Preserve user data during rollback
