-- Migration: Add test toilet data for development
-- Date: 2025-05-17
-- Purpose: Populate the database with additional toilet locations to enhance the map experience

-- Insert additional test toilet locations around Singapore
INSERT INTO toilets (
  name, 
  location, 
  rating, 
  is_accessible,
  amenities,
  opening_hours,
  photos
)
VALUES 
  -- Central area
  ('Marina Bay Sands Toilet', 'SRID=4326;POINT(103.8614 1.2834)', 4.9, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": true, "paperTowels": true, "handDryer": true, "waterSpray": true, "soap": true}',
   '07:00-23:00',
   ARRAY['https://example.com/mbs-toilet1.jpg', 'https://example.com/mbs-toilet2.jpg']
  ),
  ('Esplanade Theatres Toilet', 'SRID=4326;POINT(103.8555 1.2896)', 4.7, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": true, "handDryer": true, "waterSpray": false, "soap": true}',
   '08:00-23:00',
   ARRAY['https://example.com/esplanade-toilet.jpg']
  ),
  ('Chinatown Point Toilet', 'SRID=4326;POINT(103.8435 1.2854)', 3.8, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": true, "handDryer": true, "waterSpray": true, "soap": true}',
   '10:00-22:00',
   ARRAY[]::text[]
  ),
  ('Clarke Quay Central Toilet', 'SRID=4326;POINT(103.8464 1.2897)', 4.2, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": false, "handDryer": true, "waterSpray": false, "soap": true}',
   '10:00-22:00',
   ARRAY[]::text[]
  ),

  -- East area
  ('Jewel Changi Airport Toilet', 'SRID=4326;POINT(103.9893 1.3601)', 5.0, true, 
   '{"babyChanging": true, "shower": true, "genderNeutral": true, "paperTowels": true, "handDryer": true, "waterSpray": true, "soap": true}',
   '00:00-23:59',
   ARRAY['https://example.com/jewel-toilet1.jpg', 'https://example.com/jewel-toilet2.jpg']
  ),
  ('East Coast Park Toilet', 'SRID=4326;POINT(103.9198 1.3012)', 3.5, false, 
   '{"babyChanging": false, "shower": true, "genderNeutral": false, "paperTowels": false, "handDryer": false, "waterSpray": false, "soap": true}',
   '07:00-21:00',
   ARRAY[]::text[]
  ),
  
  -- West area
  ('VivoCity Toilet', 'SRID=4326;POINT(103.8222 1.2644)', 4.5, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": true, "handDryer": true, "waterSpray": true, "soap": true}',
   '10:00-22:00',
   ARRAY['https://example.com/vivocity-toilet.jpg']
  ),
  ('Jurong Point Toilet', 'SRID=4326;POINT(103.7074 1.3397)', 4.3, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": true, "handDryer": true, "waterSpray": false, "soap": true}',
   '10:00-22:00',
   ARRAY[]::text[]
  ),
  
  -- North area
  ('Sembawang Hot Spring Park Toilet', 'SRID=4326;POINT(103.8253 1.4330)', 4.0, true, 
   '{"babyChanging": false, "shower": true, "genderNeutral": false, "paperTowels": false, "handDryer": false, "waterSpray": true, "soap": true}',
   '07:00-19:00',
   ARRAY['https://example.com/hotspring-toilet.jpg']
  ),
  ('Woodlands Causeway Point Toilet', 'SRID=4326;POINT(103.7860 1.4363)', 4.2, true, 
   '{"babyChanging": true, "shower": false, "genderNeutral": false, "paperTowels": true, "handDryer": true, "waterSpray": false, "soap": true}',
   '10:00-22:00',
   ARRAY[]::text[]
  )
;

-- Update the sequence to prevent ID conflicts
-- Uncomment and run if needed:
-- SELECT pg_catalog.setval(pg_get_serial_sequence('toilets', 'id'), (SELECT MAX(id) FROM toilets));

-- You can verify the insertion with:
-- SELECT name, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude FROM toilets;
