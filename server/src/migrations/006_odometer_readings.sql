-- Weekly/manual odometer readings for fleet service validation.
CREATE TABLE IF NOT EXISTS vehicle_odometer_readings (
  id                 BIGSERIAL PRIMARY KEY,
  vehicle_id         INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  reading_date       DATE NOT NULL,
  odometer_km        INT NOT NULL CHECK (odometer_km >= 0),
  source             TEXT NOT NULL DEFAULT 'excel',
  notes              TEXT,
  is_correction      BOOLEAN NOT NULL DEFAULT false,
  correction_reason  TEXT,
  created_by         INT REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_odometer_reading
  ON vehicle_odometer_readings (vehicle_id, reading_date);

CREATE INDEX IF NOT EXISTS idx_odometer_readings_vehicle_date
  ON vehicle_odometer_readings (vehicle_id, reading_date DESC);
