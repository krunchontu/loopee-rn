/**
 * @file Authentication Provider
 *
 * Provides authentication state and methods to the application
 * through React Context. Manages user sessions, login state, and
 * user profile data.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabaseService } from "../services/supabase";
import { AuthState, AuthContextValue, UserProfile } from "../types/user";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { debug } from "../utils/debug";

// Create the auth context with default values
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Custom hook to access auth context
 * @returns The auth context value
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider component
 *
 * Manages authentication state and provides auth methods to the entire app.
 * Handles:
 * - User session persistence
 * - Login/logout flow
 * - Profile data management
 * - Loading states
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Auth state
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data, error } = await supabaseService.auth.getSession();

        if (error) {
          debug.error("Auth", "Failed to get session", error);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // If no session, set not authenticated
        if (!data.session) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Get user
        const user = await supabaseService.auth.getUser();

        if (!user) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Get user profile
        const profile = await supabaseService.auth.getProfile();

        // Update auth state
        setState({
          user,
          profile,
          isLoading: false,
          isAuthenticated: !!user,
        });
      } catch (error) {
        debug.error("Auth", "Failed to initialize auth", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data } = supabaseService.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        debug.log("Auth", "Auth state changed", { event });

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (!session?.user) return;

          // Get user profile
          const profile = await supabaseService.auth.getProfile();

          setState({
            user: session.user,
            profile,
            isLoading: false,
            isAuthenticated: true,
          });
        } else if (event === "SIGNED_OUT") {
          // Reset state
          setState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    // Cleanup subscription
    return () => {
      data?.subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.signIn({ email, password });

      if (error) {
        debug.error("Auth", "Sign in failed", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error };
      }

      return {};
    } catch (error) {
      debug.error("Auth", "Sign in failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error };
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string }
  ) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.signUp({
        email,
        password,
        metadata,
      });

      if (error) {
        debug.error("Auth", "Sign up failed", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error };
      }

      return {};
    } catch (error) {
      debug.error("Auth", "Sign up failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.signOut();

      if (error) {
        debug.error("Auth", "Sign out failed", error);
      }

      // Reset state - we don't wait for the auth state change event
      setState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      debug.error("Auth", "Sign out failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Request password reset
   */
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabaseService.auth.resetPassword(email);

      if (error) {
        debug.error("Auth", "Password reset failed", error);
        return { error };
      }

      return {};
    } catch (error) {
      debug.error("Auth", "Password reset failed", error);
      return { error: error as Error };
    }
  };

  /**
   * Update password
   */
  const updatePassword = async (newPassword: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.updatePassword(newPassword);

      setState((prev) => ({ ...prev, isLoading: false }));

      if (error) {
        debug.error("Auth", "Password update failed", error);
        return { error };
      }

      return {};
    } catch (error) {
      debug.error("Auth", "Password update failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error };
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const profile = await supabaseService.auth.updateProfile(data);

      setState((prev) => ({
        ...prev,
        profile,
        isLoading: false,
      }));

      return profile;
    } catch (error) {
      debug.error("Auth", "Profile update failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return null;
    }
  };

  // Combine state and methods into context value
  const contextValue: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
