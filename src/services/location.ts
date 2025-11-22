/**
 * @file Location Service
 *
 * Provides location-related functionality through both:
 * 1. Individual utility functions (for direct imports)
 * 2. A singleton locationService object with consistent interface
 *
 * This dual approach maintains backward compatibility while addressing
 * the architectural needs of the application.
 */

import * as Location from "expo-location";
import { Platform } from "react-native";

import { debug } from "../utils/debug";

/**
 * Location state interface representing geographical coordinates
 */
export interface LocationState {
  latitude: number;
  longitude: number;
}

/**
 * Request location permission from the user
 * @returns Boolean indicating if the permission is granted
 */
export const getLocationPermission = async (): Promise<boolean> => {
  try {
    // First, check if permission is already granted
    const { status } = await Location.getForegroundPermissionsAsync();

    // If permission already granted, return true
    if (status === Location.PermissionStatus.GRANTED) {
      return true;
    }

    // Under iOS, we need to check if permission has been denied previously
    if (Platform.OS === "ios" && status === Location.PermissionStatus.DENIED) {
      // With iOS, after one denial, user must be directed to settings
      // so we return false in this case
      return false;
    }

    // Request permission
    const { status: newStatus } =
      await Location.requestForegroundPermissionsAsync();

    // Return true if permission is granted
    return newStatus === Location.PermissionStatus.GRANTED;
  } catch (error) {
    debug.error("Location", "Error requesting location permission", error);
    return false;
  }
};

/**
 * Get the current position of the device
 * @returns Location coordinates or null if unavailable
 */
export const getCurrentPosition = async (): Promise<LocationState | null> => {
  try {
    // Check permission first
    const hasPermission = await getLocationPermission();

    if (!hasPermission) {
      return null;
    }

    // Get current position with high accuracy
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    debug.error("Location", "Error getting current position", error);
    return null;
  }
};

/**
 * Geocode an address to coordinates
 * @param address The address to geocode
 * @returns Location coordinates or null if unavailable
 */
export const geocodeAddress = async (
  address: string
): Promise<LocationState | null> => {
  try {
    const results = await Location.geocodeAsync(address);

    if (results && results.length > 0) {
      const { latitude, longitude } = results[0];
      return { latitude, longitude };
    }

    return null;
  } catch (error) {
    debug.error("Location", "Error geocoding address", error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to an address
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Address string or null if unavailable
 */
export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results && results.length > 0) {
      const { street, name, city, region, country, postalCode } = results[0];

      const addressParts = [
        street || name,
        city,
        region,
        country,
        postalCode,
      ].filter(Boolean);

      if (addressParts.length > 0) {
        return addressParts.join(", ");
      }
    }

    return null;
  } catch (error) {
    debug.error("Location", "Error reverse geocoding", error);
    return null;
  }
};

/**
 * LocationService class
 *
 * Provides a consistent interface for location operations throughout the app.
 * Implemented as a singleton to maintain consistent state across components.
 */
class LocationService {
  private watchId: Location.LocationSubscription | null = null;
  private lastKnownLocation: LocationState | null = null;

  /**
   * Request permissions for location access
   * @returns Promise<boolean> indicating if permission was granted
   */
  async requestPermissions(): Promise<boolean> {
    return await getLocationPermission();
  }

  /**
   * Get the current location, updating permissions if needed
   * @returns Promise with location data or null
   */
  async getCurrentLocation(): Promise<LocationState | null> {
    const location = await getCurrentPosition();
    if (location) {
      this.lastKnownLocation = location;
    }
    return location;
  }

  /**
   * Alias for getCurrentLocation to maintain compatibility with older code
   * @returns Promise with location data or null
   */
  async getCurrentPosition(): Promise<LocationState | null> {
    return this.getCurrentLocation();
  }

  /**
   * Get the most recently cached location without triggering a new request
   * @returns The most recent location or null if not available
   */
  getLastKnownLocation(): LocationState | null {
    return this.lastKnownLocation;
  }

  /**
   * Geocode an address to coordinates
   * @param address The address to geocode
   * @returns Location coordinates or null if unavailable
   */
  async geocodeAddress(address: string): Promise<LocationState | null> {
    return geocodeAddress(address);
  }

  /**
   * Reverse geocode coordinates to an address
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Address string or null if unavailable
   */
  async reverseGeocodeCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    return reverseGeocodeCoordinates(latitude, longitude);
  }

  /**
   * Start continuous location updates
   * @param onUpdate Callback function when location changes
   * @param onError Callback function when an error occurs
   */
  async startLocationUpdates(
    onUpdate: (location: LocationState) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Stop any existing updates first
      this.stopLocationUpdates();

      // Request permissions
      const hasPermission = await getLocationPermission();
      if (!hasPermission) {
        onError(new Error("Location permission not granted"));
        return;
      }

      // Try to get initial location
      const initialLocation = await this.getCurrentLocation();
      if (initialLocation) {
        onUpdate(initialLocation);
      }

      // Start watching for updates with reduced frequency
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 60000, // Update every 60 seconds (reduced from 10s)
          distanceInterval: 100, // Update every 100 meters (increased from 10m)
        },
        (location) => {
          const locationState: LocationState = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          this.lastKnownLocation = locationState;
          onUpdate(locationState);
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown location error";
      debug.error("Location", "Error starting location updates", errorMessage);
      onError(new Error(errorMessage));
    }
  }

  /**
   * Stop location updates and clean up resources
   */
  stopLocationUpdates(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }
}

// Export singleton instance for app-wide use
export const locationService = new LocationService();
