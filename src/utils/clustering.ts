import type { Region } from "react-native-maps";

import { debug } from "./debug";
import type { Toilet } from "../types/toilet";

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
  zoom: number,
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

export function clusterToilets(toilets: Toilet[], region: Region): Cluster[] {
  const zoom = getZoomLevel(region);

  const clusters: { [key: string]: Cluster } = {};
  let skipped = 0;

  for (const toilet of toilets) {
    if (
      !toilet?.location ||
      typeof toilet.location.latitude !== "number" ||
      typeof toilet.location.longitude !== "number"
    ) {
      skipped++;
      continue;
    }

    const key = getClusterKey(
      toilet.location.latitude,
      toilet.location.longitude,
      zoom,
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
  }

  // Compute cluster centers for multi-point clusters
  for (const cluster of Object.values(clusters)) {
    if (cluster.points.length > 1) {
      let latSum = 0;
      let lngSum = 0;
      for (const point of cluster.points) {
        latSum += point.location.latitude;
        lngSum += point.location.longitude;
      }
      cluster.coordinate = {
        latitude: latSum / cluster.points.length,
        longitude: lngSum / cluster.points.length,
      };
    }
  }

  if (skipped > 0) {
    debug.warn(
      "Clustering",
      `Skipped ${skipped}/${toilets.length} toilets with invalid coordinates`,
    );
  }

  return Object.values(clusters);
}
