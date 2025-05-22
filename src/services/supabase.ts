import {
  createClient,
  AuthResponse,
  Session,
  User,
  AuthChangeEvent,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Toilet, Review } from "../types/toilet";
import { UserProfile } from "../types/user";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import { debug } from "../utils/debug";
import { authDebug } from "../utils/AuthDebugger";

// Initialize Supabase client
if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  debug.error("Supabase", "Missing environment variables", {
    url: !!EXPO_PUBLIC_SUPABASE_URL,
    key: !!EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  throw new Error("Supabase environment configuration is missing.");
}

/**
 * Singleton implementation of Supabase client
 * This ensures we use the same client instance with the same auth state throughout the app
 */
class SupabaseClientSingleton {
  private static instance: SupabaseClient;
  private static isRefreshing = false;

  /**
   * Get the shared Supabase client instance
   * @returns A Supabase client with consistent auth state
   */
  static getInstance(): SupabaseClient {
    if (!this.instance) {
      this.instance = createClient(
        EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        }
      );

      debug.log("Supabase", "Created Supabase client singleton instance");
    }
    return this.instance;
  }

  /**
   * Refresh the current session with retry mechanism
   * It uses a lock to prevent concurrent refreshes
   * @param retryCount Number of retry attempts (default: 2)
   * @returns True if the refresh was successful
   */
  static async refreshSession(retryCount: number = 2): Promise<boolean> {
    // Prevent concurrent refresh operations
    if (this.isRefreshing) {
      debug.log("Supabase", "Session refresh already in progress, skipping");
      return true;
    }

    try {
      this.isRefreshing = true;

      const client = this.getInstance();
      authDebug.log("SESSION_REFRESH", "attempt", {
        timestamp: new Date().toISOString(),
        retryCount,
      });

      // Implement retry logic
      let lastError = null;
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          if (attempt > 0) {
            // Wait longer between each retry attempt (exponential backoff)
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            debug.log(
              "Supabase",
              `Retry attempt ${attempt}/${retryCount} after ${backoffMs}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }

          const { data, error } = await client.auth.refreshSession();

          if (error) {
            lastError = error;
            authDebug.log("SESSION_REFRESH", "failure", {
              error: error.message,
              attempt: attempt + 1,
              maxAttempts: retryCount + 1,
              timestamp: new Date().toISOString(),
              retryAttempt: true, // Add flag to indicate this is a retry attempt
            });
            continue; // Try again if we have attempts left
          }

          // Success - log and return
          authDebug.log("SESSION_REFRESH", "success", {
            hasSession: !!data.session,
            expiresAt: data.session?.expires_at,
            attempt: attempt + 1,
            timestamp: new Date().toISOString(),
          });

          return !!data.session;
        } catch (attemptError) {
          lastError = attemptError;
          authDebug.log("SESSION_REFRESH", "network_error", {
            error: attemptError,
            attempt: attempt + 1,
            maxAttempts: retryCount + 1,
            retryAttempt: true, // Add flag to indicate this is a retry attempt
          });
        }
      }

      // If we reached here, all attempts failed
      authDebug.log("SESSION_REFRESH", "failure", {
        totalAttempts: retryCount + 1,
        lastError,
        timestamp: new Date().toISOString(),
        allAttemptsFailed: true, // Add flag to indicate all attempts failed
      });

      return false;
    } catch (error) {
      authDebug.log("SESSION_REFRESH", "network_error", { error });
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Normalizes different timestamp formats to a JavaScript Date object
   * Handles Unix timestamps (seconds), JavaScript timestamps (milliseconds),
   * ISO strings, and other string date formats
   *
   * @param timestamp The timestamp to normalize
   * @returns A JavaScript Date object or null if invalid
   */
  static normalizeTimestamp(
    timestamp: number | string | undefined | null
  ): Date | null {
    if (timestamp === undefined || timestamp === null) {
      return null;
    }

    try {
      // Handle numeric timestamps
      if (typeof timestamp === "number") {
        // Unix timestamps (seconds since epoch) typically have 10 digits
        // JavaScript timestamps (milliseconds since epoch) have 13 digits
        if (timestamp < 20000000000) {
          // Heuristic for Unix timestamp (before year 2603)
          return new Date(timestamp * 1000);
        } else {
          return new Date(timestamp);
        }
      }

      // Handle string timestamps
      if (typeof timestamp === "string") {
        // Try to parse as a number first
        const numericValue = parseInt(timestamp, 10);
        if (!isNaN(numericValue)) {
          return this.normalizeTimestamp(numericValue);
        }

        // Try as ISO date string or other string formats
        const dateObject = new Date(timestamp);
        if (this.isValidDate(dateObject)) {
          return dateObject;
        }
      }

      // If we get here, the timestamp couldn't be parsed
      debug.warn("Supabase", "Unknown timestamp format", { timestamp });
      return null;
    } catch (error) {
      debug.error("Supabase", "Error normalizing timestamp", {
        timestamp,
        error,
      });
      return null;
    }
  }

  /**
   * Checks if a date object is valid
   * @param date The date object to check
   * @returns True if the date is valid
   */
  static isValidDate(date: Date | null | undefined): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Checks if an expiration time is within reasonable bounds
   * @param expiresIn Seconds until expiration
   * @returns Whether the expiration is reasonable
   */
  static isReasonableExpiration(expiresIn: number): boolean {
    const MAX_EXPIRATION = 86400 * 90; // 90 days in seconds
    const MIN_EXPIRATION = -300; // Allow slightly expired (5 minutes)

    return expiresIn > MIN_EXPIRATION && expiresIn < MAX_EXPIRATION;
  }

  /**
   * Check if the current session is valid
   * Enhanced with better timestamp validation and fallback handling
   * @returns Session information or null if no session
   */
  static async checkSession(): Promise<{
    valid: boolean;
    session: Session | null;
    expiresIn: number | null;
    needsForceRefresh: boolean;
    detailedStatus?: string;
  }> {
    try {
      const client = this.getInstance();
      const { data } = await client.auth.getSession();

      if (!data.session) {
        return {
          valid: false,
          session: null,
          expiresIn: null,
          needsForceRefresh: false,
          detailedStatus: "no_session",
        };
      }

      // Safe date parsing with improved validation
      let expiresIn = null;
      let needsForceRefresh = false;
      let detailedStatus = "valid";

      try {
        if (data.session.expires_at) {
          // Use our timestamp normalization utility
          const expiresAt = this.normalizeTimestamp(data.session.expires_at);
          const now = new Date();

          // Validate that expires_at is a valid date
          if (this.isValidDate(expiresAt)) {
            expiresIn = Math.floor(
              (expiresAt!.getTime() - now.getTime()) / 1000
            );

            // Check if expiration time is reasonable
            if (!this.isReasonableExpiration(expiresIn)) {
              if (expiresIn < -300) {
                // More than 5 minutes in the past
                debug.warn(
                  "Supabase",
                  "Session expiration date is far in the past",
                  {
                    expiresIn,
                    expiresAtRaw: data.session.expires_at,
                    expiresAtNormalized: expiresAt!.toISOString(),
                    now: now.toISOString(),
                  }
                );
                detailedStatus = "expired_past";
                needsForceRefresh = true;
              } else if (expiresIn > 86400 * 30) {
                // More than 30 days in future
                debug.warn(
                  "Supabase",
                  "Session expiration date is suspiciously far in the future",
                  {
                    expiresIn,
                    expiresAtRaw: data.session.expires_at,
                    expiresAtNormalized: expiresAt!.toISOString(),
                    now: now.toISOString(),
                  }
                );
                detailedStatus = "suspicious_future";
                // Don't force refresh but log the anomaly
              }
            } else {
              // Expiration time is reasonable
              if (expiresIn < 0) {
                detailedStatus = "just_expired";
                needsForceRefresh = true;
              } else if (expiresIn < 600) {
                // 10 minutes
                detailedStatus = "expiring_soon";
                needsForceRefresh = true;
              }
            }
          } else {
            debug.error("Supabase", "Invalid session expiration date", {
              expiresAtRaw: data.session.expires_at,
              normalizedResult: expiresAt,
            });
            expiresIn = -1; // Treat as expired
            needsForceRefresh = true; // Force refresh
            detailedStatus = "invalid_date";
          }
        } else {
          debug.warn("Supabase", "Session missing expiration date");
          expiresIn = -1;
          needsForceRefresh = true;
          detailedStatus = "missing_expiration";
        }
      } catch (dateError) {
        debug.error(
          "Supabase",
          "Error calculating session expiration",
          dateError
        );
        expiresIn = -1; // Treat as expired if we can't calculate
        needsForceRefresh = true; // Force refresh on calculation error
        detailedStatus = "calculation_error";
      }

      return {
        valid: expiresIn !== null && expiresIn > 0,
        session: data.session,
        expiresIn,
        needsForceRefresh,
        detailedStatus,
      };
    } catch (error) {
      authDebug.log("SESSION_REFRESH", "network_error", { error });
      return {
        valid: false,
        session: null,
        expiresIn: null,
        needsForceRefresh: false,
        detailedStatus: "network_error",
      };
    }
  }
}

// Get the singleton instance to use throughout the file
const supabase = SupabaseClientSingleton.getInstance();

// Export the singleton accessor functions for use in other services
export const getSupabaseClient = () => SupabaseClientSingleton.getInstance();
export const refreshSession = (retryCount?: number) =>
  SupabaseClientSingleton.refreshSession(retryCount);
export const checkSession = () => SupabaseClientSingleton.checkSession();

// Define the auth service types
interface AuthSignUpParams {
  email: string;
  password: string;
  metadata?: {
    full_name?: string;
  };
}

interface AuthSignInParams {
  email: string;
  password: string;
}

interface ProfileUpdateParams {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export const supabaseService = {
  // Auth operations
  auth: {
    /**
     * Sign up a new user
     * @param params User signup parameters
     * @returns AuthResponse with user data or error
     */
    async signUp(params: AuthSignUpParams): Promise<AuthResponse> {
      const { email, password, metadata } = params;

      // Start performance tracking
      const endTracking = authDebug.trackPerformance("signup");

      // Log attempt with sanitized data
      authDebug.log("SIGNUP", "attempt", {
        email,
        hasMetadata: !!metadata,
      });

      try {
        const response = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata },
        });

        if (response.error) {
          // Log detailed error information
          authDebug.log("SIGNUP", "failure", {
            error: {
              code: response.error.code,
              message: response.error.message,
              status: response.error.status,
            },
            email,
          });
          debug.error("Auth", "Sign up failed", response.error);
        } else {
          // Log success with non-sensitive user info
          authDebug.log("SIGNUP", "success", {
            userId: response.data.user?.id,
            emailConfirmed: !!response.data.user?.email_confirmed_at,
            identities: response.data.user?.identities?.length || 0,
          });
        }

        return response;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("SIGNUP", "network_error", { error });
        debug.error("Auth", "Sign up failed unexpectedly", error);
        throw error;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Sign in a user with email and password
     * @param params User signin parameters
     * @returns AuthResponse with session or error
     */
    async signIn(params: AuthSignInParams): Promise<AuthResponse> {
      const { email, password } = params;

      // Start performance tracking
      const endTracking = authDebug.trackPerformance("signin");

      // Log attempt with sanitized data
      authDebug.log("SIGNIN", "attempt", { email });

      try {
        const response = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (response.error) {
          // Log detailed error information
          authDebug.log("SIGNIN", "failure", {
            error: {
              code: response.error.code,
              message: response.error.message,
              status: response.error.status,
            },
            email,
            errorType: response.error.name,
          });
          debug.error("Auth", "Sign in failed", response.error);
        } else {
          // Log success with non-sensitive session info
          authDebug.log("SIGNIN", "success", {
            userId: response.data.user?.id,
            hasSession: !!response.data.session,
            expiresAt: response.data.session?.expires_at,
            provider: response.data.user?.app_metadata?.provider,
          });
        }

        return response;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("SIGNIN", "network_error", { error });
        debug.error("Auth", "Sign in failed unexpectedly", error);
        throw error;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Sign out the current user
     * @returns Promise with void or error
     */
    async signOut(): Promise<{ error: Error | null }> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("signout");

      // Log attempt
      authDebug.log("SIGNOUT", "attempt", {
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await supabase.auth.signOut();

        if (result.error) {
          // Log error details
          authDebug.log("SIGNOUT", "failure", {
            error: result.error.message,
            stack: result.error.stack,
          });
          debug.error("Auth", "Sign out failed", result.error);
        } else {
          // Log success
          authDebug.log("SIGNOUT", "success", {
            timestamp: new Date().toISOString(),
          });
        }

        return result;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("SIGNOUT", "network_error", { error });
        debug.error("Auth", "Sign out failed unexpectedly", error);
        throw error;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Request a password reset email
     * @param email User's email address
     * @returns Promise with void or error
     */
    async resetPassword(email: string): Promise<{ error: Error | null }> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("password_reset");

      // Log attempt
      authDebug.log("PASSWORD_RESET", "attempt", { email });

      try {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (result.error) {
          // Log error details
          authDebug.log("PASSWORD_RESET", "failure", {
            error: result.error.message,
            email,
          });
          debug.error("Auth", "Password reset failed", result.error);
        } else {
          // Log success
          authDebug.log("PASSWORD_RESET", "success", { email });
        }

        return result;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("PASSWORD_RESET", "network_error", { error });
        debug.error("Auth", "Password reset failed unexpectedly", error);
        throw error;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Update user's password (when they have a valid reset token)
     * @param newPassword The new password
     * @returns User update response
     */
    async updatePassword(newPassword: string): Promise<{
      data: { user: User | null };
      error: Error | null;
    }> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("password_update");

      // Log attempt (no password in logs)
      authDebug.log("PASSWORD_UPDATE", "attempt", {
        timestamp: new Date().toISOString(),
        passwordStrength: newPassword.length >= 12 ? "strong" : "moderate",
      });

      try {
        const result = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (result.error) {
          // Log error details
          authDebug.log("PASSWORD_UPDATE", "failure", {
            error: result.error.message,
            errorCode: result.error.status,
          });
          debug.error("Auth", "Password update failed", result.error);
        } else {
          // Log success
          authDebug.log("PASSWORD_UPDATE", "success", {
            userId: result.data.user?.id,
            timestamp: new Date().toISOString(),
          });
        }

        return result;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("PASSWORD_UPDATE", "network_error", { error });
        debug.error("Auth", "Password update failed unexpectedly", error);
        throw error;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Get current session
     * @returns Current session or null
     */
    async getSession(): Promise<{
      data: { session: Session | null };
      error: Error | null;
    }> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("session_fetch");

      // Log attempt
      authDebug.log("SESSION_REFRESH", "attempt", {
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await supabase.auth.getSession();

        if (result.error) {
          // Log error details
          authDebug.log("SESSION_REFRESH", "failure", {
            error: result.error.message,
          });
          debug.error("Auth", "Get session failed", result.error);
        } else {
          // Log session status
          authDebug.log("SESSION_REFRESH", "success", {
            hasSession: !!result.data.session,
            expiresAt: result.data.session?.expires_at,
            provider: result.data.session?.user?.app_metadata?.provider,
          });
        }

        return result;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("SESSION_REFRESH", "network_error", { error });
        debug.error("Auth", "Get session failed unexpectedly", error);
        throw error;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Get current user
     * @returns Current user or null
     */
    async getUser(): Promise<User | null> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("user_fetch");

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          // Log error details
          authDebug.log("STATE_CHANGE", "failure", {
            action: "get_user",
            error: error.message,
          });
          debug.error("Auth", "Get user failed", error);
          return null;
        }

        // Log user info
        authDebug.log("STATE_CHANGE", "info", {
          action: "get_user",
          userId: data.user?.id,
          hasUser: !!data.user,
          emailConfirmed: !!data.user?.email_confirmed_at,
          provider: data.user?.app_metadata?.provider,
          lastSignIn: data.user?.last_sign_in_at,
        });

        return data.user;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("STATE_CHANGE", "network_error", {
          action: "get_user",
          error,
        });
        debug.error("Auth", "Get user failed unexpectedly", error);
        return null;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Subscribe to auth state changes
     * @param callback Function to call when auth state changes
     * @returns Subscription object
     */
    onAuthStateChange(
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) {
      return supabase.auth.onAuthStateChange(callback);
    },

    /**
     * Get current user's profile
     * If profile doesn't exist, it automatically creates one
     * @returns User profile or null
     */
    async getProfile(): Promise<UserProfile | null> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("profile_fetch");

      // Log attempt
      authDebug.log("PROFILE_UPDATE", "info", {
        action: "get_profile",
        timestamp: new Date().toISOString(),
      });

      try {
        const { data: user } = await supabase.auth.getUser();

        if (!user.user) {
          // Log no user found
          authDebug.log("PROFILE_UPDATE", "info", {
            action: "get_profile",
            result: "no_user_found",
          });
          return null;
        }

        // Attempt to get profile
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.user.id)
          .single();

        // If profile exists, return it
        if (!error) {
          // Log profile retrieval success
          authDebug.log("PROFILE_UPDATE", "success", {
            action: "get_profile",
            userId: user.user.id,
            hasUsername: !!data.username,
            hasAvatar: !!data.avatar_url,
          });

          return data as UserProfile;
        }

        // Check if error is specifically "no rows" error
        if (error.code === "PGRST116") {
          // Profile doesn't exist - create one
          authDebug.log("PROFILE_UPDATE", "info", {
            action: "auto_create_profile",
            userId: user.user.id,
            reason: "profile_not_found",
          });

          // Generate default profile data
          const defaultUsername = `user_${Math.floor(Math.random() * 1000000)}`;
          const displayName =
            user.user.user_metadata?.full_name ||
            user.user.email ||
            defaultUsername;

          // Insert new profile with stats initialized to zero
          const { data: newProfile, error: insertError } = await supabase
            .from("user_profiles")
            .insert([
              {
                id: user.user.id,
                username: defaultUsername,
                display_name: displayName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                reviews_count: 0,
                contributions_count: 0,
                favorites_count: 0,
              },
            ])
            .select()
            .single();

          if (insertError) {
            // Log creation failure
            authDebug.log("PROFILE_UPDATE", "failure", {
              action: "auto_create_profile",
              userId: user.user.id,
              error: insertError.message,
              code: insertError.code,
            });
            debug.error("Auth", "Auto-create profile failed", insertError);
            return null;
          }

          // Log successful profile creation
          authDebug.log("PROFILE_UPDATE", "success", {
            action: "auto_create_profile",
            userId: user.user.id,
            username: defaultUsername,
          });

          return newProfile as UserProfile;
        } else {
          // Different error occurred
          authDebug.log("PROFILE_UPDATE", "failure", {
            action: "get_profile",
            userId: user.user.id,
            error: error.message,
            code: error.code,
          });
          debug.error("Auth", "Get profile failed", error);
          return null;
        }
      } catch (error) {
        // Log unexpected errors
        authDebug.log("PROFILE_UPDATE", "network_error", {
          action: "get_profile",
          error,
        });
        debug.error("Auth", "Get profile failed unexpectedly", error);
        return null;
      } finally {
        // End performance tracking
        endTracking();
      }
    },

    /**
     * Update user's profile
     * @param params Profile fields to update
     * @returns Updated profile or null
     */
    async updateProfile(
      params: ProfileUpdateParams
    ): Promise<UserProfile | null> {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("profile_update");

      // Log attempt with field names (but not values)
      authDebug.log("PROFILE_UPDATE", "attempt", {
        action: "update_profile",
        fields: Object.keys(params),
      });

      try {
        const { data: user } = await supabase.auth.getUser();

        if (!user.user) {
          // Log no user found
          authDebug.log("PROFILE_UPDATE", "failure", {
            action: "update_profile",
            reason: "no_user_found",
          });
          return null;
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .update(params)
          .eq("id", user.user.id)
          .select()
          .single();

        if (error) {
          // Log error details
          authDebug.log("PROFILE_UPDATE", "failure", {
            action: "update_profile",
            userId: user.user.id,
            error: error.message,
            code: error.code,
            fields: Object.keys(params),
          });
          debug.error("Auth", "Update profile failed", error);
          return null;
        }

        // Log profile update success
        authDebug.log("PROFILE_UPDATE", "success", {
          action: "update_profile",
          userId: user.user.id,
          updatedFields: Object.keys(params),
          timestamp: new Date().toISOString(),
        });

        return data as UserProfile;
      } catch (error) {
        // Log unexpected errors
        authDebug.log("PROFILE_UPDATE", "network_error", {
          action: "update_profile",
          error,
        });
        debug.error("Auth", "Update profile failed unexpectedly", error);
        return null;
      } finally {
        // End performance tracking
        endTracking();
      }
    },
  },

  // Toilet operations
  toilets: {
    async getNearby(
      latitude: number,
      longitude: number,
      radius: number = 5000
    ) {
      const { data, error } = await supabase
        .rpc("find_toilets_within_radius", {
          lat: latitude,
          lng: longitude,
          radius_meters: radius,
        })
        .select("*");

      if (error) throw error;

      // Enhanced diagnosis logging
      const totalToilets = data.length;
      const withValidCoords = data.filter(
        (toilet) =>
          toilet.latitude &&
          toilet.longitude &&
          toilet.latitude !== 0 &&
          toilet.longitude !== 0
      ).length;

      debug.warn(
        "Supabase",
        `TOILET DIAGNOSIS: Total toilets: ${totalToilets}, With valid coordinates: ${withValidCoords}`,
        {
          totalToilets,
          withValidCoords,
          missingCoords: totalToilets - withValidCoords,
          percentValid:
            totalToilets > 0 ?
              Math.round((withValidCoords / totalToilets) * 100)
            : 0,
        }
      );

      // Transform raw database results to match the Toilet interface structure
      // This handles the mismatch between PostgreSQL results and our TypeScript model
      const transformedData: Toilet[] = data.map((toilet) => {
        // Default to using actual coordinates from the database if available
        let toiletLatitude = toilet.latitude;
        let toiletLongitude = toilet.longitude;

        // Fallback to calculated position if coordinates are missing or invalid
        if (
          !toiletLatitude ||
          !toiletLongitude ||
          typeof toiletLatitude !== "number" ||
          typeof toiletLongitude !== "number" ||
          toiletLatitude === 0 ||
          toiletLongitude === 0
        ) {
          debug.warn(
            "Supabase",
            `Missing or invalid coordinates for toilet ${toilet.name}, using calculated fallback`
          );

          const angle = Math.random() * Math.PI * 2; // Random angle in radians
          const distanceInDegrees = (toilet.distance_meters || 0) / 111000; // Rough conversion from meters to degrees

          toiletLatitude = latitude + Math.sin(angle) * distanceInDegrees;
          toiletLongitude = longitude + Math.cos(angle) * distanceInDegrees;

          // Log the fallback calculation
          debug.log(
            "Supabase",
            `Calculated fallback position for toilet ${toilet.name}`,
            {
              toiletId: toilet.id,
              toiletName: toilet.name,
              distance: toilet.distance_meters,
              calculatedPosition: { lat: toiletLatitude, lng: toiletLongitude },
              angle: angle * (180 / Math.PI), // Convert to degrees for readability
              userPosition: { lat: latitude, lng: longitude },
            }
          );
        } else {
          // Log that we're using actual coordinates
          debug.log(
            "Supabase",
            `Using actual coordinates for toilet ${toilet.name}`,
            {
              toiletId: toilet.id,
              toiletName: toilet.name,
              actualPosition: { lat: toiletLatitude, lng: toiletLongitude },
              distance: toilet.distance_meters,
              userPosition: { lat: latitude, lng: longitude },
            }
          );
        }

        return {
          id: toilet.id,
          name: toilet.name,
          location: {
            latitude: toiletLatitude,
            longitude: toiletLongitude,
          },
          rating: parseFloat(toilet.rating),
          reviewCount: 0, // Default value as it's not returned by the SQL function
          isAccessible: !!toilet.is_accessible,
          address: "", // Default value as it's not returned by the SQL function
          distance:
            toilet.distance_meters ?
              parseFloat(toilet.distance_meters.toString())
            : undefined,
          amenities: {
            // Default values for amenities that might not be in the SQL results
            hasBabyChanging: toilet.amenities?.babyChanging || false,
            hasShower: toilet.amenities?.shower || false,
            isGenderNeutral: toilet.amenities?.genderNeutral || false,
            hasPaperTowels: toilet.amenities?.paperTowels || false,
            hasHandDryer: toilet.amenities?.handDryer || false,
            hasWaterSpray: toilet.amenities?.waterSpray || false,
            hasSoap: toilet.amenities?.soap || false,
          },
          // Building and floor information
          buildingId: toilet.building_id || undefined,
          buildingName: toilet.building_name || undefined,
          floorLevel:
            toilet.floor_level !== undefined ? toilet.floor_level : undefined,
          floorName: toilet.floor_name || undefined,
          photos: toilet.photos || [],
          lastUpdated: new Date().toISOString(), // Default as it's not in the SQL results
          createdAt: new Date().toISOString(), // Default as it's not in the SQL results
          openingHours:
            toilet.opening_hours ?
              {
                open: toilet.opening_hours.split("-")[0] || "00:00",
                close: toilet.opening_hours.split("-")[1] || "23:59",
              }
            : undefined,
        };
      });

      return transformedData;
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from("toilets")
        .select(
          `
          *,
          reviews (
            id,
            rating,
            comment,
            photos,
            created_at,
            users (
              id,
              name,
              avatar_url
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Toilet & { reviews: Review[] };
    },

    async create(toilet: Omit<Toilet, "id" | "createdAt" | "updatedAt">) {
      const { data, error } = await supabase
        .from("toilets")
        .insert([toilet])
        .select()
        .single();

      if (error) throw error;
      return data as Toilet;
    },
  },

  // Review operations
  reviews: {
    async create(review: {
      toiletId: string;
      rating: number;
      comment?: string;
      photos?: string[];
    }): Promise<string> {
      // Call the database function for review creation
      const { data, error } = await supabase.rpc("create_review", {
        p_toilet_id: review.toiletId,
        p_rating: review.rating,
        p_comment: review.comment || "",
        p_photos: review.photos || [],
      });

      if (error) {
        debug.error("Supabase", "Error creating review", error);
        throw error;
      }
      return data as string;
    },

    async update(
      reviewId: string,
      updates: { rating?: number; comment?: string; photos?: string[] }
    ): Promise<string> {
      // Call the database function for review editing
      const { data, error } = await supabase.rpc("edit_review", {
        p_review_id: reviewId,
        p_rating: updates.rating,
        p_comment: updates.comment || "",
        p_photos: updates.photos || null,
      });

      if (error) {
        debug.error("Supabase", "Error updating review", error);
        throw error;
      }
      return data as string;
    },

    async getByToiletId(toiletId: string) {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          user_profiles (
            id, 
            display_name,
            avatar_url
          )
        `
        )
        .eq("toilet_id", toiletId)
        .order("created_at", { ascending: false });

      if (error) {
        debug.error("Supabase", "Error fetching reviews by toilet ID", error);
        throw error;
      }

      return data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        rating: item.rating,
        comment: item.comment,
        photos: item.photos || [],
        createdAt: item.created_at,
        isEdited: item.is_edited || false,
        version: item.version || 1,
        lastEditedAt: item.last_edited_at,
        updatedAt: item.updated_at,
        user:
          item.user_profiles ?
            {
              id: item.user_profiles.id,
              displayName: item.user_profiles.display_name,
              avatarUrl: item.user_profiles.avatar_url,
            }
          : null,
      })) as Review[];
    },

    async getCurrentUserReview(toiletId: string) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        debug.log("Supabase", "No authenticated user to get review");
        return null;
      }

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("toilet_id", toiletId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If the error is "no rows found", return null instead of throwing
        if (error.code === "PGRST116") {
          return null;
        }
        debug.error("Supabase", "Error fetching current user review", error);
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        rating: data.rating,
        comment: data.comment,
        photos: data.photos || [],
        createdAt: data.created_at,
        isEdited: data.is_edited || false,
        version: data.version || 1,
        lastEditedAt: data.last_edited_at,
        updatedAt: data.updated_at,
      } as Review;
    },
  },
};
