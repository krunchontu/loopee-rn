/**
 * @file PaperButton component
 *
 * Enhanced button component for authentication forms
 * using React Native Paper with consistent styling
 */

import React from "react";
import { Button, useTheme } from "react-native-paper";
import { StyleSheet, View, ViewStyle } from "react-native";
import { spacing } from "../../foundations";

interface PaperButtonProps {
  title: string;
  onPress: () => void;
  mode?: "text" | "outlined" | "contained" | "elevated" | "contained-tonal";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  labelStyle?: any;
  testID?: string;
  color?: string;
}

/**
 * Enhanced button component using Paper design
 *
 * Features:
 * - Consistent styling with the app's design system
 * - Support for different button modes (contained, outlined, text)
 * - Loading state visualization
 * - Icon support
 *
 * @param title - Button text
 * @param onPress - Function to call when button is pressed
 * @param mode - Visual style of the button (contained, outlined, text)
 * @param loading - Whether to show loading spinner
 * @param disabled - Whether the button is disabled
 * @param icon - Optional icon name to display
 * @param style - Additional styles for button container
 * @param contentStyle - Additional styles for button content
 * @param labelStyle - Additional styles for button label
 * @param testID - Test identifier for testing
 * @param color - Override button color
 */
export const PaperButton: React.FC<PaperButtonProps> = ({
  title,
  onPress,
  mode = "contained",
  loading = false,
  disabled = false,
  icon,
  style,
  contentStyle,
  labelStyle,
  testID,
  color,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Button
        mode={mode}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
        icon={icon}
        style={[styles.button, style]}
        contentStyle={[styles.content, contentStyle]}
        labelStyle={labelStyle}
        testID={testID}
        buttonColor={
          color || (mode === "contained" ? theme.colors.primary : undefined)
        }
        textColor={
          mode === "contained" ? theme.colors.onPrimary
          : mode === "outlined" ?
            theme.colors.primary
          : theme.colors.primary
        }
      >
        {title}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 4,
  },
  container: {
    marginVertical: spacing.sm,
  },
  content: {
    paddingVertical: 8,
  },
});
