# Toilet Data Schema Standards

## Overview

This document establishes standards for toilet data across the application to ensure consistency between database records and UI components. Following these standards helps avoid inconsistencies in how toilet information is displayed in the UI.

## Required Fields

All toilet entries must include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `name` | String | Display name of the toilet |
| `location` | PostGIS point | Geographic point with latitude and longitude |
| `rating` | Number | Numeric rating (0-5) |
| `is_accessible` | Boolean | Whether the toilet is wheelchair accessible |
| `address` | String | Complete address string |
| `building_name` | String | Name of the building |
| `floor_level` | Number | Numeric floor level (positive = above ground) |
| `floor_name` | String | Human-readable floor name (e.g., "Level 1") |
| `amenities` | JSONB | Object with standardized property names (see below) |
| `photos` | String[] | Array of photo URLs |

## Amenities Structure

Amenities must use these standardized property names:

| Property | Type | Description |
|----------|------|-------------|
| `hasBabyChanging` | Boolean | Baby changing station available |
| `hasShower` | Boolean | Shower facilities available |
| `isGenderNeutral` | Boolean | Gender neutral facilities |
| `hasPaperTowels` | Boolean | Paper towels available |
| `hasHandDryer` | Boolean | Hand dryer available |
| `hasWaterSpray` | Boolean | Water spray/bidet available |
| `hasSoap` | Boolean | Soap available |

## Utilities for Data Normalization

The application includes utilities to handle data inconsistencies:

1. `normalizeAmenities(amenities)` - Normalizes amenities field format
2. `normalizeBuildingInfo(toilet)` - Normalizes building and floor information
3. `normalizeToiletData(toilet)` - Comprehensive toilet data normalization

Example usage:

```typescript
import { normalizeAmenities } from "../utils/toilet-helpers";

// In a component:
const normalizedAmenities = normalizeAmenities(toilet.amenities);

// Now you can safely access properties with the "has" prefix
if (normalizedAmenities.hasBabyChanging) {
  // Display baby changing station icon
}
```

## Database Standardization

To ensure database consistency, we've implemented:

1. Updated test data migration (`20250517_add_test_toilet_data.sql`) to use the standardized schema
2. Created a migration (`20250533_standardize_toilet_amenities.sql`) to standardize existing toilet data
3. Corrected the submission system to properly map fields from submissions to toilets

## Client-Side Resilience

For maximum compatibility, client-side components should:

1. Use the normalization utilities when displaying toilet data
2. Place normalization logic at the top of components before any conditional returns (React Hook rules)
3. Always provide fallbacks for missing fields

## Development Guidelines

When working with toilet data:

1. Always use the standardized property names in new code
2. Use the normalization utilities when accessing toilet data in UI components
3. When adding new properties, update both the database schema and normalization utilities
4. Consider both existing and newly submitted toilets when making schema changes
