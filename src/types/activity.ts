/**
 * Types related to user activity and notification system
 */

/**
 * Activity metadata structure
 */
export interface ActivityMetadata {
  /**
   * ID of the submission related to this activity
   */
  submission_id?: string;

  /**
   * Type of submission (new, edit, report)
   */
  submission_type?: string;

  /**
   * Data related to the activity
   */
  data?: {
    /**
     * Name of the toilet
     */
    name?: string;

    /**
     * Status of the submission
     */
    status?: string;

    /**
     * Any additional fields
     */
    [key: string]: any;
  };

  /**
   * Any additional metadata fields
   */
  [key: string]: any;
}

/**
 * User activity record
 */
export interface UserActivity {
  /**
   * Unique identifier for the activity
   */
  id: string;

  /**
   * Type of activity (e.g., toilet_new, toilet_edit, toilet_report)
   */
  activity_type: string;

  /**
   * Related entity ID (usually the toilet or submission ID)
   */
  entity_id: string;

  /**
   * Additional contextual data about the activity
   */
  metadata: ActivityMetadata;

  /**
   * When the activity was recorded
   */
  created_at: string;
}

/**
 * Notification metadata structure
 */
export interface NotificationMetadata {
  /**
   * ID of the submission related to this notification
   */
  submission_id?: string;

  /**
   * ID of the toilet related to this notification
   */
  toilet_id?: string;

  /**
   * Any additional metadata fields
   */
  [key: string]: any;
}

/**
 * User notification record
 */
export interface UserNotification {
  /**
   * Unique identifier for the notification
   */
  id: string;

  /**
   * Type of notification (e.g., submission_approved, submission_rejected)
   */
  notification_type: string;

  /**
   * Notification title
   */
  title: string;

  /**
   * Notification message content
   */
  message: string;

  /**
   * Type of related entity (e.g., toilet_submission, review)
   */
  entity_type?: string;

  /**
   * ID of the related entity
   */
  entity_id?: string;

  /**
   * Additional contextual data about the notification
   */
  metadata: NotificationMetadata;

  /**
   * Whether the notification has been read by the user
   */
  is_read: boolean;

  /**
   * When the notification was created
   */
  created_at: string;
}
