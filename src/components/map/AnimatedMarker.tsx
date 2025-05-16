import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import { Marker } from "react-native-maps";
import { colors } from "../../constants/colors";

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

  // Validate coordinate before using
  const isValidCoordinate =
    coordinate &&
    typeof coordinate.latitude === "number" &&
    typeof coordinate.longitude === "number";

  // If invalid coordinate, return null instead of crashing
  if (!isValidCoordinate) {
    return null;
  }

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();

    return () => {
      // Reset animation when component unmounts
      scale.setValue(0);
    };
  }, [coordinate.latitude, coordinate.longitude]);

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
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clusterText: {
    color: colors.background.primary,
    fontWeight: "bold",
    fontSize: 12,
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.background.primary,
  },
});
