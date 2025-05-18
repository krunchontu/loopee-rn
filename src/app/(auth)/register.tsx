/**
 * @file Registration Screen
 *
 * Handles new user registration with email/password
 * and form validation
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
import { Link, useRouter } from "expo-router";
import { AuthInput } from "../../components/auth/AuthInput";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { PaperButton } from "../../components/auth/PaperButton";
import { useAuth } from "../../providers/AuthProvider";
import { spacing, colors } from "../../foundations";
import { AuthErrorBanner } from "../../components/auth/AuthErrorBanner";
import { useAuthErrorHandling } from "../../components/auth/useAuthErrorHandling";
import { debug } from "../../utils/debug";
import { FormErrors } from "../../components/auth/useAuthErrorHandling";

// Using the FormErrors interface from useAuthErrorHandling
// which now includes all fields needed for registration

/**
 * Registration Screen component
 *
 * Provides new user registration functionality:
 * - Form validation with immediate feedback
 * - Password strength requirements
 * - Error handling
 * - Loading states
 */
export default function RegisterScreen() {
  const router = useRouter();
  const auth = useAuth();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Auth error handling
  const { errors, setErrors, resetErrors, handleAuthError } =
    useAuthErrorHandling();

  // Clear errors when form inputs change
  useEffect(() => {
    if (email || password || fullName || confirmPassword) {
      resetErrors();
    }
  }, [email, password, fullName, confirmPassword, resetErrors]);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full name validation (optional)
    if (fullName && fullName.length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

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

    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle registration submission
   */
  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Prepare user metadata (optional)
      const metadata = fullName ? { full_name: fullName } : undefined;

      // Register user
      const { error } = await auth.signUp(email, password, metadata);

      if (error) {
        // Use our error handler to get user-friendly messages
        if (error.message?.includes("taken")) {
          setErrors({ email: "This email is already registered" });
        } else {
          const userMessage = handleAuthError(error);
          setErrors({ form: userMessage });
        }
        setLoading(false);
        return;
      }

      // Registration successful - show success state
      setRegistrationComplete(true);
      setLoading(false);
    } catch (error) {
      setErrors({
        form: "We're having trouble creating your account. Please try again later.",
      });
      debug.error("Auth", "Unexpected registration error", error);
      setLoading(false);
    }
  };

  // If registration is complete, show success message
  if (registrationComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Title style={styles.title}>Registration Successful!</Title>
          <Text style={styles.successText}>
            Your account has been created. Please check your email to verify
            your account.
          </Text>
          <PaperButton
            title="Go to Login"
            onPress={() => router.push("/login")}
            testID="goto-login-button"
          />
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
          <Title style={styles.title}>Create Account</Title>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {errors.form && (
            <AuthErrorBanner
              message={errors.form}
              onDismiss={() => resetErrors()}
            />
          )}

          <AuthInput
            label="Full Name (Optional)"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            autoComplete="name"
            textContentType="name"
            testID="register-name-input"
          />

          <AuthInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="register-email-input"
          />

          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            testID="register-password-input"
          />

          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            testID="register-confirm-password-input"
          />

          <PaperButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            testID="register-button"
          />

          <View style={styles.loginContainer}>
            <Text>Already have an account? </Text>
            <Link href="/login" style={styles.linkText}>
              Log in
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
  linkText: {
    color: colors.interactive.primary.default,
  },
  loginContainer: {
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
