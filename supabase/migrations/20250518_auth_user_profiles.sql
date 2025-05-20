-- User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view any profile
CREATE POLICY "Anyone can view user profiles"
  ON public.user_profiles
  FOR SELECT USING (true);

-- Policy: Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    username, 
    display_name,
    reviews_count,
    contributions_count,
    favorites_count
  )
  VALUES (
    NEW.id, 
    'user_' || floor(random() * 1000000)::text, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    0,  -- Initialize reviews_count
    0,  -- Initialize contributions_count
    0   -- Initialize favorites_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to avoid errors on migration rerun
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
