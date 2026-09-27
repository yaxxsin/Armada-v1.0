import { query } from '../db.ts';
import { toDTO } from './dto.ts';
import { computeVehicle, overallStatus, DEFAULTS } from '../utils/fleet.ts';
import { statusText, complianceText, daysLabel } from './reportFormat.ts';

export type ReportScope = 'all' | 'attention' | 'overdue' | 'due-soon' | 'safe';
export type ReportSort = 'urgency' | 'plat' | 'lokasi' | 'odometer';

export type ReportFilters = {
  text?: string;
  lokasi?: string;
  scope?: ReportScope;
  sort?: ReportSort;
};

function sumBy(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function groupBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const groupKey = item[key] || 'Tanpa lokasi';
    if (!map.has(groupKey)) map.set(groupKey, []);
    map.get(groupKey).push(item);
  }
  return map;
}

/**
 * Loads the whole fleet with history and odometer readings, then flattens it
 * into report rows. Filtering and sorting happen in memory because a report is
 * always a full snapshot, never a page of the interactive list.
 */
export async function buildReport(filters: ReportFilters = {}) {
  // Kolom foto sengaja tidak diambil. Laporan hanya butuh jumlah dan
  // ada/tidaknya foto, sedangkan `foto`/`photos` berisi data URL base64
  // yang berukuran ratusan KB per kendaraan. Menghitungnya di SQL membuat
  // laporan tidak menarik data gambar yang tidak pernah ditampilkan.
  const { rows: vehicles } = await query(
    `SELECT
       id, plat, merk, tahun, lokasi, pic,
       pajak_tahunan_berlaku, pajak_5tahunan_berlaku, keur_berlaku,
       interval_km, interval_bulan, km_sekarang, catatan, created_by,
       CASE
         WHEN jsonb_array_length(COALESCE(photos, '[]'::jsonb)) > 0
           THEN jsonb_array_length(COALESCE(photos, '[]'::jsonb))
         WHEN COALESCE(foto, '') <> '' THEN 1
         ELSE 0
       END AS photo_count
     FROM vehicles
     ORDER BY plat NULLS LAST, id`
  );
  const { rows: history } = await query(
    // `struk` adalah data URL base64. Laporan hanya menampilkan "ada/tidak",
    // jadi cukup diambil sebagai boolean.
    `SELECT id, vehicle_id, tanggal, km, jenis, biaya, bengkel,
            COALESCE(struk, '') <> '' AS has_struk
     FROM service_history
     ORDER BY tanggal DESC NULLS LAST, id DESC`
  );
  const { rows: readings } = await query(
    `SELECT vehicle_id, reading_date, odometer_km, source, is_correction
     FROM vehicle_odometer_readings
     ORDER BY reading_date DESC, id DESC`
  );

  const historyByVehicle = new Map();
  for (const row of history) {
    if (!historyByVehicle.has(row.vehicle_id)) historyByVehicle.set(row.vehicle_id, []);
    historyByVehicle.get(row.vehicle_id).push({
      id: row.id,
      tanggal: row.tanggal,
      km: row.km,
      jenis: row.jenis,
      biaya: row.biaya,
      bengkel: row.bengkel,
      hasStruk: Boolean(row.has_struk),
    });
  }

  const readingsByVehicle = new Map();
  for (const row of readings) {
    if (!readingsByVehicle.has(row.vehicle_id)) readingsByVehicle.set(row.vehicle_id, []);
    readingsByVehicle.get(row.vehicle_id).push({
      tanggal: row.reading_date,
      km: row.odometer_km,
      sumber: row.source,
      koreksi: row.is_correction,
    });
  }

  const dtos = vehicles.map((v) => toDTO(v, historyByVehicle.get(v.id) || []));

  const rows = dtos.map((v) => {
    const c = computeVehicle({ ...v, history: v.serviceHistory });
    const odometerHistory = readingsByVehicle.get(v.id) || [];
    const history = v.serviceHistory || [];
    const status = overallStatus({ ...v, history });

    return {
      id: v.id,
      plat: v.plat,
      merk: v.merk,
      tahun: v.tahun,
      lokasi: v.lokasi,
      pic: v.pic,
      catatan: v.catatan,
      photoCount: Number(v.photo_count) || 0,
      intervalKm: v.intervalKm || DEFAULTS.intervalKm,
      intervalBulan: v.intervalBulan || DEFAULTS.intervalBulan,
      kmSekarang: v.kmSekarang,

      pajakTahunanBerlaku: v.pajakTahunanBerlaku,
      pajakTahunanStatus: c.pajakTahunanStatus,
      pajakTahunanDays: c.pajakTahunanDays,

      pajak5TahunanBerlaku: v.pajak5TahunanBerlaku,
      pajak5TahunanStatus: c.pajak5TahunanStatus,
      pajak5TahunanDays: c.pajak5TahunanDays,

      keurBerlaku: v.keurBerlaku,
      keurStatus: c.keurStatus,
      keurDays: c.keurDays,

      lastService: c.lastService,
      nextServiceDate: c.nextServiceDate,
      nextServiceKm: c.nextServiceKm,
      kmLeft: c.kmLeft,
      serviceDaysDate: c.serviceDaysDate,
      serviceStatus: c.serviceStatus,

      overallStatus: status,
      overallStatusText: statusText(status),

      serviceHistory: history,
      serviceCount: history.length,
      serviceCostTotal: sumBy(history, 'biaya'),
      odometerHistory,
      odometerReadingCount: odometerHistory.length,

      createdAt: v.createdAt,
    };
  });

  const filtered = applyFilters(rows, filters);
  const sorted = applySort(filtered, filters.sort || 'urgency');

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      text: filters.text || '',
      lokasi: filters.lokasi || 'all',
      scope: filters.scope || 'all',
      sort: filters.sort || 'urgency',
    },
    rows: sorted,
    summary: buildSummary(sorted),
    locations: [...new Set(rows.map((r) => r.lokasi).filter(Boolean))].sort((a: string, b: string) =>
      a.localeCompare(b, 'id')
    ),
    breakdown: buildBreakdown(sorted),
    totals: buildTotals(rows, sorted),
  };
}

