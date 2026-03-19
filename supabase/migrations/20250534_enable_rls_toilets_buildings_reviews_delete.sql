-- Migration: Enable RLS on toilets/buildings tables and add missing reviews DELETE policy
-- Date: 2026-03-19
-- Issue: N-RLS (Composite: 80) — toilets and buildings tables have no RLS;
--        reviews table missing DELETE policy
-- Context:
--   - All toilet writes go through submit_toilet() RPC (SECURITY DEFINER)
--   - All review writes go through create_review()/edit_review() RPCs (SECURITY DEFINER)
--   - Buildings are reference-only (no direct writes from app)
--   - SELECT must remain public for all three tables (map view, toilet detail, reviews)

-- ===========================================================================
-- 1. TOILETS TABLE — Enable RLS
-- ===========================================================================

ALTER TABLE public.toilets ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous/unauthenticated) can view toilets
-- This is required for the map view and toilet detail screens
DROP POLICY IF EXISTS "Anyone can view toilets" ON public.toilets;
CREATE POLICY "Anyone can view toilets"
  ON public.toilets
  FOR SELECT
  USING (true);

-- Only authenticated users can insert toilets directly
-- In practice, inserts go through submit_toilet() SECURITY DEFINER RPC,
-- which bypasses RLS. This policy is a safety net for direct access.
DROP POLICY IF EXISTS "Authenticated users can insert toilets" ON public.toilets;
CREATE POLICY "Authenticated users can insert toilets"
  ON public.toilets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only the submitter or last editor can update a toilet directly
-- In practice, updates go through submit_toilet() SECURITY DEFINER RPC
-- and process_approved_submission() SECURITY DEFINER function.
-- This policy is a safety net; it allows updates for the original submitter
-- or any authenticated user if submitted_by is null (legacy data).
DROP POLICY IF EXISTS "Submitter can update own toilets" ON public.toilets;
CREATE POLICY "Submitter can update own toilets"
  ON public.toilets
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by IS NULL
    OR auth.uid()::text = submitted_by::text
  );

-- No one can delete toilets directly via the API
-- Toilet deletion should only happen through admin functions
DROP POLICY IF EXISTS "No direct toilet deletion" ON public.toilets;
CREATE POLICY "No direct toilet deletion"
  ON public.toilets
  FOR DELETE
  USING (false);

-- ===========================================================================
-- 2. BUILDINGS TABLE — Enable RLS
-- ===========================================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Anyone can view buildings (needed for map and toilet detail)
DROP POLICY IF EXISTS "Anyone can view buildings" ON public.buildings;
CREATE POLICY "Anyone can view buildings"
  ON public.buildings
  FOR SELECT
  USING (true);

-- Only authenticated users can create buildings
DROP POLICY IF EXISTS "Authenticated users can insert buildings" ON public.buildings;
CREATE POLICY "Authenticated users can insert buildings"
  ON public.buildings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update buildings (no ownership tracking exists)
DROP POLICY IF EXISTS "Authenticated users can update buildings" ON public.buildings;
CREATE POLICY "Authenticated users can update buildings"
  ON public.buildings
  FOR UPDATE
  TO authenticated
  USING (true);

-- No direct deletion of buildings
DROP POLICY IF EXISTS "No direct building deletion" ON public.buildings;
CREATE POLICY "No direct building deletion"
  ON public.buildings
  FOR DELETE
  USING (false);

-- ===========================================================================
-- 3. REVIEWS TABLE — Add missing DELETE policy
-- ===========================================================================

-- Users can delete only their own reviews
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
