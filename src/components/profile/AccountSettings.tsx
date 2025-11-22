/**
 * @file Account Settings Component
 *
 * Component for managing account settings including password change,
 * email preferences, and account deletion
 */

import React, { useState } from "react";
import type { StyleProp, ViewStyle} from "react-native";
import { StyleSheet, View, Alert } from "react-native";
import {
  Button,
  Card,
  Divider,
  Switch,
  Text,
  TextInput,
  HelperText,
} from "react-native-paper";

import { colors, palette } from "../../foundations/colors";

export interface EmailPreferences {
  marketingEmails: boolean;
  notificationEmails: boolean;
  newsletterEmails: boolean;
}

interface AccountSettingsProps {
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onUpdateEmailPreferences: (preferences: EmailPreferences) => Promise<void>;
  style?: StyleProp<ViewStyle>;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  onChangePassword,
  onDeleteAccount,
  onUpdateEmailPreferences,
  style,
}) => {
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Email preferences state
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    marketingEmails: true,
    notificationEmails: true,
    newsletterEmails: false,
  });

  // Handle password change
  const handlePasswordChange = async () => {
    // Reset error state
    setPasswordError("");

    // Validate passwords
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    try {
      setIsSubmitting(true);
      await onChangePassword(currentPassword, newPassword);

      // Clear form on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert("Success", "Your password has been updated.");
    } catch (error) {
      setPasswordError(
        "Failed to change password. Please check your current password and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle email preferences toggle
  const toggleEmailPreference = (preference: keyof EmailPreferences) => {
    const updatedPreferences = {
      ...emailPreferences,
      [preference]: !emailPreferences[preference],
    };

    setEmailPreferences(updatedPreferences);
    onUpdateEmailPreferences(updatedPreferences).catch(() => {
      // Revert on error
      setEmailPreferences(emailPreferences);
      Alert.alert("Error", "Failed to update email preferences");
    });
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await onDeleteAccount();
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Password Section */}
      <Card style={styles.card}>
        <Card.Title title="Change Password" />
        <Card.Content>
          <TextInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            disabled={isSubmitting}
          />

          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            disabled={isSubmitting}
          />

          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            disabled={isSubmitting}
          />

          {passwordError ?
            <HelperText type="error">{passwordError}</HelperText>
          : null}

          <Button
            mode="contained"
            onPress={handlePasswordChange}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.button}
          >
            Update Password
          </Button>
        </Card.Content>
      </Card>

      {/* Email Preferences Section */}
      <Card style={styles.card}>
        <Card.Title title="Email Preferences" />
        <Card.Content>
          <View style={styles.preference}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Receive emails about account activity
              </Text>
            </View>
            <Switch
              value={emailPreferences.notificationEmails}
              onValueChange={() => toggleEmailPreference("notificationEmails")}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.preference}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Marketing</Text>
              <Text style={styles.preferenceDescription}>
                Receive promotional emails and offers
              </Text>
            </View>
            <Switch
              value={emailPreferences.marketingEmails}
              onValueChange={() => toggleEmailPreference("marketingEmails")}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.preference}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Newsletter</Text>
              <Text style={styles.preferenceDescription}>
                Receive monthly newsletters with updates
              </Text>
            </View>
            <Switch
              value={emailPreferences.newsletterEmails}
              onValueChange={() => toggleEmailPreference("newsletterEmails")}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Danger Zone Section */}
      <Card style={[styles.card, styles.dangerCard]}>
        <Card.Title title="Danger Zone" titleStyle={styles.dangerTitle} />
        <Card.Content>
          <Text style={styles.dangerText}>
            Deleting your account is permanent. All your data will be wiped out
            immediately and you will not be able to get it back.
          </Text>

          <Button
            mode="outlined"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
            textColor={palette.red[500]}
          >
            Delete Account
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
  },
  container: {
    padding: 8,
    width: "100%",
  },
  dangerCard: {
    borderColor: palette.red[500],
    borderLeftWidth: 4,
  },
  dangerText: {
    color: colors.text.secondary,
    marginBottom: 16,
  },
  dangerTitle: {
    color: palette.red[500],
  },
  deleteButton: {
    borderColor: palette.red[500],
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    backgroundColor: colors.background.primary,
    marginBottom: 8,
  },
  preference: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  preferenceDescription: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
  },
});

export default AccountSettings;
