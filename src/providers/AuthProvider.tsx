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
import { authDebug } from "../utils/AuthDebugger";

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
      // Log auth initialization
      authDebug.log("STATE_CHANGE", "info", {
        action: "initialize_auth",
        timestamp: new Date().toISOString(),
      });

      // Start tracking performance
      const endTracking = authDebug.trackPerformance("auth_initialization");

      try {
        // Get current session
        const { data, error } = await supabaseService.auth.getSession();

        if (error) {
          authDebug.log("STATE_CHANGE", "failure", {
            action: "get_session",
            error: error.message,
          });
          debug.error("Auth", "Failed to get session", error);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Log session state
        authDebug.log("STATE_CHANGE", "info", {
          action: "get_session",
          hasSession: !!data.session,
          expiresAt: data.session?.expires_at,
        });

        // If no session, set not authenticated
        if (!data.session) {
          authDebug.log("STATE_CHANGE", "info", {
            action: "initialize_auth",
            result: "no_active_session",
          });
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Get user
        const user = await supabaseService.auth.getUser();

        if (!user) {
          authDebug.log("STATE_CHANGE", "info", {
            action: "initialize_auth",
            result: "user_not_found",
          });
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Get user profile
        const profile = await supabaseService.auth.getProfile();

        // Log successful initialization
        authDebug.log("STATE_CHANGE", "success", {
          action: "initialize_auth",
          userId: user.id,
          hasProfile: !!profile,
        });

        // Update auth state
        setState({
          user,
          profile,
          isLoading: false,
          isAuthenticated: !!user,
        });
      } catch (error) {
        authDebug.log("STATE_CHANGE", "failure", {
          action: "initialize_auth",
          error,
        });
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
      async (event: AuthChangeEvent, session: Session | null) => {
        authDebug.log("STATE_CHANGE", "info", {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          providerType: session?.user?.app_metadata?.provider,
          timestamp: new Date().toISOString(),
        });

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (!session?.user) {
            authDebug.log("STATE_CHANGE", "failure", {
              event,
              error: "Session exists but user is missing",
            });
            return;
          }

          // Start tracking performance
          const endTracking = authDebug.trackPerformance("auth_state_update");

          try {
            // Get user profile
            const profile = await supabaseService.auth.getProfile();

            // Log successful state update
            authDebug.log("STATE_CHANGE", "success", {
              event,
              userId: session.user.id,
              hasProfile: !!profile,
            });

            setState({
              user: session.user,
              profile,
              isLoading: false,
              isAuthenticated: true,
            });
          } catch (error) {
            authDebug.log("STATE_CHANGE", "failure", {
              event,
              error,
              action: "get_profile_after_state_change",
            });
          } finally {
            // End performance tracking
            endTracking();
          }
        } else if (event === "SIGNED_OUT") {
          // Log signout state change
          authDebug.log("STATE_CHANGE", "success", {
            event: "SIGNED_OUT",
            action: "reset_auth_state",
          });

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
      authDebug.log("STATE_CHANGE", "info", {
        action: "unsubscribe_auth_listener",
        timestamp: new Date().toISOString(),
      });
      data?.subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    // Start performance tracking
    const endTracking = authDebug.trackPerformance("sign_in_ui_flow");

    // Log sign-in attempt from UI
    authDebug.log("SIGNIN", "attempt", {
      email,
      source: "ui",
    });

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.signIn({
        email,
        password,
      });

      if (error) {
        // Log auth failure from UI
        authDebug.log("SIGNIN", "failure", {
          email,
          errorCode: error.code,
          errorMessage: error.message,
        });

        debug.error("Auth", "Sign in failed", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error };
      }

      // The success case is handled by the auth state change listener
      // but log that the UI flow is complete
      authDebug.log("SIGNIN", "success", {
        email,
        flowComplete: true,
      });

      return {};
    } catch (error) {
      // Log unexpected errors
      authDebug.log("SIGNIN", "failure", {
        email,
        error: error as Error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Sign in failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error };
    } finally {
      // End performance tracking
      endTracking();
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
    // Start performance tracking
    const endTracking = authDebug.trackPerformance("sign_up_ui_flow");

    // Log sign-up attempt from UI
    authDebug.log("SIGNUP", "attempt", {
      email,
      hasMetadata: !!metadata,
      metadataFields: metadata ? Object.keys(metadata) : [],
    });

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error, data } = await supabaseService.auth.signUp({
        email,
        password,
        metadata,
      });

      if (error) {
        // Log signup failure from UI
        authDebug.log("SIGNUP", "failure", {
          email,
          errorCode: error.code,
          errorMessage: error.message,
        });

        debug.error("Auth", "Sign up failed", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error };
      }

      // Log successful signup from UI with additional diagnostic info
      authDebug.log("SIGNUP", "success", {
        email,
        hasMetadata: !!metadata,
        // Add diagnostics about Supabase response
        signupResponse: {
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          userConfirmed: !!data?.user?.email_confirmed_at,
          identityId: data?.user?.identities?.[0]?.id,
        },
      });

      // IMPORTANT FIX: Explicitly set loading to false after signup
      // This ensures the registration screen can properly show the success view
      // without navigation guards trying to redirect to another screen
      setState((prev) => ({
        ...prev,
        isLoading: false,
        // Don't set the user as authenticated yet - they need to verify email first
        // or explicitly log in after registration
        isAuthenticated: false,
      }));

      // Add debugging to understand navigation issues
      debug.log(
        "Auth",
        "Registration completed successfully, showing success screen",
        {
          email,
          timestamp: new Date().toISOString(),
          needsVerification: !data?.user?.email_confirmed_at,
          nextAction: "showing_success_screen",
        }
      );

      return {};
    } catch (error) {
      // Log unexpected errors
      authDebug.log("SIGNUP", "failure", {
        email,
        error: error as Error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Sign up failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error };
    } finally {
      // End performance tracking
      endTracking();
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    // Start performance tracking
    const endTracking = authDebug.trackPerformance("sign_out_ui_flow");

    // Log signout attempt from UI
    authDebug.log("SIGNOUT", "attempt", {
      timestamp: new Date().toISOString(),
      source: "ui",
    });

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.signOut();

      if (error) {
        // Log signout failure
        authDebug.log("SIGNOUT", "failure", {
          errorMessage: error.message,
          errorCode: error.code || "unknown",
        });

        debug.error("Auth", "Sign out failed", error);
      } else {
        // Log successful signout
        authDebug.log("SIGNOUT", "success", {
          timestamp: new Date().toISOString(),
          manualStateReset: true,
        });
      }

      // Reset state - we don't wait for the auth state change event
      setState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      // Log unexpected errors
      authDebug.log("SIGNOUT", "failure", {
        error: error as Error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Sign out failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      // End performance tracking
      endTracking();
    }
  };

  /**
   * Request password reset
   */
  const resetPassword = async (email: string) => {
    // Start performance tracking
    const endTracking = authDebug.trackPerformance("password_reset_ui_flow");

    // Log password reset attempt from UI
    authDebug.log("PASSWORD_RESET", "attempt", {
      email,
      source: "ui",
    });

    try {
      const { error } = await supabaseService.auth.resetPassword(email);

      if (error) {
        // Log password reset failure
        authDebug.log("PASSWORD_RESET", "failure", {
          email,
          errorMessage: error.message,
          errorCode: error.code || "unknown",
        });

        debug.error("Auth", "Password reset failed", error);
        return { error };
      }

      // Log successful password reset request
      authDebug.log("PASSWORD_RESET", "success", {
        email,
        timestamp: new Date().toISOString(),
      });

      return {};
    } catch (error) {
      // Log unexpected errors
      authDebug.log("PASSWORD_RESET", "failure", {
        email,
        error: error as Error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Password reset failed", error);
      return { error: error as Error };
    } finally {
      // End performance tracking
      endTracking();
    }
  };

  /**
   * Update password
   */
  const updatePassword = async (newPassword: string) => {
    // Start performance tracking
    const endTracking = authDebug.trackPerformance("password_update_ui_flow");

    // Log password update attempt from UI (no password in logs)
    authDebug.log("PASSWORD_UPDATE", "attempt", {
      timestamp: new Date().toISOString(),
      passwordStrength: newPassword.length >= 12 ? "strong" : "moderate",
      source: "ui",
    });

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabaseService.auth.updatePassword(newPassword);

      setState((prev) => ({ ...prev, isLoading: false }));

      if (error) {
        // Log password update failure
        authDebug.log("PASSWORD_UPDATE", "failure", {
          errorMessage: error.message,
          errorCode: error.code || "unknown",
        });

        debug.error("Auth", "Password update failed", error);
        return { error };
      }

      // Log successful password update
      authDebug.log("PASSWORD_UPDATE", "success", {
        timestamp: new Date().toISOString(),
      });

      return {};
    } catch (error) {
      // Log unexpected errors
      authDebug.log("PASSWORD_UPDATE", "failure", {
        error: error as Error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Password update failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error };
    } finally {
      // End performance tracking
      endTracking();
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (data: Partial<UserProfile>) => {
    // Start performance tracking
    const endTracking = authDebug.trackPerformance("profile_update_ui_flow");

    // Log profile update attempt from UI
    authDebug.log("PROFILE_UPDATE", "attempt", {
      fields: Object.keys(data),
      timestamp: new Date().toISOString(),
      source: "ui",
    });

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const profile = await supabaseService.auth.updateProfile(data);

      if (!profile) {
        // Log profile update failure
        authDebug.log("PROFILE_UPDATE", "failure", {
          reason: "update_returned_null",
          fields: Object.keys(data),
        });

        setState((prev) => ({ ...prev, isLoading: false }));
        return null;
      }

      // Log successful profile update
      authDebug.log("PROFILE_UPDATE", "success", {
        fields: Object.keys(data),
        timestamp: new Date().toISOString(),
      });

      setState((prev) => ({
        ...prev,
        profile,
        isLoading: false,
      }));

      return profile;
    } catch (error) {
      // Log unexpected errors
      authDebug.log("PROFILE_UPDATE", "failure", {
        error: error as Error,
        errorType: "unexpected_exception",
        fields: Object.keys(data),
      });

      debug.error("Auth", "Profile update failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return null;
    } finally {
      // End performance tracking
      endTracking();
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
