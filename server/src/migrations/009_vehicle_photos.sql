-- Support up to four vehicle photos from different angles.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;
