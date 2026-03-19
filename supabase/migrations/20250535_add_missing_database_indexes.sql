-- Migration: Add missing database indexes for query performance
-- Date: 2026-03-19
-- Issue: N-IDX (Composite: 48) — Critical tables lack indexes on columns
--        used in WHERE, ORDER BY, and JOIN clauses
--
-- Evidence: Every index below is tied to a real query in the application.
-- Using CREATE INDEX CONCURRENTLY is not available inside transactions,
-- so we use IF NOT EXISTS for idempotency.

-- ===========================================================================
-- 1. REVIEWS TABLE — 0 existing indexes, heavily queried
-- ===========================================================================

-- Used by: supabase.ts:getByToiletId() → .eq("toilet_id", ...).order("created_at", desc)
-- Used by: update_toilet_average_rating() trigger → WHERE toilet_id = ...
-- Composite covers both: toilet_id equality + created_at ordering
CREATE INDEX IF NOT EXISTS idx_reviews_toilet_id_created_at
  ON public.reviews (toilet_id, created_at DESC);

-- Used by: supabase.ts:getCurrentUserReview() → .eq("toilet_id", ...).eq("user_id", ...)
-- Used by: create_review() RPC → SELECT ... WHERE toilet_id = ... AND user_id = ...
-- UNIQUE enforces one review per user per toilet at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_toilet_id_user_id
  ON public.reviews (toilet_id, user_id);

-- Used by: update_user_review_count() trigger → WHERE id = OLD.user_id / NEW.user_id
-- Used by: RLS policy "Users can insert their own reviews" → auth.uid() = user_id
-- Used by: RLS policy "Users can update only their own reviews" → auth.uid() = user_id
-- Used by: RLS policy "Users can delete their own reviews" → auth.uid() = user_id
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews (user_id);

-- ===========================================================================
-- 2. TOILET_SUBMISSIONS TABLE — 0 existing indexes
-- ===========================================================================

-- Used by: contributionService.ts:getSubmissions() →
--   .eq("submitter_id", uid).order("created_at", { ascending: false })
-- Composite covers submitter filtering + chronological ordering
CREATE INDEX IF NOT EXISTS idx_toilet_submissions_submitter_id_created_at
  ON public.toilet_submissions (submitter_id, created_at DESC);

-- Used by: process_approved_submission() trigger → WHERE status changed
-- Used by: admin workflows filtering by submission status
CREATE INDEX IF NOT EXISTS idx_toilet_submissions_status
  ON public.toilet_submissions (status);

-- ===========================================================================
-- 3. TOILETS TABLE — only has GIST location index
-- ===========================================================================

-- Used by: find_toilets_within_radius() → LEFT JOIN buildings b ON t.building_id = b.id
-- FK columns should always have indexes for JOIN performance
CREATE INDEX IF NOT EXISTS idx_toilets_building_id
  ON public.toilets (building_id);

-- ===========================================================================
-- 4. USER_ACTIVITY TABLE — missing entity_id index
-- ===========================================================================

-- Used by: activityService.ts:getEntityActivity() →
--   .eq("entity_id", entityId).order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_user_activity_entity_id
  ON public.user_activity (entity_id);

-- ===========================================================================
-- 5. USER_NOTIFICATIONS TABLE — improve composite for common query
-- ===========================================================================

-- Used by: activityService.ts:markAllNotificationsRead() →
--   .eq("user_id", userId).eq("is_read", false)
-- Used by: get_user_notifications() RPC → WHERE user_id = ... AND (NOT is_read)
-- Composite replaces scanning two separate single-column indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_is_read
  ON public.user_notifications (user_id, is_read);
