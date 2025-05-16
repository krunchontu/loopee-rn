import { Region } from "react-native-maps";
import { Toilet } from "../types/toilet";
import { debug } from "./debug";

interface Cluster {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  points: Toilet[];
}

export function getClusterKey(
  latitude: number,
  longitude: number,
  zoom: number
): string {
  const lat = Math.floor(latitude * Math.pow(10, zoom));
  const lng = Math.floor(longitude * Math.pow(10, zoom));
  return `${lat}-${lng}-${zoom}`;
}

export function getZoomLevel(region: Region): number {
  const ZOOM_MULTIPLIER = 0.15;
  return (
    Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) *
    ZOOM_MULTIPLIER
  );
}

export function clusterToilets(
  toilets: Toilet[],
  region: Region,
  _clusterRadius: number = 50 // Renamed with underscore to indicate intentionally unused parameter
): Cluster[] {
  const zoom = getZoomLevel(region);
  debug.log("Clustering", "Starting toilet clustering", {
    zoomLevel: zoom,
    toiletCount: toilets.length,
  });

  const clusters: { [key: string]: Cluster } = {};

  // TEMPORARY DIAGNOSTIC: Count different types of toilets
  const withLocation = toilets.filter(
    (toilet) => toilet && toilet.location
  ).length;
  const withValidCoordTypes = toilets.filter(
    (toilet) =>
      toilet &&
      toilet.location &&
      typeof toilet.location.latitude === "number" &&
      typeof toilet.location.longitude === "number"
  ).length;
  const withValidRange = toilets.filter(
    (toilet) =>
      toilet &&
      toilet.location &&
      typeof toilet.location.latitude === "number" &&
      typeof toilet.location.longitude === "number" &&
      toilet.location.latitude >= -90 &&
      toilet.location.latitude <= 90 &&
      toilet.location.longitude >= -180 &&
      toilet.location.longitude <= 180
  ).length;

  debug.warn("Clustering", "TOILET DIAGNOSIS IN CLUSTERING", {
    totalToilets: toilets.length,
    withLocation,
    withValidCoordTypes,
    withValidRange,
    missingLocation: toilets.length - withLocation,
    invalidCoordTypes: withLocation - withValidCoordTypes,
    outOfRange: withValidCoordTypes - withValidRange,
  });

  // Don't filter toilets at clustering level to diagnose the issue
  // Just add logging for any invalid ones
  toilets.forEach((toilet, index) => {
    // Log any invalid toilets
    if (
      !toilet ||
      !toilet.location ||
      typeof toilet.location.latitude !== "number" ||
      typeof toilet.location.longitude !== "number"
    ) {
      debug.warn("Clustering", `Skipping invalid toilet at index ${index}`, {
        id: toilet?.id || "unknown",
        hasLocation: !!toilet?.location,
        latitudeType:
          toilet?.location ? typeof toilet.location.latitude : "N/A",
        longitudeType:
          toilet?.location ? typeof toilet.location.longitude : "N/A",
      });
      return; // Skip this toilet
    }
    const key = getClusterKey(
      toilet.location.latitude,
      toilet.location.longitude,
      zoom
    );

    if (!clusters[key]) {
      clusters[key] = {
        id: key,
        coordinate: {
          latitude: toilet.location.latitude,
          longitude: toilet.location.longitude,
        },
        points: [],
      };
    }

    clusters[key].points.push(toilet);

    // Update cluster center
    if (clusters[key].points.length > 1) {
      const points = clusters[key].points;
      const center = points.reduce(
        (acc, point) => ({
          latitude: acc.latitude + point.location.latitude / points.length,
          longitude: acc.longitude + point.location.longitude / points.length,
        }),
        { latitude: 0, longitude: 0 }
      );

      clusters[key].coordinate = center;
    }
  });

  return Object.values(clusters);
}
