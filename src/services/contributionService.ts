/**
 * @file Contribution Service
 *
 * Service for handling toilet contribution operations.
 *
 * Validation, deduplication, and session-guard logic live in dedicated
 * modules under ./submission/ — this file contains only the business-level
 * submission and retrieval methods.
 *
 * IMPORTANT: User ID and Profile handling
 * 1. The submitter_id field in toilet_submissions must match auth.uid()
 * 2. We now use auth.uid() directly for submissions
 * 3. RLS policies verify that submitter_id::text = auth.uid()::text
 */

import { supabaseService, getSupabaseClient } from "./supabase";
import type {
  ToiletSubmission,
  SubmissionPreview,
} from "../types/contribution";
import type { Toilet } from "../types/toilet";
import { debug } from "../utils/debug";
import {
  SubmissionRpcResultSchema,
  ToiletSubmissionSchema,
  SubmissionPreviewRowSchema,
  safeParse,
} from "../utils/validators";

// ── Re-export sub-modules so existing consumers keep working ────────────────

export {
  VALIDATION_LIMITS,
  MAX_RECENT_SUBMISSIONS,
  validateToiletSubmission,
} from "./submission/validation";

export {
  recentSubmissions,
  generateSubmissionHash,
  isDuplicateSubmission,
  recordSubmission,
  cleanupOldSubmissions,
} from "./submission/dedup";

export {
  validationPromises,
  raceWithTimeout,
  withRetry,
  completeValidation,
  getSessionErrorMessage,
  ensureValidSession,
  submitWithSessionGuard,
  logContribution,
} from "./submission/sessionGuard";

// ── Private imports from sub-modules ────────────────────────────────────────

import { isDuplicateSubmission, recordSubmission } from "./submission/dedup";
import {
  raceWithTimeout,
  ensureValidSession,
  logContribution,
} from "./submission/sessionGuard";
import { validateToiletSubmission } from "./submission/validation";

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 15000; // 15 seconds

// Use the shared Supabase client instance for consistent auth state
const supabase = getSupabaseClient();

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * Service for handling toilet submission operations.
 */
