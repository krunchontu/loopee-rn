/**
 * @file StepIndicator component
 *
 * Visual indicator for multi-step forms showing the current step and progress
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import { colors, spacing } from "../../foundations";

interface StepIndicatorProps {
  steps: string[]; // Array of step titles
  currentStep: number; // Zero-based index of current step
}

/**
 * Visual indicator component that shows multiple steps and highlights the current step
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
}) => {
  // Ensure current step is within bounds
  const activeStep = Math.max(0, Math.min(currentStep, steps.length - 1));

  return (
    <View style={styles.container}>
      {/* Progress bar showing completion percentage */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${((activeStep + 0.5) / steps.length) * 100}%` },
          ]}
        />
      </View>

      {/* Step indicators */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View
            key={index}
            style={[
              styles.stepItem,
              {
                width: `${100 / steps.length}%`,
                opacity: index <= activeStep ? 1 : 0.6,
              },
            ]}
          >
            <View
              style={[
                styles.stepCircle,
                index < activeStep ? styles.completedStepCircle
                : index === activeStep ? styles.activeStepCircle
                : styles.inactiveStepCircle,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  index === activeStep ? styles.activeStepNumber
                  : index < activeStep ? styles.completedStepNumber
                  : styles.inactiveStepNumber,
                ]}
              >
                {index < activeStep ? "✓" : (index + 1).toString()}
              </Text>
            </View>
            <Text
              style={[
                styles.stepTitle,
                index === activeStep ? styles.activeStepTitle : null,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeStepCircle: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activeStepNumber: {
    color: colors.text.inverse,
    fontWeight: "bold",
  },
  activeStepTitle: {
    color: colors.text.primary,
    fontWeight: "bold",
  },
  completedStepCircle: {
    backgroundColor: colors.status.success.foreground,
    borderColor: colors.status.success.foreground,
  },
  completedStepNumber: {
    color: colors.text.inverse,
  },
  container: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inactiveStepCircle: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.ui.border,
  },
  inactiveStepNumber: {
    color: colors.text.secondary,
  },
  progressBar: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: 4,
  },
  progressBarContainer: {
    backgroundColor: colors.ui.divider,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.sm,
    width: "100%",
  },
  stepCircle: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    marginBottom: spacing.xs / 2,
    width: 28,
  },
  stepItem: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  stepNumber: {
    fontSize: 14,
    textAlign: "center",
  },
  stepTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    textAlign: "center",
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
