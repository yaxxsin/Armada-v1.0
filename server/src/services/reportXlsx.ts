import type { buildReport } from './reportService.ts';
import { complianceText, daysLabel, formatDate, formatInstantDate, formatNumber, formatTimestamp } from './reportFormat.ts';
import { buildWorkbook } from './xlsxWriter.ts';
import type { Cell, Sheet, SheetColumn } from './xlsxWriter.ts';

type Report = Awaited<ReturnType<typeof buildReport>>;

/** First 12 columns mirror the bulk import template, in the same order. */
const IMPORT_COLUMNS: SheetColumn[] = [
  { header: 'Merk', width: 20 },
  { header: 'Plat', width: 14 },
  { header: 'Tahun', width: 9 },
  { header: 'Lokasi', width: 18 },
  { header: 'PIC', width: 18 },
  { header: 'Pajak Tahunan Berlaku', width: 20 },
  { header: 'Pajak 5 Tahun Berlaku', width: 21 },
  { header: 'Keur Berlaku', width: 16 },
  { header: 'Interval KM', width: 13 },
  { header: 'Interval Bulan', width: 15 },
  { header: 'Odometer', width: 12 },
  { header: 'Catatan', width: 30 },
];

const DETAIL_COLUMNS: SheetColumn[] = [
  { header: 'Status Keseluruhan', width: 19 },
  { header: 'Pajak Tahunan Status', width: 19 },
  { header: 'Pajak Tahunan Sisa', width: 20 },
  { header: 'Pajak 5 Tahun Status', width: 20 },
  { header: 'Pajak 5 Tahun Sisa', width: 20 },
  { header: 'Keur Status', width: 14 },
  { header: 'Keur Sisa', width: 20 },
  { header: 'Servis Terakhir', width: 15 },
  { header: 'Servis Terakhir KM', width: 17 },
  { header: 'Servis Terakhir Jenis', width: 26 },
  { header: 'Servis Terakhir Bengkel', width: 24 },
  { header: 'Servis Terakhir Biaya', width: 19 },
  { header: 'Servis Berikutnya', width: 17 },
  { header: 'Servis Berikutnya KM', width: 19 },
  { header: 'Sisa KM Servis', width: 15 },
  { header: 'Servis Status', width: 15 },
  { header: 'Servis Sisa', width: 20 },
  { header: 'Jumlah Riwayat Servis', width: 19 },
  { header: 'Total Biaya Servis', width: 18 },
  { header: 'Jumlah Baca Odometer', width: 19 },
  { header: 'Baca Odometer Terakhir', width: 21 },
  { header: 'Jumlah Foto', width: 12 },
  { header: 'Dibuat Pada', width: 13 },
];

const BREAKDOWN_COLUMNS: SheetColumn[] = [
  { header: 'Lokasi', width: 22 },
  { header: 'Total', width: 9 },
  { header: 'Aman', width: 9 },
  { header: 'Perlu Perhatian', width: 17 },
  { header: 'Terlambat', width: 12 },
  { header: 'Total Odometer (km)', width: 19 },
  { header: 'Total Biaya Servis', width: 19 },
];

const SERVICE_COLUMNS: SheetColumn[] = [
  { header: 'Tanggal', width: 13 },
  { header: 'Plat', width: 14 },
  { header: 'Merk', width: 20 },
  { header: 'KM', width: 12 },
  { header: 'Jenis Servis', width: 28 },
  { header: 'Bengkel', width: 24 },
  { header: 'Biaya', width: 15 },
  { header: 'Ada Struk', width: 12 },
];

const ODOMETER_COLUMNS: SheetColumn[] = [
  { header: 'Tanggal', width: 13 },
  { header: 'Plat', width: 14 },
  { header: 'Merk', width: 20 },
  { header: 'Odometer (km)', width: 15 },
  { header: 'Sumber', width: 12 },
  { header: 'Koreksi', width: 11 },
];

function headerRow(columns: SheetColumn[]): Cell[] {
  return columns.map((column) => ({ value: column.header, type: 'header' }));
}

