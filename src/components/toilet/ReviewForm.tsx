/**
 * @file ReviewForm component
 *
 * A form for submitting and editing toilet reviews
 * Uses React Native Paper components for consistency
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  TextInput,
  Button,
  Text,
  Surface,
  HelperText,
} from "react-native-paper";

import { colors, spacing } from "../../foundations";
import { supabaseService } from "../../services/supabase";
import { debug } from "../../utils/debug";
import { EditableRating } from "../shared/EditableRating";

interface ReviewFormProps {
  toiletId: string;
  initialRating?: number;
  initialComment?: string;
  isEdit?: boolean;
  reviewId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Form component for submitting or editing toilet reviews
 * Uses React Native Paper components for UI consistency
 */
export const ReviewForm: React.FC<ReviewFormProps> = ({
  toiletId,
  initialRating = 0,
  initialComment = "",
  isEdit = false,
  reviewId,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission
   * Validates input and submits to the API
   */
  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please provide a star rating");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isEdit && reviewId) {
        await supabaseService.reviews.update(reviewId, {
          rating,
          comment,
        });
      } else {
        await supabaseService.reviews.create({
          toiletId,
          rating,
          comment,
        });
      }

      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(
        `Failed to ${isEdit ? "update" : "submit"} review. ${errorMessage}`
      );
      debug.error("ReviewForm", "Failed to submit review", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Surface style={styles.surface}>
      <Text variant="titleLarge" style={styles.title}>
        {isEdit ? "Edit Your Review" : "Write a Review"}
      </Text>

      <Text variant="labelLarge" style={styles.label}>
        Rating
      </Text>
      <EditableRating value={rating} size="large" onChange={setRating} />
      {rating === 0 && <HelperText type="error">Rating is required</HelperText>}

      <TextInput
        label="Comment (optional)"
        mode="outlined"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        style={styles.commentInput}
        placeholder="Tell others about your experience..."
      />

      {error && <HelperText type="error">{error}</HelperText>}

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.button}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={submitting}
          disabled={submitting || rating === 0}
        >
          {isEdit ? "Update" : "Submit"}
        </Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  commentInput: {
    backgroundColor: colors.background.primary,
    marginTop: spacing.md,
  },
  label: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  surface: {
    borderRadius: 12,
    elevation: 2,
    padding: spacing.md,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
});
