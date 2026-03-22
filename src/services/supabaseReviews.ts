/**
 * Supabase Review Service
 *
 * CRUD operations for toilet reviews backed by the Supabase singleton client.
 */

import { getSupabaseClient } from "./supabaseClient";
import type { Review as _Review } from "../types/toilet";
import { debug } from "../utils/debug";
import { ReviewSchema, safeParse, safeParseArray } from "../utils/validators";

export const supabaseReviews = {
  async create(review: {
    toiletId: string;
    rating: number;
    comment?: string;
    photos?: string[];
  }): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("create_review", {
      p_toilet_id: review.toiletId,
      p_rating: review.rating,
      p_comment: review.comment || "",
      p_photos: review.photos || [],
    });

    if (error) {
      debug.error("Supabase", "Error creating review", error);
      throw error;
    }
    return String(data ?? "");
  },

  async update(
    reviewId: string,
    updates: { rating?: number; comment?: string; photos?: string[] },
  ): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("edit_review", {
      p_review_id: reviewId,
      p_rating: updates.rating,
      p_comment: updates.comment || "",
      p_photos: updates.photos || null,
    });

    if (error) {
      debug.error("Supabase", "Error updating review", error);
      throw error;
    }
    return String(data ?? "");
  },

  async getByToiletId(toiletId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
        *,
        user_profiles (
          id,
          display_name,
          avatar_url
        )
      `,
      )
      .eq("toilet_id", toiletId)
      .order("created_at", { ascending: false });

    if (error) {
      debug.error("Supabase", "Error fetching reviews by toilet ID", error);
      throw error;
    }

    const mapped = data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      rating: item.rating,
      comment: item.comment,
      photos: item.photos || [],
      createdAt: item.created_at,
      isEdited: item.is_edited || false,
      version: item.version || 1,
      lastEditedAt: item.last_edited_at,
      updatedAt: item.updated_at,
      user: item.user_profiles
        ? {
            id: item.user_profiles.id,
            displayName: item.user_profiles.display_name,
            avatarUrl: item.user_profiles.avatar_url,
          }
        : null,
    }));
    return safeParseArray(ReviewSchema, mapped, "getReviewsByToiletId");
  },

  async getCurrentUserReview(toiletId: string) {
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      debug.log("Supabase", "No authenticated user to get review");
      return null;
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("toilet_id", toiletId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      debug.error("Supabase", "Error fetching current user review", error);
      throw error;
    }

    return safeParse(
      ReviewSchema,
      {
        id: data.id,
        userId: data.user_id,
        rating: data.rating,
        comment: data.comment,
        photos: data.photos || [],
        createdAt: data.created_at,
        isEdited: data.is_edited || false,
        version: data.version || 1,
        lastEditedAt: data.last_edited_at,
        updatedAt: data.updated_at,
      },
      "getCurrentUserReview",
    );
  },

  async getByUserId(userId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
        id,
        toilet_id,
        user_id,
        rating,
        comment,
        photos,
        created_at,
        toilets (
          name,
          address
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      debug.error("Supabase", "Error fetching reviews by user ID", error);
      throw error;
    }

    return (data || []).map(
      (item: {
        id: string;
        toilet_id: string;
        user_id: string;
        rating: number;
        comment: string | null;
        photos: string[] | null;
        created_at: string;
        toilets: { name: string; address: string | null } | null;
      }) => ({
        id: item.id,
        toilet_id: item.toilet_id,
        user_id: item.user_id,
        rating: item.rating,
        comment: item.comment,
        photos: item.photos || [],
        created_at: item.created_at,
        toilet: item.toilets
          ? {
              name: item.toilets.name,
              address: item.toilets.address || undefined,
            }
          : undefined,
      }),
    );
  },
};
