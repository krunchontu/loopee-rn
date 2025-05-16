import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Toilet } from "../types/toilet";
import { supabaseService } from "../services/supabase";
import { debug } from "../utils/debug";

interface ToiletState {
  toilets: Toilet[];
  selectedToilet: Toilet | null;
  loading: boolean;
  error: string | null;
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
    (set) => ({
      toilets: [],
      selectedToilet: null,
      loading: false,
      error: null,

      fetchNearbyToilets: async (
        latitude: number,
        longitude: number,
        radius = 5000
      ) => {
        try {
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
          set({ toilets: validToilets, loading: false });
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
