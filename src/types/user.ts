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
  // Stats fields
  reviews_count?: number;
  contributions_count?: number;
  followers_count?: number;
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
  signIn: (email: string, password: string) => Promise<{ error?: unknown }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { full_name?: string }
  ) => Promise<{ error?: unknown }>;
  signOut: () => Promise<{ error?: unknown }>;
  resetPassword: (email: string) => Promise<{ error?: unknown }>;
  updatePassword: (newPassword: string) => Promise<{ error?: unknown }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile | null>;
}
