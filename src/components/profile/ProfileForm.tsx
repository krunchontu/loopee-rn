/**
 * @file Profile Form Component
 *
 * Form component for editing user profile information
 */

import React, { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { Button, TextInput, HelperText } from "react-native-paper";

import { colors } from "../../foundations/colors";
import type { UserProfile } from "../../types/user";

interface ProfileFormProps {
  profile: UserProfile;
  onSubmit: (data: Partial<UserProfile>) => Promise<void>;
  isSubmitting: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Form component for editing user profile information
 */
const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  onSubmit,
  isSubmitting,
  style,
}) => {
  // Form state
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");

  // Form validation state
  const [errors, setErrors] = useState<{
    displayName?: string;
    username?: string;
    bio?: string;
  }>({});

  // Validate form fields
  const validate = () => {
    const newErrors: {
      displayName?: string;
      username?: string;
      bio?: string;
    } = {};

    // Display name validation (required, min length)
    if (!displayName.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = "Display name must be at least 2 characters";
    }

    // Username validation (required, no spaces, alphanumeric)
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.includes(" ")) {
      newErrors.username = "Username cannot contain spaces";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    // Bio validation (optional, max length)
    if (bio.length > 160) {
      newErrors.bio = "Bio cannot exceed 160 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validate()) return;

    // Prepare updated profile data
    const updatedProfile: Partial<UserProfile> = {
      display_name: displayName.trim(),
      username: username.trim(),
      bio: bio.trim() || undefined, // Use undefined if bio is empty
    };

    await onSubmit(updatedProfile);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Display Name Field */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          mode="outlined"
          autoCapitalize="words"
          error={!!errors.displayName}
          disabled={isSubmitting}
          style={styles.input}
        />
        {errors.displayName && (
          <HelperText type="error">{errors.displayName}</HelperText>
        )}
      </View>

      {/* Username Field */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          error={!!errors.username}
          disabled={isSubmitting}
          style={styles.input}
          left={<TextInput.Affix text="@" />}
        />
        {errors.username && (
          <HelperText type="error">{errors.username}</HelperText>
        )}
      </View>

      {/* Bio Field */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={4}
          maxLength={160}
          error={!!errors.bio}
          disabled={isSubmitting}
          style={styles.input}
        />
        <HelperText type={errors.bio ? "error" : "info"}>
          {errors.bio || `${bio.length}/160 characters`}
        </HelperText>
      </View>

      {/* Submit Button */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
      >
        Save Changes
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  input: {
    backgroundColor: colors.background.primary,
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
    width: "100%",
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
});

export default ProfileForm;
