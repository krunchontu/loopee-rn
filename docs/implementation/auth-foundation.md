# Authentication System Implementation

This document details the implementation of the authentication system for Loopee.

## Overview

The authentication system provides:
- User registration and login
- Profile management
- Session handling
- Authorization controls

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
│   └── AuthProvider.tsx       # Auth context provider
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
    └── authService.ts         # Auth API functions
```

## Implementation Steps

### Step 1: Configure Supabase Auth

1. Update Supabase configuration
2. Configure auth providers (email, social)
3. Set up auth redirects

### Step 2: Create Auth Provider

Implement React Context for global auth state:
- Session management
- User information
- Login/logout functions
- Registration handler

```typescript
// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setLoading(false);
    };

    fetchSession();

    // Subscribe to auth changes
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    // Clean up subscription
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Auth methods
  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
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
- Error announcements
- Keyboard navigation
- Color contrast compliance
- Screen reader support

## Rollout Plan

1. Deploy auth backend changes
2. Enable new user registration
3. Add profile management
4. Implement authorization controls

## Monitoring and Analytics

Track:
- Registration conversion rate
- Login success/failure rates
- Password reset usage
- Profile completion rate

## Rollback Plan

If issues occur:
1. Disable new user registration
2. Fallback to previous authentication if needed
3. Preserve user data during rollback
