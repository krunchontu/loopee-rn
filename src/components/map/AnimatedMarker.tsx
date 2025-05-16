import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Marker } from "react-native-maps";
import { colors } from "../../constants/colors";
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

  // Debug marker rendering
  if (isCluster) {
    debug.log("AnimatedMarker", "Rendering cluster", {
      coordinate,
      count,
      timestamp: new Date().toISOString(),
    });
  } else {
    debug.log("AnimatedMarker", "Rendering toilet marker", {
      coordinate,
      pinColor,
      timestamp: new Date().toISOString(),
    });
  }

  if (isCluster) {
    return (
      <Marker coordinate={coordinate} onPress={onPress}>
        <Animated.View
          style={[
            styles.cluster,
            {
              transform: [{ scale }],
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.clusterText}>{count}</Text>
        </Animated.View>
      </Marker>
    );
  }

  return (
    <Marker coordinate={coordinate} onPress={onPress} pinColor={pinColor}>
      <Animated.View
        style={[
          styles.marker,
          {
            transform: [{ scale }],
          },
        ]}
      />
    </Marker>
  );
}

const styles = StyleSheet.create({
  cluster: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    shadowColor: colors.text.primary,
    shadowOffset: {
      height: 2,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 30,
  },
  clusterText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  marker: {
    backgroundColor: colors.primary,
    borderColor: colors.background.primary,
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
});
