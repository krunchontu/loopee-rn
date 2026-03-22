/**
 * @file Submission Deduplication
 *
 * Tracks recent toilet submissions in memory to prevent accidental
 * double-submits within a configurable time window.
 */

import type { Toilet } from "../../types/toilet";
import { MAX_RECENT_SUBMISSIONS } from "./validation";

// ── In-memory state ─────────────────────────────────────────────────────────

/**
 * Track recent submissions to prevent duplicates.
 * Maps content hash → { timestamp, submission ID }.
 */
export const recentSubmissions = new Map<
  string,
  { timestamp: number; id: string }
>();

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a simple hash for toilet data to detect duplicate submissions.
 */
export function generateSubmissionHash(data: Partial<Toilet>): string {
  const keyData = {
    name: data.name || "",
    location: data.location
      ? `${data.location.latitude.toFixed(6)},${data.location.longitude.toFixed(6)}`
      : "",
    address: data.address || "",
    buildingName: data.buildingName || "",
    floorLevel:
      data.floorLevel !== undefined ? data.floorLevel.toString() : "",
  };
  return JSON.stringify(keyData);
}

/**
 * Check if this is a duplicate of a recent submission.
 * @param dedupeTimeWindowMs Millisecond window to consider (default 10 s)
 */
export function isDuplicateSubmission(
  data: Partial<Toilet>,
  dedupeTimeWindowMs: number = 10000,
): { isDuplicate: boolean; existingId?: string } {
  const hash = generateSubmissionHash(data);
  const existing = recentSubmissions.get(hash);

  if (existing) {
    const elapsed = Date.now() - existing.timestamp;
    if (elapsed < dedupeTimeWindowMs) {
      return { isDuplicate: true, existingId: existing.id };
    }
  }

  return { isDuplicate: false };
}

/**
 * Record a submission to prevent duplicates.
 */
export function recordSubmission(
  data: Partial<Toilet>,
  submissionId: string,
): void {
  const hash = generateSubmissionHash(data);
  recentSubmissions.set(hash, { timestamp: Date.now(), id: submissionId });

  // Clean up old entries to prevent memory growth
  cleanupOldSubmissions();

  // Hard cap: evict oldest entries if Map exceeds max size
  while (recentSubmissions.size > MAX_RECENT_SUBMISSIONS) {
    let oldest: { key: string; timestamp: number } | null = null;
    for (const [key, value] of recentSubmissions.entries()) {
      if (!oldest || value.timestamp < oldest.timestamp) {
        oldest = { key, timestamp: value.timestamp };
      }
    }
    if (oldest) {
      recentSubmissions.delete(oldest.key);
    } else {
      break;
    }
  }
}

/**
 * Remove submission tracking entries older than 30 minutes
 * to prevent unbounded memory growth.
 */
export function cleanupOldSubmissions(): void {
  const now = Date.now();
  const thirtyMinutesMs = 30 * 60 * 1000;

  for (const [hash, { timestamp }] of recentSubmissions.entries()) {
    if (now - timestamp > thirtyMinutesMs) {
      recentSubmissions.delete(hash);
    }
  }
}
