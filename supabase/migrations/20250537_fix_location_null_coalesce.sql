-- Fix: Stop converting NULL locations to (0,0) via COALESCE.
-- NULL locations are already excluded by the ST_DWithin WHERE clause,
-- so the COALESCE(x, 0) sentinel was unreachable in practice. However,
-- removing it makes the intent explicit: a toilet without a valid
-- geometry should never return fake (0,0) coordinates.

DROP FUNCTION IF EXISTS find_toilets_within_radius(double precision, double precision, integer);

CREATE OR REPLACE FUNCTION find_toilets_within_radius(
  lat double precision,
  lng double precision,
  radius_meters int default 5000
)
RETURNS TABLE (
  id uuid,
  name text,
  distance_meters float,
  latitude double precision,
  longitude double precision,
  rating decimal,
  is_accessible boolean,
  photos text[],
  opening_hours text,
  amenities jsonb,
  building_id uuid,
  building_name text,
  floor_level integer,
  floor_name text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id,
    t.name,
    ST_Distance(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters,
    ST_Y(t.location::geometry) AS latitude,
    ST_X(t.location::geometry) AS longitude,
    t.rating,
    t.is_accessible,
    t.photos,
    t.opening_hours,
    t.amenities,
    t.building_id,
    b.name AS building_name,
    t.floor_level,
    t.floor_name
  FROM toilets t
  LEFT JOIN buildings b ON t.building_id = b.id
  WHERE ST_DWithin(
    t.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters
$$;
