import { createClient } from "@supabase/supabase-js";
import { Toilet, Review } from "../types/toilet";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import { debug } from "../utils/debug";

// Initialize Supabase client
if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  debug.error("Supabase", "Missing environment variables", {
    url: !!EXPO_PUBLIC_SUPABASE_URL,
    key: !!EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  throw new Error("Supabase environment configuration is missing.");
}

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export const supabaseService = {
  // Toilet operations
  toilets: {
    async getNearby(
      latitude: number,
      longitude: number,
      radius: number = 5000
    ) {
      const { data, error } = await supabase
        .rpc("nearby_toilets", {
          lat: latitude,
          lng: longitude,
          radius_meters: radius,
        })
        .select("*");

      if (error) throw error;
      return data as Toilet[];
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from("toilets")
        .select(
          `
          *,
          reviews (
            id,
            rating,
            comment,
            photos,
            created_at,
            users (
              id,
              name,
              avatar_url
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Toilet & { reviews: Review[] };
    },

    async create(toilet: Omit<Toilet, "id" | "createdAt" | "updatedAt">) {
      const { data, error } = await supabase
        .from("toilets")
        .insert([toilet])
        .select()
        .single();

      if (error) throw error;
      return data as Toilet;
    },
  },

  // Review operations
  reviews: {
    async create(review: Omit<Review, "id" | "createdAt">) {
      const { data, error } = await supabase
        .from("reviews")
        .insert([review])
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },

    async getByToiletId(toiletId: string) {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          users (
            id,
            name,
            avatar_url
          )
        `
        )
        .eq("toilet_id", toiletId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
  },
};
