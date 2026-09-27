import { query } from '../db.ts';
import { toDTO } from './dto.ts';
import { overallStatus } from '../utils/fleet.ts';

export async function loadAllVehicles() {
  // Pemakai fungsi ini hanya stats dan snapshot, yang butuh status dan odometer
  // saja. Kolom foto/base64 dikecualikan agar tidak ikut terbaca.
  const { rows: vehicles } = await query(
    `SELECT
       id, plat, merk, tahun, lokasi, pic,
       pajak_tahunan_berlaku, pajak_5tahunan_berlaku, keur_berlaku,
       interval_km, interval_bulan, km_sekarang, catatan,
       created_by, created_at
     FROM vehicles
     ORDER BY created_at DESC`
  );
  const { rows: hist } = await query(
    // `struk` adalah data URL base64 dan tidak dipakai oleh pemanggil fungsi
    // ini (hanya butuh tanggal dan km untuk perhitungan status).
    `SELECT id, vehicle_id, tanggal, km, jenis, biaya, bengkel
     FROM service_history
     ORDER BY tanggal DESC NULLS LAST`
  );
  const byVehicle = new Map();
  for (const h of hist) {
    if (!byVehicle.has(h.vehicle_id)) byVehicle.set(h.vehicle_id, []);
    byVehicle.get(h.vehicle_id).push({
      id: h.id,
      tanggal: h.tanggal,
      km: h.km,
      jenis: h.jenis,
      biaya: h.biaya,
      bengkel: h.bengkel,
      struk: h.struk,
    });
  }
  return vehicles.map((v) => toDTO(v, byVehicle.get(v.id) || []));
}

