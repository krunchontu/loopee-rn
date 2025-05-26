-- Add user statistics fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS contributions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;

-- Create user_favorites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  toilet_id UUID REFERENCES public.toilets NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, toilet_id)
);

-- Add RLS policies for user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update reviews_count when reviews are added or deleted
CREATE OR REPLACE FUNCTION public.update_user_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_profiles
    SET reviews_count = reviews_count + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_profiles
    SET reviews_count = reviews_count - 1
    WHERE id = OLD.user_id AND reviews_count > 0;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update contributions_count when toilets are added
CREATE OR REPLACE FUNCTION public.update_user_contribution_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_profiles
    SET contributions_count = contributions_count + 1
    WHERE id = NEW.added_by;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_profiles
    SET contributions_count = contributions_count - 1
    WHERE id = OLD.added_by AND contributions_count > 0;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update favorites_count when favorites are added or removed
CREATE OR REPLACE FUNCTION public.update_user_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_profiles
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_profiles
    SET favorites_count = favorites_count - 1
    WHERE id = OLD.user_id AND favorites_count > 0;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace triggers for reviews table
DROP TRIGGER IF EXISTS update_user_review_count_insert ON public.reviews;
DROP TRIGGER IF EXISTS update_user_review_count_delete ON public.reviews;

CREATE TRIGGER update_user_review_count_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_review_count();

CREATE TRIGGER update_user_review_count_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_review_count();

-- Create or replace triggers for toilets table (for contributions)
DROP TRIGGER IF EXISTS update_user_contribution_count_insert ON public.toilets;
DROP TRIGGER IF EXISTS update_user_contribution_count_delete ON public.toilets;

CREATE TRIGGER update_user_contribution_count_insert
  AFTER INSERT ON public.toilets
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_contribution_count();

CREATE TRIGGER update_user_contribution_count_delete
  AFTER DELETE ON public.toilets
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_contribution_count();

-- Create or replace triggers for favorites table
DROP TRIGGER IF EXISTS update_user_favorites_count_insert ON public.user_favorites;
DROP TRIGGER IF EXISTS update_user_favorites_count_delete ON public.user_favorites;

CREATE TRIGGER update_user_favorites_count_insert
  AFTER INSERT ON public.user_favorites
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_favorites_count();

CREATE TRIGGER update_user_favorites_count_delete
  AFTER DELETE ON public.user_favorites
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_favorites_count();
