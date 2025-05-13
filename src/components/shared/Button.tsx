import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors, spacing } from "../../constants/colors";

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  title,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return colors.border.light;
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.secondary;
      case "outline":
        return "transparent";
      default:
        return colors.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border.light;
    switch (variant) {
      case "outline":
        return colors.primary;
      default:
        return "transparent";
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.text.light;
    switch (variant) {
      case "primary":
      case "secondary":
        return colors.background.primary;
      case "outline":
        return colors.primary;
      default:
        return colors.background.primary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case "small":
        return spacing.sm;
      case "large":
        return spacing.lg;
      default:
        return spacing.md;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "large":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" ? 1 : 0,
          borderRadius: 8,
          padding: getPadding(),
          opacity: pressed ? 0.8 : 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
        },
        style,
      ]}
    >
      {loading ?
        <ActivityIndicator
          color={
            variant === "outline" ? colors.primary : colors.background.primary
          }
          size={size === "small" ? "small" : "small"}
        />
      : <Text
          style={[
            {
              color: getTextColor(),
              fontSize: getFontSize(),
              fontWeight: "600",
              textAlign: "center",
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      }
    </Pressable>
  );
}
