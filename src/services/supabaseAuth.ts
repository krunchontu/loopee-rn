/**
 * Supabase Auth & Profile Service
 *
 * Authentication operations (signUp, signIn, signOut, password reset)
 * and user profile CRUD backed by the Supabase singleton client.
 */

import type {
  AuthResponse,
  Session,
  User,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { captureException } from "./sentry";
import { getSupabaseClient, safeRandomInt } from "./supabaseClient";
import type { UserProfile } from "../types/user";
import { authDebug } from "../utils/AuthDebugger";
import { debug } from "../utils/debug";

// ── Local types ──────────────────────────────────────────────────────

interface AuthSignUpParams {
  email: string;
  password: string;
  metadata?: { full_name?: string };
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

// ── Service ──────────────────────────────────────────────────────────

export const supabaseAuth = {
  async signUp(params: AuthSignUpParams): Promise<AuthResponse> {
    const { email, password, metadata } = params;
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("signup");

    authDebug.log("SIGNUP", "attempt", { email, hasMetadata: !!metadata });

    try {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (response.error) {
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
        authDebug.log("SIGNUP", "success", {
          userId: response.data.user?.id,
          emailConfirmed: !!response.data.user?.email_confirmed_at,
          identities: response.data.user?.identities?.length || 0,
        });
      }

      return response;
    } catch (error) {
      authDebug.log("SIGNUP", "network_error", { error });
      debug.error("Auth", "Sign up failed unexpectedly", error);
      captureException(error as Error, {
        service: "supabase",
        method: "signUp",
        email: params.email,
      });
      throw error;
    } finally {
      endTracking();
    }
  },

  async signIn(params: AuthSignInParams): Promise<AuthResponse> {
    const { email, password } = params;
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("signin");

    authDebug.log("SIGNIN", "attempt", { email });

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
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
        authDebug.log("SIGNIN", "success", {
          userId: response.data.user?.id,
          hasSession: !!response.data.session,
          expiresAt: response.data.session?.expires_at,
          provider: response.data.user?.app_metadata?.provider,
        });
      }

      return response;
    } catch (error) {
      authDebug.log("SIGNIN", "network_error", { error });
      debug.error("Auth", "Sign in failed unexpectedly", error);
      captureException(error as Error, {
        service: "supabase",
        method: "signIn",
        email,
      });
      throw error;
    } finally {
      endTracking();
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("signout");

    authDebug.log("SIGNOUT", "attempt", {
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await supabase.auth.signOut();

      if (result.error) {
        authDebug.log("SIGNOUT", "failure", {
          error: result.error.message,
          stack: result.error.stack,
        });
        debug.error("Auth", "Sign out failed", result.error);
      } else {
        authDebug.log("SIGNOUT", "success", {
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      authDebug.log("SIGNOUT", "network_error", { error });
      debug.error("Auth", "Sign out failed unexpectedly", error);
      captureException(error as Error, {
        service: "supabase",
        method: "signOut",
      });
      throw error;
    } finally {
      endTracking();
    }
  },

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("password_reset");

    authDebug.log("PASSWORD_RESET", "attempt", { email });

    try {
      const redirectUrl = Platform.select({
        web: () =>
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : "",
        default: () => Linking.createURL("reset-password"),
      })();

      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (result.error) {
        authDebug.log("PASSWORD_RESET", "failure", {
          error: result.error.message,
          email,
        });
        debug.error("Auth", "Password reset failed", result.error);
      } else {
        authDebug.log("PASSWORD_RESET", "success", { email });
      }

      return result;
    } catch (error) {
      authDebug.log("PASSWORD_RESET", "network_error", { error });
      debug.error("Auth", "Password reset failed unexpectedly", error);
      captureException(error as Error, {
        service: "supabase",
        method: "resetPassword",
        email,
      });
      throw error;
    } finally {
      endTracking();
    }
  },

  async updatePassword(
    newPassword: string,
  ): Promise<{ data: { user: User | null }; error: Error | null }> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("password_update");

    authDebug.log("PASSWORD_UPDATE", "attempt", {
      timestamp: new Date().toISOString(),
      passwordStrength: newPassword.length >= 12 ? "strong" : "moderate",
    });

    try {
      const result = await supabase.auth.updateUser({ password: newPassword });

      if (result.error) {
        authDebug.log("PASSWORD_UPDATE", "failure", {
          error: result.error.message,
          errorCode: result.error.status,
        });
        debug.error("Auth", "Password update failed", result.error);
      } else {
        authDebug.log("PASSWORD_UPDATE", "success", {
          userId: result.data.user?.id,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      authDebug.log("PASSWORD_UPDATE", "network_error", { error });
      debug.error("Auth", "Password update failed unexpectedly", error);
      throw error;
    } finally {
      endTracking();
    }
  },

  async getSession(): Promise<{
    data: { session: Session | null };
    error: Error | null;
  }> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("session_fetch");

    authDebug.log("SESSION_REFRESH", "attempt", {
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await supabase.auth.getSession();

      if (result.error) {
        authDebug.log("SESSION_REFRESH", "failure", {
          error: result.error.message,
        });
        debug.error("Auth", "Get session failed", result.error);
      } else {
        authDebug.log("SESSION_REFRESH", "success", {
          hasSession: !!result.data.session,
          expiresAt: result.data.session?.expires_at,
          provider: result.data.session?.user?.app_metadata?.provider,
        });
      }

      return result;
    } catch (error) {
      authDebug.log("SESSION_REFRESH", "network_error", { error });
      debug.error("Auth", "Get session failed unexpectedly", error);
      throw error;
    } finally {
      endTracking();
    }
  },

  async getUser(): Promise<User | null> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("user_fetch");

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        authDebug.log("STATE_CHANGE", "failure", {
          action: "get_user",
          error: error.message,
        });
        debug.error("Auth", "Get user failed", error);
        return null;
      }

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
      authDebug.log("STATE_CHANGE", "network_error", {
        action: "get_user",
        error,
      });
      debug.error("Auth", "Get user failed unexpectedly", error);
      return null;
    } finally {
      endTracking();
    }
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) {
    const supabase = getSupabaseClient();
    return supabase.auth.onAuthStateChange(callback);
  },

  async getProfile(): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("profile_fetch");

    authDebug.log("PROFILE_UPDATE", "info", {
      action: "get_profile",
      timestamp: new Date().toISOString(),
    });

    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        authDebug.log("PROFILE_UPDATE", "info", {
          action: "get_profile",
          result: "no_user_found",
        });
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.user.id)
        .single();

      if (!error) {
        authDebug.log("PROFILE_UPDATE", "success", {
          action: "get_profile",
          userId: user.user.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          hasUsername: !!data.username,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          hasAvatar: !!data.avatar_url,
        });
        return data as UserProfile;
      }

      if (error.code === "PGRST116") {
        authDebug.log("PROFILE_UPDATE", "info", {
          action: "auto_create_profile",
          userId: user.user.id,
          reason: "profile_not_found",
        });

        const randomNumber = safeRandomInt(1000000);
        const defaultUsername = `user_${String(randomNumber).padStart(6, "0")}`;
        const displayName =
          user.user.user_metadata?.full_name ||
          user.user.email ||
          defaultUsername;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          authDebug.log("PROFILE_UPDATE", "failure", {
            action: "auto_create_profile",
            userId: user.user.id,
            error: insertError.message,
            code: insertError.code,
          });
          debug.error("Auth", "Auto-create profile failed", insertError);
          return null;
        }

        authDebug.log("PROFILE_UPDATE", "success", {
          action: "auto_create_profile",
          userId: user.user.id,
          username: defaultUsername,
        });

        return newProfile as UserProfile;
      } else {
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
      authDebug.log("PROFILE_UPDATE", "network_error", {
        action: "get_profile",
        error,
      });
      debug.error("Auth", "Get profile failed unexpectedly", error);
      return null;
    } finally {
      endTracking();
    }
  },

  async updateProfile(
    params: ProfileUpdateParams,
  ): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    const endTracking = authDebug.trackPerformance("profile_update");

    authDebug.log("PROFILE_UPDATE", "attempt", {
      action: "update_profile",
      fields: Object.keys(params),
    });

    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        authDebug.log("PROFILE_UPDATE", "failure", {
          action: "update_profile",
          reason: "no_user_found",
        });
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } = await supabase
        .from("user_profiles")
        .update(params)
        .eq("id", user.user.id)
        .select()
        .single();

      if (error) {
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

      authDebug.log("PROFILE_UPDATE", "success", {
        action: "update_profile",
        userId: user.user.id,
        updatedFields: Object.keys(params),
        timestamp: new Date().toISOString(),
      });

      return data as UserProfile;
    } catch (error) {
      authDebug.log("PROFILE_UPDATE", "network_error", {
        action: "update_profile",
        error,
      });
      debug.error("Auth", "Update profile failed unexpectedly", error);
      captureException(error as Error, {
        service: "supabase",
        method: "updateProfile",
        fields: Object.keys(params),
      });
      return null;
    } finally {
      endTracking();
    }
  },
};
