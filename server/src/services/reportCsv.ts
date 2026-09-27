import type { buildReport } from './reportService.ts';
import { complianceText, daysLabel, formatDate, formatInstantDate, formatTimestamp } from './reportFormat.ts';

type Report = Awaited<ReturnType<typeof buildReport>>;

/**
 * CSV export. The first block of columns mirrors the bulk import template so a
 * report can be corrected in Excel and re-imported without rearranging headers.
 * Extra read-only columns follow after, prefixed so they are easy to filter out.
 */
const IMPORT_COLUMNS = [
  { header: 'Merk', key: 'merk' },
  { header: 'Plat', key: 'plat' },
  { header: 'Tahun', key: 'tahun' },
  { header: 'Lokasi', key: 'lokasi' },
  { header: 'PIC', key: 'pic' },
  { header: 'Pajak Tahunan Berlaku', key: 'pajakTahunanBerlaku' },
  { header: 'Pajak 5 Tahun Berlaku', key: 'pajak5TahunanBerlaku' },
  { header: 'Keur Berlaku', key: 'keurBerlaku' },
  { header: 'Interval KM', key: 'intervalKm' },
  { header: 'Interval Bulan', key: 'intervalBulan' },
  { header: 'Odometer', key: 'kmSekarang' },
  { header: 'Catatan', key: 'catatan' },
];

const DETAIL_COLUMNS = [
  { header: 'Status Keseluruhan', value: (r: any) => r.overallStatusText },
  {
    header: 'Pajak Tahunan Status',
    value: (r: any) => complianceText(r.pajakTahunanStatus, r.pajakTahunanDays),
  },
  { header: 'Pajak Tahunan Sisa Hari', value: (r: any) => daysLabel(r.pajakTahunanDays) },
  {
    header: 'Pajak 5 Tahun Status',
    value: (r: any) => complianceText(r.pajak5TahunanStatus, r.pajak5TahunanDays),
  },
  { header: 'Pajak 5 Tahun Sisa Hari', value: (r: any) => daysLabel(r.pajak5TahunanDays) },
  { header: 'Keur Status', value: (r: any) => complianceText(r.keurStatus, r.keurDays) },
  { header: 'Keur Sisa Hari', value: (r: any) => daysLabel(r.keurDays) },
  { header: 'Servis Terakhir', value: (r: any) => r.lastService?.tanggal || '' },
  { header: 'Servis Terakhir KM', value: (r: any) => r.lastService?.km ?? '' },
  { header: 'Servis Terakhir Jenis', value: (r: any) => r.lastService?.jenis || '' },
  { header: 'Servis Terakhir Bengkel', value: (r: any) => r.lastService?.bengkel || '' },
  { header: 'Servis Terakhir Biaya', value: (r: any) => r.lastService?.biaya ?? '' },
  { header: 'Servis Berikutnya Tanggal', value: (r: any) => r.nextServiceDate || '' },
  { header: 'Servis Berikutnya KM', value: (r: any) => r.nextServiceKm ?? '' },
  { header: 'Sisa KM Servis', value: (r: any) => r.kmLeft ?? '' },
  { header: 'Servis Status', value: (r: any) => complianceText(r.serviceStatus, r.serviceDaysDate) },
  { header: 'Servis Sisa Hari', value: (r: any) => daysLabel(r.serviceDaysDate) },
  { header: 'Jumlah Riwayat Servis', value: (r: any) => r.serviceCount },
  { header: 'Total Biaya Servis', value: (r: any) => r.serviceCostTotal },
  { header: 'Jumlah Pembacaan Odometer', value: (r: any) => r.odometerReadingCount },
  { header: 'Odometer Terakhir (Tanggal)', value: (r: any) => r.odometerHistory?.[0]?.tanggal || '' },
  { header: 'Jumlah Foto', value: (r: any) => r.photoCount },
  { header: 'Foto Utama', value: (r: any) => (r.photoCount > 0 ? 'ada' : 'tidak ada') },
  { header: 'Dibuat Pada', value: (r: any) => (r.createdAt ? formatDate(r.createdAt) : '') },
];

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  // Guard against spreadsheet formula injection from user-entered notes.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvDate(value) {
  return value ? formatDate(value) : '';
}

