/**
 * @file AddToiletPhotos component
 *
 * Fourth step in toilet contribution process: photo upload
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Image, Pressable } from "react-native";
import { Title, Button, Text, ActivityIndicator } from "react-native-paper";

import { colors, spacing } from "../../foundations";
import type { BaseStepProps } from "../../types/contribution";

interface AddToiletPhotosProps extends BaseStepProps {
  photos?: string[];
  updateToiletData: (data: { photos: string[] }) => void;
}

/**
 * Photo upload step in toilet contribution form
 * Allows users to add photos of the toilet
 */
export const AddToiletPhotos: React.FC<AddToiletPhotosProps> = ({
  photos = [],
  updateToiletData,
  onNext,
  onBack,
}) => {
  const [localPhotos, setLocalPhotos] = useState<string[]>([...photos]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request camera and media library permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    // Request camera permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      setError("Camera permission is required to take photos");
      return false;
    }

    // Request media library permissions
    const libraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libraryPermission.granted) {
      setError("Photo library permission is required to select photos");
      return false;
    }

    return true;
  };

  /**
   * Handle photo selection from camera
   */
  const handleTakePhoto = async () => {
    setError(null);
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      setUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri;
        // In a real app, we would upload the image to storage here
        // and store the URL instead of the local URI
        setLocalPhotos((prev) => [...prev, photoUri]);
      }
    } catch (err) {
      console.error("Error taking photo:", err);
      setError("Failed to take photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle photo selection from library
   */
  const handleSelectPhoto = async () => {
    setError(null);
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        allowsMultipleSelection: true,
        selectionLimit: 5 - localPhotos.length, // Limit total photos to 5
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUris = result.assets.map((asset) => asset.uri);
        // In a real app, we would upload the images to storage here
        // and store the URLs instead of the local URIs
        setLocalPhotos((prev) => [...prev, ...photoUris]);
      }
    } catch (err) {
      console.error("Error selecting photo:", err);
      setError("Failed to select photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle removing a photo
   */
  const handleRemovePhoto = (index: number) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    // Update parent state with photos data
    updateToiletData({
      photos: localPhotos,
    });

    // Proceed to next step
    onNext();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Title style={styles.title}>Toilet Photos</Title>
      <Text style={styles.subtitle}>
        Add photos to help others identify this toilet (optional)
      </Text>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Photo grid */}
      <View style={styles.photoGrid}>
        {localPhotos.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.photoContainer}>
            <Image source={{ uri }} style={styles.photo} />
            <Pressable
              style={styles.removeButton}
              onPress={() => handleRemovePhoto(index)}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={24}
                color={colors.status.error.foreground}
              />
            </Pressable>
          </View>
        ))}

        {/* Add photo buttons */}
        {localPhotos.length < 5 && !uploading && (
          <View style={styles.addPhotoContainer}>
            <View style={styles.addButtonsContainer}>
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleTakePhoto}
                style={styles.photoButton}
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={handleSelectPhoto}
                style={styles.photoButton}
              >
                Select Photos
              </Button>
            </View>
            <Text style={styles.photoLimit}>
              {5 - localPhotos.length} photo
              {5 - localPhotos.length !== 1 && "s"} remaining
            </Text>
          </View>
        )}

        {/* Loading state */}
        {uploading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Processing photo...</Text>
          </View>
        )}
      </View>

      {/* Guidance note */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>Photo Guidelines:</Text>
        <Text style={styles.guidanceText}>
          • Take clear photos of the toilet and amenities
        </Text>
        <Text style={styles.guidanceText}>
          • Do not include people in your photos
        </Text>
        <Text style={styles.guidanceText}>
          • Photos help others identify and verify the location
        </Text>
        <Text style={styles.guidanceText}>
          • All photos are reviewed before being published
        </Text>
      </View>

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
          disabled={uploading}
        >
          Next: Review
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  addButtonsContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xs,
    width: "100%",
  },
  addPhotoContainer: {
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderColor: colors.ui.border,
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 160,
    justifyContent: "center",
    marginVertical: spacing.sm,
    padding: spacing.sm,
    width: "100%",
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
  errorText: {
    color: colors.status.error.foreground,
    marginBottom: spacing.sm,
  },
  guidanceContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  guidanceText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  guidanceTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    height: 160,
    justifyContent: "center",
    marginVertical: spacing.sm,
    padding: spacing.md,
    width: "100%",
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  photo: {
    borderRadius: 8,
    height: "100%",
    width: "100%",
  },
  photoButton: {
    marginHorizontal: spacing.xs,
  },
  photoContainer: {
    borderRadius: 8,
    height: 160,
    marginVertical: spacing.sm,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  photoGrid: {
    marginTop: spacing.sm,
    width: "100%",
  },
  photoLimit: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  removeButton: {
    position: "absolute",
    right: 8,
    top: 8,
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
