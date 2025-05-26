-- Migration: 20250523_update_rls_policies.sql
-- Purpose: Update Row-Level Security policies for toilet_submissions table
-- to ensure consistent UUID comparison by using explicit type casting

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own submissions" ON toilet_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON toilet_submissions;

-- Create updated policy with explicit type casting for inserts
-- The ::text conversion ensures consistent string comparison of UUIDs
CREATE POLICY "Users can create their own submissions"
  ON toilet_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id::text = auth.uid()::text);

-- Create updated policy with explicit type casting for selects
CREATE POLICY "Users can view their own submissions"
  ON toilet_submissions
  FOR SELECT
  TO authenticated
  USING (submitter_id::text = auth.uid()::text);

-- Create policy for updates (maintain existing updates if needed)
CREATE POLICY "Users can update their own submissions"
  ON toilet_submissions
  FOR UPDATE
  TO authenticated
  USING (submitter_id::text = auth.uid()::text);

-- Create policy for deletes (maintain existing deletion capabilities if needed)
CREATE POLICY "Users can delete their own submissions"
  ON toilet_submissions
  FOR DELETE
  TO authenticated
  USING (submitter_id::text = auth.uid()::text);
