/**
 * @file AddToiletForm component
 *
 * First step in toilet contribution process: basic information
 */

import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Title,
  Button,
  TextInput,
  Switch,
  Text,
  HelperText,
} from "react-native-paper";

import { colors, spacing } from "../../foundations";
import type { BaseStepProps } from "../../types/contribution";
import type { Toilet } from "../../types/toilet";

interface AddToiletFormProps extends BaseStepProps {
  toiletData: Partial<Toilet>;
  updateToiletData: (data: Partial<Toilet>) => void;
}

/**
 * Basic information form for adding a new toilet
 * First step in the multi-step toilet contribution process
 */
export const AddToiletForm: React.FC<AddToiletFormProps> = ({
  toiletData,
  updateToiletData,
  onNext,
}) => {
  const [name, setName] = useState(toiletData.name || "");
  const [isAccessible, setIsAccessible] = useState(
    toiletData.isAccessible || false
  );
  const [nameError, setNameError] = useState<string | null>(null);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    // Reset error states
    setNameError(null);

    // Validate name (required)
    if (!name.trim()) {
      setNameError("Please provide a name or description for the toilet");
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Update parent state with form data
    updateToiletData({
      name: name.trim(),
      isAccessible,
    });

    // Proceed to next step
    onNext();
  };

  /**
   * Handle name input change
   */
  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError && text.trim()) {
      setNameError(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Title style={styles.title}>Basic Information</Title>
      <Text style={styles.subtitle}>
        Let&apos;s start with some basic details about the toilet
      </Text>

      {/* Name/Description */}
      <TextInput
        label="Name or Description"
        value={name}
        onChangeText={handleNameChange}
        style={styles.input}
        mode="outlined"
        placeholder="E.g., Ground Floor Restroom, Mall Toilet Block A"
        error={!!nameError}
      />
      <HelperText type="error" visible={!!nameError}>
        {nameError}
      </HelperText>
      <Text style={styles.helperText}>
        Provide a name or brief description to help identify this toilet
        location
      </Text>

      {/* Accessibility */}
      <View style={styles.switchContainer}>
        <View style={styles.switchTextContainer}>
          <Text style={styles.switchLabel}>Wheelchair Accessible</Text>
          <Text style={styles.switchDescription}>
            This toilet has facilities for wheelchair users
          </Text>
        </View>
        <Switch
          value={isAccessible}
          onValueChange={setIsAccessible}
          color={colors.primary}
        />
      </View>

      {/* Guidance note */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>Adding a new toilet:</Text>
        <Text style={styles.guidanceText}>
          • Be specific with the name/description
        </Text>
        <Text style={styles.guidanceText}>
          • You&apos;ll add the exact location in the next step
        </Text>
        <Text style={styles.guidanceText}>
          • All submissions are reviewed before being published
        </Text>
      </View>

      {/* Submit button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Next: Location
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  button: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  buttonContainer: {
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
  helperText: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  input: {
    backgroundColor: colors.background.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  switchContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  switchDescription: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  switchLabel: {
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  switchTextContainer: {
    flex: 1,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
});
