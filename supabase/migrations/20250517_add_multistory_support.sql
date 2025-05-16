-- Migration: Add support for multistory buildings
-- Date: 2025-05-17
-- Purpose: Enhance the schema to support toilets in multistory buildings with many toilets per level

-- Create buildings table
CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  location geography(Point, 4326) NOT NULL, -- Main entrance or center point of building
  address text,
  description text,
  photos text[] DEFAULT array[]::text[],
  created_at timestamp with time zone DEFAULT now()
);

-- Add spatial index to buildings for efficient searches
CREATE INDEX buildings_location_idx ON buildings USING GIST(location);

-- Add building and floor information to toilets table
ALTER TABLE toilets 
  ADD COLUMN building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN floor_level integer, -- Positive for above ground, negative for below ground
  ADD COLUMN floor_name text;     -- Human-readable floor name (e.g., "L3", "B2", "Food Court")

-- Update find_toilets_within_radius function to include building and floor information
DROP FUNCTION IF EXISTS find_toilets_within_radius(double precision, double precision, integer);

CREATE OR REPLACE FUNCTION find_toilets_within_radius(
  lat double precision,
  lng double precision,
  radius_meters int DEFAULT 5000
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
  building_id uuid,        -- Added field
  building_name text,      -- Added field
  floor_level integer,     -- Added field
  floor_name text          -- Added field
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
    COALESCE(ST_Y(t.location::geometry), 0) AS latitude,
    COALESCE(ST_X(t.location::geometry), 0) AS longitude,
    t.rating,
    t.is_accessible,
    t.photos,
    t.opening_hours,
    t.amenities,
    t.building_id,                    -- Return building_id
    b.name AS building_name,          -- Join with buildings to get name
    t.floor_level,                    -- Return floor level
    t.floor_name                      -- Return floor name
  FROM toilets t
  LEFT JOIN buildings b ON t.building_id = b.id
  WHERE ST_DWithin(
    t.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters
$$;

-- Add sample buildings for existing data
INSERT INTO buildings (name, location, address)
VALUES 
  ('Plaza Singapura', 'SRID=4326;POINT(103.8453 1.3008)', '68 Orchard Road, Singapore 238839'),
  ('Orchard MRT Station', 'SRID=4326;POINT(103.8321 1.3044)', 'Orchard Road, Singapore'),
  ('Marina Bay Sands', 'SRID=4326;POINT(103.8614 1.2834)', '10 Bayfront Avenue, Singapore 018956'),
  ('Esplanade Theatres', 'SRID=4326;POINT(103.8555 1.2896)', '1 Esplanade Drive, Singapore 038981'),
  ('Chinatown Point', 'SRID=4326;POINT(103.8435 1.2854)', '133 New Bridge Road, Singapore 059413'),
  ('Clarke Quay Central', 'SRID=4326;POINT(103.8464 1.2897)', '6 Eu Tong Sen Street, Singapore 059817'),
  ('Jewel Changi Airport', 'SRID=4326;POINT(103.9893 1.3601)', '78 Airport Boulevard, Singapore 819666'),
  ('VivoCity', 'SRID=4326;POINT(103.8222 1.2644)', '1 HarbourFront Walk, Singapore 098585'),
  ('Jurong Point', 'SRID=4326;POINT(103.7074 1.3397)', '1 Jurong West Central 2, Singapore 648886'),
  ('Causeway Point', 'SRID=4326;POINT(103.7860 1.4363)', '1 Woodlands Square, Singapore 738099');

-- Update existing toilets with building IDs and floor information
UPDATE toilets t
SET 
  building_id = b.id,
  floor_level = CASE 
    WHEN t.name = 'Plaza Singapura Toilet' THEN 1
    WHEN t.name = 'Orchard MRT Toilet' THEN -1
    WHEN t.name = 'Marina Bay Sands Toilet' THEN 2
    WHEN t.name = 'Esplanade Theatres Toilet' THEN 1
    WHEN t.name = 'Chinatown Point Toilet' THEN 3
    WHEN t.name = 'Clarke Quay Central Toilet' THEN 2
    WHEN t.name = 'Jewel Changi Airport Toilet' THEN 1
    WHEN t.name = 'VivoCity Toilet' THEN 2
    WHEN t.name = 'Jurong Point Toilet' THEN 1
    WHEN t.name = 'Woodlands Causeway Point Toilet' THEN 3
    ELSE 1
  END,
  floor_name = CASE 
    WHEN t.name = 'Plaza Singapura Toilet' THEN 'L1'
    WHEN t.name = 'Orchard MRT Toilet' THEN 'B1'
    WHEN t.name = 'Marina Bay Sands Toilet' THEN 'L2'
    WHEN t.name = 'Esplanade Theatres Toilet' THEN 'L1'
    WHEN t.name = 'Chinatown Point Toilet' THEN 'L3'
    WHEN t.name = 'Clarke Quay Central Toilet' THEN 'L2'
    WHEN t.name = 'Jewel Changi Airport Toilet' THEN 'L1'
    WHEN t.name = 'VivoCity Toilet' THEN 'L2'
    WHEN t.name = 'Jurong Point Toilet' THEN 'L1'
    WHEN t.name = 'Woodlands Causeway Point Toilet' THEN 'L3'
    ELSE 'L1'
  END
FROM buildings b
WHERE (t.name LIKE '%' || b.name || '%' OR b.name LIKE '%' || t.name || '%');

-- Add more sample multistory data
INSERT INTO toilets (
  name,
  location,
  rating,
  is_accessible,
  amenities,
  opening_hours,
  photos,
  building_id,
  floor_level,
  floor_name
)
SELECT
  'Plaza Singapura ' || floor_name || ' Toilet',
  location, -- Same building location
  4.0 + random() * 1.0, -- Random rating between 4.0 and 5.0
  TRUE,
  '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": true, "handDryer": true, "waterSpray": true, "soap": true}'::jsonb,
  '10:00-22:00',
  ARRAY[]::text[],
  id,
  floor_level,
  floor_name
FROM (
  SELECT 
    b.id, 
    b.location, 
    t.floor_level, 
    t.floor_name
  FROM buildings b
  JOIN (VALUES
    (2, 'L2'),
    (3, 'L3'),
    (4, 'L4'),
    (-1, 'B1')
  ) AS t(floor_level, floor_name) ON TRUE
  WHERE b.name = 'Plaza Singapura'
) AS floors
WHERE NOT EXISTS (
  SELECT 1 FROM toilets 
  WHERE building_id = floors.id AND floor_level = floors.floor_level
);

INSERT INTO toilets (
  name,
  location,
  rating,
  is_accessible,
  amenities,
  opening_hours,
  photos,
  building_id,
  floor_level,
  floor_name
)
SELECT
  'Jewel Changi Airport ' || floor_name || ' Toilet',
  location, -- Same building location
  4.5 + random() * 0.5, -- Random rating between 4.5 and 5.0
  TRUE,
  '{"babyChanging": true, "shower": true, "genderNeutral": true, "paperTowels": true, "handDryer": true, "waterSpray": true, "soap": true}'::jsonb,
  '00:00-23:59',
  ARRAY[]::text[],
  id,
  floor_level,
  floor_name
FROM (
  SELECT 
    b.id, 
    b.location, 
    t.floor_level, 
    t.floor_name
  FROM buildings b
  JOIN (VALUES
    (2, 'L2'),
    (3, 'L3'),
    (4, 'L4'),
    (5, 'L5'),
    (-1, 'B1'),
    (-2, 'B2')
  ) AS t(floor_level, floor_name) ON TRUE
  WHERE b.name = 'Jewel Changi Airport'
) AS floors
WHERE NOT EXISTS (
  SELECT 1 FROM toilets 
  WHERE building_id = floors.id AND floor_level = floors.floor_level
);

-- You can verify the insertion with:
-- SELECT t.name, t.floor_level, t.floor_name, b.name as building_name 
-- FROM toilets t 
-- JOIN buildings b ON t.building_id = b.id
-- ORDER BY b.name, t.floor_level;
