/**
 * @file Sentry Error Tracking Service
 *
 * Configures Sentry for error tracking and monitoring
 */

import * as Sentry from "@sentry/react-native";

// Sentry configuration
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = __DEV__ ? "development" : "production";

/**
 * Initialize Sentry
 * Should be called at app startup
 */
export function initSentry() {
  // Only initialize Sentry if DSN is provided and not in development
  if (!SENTRY_DSN) {
    console.warn(
      "Sentry DSN not found. Error tracking is disabled. Set EXPO_PUBLIC_SENTRY_DSN in your .env file."
    );
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    // Enable in production, optional in development
    enabled: !__DEV__,
    // Set sample rate for performance monitoring
    tracesSampleRate: __DEV__ ? 0 : 0.2, // 20% of transactions in production
    // Enable automatic session tracking
    enableAutoSessionTracking: true,
    // Session tracking interval (default: 30s)
    sessionTrackingIntervalMillis: 30000,
    // Attach stack traces to all messages
    attachStacktrace: true,
    // Distribution identifier
    dist: "1",
    // Before send hook to sanitize sensitive data
    beforeSend(event, hint) {
      // Remove sensitive user data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Redact email addresses
            if (breadcrumb.data.email) {
              breadcrumb.data.email = "[REDACTED]";
            }
            // Redact tokens
            if (breadcrumb.data.token) {
              breadcrumb.data.token = "[REDACTED]";
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });

  console.log(`Sentry initialized for ${ENVIRONMENT} environment`);
}

/**
 * Set user context for Sentry
 * @param userId User ID
 * @param email User email (will be redacted)
 */
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email ? `${email.slice(0, 2)}***@${email.split("@")[1]}` : undefined,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Capture an exception
 * @param error Error object
 * @param context Additional context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext("additional_context", context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message
 * @param message Message to capture
 * @param level Severity level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

/**
 * Add a breadcrumb
 * @param category Category of the breadcrumb
 * @param message Message
 * @param data Additional data
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
}

/**
 * Set custom tag
 * @param key Tag key
 * @param value Tag value
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Set custom context
 * @param name Context name
 * @param context Context data
 */
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

export const sentry = {
  initSentry,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  setTag,
  setContext,
};
