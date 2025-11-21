/**
 * @file Profile Service
 *
 * Handles user profile operations, including verification, creation, and updates.
 * This service ensures user profiles exist in the database before critical operations.
 *
 * The profile system is critical for row-level security policies in Supabase,
 * as many tables include RLS policies that reference user_profiles.
 */

import { supabaseService } from "./supabase";
import type { UserProfile } from "../types/user";
import { authDebug } from "../utils/AuthDebugger";
import { debug } from "../utils/debug";

/**
 * Profile Service - handles user profile operations
 */
class ProfileService {
  /**
   * Get current user profile if it exists
   * @returns The user profile or null if not found
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("profile_fetch");

      // Use the existing auth.getProfile method from supabaseService
      const profile = await supabaseService.auth.getProfile();

      // Log the result
      debug.log(
        "ProfileService",
        profile ? "Profile found" : "Profile not found",
        {
          hasProfile: !!profile,
        }
      );

      endTracking();
      return profile;
    } catch (err) {
      debug.error("ProfileService", "Unexpected error in getProfile", err);
      return null;
    }
  }

  /**
   * Create a user profile, using the built-in profile creation in Supabase service
   * This leverages the auto-creation in getProfile if profile is missing
   * @returns The created profile ID or null if failed
   */
  async createProfile(): Promise<string | null> {
    try {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("profile_creation");

      // Get current user - need to abort if there's no authenticated user
      const user = await supabaseService.auth.getUser();
      if (!user) {
        debug.error(
          "ProfileService",
          "No authenticated user found for profile creation"
        );
        return null;
      }

      // Use the built-in profile creation/retrieval system
      const profile = await supabaseService.auth.getProfile();

      if (!profile) {
        debug.error("ProfileService", "Failed to create profile");
        return null;
      }

      debug.log("ProfileService", "Profile created successfully", {
        profileId: profile.id,
      });

      endTracking();
      return profile.id;
    } catch (err) {
      debug.error("ProfileService", "Unexpected error in createProfile", err);
      return null;
    }
  }

  /**
   * Ensure a user profile exists, creating one if it doesn't
   * Critical for RLS policy compatibility when performing database operations
   * @returns The profile ID or null if failed
   */
  async ensureUserProfile(): Promise<string | null> {
    try {
      // Start performance tracking
      const endTracking = authDebug.trackPerformance("profile_ensure");

      // getProfile already has auto-creation built in if it doesn't exist
      const profile = await supabaseService.auth.getProfile();

      // If profile exists, return its ID
      if (profile) {
        debug.log("ProfileService", "Profile verified", {
          profileId: profile.id,
        });
        endTracking();
        return profile.id;
      }

      // If we get here, the automatic creation in getProfile failed
      debug.error("ProfileService", "Failed to ensure user profile exists");
      endTracking();
      return null;
    } catch (err) {
      debug.error("ProfileService", "Failed to ensure profile exists", err);
      return null;
    }
  }

  /**
   * Update user profile
   * @param data Profile data to update
   * @returns Updated profile or null if failed
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      // Use the supabaseService's updateProfile method
      return await supabaseService.auth.updateProfile(data);
    } catch (err) {
      debug.error("ProfileService", "Unexpected error in updateProfile", err);
      return null;
    }
  }
}

// Export a singleton instance
export const profileService = new ProfileService();
