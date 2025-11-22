import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback, memo } from "react";
import { View, Text, ScrollView, Image, StyleSheet } from "react-native";

import { ErrorState } from "../../components/shared/ErrorState";
import { LoadingState } from "../../components/shared/LoadingState";
import { Rating } from "../../components/shared/Rating";
import { Review } from "../../components/toilet/Review";
import { colors, spacing } from "../../constants/colors";
import { supabaseService } from "../../services/supabase";
import type { Toilet as ToiletType, Review as ReviewType } from "../../types/toilet";
import { debug } from "../../utils/debug";

export default memo(function DetailsScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toilet, setToilet] = useState<ToiletType | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);

  const fetchToiletDetails = useCallback(async () => {
    try {
      debug.log("DetailsScreen", `Fetching details for toilet ${id}`);
      setLoading(true);
      setError(null);

      const toiletData = await supabaseService.toilets.getById(id as string);
      const reviewsData = await supabaseService.reviews.getByToiletId(
        id as string
      );

      debug.log(
        "DetailsScreen",
        `Fetched toilet with ${reviewsData.length} reviews`
      );
      setToilet(toiletData);
      setReviews(reviewsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load toilet details";
      debug.error("DetailsScreen", "Error fetching toilet details", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchToiletDetails();
  }, [fetchToiletDetails]);

  if (loading) {
    return <LoadingState type="spinner" height={200} />;
  }

  if (error || !toilet) {
    return (
      <ErrorState
        error={error || "Toilet not found"}
        message="Failed to load toilet details"
        onRetry={fetchToiletDetails}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: toilet.name,
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.background.primary,
        }}
      />
      <ScrollView style={styles.container}>
        {toilet.photos && toilet.photos.length > 0 && (
          <Image source={{ uri: toilet.photos[0] }} style={styles.image} />
        )}

        <View style={styles.content}>
          <View style={styles.card}>
            <Rating value={toilet.rating} size="large" />
            <Text style={styles.openingHours}>
              {toilet.openingHours ?
                `${toilet.openingHours.open} - ${toilet.openingHours.close}`
              : "Opening hours not available"}
            </Text>

            {/* Building and floor information */}
            {(toilet.buildingName || toilet.floorName) && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Location</Text>
                {toilet.buildingName && (
                  <Text style={styles.locationDetail}>
                    Building: {toilet.buildingName}
                  </Text>
                )}
                {toilet.floorName && (
                  <Text style={styles.locationDetail}>
                    Floor: {toilet.floorName}
                    {typeof toilet.floorLevel === "number" &&
                      ` (${
                        toilet.floorLevel > 0 ? `Level ${toilet.floorLevel}`
                        : toilet.floorLevel < 0 ?
                          `Basement ${Math.abs(toilet.floorLevel)}`
                        : "Ground Floor"
                      })`}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesContainer}>
              {toilet.isAccessible && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>♿</Text>
                  <Text style={styles.amenityText}>Wheelchair Accessible</Text>
                </View>
              )}
              {toilet.amenities.hasBabyChanging && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>👶</Text>
                  <Text style={styles.amenityText}>Baby Changing</Text>
                </View>
              )}
              {toilet.amenities.hasHandDryer && (
                <View style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>💨</Text>
                  <Text style={styles.amenityText}>Hand Dryer</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviews.length > 0 ?
              reviews.map((review) => (
                <Review key={review.id} review={review} />
              ))
            : <Text style={styles.noReviews}>No reviews yet</Text>}
          </View>
        </View>
      </ScrollView>
    </>
  );
});

const styles = StyleSheet.create({
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityIcon: {
    fontSize: 16,
  },
  amenityItem: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
    marginRight: spacing.md,
  },
  amenityText: {
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  image: {
    height: 200,
    width: "100%",
  },
  locationDetail: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  locationInfo: {
    marginTop: spacing.md,
  },
  locationTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  noReviews: {
    color: colors.text.light,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  openingHours: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: spacing.sm,
  },
  reviewsSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
});
