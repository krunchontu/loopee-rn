/**
 * Activity and Notifications Service
 *
 * Handles user activities and notifications functionality
 * Provides methods to fetch user activity, manage notifications, and handle their display
 */

import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import { createClient } from "@supabase/supabase-js";

import { supabaseService } from "./supabase";
import type { UserActivity, UserNotification } from "../types/activity";
import { debug } from "../utils/debug";

// Direct client for database RPC operations
const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Activity service for handling user activities and notifications
 */
export const activityService = {
  /**
   * Get user activity feed with pagination
   * @param limit Maximum number of activities to fetch
   * @param offset Offset for pagination
   * @returns Array of user activities
   */
  async getUserActivity(
    limit: number = 20,
    offset: number = 0
  ): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase.rpc("get_user_activity", {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        debug.error("activityService", "Failed to fetch activity", error);
        throw new Error(`Failed to fetch activity: ${error.message}`);
      }

      return (data || []) as UserActivity[];
    } catch (err) {
      debug.error("activityService", "Error in getUserActivity", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching activities"
        );
      }
    }
  },

  /**
   * Get user notifications with pagination and filtering options
   * @param limit Maximum number of notifications to fetch
   * @param offset Offset for pagination
   * @param unreadOnly Whether to fetch only unread notifications
   * @returns Array of user notifications
   */
  async getUserNotifications(
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<UserNotification[]> {
    try {
      const { data, error } = await supabase.rpc("get_user_notifications", {
        p_limit: limit,
        p_offset: offset,
        p_unread_only: unreadOnly,
      });

      if (error) {
        debug.error("activityService", "Failed to fetch notifications", error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      return (data || []) as UserNotification[];
    } catch (err) {
      debug.error("activityService", "Error in getUserNotifications", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching notifications"
        );
      }
    }
  },

  /**
   * Get count of unread notifications
   * @returns Count of unread notifications
   */
  async getUnreadNotificationCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);

      if (error) {
        debug.error(
          "activityService",
          "Failed to fetch notification count",
          error
        );
        throw new Error(`Failed to fetch notification count: ${error.message}`);
      }

      return data?.length || 0;
    } catch (err) {
      debug.error(
        "activityService",
        "Error in getUnreadNotificationCount",
        err
      );
      // Return 0 instead of throwing to prevent UI disruptions
      return 0;
    }
  },

  /**
   * Mark a notification as read
   * @param notificationId ID of the notification to mark as read
   * @param isRead Whether the notification is read (default: true)
   * @returns Whether the operation was successful
   */
  async markNotificationRead(
    notificationId: string,
    isRead: boolean = true
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("mark_notification_read", {
        p_notification_id: notificationId,
        p_is_read: isRead,
      });

      if (error) {
        debug.error(
          "activityService",
          "Failed to mark notification as read",
          error
        );
        throw new Error(`Failed to update notification: ${error.message}`);
      }

      return !!data;
    } catch (err) {
      debug.error("activityService", "Error in markNotificationRead", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while updating notification"
        );
      }
    }
  },

  /**
   * Mark all notifications as read
   * @returns Whether the operation was successful
   */
  async markAllNotificationsRead(): Promise<boolean> {
    try {
      // Get authenticated user to explicitly pass the ID
      const { data: authData, error: authError } =
        await supabaseService.auth.getSession();

      if (authError) {
        debug.error("activityService", "Authentication error", authError);
        throw new Error("Authentication error: " + authError.message);
      }

      if (
        !authData ||
        !authData.session ||
        !authData.session.user ||
        !authData.session.user.id
      ) {
        debug.error("activityService", "User not authenticated");
        throw new Error("You must be logged in to update notifications");
      }

      const userId = authData.session.user.id;

      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        debug.error(
          "activityService",
          "Failed to mark all notifications as read",
          error
        );
        throw new Error(`Failed to update notifications: ${error.message}`);
      }

      return true;
    } catch (err) {
      debug.error("activityService", "Error in markAllNotificationsRead", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while updating notifications"
        );
      }
    }
  },

  /**
   * Get activity details for a specific entity
   * @param entityId ID of the entity to get activity for
   * @param limit Maximum number of activities to fetch
   * @returns Array of activities related to the entity
   */
  async getEntityActivity(
    entityId: string,
    limit: number = 5
  ): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from("user_activity")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        debug.error(
          "activityService",
          "Failed to fetch entity activity",
          error
        );
        throw new Error(`Failed to fetch entity activity: ${error.message}`);
      }

      return (data || []) as UserActivity[];
    } catch (err) {
      debug.error("activityService", "Error in getEntityActivity", err);
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(
          "An unexpected error occurred while fetching entity activity"
        );
      }
    }
  },
};
