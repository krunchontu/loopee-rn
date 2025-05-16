# Toilet Map Visibility Investigation

## Summary

We investigated the issue where only 2 toilets were visible on the map. After thorough diagnostics, we confirmed this is **not a technical bug** but simply reflects the current state of the database. Only 2 toilets match the search criteria within the user's location radius.

## Diagnostic Process

1. Added diagnostic logging at multiple layers:
   - Database query results in Supabase service
   - Toilet validation in the store
   - Clustering process
   - Map marker rendering

2. Findings:
   - Database query returns exactly 2 toilets
   - Both have valid coordinates that are correctly processed
   - No toilets are being incorrectly filtered out

## Current Toilets in Database

Based on our diagnostics, these are the only two toilets currently in the database:

1. **Orchard MRT Toilet**
   - ID: `50794e9d-62cb-42d9-a753-8d00eb8517af`
   - Coordinates: `1.3044, 103.8321`
   - Distance from test location: ~3.4 km

2. **Plaza Singapura Toilet**
   - ID: `3c48de2f-4958-4f4b-b726-52bc3060f192`
   - Coordinates: `1.3008, 103.8453`
   - Distance from test location: ~4.7 km

## Technical Implementation

The app's architecture for handling toilet data is robust:

1. Database function `find_toilets_within_radius` returns toilets with actual coordinates
2. Supabase service transforms data to match frontend models
3. Toilet store validates and filters any invalid data
4. Clustering utility organizes toilets for map display
5. MapView renders markers for each toilet or cluster

## Recommendations

To address the limited number of toilets on the map:

### Short-term Solutions

1. **Add Test Data**: Add more test toilet records to the database for development and testing
   ```sql
   -- Example SQL insert for test toilets
   INSERT INTO toilets (name, location, rating, is_accessible)
   VALUES 
     ('VivoCity Toilet', 'SRID=4326;POINT(103.8222 1.2644)', 4.5, true),
     ('Sentosa Gateway Toilet', 'SRID=4326;POINT(103.8207 1.2580)', 3.8, false),
     ('Marina Bay Sands Toilet', 'SRID=4326;POINT(103.8614 1.2834)', 4.9, true);
   ```

2. **Increase Search Radius**: Temporarily increase the default search radius (currently 5000m)

### Long-term Solutions

1. **Data Collection Strategy**: Implement a strategy for collecting real toilet location data
2. **Crowdsourcing Feature**: Allow users to submit new toilet locations
3. **Admin Panel**: Build an admin interface for managing toilet data
4. **Integration with Public APIs**: Explore integration with public facilities or map APIs

## Conclusion

The map display functionality is working as designed. The limited number of toilets visible is due to limited data in the database, not a technical issue with the application.
