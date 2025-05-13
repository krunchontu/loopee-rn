import { Region } from "react-native-maps";
import { Toilet } from "../types/toilet";

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
  clusterRadius: number = 50
): Cluster[] {
  const zoom = getZoomLevel(region);
  const clusters: { [key: string]: Cluster } = {};

  toilets.forEach((toilet) => {
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
