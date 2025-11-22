/**
 * @file EditableRating component
 *
 * Interactive star rating component that allows users to set ratings
 * Uses React Native Paper IconButton for consistent UI
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { IconButton } from "react-native-paper";

import { colors } from "../../foundations";

interface EditableRatingProps {
  value: number;
  size?: "small" | "medium" | "large";
  maxStars?: number;
  onChange: (rating: number) => void;
}

const STAR_SIZES = {
  small: 16,
  medium: 24,
  large: 32,
};

/**
 * Interactive rating component that allows users to select a star rating
 * Uses MaterialCommunityIcons star and star-outline icons from React Native Paper
 */
export function EditableRating({
  value,
  size = "medium",
  maxStars = 5,
  onChange,
}: EditableRatingProps) {
  const iconSize = STAR_SIZES[size];

  return (
    <View style={styles.container}>
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1; // Star values are 1-based
        const isFilled = starValue <= value;

        return (
          <IconButton
            key={index}
            icon={isFilled ? "star" : "star-outline"}
            iconColor={isFilled ? colors.primary : colors.text.secondary}
            size={iconSize}
            onPress={() => onChange(starValue)}
            accessibilityLabel={`Rate ${starValue} out of ${maxStars} stars`}
            accessibilityRole="button"
            accessibilityState={{ selected: isFilled }}
            style={styles.starButton}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
  },
  starButton: {
    margin: -4, // Reduce default IconButton padding to bring stars closer together
  },
});
