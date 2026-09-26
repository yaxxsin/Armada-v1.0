-- Add an optional service receipt image (stored as a compressed data URL) to service history.
ALTER TABLE service_history
  ADD COLUMN IF NOT EXISTS struk TEXT;
