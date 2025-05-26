/**
 * @file Authentication Provider
 *
 * Provides authentication state and methods to the application
 * through React Context. Manages user sessions, login state, and
 * user profile data.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  supabaseService,
  refreshSession,
  checkSession,
} from "../services/supabase";
import { profileService } from "../services/profileService";
import { AuthState, AuthContextValue, UserProfile } from "../types/user";
import { Session, AuthChangeEvent, AuthError } from "@supabase/supabase-js";
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
            // Ensure the user has a profile in the database
            // This is critical for RLS policy compatibility
            debug.log(
              "Auth",
              "Ensuring user profile exists after auth state change"
            );
            await profileService.ensureUserProfile();

            // Get user profile
            const profile = await supabaseService.auth.getProfile();

            // Log successful state update
            authDebug.log("STATE_CHANGE", "success", {
              event,
              userId: session.user.id,
              hasProfile: !!profile,
              profileEnsured: true,
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

  // Add enhanced session health monitoring interval to proactively refresh tokens with retry
  useEffect(() => {
    // Skip in loading state to avoid multiple session checks
    if (state.isLoading) return;

    debug.log("Auth", "Starting enhanced session health monitoring");

    // Check session every minute to ensure it's always valid
    const sessionHealthInterval = setInterval(async () => {
      try {
        // Skip checks if not authenticated
        if (!state.isAuthenticated || !state.user) {
          return;
        }

        // Get session health info with enhanced validation
        const sessionInfo = await checkSession();

        // Log session health check
        authDebug.log("SESSION_REFRESH", "info", {
          action: "health_check",
          valid: sessionInfo.valid,
          expiresIn: sessionInfo.expiresIn,
          needsForceRefresh: sessionInfo.needsForceRefresh,
          timestamp: new Date().toISOString(),
        });

        // Log detailed session status to help diagnose issues
        if (
          sessionInfo.detailedStatus &&
          sessionInfo.detailedStatus !== "valid"
        ) {
          debug.log(
            "Auth",
            `Session status check: ${sessionInfo.detailedStatus}`,
            {
              expiresIn: sessionInfo.expiresIn,
              needsForceRefresh: sessionInfo.needsForceRefresh,
              detailedStatus: sessionInfo.detailedStatus,
            }
          );
        }

        // If session has issues or is about to expire, refresh it proactively
        if (
          sessionInfo.session &&
          (sessionInfo.needsForceRefresh ||
            sessionInfo.detailedStatus === "suspicious_future" ||
            sessionInfo.detailedStatus === "expired_past" ||
            sessionInfo.detailedStatus === "just_expired" ||
            sessionInfo.detailedStatus === "expiring_soon" ||
            sessionInfo.detailedStatus === "invalid_date" ||
            (sessionInfo.expiresIn && sessionInfo.expiresIn < 600)) // 10 minutes threshold
        ) {
          let reason = "";

          // Generate a more detailed reason based on the status
          if (sessionInfo.detailedStatus) {
            switch (sessionInfo.detailedStatus) {
              case "suspicious_future":
                reason =
                  "session expiration date is suspiciously far in the future";
                break;
              case "expired_past":
                reason = "session expiration date is in the past";
                break;
              case "just_expired":
                reason = "session just expired";
                break;
              case "expiring_soon":
                reason = `expiring soon (${sessionInfo.expiresIn}s remaining)`;
                break;
              case "invalid_date":
                reason = "invalid expiration date format detected";
                break;
              case "missing_expiration":
                reason = "missing expiration information";
                break;
              default:
                reason =
                  sessionInfo.needsForceRefresh ?
                    "invalid expiration timestamp detected"
                  : `expiring soon (${sessionInfo.expiresIn}s remaining)`;
            }
          } else {
            reason =
              sessionInfo.needsForceRefresh ?
                "invalid expiration timestamp detected"
              : `expiring soon (${sessionInfo.expiresIn}s remaining)`;
          }

          debug.log("Auth", `Proactively refreshing session: ${reason}`, {
            expiresIn: sessionInfo.expiresIn,
            needsForceRefresh: sessionInfo.needsForceRefresh,
            detailedStatus: sessionInfo.detailedStatus,
          });

          // Use retry mechanism for session refresh (up to 3 retries based on timestamp issues)
          const refreshRetries =
            (
              sessionInfo.detailedStatus === "expired_past" ||
              sessionInfo.detailedStatus === "invalid_date"
            ) ?
              3
            : 2;

          const refreshed = await refreshSession(refreshRetries);

          if (refreshed) {
            // Verify the refreshed session to ensure it's valid
            const verifySession = await checkSession();

            authDebug.log("SESSION_REFRESH", "info", {
              action: "proactive_refresh",
              success: refreshed,
              newExpiresIn: verifySession.expiresIn,
              newDetailedStatus: verifySession.detailedStatus,
              stillValid: verifySession.valid,
              timestamp: new Date().toISOString(),
            });

            if (!verifySession.valid) {
              debug.warn(
                "Auth",
                "Session refresh succeeded but session is still invalid",
                {
                  expiresIn: verifySession.expiresIn,
                  needsForceRefresh: verifySession.needsForceRefresh,
                  detailedStatus: verifySession.detailedStatus,
                }
              );

              // If we still have an invalid date/timestamp after refresh, it may be a deeper issue
              if (
                verifySession.detailedStatus === "invalid_date" ||
                verifySession.detailedStatus === "expired_past" ||
                verifySession.detailedStatus === "suspicious_future"
              ) {
                debug.error(
                  "Auth",
                  "Persistent timestamp abnormality after refresh - may require re-authentication",
                  {
                    detailedStatus: verifySession.detailedStatus,
                    expiresIn: verifySession.expiresIn,
                  }
                );

                // This is a potential candidate for forcing re-authentication
                // but we'll let the auto-retry mechanism try again first
              }
            } else {
              debug.log("Auth", "Session refresh successful and validated", {
                newExpiresIn: verifySession.expiresIn,
                newDetailedStatus: verifySession.detailedStatus,
              });
            }
          } else {
            debug.error("Auth", "Session refresh failed after retry attempts", {
              originalExpiresIn: sessionInfo.expiresIn,
              detailedStatus: sessionInfo.detailedStatus,
            });

            // If refresh fails and user's session is already expired, consider signing them out
            if (
              (sessionInfo.expiresIn && sessionInfo.expiresIn < 0) ||
              sessionInfo.detailedStatus === "expired_past" ||
              sessionInfo.detailedStatus === "just_expired"
            ) {
              debug.warn(
                "Auth",
                "Session expired and refresh failed - user needs to re-authenticate",
                {
                  expiresIn: sessionInfo.expiresIn,
                  detailedStatus: sessionInfo.detailedStatus,
                }
              );

              // Show a toast or notification to the user that they should re-login
              // Implementation depends on your UI notification system
            }
          }
        }
      } catch (error) {
        // Don't crash the app on monitoring errors, just log them
        authDebug.log("SESSION_REFRESH", "failure", {
          action: "health_check",
          error,
        });
      }
    }, 60000); // Check health every minute

    return () => {
      clearInterval(sessionHealthInterval);
      debug.log("Auth", "Stopping session health monitoring");
    };
  }, [state.isLoading, state.isAuthenticated, state.user]);

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

      // Use type assertion for the error from Supabase
      const { error } = await supabaseService.auth.signIn({
        email,
        password,
      });

      if (error) {
        // Log auth failure from UI
        // Log auth failure details
        authDebug.log("SIGNIN", "failure", {
          email,
          errorCode: error.code || "unknown",
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
        error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Sign in failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error };
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
        // Log signup failure details
        authDebug.log("SIGNUP", "failure", {
          email,
          errorCode: error.code || "unknown",
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
        error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Sign up failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error };
    } finally {
      // End performance tracking
      endTracking();
    }
  };

  /**
   * Sign out
   * @returns An object containing error (if any occurred during sign out)
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
        // Log signout failure details with safe property access
        authDebug.log("SIGNOUT", "failure", {
          errorMessage: error.message,
          errorCode: (error as AuthError).code || "unknown",
        });

        debug.error("Auth", "Sign out failed", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error }; // Return the error so calling code can handle it
      }

      // Log successful signout
      authDebug.log("SIGNOUT", "success", {
        timestamp: new Date().toISOString(),
        manualStateReset: true,
      });

      // Reset state - we don't wait for the auth state change event
      setState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });

      return {}; // Return empty object to indicate success
    } catch (error) {
      // Log unexpected errors
      authDebug.log("SIGNOUT", "failure", {
        error,
        errorType: "unexpected_exception",
      });

      debug.error("Auth", "Sign out failed", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { error: error as Error }; // Return the error to the calling code
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
        // Handle error logging with safe property access
        authDebug.log("PASSWORD_RESET", "failure", {
          email,
          errorMessage: error.message,
          errorCode: (error as AuthError).code || "unknown",
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
        // Log password update failure with safe property access
        authDebug.log("PASSWORD_UPDATE", "failure", {
          errorMessage: error.message,
          errorCode: (error as AuthError).code || "unknown",
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
