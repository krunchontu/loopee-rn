# Review System Implementation Guide

This document explains how the toilet review system is implemented in the Loopee app. The system allows users to submit reviews for toilets, including a star rating and optional comment.

## Database Schema

The reviews table has the following structure:

```sql
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    toilet_id UUID REFERENCES public.toilets(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    photos TEXT[],
    is_edited BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Database Functions

### Create Review

```sql
CREATE OR REPLACE FUNCTION create_review(
  p_toilet_id UUID,
  p_rating INTEGER,
  p_comment TEXT,
  p_photos TEXT[] DEFAULT NULL
)
RETURNS UUID
```

This function:
- Checks if the user already has a review for this toilet
- If so, updates the existing review
- If not, creates a new review
- Returns the review ID

### Edit Review

```sql
CREATE OR REPLACE FUNCTION edit_review(
  p_review_id UUID,
  p_rating INTEGER,
  p_comment TEXT,
  p_photos TEXT[] DEFAULT NULL
)
RETURNS UUID
```

This function:
- Validates the user owns the review
- Updates the review with the new data
- Increments the version number
- Sets is_edited to TRUE
- Updates last_edited_at timestamp
- Returns the review ID

## Row Level Security

The reviews table has the following policies:

- Everyone can view all reviews
- Users can only insert reviews where they are the author
- Users can only update reviews they own

## TypeScript Interface

```typescript
export interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  photos?: string[];
  isEdited?: boolean;
  version?: number;
  lastEditedAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}
```

## Component Structure

### 1. ReviewForm (src/components/toilet/ReviewForm.tsx)

Core form component for submitting or editing reviews. Features:
- Star rating selector (using EditableRating)
- Optional comment field
- Submit/Update and Cancel buttons
- Form validation (rating required)
- Error handling

### 2. EditableRating (src/components/shared/EditableRating.tsx)

Interactive star rating component:
- Renders star UI with touch interaction
- Supports different sizes (small, medium, large)
- Accessible with proper ARIA attributes
- Returns rating value through onChange callback

### 3. ReviewModal (src/components/toilet/ReviewModal.tsx)

Modal wrapper for the review form:
- Uses React Native Paper's Modal and Portal
- Manages visibility state
- Handles success and close callbacks
- Responsive container sizing

### 4. UserReviewCard (src/components/toilet/UserReviewCard.tsx)

Card to display the user's own review:
- Shows current rating, comment, and dates
- Provides edit button to open ReviewModal
- Handles different states (edited/no comment)
- Formats dates consistently

## Integration Flow

1. When a toilet detail page loads:
   - Check if the user is authenticated
   - If authenticated, fetch their review for the toilet
   - If a review exists, show UserReviewCard
   - If no review exists, show "Write a Review" button

2. When submitting a review:
   - Validate required fields
   - Call create_review supabase function
   - On success, refresh reviews list and toilet rating
   - On error, display error message

3. When editing a review:
   - Pre-populate form with existing rating/comment
   - Call edit_review supabase function
   - On success, refresh the component to show updated data

## Triggers and Automation

The system includes database triggers that:

1. Update the toilet's average rating when reviews are added/edited/deleted
2. Maintain the correct review counts on user profiles
3. Automatically update timestamps when reviews are modified

## Security Considerations

- All review operations require authentication
- Row-level security ensures users can only modify their own reviews
- Server-side database functions enforce business rules and validation
