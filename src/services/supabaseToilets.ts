/**
 * Supabase Toilet Service
 *
 * CRUD operations for toilet data backed by the Supabase singleton client.
 */

import { getSupabaseClient } from "./supabaseClient";
import type { Toilet, Review } from "../types/toilet";
import { debug } from "../utils/debug";
import { normalizeToiletData, isValidLocation } from "../utils/toilet-helpers";
import { ToiletWithReviewsSchema, ToiletSchema, safeParse } from "../utils/validators";

export const supabaseToilets = {
  async getNearby(latitude: number, longitude: number, radius: number = 5000) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .rpc("find_toilets_within_radius", {
        lat: latitude,
        lng: longitude,
        radius_meters: radius,
      })
      .select("*");

    if (error) throw error;

    // Filter out toilets with missing or invalid coordinates instead of
    // fabricating random positions, which silently corrupts map data.
    const preprocessedData = data
      .filter((toilet) => {
        const loc = {
          latitude: toilet.latitude,
          longitude: toilet.longitude,
        };
        if (!isValidLocation(loc)) {
          debug.warn(
            "Supabase",
            `Excluding toilet "${toilet.name}" (${toilet.id}): invalid coordinates (${toilet.latitude}, ${toilet.longitude})`,
          );
          return false;
        }
        return true;
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      .map((toilet) => ({
        ...toilet,
        distance: toilet.distance_meters
          ? parseFloat(toilet.distance_meters.toString())
          : undefined,
      }));

    // Transform and normalize the toilet data using our utility
    const transformedData: Toilet[] = preprocessedData.map((toilet) => {
      const baseToilet = {
        id: toilet.id,
        name: toilet.name,
        description: toilet.description || toilet.name,
        location: {
          latitude: toilet.latitude,
          longitude: toilet.longitude,
        },
        rating:
          typeof toilet.rating === "string"
            ? parseFloat(toilet.rating)
            : toilet.rating || 0,
        reviewCount: toilet.reviews_count || 0,
        isAccessible: !!toilet.is_accessible,
        address: toilet.address || "",
        distance: toilet.distance,
        buildingId: toilet.building_id,
        buildingName: toilet.building_name,
        floorLevel: toilet.floor_level,
        floorName: toilet.floor_name,
        amenities: toilet.amenities || {},
        photos: toilet.photos || [],
        lastUpdated: toilet.updated_at || new Date().toISOString(),
        createdAt: toilet.created_at || new Date().toISOString(),
        openingHours: toilet.opening_hours
          ? {
              open: toilet.opening_hours.split("-")[0] || "00:00",
              close: toilet.opening_hours.split("-")[1] || "23:59",
            }
          : undefined,
      };

      return normalizeToiletData(baseToilet);
    });

    return transformedData;
  },

  async getById(id: string) {
    const supabase = getSupabaseClient();
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
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return safeParse(ToiletWithReviewsSchema, data, "getToiletById") as Toilet & { reviews: Review[] };
  },

  async create(toilet: Omit<Toilet, "id" | "createdAt" | "updatedAt">) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("toilets")
      .insert([toilet])
      .select()
      .single();

    if (error) throw error;
    return safeParse(ToiletSchema, data, "createToilet");
  },
};
