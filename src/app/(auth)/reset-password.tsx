/**
 * @file Password Reset Screen
 *
 * Handles password reset requests through email
 */

import { Link } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text, Title } from "react-native-paper";

import { AuthErrorBanner } from "../../components/auth/AuthErrorBanner";
import { AuthInput } from "../../components/auth/AuthInput";
import { PaperButton } from "../../components/auth/PaperButton";
import { useAuthErrorHandling } from "../../components/auth/useAuthErrorHandling";
import type { FormErrors } from "../../components/auth/useAuthErrorHandling";
import { spacing, colors } from "../../foundations";
import { useAuth } from "../../providers/AuthProvider";
import { debug } from "../../utils/debug";

/**
 * Password Reset Screen
 *
 * Provides functionality to request password reset emails
 * with validation and success feedback
 */
export default function ResetPasswordScreen() {
  // Form state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  // Auth context
  const auth = useAuth();

  // Auth error handling
  const { errors, setErrors, resetErrors, handleAuthError } =
    useAuthErrorHandling();

  // Clear errors when form inputs change
  useEffect(() => {
    if (email) {
      resetErrors();
    }
  }, [email, resetErrors]);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle password reset request
   */
  const handleResetRequest = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const { error } = await auth.resetPassword(email);

      if (error) {
        const userMessage = handleAuthError(error);
        setErrors({ form: userMessage });
        setLoading(false);
        return;
      }

      // Show success message
      setResetRequested(true);
      setLoading(false);
    } catch (error) {
      setErrors({
        form: "We're having trouble with your request. Please try again later.",
      });
      debug.error("Auth", "Unexpected reset password error", error);
      setLoading(false);
    }
  };

  // Show success state if reset request was sent
  if (resetRequested) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Title style={styles.title}>Check Your Email</Title>
          <Text style={styles.successText}>
            We&apos;ve sent password reset instructions to {email}. Please check
            your inbox and follow the instructions.
          </Text>
          <Link href="/login" style={styles.returnLink}>
            Return to login
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Title style={styles.title}>Reset Your Password</Title>
          <Text style={styles.subtitle}>
            Enter your email address and we&apos;ll send you instructions to
            reset your password.
          </Text>

          {errors.form && (
            <AuthErrorBanner
              message={errors.form}
              onDismiss={() => resetErrors()}
            />
          )}

          <AuthInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="reset-email-input"
          />

          <PaperButton
            title="Send Reset Instructions"
            onPress={handleResetRequest}
            loading={loading}
            disabled={loading}
            testID="reset-button"
          />

          <View style={styles.linksContainer}>
            <Link href="/login" style={styles.returnLink}>
              Back to Login
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  formContainer: {
    alignSelf: "center",
    maxWidth: 400,
    padding: spacing.lg,
    width: "100%",
  },
  linksContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  returnLink: {
    color: colors.interactive.primary.default,
    marginTop: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  successContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  successText: {
    color: colors.text.primary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
});
