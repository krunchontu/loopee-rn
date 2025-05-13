-- Function to find toilets within a specified radius (in meters)
create or replace function find_toilets_within_radius(
  lat double precision,
  lng double precision,
  radius_meters int default 5000
)
returns table (
  id uuid,
  name text,
  distance_meters float,
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

-- Function to update a toilet's location
create or replace function update_toilet_location(
  toilet_id uuid,
  lat double precision,
  lng double precision
)
returns void
language sql
as $$
  update toilets
  set location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  where id = toilet_id
$$;

-- Example usage:
-- select * from find_toilets_within_radius(1.3521, 103.8198, 1000);
-- select update_toilet_location('toilet-uuid', 1.3521, 103.8198);
