import { Router } from 'express';
import { z } from 'zod';
import { getClient } from '../db.ts';
import requireAuth, { requireAdmin } from '../middleware/auth.ts';
import { recordSnapshot } from '../services/fleetService.ts';
import { validate } from '../middleware/validate.ts';

const emptyToNull = (value) => value === '' || value === undefined ? null : value;
const importPhotoDataUrl = z
  .string()
  .max(500_000, 'Ukuran foto kendaraan terlalu besar')
  .refine((value) => value.startsWith('data:image/'), 'Foto kendaraan harus berupa gambar');
const importVehicleSchema = z.object({
  merk: z.string().min(1, 'Merk wajib diisi'),
  plat: z.string().min(1, 'Plat wajib diisi'),
  tahun: z.preprocess(emptyToNull, z.union([z.string(), z.number()]).transform(String).nullable()).optional(),
  lokasi: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  pic: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  pajakTahunanBerlaku: z.preprocess(emptyToNull, z.string().date().nullable()).optional(),
  pajak5TahunanBerlaku: z.preprocess(emptyToNull, z.string().date().nullable()).optional(),
  keurBerlaku: z.preprocess(emptyToNull, z.string().date().nullable()).optional(),
  intervalKm: z.preprocess(emptyToNull, z.coerce.number().int().nonnegative().nullable()).optional(),
  intervalBulan: z.preprocess(emptyToNull, z.coerce.number().int().nonnegative().nullable()).optional(),
  kmSekarang: z.preprocess(emptyToNull, z.coerce.number().int().nonnegative().nullable()).optional(),
  catatan: z.preprocess(emptyToNull, z.string().max(500).nullable()).optional(),
  foto: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  photos: z.preprocess(emptyToNull, z.array(importPhotoDataUrl).max(4, 'Maksimal 4 foto kendaraan').nullable()).optional(),
});

const importSchema = z.object({
  vehicles: z.array(importVehicleSchema).max(500, 'Maksimal 500 kendaraan per import.'),
});

const odometerImportSchema = z.object({
  readings: z.array(z.object({
    plat: z.string().min(1, 'Plat wajib diisi'),
    tanggal: z.string().date('Tanggal harus berformat YYYY-MM-DD'),
    odometerKm: z.preprocess(
      (value) => value === '' || value === null || value === undefined ? undefined : value,
      z.coerce.number().int().nonnegative('Odometer wajib diisi dan tidak boleh negatif')
    ),
    sumber: z.string().trim().max(40).optional(),
    catatan: z.string().trim().max(500).optional(),
    isCorrection: z.boolean().optional(),
    correctionReason: z.string().trim().max(200).optional(),
  })).max(5000, 'Maksimal 5.000 pembacaan odometer per import.'),
});

const router = Router();

router.use(requireAuth);

