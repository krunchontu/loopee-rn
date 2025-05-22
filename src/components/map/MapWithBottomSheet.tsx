import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, SafeAreaView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView from "react-native-maps";
import { AppHeader } from "../shared/AppHeader";
import { useToiletStore } from "../../stores/toilets";
import { locationService, LocationState } from "../../services/location";
import { CustomMapView } from "./MapView";
import { ModalizeToiletSheet } from "../toilet/ModalizeToiletSheet";
import { debug } from "../../utils/debug";
import { colors } from "../../foundations/colors";
import { zIndex } from "../../foundations/zIndex";

/**
 * MapWithBottomSheet
 *
 * Combines the map view with a Modalize-powered bottom sheet for
 * an optimal mobile UI that avoids the readability issues with the previous
 * implementation. This component is used for phone layouts in the responsive
 * navigation system.
 *
 * Features:
 * - Map display with custom styling
 * - Bottom sheet for toilet listings
 * - Header with app title
 * - Quick access FABs for profile and location centering
 */

/**
 * Reusable Map Action Button component
 *
 * @param icon - MaterialCommunityIcons icon name
 * @param onPress - Function to call when button is pressed
 * @param accessibilityLabel - Screen reader label for accessibility
 * @param style - Optional additional styles
 */
const MapActionButton = ({
  icon,
  onPress,
  accessibilityLabel,
  style,
}: {
  icon: any; // Using any temporarily to avoid type issues with MaterialCommunityIcons
  onPress: () => void;
  accessibilityLabel: string;
  style?: any;
}) => (
  <Pressable
    style={[styles.fab, style]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    android_ripple={{
      color: "rgba(0, 0, 0, 0.1)",
      borderless: true,
      radius: 28,
    }}
  >
    <MaterialCommunityIcons name={icon} size={24} color={colors.text.primary} />
  </Pressable>
);
export default function MapWithBottomSheet() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { toilets, loading, error, fetchNearbyToilets } = useToiletStore();
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(
    null
  );

  // Navigate to profile screen
  const handleProfilePress = useCallback(() => {
    debug.log("MapWithBottomSheet", "Navigate to profile");
    router.push("/profile");
  }, [router]);

  // Center map on current location
  const handleCenterLocation = useCallback(() => {
    debug.log("MapWithBottomSheet", "Center on current location");
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [currentLocation]);

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
      <SafeAreaView style={styles.headerContainer}>
        <AppHeader />
      </SafeAreaView>

      {/* Map view */}
      <CustomMapView
        style={styles.map}
        onMapPress={() => {}} // Empty handler to avoid sheet closing on map tap
      />

      {/* Toilet bottom sheet */}
      <ModalizeToiletSheet
        toilets={toilets}
        isLoading={loading}
        error={error}
        onRetry={handleRetry}
      />

      {/* FAB container for quick actions */}
      <View style={styles.fabContainer}>
        {/* Profile access FAB */}
        <MapActionButton
          icon="account-circle"
          onPress={handleProfilePress}
          accessibilityLabel="Go to profile"
        />

        {/* Location centering FAB */}
        <MapActionButton
          icon="crosshairs-gps"
          onPress={handleCenterLocation}
          accessibilityLabel="Center on my location"
          style={styles.locationFab}
        />

        {/* Add Toilet FAB */}
        <MapActionButton
          icon="plus"
          onPress={() => {
            // Navigate to add toilet screen
            router.push("/contribute/add-toilet");
          }}
          accessibilityLabel="Add a new toilet"
          style={styles.addToiletFab}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addToiletFab: {
    backgroundColor: colors.primary || "#4CAF50",
  },
  container: {
    flex: 1,
    position: "relative",
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: 28,
    elevation: 4,
    height: 56,
    justifyContent: "center",
    marginLeft: 8,
    width: 56,
  },
  fabContainer: {
    flexDirection: "row",
    position: "absolute",
    right: 16,
    top: 72, // Below header
    zIndex: zIndex.mapControls || 5,
  },
  headerContainer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  locationFab: {
    backgroundColor: colors.background.secondary || "#F0F0F0",
  },
  map: {
    flex: 1,
    width: "100%",
  },
});
