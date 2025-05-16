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
        .rpc("find_toilets_within_radius", {
          lat: latitude,
          lng: longitude,
          radius_meters: radius,
        })
        .select("*");

      if (error) throw error;

      // Transform raw database results to match the Toilet interface structure
      // This handles the mismatch between PostgreSQL results and our TypeScript model
      const transformedData: Toilet[] = data.map((toilet) => {
        // Create unique coordinates for each toilet by using the distance
        // and approximating a position relative to the search coordinates
        const angle = Math.random() * Math.PI * 2; // Random angle in radians
        const distanceInDegrees = (toilet.distance_meters || 0) / 111000; // Rough conversion from meters to degrees

        const estimatedLat = latitude + Math.sin(angle) * distanceInDegrees;
        const estimatedLng = longitude + Math.cos(angle) * distanceInDegrees;

        return {
          id: toilet.id,
          name: toilet.name,
          location: {
            latitude: estimatedLat,
            longitude: estimatedLng,
          },
          rating: parseFloat(toilet.rating),
          reviewCount: 0, // Default value as it's not returned by the SQL function
          isAccessible: !!toilet.is_accessible,
          address: "", // Default value as it's not returned by the SQL function
          distance:
            toilet.distance_meters ?
              parseFloat(toilet.distance_meters.toString())
            : undefined,
          amenities: {
            // Default values for amenities that might not be in the SQL results
            hasBabyChanging: toilet.amenities?.babyChanging || false,
            hasShower: toilet.amenities?.shower || false,
            isGenderNeutral: toilet.amenities?.genderNeutral || false,
            hasPaperTowels: toilet.amenities?.paperTowels || false,
            hasHandDryer: toilet.amenities?.handDryer || false,
            hasWaterSpray: toilet.amenities?.waterSpray || false,
            hasSoap: toilet.amenities?.soap || false,
          },
          photos: toilet.photos || [],
          lastUpdated: new Date().toISOString(), // Default as it's not in the SQL results
          createdAt: new Date().toISOString(), // Default as it's not in the SQL results
          openingHours:
            toilet.opening_hours ?
              {
                open: toilet.opening_hours.split("-")[0] || "00:00",
                close: toilet.opening_hours.split("-")[1] || "23:59",
              }
            : undefined,
        };
      });

      return transformedData;
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
