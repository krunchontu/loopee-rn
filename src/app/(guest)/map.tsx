import { View, Text, useWindowDimensions, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useRef, useMemo, useEffect, useState, memo } from "react";
import { colors, spacing } from "../../constants/colors";
import { ToiletList } from "../../components/toilet/ToiletList";
import { CustomMapView } from "../../components/map/MapView";
import { useToiletStore } from "../../stores/toilets";
import { locationService } from "../../services/location";
import { debug } from "../../utils/debug";
import { ErrorState } from "../../components/shared/ErrorState";
import { Toilet } from "../../types/toilet";

// Types
interface LocationErrorViewProps {
  error: string;
  onRetry: () => void;
}

interface ToiletBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  snapPoints: number[];
  onChange: (index: number) => void;
  renderBackdrop: (props: BottomSheetBackdropProps) => React.ReactElement;
  toilets: Toilet[];
  onToiletPress: (toilet: Toilet) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// Custom hooks
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

/**
 * Hook to manage bottom sheet configuration and interactions
 */
function useBottomSheetController(_snapPoints: number[]) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [currentSheetIndex, setCurrentSheetIndex] = useState<number>(1);

  // Handle bottom sheet changes with proper logging
  const handleSheetChanges = useCallback((index: number) => {
    debug.log("BottomSheet", `Sheet changed to index ${index}`);
    setCurrentSheetIndex(index);
  }, []);

  // Add method to expand sheet to show selected toilet
  const expandSheet = useCallback(() => {
    debug.log("BottomSheet", "Expanding sheet to show toilet details");
    if (bottomSheetRef.current) {
      // Expand to maximum height (index 1)
      bottomSheetRef.current.snapToIndex(1);
    }
  }, []);

  // Render custom backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
        opacity={0.5}
      />
    ),
    []
  );

  return {
    bottomSheetRef,
    currentSheetIndex,
    handleSheetChanges,
    renderBackdrop,
    expandSheet,
  };
}

/**
 * Hook to calculate screen dimensions and snap points
 */
function useMapConfiguration() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Calculate snap points based on screen dimensions, accounting for system UI elements
  const snapPoints = useMemo(() => {
    // Account for both top and bottom insets to handle notches and navigation bars
    const minHeight = Math.max(300, 120 + insets.bottom); // Ensure visibility above nav bar
    const maxHeight = height - (insets.top + 100);
    return [minHeight, maxHeight];
  }, [height, insets.top, insets.bottom]);

  return { snapPoints };
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
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.background.primary,
      headerTitleStyle: {
        color: colors.background.primary,
      },
    }}
  />
));

MapHeader.displayName = "MapHeader";

/**
 * Component to display location error message with retry option
 */
const LocationErrorView = memo(({ error, onRetry }: LocationErrorViewProps) => (
  <ErrorState
    error={error}
    onRetry={onRetry}
    message="We need location access to find toilets near you"
  />
));

LocationErrorView.displayName = "LocationErrorView";

/**
 * Component that renders the bottom sheet with toilet list
 */
const ToiletBottomSheet = memo(
  ({
    bottomSheetRef,
    snapPoints,
    onChange,
    renderBackdrop,
    toilets,
    onToiletPress,
    isLoading,
    error,
    onRetry,
  }: ToiletBottomSheetProps) => (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={onChange}
      handleIndicatorStyle={styles.sheetIndicator}
      handleStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={false}
      enableOverDrag={true}
      enableHandlePanningGesture={true}
      android_keyboardInputMode="adjustResize"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      animateOnMount={true}
      enableContentPanningGesture={true}
      style={styles.sheetContainer}
    >
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Nearby Toilets</Text>
          <Text style={styles.toiletCount}>{toilets.length} found</Text>
          <View style={styles.expandIndicator}>
            <Text style={styles.expandIcon}>⌃</Text>
          </View>
        </View>
        <ToiletList
          toilets={toilets}
          onToiletPress={onToiletPress}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
        />
      </View>
    </BottomSheet>
  )
);

ToiletBottomSheet.displayName = "ToiletBottomSheet";

/**
 * Main Map Screen Component
 * Orchestrates location services, map view, and bottom sheet with toilet data
 */
export default function MapScreen() {
  // Global state
  const { toilets, loading, error, selectToilet } = useToiletStore();

  // Custom hooks for different concerns
  const { snapPoints } = useMapConfiguration();
  const { locationError, handleRetry } = useLocationService();
  const { bottomSheetRef, handleSheetChanges, renderBackdrop, expandSheet } =
    useBottomSheetController(snapPoints);

  // Handle toilet selection with proper navigation
  const handleToiletPress = useCallback(
    (toilet: Toilet) => {
      debug.log("Map", "Selected toilet", toilet.id);

      // Update the global state with selected toilet
      selectToilet(toilet);

      // Show the bottom sheet with toilet details
      expandSheet();

      debug.log("Map", "Toilet selection completed", {
        name: toilet.name,
        showingDetails: true,
      });
    },
    [selectToilet, expandSheet]
  );

  return (
    <>
      <MapHeader />
      <View style={styles.container}>
        {locationError ?
          <LocationErrorView error={locationError} onRetry={handleRetry} />
        : <>
            <CustomMapView />
            <ToiletBottomSheet
              bottomSheetRef={bottomSheetRef}
              snapPoints={snapPoints}
              onChange={handleSheetChanges}
              renderBackdrop={renderBackdrop}
              toilets={toilets}
              onToiletPress={handleToiletPress}
              isLoading={loading}
              error={error}
              onRetry={handleRetry}
            />
          </>
        }
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
  expandIcon: {
    color: colors.text.light,
    fontSize: 18,
  },
  expandIndicator: {
    paddingVertical: 4,
  },
  listContainer: {
    flex: 1,
    minHeight: 250, // Ensure minimum height for the FlashList
    paddingBottom: spacing.lg,
  },
  listHeader: {
    alignItems: "center",
    borderBottomColor: colors.border.light,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  sheetBackground: {
    backgroundColor: colors.background.primary,
  },
  sheetContainer: {
    bottom: 0,
    elevation: 24, // Higher elevation for Android
    left: 0,
    position: "absolute", // Ensure absolute positioning
    right: 0,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 999, // Ensure it's above the map
  },
  sheetHandle: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: 24, // Make handle area taller
    paddingTop: 8, // Add top padding for better touch area
  },
  sheetIndicator: {
    backgroundColor: colors.border.medium,
    height: 4, // Make indicator more visible
    width: 40,
  },
  toiletCount: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});