// POST /api/import  body: { vehicles: [...] }
router.post('/import', requireAdmin, validate(importSchema), async (req, res) => {
  const incoming = req.validated.vehicles;
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query('SELECT plat FROM vehicles');
    const owned = new Set(existing.map((row) => (row.plat || '').toUpperCase()));
    let inserted = 0;

    for (const vehicle of incoming) {
      const plat = vehicle.plat.toUpperCase();
      if (owned.has(plat)) continue;
      const photos = vehicle.photos?.length
        ? vehicle.photos
        : vehicle.foto
          ? [vehicle.foto]
          : [];
      await client.query(
        `INSERT INTO vehicles
           (merk, plat, tahun, lokasi, pic, pajak_tahunan_berlaku, pajak_5tahunan_berlaku,
            keur_berlaku, interval_km, interval_bulan, km_sekarang, catatan, foto, photos, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          vehicle.merk,
          plat,
          vehicle.tahun || null,
          vehicle.lokasi || null,
          vehicle.pic || null,
          vehicle.pajakTahunanBerlaku || null,
          vehicle.pajak5TahunanBerlaku || null,
          vehicle.keurBerlaku || null,
          vehicle.intervalKm || 5000,
          vehicle.intervalBulan || 6,
          vehicle.kmSekarang ?? null,
          vehicle.catatan || null,
          vehicle.foto || photos[0] || null,
          JSON.stringify(photos),
          req.user.id,
        ]
      );
      inserted++;
      owned.add(plat);
    }

    await client.query('COMMIT');
    res.json({ ok: true, imported: inserted });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
});

// POST /api/odometer/import body: { readings: [...] }
router.post('/odometer/import', requireAdmin, validate(odometerImportSchema), async (req, res) => {
  const incoming = req.validated.readings;
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const { rows: vehicleRowsRaw } = await client.query('SELECT id, plat, km_sekarang FROM vehicles');
    const vehicleRows: any[] = vehicleRowsRaw || [];
    const vehicleByPlate = new Map<string, any>(vehicleRows.map((vehicle) => [String(vehicle.plat || '').toUpperCase(), vehicle]));
    const vehicleIds = vehicleRows.map((vehicle) => vehicle.id);
    const { rows: existingRowsRaw } = vehicleIds.length > 0
      ? await client.query('SELECT vehicle_id, reading_date, odometer_km FROM vehicle_odometer_readings', [])
      : { rows: [] };
    const existingReadings: any[] = existingRowsRaw || [];

    const existingKeys = new Set(existingReadings.map((reading) => `${reading.vehicle_id}:${reading.reading_date}`));
    const latestByVehicle = new Map<any, any>();
    existingReadings.forEach((reading) => {
      const current = latestByVehicle.get(reading.vehicle_id);
      if (!current || String(reading.reading_date) > String(current.reading_date)) latestByVehicle.set(reading.vehicle_id, reading);
    });

    const errors: string[] = [];
    const seenKeys = new Set<string>();
    const pending: any[] = [];
    const orderedIncoming = [...incoming].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    for (const reading of orderedIncoming) {
      const vehicle = vehicleByPlate.get(String(reading.plat).toUpperCase());
      if (!vehicle) {
        errors.push(`Plat ${reading.plat} tidak ditemukan.`);
        continue;
      }
      const key = `${vehicle.id}:${reading.tanggal}`;
      if (existingKeys.has(key) || seenKeys.has(key)) {
        errors.push(`Pembacaan ${reading.plat} tanggal ${reading.tanggal} sudah ada.`);
        continue;
      }
      seenKeys.add(key);
      if (reading.isCorrection && !reading.correctionReason) {
        errors.push(`Koreksi ${reading.plat} tanggal ${reading.tanggal} wajib memiliki alasan.`);
        continue;
      }
      const latest = latestByVehicle.get(vehicle.id);
      if (!reading.isCorrection && latest && reading.odometerKm < latest.odometer_km) {
        errors.push(`Odometer ${reading.plat} lebih kecil dari pembacaan sebelumnya.`);
        continue;
      }
      latestByVehicle.set(vehicle.id, {
        reading_date: reading.tanggal,
        odometer_km: reading.odometerKm,
      });
      pending.push({ vehicle, reading });
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: errors[0], details: errors });
    }

    let inserted = 0;
    let updatedVehicles = 0;
    for (const { vehicle, reading } of pending) {
      await client.query(
        `INSERT INTO vehicle_odometer_readings
          (vehicle_id, reading_date, odometer_km, source, notes, is_correction, correction_reason, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          vehicle.id,
          reading.tanggal,
          reading.odometerKm,
          reading.sumber || 'excel',
          reading.catatan || null,
          reading.isCorrection || false,
          reading.correctionReason || null,
          req.user.id,
        ]
      );
      inserted++;
      const currentKm = Number(vehicle.km_sekarang ?? 0);
      if (reading.odometerKm > currentKm) {
        await client.query('UPDATE vehicles SET km_sekarang = $1 WHERE id = $2', [reading.odometerKm, vehicle.id]);
        vehicle.km_sekarang = reading.odometerKm;
        updatedVehicles++;
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, imported: inserted, updatedVehicles });
    recordSnapshot().catch((error) => console.error('Snapshot after odometer import failed:', error.message));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
});

export default router;