function applyFilters(rows, filters) {
  const text = String(filters.text || '').trim().toLowerCase();
  const lokasi = String(filters.lokasi || 'all');
  const scope = String(filters.scope || 'all');

  return rows.filter((row) => {
    if (lokasi !== 'all' && (row.lokasi || 'Tanpa lokasi') !== lokasi) return false;
    if (scope === 'attention' && row.overallStatus === 'ok') return false;
    if (scope === 'overdue' && row.overallStatus !== 'red') return false;
    if (scope === 'due-soon' && row.overallStatus !== 'amber') return false;
    if (scope === 'safe' && row.overallStatus !== 'ok') return false;
    if (text) {
      const haystack = `${row.plat || ''} ${row.merk || ''} ${row.pic || ''} ${row.lokasi || ''}`.toLowerCase();
      if (!haystack.includes(text)) return false;
    }
    return true;
  });
}

function applySort(rows, sort) {
  const list = [...rows];
  if (sort === 'plat') {
    return list.sort((a, b) => String(a.plat || '').localeCompare(String(b.plat || ''), 'id'));
  }
  if (sort === 'lokasi') {
    return list.sort(
      (a, b) =>
        String(a.lokasi || '').localeCompare(String(b.lokasi || ''), 'id') ||
        String(a.plat || '').localeCompare(String(b.plat || ''), 'id')
    );
  }
  if (sort === 'odometer') {
    return list.sort(
      (a, b) => Number(b.kmSekarang || 0) - Number(a.kmSekarang || 0)
    );
  }

  const rank = { red: 0, amber: 1, ok: 2 };
  const urgency = (row) => {
    const days = [
      row.pajakTahunanDays,
      row.pajak5TahunanDays,
      row.keurDays,
      row.serviceDaysDate,
    ].filter((d) => d !== null && d !== undefined);
    const worst = days.length ? Math.min(...days) : 9999;
    const km = row.kmLeft === null || row.kmLeft === undefined ? 999999 : row.kmLeft;
    return rank[row.overallStatus] * 1_000_000 + Math.min(worst, 9999) * 100 + Math.min(km, 99);
  };
  return list.sort(
    (a, b) => urgency(a) - urgency(b) || String(a.plat || '').localeCompare(String(b.plat || ''), 'id')
  );
}

function buildSummary(rows) {
  const summary = {
    total: rows.length,
    ok: 0,
    amber: 0,
    red: 0,
    totalPhotos: 0,
    totalOdometer: 0,
    totalServiceCost: 0,
    duePajakTahunan: 0,
    duePajak5Tahunan: 0,
    dueKeur: 0,
    dueService: 0,
  };
  for (const row of rows) {
    if (row.overallStatus === 'red') summary.red++;
    else if (row.overallStatus === 'amber') summary.amber++;
    else summary.ok++;
    summary.totalPhotos += row.photoCount;
    summary.totalOdometer += Number(row.kmSekarang || 0);
    summary.totalServiceCost += Number(row.serviceCostTotal || 0);
    if (row.pajakTahunanStatus !== 'ok') summary.duePajakTahunan++;
    if (row.pajak5TahunanStatus !== 'ok') summary.duePajak5Tahunan++;
    if (row.keurStatus !== 'ok') summary.dueKeur++;
    if (row.serviceStatus !== 'ok') summary.dueService++;
  }
  return summary;
}

function buildBreakdown(rows) {
  const groups = groupBy(rows, 'lokasi');
  return [...groups.entries()]
    .map(([lokasi, items]) => {
      const breakdown = {
        lokasi,
        total: items.length,
        ok: 0,
        amber: 0,
        red: 0,
        totalOdometer: sumBy(items, 'kmSekarang'),
        totalServiceCost: sumBy(items, 'serviceCostTotal'),
      };
      for (const item of items) {
        if (item.overallStatus === 'red') breakdown.red++;
        else if (item.overallStatus === 'amber') breakdown.amber++;
        else breakdown.ok++;
      }
      return breakdown;
    })
    .sort((a, b) => b.red - a.red || b.amber - a.amber || a.lokasi.localeCompare(b.lokasi, 'id'));
}

function buildTotals(allRows, filteredRows) {
  return {
    armadaTotal: allRows.length,
    laporanJumlah: filteredRows.length,
    lokasiTerpakai: new Set(allRows.map((r) => r.lokasi).filter(Boolean)).size,
  };
}

export { statusText, complianceText, daysLabel };
