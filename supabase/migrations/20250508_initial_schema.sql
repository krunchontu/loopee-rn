-- Enable required extensions
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- Core tables for MVP
create table toilets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location geography(Point, 4326) not null,
  rating decimal(2,1) not null default 0.0,
  is_accessible boolean not null default false,
  photos text[] default array[]::text[],
  opening_hours text,
  amenities jsonb not null default '{
    "babyChanging": false,
    "handDryer": false
  }',
  created_at timestamp with time zone default now()
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  toilet_id uuid references toilets(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  photos text[] default array[]::text[],
  created_at timestamp with time zone default now()
);

-- Basic index for location queries
create index toilets_location_idx on toilets using gist(location);

-- Sample data for testing
insert into toilets (name, location, rating, is_accessible, opening_hours) values
('Central Mall Restroom', 'SRID=4326;POINT(103.8198 1.3521)', 4.5, true, '24/7'),
('Plaza Singapura Toilet', 'SRID=4326;POINT(103.8453 1.3008)', 4.0, true, '10:00-22:00'),
('Orchard MRT Toilet', 'SRID=4326;POINT(103.8321 1.3044)', 3.5, false, '05:30-00:00');

insert into reviews (toilet_id, rating, comment) values
((select id from toilets limit 1), 5, 'Very clean and accessible'),
((select id from toilets limit 1), 4, 'Well maintained'),
((select id from toilets limit 1 offset 1), 4, 'Good facilities');