export const contributionService = {
  // Expose sub-module state on the service object so existing tests that
  // access contributionService.recentSubmissions etc. keep working.
  get recentSubmissions() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return require("./submission/dedup").recentSubmissions as Map<
      string,
      { timestamp: number; id: string }
    >;
  },
  get validationPromises() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return require("./submission/sessionGuard").validationPromises as Map<
      string,
      Promise<void>
    >;
  },

  // Delegate pure functions to sub-modules
  generateSubmissionHash: (data: Partial<Toilet>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return (
      require("./submission/dedup").generateSubmissionHash as (
        d: Partial<Toilet>,
      ) => string
    )(data);
  },
  isDuplicateSubmission: (
    data: Partial<Toilet>,
    dedupeTimeWindowMs?: number,
  ) => {
    return isDuplicateSubmission(data, dedupeTimeWindowMs);
  },
  recordSubmission: (data: Partial<Toilet>, submissionId: string) => {
    return recordSubmission(data, submissionId);
  },
  cleanupOldSubmissions: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return (
      require("./submission/dedup").cleanupOldSubmissions as () => void
    )();
  },
  completeValidation: (operationId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return (
      require("./submission/sessionGuard").completeValidation as (
        id: string,
      ) => void
    )(operationId);
  },
  getSessionErrorMessage: (
    detailedStatus: string,
    expiresIn: number | null,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return (
      require("./submission/sessionGuard").getSessionErrorMessage as (
        s: string,
        e: number | null,
      ) => string
    )(detailedStatus, expiresIn);
  },
  ensureValidSession: async () => {
    return ensureValidSession();
  },
  submitWithSessionGuard: async <T>(
    operation: () => Promise<T>,
  ): Promise<T> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return (
      require("./submission/sessionGuard").submitWithSessionGuard as <T>(
        op: () => Promise<T>,
      ) => Promise<T>
    )(operation);
  },

  // ── Core submission methods ───────────────────────────────────────────

  /**
   * Submit a new toilet with duplicate submission protection
   */
  async submitNewToilet(
    toiletData: Partial<Toilet>,
  ): Promise<ToiletSubmission> {
    // Check for duplicate submissions first
    const dupeCheck = isDuplicateSubmission(toiletData);
    if (dupeCheck.isDuplicate) {
      logContribution(
        "warn",
        "submitNewToilet",
        "Prevented duplicate submission",
        {
          existingId: dupeCheck.existingId,
          timeBetweenSubmissions: "< 10 seconds",
        },
      );
      throw new Error(
        "A similar toilet was just submitted. Please wait a moment before trying again.",
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
      },
    );

    try {
      // First ensure we have a valid session
      logContribution(
        "log",
        "submitNewToilet",
        "Validating session before submission",
      );
      await ensureValidSession();

      logContribution("log", "submitNewToilet", "Session validation complete");

      // Get authenticated user to explicitly pass the ID
      logContribution("log", "submitNewToilet", "Getting authenticated user");
      const user = await raceWithTimeout(
        supabaseService.auth.getUser(),
        5000,
        "get authenticated user",
      );

      if (!user) {
        logContribution("error", "submitNewToilet", "User not authenticated");
        throw new Error("You must be logged in to submit a toilet");
      }

      logContribution(
        "log",
        "submitNewToilet",
        "Authenticated user for submission",
        { userId: user.id },
      );

      // First, check eligibility as a diagnostic step
      logContribution(
        "log",
        "submitNewToilet",
        "Checking submission eligibility",
      );
      const eligibilityCheck = await raceWithTimeout(
        (signal) =>
          supabase.rpc("check_submission_eligibility").abortSignal(signal),
        8000,
        "eligibility check",
      );

      if (eligibilityCheck.error) {
        logContribution("warn", "submitNewToilet", "Eligibility check failed", {
          errorCode: eligibilityCheck.error.code,
          errorMessage: eligibilityCheck.error.message,
        });
      } else {
        logContribution("log", "submitNewToilet", "Eligibility check passed", {
          results: eligibilityCheck.data ?? {},
        });
      }

      // Validate and sanitize submission data before sending to DB
      const validatedData = validateToiletSubmission(toiletData);
      logContribution("log", "submitNewToilet", "Submission data validated", {
        fieldsBeforeValidation: Object.keys(toiletData).length,
        fieldsAfterValidation: Object.keys(validatedData).length,
      });

      // Create submission payload with validated data
      const submissionPayload = {
        p_data: validatedData,
        p_submission_type: "new",
        p_explicit_user_id: user.id,
      };

      logContribution(
        "log",
        "submitNewToilet",
        "Calling submit_toilet function",
        { submissionType: "new", userId: user.id },
      );

      // Use the database function with explicit user ID and timeout
      const insertResponse = await raceWithTimeout(
        (signal) =>
          supabase.rpc("submit_toilet", submissionPayload).abortSignal(signal),
        DEFAULT_TIMEOUT,
        "toilet submission",
      );

      if (insertResponse.error) {
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
          },
        );

        if (pgError.code === "42501") {
          throw new Error(
            "Permission denied: Please log out and log back in to refresh your session",
          );
        } else if (pgError.code === "57014") {
          throw new Error(
            "Submission is taking too long. Please try again or check your network connection.",
          );
        } else {
          throw new Error(
            `Failed to submit toilet: ${insertResponse.error.message}`,
          );
        }
      }

      if (!insertResponse.data) {
        logContribution(
          "error",
          "submitNewToilet",
          "No data returned from successful submission",
        );
        throw new Error("Failed to submit toilet - no data returned");
      }

      // Successfully submitted - record this to prevent duplicates
      const submissionData = safeParse(
        SubmissionRpcResultSchema,
        insertResponse.data,
        "submitNewToilet",
      ) as ToiletSubmission;

      logContribution(
        "log",
        "submitNewToilet",
        "Toilet submission successful",
        { id: submissionData.id, status: submissionData.status },
      );

      recordSubmission(toiletData, submissionData.id);

      return submissionData;
    } catch (err) {
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
        errorDetails,
      );

      if (err instanceof Error) {
        if (err.message.includes("timed out")) {
          throw new Error(
            "Submission timed out. The server might be busy or your connection may be slow. Please try again.",
          );
        }
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred during toilet submission",
        );
      }
    }
  },

  /**
   * Submit an edit for an existing toilet
   */
  async submitToiletEdit(
    toiletId: string,
    toiletData: Partial<Toilet>,
    reason: string,
  ): Promise<ToiletSubmission> {
    debug.log(
      "contributionService",
      "Using database function for edit submission",
    );

    try {
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error("contributionService", "User not authenticated");
        throw new Error("You must be logged in to edit a toilet");
      }

      debug.log("contributionService", "Authenticated user for edit", {
        userId: user.id,
      });

      const insertResponse = await supabase.rpc("submit_toilet", {
        p_data: toiletData,
        p_submission_type: "edit",
        p_toilet_id: toiletId,
        p_reason: reason,
        p_explicit_user_id: user.id,
      });

      if (insertResponse.error) {
        debug.error(
          "contributionService",
          "Error editing toilet",
          insertResponse.error,
        );
        throw new Error(
          `Failed to submit edit: ${insertResponse.error.message}`,
        );
      }

      const rawEditData = insertResponse.data;
      if (
        !rawEditData ||
        (Array.isArray(rawEditData) && rawEditData.length === 0)
      ) {
        throw new Error("Failed to submit edit - no data returned");
      }
      const editArray = Array.isArray(rawEditData)
        ? rawEditData
        : [rawEditData];
      return safeParse(
        SubmissionRpcResultSchema,
        editArray[0],
        "editToilet",
      ) as ToiletSubmission;
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
   */
  async reportToiletIssue(
    toiletId: string,
    issueType: string,
    details: string,
  ): Promise<ToiletSubmission> {
    debug.log(
      "contributionService",
      "Using database function for report submission",
    );

    try {
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error("contributionService", "User not authenticated");
        throw new Error("You must be logged in to report an issue");
      }

      debug.log("contributionService", "Authenticated user for report", {
        userId: user.id,
      });

      const insertResponse = await supabase.rpc("submit_toilet", {
        p_data: { issueType, details },
        p_submission_type: "report",
        p_toilet_id: toiletId,
        p_reason: details,
        p_explicit_user_id: user.id,
      });

      if (insertResponse.error) {
        debug.error(
          "contributionService",
          "Error reporting toilet issue",
          insertResponse.error,
        );
        throw new Error(
          `Failed to report issue: ${insertResponse.error.message}`,
        );
      }

      const rawReportData = insertResponse.data;
      if (
        !rawReportData ||
        (Array.isArray(rawReportData) && rawReportData.length === 0)
      ) {
        throw new Error("Failed to report issue - no data returned");
      }
      const reportArray = Array.isArray(rawReportData)
        ? rawReportData
        : [rawReportData];
      return safeParse(
        SubmissionRpcResultSchema,
        reportArray[0],
        "reportToiletIssue",
      ) as ToiletSubmission;
    } catch (err) {
      debug.error("contributionService", "Error in report submission", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error("An unexpected error occurred during issue report");
      }
    }
  },

  // ── Retrieval methods ─────────────────────────────────────────────────

  /**
   * Get all submissions by the current user
   */
  async getMySubmissions(): Promise<SubmissionPreview[]> {
    try {
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error(
          "contributionService",
          "Auth failure: User not authenticated",
        );
        throw new Error("You must be logged in to view your submissions");
      }

      if (__DEV__) {
        debug.log(
          "contributionService",
          "Auth user object for submissions query:",
          {
            userId: user.id,
            hasEmail: !!user.email,
            emailConfirmed: !!user.email_confirmed_at,
            identityCount: user.identities?.length || 0,
          },
        );
      }

      const uid = user.id;

      debug.log(
        "contributionService",
        "Using auth user ID for submissions query",
        { userId: uid },
      );

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
        `,
        )
        .eq("submitter_id", uid)
        .order("created_at", { ascending: false });

      if (queryResponse.error) {
        debug.error(
          "contributionService",
          "Error fetching submissions",
          queryResponse.error,
        );
        throw new Error(
          `Failed to fetch submissions: ${queryResponse.error.message}`,
        );
      }

      if (!queryResponse.data) {
        return [];
      }

      return queryResponse.data.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (submission: any): SubmissionPreview => {
          const row = safeParse(
            SubmissionPreviewRowSchema,
            submission,
            "getMySubmissions",
          );
          return {
            id: row.id,
            submission_type: row.submission_type,
            status: row.status,
            created_at: row.created_at,
            toilet_id: row.toilet_id,
            toilet_name: row.data?.name || "Unnamed toilet",
          };
        },
      );
    } catch (err) {
      debug.error("contributionService", "Error fetching submissions", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching submissions",
        );
      }
    }
  },

  /**
   * Get a specific submission by ID
   */
  async getSubmission(submissionId: string): Promise<ToiletSubmission> {
    try {
      const user = await supabaseService.auth.getUser();

      if (!user) {
        debug.error(
          "contributionService",
          "Auth failure: User not authenticated",
        );
        throw new Error("You must be logged in to view submission details");
      }

      if (__DEV__) {
        debug.log(
          "contributionService",
          "Auth user object for submission details query:",
          {
            userId: user.id,
            hasEmail: !!user.email,
            emailConfirmed: !!user.email_confirmed_at,
            identityCount: user.identities?.length || 0,
          },
        );
      }

      const uid = user.id;

      debug.log(
        "contributionService",
        "Using auth user ID for submission details",
        { userId: uid },
      );

      const queryResponse = await supabase
        .from("toilet_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (queryResponse.error) {
        debug.error(
          "contributionService",
          "Error fetching submission",
          queryResponse.error,
        );
        throw new Error(
          `Failed to fetch submission: ${queryResponse.error.message}`,
        );
      }

      if (!queryResponse.data) {
        throw new Error("Submission not found");
      }

      return safeParse(
        ToiletSubmissionSchema,
        queryResponse.data,
        "getSubmission",
      ) as ToiletSubmission;
    } catch (err) {
      debug.error(
        "contributionService",
        "Error fetching submission details",
        err,
      );
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching submission details",
        );
      }
    }
  },
};
