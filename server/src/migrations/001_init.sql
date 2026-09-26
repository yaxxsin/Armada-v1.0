-- Armada Control 104 Group — initial schema
-- Run with: npm run migrate  (or psql -f migrations/001_init.sql)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                       SERIAL PRIMARY KEY,
  plat                     TEXT,
  merk                     TEXT,
  tahun                    TEXT,
  lokasi                   TEXT,
  pajak_tahunan_berlaku   DATE,
  pajak_5tahunan_berlaku  DATE,
  keur_berlaku             DATE,
  interval_km              INT NOT NULL DEFAULT 5000,
  interval_bulan           INT NOT NULL DEFAULT 6,
  km_sekarang              INT,
  catatan                  TEXT,
  foto                     TEXT,
  created_by               INT REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_history (
  id         SERIAL PRIMARY KEY,
  vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tanggal    DATE,
  km         INT,
  jenis      TEXT,
  biaya      INT,
  bengkel    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id    SERIAL PRIMARY KEY,
  date  DATE UNIQUE NOT NULL,
  ok    INT NOT NULL DEFAULT 0,
  amber INT NOT NULL DEFAULT 0,
  red   INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plat ON vehicles (plat);
CREATE INDEX IF NOT EXISTS idx_service_history_vehicle ON service_history (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots (date);

-- Helper to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicles_updated ON vehicles;
CREATE TRIGGER trg_vehicles_updated
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
