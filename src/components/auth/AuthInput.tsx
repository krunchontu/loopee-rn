/**
 * @file AuthInput component
 *
 * Enhanced text input component for authentication forms
 * Built on top of React Native Paper's TextInput with validation support
 */

import React, { useState } from "react";
import type { ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import type {
  TextInputProps} from "react-native-paper";
import {
  TextInput,
  HelperText,
  useTheme
} from "react-native-paper";

import { spacing } from "../../foundations";

interface AuthInputProps extends Omit<TextInputProps, "theme" | "error"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
}

/**
 * Enhanced text input component for auth forms
 *
 * Features:
 * - Error messaging with validation
 * - Password visibility toggle
 * - Consistent styling with Paper theme
 * - Accessible labels and proper keyboard types
 *
 * @param label - Input field label
 * @param value - Current input value
 * @param onChangeText - Function to call when text changes
 * @param error - Error message to display (if any)
 * @param containerStyle - Additional styles for container
 * @param secureTextEntry - Whether to hide input text (for passwords)
 * @param showPasswordToggle - Whether to show password visibility toggle
 */
export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  containerStyle,
  secureTextEntry = false,
  showPasswordToggle = false,
  ...props
}) => {
  const theme = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={!!error}
        mode="outlined"
        style={styles.input}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        secureTextEntry={secureTextEntry && !passwordVisible}
        right={
          showPasswordToggle && secureTextEntry ?
            <TextInput.Icon
              icon={passwordVisible ? "eye-off" : "eye"}
              onPress={togglePasswordVisibility}
              forceTextInputFocus={false}
            />
          : null
        }
        {...props}
      />
      {error ?
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  input: {
    width: "100%",
  },
});
