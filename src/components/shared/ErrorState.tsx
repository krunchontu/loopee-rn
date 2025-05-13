import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { colors, spacing } from "../../constants/colors";
import { Button } from "./Button";

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  message?: string;
  fullScreen?: boolean;
}

export function ErrorState({
  error,
  onRetry,
  message = "Something went wrong",
  fullScreen = false,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <View style={styles.content}>
        <Text style={styles.title}>{message}</Text>
        <Text style={styles.description}>{errorMessage}</Text>
        {onRetry && (
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="outline"
            size="small"
            style={styles.button}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreen: {
    flex: 1,
    width: "100%",
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  button: {
    minWidth: 120,
  },
});
