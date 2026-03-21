/**
 * Supabase Service — Barrel Re-export
 *
 * This file used to be a 1,263-line god file containing the client singleton,
 * session management, auth operations, toilet CRUD, and review CRUD all in one.
 *
 * It has been split into focused domain modules:
 *   supabaseClient.ts   — Singleton client + environment validation
 *   supabaseSession.ts  — Session refresh, health checks, timestamp utils
 *   supabaseAuth.ts     — Auth operations + profile CRUD
 *   supabaseToilets.ts  — Toilet CRUD (getNearby, getById, create)
 *   supabaseReviews.ts  — Review CRUD
 *
 * This barrel preserves the original export shape so existing imports
 * (`from "../services/supabase"`) continue to work without changes.
 */

// ── Re-exports from domain modules ──────────────────────────────────

export { getSupabaseClient } from "./supabaseClient";
export { refreshSession, checkSession } from "./supabaseSession";

// ── Composite service object (preserves `supabaseService.auth.*` etc.) ──

import { supabaseAuth } from "./supabaseAuth";
import { supabaseReviews } from "./supabaseReviews";
import { supabaseToilets } from "./supabaseToilets";

export const supabaseService = {
  auth: supabaseAuth,
  toilets: supabaseToilets,
  reviews: supabaseReviews,
};
