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
import {
  contributionService,
  validateToiletSubmission,
  VALIDATION_LIMITS,
} from "../../services/contributionService";
import {
  checkSession,
  refreshSession,
  supabaseService,
  getSupabaseClient,
} from "../../services/supabase";
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
          location: { latitude: 37.775, longitude: -122.4195 },
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
          location: { latitude: 37.775, longitude: -122.4195 },
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
        const cleanupSpy = jest.spyOn(
          contributionService,
          "cleanupOldSubmissions",
        );

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
        const recentHash = contributionService.generateSubmissionHash({
          name: "Recent",
        });
        contributionService.recentSubmissions.set(recentHash, {
          timestamp: Date.now(),
          id: "recent-submission",
        });

        contributionService.cleanupOldSubmissions();

        expect(contributionService.recentSubmissions.has(hash)).toBe(false);
        expect(contributionService.recentSubmissions.has(recentHash)).toBe(
          true,
        );
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
        const message = contributionService.getSessionErrorMessage(
          "no_session",
          null,
        );

        expect(message).toBe(
          "No active session found. Please log in to continue.",
        );
      });

      it("should return message for expired_past status", () => {
        const message = contributionService.getSessionErrorMessage(
          "expired_past",
          -100,
        );

        expect(message).toBe(
          "Your session has expired. Please log in again to continue.",
        );
      });

      it("should return message for just_expired status", () => {
        const message = contributionService.getSessionErrorMessage(
          "just_expired",
          -1,
        );

        expect(message).toBe(
          "Your session just expired. Please log in again to continue.",
        );
      });

      it("should return message for invalid_date status", () => {
        const message = contributionService.getSessionErrorMessage(
          "invalid_date",
          null,
        );

        expect(message).toBe(
          "Your session has an invalid date format. Please log in again.",
        );
      });

      it("should return message for network_error status", () => {
        const message = contributionService.getSessionErrorMessage(
          "network_error",
          null,
        );

        expect(message).toContain("Network error");
      });

      it("should return generic message for negative expiresIn", () => {
        const message = contributionService.getSessionErrorMessage(
          "unknown",
          -50,
        );

        expect(message).toBe(
          "Your session has expired. Please log in again to continue.",
        );
      });

      it("should return default message for unknown status", () => {
        const message = contributionService.getSessionErrorMessage(
          "unknown_status",
          100,
        );

        expect(message).toBe(
          "Authentication check failed: Please log in again",
        );
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

        await expect(
          contributionService.ensureValidSession(),
        ).resolves.not.toThrow();

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
          "Authentication required: Please log in",
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
          "Your session has expired and couldn't be refreshed",
        );
      });

      it("should handle network errors during session check", async () => {
        (checkSession as jest.Mock).mockRejectedValueOnce(
          new Error("Network request failed"),
        );

        await expect(
          contributionService.ensureValidSession(),
        ).rejects.toThrow();
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
        contributionService.validationPromises.set(
          operationId,
          Promise.resolve(),
        );

        expect(contributionService.validationPromises.has(operationId)).toBe(
          true,
        );

        contributionService.completeValidation(operationId);

        expect(contributionService.validationPromises.has(operationId)).toBe(
          false,
        );
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
        isAccessible: true,
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

        const result =
          await contributionService.submitNewToilet(validToiletData);

        expect(result).toBeDefined();
        expect(result.id).toBe("submission-123");
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
          "submit_toilet",
          expect.objectContaining({
            p_data: validateToiletSubmission(validToiletData),
            p_submission_type: "new",
            p_explicit_user_id: "user-123",
          }),
        );
      });

      it("should prevent duplicate submissions", async () => {
        // First submission - eligibility + submit
        mockSupabaseClient.rpc
          .mockResolvedValueOnce({ data: { eligible: true }, error: null })
          .mockResolvedValueOnce({
            data: { id: "submission-123" },
            error: null,
          });

        await contributionService.submitNewToilet(validToiletData);

        // Second submission (duplicate) - should fail before RPC calls
        await expect(
          contributionService.submitNewToilet(validToiletData),
        ).rejects.toThrow("A similar toilet was just submitted");

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2); // Only first submission's RPC calls
      });

      it("should throw error when user is not authenticated", async () => {
        mockSupabaseAuth.getUser.mockResolvedValueOnce(null);

        await expect(
          contributionService.submitNewToilet(validToiletData),
        ).rejects.toThrow("You must be logged in to submit a toilet");
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

        await expect(
          contributionService.submitNewToilet(validToiletData),
        ).rejects.toThrow("Permission denied: Please log out and log back in");
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

        await expect(
          contributionService.submitNewToilet(validToiletData),
        ).rejects.toThrow("Submission is taking too long");
      });

      it("should validate session before submission", async () => {
        (checkSession as jest.Mock).mockResolvedValueOnce({
          valid: false,
          session: null,
          expiresIn: null,
          needsForceRefresh: false,
          detailedStatus: "no_session",
        });

        await expect(
          contributionService.submitNewToilet(validToiletData),
        ).rejects.toThrow();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(checkSession).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSupabaseClient.rpc).not.toHaveBeenCalledWith(
          "submit_toilet",
          expect.anything(),
        );
      });

      it("should handle network errors", async () => {
        mockSupabaseClient.rpc.mockRejectedValueOnce(
          new Error("Network request failed"),
        );

        await expect(
          contributionService.submitNewToilet(validToiletData),
        ).rejects.toThrow();
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

        const hash =
          contributionService.generateSubmissionHash(validToiletData);
        const recorded = contributionService.recentSubmissions.get(hash);

        expect(recorded).toBeDefined();
        expect(recorded?.id).toBe("submission-123");
      });
    });
  });

  describe("Submission Validation (validateToiletSubmission)", () => {
    const validData: Partial<Toilet> = {
      name: "Test Toilet",
      location: { latitude: 1.3521, longitude: 103.8198 },
      address: "123 Test St",
      isAccessible: true,
      amenities: {
        hasBabyChanging: true,
        hasShower: false,
        isGenderNeutral: false,
        hasPaperTowels: true,
        hasHandDryer: false,
        hasWaterSpray: true,
        hasSoap: true,
      },
    };

    describe("required fields", () => {
      it("should reject missing name", () => {
        const data = { ...validData, name: undefined };
        expect(() => validateToiletSubmission(data)).toThrow(
          "Name is required",
        );
      });

      it("should reject empty/whitespace name", () => {
        expect(() =>
          validateToiletSubmission({ ...validData, name: "   " }),
        ).toThrow("Name is required");
      });

      it("should reject missing location", () => {
        const data = { ...validData, location: undefined };
        expect(() => validateToiletSubmission(data as Partial<Toilet>)).toThrow(
          "Location is required",
        );
      });

      it("should reject non-numeric latitude", () => {
        const data = {
          ...validData,
          location: { latitude: NaN, longitude: 103 },
        };
        expect(() => validateToiletSubmission(data)).toThrow(
          "Latitude must be a valid number",
        );
      });

      it("should reject out-of-range latitude", () => {
        const data = {
          ...validData,
          location: { latitude: 91, longitude: 103 },
        };
        expect(() => validateToiletSubmission(data)).toThrow(
          "Latitude must be between",
        );
      });

      it("should reject out-of-range longitude", () => {
        const data = {
          ...validData,
          location: { latitude: 1.35, longitude: 181 },
        };
        expect(() => validateToiletSubmission(data)).toThrow(
          "Longitude must be between",
        );
      });

      it("should accept boundary coordinates", () => {
        const result = validateToiletSubmission({
          ...validData,
          location: { latitude: -90, longitude: 180 },
        });
        expect(result.location).toEqual({ latitude: -90, longitude: 180 });
      });
    });

    describe("string field truncation", () => {
      it("should truncate name to max length", () => {
        const longName = "A".repeat(300);
        const result = validateToiletSubmission({
          ...validData,
          name: longName,
        });
        expect(result.name!.length).toBe(VALIDATION_LIMITS.NAME_MAX_LENGTH);
      });

      it("should truncate address to max length", () => {
        const longAddr = "B".repeat(600);
        const result = validateToiletSubmission({
          ...validData,
          address: longAddr,
        });
        expect(result.address!.length).toBe(
          VALIDATION_LIMITS.ADDRESS_MAX_LENGTH,
        );
      });

      it("should truncate buildingName to max length", () => {
        const result = validateToiletSubmission({
          ...validData,
          buildingName: "C".repeat(300),
        });
        expect(result.buildingName!.length).toBe(
          VALIDATION_LIMITS.BUILDING_NAME_MAX_LENGTH,
        );
      });

      it("should trim whitespace from string fields", () => {
        const result = validateToiletSubmission({
          ...validData,
          name: "  Hello  ",
          address: "  World  ",
        });
        expect(result.name).toBe("Hello");
        expect(result.address).toBe("World");
      });
    });

    describe("photos array bounding", () => {
      it("should cap photos at max count", () => {
        const photos = Array.from(
          { length: 20 },
          (_, i) => `https://example.com/photo${i}.jpg`,
        );
        const result = validateToiletSubmission({ ...validData, photos });
        expect(result.photos!.length).toBe(VALIDATION_LIMITS.PHOTOS_MAX_COUNT);
      });

      it("should filter out non-string photos", () => {
        const photos = [
          "valid.jpg",
          123 as unknown as string,
          "",
          "also-valid.jpg",
        ];
        const result = validateToiletSubmission({ ...validData, photos });
        expect(result.photos).toEqual(["valid.jpg", "also-valid.jpg"]);
      });

      it("should truncate long photo URIs", () => {
        const longUri = "https://example.com/" + "x".repeat(3000);
        const result = validateToiletSubmission({
          ...validData,
          photos: [longUri],
        });
        expect(result.photos![0].length).toBe(
          VALIDATION_LIMITS.PHOTO_URI_MAX_LENGTH,
        );
      });
    });

    describe("amenities whitelist", () => {
      it("should strip unknown amenity keys", () => {
        const amenities = {
          ...validData.amenities!,
          maliciousField: true,
          __proto__: { admin: true },
        } as any;
        const result = validateToiletSubmission({ ...validData, amenities });
        expect(Object.keys(result.amenities!)).toHaveLength(7);
        expect((result.amenities as any).maliciousField).toBeUndefined();
      });

      it("should default missing amenity keys to false", () => {
        const result = validateToiletSubmission({
          ...validData,
          amenities: {} as any,
        });
        expect(result.amenities!.hasBabyChanging).toBe(false);
        expect(result.amenities!.hasSoap).toBe(false);
      });
    });

    describe("numeric field validation", () => {
      it("should accept valid floor level", () => {
        const result = validateToiletSubmission({
          ...validData,
          floorLevel: 3,
        });
        expect(result.floorLevel).toBe(3);
      });

      it("should drop out-of-range floor level silently", () => {
        const result = validateToiletSubmission({
          ...validData,
          floorLevel: 999,
        });
        expect(result.floorLevel).toBeUndefined();
      });

      it("should round fractional floor levels", () => {
        const result = validateToiletSubmission({
          ...validData,
          floorLevel: 2.7,
        });
        expect(result.floorLevel).toBe(3);
      });

      it("should accept negative floor levels within range", () => {
        const result = validateToiletSubmission({
          ...validData,
          floorLevel: -5,
        });
        expect(result.floorLevel).toBe(-5);
      });
    });

    describe("unknown field stripping", () => {
      it("should not pass through arbitrary extra fields", () => {
        const data = {
          ...validData,
          malicious: "payload",
          admin: true,
          __proto__: { isAdmin: true },
        } as any;
        const result = validateToiletSubmission(data);
        expect((result as any).malicious).toBeUndefined();
        expect((result as any).admin).toBeUndefined();
      });

      it("should not include id, rating, reviewCount, or timestamps", () => {
        const data = {
          ...validData,
          id: "injected-id",
          rating: 5,
          reviewCount: 100,
          createdAt: "2020-01-01",
          lastUpdated: "2020-01-01",
        } as any;
        const result = validateToiletSubmission(data);
        expect((result as any).id).toBeUndefined();
        expect((result as any).rating).toBeUndefined();
        expect((result as any).reviewCount).toBeUndefined();
        expect((result as any).createdAt).toBeUndefined();
      });
    });

    describe("boolean fields", () => {
      it("should pass through valid boolean fields", () => {
        const result = validateToiletSubmission({
          ...validData,
          isAccessible: true,
          isPublic: false,
          isFree: true,
        });
        expect(result.isAccessible).toBe(true);
        expect(result.isPublic).toBe(false);
        expect(result.isFree).toBe(true);
      });

      it("should not include non-boolean values for boolean fields", () => {
        const data = { ...validData, isAccessible: "yes" as any };
        const result = validateToiletSubmission(data);
        expect(result.isAccessible).toBeUndefined();
      });
    });

    describe("buildingId UUID validation", () => {
      it("should accept valid UUID", () => {
        const result = validateToiletSubmission({
          ...validData,
          buildingId: "123e4567-e89b-12d3-a456-426614174000",
        });
        expect(result.buildingId).toBe("123e4567-e89b-12d3-a456-426614174000");
      });

      it("should reject non-UUID buildingId", () => {
        const result = validateToiletSubmission({
          ...validData,
          buildingId: "not-a-uuid",
        });
        expect(result.buildingId).toBeUndefined();
      });
    });
  });
});
