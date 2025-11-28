/**
 * @file Contribution Service
 *
 * Service for handling toilet contribution operations
 *
 * IMPORTANT: User ID and Profile handling
 * 1. The submitter_id field in toilet_submissions must match auth.uid()
 * 2. We now use auth.uid() directly for submissions
 * 3. RLS policies verify that submitter_id::text = auth.uid()::text
 */

import {
  supabaseService,
  getSupabaseClient,
  refreshSession,
  checkSession,
} from "./supabase";
import type {
  ToiletSubmission,
  SubmissionPreview,
  SubmissionType,
  SubmissionStatus,
} from "../types/contribution";
import type { Toilet } from "../types/toilet";
import { authDebug } from "../utils/AuthDebugger";
import { debug } from "../utils/debug";
import * as Crypto from "expo-crypto";

// Use the shared Supabase client instance for consistent auth state
const supabase = getSupabaseClient();

/**
 * Enhanced debug logger for contribution service
 * Provides more detailed logging with consistent formatting
 */
const logContribution = (
  level: "log" | "error" | "warn",
  context: string,
  message: string,
  data?: any
) => {
  const timestamp = new Date().toISOString();
  const formattedData = {
    ...data,
    timestamp,
    context: `contributionService.${context}`,
  };

  switch (level) {
    case "error":
      debug.error(
        "contributionService",
        `[${context}] ${message}`,
        formattedData
      );
      break;
    case "warn":
      debug.warn(
        "contributionService",
        `[${context}] ${message}`,
        formattedData
      );
      break;
    default:
      debug.log(
        "contributionService",
        `[${context}] ${message}`,
        formattedData
      );
  }
};

// Default timeout for API operations in milliseconds
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const SESSION_VALIDATION_TIMEOUT = 10000; // 10 seconds (increased from 5000ms)
const SESSION_REFRESH_TIMEOUT = 12000; // 12 seconds (increased from 5000ms)
const SESSION_REFRESH_RETRIES = 2; // Number of retry attempts for session refresh

/**
 * Creates a timeout promise that rejects after the specified time
 * @param ms Milliseconds to wait before timeout
 * @param operation Name of the operation (for error messaging)
 * @returns A promise that rejects after the timeout period
 */
