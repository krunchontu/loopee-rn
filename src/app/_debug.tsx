import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import { debug } from "../utils/debug";

/**
 * Debug screen for Expo Router
 * This component helps diagnose routing issues by displaying current route information
 */
export default function RouterDebug() {
  const pathname = usePathname();

  // Log route information for debugging
  debug.log("RouterDebug", `Current path: ${pathname}`);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Expo Router Debug</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Current Path:</Text>
        <Text style={styles.value}>{pathname}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>App Structure:</Text>
        <Text style={styles.value}>
          /src/app/
          {"\n"} ├── _layout.tsx
          {"\n"} ├── index.tsx
          {"\n"} ├── _debug.tsx
          {"\n"} ├── (guest)/
          {"\n"} │ ├── map.tsx
          {"\n"} │ └── details.tsx
          {"\n"} └── (auth)/
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Route Resolution:</Text>
        <Text style={styles.codeBlock}>
          {`
1. Entry point: App.js
2. ExpoRoot with context
3. Route resolution
4. Layout component (_layout.tsx)
5. Page component (index.tsx, etc.)
          `}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Troubleshooting Tips:</Text>
        <Text style={styles.value}>
          • Ensure App.js provides proper context{"\n"}• Check for proper
          expo-router/babel plugin{"\n"}• Verify file naming conventions{"\n"}•
          Check folder structure matches routing convention{"\n"}• Restart
          bundler with --clear flag
        </Text>
      </View>
    </ScrollView>
  );
}

// Import color constants
import { colors } from "../constants/colors";

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 16,
    padding: 16,
    shadowColor: colors.text.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  codeBlock: {
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    color: colors.text.primary,
    fontFamily: "monospace",
    fontSize: 12,
    padding: 8,
  },
  container: {
    backgroundColor: colors.background.secondary,
    flex: 1,
    padding: 16,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  value: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
});