function titleRow(text: string): Cell[] {
  return [{ value: text, type: 'title' }];
}

function summarySheet(report: Report): Sheet {
  const rows: Cell[][] = [
    titleRow('Laporan Armada 104 Group'),
    [
      { value: 'Tanggal Laporan', type: 'label' },
      { value: formatInstantDate(report.generatedAt), type: 'date' },
    ],
    [
      { value: 'Waktu Dibuat', type: 'label' },
      { value: formatTimestamp(report.generatedAt) },
    ],
    [
      { value: 'Filter Lokasi', type: 'label' },
      { value: report.filters.lokasi === 'all' ? 'Semua lokasi' : report.filters.lokasi },
    ],
    [
      { value: 'Filter Status', type: 'label' },
      { value: report.filters.scope === 'all' ? 'Semua status' : report.filters.scope },
    ],
    [
      { value: 'Filter Urutan', type: 'label' },
      { value: report.filters.sort },
    ],
    ...(report.filters.text
      ? [[{ value: 'Filter Pencarian', type: 'label' }, { value: report.filters.text }] as Cell[]]
      : []),
    [],
    [{ value: 'RINGKASAN ARMADA', type: 'subheader' }],
    [
      { value: 'Total Armada', type: 'label' },
      { value: report.totals.armadaTotal, type: 'number' },
      { value: 'Total armada yang tercatat di sistem' },
    ],
    [
      { value: 'Kendaraan dalam Laporan', type: 'label' },
      { value: report.totals.laporanJumlah, type: 'number' },
      { value: 'Kendaraan yang lolos filter' },
    ],
    [
      { value: 'Lokasi Terpakai', type: 'label' },
      { value: report.totals.lokasiTerpakai, type: 'number' },
      { value: 'Jumlah lokasi berbeda' },
    ],
    [
      { value: 'Status Aman', type: 'label' },
      { value: report.summary.ok, type: 'number' },
      { value: 'Tidak ada tindakan diperlukan' },
    ],
    [
      { value: 'Status Perlu Perhatian', type: 'label' },
      { value: report.summary.amber, type: 'number' },
      { value: 'Pajak, KEUR, atau servis mendekati batas' },
    ],
    [
      { value: 'Status Terlambat', type: 'label' },
      { value: report.summary.red, type: 'number' },
      { value: 'Sudah melewati batas, segera tangani' },
    ],
    [
      { value: 'Total Odometer (km)', type: 'label' },
      { value: report.summary.totalOdometer, type: 'number' },
      { value: 'Akumulasi seluruh kendaraan' },
    ],
    [
      { value: 'Total Biaya Servis', type: 'label' },
      { value: report.summary.totalServiceCost, type: 'number' },
      { value: 'Akumulasi riwayat servis' },
    ],
    [
      { value: 'Total Foto Kendaraan', type: 'label' },
      { value: report.summary.totalPhotos, type: 'number' },
      { value: 'Jumlah foto terlampir' },
    ],
    [],
    [{ value: 'KEPATUHAN PER ASPEK', type: 'subheader' }],
    [{ value: 'Aspek', type: 'header' }, { value: 'Kendaraan Bermasalah', type: 'header' }, { value: 'Total Kendaraan', type: 'header' }],
    ['Pajak Tahunan', report.summary.duePajakTahunan, report.totals.laporanJumlah],
    ['Pajak 5 Tahun', report.summary.duePajak5Tahunan, report.totals.laporanJumlah],
    ['KEUR', report.summary.dueKeur, report.totals.laporanJumlah],
    ['Servis', report.summary.dueService, report.totals.laporanJumlah],
  ];

  return {
    name: 'Ringkasan',
    columns: [
      { header: '', width: 26 },
      { header: '', width: 26 },
      { header: '', width: 40 },
    ],
    rows,
  };
}

