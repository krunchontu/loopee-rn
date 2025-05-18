/**
 * @file Login Screen
 *
 * Provides user authentication through email/password
 * with form validation and error handling
 */

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text, Title } from "react-native-paper";
import { Link } from "expo-router";
import { AuthInput } from "../../components/auth/AuthInput";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { PaperButton } from "../../components/auth/PaperButton";
import { useAuth } from "../../providers/AuthProvider";
import { spacing, colors } from "../../foundations";
import { AuthErrorBanner } from "../../components/auth/AuthErrorBanner";
import { useAuthErrorHandling } from "../../components/auth/useAuthErrorHandling";
import { debug } from "../../utils/debug";

// Import FormErrors type from the hook
import type { FormErrors } from "../../components/auth/useAuthErrorHandling";

// This interface is now imported from useAuthErrorHandling

/**
 * Login Screen component
 *
 * Provides user login functionality with email/password
 * including:
 * - Form validation
 * - Error handling
 * - Loading states
 * - Navigation to register page
 */
export default function LoginScreen() {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Auth context and error handling
  const auth = useAuth();
  const { errors, setErrors, resetErrors, handleAuthError } =
    useAuthErrorHandling();

  // Clear errors when form inputs change
  useEffect(() => {
    if (email || password) {
      resetErrors();
    }
  }, [email, password, resetErrors]);

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

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle login form submission
   */
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const { error } = await auth.signIn(email, password);

      if (error) {
        // Use our error handler to get a user-friendly message
        const userMessage = handleAuthError(error);
        setErrors({ form: userMessage });
        setLoading(false);
        return;
      }

      // On successful login, the AuthProvider will update the auth state
      // and redirect will happen automatically through navigation guards
    } catch (error) {
      // Handle unexpected errors
      setErrors({
        form: "We're having trouble signing you in. Please try again later.",
      });
      // Log the technical error for debugging
      debug.error("Auth", "Unexpected login error", error);
      setLoading(false);
    }
  };

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
          <Title style={styles.title}>Welcome Back</Title>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {errors.form && (
            <AuthErrorBanner
              message={errors.form}
              onDismiss={() => resetErrors()}
            />
          )}

          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="login-email-input"
          />

          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            testID="login-password-input"
          />

          <PaperButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            testID="login-button"
          />

          <View style={styles.linksContainer}>
            <Link href="/reset-password" style={styles.linkText}>
              Forgot Password?
            </Link>

            <View style={styles.registerContainer}>
              <Text>Don&apos;t have an account? </Text>
              <Link href="/register" style={styles.linkText}>
                Create one
              </Link>
            </View>
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
  linkText: {
    color: colors.interactive.primary.default,
  },
  linksContainer: {
    marginTop: spacing.md,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
});
