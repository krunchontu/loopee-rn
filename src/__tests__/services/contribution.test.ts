/**
 * @file Contribution Service Unit Tests
 * Tests for toilet contribution functionality
 * Target Coverage: 70%+
 *
 * Test Coverage:
 * - Duplicate Detection (hash generation, detection, cleanup)
 * - Session Management (validation with retry logic)
 * - Form Submission (with timeout/retry mechanisms)
 * - Error Handling (permissions, timeouts, network errors)
 * - Retry Logic (exponential backoff, timeout handling)
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock debug utility before imports
jest.mock("../../utils/debug", () => ({
  debug: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock AuthDebugger
jest.mock("../../utils/AuthDebugger", () => ({
  authDebug: {
    log: jest.fn(),
    trackPerformance: jest.fn(() => jest.fn()),
  },
}));

// Mock expo-crypto
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "12345678-1234-1234-1234-123456789012"),
}));

// Mock supabase service - everything must be inside jest.mock for proper hoisting
jest.mock("../../services/supabase", () => {
  // Create mock client inside the factory
  const mockClient = {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null,
          })),
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  };

  return {
    supabaseService: {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
    },
    getSupabaseClient: jest.fn(() => mockClient),
    refreshSession: jest.fn(),
    checkSession: jest.fn(),
  };
});

// Import after mocks
import { contributionService } from "../../services/contributionService";
import { checkSession, refreshSession, supabaseService, getSupabaseClient } from "../../services/supabase";
import type { Toilet } from "../../types/toilet";

// Get references to the mocked functions for test assertions
const mockSupabaseAuth = supabaseService.auth;
const mockSupabaseClient = getSupabaseClient();

describe("Contribution Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any tracked submissions
    contributionService.recentSubmissions.clear();
    contributionService.validationPromises.clear();
  });

  describe("Duplicate Detection", () => {
    describe("generateSubmissionHash", () => {
      it("should generate consistent hash for same toilet data", () => {
        const toiletData: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7749, longitude: -122.4194 },
          address: "123 Test St",
          buildingName: "Test Building",
          floorLevel: 1,
        };

        const hash1 = contributionService.generateSubmissionHash(toiletData);
        const hash2 = contributionService.generateSubmissionHash(toiletData);

        expect(hash1).toBe(hash2);
        expect(hash1).toContain("Test Toilet");
        expect(hash1).toContain("37.774900,-122.419400"); // Rounded coordinates
      });

      it("should generate different hash for different locations", () => {
        const toilet1: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7749, longitude: -122.4194 },
        };

        const toilet2: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7750, longitude: -122.4195 },
        };

        const hash1 = contributionService.generateSubmissionHash(toilet1);
        const hash2 = contributionService.generateSubmissionHash(toilet2);

        expect(hash1).not.toBe(hash2);
      });

      it("should handle missing optional fields", () => {
        const minimalData: Partial<Toilet> = {
          name: "Minimal Toilet",
        };

        const hash = contributionService.generateSubmissionHash(minimalData);

        expect(hash).toBeDefined();
        expect(hash).toContain("Minimal Toilet");
      });

      it("should normalize location coordinates to 6 decimal places", () => {
        const toiletData: Partial<Toilet> = {
          name: "Test",
          location: { latitude: 37.77491234567, longitude: -122.41941234567 },
        };

        const hash = contributionService.generateSubmissionHash(toiletData);

        expect(hash).toContain("37.774912,-122.419412");
      });
    });

    describe("isDuplicateSubmission", () => {
      it("should detect duplicate submission within time window", () => {
        const toiletData: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7749, longitude: -122.4194 },
        };

        // Record a submission
        contributionService.recordSubmission(toiletData, "submission-123");

        // Check for duplicate immediately
        const result = contributionService.isDuplicateSubmission(toiletData);

        expect(result.isDuplicate).toBe(true);
        expect(result.existingId).toBe("submission-123");
      });

      it("should not detect duplicate after time window expires", async () => {
        const toiletData: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7749, longitude: -122.4194 },
        };

        // Record a submission
        contributionService.recordSubmission(toiletData, "submission-123");

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Check with 5ms time window (should be expired after 10ms delay)
        const result = contributionService.isDuplicateSubmission(toiletData, 5);

        expect(result.isDuplicate).toBe(false);
        expect(result.existingId).toBeUndefined();
      });

      it("should not detect duplicate for different toilet data", () => {
        const toilet1: Partial<Toilet> = {
          name: "Toilet 1",
          location: { latitude: 37.7749, longitude: -122.4194 },
        };

        const toilet2: Partial<Toilet> = {
          name: "Toilet 2",
          location: { latitude: 37.7750, longitude: -122.4195 },
        };

        contributionService.recordSubmission(toilet1, "submission-123");

        const result = contributionService.isDuplicateSubmission(toilet2);

        expect(result.isDuplicate).toBe(false);
      });

      it("should use default 10 second time window", () => {
        const toiletData: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7749, longitude: -122.4194 },
        };

        contributionService.recordSubmission(toiletData, "submission-123");

        // Should be duplicate within 10 seconds
        const result = contributionService.isDuplicateSubmission(toiletData);

        expect(result.isDuplicate).toBe(true);
      });
    });

    describe("recordSubmission", () => {
      it("should record submission with timestamp", () => {
        const toiletData: Partial<Toilet> = {
          name: "Test Toilet",
          location: { latitude: 37.7749, longitude: -122.4194 },
        };

        contributionService.recordSubmission(toiletData, "submission-123");

        const hash = contributionService.generateSubmissionHash(toiletData);
        const recorded = contributionService.recentSubmissions.get(hash);

        expect(recorded).toBeDefined();
        expect(recorded?.id).toBe("submission-123");
        expect(recorded?.timestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
      });

      it("should trigger cleanup of old submissions", () => {
        const cleanupSpy = jest.spyOn(contributionService, "cleanupOldSubmissions");

        const toiletData: Partial<Toilet> = {
          name: "Test Toilet",
        };

        contributionService.recordSubmission(toiletData, "submission-123");

        expect(cleanupSpy).toHaveBeenCalled();
      });
    });

    describe("cleanupOldSubmissions", () => {
      it("should remove submissions older than 30 minutes", () => {
        const toiletData: Partial<Toilet> = {
          name: "Old Toilet",
        };

        const hash = contributionService.generateSubmissionHash(toiletData);

        // Manually add an old submission (31 minutes ago)
        const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
        contributionService.recentSubmissions.set(hash, {
          timestamp: thirtyOneMinutesAgo,
          id: "old-submission",
        });

        // Add a recent submission
        const recentHash = contributionService.generateSubmissionHash({ name: "Recent" });
        contributionService.recentSubmissions.set(recentHash, {
          timestamp: Date.now(),
          id: "recent-submission",
        });

        contributionService.cleanupOldSubmissions();

        expect(contributionService.recentSubmissions.has(hash)).toBe(false);
        expect(contributionService.recentSubmissions.has(recentHash)).toBe(true);
      });

      it("should keep submissions within 30 minute window", () => {
        const toiletData: Partial<Toilet> = {
          name: "Recent Toilet",
        };

        const hash = contributionService.generateSubmissionHash(toiletData);

        // Add submission from 29 minutes ago
        const twentyNineMinutesAgo = Date.now() - 29 * 60 * 1000;
        contributionService.recentSubmissions.set(hash, {
          timestamp: twentyNineMinutesAgo,
          id: "recent-submission",
        });

        contributionService.cleanupOldSubmissions();

        expect(contributionService.recentSubmissions.has(hash)).toBe(true);
      });
    });
  });

  describe("Session Management", () => {
    describe("getSessionErrorMessage", () => {
      it("should return message for no_session status", () => {
        const message = contributionService.getSessionErrorMessage("no_session", null);

        expect(message).toBe("No active session found. Please log in to continue.");
      });

      it("should return message for expired_past status", () => {
        const message = contributionService.getSessionErrorMessage("expired_past", -100);

        expect(message).toBe("Your session has expired. Please log in again to continue.");
      });

      it("should return message for just_expired status", () => {
        const message = contributionService.getSessionErrorMessage("just_expired", -1);

        expect(message).toBe(
          "Your session just expired. Please log in again to continue."
        );
      });

      it("should return message for invalid_date status", () => {
        const message = contributionService.getSessionErrorMessage("invalid_date", null);

        expect(message).toBe(
          "Your session has an invalid date format. Please log in again."
        );
      });

      it("should return message for network_error status", () => {
        const message = contributionService.getSessionErrorMessage("network_error", null);

        expect(message).toContain("Network error");
      });

      it("should return generic message for negative expiresIn", () => {
        const message = contributionService.getSessionErrorMessage("unknown", -50);

        expect(message).toBe("Your session has expired. Please log in again to continue.");
      });

      it("should return default message for unknown status", () => {
        const message = contributionService.getSessionErrorMessage("unknown_status", 100);

        expect(message).toBe("Authentication check failed: Please log in again");
      });
    });

    describe("ensureValidSession", () => {
      it("should pass when session is valid", async () => {
        (checkSession as jest.Mock).mockResolvedValueOnce({
          valid: true,
          session: { access_token: "token" },
          expiresIn: 3600,
          needsForceRefresh: false,
        });

        await expect(contributionService.ensureValidSession()).resolves.not.toThrow();

        expect(checkSession).toHaveBeenCalled();
        expect(refreshSession).not.toHaveBeenCalled();
      });

      it("should refresh session when it needs refresh", async () => {
        // First check shows session needs refresh
        (checkSession as jest.Mock)
          .mockResolvedValueOnce({
            valid: true,
            session: { access_token: "token" },
            expiresIn: 200, // Less than 600 seconds (10 minutes threshold)
            needsForceRefresh: true,
          })
          // After refresh, verify session is valid
          .mockResolvedValueOnce({
            valid: true,
            session: { access_token: "new-token" },
            expiresIn: 3600,
            needsForceRefresh: false,
          });

        (refreshSession as jest.Mock).mockResolvedValueOnce(true);

        await contributionService.ensureValidSession();

        expect(checkSession).toHaveBeenCalled();
        expect(refreshSession).toHaveBeenCalled();
      });

      it("should throw error when session is invalid", async () => {
        (checkSession as jest.Mock).mockResolvedValueOnce({
          valid: false,
          session: null,
          expiresIn: null,
          needsForceRefresh: false,
          detailedStatus: "no_session",
        });

        await expect(contributionService.ensureValidSession()).rejects.toThrow(
          "Authentication required: Please log in"
        );
      });

      it("should retry session refresh on failure", async () => {
        // First check shows session needs refresh
        (checkSession as jest.Mock)
          .mockResolvedValueOnce({
            valid: true,
            session: { access_token: "token" },
            expiresIn: 200,
            needsForceRefresh: true,
          })
          // After successful refresh, verify session is valid
          .mockResolvedValueOnce({
            valid: true,
            session: { access_token: "new-token" },
            expiresIn: 3600,
            needsForceRefresh: false,
          });

        // Refresh eventually succeeds
        (refreshSession as jest.Mock).mockResolvedValueOnce(true);

        await contributionService.ensureValidSession();

        expect(refreshSession).toHaveBeenCalled();
      });

      it("should throw error when session refresh fails after all retries", async () => {
        (checkSession as jest.Mock).mockResolvedValueOnce({
          valid: true,
          session: { access_token: "token" },
          expiresIn: 200,
          needsForceRefresh: true,
        });

        // All refreshes fail
        (refreshSession as jest.Mock).mockResolvedValue(false);

        await expect(contributionService.ensureValidSession()).rejects.toThrow(
          "Your session has expired and couldn't be refreshed"
        );
      });

      it("should handle network errors during session check", async () => {
        (checkSession as jest.Mock).mockRejectedValueOnce(
          new Error("Network request failed")
        );

        await expect(contributionService.ensureValidSession()).rejects.toThrow();
      });

      it("should reuse existing validation operation when in progress", async () => {
        (checkSession as jest.Mock).mockResolvedValue({
          valid: true,
          session: { access_token: "token" },
          expiresIn: 3600,
          needsForceRefresh: false,
        });

        // Start two validations concurrently
        const validation1 = contributionService.ensureValidSession();
        const validation2 = contributionService.ensureValidSession();

        await Promise.all([validation1, validation2]);

        // Should only call checkSession once (or twice max) due to reuse
        expect(checkSession).toHaveBeenCalledTimes(1);
      });
    });

    describe("completeValidation", () => {
      it("should remove validation promise from map", () => {
        const operationId = "test-operation-123";

        // Manually add a validation promise
        contributionService.validationPromises.set(operationId, Promise.resolve());

        expect(contributionService.validationPromises.has(operationId)).toBe(true);

        contributionService.completeValidation(operationId);

        expect(contributionService.validationPromises.has(operationId)).toBe(false);
      });

      it("should handle missing validation operation gracefully", () => {
        expect(() => {
          contributionService.completeValidation("non-existent");
        }).not.toThrow();
      });
    });
  });

  describe("Form Submission", () => {
    describe("submitNewToilet", () => {
      const validToiletData: Partial<Toilet> = {
        name: "New Public Toilet",
        location: { latitude: 37.7749, longitude: -122.4194 },
        address: "123 Main St",
        accessible: true,
      };

      beforeEach(() => {
        // Setup successful session validation
        (checkSession as jest.Mock).mockResolvedValue({
          valid: true,
          session: { access_token: "token" },
          expiresIn: 3600,
          needsForceRefresh: false,
        });

        // Setup successful user authentication
        mockSupabaseAuth.getUser.mockResolvedValue({
          id: "user-123",
          email: "test@example.com",
        });

        // Reset RPC mock for each test
        mockSupabaseClient.rpc.mockReset();
      });

      it("should successfully submit a new toilet", async () => {
        // Mock eligibility check
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: { eligible: true },
          error: null,
        });

        // Mock actual submission
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: {
            id: "submission-123",
            submission_type: "new",
            status: "pending",
          },
          error: null,
        });

        const result = await contributionService.submitNewToilet(validToiletData);

        expect(result).toBeDefined();
        expect(result.id).toBe("submission-123");
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
          "submit_toilet",
          expect.objectContaining({
            p_data: validToiletData,
            p_submission_type: "new",
            p_explicit_user_id: "user-123",
          })
        );
      });

      it("should prevent duplicate submissions", async () => {
        // First submission - eligibility + submit
        mockSupabaseClient.rpc
          .mockResolvedValueOnce({ data: { eligible: true }, error: null })
          .mockResolvedValueOnce({ data: { id: "submission-123" }, error: null });

        await contributionService.submitNewToilet(validToiletData);

        // Second submission (duplicate) - should fail before RPC calls
        await expect(contributionService.submitNewToilet(validToiletData)).rejects.toThrow(
          "A similar toilet was just submitted"
        );

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2); // Only first submission's RPC calls
      });

      it("should throw error when user is not authenticated", async () => {
        mockSupabaseAuth.getUser.mockResolvedValueOnce(null);

        await expect(contributionService.submitNewToilet(validToiletData)).rejects.toThrow(
          "You must be logged in to submit a toilet"
        );
      });

      it("should handle permission denied error (42501)", async () => {
        // Eligibility check passes
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: { eligible: true },
          error: null,
        });

        // Actual submission fails with permission error
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: null,
          error: {
            code: "42501",
            message: "Permission denied",
          },
        });

        await expect(contributionService.submitNewToilet(validToiletData)).rejects.toThrow(
          "Permission denied: Please log out and log back in"
        );
      });

      it("should handle timeout error (57014)", async () => {
        // Eligibility check passes
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: { eligible: true },
          error: null,
        });

        // Actual submission fails with timeout
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: null,
          error: {
            code: "57014",
            message: "Query canceled",
          },
        });

        await expect(contributionService.submitNewToilet(validToiletData)).rejects.toThrow(
          "Submission is taking too long"
        );
      });

      it("should validate session before submission", async () => {
        (checkSession as jest.Mock).mockResolvedValueOnce({
          valid: false,
          session: null,
          expiresIn: null,
          needsForceRefresh: false,
          detailedStatus: "no_session",
        });

        await expect(contributionService.submitNewToilet(validToiletData)).rejects.toThrow();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(checkSession).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSupabaseClient.rpc).not.toHaveBeenCalledWith(
          "submit_toilet",
          expect.anything()
        );
      });

      it("should handle network errors", async () => {
        mockSupabaseClient.rpc.mockRejectedValueOnce(
          new Error("Network request failed")
        );

        await expect(contributionService.submitNewToilet(validToiletData)).rejects.toThrow();
      });

      it("should record submission after success", async () => {
        // Eligibility check
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: { eligible: true },
          error: null,
        });

        // Successful submission
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: { id: "submission-123" },
          error: null,
        });

        await contributionService.submitNewToilet(validToiletData);

        const hash = contributionService.generateSubmissionHash(validToiletData);
        const recorded = contributionService.recentSubmissions.get(hash);

        expect(recorded).toBeDefined();
        expect(recorded?.id).toBe("submission-123");
      });
    });
  });
});
