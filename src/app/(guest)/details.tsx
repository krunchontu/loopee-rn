import { View, Text, ScrollView, Image, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback, memo } from "react";
import { colors, spacing } from "../../constants/colors";
import { Rating } from "../../components/shared/Rating";
import { Review } from "../../components/toilet/Review";
import { LoadingState } from "../../components/shared/LoadingState";
import { ErrorState } from "../../components/shared/ErrorState";
import { supabaseService } from "../../services/supabase";
import { Toilet as ToiletType, Review as ReviewType } from "../../types/toilet";
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
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  image: {
    width: "100%",
    height: 200,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  openingHours: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.md,
    marginBottom: spacing.sm,
  },
  amenityIcon: {
    fontSize: 16,
  },
  amenityText: {
    marginLeft: spacing.xs,
    color: colors.text.secondary,
  },
  reviewsSection: {
    marginTop: spacing.sm,
  },
  noReviews: {
    color: colors.text.light,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
});