function breakdownSheet(report: Report): Sheet {
  const rows: Cell[][] = [
    titleRow('Ringkasan per Lokasi'),
    [],
    headerRow(BREAKDOWN_COLUMNS),
  ];
  for (const item of report.breakdown) {
    rows.push([
      { value: item.lokasi },
      { value: item.total, type: 'number' },
      { value: item.ok, type: 'number' },
      { value: item.amber, type: 'number' },
      { value: item.red, type: 'number' },
      { value: item.totalOdometer, type: 'number' },
      { value: item.totalServiceCost, type: 'number' },
    ]);
  }
  rows.push([]);
  rows.push([
    { value: 'TOTAL', type: 'label' },
    { value: report.summary.total, type: 'number' },
    { value: report.summary.ok, type: 'number' },
    { value: report.summary.amber, type: 'number' },
    { value: report.summary.red, type: 'number' },
    { value: report.summary.totalOdometer, type: 'number' },
    { value: report.summary.totalServiceCost, type: 'number' },
  ]);

  return { name: 'Per Lokasi', columns: BREAKDOWN_COLUMNS, rows, freezeAt: 3, autoFilter: true };
}

function vehiclesSheet(report: Report): Sheet {
  const rows: Cell[][] = [
    titleRow('Rincian Kendaraan'),
    [
      {
        value: 'Kolom A-L mengikuti template import Excel. Kolom M onward hanya untuk analisis dan diabaikan saat import.',
      },
    ],
    [],
    headerRow([...IMPORT_COLUMNS, ...DETAIL_COLUMNS]),
  ];

  for (const row of report.rows) {
    rows.push([
      { value: row.merk || '' },
      { value: row.plat || '' },
      { value: row.tahun || '' },
      { value: row.lokasi || '' },
      { value: row.pic || '' },
      { value: row.pajakTahunanBerlaku ? formatDate(row.pajakTahunanBerlaku) : '', type: 'date' },
      { value: row.pajak5TahunanBerlaku ? formatDate(row.pajak5TahunanBerlaku) : '', type: 'date' },
      { value: row.keurBerlaku ? formatDate(row.keurBerlaku) : '', type: 'date' },
      { value: Number(row.intervalKm) || 0, type: 'number' },
      { value: Number(row.intervalBulan) || 0, type: 'number' },
      { value: Number(row.kmSekarang) || 0, type: 'number' },
      { value: row.catatan || '' },
      { value: row.overallStatusText },
      { value: complianceText(row.pajakTahunanStatus, row.pajakTahunanDays) },
      { value: daysLabel(row.pajakTahunanDays) },
      { value: complianceText(row.pajak5TahunanStatus, row.pajak5TahunanDays) },
      { value: daysLabel(row.pajak5TahunanDays) },
      { value: complianceText(row.keurStatus, row.keurDays) },
      { value: daysLabel(row.keurDays) },
      { value: row.lastService?.tanggal ? formatDate(row.lastService.tanggal) : '', type: 'date' },
      { value: Number(row.lastService?.km) || 0, type: 'number' },
      { value: row.lastService?.jenis || '' },
      { value: row.lastService?.bengkel || '' },
      { value: Number(row.lastService?.biaya) || 0, type: 'number' },
      { value: row.nextServiceDate ? formatDate(row.nextServiceDate) : '', type: 'date' },
      { value: Number(row.nextServiceKm) || 0, type: 'number' },
      { value: Number(row.kmLeft) || 0, type: 'number' },
      { value: complianceText(row.serviceStatus, row.serviceDaysDate) },
      { value: daysLabel(row.serviceDaysDate) },
      { value: Number(row.serviceCount) || 0, type: 'number' },
      { value: Number(row.serviceCostTotal) || 0, type: 'number' },
      { value: Number(row.odometerReadingCount) || 0, type: 'number' },
      {
        value: row.odometerHistory?.[0]?.tanggal ? formatDate(row.odometerHistory[0].tanggal) : '',
        type: 'date',
      },
      { value: row.photoCount, type: 'number' },
      { value: row.createdAt ? formatDate(row.createdAt) : '', type: 'date' },
    ]);
  }

  return {
    name: 'Rincian Kendaraan',
    columns: [...IMPORT_COLUMNS, ...DETAIL_COLUMNS],
    rows,
    freezeAt: 4,
    autoFilter: true,
  };
}

