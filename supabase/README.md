# Loopee Database Setup

This directory contains the database schema and migrations for the Loopee app.

## Structure

- `migrations/`: Contains SQL migration files in chronological order
  - `20250508_initial_schema.sql`: Initial database setup with core tables
  - `20250508_location_functions.sql`: PostGIS functions for location-based queries

## Tables

### toilets
- `id`: UUID primary key
- `name`: Text, required
- `location`: Geographic point (latitude/longitude)
- `rating`: Decimal (0.0-5.0)
- `is_accessible`: Boolean
- `photos`: Array of photo URLs
- `opening_hours`: Text
- `amenities`: JSON object containing facility features
- `created_at`: Timestamp

### reviews
- `id`: UUID primary key
- `toilet_id`: UUID foreign key to toilets
- `rating`: Integer (1-5)
- `comment`: Text
- `photos`: Array of photo URLs
- `created_at`: Timestamp

## Setup Instructions

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Enable the PostGIS extension in your Supabase database:
   - Go to Database → Extensions
   - Search for "postgis"
   - Click "Enable"

3. Run the migrations:
   - Go to Database → SQL Editor
   - Copy the contents of each migration file
   - Execute them in chronological order

## Development

### Adding New Migrations

1. Create a new SQL file in the `migrations` directory
2. Name it with the date prefix: `YYYYMMDD_description.sql`
3. Add the SQL commands for your changes
4. Document the changes in this README

### Testing

The initial schema includes sample data for testing. You can verify the setup by:
1. Checking if the tables were created
2. Confirming the sample data was inserted
3. Testing geographic queries using PostGIS:
   ```sql
   -- Find toilets within 1km of a location
   select * from find_toilets_within_radius(1.3521, 103.8198, 1000);
   
   -- Update a toilet's location
   select update_toilet_location('toilet-uuid', 1.3521, 103.8198);
   ```

## Future Enhancements (Planned)

Batch 2:
- User authentication
- Row Level Security (RLS) policies
- User-specific features

Batch 3:
- Advanced PostGIS functions
- Rating update triggers
- Additional amenities tracking
