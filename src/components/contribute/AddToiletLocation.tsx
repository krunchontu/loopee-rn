/**
 * @file AddToiletLocation component
 *
 * Second step in toilet contribution process: location selection
 */

import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Title, Button, TextInput, Text } from "react-native-paper";

import { colors, spacing } from "../../foundations";
import { locationService } from "../../services/location";
import type { BaseStepProps } from "../../types/contribution";
import type { Location as ToiletLocation } from "../../types/toilet";

interface AddToiletLocationProps extends BaseStepProps {
  location?: ToiletLocation;
  address?: string;
  updateToiletData: (
    data: Partial<{
      location: ToiletLocation;
      address: string;
      buildingName?: string;
      floorLevel?: number;
    }>
  ) => void;
}

/**
 * Location selection step in toilet contribution form
 * Allows users to specify the toilet location via map or search
 */
export const AddToiletLocation: React.FC<AddToiletLocationProps> = ({
  location,
  address,
  updateToiletData,
  onNext,
  onBack,
}) => {
  // Initial location state (use props or default to Singapore)
  const initialLocation = location || {
    latitude: 1.3521,
    longitude: 103.8198,
  };

  // State for current location
  const [currentLocation, setCurrentLocation] =
    useState<ToiletLocation>(initialLocation);
  const [currentAddress, setCurrentAddress] = useState(address || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [floorLevel, setFloorLevel] = useState<string>("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reference to map
  const mapRef = useRef<MapView>(null);

  // Get user's current location on component mount
  useEffect(() => {
    if (!location) {
      getCurrentLocation();
    }
  }, []);

  /**
   * Get the user's current location
   */
  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      setError(null);

      const position = await locationService.getCurrentPosition();

      if (position) {
        // Update location
        setCurrentLocation(position);
        // Get address for the location
        getAddressFromCoordinates(position.latitude, position.longitude);
        // Animate map to the location
        animateToLocation(position);
      } else {
        setError(
          "Unable to get current location. Please set location manually."
        );
      }
    } catch (err) {
      setError("Error getting location. Please try again.");
      console.error("Location error:", err);
    } finally {
      setLoadingLocation(false);
    }
  };

  /**
   * Get address from coordinates using reverse geocoding
   */
  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      const address = await locationService.reverseGeocodeCoordinates(
        latitude,
        longitude
      );

      if (address) {
        setCurrentAddress(address);
      } else {
        setCurrentAddress("Address not available");
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      setCurrentAddress("Address not available");
    }
  };

  /**
   * Search for an address and update location
   */
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoadingLocation(true);
      setError(null);

      // Geocode the address
      const location = await locationService.geocodeAddress(searchQuery);

      if (location) {
        // Update location
        setCurrentLocation(location);
        // Get full address for the location
        getAddressFromCoordinates(location.latitude, location.longitude);
        // Animate map to the location
        animateToLocation(location);
        // Clear search query
        setSearchQuery("");
      } else {
        setError("Address not found. Please try a different search.");
      }
    } catch (err) {
      setError("Error searching address. Please try again.");
      console.error("Geocoding error:", err);
    } finally {
      setLoadingLocation(false);
    }
  };

  /**
   * Handle map marker drag
   */
  const handleMarkerDrag = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCurrentLocation({ latitude, longitude });
    getAddressFromCoordinates(latitude, longitude);
  };

  /**
   * Handle map press to set a location
   */
  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCurrentLocation({ latitude, longitude });
    getAddressFromCoordinates(latitude, longitude);
  };

  /**
   * Animate map to a specific location
   */
  const animateToLocation = (location: ToiletLocation) => {
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500
    );
  };

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    // Reset error state
    setError(null);

    // Validate location is set
    if (
      !currentLocation ||
      currentLocation.latitude === 0 ||
      currentLocation.longitude === 0
    ) {
      setError("Please set a valid location");
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Convert floor level to number if provided
    const parsedFloorLevel =
      floorLevel.trim() ? parseInt(floorLevel, 10) : undefined;

    // Update parent state with location data
    updateToiletData({
      location: currentLocation,
      address: currentAddress,
      buildingName: buildingName.trim() || undefined,
      floorLevel: parsedFloorLevel,
    });

    // Proceed to next step
    onNext();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Title style={styles.title}>Toilet Location</Title>
      <Text style={styles.subtitle}>
        Set the exact location of this toilet on the map
      </Text>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          label="Search location"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          mode="outlined"
          placeholder="Enter address or place name"
          right={
            <TextInput.Icon
              icon="magnify"
              onPress={searchAddress}
              disabled={loadingLocation}
            />
          }
        />
      </View>

      {/* Current Location Button */}
      <Button
        mode="outlined"
        onPress={getCurrentLocation}
        style={styles.currentLocationButton}
        icon="crosshairs-gps"
        loading={loadingLocation}
        disabled={loadingLocation}
      >
        Use Current Location
      </Button>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loadingMap && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: initialLocation.latitude,
            longitude: initialLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
          onMapReady={() => setLoadingMap(false)}
        >
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            draggable
            onDragEnd={handleMarkerDrag}
          />
        </MapView>
        <View style={styles.mapInstructions}>
          <Text style={styles.mapInstructionsText}>
            Tap on the map or drag the marker to set the exact location
          </Text>
        </View>
      </View>

      {/* Address display */}
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Address:</Text>
        <Text style={styles.addressText}>{currentAddress}</Text>
      </View>

      {/* Building Information */}
      <TextInput
        label="Building Name (Optional)"
        value={buildingName}
        onChangeText={setBuildingName}
        style={styles.input}
        mode="outlined"
        placeholder="E.g., Central Mall, Business Park"
      />

      <TextInput
        label="Floor Level (Optional)"
        value={floorLevel}
        onChangeText={(text) => {
          // Allow only numbers, with optional minus sign
          if (/^-?\d*$/.test(text)) {
            setFloorLevel(text);
          }
        }}
        style={styles.input}
        mode="outlined"
        placeholder="E.g., 2, -1 (basement)"
        keyboardType="number-pad"
      />
      <Text style={styles.helperText}>
        Use negative numbers for basement levels (e.g., -1 for B1)
      </Text>

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          contentStyle={styles.buttonContent}
          disabled={loadingLocation}
        >
          Next: Amenities
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  addressContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  addressLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  addressText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  buttonContent: {
    height: 50,
  },
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  currentLocationButton: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.status.error.foreground,
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  input: {
    backgroundColor: colors.background.primary,
    marginBottom: spacing.md,
  },
  loadingText: {
    color: colors.text.primary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  map: {
    borderRadius: 8,
    height: "100%",
    width: "100%",
  },
  mapContainer: {
    borderRadius: 8,
    height: 300,
    overflow: "hidden",
    position: "relative",
  },
  mapInstructions: {
    backgroundColor: colors.background.primary,
    borderRadius: 4,
    bottom: spacing.sm,
    left: spacing.sm,
    opacity: 0.9,
    padding: spacing.xs,
    position: "absolute",
  },
  mapInstructionsText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  mapLoading: {
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    height: "100%",
    justifyContent: "center",
    position: "absolute",
    width: "100%",
    zIndex: 1,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.background.primary,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
});
