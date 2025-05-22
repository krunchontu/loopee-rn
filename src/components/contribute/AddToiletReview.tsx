/**
 * @file AddToiletReview component
 *
 * Final step in toilet contribution process: review and submission
 * Includes safeguards against duplicate submissions
 */

import React, { useState, useRef } from "react";
import { View, StyleSheet, ScrollView, Image, Alert } from "react-native";
import { Title, Button, Text, Divider, Card } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BaseStepProps } from "../../types/contribution";
import { Toilet } from "../../types/toilet";
import { colors, spacing } from "../../foundations";
import { contributionService } from "../../services/contributionService";
import { debug } from "../../utils/debug";

interface AddToiletReviewProps extends Omit<BaseStepProps, "onNext"> {
  toiletData: Partial<Toilet>;
  onSubmit: () => void;
}

/**
 * Review step in toilet contribution form
 * Shows summary of entered information and allows final submission
 */
export const AddToiletReview: React.FC<AddToiletReviewProps> = ({
  toiletData,
  onSubmit,
  onBack,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use a ref to track submission status synchronously (without re-renders)
  // This prevents duplicate submissions even before React's state updates
  const isSubmittingRef = useRef(false);
  // No profile validation needed - we now use auth UID directly in the contribution service

  /**
   * Format address and floor information
   */
  const formatLocationInfo = () => {
    const parts = [];
    if (toiletData.address) parts.push(toiletData.address);

    if (toiletData.buildingName) {
      parts.push(`Building: ${toiletData.buildingName}`);
    }

    if (toiletData.floorLevel !== undefined) {
      const floorText =
        toiletData.floorLevel < 0 ?
          `B${Math.abs(toiletData.floorLevel)}`
        : `Level ${toiletData.floorLevel}`;
      parts.push(`Floor: ${floorText}`);
    }

    return parts.join("\n");
  };

  /**
   * Handle form submission with duplicate submission prevention
   * Uses both React state (for UI updates) and a ref (for immediate synchronous checks)
   */
  const handleSubmit = async () => {
    // Check the ref first to prevent rapid double-submissions
    // This provides an immediate guard that works even before React updates the UI
    if (isSubmittingRef.current) {
      debug.log("AddToiletReview", "Prevented duplicate submission attempt");
      return;
    }

    try {
      // Set both the state (for UI) and the ref (for synchronous checks)
      setSubmitting(true);
      isSubmittingRef.current = true;
      setError(null);

      // Validate that we have required data before submission
      if (!toiletData.name?.trim()) {
        setError("Name/Description is required before submission");
        return;
      }

      if (!toiletData.location) {
        setError("Location is required before submission");
        return;
      }

      // Debug submission data
      debug.log("AddToiletReview", "Submitting toilet data", {
        name: toiletData.name,
        hasLocation: !!toiletData.location,
        amenitiesSet: !!toiletData.amenities,
        hasPhotos: toiletData.photos && toiletData.photos.length > 0,
      });

      // Submit toilet via service
      await contributionService.submitNewToilet(toiletData);

      // Show success notification
      Alert.alert(
        "Submission Successful",
        "Thank you for your contribution! Your toilet submission will be reviewed by our moderators."
      );

      // Call the onSubmit callback
      onSubmit();
    } catch (err: any) {
      debug.error("AddToiletReview", "Error submitting toilet", err);

      // Provide more detailed error messages to help users understand issues
      let errorMessage = "Failed to submit toilet. Please try again.";

      if (err?.message) {
        if (err.message.includes("row-level security policy")) {
          errorMessage =
            "Authorization error: Unable to submit with your current account permissions. Please log out and log back in.";
        } else if (err.message.includes("network")) {
          errorMessage =
            "Network error: Please check your internet connection and try again.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);

      // Show an alert for critical errors
      Alert.alert("Submission Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setSubmitting(false);
      // Important: Reset the ref when done, allowing future submissions
      isSubmittingRef.current = false;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Title style={styles.title}>Review & Submit</Title>
      <Text style={styles.subtitle}>
        Please review your toilet information before submitting
      </Text>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color={colors.status.error.foreground}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Basic info section */}
      <Card style={styles.sectionCard}>
        <Card.Title
          title="Basic Information"
          left={(props) => (
            <MaterialCommunityIcons
              {...props}
              name="information-outline"
              size={24}
              color={colors.primary}
            />
          )}
        />
        <Card.Content>
          <Text style={styles.fieldTitle}>Name/Description</Text>
          <Text style={styles.fieldValue}>
            {toiletData.name || "Not provided"}
          </Text>

          <Divider style={styles.fieldDivider} />

          <Text style={styles.fieldTitle}>Wheelchair Accessible</Text>
          <View style={styles.booleanField}>
            <MaterialCommunityIcons
              name={toiletData.isAccessible ? "check-circle" : "close-circle"}
              size={20}
              color={
                toiletData.isAccessible ?
                  colors.status.success.foreground
                : colors.text.secondary
              }
            />
            <Text style={styles.booleanText}>
              {toiletData.isAccessible ? "Yes" : "No"}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Location section */}
      <Card style={styles.sectionCard}>
        <Card.Title
          title="Location"
          left={(props) => (
            <MaterialCommunityIcons
              {...props}
              name="map-marker"
              size={24}
              color={colors.primary}
            />
          )}
        />
        <Card.Content>
          {toiletData.location && (
            <View style={styles.mapPreviewContainer}>
              <Image
                source={{
                  uri: `https://maps.googleapis.com/maps/api/staticmap?center=${toiletData.location.latitude},${toiletData.location.longitude}&zoom=16&size=400x200&maptype=roadmap&markers=color:red%7C${toiletData.location.latitude},${toiletData.location.longitude}&key=YOUR_API_KEY`,
                }}
                style={styles.mapPreview}
                defaultSource={require("../../../assets/icon.png")}
              />
            </View>
          )}

          <Text style={styles.fieldTitle}>Address</Text>
          <Text style={styles.fieldValue}>{formatLocationInfo()}</Text>

          <Text style={styles.fieldTitle}>Coordinates</Text>
          <Text style={styles.fieldValue}>
            {toiletData.location ?
              `${toiletData.location.latitude.toFixed(
                5
              )}, ${toiletData.location.longitude.toFixed(5)}`
            : "Not set"}
          </Text>
        </Card.Content>
      </Card>

      {/* Amenities section */}
      <Card style={styles.sectionCard}>
        <Card.Title
          title="Amenities"
          left={(props) => (
            <MaterialCommunityIcons
              {...props}
              name="shower"
              size={24}
              color={colors.primary}
            />
          )}
        />
        <Card.Content>
          {toiletData.amenities ?
            <View style={styles.amenitiesContainer}>
              <AmenityItem
                name="Baby Changing Station"
                value={toiletData.amenities.hasBabyChanging}
              />
              <AmenityItem
                name="Shower Available"
                value={toiletData.amenities.hasShower}
              />
              <AmenityItem
                name="Gender Neutral"
                value={toiletData.amenities.isGenderNeutral}
              />
              <AmenityItem
                name="Paper Towels"
                value={toiletData.amenities.hasPaperTowels}
              />
              <AmenityItem
                name="Hand Dryer"
                value={toiletData.amenities.hasHandDryer}
              />
              <AmenityItem
                name="Water Spray / Bidet"
                value={toiletData.amenities.hasWaterSpray}
              />
              <AmenityItem
                name="Soap Available"
                value={toiletData.amenities.hasSoap}
              />
            </View>
          : <Text style={styles.fieldValue}>No amenities specified</Text>}
        </Card.Content>
      </Card>

      {/* Photos section */}
      <Card style={styles.sectionCard}>
        <Card.Title
          title="Photos"
          left={(props) => (
            <MaterialCommunityIcons
              {...props}
              name="camera"
              size={24}
              color={colors.primary}
            />
          )}
        />
        <Card.Content>
          {toiletData.photos && toiletData.photos.length > 0 ?
            <View style={styles.photosPreviewContainer}>
              {toiletData.photos.map((uri, index) => (
                <Image
                  key={`photo-${index}`}
                  source={{ uri }}
                  style={styles.photoThumbnail}
                />
              ))}
            </View>
          : <Text style={styles.fieldValue}>No photos provided</Text>}
        </Card.Content>
      </Card>

      {/* Submission note */}
      <View style={styles.submissionNote}>
        <Text style={styles.submissionText}>
          By submitting this toilet, you confirm that the information provided
          is accurate to the best of your knowledge. All submissions are subject
          to review before being published.
        </Text>
      </View>

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={styles.button}
          contentStyle={styles.buttonContent}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          contentStyle={styles.buttonContent}
          disabled={submitting}
          loading={submitting}
        >
          Submit
        </Button>
      </View>
    </ScrollView>
  );
};

/**
 * Helper component to display amenity items
 */
const AmenityItem = ({ name, value }: { name: string; value: boolean }) => (
  <View style={styles.amenityItem}>
    <MaterialCommunityIcons
      name={value ? "check-circle" : "close-circle"}
      size={20}
      color={value ? colors.status.success.foreground : colors.text.secondary}
      style={styles.amenityIcon}
    />
    <Text style={styles.amenityText}>{name}</Text>
  </View>
);

const styles = StyleSheet.create({
  amenitiesContainer: {
    marginTop: spacing.xs,
  },
  amenityIcon: {
    marginRight: spacing.sm,
  },
  amenityItem: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  amenityText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  booleanField: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  booleanText: {
    color: colors.text.primary,
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  button: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
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
  errorContainer: {
    alignItems: "center",
    backgroundColor: colors.status.error.background || "#FFF1F0",
    borderColor: colors.status.error.foreground,
    borderLeftWidth: 4,
    borderRadius: 4,
    flexDirection: "row",
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorIcon: {
    marginRight: spacing.sm,
  },
  errorText: {
    color: colors.status.error.foreground,
    flex: 1,
    fontSize: 14,
  },
  fieldDivider: {
    backgroundColor: colors.ui.divider,
    height: 1,
    marginVertical: spacing.sm,
  },
  fieldTitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  fieldValue: {
    color: colors.text.primary,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  mapPreview: {
    borderRadius: 8,
    height: 150,
    width: "100%",
  },
  mapPreviewContainer: {
    borderRadius: 8,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  photoThumbnail: {
    borderRadius: 6,
    height: 80,
    marginRight: spacing.xs,
    width: 80,
  },
  photosPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.md,
  },
  submissionNote: {
    backgroundColor: colors.status.info.background,
    borderColor: colors.status.info.foreground,
    borderLeftWidth: 4,
    borderRadius: 4,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  submissionText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
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
