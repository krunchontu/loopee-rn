/**
 * @file Session Guard & Retry Utilities
 *
 * Provides session validation, timeout racing, and retry-with-backoff
 * logic for contribution operations that require an authenticated user.
 */

import * as Crypto from "expo-crypto";

import { refreshSession, checkSession } from "../supabase";
import { authDebug } from "../../utils/AuthDebugger";
import { debug } from "../../utils/debug";

// ── Constants ───────────────────────────────────────────────────────────────

const SESSION_VALIDATION_TIMEOUT = 10000; // 10 seconds
const SESSION_REFRESH_TIMEOUT = 12000; // 12 seconds
const SESSION_REFRESH_RETRIES = 2;

// ── Debug logger ────────────────────────────────────────────────────────────

const logContribution = (
  level: "log" | "error" | "warn",
  context: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  const timestamp = new Date().toISOString();
  const formattedData: Record<string, unknown> = {
    ...data,
    timestamp,
    context: `contributionService.${context}`,
  };

  switch (level) {
    case "error":
      debug.error(
        "contributionService",
        `[${context}] ${message}`,
        formattedData,
      );
      break;
    case "warn":
      debug.warn(
        "contributionService",
        `[${context}] ${message}`,
        formattedData,
      );
      break;
    default:
      debug.log(
        "contributionService",
        `[${context}] ${message}`,
        formattedData,
      );
  }
};

// Re-export the logger so the main module can use it too
export { logContribution };

// ── In-memory state ─────────────────────────────────────────────────────────

/** Track ongoing session validation operations to prevent duplicates. */
export const validationPromises = new Map<string, Promise<void>>();

// ── Timeout / Retry helpers ─────────────────────────────────────────────────

/**
 * Races an operation against a timeout with AbortController support.
 * When the timeout fires the AbortController signal is aborted so the
 * underlying fetch is cancelled rather than left running as an orphan.
 */
export const raceWithTimeout = <T>(
  promiseOrFactory: PromiseLike<T> | ((signal: AbortSignal) => PromiseLike<T>),
  ms: number,
  operation: string,
): Promise<T> => {
  const controller = new AbortController();
  let timerId: ReturnType<typeof setTimeout>;

  const promise =
    typeof promiseOrFactory === "function"
      ? (promiseOrFactory as (signal: AbortSignal) => PromiseLike<T>)(
          controller.signal,
        )
      : promiseOrFactory;

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Operation '${operation}' timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timerId);
  });
};

/**
 * Retry an async operation with exponential backoff.
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number,
  retryDelayMs: number,
  operationName: string,
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        logContribution(
          "log",
          "withRetry",
          `Retry attempt ${attempt}/${retries} for ${operationName}`,
          { attempt, maxRetries: retries },
        );
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logContribution(
        "warn",
        "withRetry",
        `Attempt ${attempt + 1}/${retries + 1} failed for ${operationName}`,
        {
          error: lastError.message,
          attempt: attempt + 1,
          remaining: retries - attempt,
        },
      );

      if (attempt === retries) {
        logContribution(
          "error",
          "withRetry",
          `All ${retries + 1} attempts failed for ${operationName}`,
          { lastError },
        );
        throw lastError;
      }
    }
  }

  throw new Error(`Unexpected retry logic failure in ${operationName}`);
};

// ── Session validation ──────────────────────────────────────────────────────

/**
 * Cancels a session validation promise when it completes or fails.
 */
export function completeValidation(operationId: string): void {
  if (validationPromises.has(operationId)) {
    validationPromises.delete(operationId);
    logContribution(
      "log",
      "completeValidation",
      `Completed validation operation ${operationId}`,
      { remainingOperations: validationPromises.size },
    );
  }
}

/**
 * Generate a user-friendly error message based on session issues.
 */
export function getSessionErrorMessage(
  detailedStatus: string,
  expiresIn: number | null,
): string {
  switch (detailedStatus) {
    case "no_session":
      return "No active session found. Please log in to continue.";
    case "expired_past":
      return "Your session has expired. Please log in again to continue.";
    case "just_expired":
      return "Your session just expired. Please log in again to continue.";
    case "suspicious_future":
      return "Your session has an invalid expiration time. Please log in again.";
    case "invalid_date":
      return "Your session has an invalid date format. Please log in again.";
    case "missing_expiration":
      return "Your session is missing expiration information. Please log in again.";
    case "calculation_error":
      return "We couldn't validate your session. Please log in again.";
    case "network_error":
      return "Network error while checking your session. Please check your connection and try again.";
    default:
      if (expiresIn !== null && expiresIn < 0) {
        return "Your session has expired. Please log in again to continue.";
      }
      return "Authentication check failed: Please log in again";
  }
}

/**
 * Ensures the user has a valid session before performing critical operations.
 * Will attempt to refresh the session if needed with improved retry logic.
 * @throws Error if user is not authenticated or session cannot be refreshed
 */
