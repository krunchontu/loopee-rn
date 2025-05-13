import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../constants/colors";

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
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginRight: 2,
    position: "relative",
  },
  starFill: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }],
  },
  starHalf: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }, { scaleX: 0.5 }],
  },
  starEmpty: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }],
  },
});