const createTimeout = (ms: number, operation: string): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation '${operation}' timed out after ${ms}ms`));
    }, ms);
  });
};

/**
 * Creates a promise that can be retried multiple times with exponential backoff
 * @param operation Function that returns a promise to retry
 * @param retries Maximum number of retry attempts
 * @param retryDelayMs Base delay between retries in milliseconds (will increase exponentially)
 * @param operationName Name of the operation for logging
 * @returns Promise that will be retried on failure
 */
const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number,
  retryDelayMs: number,
  operationName: string
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Log retry attempt
        logContribution(
          "log",
          "withRetry",
          `Retry attempt ${attempt}/${retries} for ${operationName}`,
          { attempt, maxRetries: retries }
        );

        // Exponential backoff
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Attempt the operation
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
        }
      );

      // If this was the last attempt, we're out of retries
      if (attempt === retries) {
        logContribution(
          "error",
          "withRetry",
          `All ${retries + 1} attempts failed for ${operationName}`,
          { lastError }
        );
        throw lastError;
      }

      // Otherwise continue to next retry
    }
  }

  // This should never be reached because either:
  // 1. An successful attempt would have returned already
  // 2. The last failed attempt would have thrown
  throw new Error(`Unexpected retry logic failure in ${operationName}`);
};

/**
 * Service for handling toilet submission operations
 */
export const contributionService = {
  /**
   * Track ongoing session validation operations to prevent duplicates
   */
  validationPromises: new Map<string, Promise<void>>(),

  /**
   * Track recent submissions to prevent duplicates
   * Maps content hash to submission timestamp and ID
   */
  recentSubmissions: new Map<string, { timestamp: number; id: string }>(),

  /**
   * Generate a simple hash for toilet data to detect duplicate submissions
   * @param data Toilet data to hash
   * @returns Hash string representing the content
   */
  generateSubmissionHash(data: Partial<Toilet>): string {
    // Create a normalized object with key fields that would identify a unique submission
    const keyData = {
      name: data.name || "",
      location:
        data.location ?
          `${data.location.latitude.toFixed(6)},${data.location.longitude.toFixed(6)}`
        : "",
      address: data.address || "",
      buildingName: data.buildingName || "",
      floorLevel:
        data.floorLevel !== undefined ? data.floorLevel.toString() : "",
    };

    // Convert to string and create a simple hash
    return JSON.stringify(keyData);
  },

  /**
   * Check if this is a duplicate of a recent submission
   * @param data Toilet data to check
   * @param dedupeTimeWindowMs Millisecond window to consider for duplicates (default: 10 seconds)
   * @returns Object indicating if it's a duplicate and the existing submission ID if it is
   */
  isDuplicateSubmission(
    data: Partial<Toilet>,
    dedupeTimeWindowMs: number = 10000
  ): { isDuplicate: boolean; existingId?: string } {
    const hash = this.generateSubmissionHash(data);
    const existingSubmission = this.recentSubmissions.get(hash);

    if (existingSubmission) {
      const timeSinceLastSubmission = Date.now() - existingSubmission.timestamp;

      // Consider it a duplicate if within the time window
      if (timeSinceLastSubmission < dedupeTimeWindowMs) {
        return {
          isDuplicate: true,
          existingId: existingSubmission.id,
        };
      }
    }

    return { isDuplicate: false };
  },

  /**
   * Record a submission to prevent duplicates
   * @param data The toilet data that was submitted
   * @param submissionId The ID of the successful submission
   */
  recordSubmission(data: Partial<Toilet>, submissionId: string): void {
    const hash = this.generateSubmissionHash(data);

    // Store submission details with current timestamp
    this.recentSubmissions.set(hash, {
      timestamp: Date.now(),
      id: submissionId,
    });

    // Clean up old entries to prevent memory growth
    this.cleanupOldSubmissions();
  },

  /**
   * Remove submission tracking entries older than 30 minutes
   * to prevent unbounded memory growth
   */
  cleanupOldSubmissions(): void {
    const now = Date.now();
    const thirtyMinutesMs = 30 * 60 * 1000;

    for (const [hash, { timestamp }] of this.recentSubmissions.entries()) {
      if (now - timestamp > thirtyMinutesMs) {
        this.recentSubmissions.delete(hash);
      }
    }
  },

  /**
   * Cancels a session validation promise when it completes or fails
   * @param operationId The unique identifier for this validation operation
   */
  completeValidation(operationId: string): void {
    if (this.validationPromises.has(operationId)) {
      this.validationPromises.delete(operationId);
      logContribution(
        "log",
        "completeValidation",
        `Completed validation operation ${operationId}`,
        { remainingOperations: this.validationPromises.size }
      );
    }
  },

  /**
   * Generate a user-friendly error message based on session issues
   * @param detailedStatus The detailed status from session validation
   * @param expiresIn Time in seconds until session expires
   * @returns A user-friendly error message
   */
  getSessionErrorMessage(
    detailedStatus: string,
    expiresIn: number | null
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
        // For generic issues with expiresIn
        if (expiresIn !== null && expiresIn < 0) {
          return "Your session has expired. Please log in again to continue.";
        }
        return "Authentication check failed: Please log in again";
    }
  },

  /**
   * Ensures the user has a valid session before performing critical operations
   * Will attempt to refresh the session if needed with improved retry logic
   * @throws Error if user is not authenticated or session cannot be refreshed
   */
  async ensureValidSession(): Promise<void> {
    // Generate a unique ID for this validation operation using cryptographically secure random
    const randomId = Crypto.randomUUID().substring(0, 8);
    const operationId = `session-validation-${Date.now()}-${randomId}`;

    // Check if we already have a validation operation in progress
    const existingValidation = this.validationPromises.size > 0;
    if (existingValidation) {
      logContribution(
        "log",
        "ensureValidSession",
        "Using existing validation operation",
        {
          operationCount: this.validationPromises.size,
        }
      );

      // Use the first pending validation operation
      const firstValidation = this.validationPromises.values().next().value;
      if (firstValidation) {
        try {
          await firstValidation;
          return; // If the existing validation succeeds, we're done
        } catch (error) {
          // If the existing validation fails, we'll try our own below
          logContribution(
            "warn",
            "ensureValidSession",
            "Existing validation failed, retrying",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }
    }

    // Create a new validation operation
    const validationOperation = (async () => {
      try {
        // Check current session status with increased timeout
        logContribution(
          "log",
          "ensureValidSession",
          "Checking session validity"
        );

        const sessionInfo = await Promise.race([
          checkSession(),
          createTimeout(SESSION_VALIDATION_TIMEOUT, "session validation"),
        ]);

        // Log session details
        authDebug.log("SESSION_REFRESH", "info", {
          action: "check_before_submission",
          valid: sessionInfo.valid,
          expiresIn: sessionInfo.expiresIn,
          status: sessionInfo.detailedStatus,
          timestamp: new Date().toISOString(),
        });

        // Log more detailed information about the session
        logContribution("log", "ensureValidSession", "Session check results", {
          valid: sessionInfo.valid,
          hasSession: !!sessionInfo.session,
          expiresIn: sessionInfo.expiresIn,
          needsForceRefresh: sessionInfo.needsForceRefresh,
          detailedStatus: sessionInfo.detailedStatus,
          needsRefresh:
            !sessionInfo.valid ||
            sessionInfo.needsForceRefresh ||
            (sessionInfo.expiresIn && sessionInfo.expiresIn < 600), // Increased threshold to 10 minutes
        });

        if (!sessionInfo.valid && !sessionInfo.session) {
          // No session at all - user needs to log in
          logContribution(
            "error",
            "ensureValidSession",
            "No active session found"
          );
          throw new Error("Authentication required: Please log in");
        } else if (
          !sessionInfo.valid ||
          sessionInfo.needsForceRefresh ||
          sessionInfo.detailedStatus === "suspicious_future" ||
          sessionInfo.detailedStatus === "expired_past" ||
          (sessionInfo.expiresIn && sessionInfo.expiresIn < 600) // Increased threshold to 10 minutes
        ) {
          // Session expired or about to expire soon, or has invalid expiration time
          const reason =
            sessionInfo.needsForceRefresh ?
              "session has invalid expiration time"
            : sessionInfo.detailedStatus === "expired_past" ?
              "session expiration date is far in the past"
            : sessionInfo.detailedStatus === "suspicious_future" ?
              "session expiration date is suspiciously far in the future"
            : "session is expired or expiring soon";

          logContribution(
            "warn",
            "ensureValidSession",
            `Session needs refresh (${reason})`,
            {
              expiresIn: sessionInfo.expiresIn,
              needsForceRefresh: sessionInfo.needsForceRefresh,
              detailedStatus: sessionInfo.detailedStatus,
            }
          );

          // Attempt to refresh the session with timeout and retry logic
          try {
            const refreshed = await withRetry(
              // Operation to retry
              async () => {
                return await Promise.race([
                  // Pass retryCount parameter to refreshSession
                  refreshSession(SESSION_REFRESH_RETRIES),
                  createTimeout(SESSION_REFRESH_TIMEOUT, "session refresh"),
                ]);
              },
              // Retry parameters
              1, // One additional retry at this level (combined with internal retries)
              1000, // Base delay of 1 second
              "session refresh"
            );

            if (!refreshed) {
              logContribution(
                "error",
                "ensureValidSession",
                "Session refresh failed after all retry attempts"
              );
              throw new Error("Authentication expired: Please log in again");
            }

            // Verify the refreshed session
            const verifySession = await Promise.race([
              checkSession(),
              createTimeout(
                SESSION_VALIDATION_TIMEOUT,
                "session validation after refresh"
              ),
            ]);

            if (!verifySession.valid) {
              logContribution(
                "error",
                "ensureValidSession",
                "Session is still invalid after refresh",
                {
                  expiresIn: verifySession.expiresIn,
                  needsForceRefresh: verifySession.needsForceRefresh,
                  detailedStatus: verifySession.detailedStatus,
                }
              );

              // Get user-friendly error message based on detailed status
              const errorMessage = this.getSessionErrorMessage(
                verifySession.detailedStatus || "unknown",
                verifySession.expiresIn
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
              }
            );
          } catch (refreshError) {
            // Enhanced error for refresh failures
            logContribution(
              "error",
              "ensureValidSession",
              "Session refresh failed with retry mechanism",
              { error: refreshError }
            );

            throw new Error(
              (
                refreshError instanceof Error &&
                refreshError.message.includes("timeout")
              ) ?
                "Authentication refresh timed out. Please check your network and try again."
              : "Authentication refresh failed. Please log in again."
            );
          }
        } else {
          logContribution("log", "ensureValidSession", "Session is valid", {
            expiresIn: sessionInfo.expiresIn,
            detailedStatus: sessionInfo.detailedStatus,
          });
        }
      } catch (error) {
        // Provide more context about the error
        const errorDetails = {
          message: error instanceof Error ? error.message : String(error),
          type: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        };

        logContribution(
          "error",
          "ensureValidSession",
          "Session validation error",
          errorDetails
        );

        // Improve and categorize error messages based on error type
        if (error instanceof Error) {
          if (error.message.includes("timeout")) {
            throw new Error(
              "Authentication check timed out. Please check your network connection and try again."
            );
          } else if (error.message.includes("refresh")) {
            throw new Error(
              "Your session has expired and couldn't be refreshed. Please log in again to continue."
            );
          } else {
            throw error; // Keep the original error message if it's already descriptive
          }
        } else {
          throw new Error("Authentication check failed: Please log in again");
        }
      } finally {
        // Always clean up the validation promise when done
        this.completeValidation(operationId);
      }
    })();

    // Store the validation promise
    this.validationPromises.set(operationId, validationOperation);

    // Wait for validation to complete
    await validationOperation;
  },

  /**
   * Submit data with session validation and network resilience
   * This is a generic wrapper to make operations more robust against session/network issues
   * @param operation The operation to perform with a valid session
   * @returns Result of the operation
   */
  async submitWithSessionGuard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      // First ensure session is valid
      await this.ensureValidSession();

      // Perform the operation with the valid session
      return await operation();
    } catch (error) {
      // Enhance error with more context about submission
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
            { message: error.message }
          );
        } else {
          logContribution(
            "error",
            "submitWithSessionGuard",
            "Operation error",
            { message: error.message }
          );
        }
      }

      throw error;
    }
  },
  /**
   * Submit a new toilet with duplicate submission protection
   * @param toiletData The toilet data to submit
   * @returns The created submission
   */
  async submitNewToilet(
    toiletData: Partial<Toilet>
  ): Promise<ToiletSubmission> {
    // Check for duplicate submissions first
    const dupeCheck = this.isDuplicateSubmission(toiletData);
    if (dupeCheck.isDuplicate) {
      logContribution(
        "warn",
        "submitNewToilet",
        "Prevented duplicate submission",
        {
          existingId: dupeCheck.existingId,
          timeBetweenSubmissions: "< 10 seconds",
        }
      );

      // Return the existing submission instead of creating a duplicate
      throw new Error(
        "A similar toilet was just submitted. Please wait a moment before trying again."
      );
    }

    logContribution(
      "log",
      "submitNewToilet",
      "Starting toilet submission process",
      {
        dataFields: Object.keys(toiletData),
        hasLocation: !!toiletData.location,
        hasName: !!toiletData.name,
      }
    );

    try {
      // First ensure we have a valid session
      logContribution(
        "log",
        "submitNewToilet",
        "Validating session before submission"
      );
      await this.ensureValidSession();

      logContribution("log", "submitNewToilet", "Session validation complete");

      // Get authenticated user to explicitly pass the ID
      logContribution("log", "submitNewToilet", "Getting authenticated user");
      const user = await Promise.race([
        supabaseService.auth.getUser(),
        createTimeout(5000, "get authenticated user"),
      ]);

      if (!user) {
        logContribution("error", "submitNewToilet", "User not authenticated");
        throw new Error("You must be logged in to submit a toilet");
      }

      logContribution(
        "log",
        "submitNewToilet",
        "Authenticated user for submission",
        {
          userId: user.id,
        }
      );

      // First, check eligibility as a diagnostic step
      logContribution(
        "log",
        "submitNewToilet",
        "Checking submission eligibility"
      );
      const eligibilityCheck = await Promise.race([
        supabase.rpc("check_submission_eligibility"),
        createTimeout(8000, "eligibility check"),
      ]);

      if (eligibilityCheck.error) {
        logContribution("warn", "submitNewToilet", "Eligibility check failed", {
          errorCode: eligibilityCheck.error.code,
          errorMessage: eligibilityCheck.error.message,
        });
        // Continue anyway, as the main function will handle errors
      } else {
        logContribution("log", "submitNewToilet", "Eligibility check passed", {
          results: eligibilityCheck.data,
        });
      }

      // Create submission payload
      const submissionPayload = {
        p_data: toiletData,
        p_submission_type: "new",
        p_explicit_user_id: user.id,
      };

      logContribution(
        "log",
        "submitNewToilet",
        "Calling submit_toilet function",
        {
          submissionType: "new",
          userId: user.id,
        }
      );

      // Use the database function with explicit user ID and timeout
      const insertResponse = await Promise.race([
        supabase.rpc("submit_toilet", submissionPayload),
        createTimeout(DEFAULT_TIMEOUT, "toilet submission"),
      ]);

      if (insertResponse.error) {
        // Enhanced error logging with specific error codes
        const pgError = insertResponse.error;
        logContribution(
          "error",
          "submitNewToilet",
          `Error submitting toilet [${pgError.code}]`,
          {
            errorCode: pgError.code,
            errorMessage: pgError.message,
            hint: pgError.hint,
            details: pgError.details,
          }
        );

        // Special handling for specific error types
        if (pgError.code === "42501") {
          // Permission denied
          throw new Error(
            "Permission denied: Please log out and log back in to refresh your session"
          );
        } else if (pgError.code === "57014") {
          // Query canceled due to timeout
          throw new Error(
            "Submission is taking too long. Please try again or check your network connection."
          );
        } else {
          throw new Error(
            `Failed to submit toilet: ${insertResponse.error.message}`
          );
        }
      }

      if (!insertResponse.data) {
        logContribution(
          "error",
          "submitNewToilet",
          "No data returned from successful submission"
        );
        throw new Error("Failed to submit toilet - no data returned");
      }

      // Successfully submitted - record this to prevent duplicates
      const submissionData = insertResponse.data as ToiletSubmission;

      logContribution(
        "log",
        "submitNewToilet",
        "Toilet submission successful",
        {
          id: submissionData.id,
          status: submissionData.status,
        }
      );

      // Record this submission to prevent duplicates
      this.recordSubmission(toiletData, submissionData.id);

      return submissionData;
    } catch (err) {
      // Final error handler with improved reporting
      const errorDetails = {
        type: err instanceof Error ? err.constructor.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        isTimeout: err instanceof Error && err.message.includes("timed out"),
      };

      logContribution(
        "error",
        "submitNewToilet",
        "Error in submission process",
        errorDetails
      );

      // Re-throw with user-friendly message but preserve original error details
      if (err instanceof Error) {
        // Add specific messaging for timeouts
        if (err.message.includes("timed out")) {
          throw new Error(
            "Submission timed out. The server might be busy or your connection may be slow. Please try again."
          );
        }
        throw err; // Preserve error object with stack trace
      } else {
        throw new Error(
          "An unexpected error occurred during toilet submission"
        );
      }
    }
  },

  /**
   * Submit an edit for an existing toilet
   * @param toiletId ID of the toilet to edit
   * @param toiletData Updated toilet data
   * @param reason Reason for the edit
   * @returns The created submission
   */
  async submitToiletEdit(
    toiletId: string,
    toiletData: Partial<Toilet>,
    reason: string
  ): Promise<ToiletSubmission> {
    debug.log(
      "contributionService",
      "Using database function for edit submission"
    );

    try {
      // Get authenticated user to explicitly pass the ID
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error("contributionService", "User not authenticated");
        throw new Error("You must be logged in to edit a toilet");
      }

      debug.log("contributionService", "Authenticated user for edit", {
        userId: user.id,
      });

      // Use the database function with explicit user ID (with p_ prefixed parameters)
      const insertResponse = await supabase.rpc("submit_toilet", {
        p_data: toiletData,
        p_submission_type: "edit",
        p_toilet_id: toiletId,
        p_reason: reason,
        p_explicit_user_id: user.id, // Pass user ID explicitly
      });

      if (insertResponse.error) {
        debug.error(
          "contributionService",
          "Error editing toilet",
          insertResponse.error
        );
        throw new Error(
          `Failed to submit edit: ${insertResponse.error.message}`
        );
      }

      if (!insertResponse.data || insertResponse.data.length === 0) {
        throw new Error("Failed to submit edit - no data returned");
      }

      return insertResponse.data[0] as ToiletSubmission;
    } catch (err) {
      debug.error("contributionService", "Error in edit submission", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error("An unexpected error occurred during toilet edit");
      }
    }
  },

  /**
   * Report an issue with a toilet
   * @param toiletId ID of the toilet to report
   * @param issueType Type of issue
   * @param details Description of the issue
   * @returns The created submission
   */
  async reportToiletIssue(
    toiletId: string,
    issueType: string,
    details: string
  ): Promise<ToiletSubmission> {
    debug.log(
      "contributionService",
      "Using database function for report submission"
    );

    try {
      // Get authenticated user to explicitly pass the ID
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error("contributionService", "User not authenticated");
        throw new Error("You must be logged in to report an issue");
      }

      debug.log("contributionService", "Authenticated user for report", {
        userId: user.id,
      });

      // Use the database function with explicit user ID (with p_ prefixed parameters)
      const insertResponse = await supabase.rpc("submit_toilet", {
        p_data: { issueType, details },
        p_submission_type: "report",
        p_toilet_id: toiletId,
        p_reason: details,
        p_explicit_user_id: user.id, // Pass user ID explicitly
      });

      if (insertResponse.error) {
        debug.error(
          "contributionService",
          "Error reporting toilet issue",
          insertResponse.error
        );
        throw new Error(
          `Failed to report issue: ${insertResponse.error.message}`
        );
      }

      if (!insertResponse.data || insertResponse.data.length === 0) {
        throw new Error("Failed to report issue - no data returned");
      }

      return insertResponse.data[0] as ToiletSubmission;
    } catch (err) {
      debug.error("contributionService", "Error in report submission", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error("An unexpected error occurred during issue report");
      }
    }
  },

  /**
   * Get all submissions by the current user
   * @returns List of user's submissions
   */
  async getMySubmissions(): Promise<SubmissionPreview[]> {
    try {
      // Get authenticated user directly
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error(
          "contributionService",
          "Auth failure: User not authenticated"
        );
        throw new Error("You must be logged in to view your submissions");
      }

      // Log user authentication information in development (sanitized)
      if (__DEV__) {
        debug.log(
          "contributionService",
          "Auth user object for submissions query:",
          {
            userId: user.id,
            hasEmail: !!user.email,
            emailConfirmed: !!user.email_confirmed_at,
            identityCount: user.identities?.length || 0,
          }
        );
      }

      // Use auth.uid directly
      const uid = user.id;

      debug.log(
        "contributionService",
        "Using auth user ID for submissions query",
        {
          userId: uid,
        }
      );

      // Fetch submissions from the database
      const queryResponse = await supabase
        .from("toilet_submissions")
        .select(
          `
          id,
          toilet_id,
          submission_type,
          status,
          data,
          created_at
        `
        )
        .eq("submitter_id", uid)
        .order("created_at", { ascending: false });

      if (queryResponse.error) {
        debug.error(
          "contributionService",
          "Error fetching submissions",
          queryResponse.error
        );
        throw new Error(
          `Failed to fetch submissions: ${queryResponse.error.message}`
        );
      }

      if (!queryResponse.data) {
        return [];
      }

      // Transform to submission previews with proper typing
      return queryResponse.data.map(
        (submission: {
          id: string;
          submission_type: string;
          status: string;
          created_at: string;
          toilet_id?: string;
          data: { name?: string } | null;
        }): SubmissionPreview => ({
          id: submission.id,
          submission_type: submission.submission_type as SubmissionType,
          status: submission.status as SubmissionStatus,
          created_at: submission.created_at,
          toilet_id: submission.toilet_id,
          toilet_name: submission.data?.name || "Unnamed toilet",
        })
      );
    } catch (err) {
      debug.error("contributionService", "Error fetching submissions", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching submissions"
        );
      }
    }
  },

  /**
   * Get a specific submission by ID
   * @param submissionId ID of the submission to fetch
   * @returns The submission details
   */
  async getSubmission(submissionId: string): Promise<ToiletSubmission> {
    try {
      // Get authenticated user directly
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error(
          "contributionService",
          "Auth failure: User not authenticated"
        );
        throw new Error("You must be logged in to view submission details");
      }

      // Log user authentication information in development (sanitized)
      if (__DEV__) {
        debug.log(
          "contributionService",
          "Auth user object for submission details query:",
          {
            userId: user.id,
            hasEmail: !!user.email,
            emailConfirmed: !!user.email_confirmed_at,
            identityCount: user.identities?.length || 0,
          }
        );
      }

      // Use auth.uid directly
      const uid = user.id;

      debug.log(
        "contributionService",
        "Using auth user ID for submission details",
        {
          userId: uid,
        }
      );

      // Fetch the submission - RLS policy will ensure user can only access their own submissions
      const queryResponse = await supabase
        .from("toilet_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (queryResponse.error) {
        debug.error(
          "contributionService",
          "Error fetching submission",
          queryResponse.error
        );
        throw new Error(
          `Failed to fetch submission: ${queryResponse.error.message}`
        );
      }

      if (!queryResponse.data) {
        throw new Error("Submission not found");
      }

      return {
        id: queryResponse.data.id,
        toilet_id: queryResponse.data.toilet_id,
        submitter_id: queryResponse.data.submitter_id,
        submission_type: queryResponse.data.submission_type as SubmissionType,
        status: queryResponse.data.status as SubmissionStatus,
        data: queryResponse.data.data,
        reason: queryResponse.data.reason,
        created_at: queryResponse.data.created_at,
        updated_at: queryResponse.data.updated_at,
      };
    } catch (err) {
      debug.error(
        "contributionService",
        "Error fetching submission details",
        err
      );
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching submission details"
        );
      }
    }
  },
};
