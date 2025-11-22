/**
 * @file AddToiletScreen
 *
 * Main screen for adding a new toilet. Contains a multi-step form process.
 */

import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, View, SafeAreaView } from "react-native";
import { Appbar } from "react-native-paper";

import { AddToiletAmenities } from "../../components/contribute/AddToiletAmenities";
import { AddToiletForm } from "../../components/contribute/AddToiletForm";
import { AddToiletLocation } from "../../components/contribute/AddToiletLocation";
import { AddToiletPhotos } from "../../components/contribute/AddToiletPhotos";
import { AddToiletReview } from "../../components/contribute/AddToiletReview";
import { StepIndicator } from "../../components/contribute/StepIndicator";
import { colors } from "../../foundations";
import { contributionService } from "../../services/contributionService";
import type { Toilet } from "../../types/toilet";

/**
 * Screen for adding a new toilet with multi-step form
 */
const AddToiletScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [toiletData, setToiletData] = useState<Partial<Toilet>>({
    name: "",
    isAccessible: false,
    location: { latitude: 0, longitude: 0 },
    address: "",
    amenities: {
      hasBabyChanging: false,
      hasShower: false,
      isGenderNeutral: false,
      hasPaperTowels: false,
      hasHandDryer: false,
      hasWaterSpray: false,
      hasSoap: false,
    },
    photos: [],
  });

  // Steps data
  const steps = [
    { title: "Basic Info" },
    { title: "Location" },
    { title: "Amenities" },
    { title: "Photos" },
    { title: "Review" },
  ];

  /**
   * Update toilet data with partial changes
   */
  const updateToiletData = (data: Partial<Toilet>) => {
    setToiletData((prev) => ({ ...prev, ...data }));
  };

  /**
   * Navigate to next step
   */
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Navigate to previous step
   */
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Navigate to specific step (used for step indicator navigation)
   * Note: Currently not used directly but kept for potential future enhancement
   */
  const _goToStep = (stepIndex: number) => {
    // Only allow going to completed steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  /**
   * Handle submission of the toilet data
   */
  const handleSubmit = async () => {
    try {
      // Submit to the contribution service
      const _submissionResult =
        await contributionService.submitNewToilet(toiletData);

      // Navigate back to previous screen after success
      navigation.goBack();

      // You could also navigate to a success screen or the submission details screen
      // navigation.navigate('SubmissionSuccess', { submissionId: submissionResult.id });
    } catch (error) {
      console.error("Error submitting toilet:", error);
      throw error;
    }
  };

  /**
   * Render current step component
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AddToiletForm
            toiletData={toiletData}
            updateToiletData={updateToiletData}
            onNext={goToNextStep}
            onBack={goToPreviousStep} // Required by interface but not used in first step
          />
        );
      case 1:
        return (
          <AddToiletLocation
            location={toiletData.location}
            address={toiletData.address}
            updateToiletData={updateToiletData}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );
      case 2:
        return (
          <AddToiletAmenities
            amenities={toiletData.amenities}
            isAccessible={toiletData.isAccessible}
            updateToiletData={updateToiletData}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );
      case 3:
        return (
          <AddToiletPhotos
            photos={toiletData.photos || []}
            updateToiletData={updateToiletData}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );
      case 4:
        return (
          <AddToiletReview
            toiletData={toiletData}
            onSubmit={handleSubmit}
            onBack={goToPreviousStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Add New Toilet" />
      </Appbar.Header>

      <StepIndicator
        steps={steps.map((step) => step.title)}
        currentStep={currentStep}
      />

      <View style={styles.content}>{renderCurrentStep()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default AddToiletScreen;
