import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Toilet } from "../types/toilet";
import { supabaseService } from "../services/supabase";
import { debug } from "../utils/debug";

/**
 * Location coordinates interface
 */
interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param coords1 First coordinate pair
 * @param coords2 Second coordinate pair
 * @returns Distance in meters
 */
function calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
  // Haversine formula to calculate distance between two points
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters

  const lat1Rad = toRad(coords1.latitude);
  const lat2Rad = toRad(coords2.latitude);
  const deltaLat = toRad(coords2.latitude - coords1.latitude);
  const deltaLon = toRad(coords2.longitude - coords1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a new fetch is needed based on distance and time
 * @param lastFetchLocation Last fetch coordinates
 * @param lastFetchTime Last fetch timestamp
 * @param currentLocation Current coordinates
 * @returns Boolean indicating if new fetch is needed
 */
function shouldFetchNewData(
  lastFetchLocation: Coordinates | null,
  lastFetchTime: number | null,
  currentLocation: Coordinates
): boolean {
  // If we've never fetched before, we definitely need to fetch
  if (!lastFetchLocation || !lastFetchTime) {
    debug.log("ToiletStore", "First fetch or no cache available");
    return true;
  }

  // Check if cache is too old (5 minutes)
  const cacheAge = Date.now() - lastFetchTime;
  const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes in milliseconds
  if (cacheAge > MAX_CACHE_AGE) {
    // Using regular log for key events like cache expiration
    debug.log("ToiletStore", "Cache expired, fetching new data", {
      cacheAgeSeconds: Math.round(cacheAge / 1000),
      maxCacheAgeSeconds: MAX_CACHE_AGE / 1000,
    });
    return true;
  }

  // Check if we've moved far enough to warrant a new fetch
  const distanceMoved = calculateDistance(lastFetchLocation, currentLocation);
  const SIGNIFICANT_DISTANCE = 100; // 100 meters (same as location service threshold)

  if (distanceMoved > SIGNIFICANT_DISTANCE) {
    // Using regular log for key events like significant movement
    debug.log(
      "ToiletStore",
      "Significant movement detected, fetching new data",
      {
        distanceMoved,
        threshold: SIGNIFICANT_DISTANCE,
      }
    );
    return true;
  }

  // Throttled logging for frequent cache status checks (30 second interval)
  const CACHE_CHECK_LOG_THROTTLE = 30000; // 30 seconds
  debug.throttledLog(
    "ToiletStore",
    `cache-check-${currentLocation.latitude.toFixed(4)}-${currentLocation.longitude.toFixed(4)}`,
    "Using cached toilet data",
    {
      distanceMoved,
      cacheAgeSeconds: Math.round(cacheAge / 1000),
    },
    CACHE_CHECK_LOG_THROTTLE
  );
  return false;
}

interface ToiletState {
  toilets: Toilet[];
  selectedToilet: Toilet | null;
  loading: boolean;
  error: string | null;
  lastFetchLocation: Coordinates | null;
  lastFetchTime: number | null;
  fetchNearbyToilets: (
    latitude: number,
    longitude: number,
    radius?: number
  ) => Promise<void>;
  selectToilet: (toilet: Toilet | null) => void;
  clearError: () => void;
}

export const useToiletStore = create<ToiletState>()(
  devtools(
    (set, get) => ({
      toilets: [],
      selectedToilet: null,
      loading: false,
      error: null,
      lastFetchLocation: null,
      lastFetchTime: null,

      fetchNearbyToilets: async (
        latitude: number,
        longitude: number,
        radius = 5000
      ) => {
        try {
          const currentLocation = { latitude, longitude };
          const { lastFetchLocation, lastFetchTime } = get();

          // Check if we should fetch new data or use the cache
          if (
            !shouldFetchNewData(
              lastFetchLocation,
              lastFetchTime,
              currentLocation
            )
          ) {
            // Throttled logging for skipping fetch (30 second interval)
            const SKIP_FETCH_LOG_THROTTLE = 30000; // 30 seconds
            debug.throttledLog(
              "ToiletStore",
              `skip-fetch-${currentLocation.latitude.toFixed(4)}-${currentLocation.longitude.toFixed(4)}`,
              "Using cached toilets - skipping fetch",
              {},
              SKIP_FETCH_LOG_THROTTLE
            );
            return;
          }

          debug.log("ToiletStore", "Fetching nearby toilets", {
            latitude,
            longitude,
            radius,
          });
          set({ loading: true, error: null });

          const toilets = await supabaseService.toilets.getNearby(
            latitude,
            longitude,
            radius
          );

          // Validate toilets data - TEMPORARILY USING LESS STRICT VALIDATION
          const validToilets = toilets.filter((toilet) => {
            // Basic validation
            const hasBasicProps = toilet && toilet.id && toilet.location;

            // Only validate that coordinates exist and are numbers (temporarily allowing any values)
            // This is less strict to help diagnose the issue with missing toilets
            const hasCoords =
              toilet.location &&
              typeof toilet.location.latitude === "number" &&
              typeof toilet.location.longitude === "number";

            // Log validation results for each toilet to help diagnose
            if (!hasBasicProps || !hasCoords) {
              debug.warn(
                "ToiletStore",
                `Invalid toilet detected: ${toilet?.id || "unknown"}`,
                {
                  hasBasicProps,
                  hasCoords,
                  latitude: toilet?.location?.latitude,
                  longitude: toilet?.location?.longitude,
                }
              );
            }

            return hasBasicProps && hasCoords;
          });

          // Log if any invalid toilets were found with details about what was invalid
          if (validToilets.length !== toilets.length) {
            const invalidToilets = toilets.filter(
              (t) => !validToilets.includes(t)
            );
            debug.warn(
              "ToiletStore",
              `Filtered out ${toilets.length - validToilets.length} invalid toilets`,
              {
                invalidToiletIds: invalidToilets.map((t) => t?.id || "unknown"),
                invalidToiletReasons: invalidToilets.map((t) => {
                  if (!t) return "null toilet object";
                  if (!t.id) return "missing ID";
                  if (!t.location) return "missing location";
                  if (typeof t.location.latitude !== "number")
                    return "invalid latitude type";
                  if (typeof t.location.longitude !== "number")
                    return "invalid longitude type";
                  if (t.location.latitude < -90 || t.location.latitude > 90)
                    return "latitude out of range";
                  if (t.location.longitude < -180 || t.location.longitude > 180)
                    return "longitude out of range";
                  return "unknown reason";
                }),
              }
            );
          }

          debug.log(
            "ToiletStore",
            `Fetched ${validToilets.length} valid toilets`
          );
          set({
            toilets: validToilets,
            loading: false,
            lastFetchLocation: currentLocation,
            lastFetchTime: Date.now(),
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to fetch toilets";
          debug.error("ToiletStore", "Failed to fetch toilets", error);

          set({
            error: errorMessage,
            loading: false,
          });
        }
      },

      selectToilet: (toilet) => {
        debug.log(
          "ToiletStore",
          toilet ? `Selected toilet ${toilet.id}` : "Deselected toilet"
        );
        set({ selectedToilet: toilet });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: "toilet-store" }
  )
);
