import { useRef, useEffect, useState, useCallback } from "react";
import { StyleSheet, Platform, View, Text } from "react-native";
import type { Region} from "react-native-maps";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import ClusteredMapView from "react-native-maps-super-cluster";

import { colors, spacing } from "../../constants/colors";
import type { LocationState } from "../../services/location";
import { locationService } from "../../services/location";
import { useToiletStore } from "../../stores/toilets";
import type { Toilet } from "../../types/toilet";
import { Button } from "../shared/Button";

interface CustomClusteredMapProps {
  onMarkerPress?: (toilet: Toilet) => void;
  initialRegion?: Region;
  style?: any;
}

const DEFAULT_REGION = {
  latitude: 1.3521, // Singapore
  longitude: 103.8198,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const CLUSTER_MAX_CHILDREN = 100;
const CLUSTER_RADIUS = 50;
const CLUSTER_EDGE_PADDING = {
  top: 50,
  right: 50,
  bottom: 50,
  left: 50,
};

export function CustomClusteredMapView({
  onMarkerPress,
  initialRegion = DEFAULT_REGION,
  style,
}: CustomClusteredMapProps) {
  const mapRef = useRef<ClusteredMapView>(null);
  const { toilets, selectToilet, fetchNearbyToilets } = useToiletStore();
  const [hasLocationPermission, setHasLocationPermission] =
    useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);

  const handleLocationPermission = useCallback(async () => {
    const granted = await locationService.requestPermissions();
    setHasLocationPermission(granted);
    if (!granted) {
      setLocationError(
        "Location permission is required to find nearby toilets"
      );
    }
  }, []);

  const handleLocationUpdate = useCallback(
    (location: LocationState) => {
      setUserLocation(location);
      setLocationError(null);

      // Update map position with smooth animation
      mapRef.current?.getMapRef().animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        ...DEFAULT_DELTA,
      });

      // Fetch nearby toilets
      fetchNearbyToilets(location.latitude, location.longitude);
    },
    [fetchNearbyToilets]
  );

  useEffect(() => {
    handleLocationPermission();
  }, [handleLocationPermission]);

  useEffect(() => {
    if (!hasLocationPermission) return;

    locationService.startLocationUpdates(handleLocationUpdate, (error) =>
      setLocationError(error.message)
    );

    return () => {
      locationService.stopLocationUpdates();
    };
  }, [hasLocationPermission, handleLocationUpdate]);

  const handleMarkerPress = useCallback(
    (toilet: Toilet) => {
      selectToilet(toilet);
      onMarkerPress?.(toilet);
    },
    [selectToilet, onMarkerPress]
  );

  const renderMarker = useCallback(
    (toilet: Toilet) => (
      <Marker
        key={toilet.id}
        coordinate={{
          latitude: toilet.location.latitude,
          longitude: toilet.location.longitude,
        }}
        onPress={() => handleMarkerPress(toilet)}
        pinColor={toilet.isAccessible ? colors.secondary : colors.primary}
      />
    ),
    [handleMarkerPress]
  );

  const renderCluster = useCallback((cluster: any) => {
    const { pointCount, coordinate } = cluster;
    return (
      <Marker coordinate={coordinate}>
        <View style={styles.cluster}>
          <Text style={styles.clusterText}>{pointCount}</Text>
        </View>
      </Marker>
    );
  }, []);

  return (
    <View style={[styles.container, style]}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        data={toilets}
        initialRegion={initialRegion}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass
        maxZoom={20}
        minZoom={10}
        clusteringEnabled={true}
        spiralEnabled={true}
        preserveClusterPressBehavior={true}
        extent={512}
        nodeSize={64}
        radius={CLUSTER_RADIUS}
        maxZoomLevel={17}
        edgePadding={CLUSTER_EDGE_PADDING}
        animationEnabled={true}
        renderMarker={renderMarker}
        renderCluster={renderCluster}
      />

      {locationError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Button
            title="Grant Permission"
            onPress={handleLocationPermission}
            size="small"
            variant="outline"
          />
        </View>
      )}

      {hasLocationPermission && (
        <View style={styles.locationButtonContainer}>
          <Button
            title="My Location"
            onPress={() => {
              if (userLocation) {
                mapRef.current?.getMapRef().animateToRegion({
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  ...DEFAULT_DELTA,
                });
              }
            }}
            size="small"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 15,
    elevation: 5,
    height: 30,
    justifyContent: "center",
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: 30,
  },
  clusterText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    width: "100%",
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    elevation: 3,
    left: spacing.md,
    padding: spacing.sm,
    position: "absolute",
    right: spacing.md,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    top: spacing.md,
  },
  errorText: {
    color: colors.status.error,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  locationButtonContainer: {
    bottom: spacing.xl,
    position: "absolute",
    right: spacing.md,
  },
  map: {
    flex: 1,
    width: "100%",
  },
});
