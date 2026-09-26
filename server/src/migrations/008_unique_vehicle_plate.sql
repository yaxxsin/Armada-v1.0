-- Enforce one vehicle per normalized license plate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_plat_normalized
  ON vehicles (UPPER(TRIM(plat)))
  WHERE plat IS NOT NULL AND TRIM(plat) <> '';
