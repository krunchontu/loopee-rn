import React from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "../../constants/colors";

// Constants for ESLint compliance
const TRANSPARENT = "transparent";

interface RatingProps {
  value: number;
  size?: "small" | "medium" | "large";
  maxStars?: number;
}

const STAR_SIZES = {
  small: 12,
  medium: 16,
  large: 24,
};

export function Rating({ value, size = "medium", maxStars = 5 }: RatingProps) {
  const starSize = STAR_SIZES[size];

  return (
    <View style={styles.container}>
      {[...Array(maxStars)].map((_, index) => {
        const isFilled = index < Math.floor(value);
        const isHalf = index === Math.floor(value) && value % 1 !== 0;

        return (
          <View
            key={index}
            style={[
              styles.star,
              {
                width: starSize,
                height: starSize,
              },
            ]}
          >
            {/* Full star */}
            {isFilled && (
              <View
                style={[
                  styles.starFill,
                  {
                    borderWidth: starSize / 4,
                    borderColor: colors.primary,
                  },
                ]}
              />
            )}
            {/* Half star */}
            {isHalf && (
              <View
                style={[
                  styles.starHalf,
                  {
                    borderWidth: starSize / 4,
                    borderColor: colors.primary,
                  },
                ]}
              />
            )}
            {/* Empty star */}
            {!isFilled && !isHalf && (
              <View
                style={[
                  styles.starEmpty,
                  {
                    borderWidth: starSize / 8,
                    borderColor: colors.text.light,
                  },
                ]}
              />
            )}
          </View>
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
  star: {
    marginRight: 2,
    position: "relative",
  },
  starEmpty: {
    backgroundColor: TRANSPARENT,
    borderBottomWidth: 0,
    borderLeftColor: TRANSPARENT,
    borderLeftWidth: 0,
    borderRightColor: TRANSPARENT,
    borderRightWidth: 0,
    borderStyle: "solid",
    borderTopColor: TRANSPARENT,
    height: 0,
    position: "absolute",
    transform: [{ rotate: "180deg" }],
    width: 0,
  },
  starFill: {
    backgroundColor: TRANSPARENT,
    borderBottomWidth: 0,
    borderLeftColor: TRANSPARENT,
    borderLeftWidth: 0,
    borderRightColor: TRANSPARENT,
    borderRightWidth: 0,
    borderStyle: "solid",
    borderTopColor: TRANSPARENT,
    height: 0,
    position: "absolute",
    transform: [{ rotate: "180deg" }],
    width: 0,
  },
  starHalf: {
    backgroundColor: TRANSPARENT,
    borderBottomWidth: 0,
    borderLeftColor: TRANSPARENT,
    borderLeftWidth: 0,
    borderRightColor: TRANSPARENT,
    borderRightWidth: 0,
    borderStyle: "solid",
    borderTopColor: TRANSPARENT,
    height: 0,
    position: "absolute",
    transform: [{ rotate: "180deg" }, { scaleX: 0.5 }],
    width: 0,
  },
});
