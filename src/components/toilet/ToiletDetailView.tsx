import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Dimensions,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSizes, fontWeights } from "../../foundations";
import {
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../../foundations/responsive";
import { Rating } from "../shared/Rating";
import { Button } from "../shared/Button";
import { Toilet } from "../../types/toilet";
import { debug } from "../../utils/debug";

/**
 * ToiletDetailView
 *
 * A detailed view of a single toilet with all its information,
 * including address, facilities, ratings, and a way to leave reviews.
 *
 * Features:
 * - High contrast text for better readability
 * - Organized sections for easy scanning
 * - Directions integration with Google Maps
 * - Review submission option
 */
export default function ToiletDetailView() {
  const route = useRoute();
  const params = route.params as { toilet: Toilet };

  // Make sure params exist
  if (!params || !params.toilet) {
    debug.error("ToiletDetailView", "No toilet data provided");
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Toilet information not available</Text>
      </View>
    );
  }

  const { toilet } = params;

  // Format distance helper
  const formatDistance = (meters: number) => {
    if (!meters) return "";
    return meters < 1000 ?
        `${Math.round(meters)}m`
      : `${(meters / 1000).toFixed(1)}km`;
  };

  // Open directions in Google Maps
  const openDirections = () => {
    if (!toilet.location?.latitude || !toilet.location?.longitude) {
      debug.error("ToiletDetailView", "Cannot open directions: no coordinates");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${toilet.location.latitude},${toilet.location.longitude}`;
    Linking.openURL(url)
      .then(() => debug.log("ToiletDetailView", "Opening directions in maps"))
      .catch((err) =>
        debug.error("ToiletDetailView", "Failed to open maps", err)
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{toilet.name}</Text>
            {toilet.isAccessible && (
              <View style={styles.accessibleBadge}>
                <Text style={styles.badgeText}>♿</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingContainer}>
            <Rating value={toilet.rating} size="large" />
            <Text style={styles.reviewCount}>
              ({toilet.reviewCount || 0} reviews)
            </Text>
          </View>

          <View style={styles.locationInfo}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.address}>{toilet.address}</Text>
            {toilet.buildingName && (
              <Text style={styles.buildingInfo}>
                Building: {toilet.buildingName}
              </Text>
            )}
            {toilet.floorName && (
              <Text style={styles.floorInfo}>Floor: {toilet.floorName}</Text>
            )}
            {toilet.distance && (
              <Text style={styles.distance}>
                {formatDistance(toilet.distance)} away
              </Text>
            )}
          </View>

          <View style={styles.amenitiesContainer}>
            <Text style={styles.sectionTitle}>Facilities</Text>
            <View style={styles.amenitiesList}>
              {toilet.amenities.hasBabyChanging && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>👶</Text>
                  <Text style={styles.amenityText}>Baby Changing</Text>
                </View>
              )}
              {toilet.amenities.hasShower && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>🚿</Text>
                  <Text style={styles.amenityText}>Shower</Text>
                </View>
              )}
              {toilet.amenities.hasWaterSpray && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>💦</Text>
                  <Text style={styles.amenityText}>Water Spray</Text>
                </View>
              )}
              {toilet.isAccessible && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>♿</Text>
                  <Text style={styles.amenityText}>Wheelchair Accessible</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.reviewsContainer}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {/* Reviews component would be integrated here */}
          <Text style={styles.reviewPrompt}>
            Help others by leaving a review
          </Text>
          <Button
            title="Write a Review"
            onPress={() => {
              // Review form would be implemented here
              debug.log("ToiletDetailView", "Write review button pressed");
            }}
            style={styles.reviewButton}
            variant="secondary"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Get Directions"
          onPress={openDirections}
          style={styles.directionsButton}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  accessibleBadge: {
    alignItems: "center",
    backgroundColor: colors.interactive.secondary.default,
    borderRadius: 99,
    height: getResponsiveSpacing(36, SCREEN_WIDTH),
    justifyContent: "center",
    marginLeft: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    width: getResponsiveSpacing(36, SCREEN_WIDTH),
  },
  address: {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  amenitiesContainer: {
    marginBottom: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
  },
  amenitiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityIcon: {
    fontSize: fontSizes.lg,
    marginRight: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  amenityItem: {
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    marginRight: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
    paddingHorizontal: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
    paddingVertical: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
  },
  amenityText: {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(fontSizes.sm, SCREEN_WIDTH),
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
  },
  buildingInfo: {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
  },
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  directionsButton: {
    minHeight: getResponsiveSpacing(56, SCREEN_WIDTH),
  },
  distance: {
    color: colors.text.tertiary,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
    marginTop: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  errorText: {
    color: colors.status.error.foreground, // Using the status error color
    fontSize: getResponsiveFontSize(fontSizes.lg, SCREEN_WIDTH),
    textAlign: "center",
  },
  floorInfo: {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
    marginBottom: getResponsiveSpacing(spacing.xs, SCREEN_WIDTH),
  },
  footer: {
    borderTopColor: colors.border.light,
    borderTopWidth: 1,
    padding: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  },
  header: {
    borderBottomColor: colors.border.light,
    borderBottomWidth: 1,
    padding: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
  },
  locationInfo: {
    marginBottom: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
  },
  ratingContainer: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
  },
  reviewButton: {
    marginBottom: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
  },
  reviewCount: {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
    marginLeft: getResponsiveSpacing(spacing.sm, SCREEN_WIDTH),
  },
  reviewPrompt: {
    color: colors.text.secondary,
    fontSize: getResponsiveFontSize(fontSizes.md, SCREEN_WIDTH),
    marginBottom: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  },
  reviewsContainer: {
    padding: getResponsiveSpacing(spacing.lg, SCREEN_WIDTH),
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: getResponsiveFontSize(fontSizes.xl, SCREEN_WIDTH),
    fontWeight: fontWeights.semibold,
    marginBottom: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  },
  title: {
    color: colors.text.primary,
    flex: 1,
    fontSize: getResponsiveFontSize(fontSizes.xxxl, SCREEN_WIDTH),
    fontWeight: fontWeights.bold,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: getResponsiveSpacing(spacing.md, SCREEN_WIDTH),
  },
});
