/**
 * @file Types related to toilet contribution system
 */

import { Toilet } from "./toilet";

/**
 * Base props interface shared by all contribution form steps
 */
export interface BaseStepProps {
  /**
   * Callback to navigate to the next step
   */
  onNext: () => void;

  /**
   * Callback to navigate to the previous step
   */
  onBack: () => void;
}

/**
 * Types of toilet submissions
 */
export type ToiletSubmissionType = "new" | "edit" | "report";
export type SubmissionType = ToiletSubmissionType; // Alias for backward compatibility

/**
 * Status of a toilet submission
 */
export type ToiletSubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionStatus = ToiletSubmissionStatus; // Alias for backward compatibility

/**
 * Simplified submission preview used in listings
 */
export interface SubmissionPreview {
  /**
   * Unique identifier for the submission
   */
  id: string;

  /**
   * ID of the toilet being edited/reported (null for new toilets)
   */
  toilet_id?: string;

  /**
   * Name of the toilet (for display purposes)
   */
  toilet_name: string;

  /**
   * Type of submission
   */
  submission_type: SubmissionType;

  /**
   * Current status of the submission
   */
  status: SubmissionStatus;

  /**
   * Submission timestamp
   */
  created_at: string;
}

/**
 * Toilet submission data structure (matches database schema)
 */
export interface ToiletSubmission {
  /**
   * Unique identifier for the submission
   */
  id: string;

  /**
   * ID of the toilet being edited/reported (null for new toilets)
   */
  toilet_id: string | null;

  /**
   * ID of the user who submitted this
   */
  submitter_id: string;

  /**
   * Type of submission
   */
  submission_type: ToiletSubmissionType;

  /**
   * Current status of the submission
   */
  status: ToiletSubmissionStatus;

  /**
   * The actual toilet data being submitted
   */
  data: Partial<Toilet>;

  /**
   * Optional reason for edit/report
   */
  reason?: string;

  /**
   * Submission timestamp
   */
  created_at: string;

  /**
   * Last update timestamp
   */
  updated_at: string;
}
