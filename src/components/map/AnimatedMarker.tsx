import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, Text, View } from "react-native"; // Added View
import { Marker } from "react-native-maps";

import { colors, palette } from "../../foundations"; // Changed import path and added palette
import { debug } from "../../utils/debug";

interface AnimatedMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  count?: number;
  isCluster?: boolean;
  onPress?: () => void;
  pinColor?: string;
}

export function AnimatedMarker({
  coordinate,
  count,
  isCluster = false,
  onPress,
  pinColor,
}: AnimatedMarkerProps) {
  const scale = useRef(new Animated.Value(0)).current;

  // Important: Place useEffect at the top, before any conditional returns
  useEffect(() => {
    // Only run the animation if coordinates are valid
    if (
      coordinate &&
      typeof coordinate.latitude === "number" &&
      typeof coordinate.longitude === "number"
    ) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      // Reset animation when component unmounts
      scale.setValue(0);
    };
  }, [coordinate?.latitude, coordinate?.longitude, scale]);

  // Validate coordinate before rendering
  const isValidCoordinate =
    coordinate &&
    typeof coordinate.latitude === "number" &&
    typeof coordinate.longitude === "number";

  // If invalid coordinate, log warning and return null
  if (!isValidCoordinate) {
    debug.warn("AnimatedMarker", "Invalid coordinate detected", { coordinate });
    return null;
  }

  // Debug marker rendering - throttled to reduce console noise (60 second interval)
  const MARKER_LOG_THROTTLE = 60000; // 60 seconds

  if (isCluster) {
    debug.throttledLog(
      "AnimatedMarker",
      `cluster-${coordinate.latitude.toFixed(4)}-${coordinate.longitude.toFixed(4)}`,
      "Rendering cluster",
      {
        coordinate,
        count,
        timestamp: new Date().toISOString(),
      },
      MARKER_LOG_THROTTLE
    );
  } else {
    debug.throttledLog(
      "AnimatedMarker",
      `marker-${coordinate.latitude.toFixed(4)}-${coordinate.longitude.toFixed(4)}`,
      "Rendering toilet marker",
      {
        coordinate,
        pinColor,
        timestamp: new Date().toISOString(),
      },
      MARKER_LOG_THROTTLE
    );
  }

  if (isCluster) {
    return (
      <Marker coordinate={coordinate} onPress={onPress}>
        <Animated.View
          style={[
            styles.cluster,
            {
              transform: [{ scale }],
              // Use a distinct color for clusters, e.g., brand.secondary
              backgroundColor: colors.brand.secondary,
            },
          ]}
        >
          <Text style={styles.clusterText}>{count}</Text>
        </Animated.View>
      </Marker>
    );
  }

  return (
    <Marker coordinate={coordinate} onPress={onPress} anchor={{ x: 0.5, y: 1 }}>
      <Animated.View
        style={[
          styles.markerContainer, // New container for pin shape
          {
            transform: [{ scale }],
          },
        ]}
      >
        <View
          style={[
            styles.markerPin,
            { backgroundColor: pinColor || colors.primary },
          ]}
        >
          <Text style={styles.markerIcon}>📍</Text>
        </View>
        <View
          style={[
            styles.markerPinTail,
            { borderTopColor: pinColor || colors.primary },
          ]}
        />
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  cluster: {
    alignItems: "center",
    borderRadius: 18, // Slightly larger
    elevation: 6, // Slightly more pronounced shadow
    height: 36, // Slightly larger
    justifyContent: "center",
    shadowColor: colors.text.primary,
    shadowOffset: {
      height: 2,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4.65, // Adjusted shadow
    width: 36, // Slightly larger
  },
  clusterText: {
    color: colors.text.inverse, // Ensure good contrast with new background
    fontSize: 14, // Slightly larger text
    fontWeight: "600", // Medium weight
  },
  // styles.marker removed as it's no longer used
  markerContainer: {
    alignItems: "center",
    height: 36, // Height of the touchable area for the pin
    width: 30, // Width of the touchable area for the pin
  },
  markerIcon: {
    color: colors.background.primary,
    fontSize: 12, // Slightly smaller icon for the pin
  },
  markerPin: {
    alignItems: "center",
    borderColor: colors.background.primary,
    borderRadius: 13,
    borderWidth: 1.5,
    elevation: 5, // Keep shadow
    height: 26,
    justifyContent: "center",
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: 26,
  },
  markerPinTail: {
    alignSelf: "center",
    backgroundColor: palette.transparent, // Using palette.transparent
    borderLeftColor: palette.transparent, // Using palette.transparent
    borderLeftWidth: 6,
    borderRightColor: palette.transparent, // Using palette.transparent
    borderRightWidth: 6,
    borderStyle: "solid",
    borderTopWidth: 10, // This creates the tail
    height: 0,
    width: 0,
    // borderTopColor is set dynamically
    // No shadow for the tail, shadow is on markerPin
  },
});
