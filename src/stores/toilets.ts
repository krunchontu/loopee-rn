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

          debug.log("ToiletStore", `Fetched ${toilets.length} toilets`);
          set({ toilets, loading: false });
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
