/**
 * @file Auth Error Handling Hook
 *
 * Provides consistent error handling and categorization for authentication-related errors
 */

import { useState, useCallback } from "react";
import { debug } from "../../utils/debug";

type ErrorType = "user" | "technical";

export interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
  fullName?: string;
  confirmPassword?: string;
}

interface AuthError {
  message?: string;
  code?: string;
  [key: string]: any;
}

/**
 * Custom hook for handling authentication errors
 *
 * Categorizes errors as either user-facing (should be displayed to users)
 * or technical (should be logged but not shown in detail to users)
 */
export const useAuthErrorHandling = () => {
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Categorizes an authentication error
   */
  const categorizeError = useCallback((error: AuthError): ErrorType => {
    // User-actionable errors
    const userErrorPatterns = [
      "credentials",
      "email",
      "password",
      "invalid login",
      "not found",
      "already exists",
      "required",
      "too short",
      "too long",
      "verification",
      "confirm",
      "match",
    ];

    // Check if error message contains any user-actionable patterns
    if (
      error?.message &&
      userErrorPatterns.some((pattern) =>
        error.message?.toLowerCase().includes(pattern.toLowerCase())
      )
    ) {
      return "user";
    }

    // Technical errors
    return "technical";
  }, []);

  /**
   * Handle authentication errors
   * @param error The error object from an auth operation
   * @param defaultMessage Default user-friendly message for technical errors
   * @returns The user-friendly error message
   */
  const handleAuthError = useCallback(
    (
      error: AuthError,
      defaultMessage = "Unable to complete request. Please try again later."
    ): string => {
      // Log all errors
      debug.error("Auth", "Auth error occurred", error);

      const errorType = categorizeError(error);

      if (errorType === "user") {
        // Transform user errors to more friendly messages
        if (
          error.message?.includes("credentials") ||
          error.message?.includes("Invalid login")
        ) {
          return "Incorrect email or password. Please try again.";
        } else if (
          error.message?.includes("password") &&
          error.message?.includes("too short")
        ) {
          return "Password must be at least 6 characters long.";
        } else if (error.message?.includes("already exists")) {
          return "An account with this email already exists.";
        } else if (error.message?.includes("not found")) {
          return "Account not found. Please check your email or create a new account.";
        }

        // For other user errors, use the original message but clean it up
        return error.message || defaultMessage;
      } else {
        // For technical errors, use a generic message and log the details
        debug.error("Auth", "Technical error occurred", error);
        return defaultMessage;
      }
    },
    [categorizeError]
  );

  /**
   * Reset all form errors
   */
  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Set a form error
   */
  const setFormError = useCallback(
    (field: keyof FormErrors, message: string) => {
      setErrors((prev) => ({ ...prev, [field]: message }));
    },
    []
  );

  return {
    errors,
    setErrors,
    resetErrors,
    setFormError,
    handleAuthError,
    categorizeError,
  };
};
