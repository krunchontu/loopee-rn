# Toilet Review Integration Guide

This document provides code snippets for integrating the review system into the ToiletDetailView component.

## State Variables

Add these state variables to the ToiletDetailView component:

```typescript
const [reviewModalVisible, setReviewModalVisible] = useState(false);
const [userReview, setUserReview] = useState<Review | null>(null);
const [isLoadingReview, setIsLoadingReview] = useState(false);
const [reviews, setReviews] = useState<Review[]>([]);
const [isAuthenticated, setIsAuthenticated] = useState(false);
```

## Authentication Check

Add this effect to check authentication and fetch user's review:

```typescript
useEffect(() => {
  const checkAuthAndFetchReview = async () => {
    try {
      setIsLoadingReview(true);
      
      const user = await supabaseService.auth.getUser();
      const isLoggedIn = !!user;
      setIsAuthenticated(isLoggedIn);
      
      if (isLoggedIn && toilet?.id) {
        const review = await supabaseService.reviews.getCurrentUserReview(toilet.id);
        setUserReview(review);
      }
      
      // Fetch all reviews
      if (toilet?.id) {
        const allReviews = await supabaseService.reviews.getByToiletId(toilet.id);
        // Filter out the user's own review to avoid duplication
        const otherReviews = isLoggedIn && allReviews ? 
          allReviews.filter(review => !user || review.userId !== user.id) : 
          allReviews;
        
        setReviews(otherReviews || []);
      }
    } catch (error) {
      debug.error("ToiletDetailView", "Error checking auth/fetching review", error);
    } finally {
      setIsLoadingReview(false);
    }
  };
  
  checkAuthAndFetchReview();
}, [toilet?.id]);
```

## Refresh Reviews Function

Add this function to refresh reviews after submission:

```typescript
const refreshReviews = async () => {
  try {
    if (!toilet || !toilet.id) return;
    
    // Fetch all reviews
    const allReviews = await supabaseService.reviews.getByToiletId(toilet.id);
    
    // If user is authenticated, fetch their review
    if (isAuthenticated) {
      const user = await supabaseService.auth.getUser();
      const userReviewData = await supabaseService.reviews.getCurrentUserReview(toilet.id);
      setUserReview(userReviewData);
      
      // Filter out user's review from the list to avoid duplication
      if (user && allReviews) {
        const otherReviews = allReviews.filter(review => review.userId !== user.id);
        setReviews(otherReviews);
      } else {
        setReviews(allReviews || []);
      }
    } else {
      setReviews(allReviews || []);
    }
    
    // Refresh toilet data to get updated rating
    const updatedToilet = await supabaseService.toilets.getById(toilet.id);
    if (updatedToilet && typeof setToilet === 'function') {
      setToilet(updatedToilet);
    }
  } catch (error) {
    debug.error("ToiletDetailView", "Error refreshing reviews", error);
  }
};
```

## JSX for Reviews Section

Add this JSX to the ToiletDetailView component's return:

```tsx
{/* Reviews Section */}
<View style={styles.reviewsSection}>
  <Text variant="titleMedium" style={styles.sectionTitle}>Reviews</Text>
  
  {isLoadingReview ? (
    <ActivityIndicator size="small" color={colors.primary} />
  ) : (
    <>
      {/* User's review if they have one */}
      {userReview && (
        <UserReviewCard 
          review={userReview}
          toiletId={toilet.id}
          onUpdateSuccess={refreshReviews}
        />
      )}
      
      {/* Button to add review */}
      {isAuthenticated ? (
        !userReview && (
          <Button
            mode="contained"
            icon="star"
            onPress={() => setReviewModalVisible(true)}
            style={styles.reviewButton}
          >
            Write a Review
          </Button>
        )
      ) : (
        <Button
          mode="outlined"
          icon="login"
          onPress={() => navigation.navigate('Login')} // Adjust navigation as needed
          style={styles.reviewButton}
        >
          Log in to write a review
        </Button>
      )}
      
      <Divider style={styles.divider} />
      
      {/* Other reviews */}
      {reviews.length === 0 ? (
        <Text style={styles.noReviews}>
          No reviews yet.
          {isAuthenticated ? " Be the first to leave a review!" : " Log in to leave the first review!"}
        </Text>
      ) : (
        <>
          <Text variant="labelMedium" style={styles.reviewsCount}>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </Text>
          
          {reviews.map((review) => (
            <Card key={review.id} style={styles.reviewCard}>
              <Card.Content>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    {review.user?.avatarUrl ? (
                      <Avatar.Image
                        size={24}
                        source={{ uri: review.user.avatarUrl }}
                        style={styles.reviewAvatar}
                      />
                    ) : (
                      <Avatar.Icon
                        size={24}
                        icon="account"
                        style={styles.reviewAvatar}
                      />
                    )}
                    <Text variant="labelMedium">
                      {review.user?.displayName || "Anonymous"}
                    </Text>
                  </View>
                  
                  <Text variant="labelSmall" style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <Rating value={review.rating} size="small" />
                
                {review.comment && review.comment.trim().length > 0 && (
                  <Text style={styles.reviewText}>{review.comment}</Text>
                )}
              </Card.Content>
            </Card>
          ))}
        </>
      )}
      
      {/* Review Modal */}
      <ReviewModal
        visible={reviewModalVisible}
        toiletId={toilet.id}
        onClose={() => setReviewModalVisible(false)}
        onSuccess={refreshReviews}
        initialRating={0}
        initialComment=""
        isEdit={false}
      />
    </>
  )}
</View>
```

## Additional Styles

Add these styles to the StyleSheet:

```typescript
const styles = StyleSheet.create({
  // Add to existing styles
  divider: {
    marginVertical: spacing.md,
  },
  noReviews: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginVertical: spacing.md,
    textAlign: 'center',
  },
  reviewAvatar: {
    backgroundColor: colors.background.secondary,
    marginRight: spacing.xs,
  },
  reviewButton: {
    marginVertical: spacing.md,
  },
  reviewCard: {
    marginBottom: spacing.sm,
    elevation: 1,
  },
  reviewDate: {
    color: colors.text.tertiary,
  },
  reviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reviewsCount: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  reviewsSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  reviewText: {
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  reviewUser: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sectionTitle: {
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
});
```

## Import Statements

Add these imports:

```typescript
import { ActivityIndicator, Divider } from 'react-native-paper';
import { ReviewModal } from './ReviewModal';
import { UserReviewCard } from './UserReviewCard';
import { Rating } from '../shared/Rating';
```

## Final Steps

After integrating these changes:

1. Test the flow for authenticated and unauthenticated users
2. Verify that reviews are properly updated in real-time
3. Check that the toilet's rating updates when reviews change 
4. Ensure that users can only see the edit button for their own reviews
