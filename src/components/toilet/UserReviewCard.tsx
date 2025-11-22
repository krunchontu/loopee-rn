/**
 * @file UserReviewCard component
 *
 * Displays the current user's review with edit functionality
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, IconButton } from "react-native-paper";

import { ReviewModal } from "./ReviewModal";
import { colors, spacing } from "../../foundations";
import type { Review } from "../../types/toilet";
import { Rating } from "../shared/Rating";

interface UserReviewCardProps {
  review: Review;
  toiletId: string;
  onUpdateSuccess: () => void;
}

/**
 * Card component to display the user's own review with edit functionality
 */
export const UserReviewCard: React.FC<UserReviewCardProps> = ({
  review,
  toiletId,
  onUpdateSuccess,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      debug.error("Component", "Invalid date format:", error);
      return "Unknown Date";
    }
  };

  return (
    <>
      <Card style={styles.card}>
        <Card.Title
          title="Your Review"
          subtitle={
            review.isEdited ?
              `Last edited on ${formatDate(review.lastEditedAt || "")}`
            : ""
          }
          right={(props) => (
            <IconButton
              {...props}
              icon="pencil"
              onPress={() => setEditModalVisible(true)}
            />
          )}
        />
        <Card.Content>
          <View style={styles.ratingContainer}>
            <Rating value={review.rating} size="medium" />
            <Text variant="labelSmall" style={styles.dateText}>
              {formatDate(review.createdAt)}
            </Text>
          </View>
          {review.comment && review.comment.trim().length > 0 ?
            <Text style={styles.comment}>{review.comment}</Text>
          : <Text style={styles.noComment}>
              No comment provided. Tap the edit button to add one!
            </Text>
          }
        </Card.Content>
      </Card>

      <ReviewModal
        visible={editModalVisible}
        toiletId={toiletId}
        onClose={() => setEditModalVisible(false)}
        onSuccess={onUpdateSuccess}
        initialRating={review.rating}
        initialComment={review.comment}
        isEdit={true}
        reviewId={review.id}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    elevation: 2,
    marginBottom: spacing.md,
  },
  comment: {
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  dateText: {
    color: colors.text.tertiary,
  },
  noComment: {
    color: colors.text.tertiary,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  ratingContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
});
