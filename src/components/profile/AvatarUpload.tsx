/**
 * @file Avatar Upload Component
 *
 * Component for uploading and managing user avatar images
 */

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  Alert,
  Platform,
} from "react-native";
import { Avatar, IconButton, Text } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../foundations/colors";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onAvatarSelected: (url: string) => void;
  style?: StyleProp<ViewStyle>;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  onAvatarSelected,
  style,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  // Get initial letter for fallback avatar
  const getInitial = () => {
    return userId.charAt(0).toUpperCase();
  };

  // Request permission to access photos
  const requestPermission = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to upload an avatar!"
        );
        return false;
      }
    }
    return true;
  };

  // Handle picking an image from gallery
  const handlePickImage = useCallback(async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        handleUpload(selectedAsset.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  }, [userId]);

  // Handle uploading the image
  const handleUpload = async (uri: string) => {
    try {
      setIsUploading(true);

      // In a real implementation, upload the image to storage
      // For now just simulate a successful upload with a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return the URI as if it's the uploaded URL
      // In a real implementation, this would be the URL from the storage service
      onAvatarSelected(uri);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert(
        "Upload Failed",
        "Failed to upload avatar. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.avatarContainer}>
        {currentAvatarUrl ?
          <Avatar.Image
            source={{ uri: currentAvatarUrl }}
            size={120}
            style={styles.avatar}
          />
        : <Avatar.Text label={getInitial()} size={120} style={styles.avatar} />}

        <View style={styles.editIconContainer}>
          <IconButton
            icon="camera"
            iconColor={colors.background.primary}
            size={20}
            style={styles.editIcon}
            onPress={handlePickImage}
            disabled={isUploading}
          />
        </View>
      </View>

      <Text variant="bodySmall" style={styles.helpText}>
        Tap the camera icon to change your profile picture
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.brand.primary,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  container: {
    alignItems: "center",
    padding: 16,
  },
  editIcon: {
    backgroundColor: colors.interactive.primary.default,
    margin: 0,
  },
  editIconContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 50,
    bottom: 0,
    padding: 2,
    position: "absolute",
    right: 0,
  },
  helpText: {
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: "center",
  },
});

export default AvatarUpload;
