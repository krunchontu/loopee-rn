/**
 * @file ReviewModal component
 *
 * Modal for displaying the review form
 * Uses React Native Paper's Modal component
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import { ReviewForm } from "./ReviewForm";
import { colors, spacing } from "../../foundations";

interface ReviewModalProps {
  visible: boolean;
  toiletId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialRating?: number;
  initialComment?: string;
  isEdit?: boolean;
  reviewId?: string;
}

/**
 * Modal component for displaying the review form
 * Uses React Native Paper's Portal and Modal components for overlay rendering
 */
export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  toiletId,
  onClose,
  onSuccess,
  initialRating = 0,
  initialComment = "",
  isEdit = false,
  reviewId,
}) => {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.content}>
          <ReviewForm
            toiletId={toiletId}
            initialRating={initialRating}
            initialComment={initialComment}
            isEdit={isEdit}
            reviewId={reviewId}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    maxWidth: 500,
    width: "100%",
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    margin: spacing.lg,
    padding: spacing.md,
  },
});
