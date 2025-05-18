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
import { authDebug } from "../../utils/AuthDebugger";
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

    // Log validation results for debugging
    if (Object.keys(newErrors).length > 0) {
      authDebug.log("SIGNUP", "validation_error", {
        errorFields: Object.keys(newErrors),
        validName: !newErrors.fullName,
        validEmail: !newErrors.email,
        validPassword: !newErrors.password,
        passwordsMatch: !newErrors.confirmPassword,
        source: "ui_validation",
      });
    } else {
      authDebug.log("SIGNUP", "info", {
        action: "form_validation",
        result: "success",
        hasName: !!fullName,
        hasEmail: !!email,
        passwordLength: password?.length,
        passwordsMatch: password === confirmPassword,
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle registration submission
   */
  const handleRegister = async () => {
    // Start performance tracking for registration form
    const endTracking = authDebug.trackPerformance("register_form_submission");

    // Log submission attempt with detailed info for debugging
    authDebug.log("SIGNUP", "attempt", {
      validationPassed: validateForm(),
      email,
      hasName: !!fullName,
      hasPassword: !!password,
      passwordLength: password?.length,
      passwordsMatch: password === confirmPassword,
      deviceInfo: {
        platform: Platform.OS,
        isWeb: Platform.OS === "web",
      },
    });

    if (!validateForm()) {
      authDebug.log("SIGNUP", "failure", {
        reason: "validation_failed",
        validationErrors: Object.keys(errors),
      });

      endTracking(); // End tracking if validation fails
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare user metadata (optional)
      const metadata = fullName ? { full_name: fullName } : undefined;

      authDebug.log("SIGNUP", "info", {
        action: "submitting_to_auth_provider",
        email,
        hasMetadata: !!metadata,
      });

      // Register user
      const { error } = await auth.signUp(email, password, metadata);

      if (error) {
        // Use our error handler to get user-friendly messages
        let userMessage;

        if (error.message?.includes("taken")) {
          userMessage = "This email is already registered";
          setErrors({ email: userMessage });
        } else {
          userMessage = handleAuthError(error);
          setErrors({ form: userMessage });
        }

        // Log detailed error for debugging
        authDebug.log("SIGNUP", "failure", {
          originalError: error.message,
          errorCode: error.code,
          userFacingMessage: userMessage,
          email,
        });

        setLoading(false);
        return;
      }

      // Log successful registration from UI
      authDebug.log("SIGNUP", "success", {
        email,
        hasMetadata: !!metadata,
        timestamp: new Date().toISOString(),
        willShowSuccessState: true,
      });

      // Registration successful - show success state
      setRegistrationComplete(true);
      setLoading(false);

      // Enable this log to be the last thing we see before transitioning views
      debug.log("UI", "Transitioning to registration success view");
    } catch (error) {
      // Log unexpected errors with detailed info
      authDebug.log("SIGNUP", "failure", {
        errorType: "unexpected_exception",
        error: error as Error,
        email,
        timestamp: new Date().toISOString(),
      });

      setErrors({
        form: "We're having trouble creating your account. Please try again later.",
      });
      debug.error("Auth", "Unexpected registration error", error);
      setLoading(false);
    } finally {
      // End performance tracking
      endTracking();
    }
  };

  // useEffect to handle state changes
  useEffect(() => {
    if (registrationComplete) {
      // Log transition to success view
      authDebug.log("SIGNUP", "info", {
        action: "showing_success_view",
        timestamp: new Date().toISOString(),
      });
    }
  }, [registrationComplete]);

  // If registration is complete, show success message
  if (registrationComplete) {
    return (
      <View style={styles.container} testID="registration-success-view">
        <View style={styles.successContainer}>
          <Title style={styles.title}>Registration Successful!</Title>
          <Text style={styles.successText}>
            Your account has been created. Please check your email to verify
            your account.
          </Text>
          <PaperButton
            title="Go to Login"
            onPress={() => {
              authDebug.log("SIGNUP", "info", {
                action: "navigating_to_login",
                fromSuccessScreen: true,
              });
              router.push("/login");
            }}
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
            onChangeText={(text) => {
              setFullName(text);
              // Log input changes for debugging
              if (text && fullName !== text) {
                authDebug.log("SIGNUP", "info", {
                  action: "name_input_changed",
                  isValid: text.length >= 2 || text.length === 0,
                  length: text.length,
                });
              }
            }}
            error={errors.fullName}
            autoComplete="name"
            textContentType="name"
            testID="register-name-input"
          />

          <AuthInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              // Log input changes for debugging
              if (text && email !== text) {
                authDebug.log("SIGNUP", "info", {
                  action: "email_input_changed",
                  isValid: /\S+@\S+\.\S+/.test(text),
                });
              }
            }}
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
            onChangeText={(text) => {
              setPassword(text);
              // Log password strength for debugging (without revealing the password)
              if (text && password !== text) {
                authDebug.log("SIGNUP", "info", {
                  action: "password_input_changed",
                  length: text.length,
                  hasMinLength: text.length >= 6,
                  strength:
                    text.length < 8 ? "weak"
                    : text.length < 12 ? "medium"
                    : "strong",
                });
              }
            }}
            error={errors.password}
            testID="register-password-input"
          />

          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              // Log password matching for debugging (without revealing the passwords)
              if (text && confirmPassword !== text) {
                authDebug.log("SIGNUP", "info", {
                  action: "confirm_password_changed",
                  length: text.length,
                  matches: text === password,
                });
              }
            }}
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