const BREAKDOWN_HEADERS = [
  'Lokasi',
  'Total',
  'Aman',
  'Perlu Perhatian',
  'Terlambat',
  'Total Odometer (km)',
  'Total Biaya Servis',
];

/**
 * Every emitted row is padded to the same width so the file opens in Excel as
 * one clean rectangle. Rows with fewer cells would otherwise leave ragged
 * columns and break autofilter, freeze panes, and pivot tables.
 */
function toGrid(lines: string[][]) {
  const width = lines.reduce((max, row) => Math.max(max, row.length), 0);
  return lines
    .map((row) => {
      const padded = [...row];
      while (padded.length < width) padded.push('');
      return padded.map(escapeCsvCell).join(',');
    })
    .join('\r\n');
}

export function renderReportCsv(report: Report) {
  const grid: string[][] = [];

  const meta: Array<[string, string]> = [
    ['LAPORAN ARMADA 104 GROUP', ''],
    ['Tanggal Laporan', formatInstantDate(report.generatedAt)],
    ['Waktu Dibuat', formatTimestamp(report.generatedAt)],
    ['Total Armada', String(report.totals.armadaTotal)],
    ['Kendaraan dalam Laporan', String(report.totals.laporanJumlah)],
    ['Lokasi Terpakai', String(report.totals.lokasiTerpakai)],
    ['Status Aman', String(report.summary.ok)],
    ['Status Perlu Perhatian', String(report.summary.amber)],
    ['Status Terlambat', String(report.summary.red)],
    ['Total Odometer (km)', String(report.summary.totalOdometer)],
    ['Total Biaya Servis', String(report.summary.totalServiceCost)],
    ['Filter Lokasi', report.filters.lokasi === 'all' ? 'Semua lokasi' : report.filters.lokasi],
    ['Filter Status', report.filters.scope === 'all' ? 'Semua status' : report.filters.scope],
    ['Filter Urutan', report.filters.sort],
  ];
  if (report.filters.text) meta.push(['Filter Pencarian', report.filters.text]);
  for (const [label, value] of meta) grid.push([label, value]);

  grid.push([]);
  grid.push(['RINGKASAN PER LOKASI']);
  grid.push(BREAKDOWN_HEADERS);
  for (const item of report.breakdown) {
    grid.push([
      item.lokasi,
      String(item.total),
      String(item.ok),
      String(item.amber),
      String(item.red),
      String(item.totalOdometer),
      String(item.totalServiceCost),
    ]);
  }

  grid.push([]);
  grid.push(['RINCIAN KENDARAAN']);
  grid.push([
    'Kolom 1-12 sesuai template import Excel. Kolom 13+ hanya untuk analisis.',
  ]);
  grid.push([...IMPORT_COLUMNS, ...DETAIL_COLUMNS].map((column) => column.header));

  const DATE_KEYS = new Set(['pajakTahunanBerlaku', 'pajak5TahunanBerlaku', 'keurBerlaku']);
  for (const row of report.rows) {
    const importCells = IMPORT_COLUMNS.map((column) => {
      const value = row[column.key];
      if (DATE_KEYS.has(column.key)) return csvDate(value);
      return value === null || value === undefined ? '' : String(value);
    });
    const detailCells = DETAIL_COLUMNS.map((column) => {
      const value = column.value(row);
      return value === null || value === undefined ? '' : String(value);
    });
    grid.push([...importCells, ...detailCells]);
  }

  return `\uFEFF${toGrid(grid)}`;
}

export const reportCsvColumns = {
  import: IMPORT_COLUMNS.map((c) => c.header),
  detail: DETAIL_COLUMNS.map((c) => c.header),
};
