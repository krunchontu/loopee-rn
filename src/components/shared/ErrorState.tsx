import React from "react";
import { StyleSheet, View, Text } from "react-native";

import { Button } from "./Button";
import { colors, spacing } from "../../constants/colors";

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
  button: {
    minWidth: 120,
  },
  container: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    justifyContent: "center",
    padding: spacing.md,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  fullScreen: {
    flex: 1,
    width: "100%",
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
});
