/**
 * @file AuthDebugger.ts
 *
 * A specialized debug module for authentication events
 * providing privacy-aware logging and performance tracking
 * for auth operations.
 */

import { debug } from "./debug";

// Event types
export type AuthEventType =
  | "SIGNUP"
  | "SIGNIN"
  | "SIGNOUT"
  | "PASSWORD_RESET"
  | "PASSWORD_UPDATE"
  | "SESSION_REFRESH"
  | "PROFILE_UPDATE"
  | "STATE_CHANGE";

// Status types
export type AuthEventStatus =
  | "attempt"
  | "success"
  | "failure"
  | "validation_error"
  | "network_error"
  | "info";

/**
 * Auth Debugger - Specialized logger for auth operations
 *
 * Provides structured, privacy-aware logging for authentication flows
 * Encapsulates auth logging logic to maintain consistency across the app
 */
class AuthDebugger {
  /**
   * Log an authentication event with privacy protection
   *
   * @param event - Type of auth event
   * @param status - Outcome status
   * @param details - Additional details (will be sanitized)
   */
  log(event: AuthEventType, status: AuthEventStatus, details?: any) {
    if (!debug.isDebugging()) return;

    const safeDetails = this.sanitizeAuthData(details);
    debug.log("Auth", `[${event}][${status}]`, safeDetails);
  }

  /**
   * Track auth operation performance
   *
   * @param operation - Name of operation to track
   * @returns Function to call when operation completes
   */
  trackPerformance(operation: string): () => void {
    const timerLabel = `auth_${operation}`;
    debug.startTimer(timerLabel);

    return () => debug.endTimer(timerLabel);
  }

  /**
   * Sanitize sensitive auth data before logging
   *
   * @param data - Raw data object
   * @returns Sanitized data safe for logging
   */
  private sanitizeAuthData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };

    // Remove sensitive fields
    if (sanitized.password) sanitized.password = "[REDACTED]";
    if (sanitized.token) sanitized.token = "[REDACTED]";

    // Protect user identifiable information
    if (sanitized.email) sanitized.email = this.maskEmail(sanitized.email);
    if (sanitized.user?.email)
      sanitized.user.email = this.maskEmail(sanitized.user.email);

    // Redact tokens
    if (sanitized.session?.access_token)
      sanitized.session.access_token = "[REDACTED]";
    if (sanitized.session?.refresh_token)
      sanitized.session.refresh_token = "[REDACTED]";

    return sanitized;
  }

  /**
   * Mask email for privacy while maintaining debugging value
   *
   * @param email - Raw email address
   * @returns Masked email (e.g., j***e@example.com)
   */
  maskEmail(email: string): string {
    if (!email || typeof email !== "string") return "[INVALID_EMAIL]";

    const [username, domain] = email.split("@");
    if (!username || !domain) return "[MALFORMED_EMAIL]";

    // Keep first and last character, mask the rest
    const maskedUsername =
      username.length <= 2 ?
        username
      : `${username.charAt(0)}${"*".repeat(Math.min(username.length - 2, 5))}${username.charAt(username.length - 1)}`;

    return `${maskedUsername}@${domain}`;
  }
}

// Export singleton instance
export const authDebug = new AuthDebugger();
