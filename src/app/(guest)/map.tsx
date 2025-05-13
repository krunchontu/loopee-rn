import { View, Text, useWindowDimensions, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { useCallback, useRef, useMemo, useEffect, useState } from "react";
import { colors } from "../../constants/colors";
import { ToiletList } from "../../components/toilet/ToiletList";
import { CustomMapView } from "../../components/map/MapView";
import { useToiletStore } from "../../stores/toilets";
import { locationService } from "../../services/location";
import { debug } from "../../utils/debug";
import { ErrorState } from "../../components/shared/ErrorState";
import { Toilet } from "../../types/toilet";

export default function MapScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { toilets, fetchNearbyToilets, loading, error } = useToiletStore();
  const [locationError, setLocationError] = useState<string | null>(null);

  // Optimize with memoized snapPoints calculation
  const snapPoints = useMemo(() => {
    const minHeight = 150;
    const maxHeight = height - (insets.top + 100);
    return [minHeight, maxHeight];
  }, [height, insets.top]);

  // Handle bottom sheet changes with proper logging
  const handleSheetChanges = useCallback((index: number) => {
    debug.log("BottomSheet", `Sheet changed to index ${index}`);
  }, []);

  // Handle toilet selection with proper navigation
  const handleToiletPress = useCallback((toilet: Toilet) => {
    debug.log("Map", "Selected toilet", toilet.id);
    // Any additional logic for toilet selection
  }, []);

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

  return (
    <>
      <Stack.Screen
        options={{
          title: "Find Your Loop",
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.background.primary,
          headerTitleStyle: {
            color: colors.background.primary,
          },
        }}
      />
      <View style={styles.container}>
        {locationError ?
          <ErrorState
            error={locationError}
            onRetry={handleRetry}
            message="We need location access to find toilets near you"
          />
        : <>
            <CustomMapView />

            <BottomSheet
              ref={bottomSheetRef}
              index={0}
              snapPoints={snapPoints}
              onChange={handleSheetChanges}
              handleIndicatorStyle={styles.sheetIndicator}
              handleStyle={styles.sheetHandle}
              backgroundStyle={styles.sheetBackground}
            >
              <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Nearby Toilets</Text>
                <ToiletList
                  toilets={toilets}
                  onToiletPress={handleToiletPress}
                  isLoading={loading}
                  error={error}
                  onRetry={handleRetry}
                />
              </View>
            </BottomSheet>
          </>
        }
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  sheetIndicator: {
    backgroundColor: colors.border.medium,
    width: 40,
  },
  sheetHandle: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  sheetBackground: {
    backgroundColor: colors.background.primary,
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
    marginHorizontal: 16,
    marginBottom: 8,
  },
});
