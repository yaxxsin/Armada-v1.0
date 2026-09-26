-- Add the person in charge (PIC) for each vehicle.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS pic TEXT;
