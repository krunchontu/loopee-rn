/**
 * @file Profile Content Types
 *
 * Type definitions for content displayed in user profiles,
 * including reviews, contributions, and favorites.
 */

import type { Toilet } from "./toilet";

/**
 * Base interface for content items with common properties
 */
export interface ContentItem {
  id: string;
  created_at: string;
  user_id: string;
}

/**
 * Review displayed in user profile
 */
export interface UserReview extends ContentItem {
  toilet_id: string;
  toilet?: {
    name: string;
    address?: string;
  };
  rating: number;
  comment?: string;
  photos?: string[];
}

/**
 * User contribution (added toilet)
 */
export interface UserContribution extends ContentItem {
  toilet_id: string;
  toilet?: Toilet;
  contribution_type: "add" | "edit" | "photo" | "review";
}

/**
 * User favorite toilet
 */
export interface UserFavorite extends ContentItem {
  toilet_id: string;
  toilet?: Toilet;
}
