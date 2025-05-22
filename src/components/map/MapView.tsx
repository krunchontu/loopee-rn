import { useRef, useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  StyleSheet,
  Platform,
  View,
  Text,
  Dimensions,
  StatusBar,
  Pressable,
} from "react-native";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../../foundations/responsive";
import MapView, {
  PROVIDER_GOOGLE,
  Region,
  MapPressEvent,
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedMarker } from "./AnimatedMarker";
import { useToiletStore } from "../../stores/toilets";
import { colors, spacing, zIndex, createShadow } from "../../foundations"; // Added createShadow
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
  const insets = useSafeAreaInsets();
  const { toilets, selectToilet, fetchNearbyToilets, loading } =
    useToiletStore();
  const [hasLocationPermission, setHasLocationPermission] =
    useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
  const [clusters, setClusters] = useState<ReturnType<typeof clusterToilets>>(
    []
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Simple desaturated map style
  const customMapStyle = [
    {
      featureType: "all",
      elementType: "all",
      stylers: [{ saturation: -70 }], // Desaturate all features
    },
    {
      // Keep water somewhat blue for context
      featureType: "water",
      elementType: "geometry",
      stylers: [{ saturation: -30 }, { lightness: -5 }],
    },
    {
      // Ensure road labels are visible
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ saturation: 0 }, { lightness: -20 }, { gamma: 0.8 }],
    },
    {
      // Ensure POI labels are visible
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ saturation: 0 }, { lightness: -30 }, { gamma: 0.7 }],
    },
  ];

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

      // Throttled location logging to reduce console noise (30 second interval)
      const LOCATION_LOG_THROTTLE = 30000; // 30 seconds
      debug.throttledLog(
        "MapView",
        "location-update",
        "Location updated",
        {
          lat: location.latitude,
          lng: location.longitude,
        },
        LOCATION_LOG_THROTTLE
      );

      // Update user position on significant changes
      // Map animation only happens on first location or when user presses the location button
      // This prevents constant map movement during regular location updates
      if (!userLocation) {
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          ...DEFAULT_DELTA,
        };

        // Update map position with smooth animation only on first location
        mapRef.current?.animateToRegion(newRegion);
      }

      // Location updates are now throttled in the location service (60s interval, 100m distance)
      // and the toilet store has caching to prevent unnecessary fetches
      setIsRefreshing(true);
      fetchNearbyToilets(location.latitude, location.longitude).finally(() => {
        // Clear refreshing state when done, whether successful or not
        setIsRefreshing(false);
      });
    },
    [fetchNearbyToilets, userLocation]
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

      // Ensure the toilet data is complete before selection
      if (toilet && toilet.id) {
        selectToilet(toilet);

        // Explicitly invoke any additional marker press handler
        onMarkerPress?.(toilet);

        // Log selection for debugging
        debug.log("MapView", "Toilet selected successfully", {
          toiletId: toilet.id,
          name: toilet.name,
        });
      } else {
        debug.error("MapView", "Invalid toilet data on marker press", toilet);
      }
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

    // Debug clustering results
    debug.log(
      "MapView",
      `Clustering resulted in ${initialClusters.length} clusters:`,
      {
        totalToilets: toilets.length,
        numClusters: initialClusters.length,
        zoomLevel: getZoomLevel(currentRegion),
        singleMarkers: initialClusters.filter((c) => c.points.length === 1)
          .length,
        multiMarkers: initialClusters.filter((c) => c.points.length > 1).length,
        region: currentRegion,
      }
    );

    setClusters(initialClusters);
  }, [toilets, currentRegion]);

  // Calculate safe area padding for content
  const safeAreaPadding = useMemo(() => {
    const androidInsets =
      Platform.OS === "android" ?
        getAndroidInsets()
      : { statusBarHeight: 0, navBarHeight: 0 };

    return {
      paddingTop:
        Platform.OS === "android" ? androidInsets.statusBarHeight : insets.top,
      paddingBottom:
        Platform.OS === "android" ? androidInsets.navBarHeight : insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    };
  }, [insets]);

  return (
    <ErrorBoundary>
      <View style={[styles.safeAreaContainer, safeAreaPadding, style]}>
        <View style={styles.container}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
            showsCompass
            customMapStyle={customMapStyle} // Apply custom style
            onPress={onMapPress}
            onRegionChangeComplete={handleRegionChange}
          >
            {clusters.map((cluster) => {
              if (cluster.points.length === 1) {
                const toilet = cluster.points[0];

                // Log skipped markers but attempt to render all toilets for diagnosis
                if (
                  !toilet?.location?.latitude ||
                  !toilet?.location?.longitude
                ) {
                  debug.warn(
                    "MapView",
                    `TOILET DIAGNOSIS: Would normally skip marker for toilet with invalid location: ${toilet?.id}`,
                    {
                      toiletId: toilet?.id,
                      hasLocation: !!toilet?.location,
                      latitude: toilet?.location?.latitude,
                      longitude: toilet?.location?.longitude,
                    }
                  );
                  // Continue rendering to see if any coordinates are actually being set
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
            <View style={styles.permissionErrorContainer}>
              <Text style={styles.errorText}>{locationError}</Text>
              <Button
                title="Grant Location Permission"
                onPress={handleLocationPermission}
                size="medium" // Slightly larger for better tap target
                variant="primary" // More prominent
                style={styles.permissionButton}
              />
            </View>
          )}

          {hasLocationPermission &&
            !locationError && ( // Only show if permission granted AND no other location error
              <>
                <Pressable
                  style={styles.locationFab}
                  onPress={() => {
                    if (userLocation) {
                      mapRef.current?.animateToRegion({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        ...DEFAULT_DELTA,
                      });
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Center on my location"
                >
                  <Text style={styles.locationFabIcon}>🎯</Text>
                </Pressable>

                {/* Data refresh indicator */}
                {(loading || isRefreshing) && (
                  <View style={styles.refreshIndicator}>
                    <Text style={styles.refreshText}>
                      {loading ? "Loading toilets..." : "Updating location..."}
                    </Text>
                  </View>
                )}
              </>
            )}
        </View>
      </View>
    </ErrorBoundary>
  );
});

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Get Android specific UI insets
 *
 * @returns Object with Android status bar and navigation bar heights
 */
function getAndroidInsets() {
  const statusBarHeight = StatusBar.currentHeight || 0;

  // Estimate navigation bar height based on device aspect ratio
  // This is a rough approximation since there's no direct API to get nav bar height
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  const isLongDevice = aspectRatio > 2.0; // Phones with tall displays likely have gesture nav

  // Navigation bar is typically 48dp for button navigation, less or none for gesture navigation
  const navBarHeight = isLongDevice ? 0 : 48;

  return {
    statusBarHeight,
    navBarHeight,
  };
}

import type { ViewStyle, TextStyle } from "react-native";

type StyleProps = {
  container: ViewStyle;
  errorText: TextStyle;
  listContainer: ViewStyle;
  locationFab: ViewStyle & {
    bottom: number;
    height: number;
    right: number;
    width: number;
  };
  locationFabIcon: TextStyle;
  map: ViewStyle;
  permissionButton: ViewStyle;
  permissionErrorContainer: ViewStyle;
  refreshIndicator: ViewStyle;
  refreshText: TextStyle;
  safeAreaContainer: ViewStyle;
};

// Use safe area utilities for better positioning
const styles = StyleSheet.create<StyleProps>({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
    // Lower z-index to ensure map is below other elements
    width: "100%",
    zIndex: zIndex.map,
  },
  errorText: {
    color: colors.text.inverse,
    fontSize: getResponsiveFontSize(16, SCREEN_WIDTH),
    fontWeight: "500",
    marginBottom: getResponsiveSpacing(spacing.lg, SCREEN_HEIGHT),
    textAlign: "center",
  },
  listContainer: {
    backgroundColor: colors.background.primary,
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  locationFab: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: 28,
    bottom: getResponsiveSpacing(spacing.lg, SCREEN_HEIGHT),
    height: getResponsiveSpacing(56, SCREEN_HEIGHT),
    justifyContent: "center",
    position: "absolute",
    right: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
    width: getResponsiveSpacing(56, SCREEN_WIDTH),
    zIndex: zIndex.mapControls,
    ...createShadow("lg"),
  },
  locationFabIcon: {
    color: colors.brand.primary,
    fontSize: getResponsiveFontSize(24, SCREEN_WIDTH),
  },
  map: {
    flex: 1,
    width: "100%",
  },
  permissionButton: {
    minWidth: getResponsiveSpacing(200, SCREEN_WIDTH),
    paddingHorizontal: getResponsiveSpacing(spacing.xl, SCREEN_WIDTH),
    paddingVertical: getResponsiveSpacing(spacing.md, SCREEN_HEIGHT),
  },
  permissionErrorContainer: {
    // Renamed from errorContainer for clarity
    alignItems: "center",
    backgroundColor: colors.background.overlay, // Semi-transparent overlay
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: zIndex.mapControls, // Ensure it's above the map but below modals
  },
  refreshIndicator: {
    alignItems: "center",
    backgroundColor: colors.background.overlay,
    borderRadius: 8,
    left: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
    padding: spacing.md,
    position: "absolute",
    top: getResponsiveSpacing(spacing.lg, SCREEN_HEIGHT),
    zIndex: zIndex.mapControls,
    ...createShadow("md"),
  },
  refreshText: {
    color: colors.text.inverse,
    fontSize: getResponsiveFontSize(14, SCREEN_WIDTH),
    fontWeight: "500",
  },
  safeAreaContainer: {
    flex: 1,
    width: "100%",
  },
});
