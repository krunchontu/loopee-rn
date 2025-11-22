import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Debug color constants to avoid ESLint color literal errors
const DEBUG_COLORS = {
  containerBg: "#ffcccc33",
  border: "#ff0000",
  textBg: "#ff0000",
  textColor: "#ffffff",
  subTextBg: "#00000099",
};

/**
 * A visual debug component that shows exactly where the bottom sheet should appear
 * This helps diagnose layout, positioning and z-index issues
 */
export const DebugVisualIndicator = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bottom Sheet Should Appear Here</Text>
      <Text style={styles.subText}>
        If you see this and not the bottom sheet, there&apos;s a visibility
        issue
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: DEBUG_COLORS.containerBg,
    borderColor: DEBUG_COLORS.border,
    borderStyle: "dashed",
    borderWidth: 2,
    bottom: 0,
    height: 300,
    justifyContent: "center",
    left: 0,
    pointerEvents: "none", // Allow touches to pass through
    position: "absolute",
    right: 0,
    zIndex: 9999, // Extremely high z-index to ensure visibility
  },
  subText: {
    backgroundColor: DEBUG_COLORS.subTextBg,
    color: DEBUG_COLORS.textColor,
    fontSize: 12,
    marginTop: 8,
    maxWidth: "80%",
    padding: 4,
    textAlign: "center",
  },
  text: {
    backgroundColor: DEBUG_COLORS.textBg,
    color: DEBUG_COLORS.textColor,
    fontSize: 16,
    fontWeight: "bold",
    padding: 8,
    textAlign: "center",
  },
});