function prioritySheet(report: Report): Sheet {
  const attention = report.rows.filter((row) => row.overallStatus !== 'ok');
  const columns: SheetColumn[] = [
    { header: 'Plat', width: 14 },
    { header: 'Merk', width: 20 },
    { header: 'Lokasi', width: 18 },
    { header: 'PIC', width: 18 },
    { header: 'Status', width: 19 },
    { header: 'Odometer (km)', width: 14 },
    { header: 'Pajak Tahunan', width: 24 },
    { header: 'Pajak 5 Tahun', width: 24 },
    { header: 'KEUR', width: 24 },
    { header: 'Servis', width: 30 },
  ];
  const rows: Cell[][] = [titleRow('Daftar Tindakan Prioritas'), [], headerRow(columns)];

  let index = 0;
  for (const row of attention) {
    index += 1;
    rows.push([
      { value: `${index}. ${row.plat || '-'}`, type: 'label' },
      { value: row.merk || '' },
      { value: row.lokasi || '' },
      { value: row.pic || '' },
      { value: row.overallStatusText },
      { value: Number(row.kmSekarang) || 0, type: 'number' },
      { value: complianceText(row.pajakTahunanStatus, row.pajakTahunanDays) + (row.pajakTahunanDays === null ? '' : ` (${daysLabel(row.pajakTahunanDays)})`) },
      { value: complianceText(row.pajak5TahunanStatus, row.pajak5TahunanDays) + (row.pajak5TahunanDays === null ? '' : ` (${daysLabel(row.pajak5TahunanDays)})`) },
      { value: complianceText(row.keurStatus, row.keurDays) + (row.keurDays === null ? '' : ` (${daysLabel(row.keurDays)})`) },
      {
        value:
          complianceText(row.serviceStatus, row.serviceDaysDate) +
          (row.serviceDaysDate === null ? '' : ` (${daysLabel(row.serviceDaysDate)})`) +
          (row.kmLeft === null || row.kmLeft === undefined
            ? ''
            : `, sisa ${formatNumber(row.kmLeft)} km`),
      },
    ]);
  }

  return { name: 'Tindakan Prioritas', columns, rows, freezeAt: 3, autoFilter: true };
}

function serviceSheet(report: Report): Sheet {
  const columns = SERVICE_COLUMNS;
  const rows: Cell[][] = [titleRow('Riwayat Servis'), [], headerRow(columns)];

  for (const row of report.rows) {
    for (const entry of row.serviceHistory) {
      rows.push([
        { value: entry.tanggal ? formatDate(entry.tanggal) : '', type: 'date' },
        { value: row.plat || '' },
        { value: row.merk || '' },
        { value: Number(entry.km) || 0, type: 'number' },
        { value: entry.jenis || '' },
        { value: entry.bengkel || '' },
        { value: Number(entry.biaya) || 0, type: 'number' },
        { value: entry.hasStruk ? 'Ya' : 'Tidak' },
      ]);
    }
  }

  return { name: 'Riwayat Servis', columns, rows, freezeAt: 3, autoFilter: true };
}

function odometerSheet(report: Report): Sheet {
  const columns = ODOMETER_COLUMNS;
  const rows: Cell[][] = [titleRow('Riwayat Odometer'), [], headerRow(columns)];

  for (const row of report.rows) {
    for (const reading of row.odometerHistory) {
      rows.push([
        { value: reading.tanggal ? formatDate(reading.tanggal) : '', type: 'date' },
        { value: row.plat || '' },
        { value: row.merk || '' },
        { value: Number(reading.km) || 0, type: 'number' },
        { value: reading.sumber || '' },
        { value: reading.koreksi ? 'Ya' : 'Tidak' },
      ]);
    }
  }

  return { name: 'Riwayat Odometer', columns, rows, freezeAt: 3, autoFilter: true };
}

export function renderReportXlsx(report: Report) {
  return buildWorkbook([
    summarySheet(report),
    vehiclesSheet(report),
    prioritySheet(report),
    breakdownSheet(report),
    serviceSheet(report),
    odometerSheet(report),
  ]);
}
