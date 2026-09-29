-- Add registration_url and location_address columns to events table
ALTER TABLE events ADD COLUMN registration_url TEXT;
ALTER TABLE events ADD COLUMN location_address TEXT;