export async function loadVehiclesPaginated({
  text = '',
  status = 'all',
  lokasi = 'all',
  page = 1,
  limit = 50,
}) {
  const offset = (page - 1) * limit;
  const textValue = String(text);
  const statusValue = String(status);
  const lokasiValue = String(lokasi);
  const conditions = [];
  const params = [];

  if (textValue) {
    params.push(textValue);
    const param = `$${params.length}`;
    conditions.push(
      `(POSITION(LOWER(${param}) IN LOWER(COALESCE(merk, ''))) > 0 OR
        POSITION(LOWER(${param}) IN LOWER(COALESCE(plat, ''))) > 0)`
    );
  }
  if (lokasiValue !== 'all') {
    params.push(lokasiValue);
    conditions.push(`lokasi = $${params.length}`);
  }
  if (statusValue === 'attention') {
    conditions.push(`overall_status <> 'ok'`);
  } else if (statusValue === 'overdue') {
    conditions.push(`overall_status = 'red'`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  const limitParam = `$${params.length - 1}`;
  const offsetParam = `$${params.length}`;

  // Status is calculated before filtering and pagination. Aggregating the bounded
  // page in the same statement keeps total accurate even when the requested page
  // is empty, while all user-controlled values remain bound parameters.
  const { rows } = await query(
    `WITH latest_history AS (
       SELECT DISTINCT ON (vehicle_id) vehicle_id, tanggal, km
       FROM service_history
       WHERE tanggal IS NOT NULL
       ORDER BY vehicle_id, tanggal DESC, id ASC
     ),
     vehicle_data AS (
        -- Daftar armada hanya butuh SATU foto (foto pertama) sebagai thumbnail,
        -- bukan seluruh set. Operator photos->>0 mengambil elemen pertama
        -- dari JSONB tanpa menarik array-nya, jadi satu halaman daftar tidak
        -- ikut menarik puluhan MB gambar yang tidak ditampilkan. Foto
        -- selengkapnya diambil saat detail dibuka via GET /api/vehicles/:id.
        -- Kolom foto (legacy, satu foto) tetap jadi fallback.
       SELECT
         v.id, v.plat, v.merk, v.tahun, v.lokasi, v.pic,
         v.pajak_tahunan_berlaku, v.pajak_5tahunan_berlaku, v.keur_berlaku,
         v.interval_km, v.interval_bulan, v.km_sekarang, v.catatan,
         v.created_by, v.created_at,
         COALESCE(
           v.photos->>0,
           CASE WHEN COALESCE(v.foto, '') <> '' THEN v.foto END
         ) AS cover_photo,
         h.tanggal AS last_service_date, h.km AS last_service_km
       FROM vehicles v
       LEFT JOIN latest_history h ON h.vehicle_id = v.id
     ),
     calculated_vehicles AS (
       SELECT v.*,
         (
           v.last_service_date +
           (COALESCE(NULLIF(v.interval_bulan, 0), 6) * INTERVAL '1 month')
         )::date AS next_service_date,
         CASE
           WHEN v.last_service_km IS NOT NULL AND v.km_sekarang IS NOT NULL
             THEN v.last_service_km +
               COALESCE(NULLIF(v.interval_km, 0), 5000) - v.km_sekarang
           END AS km_left
       FROM vehicle_data v
     ),
     vehicles_with_status AS (
       SELECT v.*,
         CASE
           WHEN v.pajak_tahunan_berlaku < CURRENT_DATE
             OR v.pajak_5tahunan_berlaku < CURRENT_DATE
             OR v.keur_berlaku < CURRENT_DATE
             OR v.next_service_date < CURRENT_DATE
             OR v.km_left <= 0
             THEN 'red'
           WHEN v.pajak_tahunan_berlaku <= CURRENT_DATE + 30
             OR v.pajak_5tahunan_berlaku <= CURRENT_DATE + 60
             OR v.keur_berlaku <= CURRENT_DATE + 30
             OR v.next_service_date <= CURRENT_DATE + 14
             OR v.km_left <= 500
             THEN 'amber'
           ELSE 'ok'
         END AS overall_status
       FROM calculated_vehicles v
     ),
     filtered_vehicles AS (
       SELECT * FROM vehicles_with_status ${where}
     )
     SELECT
       COALESCE(
         json_agg(page_vehicle ORDER BY page_vehicle.created_at DESC),
         '[]'::json
       ) AS vehicles,
       (SELECT COUNT(*)::int FROM filtered_vehicles) AS total
     FROM (
       SELECT *
       FROM filtered_vehicles
       ORDER BY created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}
     ) page_vehicle`,
    params
  );

  const vehicles = rows[0]?.vehicles || [];
  const total = rows[0]?.total || 0;

  const vehicleIds = vehicles.map((v) => v.id);
  let hist = [];
  if (vehicleIds.length > 0) {
    const firstHistoryParam = 1;
    const placeholders = vehicleIds
      .map((_, i) => `$${firstHistoryParam + i}`)
      .join(',');
    const { rows: rowsHist } = await query(
      // Sama seperti di atas: `struk` (base64) tidak dipakai oleh daftar armada
      // dan diambil terpisah saat detail kendaraan dibuka.
      `SELECT id, vehicle_id, tanggal, km, jenis, biaya, bengkel
       FROM service_history
       WHERE vehicle_id IN (${placeholders})
       ORDER BY tanggal DESC NULLS LAST`,
      vehicleIds
    );
    hist = rowsHist;
  }

  const byVehicle = new Map();
  for (const h of hist) {
    if (!byVehicle.has(h.vehicle_id)) byVehicle.set(h.vehicle_id, []);
    byVehicle.get(h.vehicle_id).push({
      id: h.id,
      tanggal: h.tanggal,
      km: h.km,
      jenis: h.jenis,
      biaya: h.biaya,
      bengkel: h.bengkel,
      struk: h.struk,
    });
  }

  return {
    vehicles: vehicles.map((v) => toDTO(v, byVehicle.get(v.id) || [])),
    total,
  };
}

export async function recordSnapshot() {
  const vehicles = await loadAllVehicles();
  let ok = 0;
  let amber = 0;
  let red = 0;
  for (const v of vehicles) {
    const overall = overallStatus({ ...v, history: v.serviceHistory });
    if (overall === 'red') red++;
    else if (overall === 'amber') amber++;
    else ok++;
  }
  const date = new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO snapshots (date, ok, amber, red)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (date) DO UPDATE SET ok=$2, amber=$3, red=$4`,
    [date, ok, amber, red]
  );
}

