import { useRef, useEffect, useState, useCallback, memo } from "react";
import { StyleSheet, Platform, View, Text, Dimensions } from "react-native";
import MapView, {
  PROVIDER_GOOGLE,
  Region,
  MapPressEvent,
} from "react-native-maps";
import { AnimatedMarker } from "./AnimatedMarker";
import { useToiletStore } from "../../stores/toilets";
import { colors, spacing } from "../../constants/colors";
import { Toilet } from "../../types/toilet";
import { locationService, LocationState } from "../../services/location";
import { Button } from "../shared/Button";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { clusterToilets, getZoomLevel } from "../../utils/clustering";
import { debug } from "../../utils/debug";

interface CustomMapViewProps {
  onMarkerPress?: (toilet: Toilet) => void;
  initialRegion?: Region;
  onMapPress?: (event: MapPressEvent) => void;
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

export const CustomMapView = memo(function CustomMapView({
  onMarkerPress,
  initialRegion = DEFAULT_REGION,
  onMapPress,
  style,
}: CustomMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const { toilets, selectToilet, fetchNearbyToilets } = useToiletStore();
  const [hasLocationPermission, setHasLocationPermission] =
    useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
  const [clusters, setClusters] = useState<ReturnType<typeof clusterToilets>>(
    []
  );

  const handleLocationPermission = useCallback(async () => {
    debug.log("MapView", "Requesting location permissions");
    const granted = await locationService.requestPermissions();
    setHasLocationPermission(granted);
    if (!granted) {
      const errorMsg = "Location permission is required to find nearby toilets";
      debug.error("MapView", errorMsg);
      setLocationError(errorMsg);
    } else {
      debug.log("MapView", "Location permissions granted");
    }
  }, []);

  const handleLocationUpdate = useCallback(
    (location: LocationState) => {
      setUserLocation(location);
      setLocationError(null);

      debug.log("MapView", "Location updated", {
        lat: location.latitude,
        lng: location.longitude,
      });

      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        ...DEFAULT_DELTA,
      };

      // Update map position with smooth animation
      mapRef.current?.animateToRegion(newRegion);

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
      debug.log("MapView", "Marker pressed", toilet.id);
      selectToilet(toilet);
      onMarkerPress?.(toilet);
    },
    [selectToilet, onMarkerPress]
  );

  const handleRegionChange = useCallback(
    (region: Region) => {
      setCurrentRegion(region);
      const zoomLevel = getZoomLevel(region);
      debug.log("MapView", "Region changed", { zoomLevel });

      const newClusters = clusterToilets(toilets, region);
      setClusters(newClusters);
    },
    [toilets]
  );

  useEffect(() => {
    // Initial clustering
    const initialClusters = clusterToilets(toilets, currentRegion);
    setClusters(initialClusters);
  }, [toilets, currentRegion]);

  return (
    <ErrorBoundary>
      <View style={[styles.container, style]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          showsCompass
          onPress={onMapPress}
          onRegionChangeComplete={handleRegionChange}
        >
          {clusters.map((cluster) => {
            if (cluster.points.length === 1) {
              const toilet = cluster.points[0];

              // Skip rendering if toilet or location is invalid
              if (!toilet?.location?.latitude || !toilet?.location?.longitude) {
                debug.warn(
                  "MapView",
                  `Skipping marker for toilet with invalid location: ${toilet?.id}`
                );
                return null;
              }

              return (
                <AnimatedMarker
                  key={toilet.id}
                  coordinate={{
                    latitude: toilet.location.latitude,
                    longitude: toilet.location.longitude,
                  }}
                  onPress={() => handleMarkerPress(toilet)}
                  pinColor={
                    toilet.isAccessible ? colors.secondary : colors.primary
                  }
                />
              );
            }

            // Validate cluster coordinate before rendering
            if (
              !cluster?.coordinate?.latitude ||
              !cluster?.coordinate?.longitude
            ) {
              debug.warn(
                "MapView",
                `Skipping cluster with invalid coordinate: ${cluster?.id}`
              );
              return null;
            }

            return (
              <AnimatedMarker
                key={cluster.id}
                coordinate={cluster.coordinate}
                isCluster
                count={cluster.points.length}
                onPress={() => {
                  // Zoom in when cluster is pressed
                  mapRef.current?.animateToRegion({
                    ...cluster.coordinate,
                    latitudeDelta: currentRegion.latitudeDelta * 0.5,
                    longitudeDelta: currentRegion.longitudeDelta * 0.5,
                  });
                }}
              />
            );
          })}
        </MapView>

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
                  mapRef.current?.animateToRegion({
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
    </ErrorBoundary>
  );
});

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
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
  listContainer: {
    backgroundColor: colors.background.primary,
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  locationButtonContainer: {
    bottom: SCREEN_HEIGHT * 0.45,
    position: "absolute",
    right: spacing.md,
  },
  map: {
    flex: 1,
    width: "100%",
  },
});
