import { act, renderHook, waitFor } from "@testing-library/react-native";

import { supabaseService } from "../../services/supabase";
import { useToiletStore } from "../../stores/toilets";
import type { Toilet } from "../../types/toilet";
import * as debugModule from "../../utils/debug";

// Mock Sentry (required by supabase service)
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock the supabase service
jest.mock("../../services/supabase");

// Mock the debug utility
jest.mock("../../utils/debug", () => ({
  debug: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    throttledLog: jest.fn(),
  },
}));

// Helper to create mock toilet data
const createMockToilet = (overrides?: Partial<Toilet>): Toilet => ({
  id: "toilet-123",
  name: "Test Toilet",
  description: "A test toilet",
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
  },
  address: "123 Test St, San Francisco, CA",
  rating: 4.5,
  reviewCount: 10,
  verified: true,
  accessibility: {
    wheelchairAccessible: true,
    hasBabyChanging: false,
    hasHandrails: true,
  },
  amenities: {
    hasSoap: true,
    hasPaper: true,
    hasHotWater: false,
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("Toilet Store", () => {
  let mockGetNearby: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock for supabase service
    mockGetNearby = jest.fn();
    (supabaseService.toilets as any) = {
      getNearby: mockGetNearby,
    };

    // Mock Date.now() for predictable cache testing
    jest.spyOn(Date, "now").mockReturnValue(1000000);

    // Reset the store state by directly setting it
    // This is more reliable than trying to reset through the API
    useToiletStore.setState({
      toilets: [],
      selectedToilet: null,
      loading: false,
      error: null,
      lastFetchLocation: null,
      lastFetchTime: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should have empty toilets array", () => {
      const { result } = renderHook(() => useToiletStore());
      expect(result.current.toilets).toEqual([]);
    });

    it("should have no selected toilet", () => {
      const { result } = renderHook(() => useToiletStore());
      expect(result.current.selectedToilet).toBeNull();
    });

    it("should not be loading", () => {
      const { result } = renderHook(() => useToiletStore());
      expect(result.current.loading).toBe(false);
    });

    it("should have no error", () => {
      const { result } = renderHook(() => useToiletStore());
      expect(result.current.error).toBeNull();
    });

    it("should have no last fetch location", () => {
      const { result } = renderHook(() => useToiletStore());
      expect(result.current.lastFetchLocation).toBeNull();
    });

    it("should have no last fetch time", () => {
      const { result } = renderHook(() => useToiletStore());
      expect(result.current.lastFetchTime).toBeNull();
    });
  });

  describe("fetchNearbyToilets", () => {
    const mockToilet1 = createMockToilet({ id: "toilet-1", name: "Toilet 1" });
    const mockToilet2 = createMockToilet({
      id: "toilet-2",
      name: "Toilet 2",
      location: { latitude: 37.7849, longitude: -122.4294 },
    });

    it("should successfully fetch nearby toilets on first call", async () => {
      mockGetNearby.mockResolvedValueOnce([mockToilet1, mockToilet2]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(mockGetNearby).toHaveBeenCalledWith(37.7749, -122.4194, 5000);
      expect(result.current.toilets).toEqual([mockToilet1, mockToilet2]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should update last fetch location and time", async () => {
      mockGetNearby.mockResolvedValueOnce([mockToilet1]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.lastFetchLocation).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(result.current.lastFetchTime).toBe(1000000);
    });

    it("should use custom radius when provided", async () => {
      mockGetNearby.mockResolvedValueOnce([mockToilet1]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194, 10000);
      });

      expect(mockGetNearby).toHaveBeenCalledWith(37.7749, -122.4194, 10000);
    });

    it("should handle empty results", async () => {
      mockGetNearby.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.toilets).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle API errors", async () => {
      const error = new Error("Network error");
      mockGetNearby.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
      expect(debugModule.debug.error).toHaveBeenCalledWith(
        "ToiletStore",
        "Failed to fetch toilets",
        error
      );
    });

    it("should handle non-Error exceptions", async () => {
      mockGetNearby.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.error).toBe("Failed to fetch toilets");
      expect(result.current.loading).toBe(false);
    });

    it("should filter out toilets with missing IDs", async () => {
      const invalidToilet = createMockToilet({ id: "" });
      mockGetNearby.mockResolvedValueOnce([mockToilet1, invalidToilet]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.toilets).toEqual([mockToilet1]);
      expect(debugModule.debug.warn).toHaveBeenCalled();
    });

    it("should filter out toilets with missing location", async () => {
      const invalidToilet = createMockToilet();
      (invalidToilet as any).location = null;
      mockGetNearby.mockResolvedValueOnce([mockToilet1, invalidToilet]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.toilets).toEqual([mockToilet1]);
      expect(debugModule.debug.warn).toHaveBeenCalled();
    });

    it("should filter out toilets with invalid coordinates", async () => {
      const invalidToilet = createMockToilet({
        location: { latitude: "invalid" as any, longitude: -122.4194 },
      });
      mockGetNearby.mockResolvedValueOnce([mockToilet1, invalidToilet]);

      const { result } = renderHook(() => useToiletStore());

      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.toilets).toEqual([mockToilet1]);
      expect(debugModule.debug.warn).toHaveBeenCalled();
    });
  });

  describe("Cache Validation", () => {
    const mockToilet = createMockToilet();

    it("should use cache when location hasn't changed and cache is fresh", async () => {
      mockGetNearby.mockResolvedValueOnce([mockToilet]);

      const { result } = renderHook(() => useToiletStore());

      // First fetch
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(mockGetNearby).toHaveBeenCalledTimes(1);

      // Mock time advance by 1 minute (less than 5 minute cache)
      jest.spyOn(Date, "now").mockReturnValue(1000000 + 60 * 1000);

      // Second fetch at same location - should use cache
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      // Should not fetch again
      expect(mockGetNearby).toHaveBeenCalledTimes(1);
    });

    it("should fetch new data when cache is expired (>5 minutes)", async () => {
      mockGetNearby.mockResolvedValue([mockToilet]);

      const { result } = renderHook(() => useToiletStore());

      // First fetch
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(mockGetNearby).toHaveBeenCalledTimes(1);

      // Mock time advance by 6 minutes (more than 5 minute cache)
      jest.spyOn(Date, "now").mockReturnValue(1000000 + 6 * 60 * 1000);

      // Second fetch - cache expired
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      // Should fetch again
      expect(mockGetNearby).toHaveBeenCalledTimes(2);
    });

    it("should fetch new data when moved significantly (>100m)", async () => {
      mockGetNearby.mockResolvedValue([mockToilet]);

      const { result } = renderHook(() => useToiletStore());

      // First fetch at location 1
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(mockGetNearby).toHaveBeenCalledTimes(1);

      // Mock time advance by 1 minute (cache still fresh)
      jest.spyOn(Date, "now").mockReturnValue(1000000 + 60 * 1000);

      // Second fetch at location 2 (moved ~1.24km)
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7849, -122.4294);
      });

      // Should fetch again due to significant movement
      expect(mockGetNearby).toHaveBeenCalledTimes(2);
    });

    it("should use cache when moved insignificantly (<100m)", async () => {
      mockGetNearby.mockResolvedValueOnce([mockToilet]);

      const { result } = renderHook(() => useToiletStore());

      // First fetch
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(mockGetNearby).toHaveBeenCalledTimes(1);

      // Mock time advance by 1 minute
      jest.spyOn(Date, "now").mockReturnValue(1000000 + 60 * 1000);

      // Second fetch at nearby location (moved ~11m - less than 100m threshold)
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7750, -122.4194);
      });

      // Should not fetch again
      expect(mockGetNearby).toHaveBeenCalledTimes(1);
    });
  });

  describe("selectToilet", () => {
    it("should set selected toilet", () => {
      const mockToilet = createMockToilet();
      const { result } = renderHook(() => useToiletStore());

      act(() => {
        result.current.selectToilet(mockToilet);
      });

      expect(result.current.selectedToilet).toEqual(mockToilet);
      expect(debugModule.debug.log).toHaveBeenCalledWith(
        "ToiletStore",
        "Selected toilet toilet-123"
      );
    });

    it("should deselect toilet when passed null", () => {
      const mockToilet = createMockToilet();
      const { result } = renderHook(() => useToiletStore());

      // First select a toilet
      act(() => {
        result.current.selectToilet(mockToilet);
      });

      expect(result.current.selectedToilet).toEqual(mockToilet);

      // Then deselect
      act(() => {
        result.current.selectToilet(null);
      });

      expect(result.current.selectedToilet).toBeNull();
      expect(debugModule.debug.log).toHaveBeenCalledWith(
        "ToiletStore",
        "Deselected toilet"
      );
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      const error = new Error("Test error");
      mockGetNearby.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useToiletStore());

      // Trigger an error
      await act(async () => {
        await result.current.fetchNearbyToilets(37.7749, -122.4194);
      });

      expect(result.current.error).toBe("Test error");

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
