import {
  createClient,
  AuthResponse,
  Session,
  User,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { Toilet, Review } from "../types/toilet";
import { UserProfile } from "../types/user";
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

// Define the auth service types
interface AuthSignUpParams {
  email: string;
  password: string;
  metadata?: {
    full_name?: string;
  };
}

interface AuthSignInParams {
  email: string;
  password: string;
}

interface ProfileUpdateParams {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export const supabaseService = {
  // Auth operations
  auth: {
    /**
     * Sign up a new user
     * @param params User signup parameters
     * @returns AuthResponse with user data or error
     */
    async signUp(params: AuthSignUpParams): Promise<AuthResponse> {
      const { email, password, metadata } = params;
      const response = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (response.error) {
        debug.error("Auth", "Sign up failed", response.error);
      }

      return response;
    },

    /**
     * Sign in a user with email and password
     * @param params User signin parameters
     * @returns AuthResponse with session or error
     */
    async signIn(params: AuthSignInParams): Promise<AuthResponse> {
      const { email, password } = params;
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        debug.error("Auth", "Sign in failed", response.error);
      }

      return response;
    },

    /**
     * Sign out the current user
     * @returns Promise with void or error
     */
    async signOut(): Promise<{ error: Error | null }> {
      return await supabase.auth.signOut();
    },

    /**
     * Request a password reset email
     * @param email User's email address
     * @returns Promise with void or error
     */
    async resetPassword(email: string): Promise<{ error: Error | null }> {
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    },

    /**
     * Update user's password (when they have a valid reset token)
     * @param newPassword The new password
     * @returns User update response
     */
    async updatePassword(newPassword: string): Promise<{
      data: { user: User | null };
      error: Error | null;
    }> {
      return await supabase.auth.updateUser({
        password: newPassword,
      });
    },

    /**
     * Get current session
     * @returns Current session or null
     */
    async getSession(): Promise<{
      data: { session: Session | null };
      error: Error | null;
    }> {
      return await supabase.auth.getSession();
    },

    /**
     * Get current user
     * @returns Current user or null
     */
    async getUser(): Promise<User | null> {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        debug.error("Auth", "Get user failed", error);
        return null;
      }
      return data.user;
    },

    /**
     * Subscribe to auth state changes
     * @param callback Function to call when auth state changes
     * @returns Subscription object
     */
    onAuthStateChange(
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) {
      return supabase.auth.onAuthStateChange(callback);
    },

    /**
     * Get current user's profile
     * @returns User profile or null
     */
    async getProfile(): Promise<UserProfile | null> {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.user.id)
        .single();

      if (error) {
        debug.error("Auth", "Get profile failed", error);
        return null;
      }

      return data as UserProfile;
    },

    /**
     * Update user's profile
     * @param params Profile fields to update
     * @returns Updated profile or null
     */
    async updateProfile(
      params: ProfileUpdateParams
    ): Promise<UserProfile | null> {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .update(params)
        .eq("id", user.user.id)
        .select()
        .single();

      if (error) {
        debug.error("Auth", "Update profile failed", error);
        return null;
      }

      return data as UserProfile;
    },
  },

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

      // Enhanced diagnosis logging
      const totalToilets = data.length;
      const withValidCoords = data.filter(
        (toilet) =>
          toilet.latitude &&
          toilet.longitude &&
          toilet.latitude !== 0 &&
          toilet.longitude !== 0
      ).length;

      debug.warn(
        "Supabase",
        `TOILET DIAGNOSIS: Total toilets: ${totalToilets}, With valid coordinates: ${withValidCoords}`,
        {
          totalToilets,
          withValidCoords,
          missingCoords: totalToilets - withValidCoords,
          percentValid:
            totalToilets > 0 ?
              Math.round((withValidCoords / totalToilets) * 100)
            : 0,
        }
      );

      // Transform raw database results to match the Toilet interface structure
      // This handles the mismatch between PostgreSQL results and our TypeScript model
      const transformedData: Toilet[] = data.map((toilet) => {
        // Default to using actual coordinates from the database if available
        let toiletLatitude = toilet.latitude;
        let toiletLongitude = toilet.longitude;

        // Fallback to calculated position if coordinates are missing or invalid
        if (
          !toiletLatitude ||
          !toiletLongitude ||
          typeof toiletLatitude !== "number" ||
          typeof toiletLongitude !== "number" ||
          toiletLatitude === 0 ||
          toiletLongitude === 0
        ) {
          debug.warn(
            "Supabase",
            `Missing or invalid coordinates for toilet ${toilet.name}, using calculated fallback`
          );

          const angle = Math.random() * Math.PI * 2; // Random angle in radians
          const distanceInDegrees = (toilet.distance_meters || 0) / 111000; // Rough conversion from meters to degrees

          toiletLatitude = latitude + Math.sin(angle) * distanceInDegrees;
          toiletLongitude = longitude + Math.cos(angle) * distanceInDegrees;

          // Log the fallback calculation
          debug.log(
            "Supabase",
            `Calculated fallback position for toilet ${toilet.name}`,
            {
              toiletId: toilet.id,
              toiletName: toilet.name,
              distance: toilet.distance_meters,
              calculatedPosition: { lat: toiletLatitude, lng: toiletLongitude },
              angle: angle * (180 / Math.PI), // Convert to degrees for readability
              userPosition: { lat: latitude, lng: longitude },
            }
          );
        } else {
          // Log that we're using actual coordinates
          debug.log(
            "Supabase",
            `Using actual coordinates for toilet ${toilet.name}`,
            {
              toiletId: toilet.id,
              toiletName: toilet.name,
              actualPosition: { lat: toiletLatitude, lng: toiletLongitude },
              distance: toilet.distance_meters,
              userPosition: { lat: latitude, lng: longitude },
            }
          );
        }

        return {
          id: toilet.id,
          name: toilet.name,
          location: {
            latitude: toiletLatitude,
            longitude: toiletLongitude,
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
          // Building and floor information
          buildingId: toilet.building_id || undefined,
          buildingName: toilet.building_name || undefined,
          floorLevel:
            toilet.floor_level !== undefined ? toilet.floor_level : undefined,
          floorName: toilet.floor_name || undefined,
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
