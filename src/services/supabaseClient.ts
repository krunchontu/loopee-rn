/**
 * Supabase Client Singleton
 *
 * Provides a single shared Supabase client instance for the entire app.
 * All other service modules import from here to guarantee one auth state.
 */

import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";

import { debug } from "../utils/debug";

// Fail fast if env is misconfigured
if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  debug.error("Supabase", "Missing environment variables", {
    url: !!EXPO_PUBLIC_SUPABASE_URL,
    key: !!EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  throw new Error("Supabase environment configuration is missing.");
}

/**
 * Singleton implementation of Supabase client.
 * Ensures a single client instance with consistent auth state.
 */
class SupabaseClientSingleton {
  private static instance: SupabaseClient;

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
        },
      );
      debug.log("Supabase", "Created Supabase client singleton instance");
    }
    return this.instance;
  }
}

/** Get the shared Supabase client instance. */
export const getSupabaseClient = () => SupabaseClientSingleton.getInstance();

/**
 * Generate a cryptographically random integer in [0, max).
 * Falls back to Math.random() if expo-crypto is unavailable.
 */
export const safeRandomInt = (max: number): number => {
  try {
    const hex = Crypto.randomUUID().replace(/-/g, "").substring(0, 8);
    const n = parseInt(hex, 16);
    if (!isNaN(n)) return Math.floor(n % max);
  } catch {
    // expo-crypto unavailable (background execution, older JSC, etc.)
  }
  return Math.floor(Math.random() * max);
};
