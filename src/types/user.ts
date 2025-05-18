/**
 * @file User-related types
 *
 * Contains types for user profiles, authentication, and related data structures.
 */

/**
 * User profile information
 * Maps to the user_profiles table in Supabase
 */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

import { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Authentication state
 * Used in the AuthProvider context
 */
export interface AuthState {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Auth context value
 * Provides authentication state and methods
 */
export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { full_name?: string }
  ) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: Error }>;
  updatePassword: (newPassword: string) => Promise<{ error?: Error }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile | null>;
}