export async function ensureValidSession(): Promise<void> {
  let randomId: string;
  try {
    randomId = Crypto.randomUUID().substring(0, 8);
  } catch {
    randomId = Math.random().toString(36).substring(2, 10);
  }
  const operationId = `session-validation-${Date.now()}-${randomId}`;

  // Check if we already have a validation operation in progress
  const existingValidation = validationPromises.size > 0;
  if (existingValidation) {
    logContribution(
      "log",
      "ensureValidSession",
      "Using existing validation operation",
      { operationCount: validationPromises.size },
    );

    const firstValidation = validationPromises.values().next().value;
    if (firstValidation) {
      try {
        await firstValidation;
        return;
      } catch (error) {
        logContribution(
          "warn",
          "ensureValidSession",
          "Existing validation failed, retrying",
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    }
  }

  // Create a new validation operation
  const validationOperation = (async () => {
    try {
      logContribution(
        "log",
        "ensureValidSession",
        "Checking session validity",
      );

      const sessionInfo = await raceWithTimeout(
        checkSession(),
        SESSION_VALIDATION_TIMEOUT,
        "session validation",
      );

      authDebug.log("SESSION_REFRESH", "info", {
        action: "check_before_submission",
        valid: sessionInfo.valid,
        expiresIn: sessionInfo.expiresIn,
        status: sessionInfo.detailedStatus,
        timestamp: new Date().toISOString(),
      });

      logContribution("log", "ensureValidSession", "Session check results", {
        valid: sessionInfo.valid,
        hasSession: !!sessionInfo.session,
        expiresIn: sessionInfo.expiresIn,
        needsForceRefresh: sessionInfo.needsForceRefresh,
        detailedStatus: sessionInfo.detailedStatus,
        needsRefresh:
          !sessionInfo.valid ||
          sessionInfo.needsForceRefresh ||
          (sessionInfo.expiresIn && sessionInfo.expiresIn < 600),
      });

      if (!sessionInfo.valid && !sessionInfo.session) {
        logContribution(
          "error",
          "ensureValidSession",
          "No active session found",
        );
        throw new Error("Authentication required: Please log in");
      } else if (
        !sessionInfo.valid ||
        sessionInfo.needsForceRefresh ||
        sessionInfo.detailedStatus === "suspicious_future" ||
        sessionInfo.detailedStatus === "expired_past" ||
        (sessionInfo.expiresIn && sessionInfo.expiresIn < 600)
      ) {
        const reason = sessionInfo.needsForceRefresh
          ? "session has invalid expiration time"
          : sessionInfo.detailedStatus === "expired_past"
            ? "session expiration date is far in the past"
            : sessionInfo.detailedStatus === "suspicious_future"
              ? "session expiration date is suspiciously far in the future"
              : "session is expired or expiring soon";

        logContribution(
          "warn",
          "ensureValidSession",
          `Session needs refresh (${reason})`,
          {
            expiresIn: sessionInfo.expiresIn,
            needsForceRefresh: sessionInfo.needsForceRefresh,
            detailedStatus: sessionInfo.detailedStatus,
          },
        );

        try {
          const refreshed = await withRetry(
            async () => {
              return await raceWithTimeout(
                refreshSession(SESSION_REFRESH_RETRIES),
                SESSION_REFRESH_TIMEOUT,
                "session refresh",
              );
            },
            1,
            1000,
            "session refresh",
          );

          if (!refreshed) {
            logContribution(
              "error",
              "ensureValidSession",
              "Session refresh failed after all retry attempts",
            );
            throw new Error("Authentication expired: Please log in again");
          }

          const verifySession = await raceWithTimeout(
            checkSession(),
            SESSION_VALIDATION_TIMEOUT,
            "session validation after refresh",
          );

          if (!verifySession.valid) {
            logContribution(
              "error",
              "ensureValidSession",
              "Session is still invalid after refresh",
              {
                expiresIn: verifySession.expiresIn,
                needsForceRefresh: verifySession.needsForceRefresh,
                detailedStatus: verifySession.detailedStatus,
              },
            );

            const errorMessage = getSessionErrorMessage(
              verifySession.detailedStatus || "unknown",
              verifySession.expiresIn,
            );
            throw new Error(errorMessage);
          }

          logContribution(
            "log",
            "ensureValidSession",
            "Session successfully refreshed and verified",
            {
              newExpiresIn: verifySession.expiresIn,
              newDetailedStatus: verifySession.detailedStatus,
            },
          );
        } catch (refreshError) {
          logContribution(
            "error",
            "ensureValidSession",
            "Session refresh failed with retry mechanism",
            { error: refreshError },
          );

          throw new Error(
            refreshError instanceof Error &&
              refreshError.message.includes("timeout")
              ? "Authentication refresh timed out. Please check your network and try again."
              : "Authentication refresh failed. Please log in again.",
          );
        }
      } else {
        logContribution("log", "ensureValidSession", "Session is valid", {
          expiresIn: sessionInfo.expiresIn,
          detailedStatus: sessionInfo.detailedStatus,
        });
      }
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      };

      logContribution(
        "error",
        "ensureValidSession",
        "Session validation error",
        errorDetails,
      );

      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          throw new Error(
            "Authentication check timed out. Please check your network connection and try again.",
          );
        } else if (error.message.includes("refresh")) {
          throw new Error(
            "Your session has expired and couldn't be refreshed. Please log in again to continue.",
          );
        } else {
          throw error;
        }
      } else {
        throw new Error("Authentication check failed: Please log in again");
      }
    } finally {
      completeValidation(operationId);
    }
  })();

  validationPromises.set(operationId, validationOperation);
  await validationOperation;
}

/**
 * Submit data with session validation and network resilience.
 * Generic wrapper to make operations robust against session/network issues.
 */
export async function submitWithSessionGuard<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    await ensureValidSession();
    return await operation();
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("session") ||
        error.message.includes("authentication") ||
        error.message.includes("log in")
      ) {
        logContribution(
          "error",
          "submitWithSessionGuard",
          "Session error during submission",
          { message: error.message },
        );
      } else {
        logContribution(
          "error",
          "submitWithSessionGuard",
          "Operation error",
          { message: error.message },
        );
      }
    }
    throw error;
  }
}
