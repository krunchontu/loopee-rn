/**
 * @file AddToiletAmenities component
 *
 * Third step in toilet contribution process: amenities selection
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Title, Button, Text, List, Switch } from "react-native-paper";

import { colors, spacing } from "../../foundations";
import type { BaseStepProps } from "../../types/contribution";
import type { Toilet } from "../../types/toilet";

interface AddToiletAmenitiesProps extends BaseStepProps {
  amenities?: Toilet["amenities"];
  isAccessible?: boolean;
  updateToiletData: (data: {
    amenities: Toilet["amenities"];
    isAccessible: boolean;
  }) => void;
}

interface AmenityOption {
  key: keyof Toilet["amenities"];
  label: string;
  icon: any; // MaterialCommunityIcons name
  description: string;
}

/**
 * Amenities selection step in toilet contribution form
 * Allows users to specify available amenities in the toilet
 */
export const AddToiletAmenities: React.FC<AddToiletAmenitiesProps> = ({
  amenities = {
    hasBabyChanging: false,
    hasShower: false,
    isGenderNeutral: false,
    hasPaperTowels: false,
    hasHandDryer: false,
    hasWaterSpray: false,
    hasSoap: false,
  },
  isAccessible = false,
  updateToiletData,
  onNext,
  onBack,
}) => {
  // Create a local state copy of amenities
  const [localAmenities, setLocalAmenities] = React.useState<
    Toilet["amenities"]
  >({ ...amenities });
  const [localIsAccessible, setLocalIsAccessible] =
    React.useState(isAccessible);

  /**
   * Toggle an amenity value
   */
  const toggleAmenity = (key: keyof Toilet["amenities"]) => {
    setLocalAmenities({
      ...localAmenities,
      [key]: !localAmenities[key],
    });
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    // Update parent state with amenities data
    updateToiletData({
      amenities: localAmenities,
      isAccessible: localIsAccessible,
    });

    // Proceed to next step
    onNext();
  };

  // List of amenity options with descriptive information
  const amenityOptions: AmenityOption[] = [
    {
      key: "hasBabyChanging",
      label: "Baby Changing Station",
      icon: "human-baby-changing-table",
      description: "Facility for changing diapers/nappies",
    },
    {
      key: "hasShower",
      label: "Shower Available",
      icon: "shower",
      description: "Shower facilities are available",
    },
    {
      key: "isGenderNeutral",
      label: "Gender Neutral",
      icon: "gender-male-female",
      description: "Toilets are not gender-specific",
    },
    {
      key: "hasPaperTowels",
      label: "Paper Towels",
      icon: "hand-wash",
      description: "Paper towels available for hand-drying",
    },
    {
      key: "hasHandDryer",
      label: "Hand Dryer",
      icon: "hair-dryer",
      description: "Electric hand dryer available",
    },
    {
      key: "hasWaterSpray",
      label: "Water Spray / Bidet",
      icon: "water",
      description: "Water spray or bidet facility available",
    },
    {
      key: "hasSoap",
      label: "Soap Available",
      icon: "hand-wash-outline",
      description: "Hand soap is provided",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Title style={styles.title}>Toilet Amenities</Title>
      <Text style={styles.subtitle}>
        Select all amenities that are available at this toilet
      </Text>

      {/* Accessibility - moved from first step for confirmation */}
      <View style={styles.accessibilityContainer}>
        <View style={styles.accessibilityContent}>
          <MaterialCommunityIcons
            name="wheelchair-accessibility"
            size={24}
            color={localIsAccessible ? colors.primary : colors.text.secondary}
            style={styles.accessibilityIcon}
          />
          <View style={styles.accessibilityText}>
            <Text style={styles.accessibilityTitle}>Wheelchair Accessible</Text>
            <Text style={styles.accessibilityDescription}>
              This toilet has facilities for wheelchair users
            </Text>
          </View>
        </View>
        <Switch
          value={localIsAccessible}
          onValueChange={setLocalIsAccessible}
          color={colors.primary}
        />
      </View>

      <View style={styles.divider} />

      {/* Amenities list */}
      <List.Section>
        <List.Subheader style={styles.listSubheader}>
          Available Amenities
        </List.Subheader>

        {amenityOptions.map((amenity) => (
          <List.Item
            key={amenity.key}
            title={amenity.label}
            description={amenity.description}
            left={(props) => (
              <MaterialCommunityIcons
                {...props}
                name={amenity.icon}
                size={24}
                color={
                  localAmenities[amenity.key] ?
                    colors.primary
                  : colors.text.secondary
                }
                style={styles.amenityIcon}
              />
            )}
            right={() => (
              <Switch
                value={localAmenities[amenity.key]}
                onValueChange={() => toggleAmenity(amenity.key)}
                color={colors.primary}
              />
            )}
            onPress={() => toggleAmenity(amenity.key)}
            style={styles.listItem}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
        ))}
      </List.Section>

      {/* Guidance note */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceText}>
          Please select all amenities that you&apos;ve verified are available at
          this toilet. This information helps others find facilities that meet
          their needs.
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
        >
          Next: Photos
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  accessibilityContainer: {
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  accessibilityContent: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  accessibilityDescription: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  accessibilityIcon: {
    marginRight: spacing.sm,
  },
  accessibilityText: {
    flex: 1,
  },
  accessibilityTitle: {
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: spacing.xs / 2,
  },
  amenityIcon: {
    marginLeft: spacing.xs,
    marginRight: 0,
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
  divider: {
    backgroundColor: colors.ui.divider,
    height: 1,
    marginBottom: spacing.md,
    width: "100%",
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
    lineHeight: 20,
  },
  listItem: {
    paddingVertical: spacing.xs,
  },
  listItemDescription: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  listItemTitle: {
    color: colors.text.primary,
    fontSize: 16,
  },
  listSubheader: {
    color: colors.text.branded,
    fontSize: 16,
    fontWeight: "700",
    paddingLeft: spacing.xs,
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
