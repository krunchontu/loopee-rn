-- Fix reviews table schema - Step 1: Add columns except user_id
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Add user_id as nullable first to avoid foreign key issues
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users NULL;

-- Step 3: Find a valid user_id and populate the column
DO $$ 
DECLARE 
  system_user_id UUID;
BEGIN
  -- Use the first user we find as the system user
  SELECT id INTO system_user_id FROM auth.users LIMIT 1;
  
  IF system_user_id IS NOT NULL THEN
    -- Update existing reviews to use this user ID
    UPDATE public.reviews
    SET user_id = system_user_id
    WHERE user_id IS NULL;
    
    -- Now make the column NOT NULL
    ALTER TABLE public.reviews
    ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Warning: No users found. Please create at least one user before running this migration.';
  END IF;
END $$;

-- Create trigger to maintain updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE update_reviews_updated_at();

-- Function to average ratings
CREATE OR REPLACE FUNCTION update_toilet_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(2,1);
  review_count INTEGER;
BEGIN
  -- Calculate new average rating
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0), COUNT(*) 
  INTO avg_rating, review_count
  FROM public.reviews
  WHERE toilet_id = COALESCE(NEW.toilet_id, OLD.toilet_id);

  -- Update the toilet's rating and review_count
  UPDATE public.toilets
  SET rating = avg_rating
  WHERE id = COALESCE(NEW.toilet_id, OLD.toilet_id);

  RETURN NULL; -- for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Trigger for when reviews are added or updated
DROP TRIGGER IF EXISTS update_toilet_average_rating_insert_update ON public.reviews;
CREATE TRIGGER update_toilet_average_rating_insert_update
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE update_toilet_average_rating();

-- Trigger for when reviews are deleted
DROP TRIGGER IF EXISTS update_toilet_average_rating_delete ON public.reviews;
CREATE TRIGGER update_toilet_average_rating_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE update_toilet_average_rating();

-- Function to update review counts on user profiles
CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER AS $$
BEGIN
  -- For new reviews or changes in user_id
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id) THEN
    -- Increment the new user's count
    UPDATE public.user_profiles
    SET reviews_count = reviews_count + 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  -- For deletions or changes in user_id
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id) THEN
    -- Decrement the old user's count
    UPDATE public.user_profiles
    SET reviews_count = GREATEST(reviews_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;

  RETURN NULL; -- for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Triggers for review count updates
DROP TRIGGER IF EXISTS update_user_review_count_insert_update ON public.reviews;
CREATE TRIGGER update_user_review_count_insert_update
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE update_user_review_count();

DROP TRIGGER IF EXISTS update_user_review_count_delete ON public.reviews;
CREATE TRIGGER update_user_review_count_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE update_user_review_count();

-- Update user_profiles review counts
DO $$
BEGIN
  -- Only run if the user_id column is not null
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    UPDATE public.user_profiles profiles
    SET reviews_count = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE user_id = profiles.id
    );
  END IF;
END $$;

-- Add RLS policies for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all reviews
DROP POLICY IF EXISTS "Users can view all reviews" ON public.reviews;
CREATE POLICY "Users can view all reviews" 
  ON public.reviews
  FOR SELECT USING (true);

-- Policy: Users can insert their own reviews
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
CREATE POLICY "Users can insert their own reviews" 
  ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own reviews
DROP POLICY IF EXISTS "Users can update only their own reviews" ON public.reviews;
CREATE POLICY "Users can update only their own reviews" 
  ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Function for editing a review (creating a new version)
CREATE OR REPLACE FUNCTION edit_review(
  p_review_id UUID,
  p_rating INTEGER,
  p_comment TEXT,
  p_photos TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_current_version INTEGER;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if the review belongs to the current user
  SELECT version INTO v_current_version FROM public.reviews
  WHERE id = p_review_id AND user_id = v_user_id;
  
  IF v_current_version IS NULL THEN
    RAISE EXCEPTION 'Review not found or you do not have permission to edit it';
  END IF;
  
  -- Update the review with new version
  UPDATE public.reviews
  SET 
    rating = p_rating,
    comment = p_comment,
    photos = COALESCE(p_photos, photos),
    version = v_current_version + 1,
    is_edited = TRUE,
    last_edited_at = NOW(),
    updated_at = NOW()
  WHERE id = p_review_id;
  
  RETURN p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new review
CREATE OR REPLACE FUNCTION create_review(
  p_toilet_id UUID,
  p_rating INTEGER,
  p_comment TEXT,
  p_photos TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user already has a review for this toilet
  SELECT id INTO v_review_id FROM public.reviews
  WHERE toilet_id = p_toilet_id AND user_id = v_user_id;
  
  -- If review exists, edit it instead
  IF v_review_id IS NOT NULL THEN
    RETURN edit_review(v_review_id, p_rating, p_comment, p_photos);
  END IF;
  
  -- Insert new review
  INSERT INTO public.reviews (toilet_id, user_id, rating, comment, photos)
  VALUES (p_toilet_id, v_user_id, p_rating, p_comment, p_photos)
  RETURNING id INTO v_review_id;
  
  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
