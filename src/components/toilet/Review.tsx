import { View, Text, Image } from "react-native";
import { colors, spacing } from "../../constants/colors";
import { Rating } from "../shared/Rating";
import { Review as ReviewType } from "../../types/toilet";

interface ReviewProps {
  review: ReviewType;
}

export function Review({ review }: ReviewProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <View
      style={{
        backgroundColor: colors.background.secondary,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.sm,
        }}
      >
        <Rating value={review.rating} size="small" showValue={false} />
        <Text
          style={{
            marginLeft: spacing.sm,
            fontSize: 12,
            color: colors.text.light,
          }}
        >
          {formatDate(review.createdAt)}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 14,
          color: colors.text.primary,
          marginBottom: review.photos?.length ? spacing.md : 0,
        }}
      >
        {review.comment}
      </Text>

      {review.photos && review.photos.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginHorizontal: -spacing.xs,
          }}
        >
          {review.photos.map((photo, index) => (
            <View
              key={index}
              style={{
                width: "33.33%",
                padding: spacing.xs,
              }}
            >
              <Image
                source={{ uri: photo }}
                style={{
                  width: "100%",
                  aspectRatio: 1,
                  borderRadius: 8,
                }}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
