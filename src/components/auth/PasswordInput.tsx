/**
 * @file PasswordInput component
 *
 * Specialized input component for password fields
 * with built-in visibility toggle and validation
 */

import React from "react";
import { ViewStyle } from "react-native";
import { AuthInput } from "./AuthInput";

interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  testID?: string;
}

/**
 * Password input with visibility toggle
 *
 * A specialized version of AuthInput pre-configured for password fields
 * with a visibility toggle button and appropriate security settings.
 *
 * @param label - Input field label
 * @param value - Current password value
 * @param onChangeText - Function to call when password changes
 * @param error - Error message to display (if any)
 * @param containerStyle - Additional styles for container
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  containerStyle,
  autoCapitalize = "none",
  ...props
}) => {
  return (
    <AuthInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      error={error}
      containerStyle={containerStyle}
      secureTextEntry={true}
      showPasswordToggle={true}
      autoCapitalize={autoCapitalize}
      textContentType="password"
      autoComplete="password"
      {...props}
    />
  );
};
