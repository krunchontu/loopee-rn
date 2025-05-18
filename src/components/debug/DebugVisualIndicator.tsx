import React from "react";
import { View, Text, StyleSheet } from "react-native";
// Using _ prefix to avoid lint errors for unused imports
import { colors as _colors, zIndex as _zIndex } from "../../foundations";

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
    backgroundColor: "#ffcccc33", // Using hex with alpha instead of rgba
    borderColor: "#ff0000", // Using hex instead of named color
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
    backgroundColor: "#00000099", // Using hex with alpha instead of rgba
    color: "#ffffff", // Using hex instead of named color
    fontSize: 12,
    marginTop: 8,
    maxWidth: "80%",
    padding: 4,
    textAlign: "center",
  },
  text: {
    backgroundColor: "#ff0000", // Using hex instead of named color
    color: "#ffffff", // Using hex instead of named color
    fontSize: 16,
    fontWeight: "bold",
    padding: 8,
    textAlign: "center",
  },
});
