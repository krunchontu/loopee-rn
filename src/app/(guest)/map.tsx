import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState, memo } from "react";
import { colors, zIndex } from "../../foundations";
import { CustomMapView } from "../../components/map/MapView";
import { useToiletStore } from "../../stores/toilets";
import { locationService } from "../../services/location";
import { debug } from "../../utils/debug";
import { ErrorState } from "../../components/shared/ErrorState";
import { Toilet } from "../../types/toilet";
import { ModalToiletSheet } from "../../components/toilet/ModalToiletSheet";

// Types
// LocationErrorViewProps removed as the component is no longer used.

/**
 * Hook to manage location services and error handling
 */
function useLocationService() {
  const { fetchNearbyToilets } = useToiletStore();
  const [locationError, setLocationError] = useState<string | null>(null);

  // Setup location and data fetching
  useEffect(() => {
    debug.log("Map", "Setting up location services");

    const setupLocation = async () => {
      try {
        // Request location permissions
        const granted = await locationService.requestPermissions();
        if (!granted) {
          setLocationError(
            "Location permission is required to find nearby toilets"
          );
          return;
        }

        // Get current location
        const location = await locationService.getCurrentLocation();
        debug.log("Map", "Got location", {
          lat: location.latitude,
          lng: location.longitude,
        });

        // Fetch toilets based on location
        fetchNearbyToilets(location.latitude, location.longitude);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get location";
        setLocationError(message);
        debug.error("Map", "Location error", err);
      }
    };

    setupLocation();

    // Cleanup function to stop location updates
    return () => {
      locationService.stopLocationUpdates();
    };
  }, [fetchNearbyToilets]);

  // Retry fetching on error
  const handleRetry = useCallback(() => {
    debug.log("Map", "Retrying location and data fetch");
    setLocationError(null);
    locationService.requestPermissions().then((granted) => {
      if (granted) {
        locationService.getCurrentLocation().then((location) => {
          fetchNearbyToilets(location.latitude, location.longitude);
        });
      }
    });
  }, [fetchNearbyToilets]);

  return {
    locationError,
    handleRetry,
  };
}

// Components
/**
 * Component to display map header using Stack.Screen
 */
const MapHeader = memo(() => (
  <Stack.Screen
    options={{
      title: "Find Your Loop",
      headerStyle: {
        backgroundColor: colors.background.primary,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.ui.border,
      },
      headerTintColor: colors.text.primary,
      headerTitleStyle: {
        color: colors.text.primary,
      },
    }}
  />
));

MapHeader.displayName = "MapHeader";

// LocationErrorView component definition removed as it's no longer used.
// ErrorState is now used directly in MapScreen.

/**
 * Main Map Screen Component
 * Orchestrates location services, map view, and modal with toilet data
 */
export default function MapScreen() {
  // Global state
  const { toilets, loading, error, selectedToilet, selectToilet } =
    useToiletStore();

  // Custom hooks for different concerns
  const { locationError, handleRetry } = useLocationService();

  // Handle map marker press by updating the selection
  // The modal will react to changes in `selectedToilet`
  const handleMapMarkerPress = useCallback(
    (toilet: Toilet) => {
      debug.log("Map", "Marker pressed, selecting toilet", toilet.id);
      selectToilet(toilet);
    },
    [selectToilet]
  );

  // Handle modal close by clearing the selected toilet
  const handleModalClose = useCallback(() => {
    debug.log("MapScreen", "Modal closed, deselecting toilet");
    selectToilet(null);
  }, [selectToilet]);

  // Enable verbose logging for development and debugging
  useEffect(() => {
    debug.enableVerboseLogging();
    debug.log("MapScreen", "Component mounted with enhanced modal solution");

    // Auto-show modal with slight delay for testing if needed
    // Uncomment for testing purposes
    /*
    if (toilets.length > 0) {
      const timer = setTimeout(() => {
        debug.log("MapScreen", "Auto-showing modal for testing");
        setIsModalVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    */
  }, [toilets.length]);

  return (
    <>
      <MapHeader />
      <View style={styles.container}>
        {/* LocationErrorView removed, will be replaced by a banner style ErrorState */}
        {
          !locationError ?
            <>
              <CustomMapView
                onMarkerPress={handleMapMarkerPress}
                style={styles.mapView}
              />
              <ModalToiletSheet
                visible={!!selectedToilet}
                toilets={selectedToilet ? [selectedToilet] : []}
                selectedToilet={selectedToilet}
                onToiletPress={(toilet) => selectToilet(toilet)}
                onClose={handleModalClose}
                isLoading={loading}
                error={error}
                onRetry={handleRetry}
              />
            </>
            // If there is a locationError, we still render CustomMapView and ModalToiletSheet
            // The error banner will overlay the map.
          : <>
              <CustomMapView
                onMarkerPress={handleMapMarkerPress}
                style={styles.mapView} // Map will be under the banner
              />
              <ModalToiletSheet
                visible={!!selectedToilet}
                toilets={selectedToilet ? [selectedToilet] : []}
                selectedToilet={selectedToilet}
                onToiletPress={(toilet) => selectToilet(toilet)}
                onClose={handleModalClose}
                isLoading={loading}
                error={error} // This is for toilet fetching error
                onRetry={handleRetry} // This retry might be for toilet fetching
              />
            </>

        }
        {/* Error Banner - Rendered on top if locationError exists */}
        {locationError && (
          <View style={styles.errorBannerContainer}>
            <ErrorState
              error={locationError}
              onRetry={handleRetry}
              message="Location Error"
              fullScreen={false}
            />
          </View>
        )}
      </View>
    </>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  errorBannerContainer: {
    backgroundColor: colors.status.error.background, // Use a background for the banner
    elevation: 5, // For Android shadow
    left: 0,
    padding: 8, // Use spacing from foundations if available e.g. spacing.sm
    position: "absolute",
    right: 0,
    shadowColor: colors.text.primary, // For iOS shadow - using a theme color
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    top: 0, // Adjust as needed, e.g., below a custom header if MapHeader was not from Stack.Screen
    zIndex: zIndex.modal, // Ensure banner is above the map, but potentially below a full modal
  },
  mapView: {
    flex: 1,
    width: "100%",
    zIndex: zIndex.map, // Ensure map is below the error banner
  },
});
