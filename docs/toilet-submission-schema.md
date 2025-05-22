# Toilet Submission Schema Documentation

## Overview

This document outlines the data structures and mappings between the frontend submission data and the database schema for toilet submissions. This reference is crucial for maintaining compatibility between the client-side submission format and the server-side database schema.

## Database Tables

### `toilet_submissions` Table

Stores pending, approved, and rejected submissions.

| Column         | Type         | Description                                  |
|----------------|--------------|----------------------------------------------|
| id             | UUID         | Primary key                                  |
| toilet_id      | UUID         | Reference to existing toilet (for edits)     |
| submitter_id   | UUID         | The user who submitted the entry             |
| submission_type| TEXT         | 'new', 'edit', or 'report'                   |
| status         | TEXT         | 'pending', 'approved', or 'rejected'         |
| data           | JSONB        | The submitted toilet data (see format below) |
| reason         | TEXT         | Reason for edit/report                       |
| created_at     | TIMESTAMPTZ  | When the submission was created              |
| updated_at     | TIMESTAMPTZ  | When the submission was last updated         |

### `toilets` Table

Stores approved toilet entries.

| Column         | Type         | Description                                  |
|----------------|--------------|----------------------------------------------|
| id             | UUID         | Primary key                                  |
| name           | TEXT         | Toilet name                                  |
| description    | TEXT         | Toilet description                           |
| location       | GEOGRAPHY    | PostGIS point (latitude, longitude)          |
| rating         | DECIMAL      | Average rating                               |
| address        | TEXT         | Street address                               |
| is_accessible  | BOOLEAN      | Whether the toilet is accessible             |
| building_id    | UUID         | Reference to buildings table                 |
| building_name  | TEXT         | Name of the building                         |
| floor_level    | INTEGER      | Floor level (positive = above ground)        |
| floor_name     | TEXT         | Human-readable floor name                    |
| photos         | TEXT[]       | Array of photo URLs                          |
| opening_hours  | TEXT         | Opening hours information                    |
| amenities      | JSONB        | Amenities information                        |
| submitted_by   | UUID         | Who submitted the toilet                     |
| last_edited_by | UUID         | Who last edited the toilet                   |
| created_at     | TIMESTAMPTZ  | When the toilet was added                    |
| updated_at     | TIMESTAMPTZ  | When the toilet was last updated             |

## Submission Data Format

The `data` field in the `toilet_submissions` table is a JSONB object with the following structure:

```json
{
  "name": "158 Coffeeshop Toilet",
  "description": "Public toilet in the coffeeshop", // Optional, falls back to name if missing
  "location": {
    "latitude": 1.292684,
    "longitude": 103.802744
  },
  "address": "Mei Ling Street, Singapore, 140158",
  "buildingName": "Block 158 Food Centre", // camelCase in JSON
  "floorLevel": 1, // camelCase in JSON
  "isAccessible": false, // camelCase in JSON
  "amenities": {
    "hasSoap": false,
    "hasShower": false,
    "hasHandDryer": false,
    "hasWaterSpray": false,
    "hasPaperTowels": false,
    "hasBabyChanging": false,
    "isGenderNeutral": false
  },
  "photos": [] // Array of photo URLs
}
```

## Field Mapping: Submission → Database

When a submission is approved, the `process_approved_submission()` trigger maps fields from the submission to the toilets table:

| Submission Data Field | Toilets Table Column | Data Type Conversion                   |
|-----------------------|----------------------|----------------------------------------|
| name                  | name                 | Direct mapping                         |
| description           | description          | Falls back to name if missing          |
| location.latitude     | location             | Converted to PostGIS point             |
| location.longitude    | location             | Converted to PostGIS point             |
| address               | address              | Direct mapping                         |
| buildingName          | building_name        | camelCase → snake_case                 |
| floorLevel            | floor_level          | camelCase → snake_case, string → int   |
| isAccessible          | is_accessible        | camelCase → snake_case, string → bool  |
| amenities             | amenities            | Direct mapping as JSONB                |
| photos                | photos               | JSON array → text[]                    |
| *submitter_id*        | submitted_by         | From submission record, not JSON data  |

## Key Conversions

### Location Data Conversion

The JSON format stores location as an object with latitude and longitude:
```json
"location": {
  "latitude": 1.292684,
  "longitude": 103.802744
}
```

This is converted to a PostGIS point in the database using:
```sql
ST_SetSRID(ST_MakePoint(
  (NEW.data->'location'->>'longitude')::float,
  (NEW.data->'location'->>'latitude')::float
), 4326)::geography
```

### Photos Array Conversion

The JSON format stores photos as a JSON array:
```json
"photos": ["url1", "url2", "url3"]
```

This is converted to a PostgreSQL text[] array using:
```sql
COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.data->'photos'))), ARRAY[]::text[])
```

## Best Practices

1. **Validate Submission Format**: Always validate submission data against the expected schema before sending to the server.

2. **Handle Optional Fields**: Some fields are optional. The server will use default values or fallbacks.

3. **Consistent Naming**: Frontend uses camelCase (e.g., `floorLevel`), while database uses snake_case (e.g., `floor_level`).

4. **Type Safety**: Ensure proper type coercion for numeric and boolean values.

5. **Testing**: Test submissions against the schema before deploying changes to ensure compatibility.

## Schema Validation

Consider implementing JSON Schema validation for submissions to catch format issues early:

```javascript
// Example JSON Schema for validation
const toiletSubmissionSchema = {
  type: "object",
  required: ["name", "location", "isAccessible"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    location: {
      type: "object",
      required: ["latitude", "longitude"],
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" }
      }
    },
    address: { type: "string" },
    buildingName: { type: "string" },
    floorLevel: { type: "integer" },
    isAccessible: { type: "boolean" },
    amenities: {
      type: "object",
      properties: {
        hasSoap: { type: "boolean" },
        hasShower: { type: "boolean" },
        hasHandDryer: { type: "boolean" },
        hasWaterSpray: { type: "boolean" },
        hasPaperTowels: { type: "boolean" },
        hasBabyChanging: { type: "boolean" },
        isGenderNeutral: { type: "boolean" }
      }
    },
    photos: {
      type: "array",
      items: { type: "string" }
    }
  }
};
