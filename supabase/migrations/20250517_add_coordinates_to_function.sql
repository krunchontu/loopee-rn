-- First drop the existing function
DROP FUNCTION IF EXISTS find_toilets_within_radius(double precision, double precision, integer);

-- Then recreate the function with coordinates included in the return type
CREATE OR REPLACE FUNCTION find_toilets_within_radius(
  lat double precision,
  lng double precision,
  radius_meters int default 5000
)
returns table (
  id uuid,
  name text,
  distance_meters float,
  latitude double precision,  -- New fields for actual coordinates
  longitude double precision, -- from the database
  rating decimal,
  is_accessible boolean,
  photos text[],
  opening_hours text,
  amenities jsonb
)
language sql
stable
as $$
  select
    t.id,
    t.name,
    ST_Distance(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters,
    COALESCE(ST_Y(t.location::geometry), 0) as latitude,  -- Extract latitude with null safety
    COALESCE(ST_X(t.location::geometry), 0) as longitude, -- Extract longitude with null safety
    t.rating,
    t.is_accessible,
    t.photos,
    t.opening_hours,
    t.amenities
  from toilets t
  where ST_DWithin(
    t.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  order by distance_meters
$$;

-- Example usage:
-- select * from find_toilets_within_radius(1.3521, 103.8198, 5000);
