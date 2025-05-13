import * as Location from "expo-location";
import { Platform } from "react-native";

export interface LocationError {
  code: string;
  message: string;
}

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

class LocationService {
  private watchId: Location.LocationSubscription | null = null;
  private lastKnownLocation: LocationState | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        return false;
      }

      // On iOS, also request "When In Use" permission
      if (Platform.OS === "ios") {
        const { status: iosStatus } =
          await Location.requestBackgroundPermissionsAsync();
        return iosStatus === "granted";
      }

      return true;
    } catch (error) {
      console.error("Error requesting location permissions:", error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationState> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationState: LocationState = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || null,
        timestamp: location.timestamp,
      };

      this.lastKnownLocation = locationState;
      return locationState;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get location"
      );
    }
  }

  async startLocationUpdates(
    onUpdate: (location: LocationState) => void,
    onError?: (error: LocationError) => void
  ): Promise<void> {
    try {
      // First get initial location
      const initialLocation = await this.getCurrentLocation();
      onUpdate(initialLocation);

      // Then start watching for updates
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (location) => {
          const newLocation: LocationState = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || null,
            timestamp: location.timestamp,
          };
          this.lastKnownLocation = newLocation;
          onUpdate(newLocation);
        }
      );
    } catch (error) {
      const locationError = {
        code: "LOCATION_ERROR",
        message: error instanceof Error ? error.message : "Location error",
      };
      onError?.(locationError);
    }
  }

  stopLocationUpdates(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  getLastKnownLocation(): LocationState | null {
    return this.lastKnownLocation;
  }

  // Helper to calculate distance between two points in meters
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const locationService = new LocationService();
