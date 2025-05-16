# Toilet Location System Documentation

## Overview

The Loopee app allows users to find nearby toilets on a map. This document explains how the toilet location system works, including recent improvements to ensure accurate positioning and multistory building support.

## Database Storage

### Location Storage
- Toilet locations are stored in the Supabase database in a PostGIS-enabled table
- The `location` column is a `geography(Point, 4326)` type that stores actual coordinates
- Example: `SRID=4326;POINT(103.8198 1.3521)` represents longitude 103.8198, latitude 1.3521

### Database Function

The `find_toilets_within_radius` function is used to query nearby toilets:

```sql
-- First drop the existing function to modify return type
DROP FUNCTION IF EXISTS find_toilets_within_radius(double precision, double precision, integer);

-- Then recreate with coordinates in the return type
CREATE OR REPLACE FUNCTION find_toilets_within_radius(
  lat double precision,
  lng double precision,
  radius_meters int default 5000
)
RETURNS TABLE (
  id uuid,
  name text,
  distance_meters float,
  latitude double precision,  -- Actual coordinates from database
  longitude double precision, -- Actual coordinates from database
  rating decimal,
  is_accessible boolean,
  photos text[],
  opening_hours text,
  amenities jsonb
)
```

This function:
1. Takes user's location and search radius
2. Finds toilets within the specified radius using PostGIS's `ST_DWithin` function
3. Calculates the distance to each toilet using `ST_Distance`
4. Returns toilet details including the actual coordinates extracted from the PostGIS Point

## Frontend Implementation

### Data Flow

1. **User Location**: The app obtains the user's current location
2. **Database Query**: Calls the `find_toilets_within_radius` function with the user's location
3. **Data Transformation**:
   - The Supabase service transforms raw data into the frontend `Toilet` interface
   - Uses actual coordinates from the database but falls back to calculated positions if needed
4. **Validation**: The toilet store performs validation to ensure only valid toilets are displayed
5. **Map Display**: Toilets are displayed on the map using the `AnimatedMarker` component

### Robust Error Handling

Multiple layers of protection ensure the app doesn't crash if coordinate data is missing:

1. **Database Level**: 
   - Uses `COALESCE` to handle potential null values
   - Returns 0 as fallback if coordinates can't be extracted

2. **Supabase Service Level**:
   - Primary: Uses actual coordinates from the database
   - Fallback: If coordinates are missing/invalid, generates synthetic coordinates
   - Logging: Details coordinate source for debugging

3. **Store Level**:
   - Enhanced validation with geographic bounds checking
   - Detailed error logging for invalid toilets
   - Safe handling of edge cases

## Debugging

If toilet markers behave unexpectedly, check the application logs for:

- `[Supabase] Using actual coordinates for toilet...` (normal behavior)
- `[Supabase] Missing or invalid coordinates for toilet...` (fallback behavior)
- `[ToiletStore] Filtered out X invalid toilets` (validation failures)

## Multistory Building Support

To handle toilets in multistory buildings and shopping malls, the system has been enhanced with:

### Database Schema
- New `buildings` table to store information about multistory buildings
  ```sql
  CREATE TABLE buildings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    location geography(Point, 4326) NOT NULL, -- Main entrance or center point of building
    address text,
    description text,
    photos text[] DEFAULT array[]::text[],
    created_at timestamp with time zone DEFAULT now()
  );
  ```

- Enhanced `toilets` table with building and floor information
  ```sql
  ALTER TABLE toilets 
    ADD COLUMN building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
    ADD COLUMN floor_level integer, -- Positive for above ground, negative for below ground
    ADD COLUMN floor_name text;     -- Human-readable floor name (e.g., "L3", "B2", "Food Court")
  ```

### Updated Location Function
The `find_toilets_within_radius` function now includes building and floor information:
```sql
RETURNS TABLE (
  -- Existing fields
  building_id uuid,        -- Added field
  building_name text,      -- Added field
  floor_level integer,     -- Added field
  floor_name text          -- Added field
)
```

### Frontend Implementation
- Updated TypeScript interfaces with building and floor information
- Enhanced toilet cards to display building names and floor levels
- Added detailed location section in toilet details screen

### Benefits
- Users can now easily find toilets on specific floors of buildings
- Improved location context for toilets in shopping malls 
- Support for vertical positioning in addition to horizontal

## Recent Improvements

The system was enhanced on May 17, 2025 with:

1. Modified database function to return actual coordinates
2. Updated Supabase service to use real coordinates with fallback mechanism
3. Enhanced validation in toilet store with geographic bounds checking
4. Improved logging for better debugging
5. Added multistory building support with floor level information
