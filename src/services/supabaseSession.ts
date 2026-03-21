/**
 * Supabase Session Management
 *
 * Handles session refresh with retry/backoff, session health checks,
 * and timestamp normalization for Supabase auth tokens.
 */

import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "./supabaseClient";
import { authDebug } from "../utils/AuthDebugger";
import { debug } from "../utils/debug";

let isRefreshing = false;

/**
 * Refresh the current session with retry/exponential backoff.
 * Uses a lock to prevent concurrent refreshes.
 */
export async function refreshSession(retryCount: number = 2): Promise<boolean> {
  if (isRefreshing) {
    debug.log("Supabase", "Session refresh already in progress, skipping");
    return true;
  }

  try {
    isRefreshing = true;
    const client = getSupabaseClient();

    authDebug.log("SESSION_REFRESH", "attempt", {
      timestamp: new Date().toISOString(),
      retryCount,
    });

    let lastError = null;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          debug.log(
            "Supabase",
            `Retry attempt ${attempt}/${retryCount} after ${backoffMs}ms`,
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
            retryAttempt: true,
          });
          continue;
        }

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
          retryAttempt: true,
        });
      }
    }

    authDebug.log("SESSION_REFRESH", "failure", {
      totalAttempts: retryCount + 1,
      lastError,
      timestamp: new Date().toISOString(),
      allAttemptsFailed: true,
    });

    return false;
  } catch (error) {
    authDebug.log("SESSION_REFRESH", "network_error", { error });
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Converts a Supabase expires_at timestamp (Unix seconds) to a Date.
 *
 * The Supabase SDK always sets expires_at as Unix seconds:
 *   expires_at: Math.round(Date.now() / 1000) + data.expires_in
 */
export function normalizeTimestamp(
  timestamp: number | string | undefined | null,
): Date | null {
  if (timestamp === undefined || timestamp === null) {
    return null;
  }

  const numeric = typeof timestamp === "number" ? timestamp : Number(timestamp);

  if (isNaN(numeric) || numeric <= 0) {
    debug.warn("Supabase", "Invalid session timestamp", { timestamp });
    return null;
  }

  const date = new Date(numeric * 1000);

  if (!isValidDate(date)) {
    debug.warn("Supabase", "Timestamp produced invalid date", { timestamp });
    return null;
  }

  return date;
}

/** Checks if a date object is valid. */
export function isValidDate(date: Date | null | undefined): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/** Checks if an expiration is within reasonable bounds. */
export function isReasonableExpiration(expiresIn: number): boolean {
  const MAX_EXPIRATION = 86400 * 90; // 90 days
  const MIN_EXPIRATION = -300; // Allow slightly expired (5 min)
  return expiresIn > MIN_EXPIRATION && expiresIn < MAX_EXPIRATION;
}

/**
 * Check if the current session is valid.
 * Returns detailed status including whether a refresh is needed.
 */
export async function checkSession(): Promise<{
  valid: boolean;
  session: Session | null;
  expiresIn: number | null;
  needsForceRefresh: boolean;
  detailedStatus?: string;
}> {
  try {
    const client = getSupabaseClient();
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

    let expiresIn = null;
    let needsForceRefresh = false;
    let detailedStatus = "valid";

    try {
      if (data.session.expires_at) {
        const expiresAt = normalizeTimestamp(data.session.expires_at);
        const now = new Date();

        if (isValidDate(expiresAt)) {
          expiresIn = Math.floor((expiresAt!.getTime() - now.getTime()) / 1000);

          if (!isReasonableExpiration(expiresIn)) {
            if (expiresIn < -300) {
              debug.warn(
                "Supabase",
                "Session expiration date is far in the past",
                {
                  expiresIn,
                  expiresAtRaw: data.session.expires_at,
                  expiresAtNormalized: expiresAt!.toISOString(),
                  now: now.toISOString(),
                },
              );
              detailedStatus = "expired_past";
              needsForceRefresh = true;
            } else if (expiresIn > 86400 * 30) {
              debug.warn(
                "Supabase",
                "Session expiration date is suspiciously far in the future",
                {
                  expiresIn,
                  expiresAtRaw: data.session.expires_at,
                  expiresAtNormalized: expiresAt!.toISOString(),
                  now: now.toISOString(),
                },
              );
              detailedStatus = "suspicious_future";
            }
          } else {
            if (expiresIn < 0) {
              detailedStatus = "just_expired";
              needsForceRefresh = true;
            } else if (expiresIn < 600) {
              detailedStatus = "expiring_soon";
              needsForceRefresh = true;
            }
          }
        } else {
          debug.error("Supabase", "Invalid session expiration date", {
            expiresAtRaw: data.session.expires_at,
            normalizedResult: expiresAt,
          });
          expiresIn = -1;
          needsForceRefresh = true;
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
        dateError,
      );
      expiresIn = -1;
      needsForceRefresh = true;
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
