/**
 * @file Sentry Error Tracking Service
 *
 * Configures Sentry for error tracking and monitoring.
 * All public functions are safe to call even when Sentry is not initialized
 * (missing DSN, development mode) — they degrade to no-ops.
 */

import * as Sentry from "@sentry/react-native";

import { debug } from "../utils/debug";

// Sentry configuration
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = __DEV__ ? "development" : "production";

// Track whether Sentry was successfully initialized so wrapper functions
// can skip Sentry SDK calls entirely when there's no DSN.
let initialized = false;

/**
 * Initialize Sentry
 * Should be called at app startup
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    // In production builds, missing DSN means zero observability.
    // Use console.error (not warn) so it's visible in device logs and
    // any log-aggregation pipeline that filters by severity.
    if (!__DEV__) {
      console.error(
        "[Sentry] EXPO_PUBLIC_SENTRY_DSN is not set — production errors will NOT be tracked. " +
          "Set this variable in your .env file before releasing.",
      );
    } else {
      debug.log(
        "Sentry",
        "DSN not set — error tracking disabled in development",
      );
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    enabled: !__DEV__,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    attachStacktrace: true,
    dist: "1",
    beforeSend(event, _hint) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            if (breadcrumb.data.email) {
              breadcrumb.data.email = "[REDACTED]";
            }
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

  initialized = true;
  debug.log("Sentry", `Initialized for ${ENVIRONMENT} environment`);
}

/**
 * Set user context for Sentry
 * @param userId User ID
 * @param email User email (will be partially redacted)
 */
export function setUserContext(userId: string, email?: string) {
  if (!initialized) return;
  Sentry.setUser({
    id: userId,
    email: email ? `${email.slice(0, 2)}***@${email.split("@")[1]}` : undefined,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (!initialized) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception with scoped context.
 * Uses Sentry.withScope so that context is attached only to this event,
 * not leaked to subsequent events (fixes global setContext bug).
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional_context", context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
) {
  if (!initialized) return;
  Sentry.captureMessage(message, level);
}

/**
 * Add a breadcrumb
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
) {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
}

/**
 * Set custom tag
 */
export function setTag(key: string, value: string) {
  if (!initialized) return;
  Sentry.setTag(key, value);
}

/**
 * Set custom context
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!initialized) return;
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
