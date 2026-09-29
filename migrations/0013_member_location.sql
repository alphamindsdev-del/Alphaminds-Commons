-- Phase D: member location for chapter proximity matching (15 km Haversine)
ALTER TABLE members ADD COLUMN latitude REAL;
ALTER TABLE members ADD COLUMN longitude REAL;
