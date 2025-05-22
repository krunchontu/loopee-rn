-- Migration: Add test toilet data for development
-- Date: 2025-05-17
-- Purpose: Populate the database with additional toilet locations to enhance the map experience

-- Insert additional test toilet locations around Singapore with standardized schema
INSERT INTO toilets (
  name, 
  location, 
  rating, 
  is_accessible,
  amenities,
  opening_hours,
  photos,
  address,
  building_name,
  floor_level,
  floor_name
)
VALUES 
  -- Central area
  ('Marina Bay Sands Toilet', 'SRID=4326;POINT(103.8614 1.2834)', 4.9, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": true, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": true, "hasSoap": true}',
   '07:00-23:00',
   ARRAY['https://example.com/mbs-toilet1.jpg', 'https://example.com/mbs-toilet2.jpg'],
   '10 Bayfront Avenue, Singapore 018956',
   'Marina Bay Sands',
   1,
   'Level 1'
  ),
  ('Esplanade Theatres Toilet', 'SRID=4326;POINT(103.8555 1.2896)', 4.7, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": false, "hasSoap": true}',
   '08:00-23:00',
   ARRAY['https://example.com/esplanade-toilet.jpg'],
   '1 Esplanade Drive, Singapore 038981',
   'Esplanade Theatres on the Bay',
   2,
   'Level 2'
  ),
  ('Chinatown Point Toilet', 'SRID=4326;POINT(103.8435 1.2854)', 3.8, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": true, "hasSoap": true}',
   '10:00-22:00',
   ARRAY[]::text[],
   '133 New Bridge Road, Singapore 059413',
   'Chinatown Point',
   3,
   'Level 3'
  ),
  ('Clarke Quay Central Toilet', 'SRID=4326;POINT(103.8464 1.2897)', 4.2, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": false, "hasHandDryer": true, "hasWaterSpray": false, "hasSoap": true}',
   '10:00-22:00',
   ARRAY[]::text[],
   '6 Eu Tong Sen Street, Singapore 059817',
   'Clarke Quay Central',
   2,
   'Level 2'
  ),

  -- East area
  ('Jewel Changi Airport Toilet', 'SRID=4326;POINT(103.9893 1.3601)', 5.0, true, 
   '{"hasBabyChanging": true, "hasShower": true, "isGenderNeutral": true, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": true, "hasSoap": true}',
   '00:00-23:59',
   ARRAY['https://example.com/jewel-toilet1.jpg', 'https://example.com/jewel-toilet2.jpg'],
   '78 Airport Boulevard, Singapore 819666',
   'Jewel Changi Airport',
   2,
   'Level 2'
  ),
  ('East Coast Park Toilet', 'SRID=4326;POINT(103.9198 1.3012)', 3.5, false, 
   '{"hasBabyChanging": false, "hasShower": true, "isGenderNeutral": false, "hasPaperTowels": false, "hasHandDryer": false, "hasWaterSpray": false, "hasSoap": true}',
   '07:00-21:00',
   ARRAY[]::text[],
   'East Coast Park Area C, Singapore',
   'East Coast Park',
   1,
   'Ground Level'
  ),
  
  -- West area
  ('VivoCity Toilet', 'SRID=4326;POINT(103.8222 1.2644)', 4.5, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": true, "hasSoap": true}',
   '10:00-22:00',
   ARRAY['https://example.com/vivocity-toilet.jpg'],
   '1 Harbourfront Walk, Singapore 098585',
   'VivoCity',
   3,
   'Level 3'
  ),
  ('Jurong Point Toilet', 'SRID=4326;POINT(103.7074 1.3397)', 4.3, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": false, "hasSoap": true}',
   '10:00-22:00',
   ARRAY[]::text[],
   '1 Jurong West Central 2, Singapore 648886',
   'Jurong Point',
   2,
   'Level 2'
  ),
  
  -- North area
  ('Sembawang Hot Spring Park Toilet', 'SRID=4326;POINT(103.8253 1.4330)', 4.0, true, 
   '{"hasBabyChanging": false, "hasShower": true, "isGenderNeutral": false, "hasPaperTowels": false, "hasHandDryer": false, "hasWaterSpray": true, "hasSoap": true}',
   '07:00-19:00',
   ARRAY['https://example.com/hotspring-toilet.jpg'],
   'Gambas Avenue, Singapore 756717',
   'Sembawang Hot Spring Park',
   1,
   'Ground Level'
  ),
  ('Woodlands Causeway Point Toilet', 'SRID=4326;POINT(103.7860 1.4363)', 4.2, true, 
   '{"hasBabyChanging": true, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": false, "hasSoap": true}',
   '10:00-22:00',
   ARRAY[]::text[],
   '1 Woodlands Square, Singapore 738099',
   'Causeway Point',
   3,
   'Level 3'
  ),
  
  -- Central Mall (explicitly included to match the example in the original question)
  ('Central Mall Restroom', 'SRID=4326;POINT(103.8505 1.2892)', 4.5, true, 
   '{"hasBabyChanging": false, "hasShower": false, "isGenderNeutral": false, "hasPaperTowels": true, "hasHandDryer": true, "hasWaterSpray": false, "hasSoap": true}',
   '24/7',
   ARRAY[]::text[],
   'Central Mall, 1 Magazine Road, Singapore 059567',
   'Central Mall',
   1,
   'Level 1'
  )
;

-- Update the sequence to prevent ID conflicts
-- Uncomment and run if needed:
-- SELECT pg_catalog.setval(pg_get_serial_sequence('toilets', 'id'), (SELECT MAX(id) FROM toilets));

-- You can verify the insertion with:
-- SELECT name, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude FROM toilets;
