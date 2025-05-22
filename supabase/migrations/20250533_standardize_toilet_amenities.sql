-- Migration: Standardize Toilet Amenities Schema
-- 
-- This migration standardizes the toilet data schema across all records to ensure consistency
-- between pre-generated test toilets and user-submitted toilets.

-- First let's log what we're about to modify (for debugging/audit purposes)
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    before_state JSONB,
    after_state JSONB
);

-- Capture the before state
INSERT INTO migration_logs (migration_name, before_state)
SELECT 
    '20250533_standardize_toilet_amenities',
    jsonb_build_object(
        'toilet_count', COUNT(*),
        'sample_amenities', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amenities', amenities))
            FROM (SELECT id, name, amenities FROM toilets LIMIT 5) t
        )
    )
FROM toilets;

-- Step 1: Safely standardize amenities field format to consistently use the "has" prefix 
-- for all toilets in the database
UPDATE toilets
SET amenities = jsonb_build_object(
    'hasBabyChanging', COALESCE(amenities->'babyChanging', amenities->'hasBabyChanging', 'false')::boolean,
    'hasShower', COALESCE(amenities->'shower', amenities->'hasShower', 'false')::boolean,
    'isGenderNeutral', COALESCE(amenities->'genderNeutral', amenities->'isGenderNeutral', 'false')::boolean,
    'hasPaperTowels', COALESCE(amenities->'paperTowels', amenities->'hasPaperTowels', 'false')::boolean,
    'hasHandDryer', COALESCE(amenities->'handDryer', amenities->'hasHandDryer', 'false')::boolean,
    'hasWaterSpray', COALESCE(amenities->'waterSpray', amenities->'hasWaterSpray', 'false')::boolean,
    'hasSoap', COALESCE(amenities->'soap', amenities->'hasSoap', 'false')::boolean
);

-- Step 2: Update the Central Mall Restroom with complete details
UPDATE toilets 
SET 
    address = '6 Eu Tong Sen Street, Singapore 059817',
    building_name = 'Central Mall',
    floor_level = 1,
    floor_name = 'Ground Floor',
    description = 'Modern public restroom in Central Mall with accessible facilities.'
WHERE id = '4ccd460c-983f-46ab-b9d5-bde0228d4910';

-- Step 3: Ensure all toilets have default values for critical display fields
UPDATE toilets
SET 
    address = COALESCE(address, name || ', Singapore'),
    building_name = COALESCE(building_name, 'Public Facility'),
    floor_level = COALESCE(floor_level, 1),
    floor_name = COALESCE(floor_name, 'Level ' || COALESCE(floor_level::text, '1'))
WHERE 
    address IS NULL OR building_name IS NULL OR floor_level IS NULL OR floor_name IS NULL;

-- Step 4: Add appropriate values for toilets created from submissions
UPDATE toilets t
SET 
    address = COALESCE(t.address, s.data->>'address'),
    building_name = COALESCE(t.building_name, s.data->>'buildingName'),
    floor_level = COALESCE(t.floor_level, (s.data->>'floorLevel')::integer),
    floor_name = COALESCE(t.floor_name, 'Level ' || COALESCE((s.data->>'floorLevel')::text, '1'))
FROM toilet_submissions s
WHERE 
    t.id = s.toilet_id AND 
    s.status = 'approved';

-- Log the after state and completion
UPDATE migration_logs
SET after_state = jsonb_build_object(
    'toilet_count', (SELECT COUNT(*) FROM toilets),
    'sample_amenities', (
        SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amenities', amenities))
        FROM (SELECT id, name, amenities FROM toilets LIMIT 5) t
    ),
    'standardized_amenities', true,
    'updated_building_info', true
)
WHERE migration_name = '20250533_standardize_toilet_amenities';

-- Insert a comment log instead of RAISE (which only works in functions)
COMMENT ON TABLE migration_logs IS 'Last updated by migration 20250533_standardize_toilet_amenities';
