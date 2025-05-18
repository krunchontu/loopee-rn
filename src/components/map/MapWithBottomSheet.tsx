import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useToiletStore } from "../../stores/toilets";
import { locationService, LocationState } from "../../services/location";
import { CustomMapView } from "./MapView";
import { ModalizeToiletSheet } from "../toilet/ModalizeToiletSheet";
import { debug } from "../../utils/debug";

/**
 * MapWithBottomSheet
 *
 * Combines the map view with a Modalize-powered bottom sheet for
 * an optimal mobile UI that avoids the readability issues with the previous
 * implementation. This component is used for phone layouts in the responsive
 * navigation system.
 */
export default function MapWithBottomSheet() {
  const { toilets, loading, error, fetchNearbyToilets } = useToiletStore();
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(
    null
  );

  // Handle location updates
  const handleLocationUpdate = useCallback(
    (location: LocationState) => {
      debug.log("MapWithBottomSheet", "Location updated", {
        lat: location.latitude,
        lng: location.longitude,
      });
      setCurrentLocation(location);
      fetchNearbyToilets(location.latitude, location.longitude);
    },
    [fetchNearbyToilets]
  );

  // Initialize location tracking
  useEffect(() => {
    const initializeLocation = async () => {
      debug.log("MapWithBottomSheet", "Initializing location tracking");
      try {
        // Request permissions first
        const hasPermission = await locationService.requestPermissions();

        if (hasPermission) {
          // Start tracking location
          await locationService.startLocationUpdates(
            handleLocationUpdate,
            (error) =>
              debug.error("MapWithBottomSheet", "Location error", error)
          );

          // Try to get current location immediately
          const initialLocation = locationService.getLastKnownLocation();
          if (initialLocation) {
            handleLocationUpdate(initialLocation);
          } else {
            // Use default location as fallback
            debug.log("MapWithBottomSheet", "Using default location");
            fetchNearbyToilets(1.3521, 103.8198);
          }
        } else {
          // No permission, use default location
          debug.warn("MapWithBottomSheet", "No location permission");
          fetchNearbyToilets(1.3521, 103.8198);
        }
      } catch (err) {
        debug.error("MapWithBottomSheet", "Location initialization error", err);
        fetchNearbyToilets(1.3521, 103.8198);
      }
    };

    initializeLocation();

    // Cleanup function
    return () => {
      locationService.stopLocationUpdates();
    };
  }, [handleLocationUpdate, fetchNearbyToilets]);

  const handleRetry = () => {
    debug.log("MapWithBottomSheet", "Retrying toilet fetch");
    if (currentLocation) {
      fetchNearbyToilets(currentLocation.latitude, currentLocation.longitude);
    } else {
      fetchNearbyToilets(1.3521, 103.8198);
    }
  };

  return (
    <View style={styles.container}>
      <CustomMapView
        style={styles.map}
        onMapPress={() => {}} // Empty handler to avoid sheet closing on map tap
      />
      <ModalizeToiletSheet
        toilets={toilets}
        isLoading={loading}
        error={error}
        onRetry={handleRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
    width: "100%",
  },
});
