// Offline smoke test for the report renderers. Uses synthetic data so it can run
// without a database. Run with: npx tsx scripts/test-report.ts
import { renderReportCsv } from '../src/services/reportCsv.ts';
import { renderReportPdf } from '../src/services/reportPdf.ts';
import { renderReportXlsx } from '../src/services/reportXlsx.ts';
import { writeFileSync, mkdirSync } from 'node:fs';

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const vehicles = [
  {
    // Long vehicle/location/PIC names on purpose: these wrap to a second line
    // and used to be clipped by the fixed-height table rows.
    id: 4,
    plat: 'B 104 RFH',
    merk: 'Motor Honda Beat CBS ISS 2020 125',
    tahun: '2021',
    lokasi: 'Jatinegara Uttara',
    pic: 'Abel / Karma Sihombing',
    catatan: '',
    photoCount: 0,
    intervalKm: 5000,
    intervalBulan: 6,
    kmSekarang: 51955,
    pajakTahunanBerlaku: iso(75),
    pajakTahunanStatus: 'ok',
    pajakTahunanDays: 75,
    pajak5TahunanBerlaku: iso(300),
    pajak5TahunanStatus: 'ok',
    pajak5TahunanDays: 300,
    keurBerlaku: iso(90),
    keurStatus: 'ok',
    keurDays: 90,
    lastService: { tanggal: iso(-100), km: 50000, jenis: 'Servis berkala + ganti kampas rem', bengkel: 'Bengkel Kalideran', biaya: 950000 },
    nextServiceDate: iso(40),
    nextServiceKm: 55000,
    kmLeft: 3045,
    serviceDaysDate: 40,
    serviceStatus: 'ok',
    overallStatus: 'ok',
    overallStatusText: 'Aman',
    serviceHistory: [
      { tanggal: iso(-100), km: 50000, jenis: 'Servis berkala + ganti kampas rem', bengkel: 'Bengkel Kalideran', biaya: 950000, hasStruk: true },
    ],
    serviceCount: 1,
    serviceCostTotal: 950000,
    odometerHistory: [
      { tanggal: iso(-7), km: 51955, sumber: 'excel', koreksi: false },
    ],
    odometerReadingCount: 1,
    createdAt: '2021-05-04T08:00:00.000Z',
  },
  {
    id: 1,
    plat: 'B 1234 XYZ',
    merk: 'Toyota Hilux',
    tahun: '2022',
    lokasi: 'Cakung',
    pic: 'Budi Santoso',
    catatan: 'Unit operasional lapangan',
    photoCount: 2,
    intervalKm: 5000,
    intervalBulan: 6,
    kmSekarang: 48200,
    pajakTahunanBerlaku: iso(-12),
    pajakTahunanStatus: 'red',
    pajakTahunanDays: -12,
    pajak5TahunanBerlaku: iso(200),
    pajak5TahunanStatus: 'ok',
    pajak5TahunanDays: 200,
    keurBerlaku: iso(25),
    keurStatus: 'amber',
    keurDays: 25,
    lastService: { tanggal: iso(-160), km: 45000, jenis: 'Ganti oli + filter', bengkel: 'Bengkel Kalideran', biaya: 850000 },
    nextServiceDate: iso(20),
    nextServiceKm: 50000,
    kmLeft: 1800,
    serviceDaysDate: 20,
    serviceStatus: 'ok',
    overallStatus: 'red',
    overallStatusText: 'Terlambat',
    serviceHistory: [
      { tanggal: iso(-160), km: 45000, jenis: 'Ganti oli + filter', bengkel: 'Bengkel Kalideran', biaya: 850000, hasStruk: true },
      { tanggal: iso(-340), km: 39000, jenis: 'Servis berkala', bengkel: 'Bengkel Kalideran', biaya: 1200000, hasStruk: false },
    ],
    serviceCount: 2,
    serviceCostTotal: 2050000,
    odometerHistory: [
      { tanggal: iso(-7), km: 48200, sumber: 'excel', koreksi: false },
      { tanggal: iso(-14), km: 47100, sumber: 'excel', koreksi: false },
    ],
    odometerReadingCount: 2,
    createdAt: '2024-02-11T08:00:00.000Z',
  },
  {
    id: 2,
    plat: 'B 5678 UVW',
    merk: 'Mitsubishi L300',
    tahun: '2021',
    lokasi: 'Cakung',
    pic: 'Siti Rahma',
    catatan: '',
    photoCount: 0,
    intervalKm: 4000,
    intervalBulan: 6,
    kmSekarang: 91000,
    pajakTahunanBerlaku: iso(120),
    pajakTahunanStatus: 'ok',
    pajakTahunanDays: 120,
    pajak5TahunanBerlaku: iso(400),
    pajak5TahunanStatus: 'ok',
    pajak5TahunanDays: 400,
    keurBerlaku: iso(210),
    keurStatus: 'ok',
    keurDays: 210,
    lastService: null,
    nextServiceDate: null,
    nextServiceKm: null,
    kmLeft: null,
    serviceDaysDate: null,
    serviceStatus: 'ok',
    overallStatus: 'ok',
    overallStatusText: 'Aman',
    serviceHistory: [],
    serviceCount: 0,
    serviceCostTotal: 0,
    odometerHistory: [],
    odometerReadingCount: 0,
    createdAt: '2023-07-02T08:00:00.000Z',
  },
  {
    id: 3,
    plat: 'B 9012 STU',
    merk: 'Isuzu Traga',
    tahun: '2020',
    lokasi: 'Jatinegara',
    pic: 'Agus',
    catatan: 'Perlu cek rem',
    photoCount: 1,
    intervalKm: 5000,
    intervalBulan: 6,
    kmSekarang: 132400,
    pajakTahunanBerlaku: iso(20),
    pajakTahunanStatus: 'amber',
    pajakTahunanDays: 20,
    pajak5TahunanBerlaku: iso(45),
    pajak5TahunanStatus: 'amber',
    pajak5TahunanDays: 45,
    keurBerlaku: iso(-5),
    keurStatus: 'red',
    keurDays: -5,
    lastService: { tanggal: iso(-200), km: 130000, jenis: 'Ganti kampas rem', bengkel: 'Bengkel Pulo Gadung', biaya: 2400000 },
    nextServiceDate: iso(-20),
    nextServiceKm: 135000,
    kmLeft: 2600,
    serviceDaysDate: -20,
    serviceStatus: 'red',
    overallStatus: 'red',
    overallStatusText: 'Terlambat',
    serviceHistory: [
      { tanggal: iso(-200), km: 130000, jenis: 'Ganti kampas rem', bengkel: 'Bengkel Pulo Gadung', biaya: 2400000, hasStruk: true },
    ],
    serviceCount: 1,
    serviceCostTotal: 2400000,
    odometerHistory: [{ tanggal: iso(-3), km: 132400, sumber: 'manual', koreksi: true }],
    odometerReadingCount: 1,
    createdAt: '2022-11-19T08:00:00.000Z',
  },
];

const SCALE = Number(process.argv[2] || 1);

const scaled = [];
for (let copy = 0; copy < SCALE; copy += 1) {
  for (const vehicle of vehicles) {
    if (copy === 0) {
      scaled.push(vehicle);
      continue;
    }
    scaled.push({
      ...vehicle,
      id: vehicle.id + copy * 100,
      plat: `${vehicle.plat} ${copy}`,
      lokasi: `${vehicle.lokasi} ${copy}`,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  filters: { text: '', lokasi: 'all', scope: 'all', sort: 'urgency' },
  rows: scaled,
  summary: {
    total: scaled.length,
    ok: 1,
    amber: 0,
    red: scaled.length - 1,
    totalPhotos: 3,
    totalOdometer: 271600,
    totalServiceCost: 4450000,
    duePajakTahunan: 2,
    duePajak5Tahunan: 1,
    dueKeur: 1,
    dueService: 1,
  },
  locations: ['Cakung', 'Jatinegara'],
  breakdown: [
    { lokasi: 'Cakung', total: 2, ok: 1, amber: 0, red: 1, totalOdometer: 139200, totalServiceCost: 2050000 },
    { lokasi: 'Jatinegara', total: 1, ok: 0, amber: 0, red: 1, totalOdometer: 132400, totalServiceCost: 2400000 },
  ],
  totals: { armadaTotal: scaled.length, laporanJumlah: scaled.length, lokasiTerpakai: 2 },
} as never;

mkdirSync('tmp', { recursive: true });

const csv = renderReportCsv(report);
writeFileSync('tmp/laporan-armada.csv', csv, 'utf8');

const chunks: Buffer[] = [];
const doc = renderReportPdf(report) as unknown as NodeJS.ReadableStream;
doc.on('data', (chunk: Buffer) => chunks.push(chunk));
await new Promise<void>((resolve, reject) => {
  doc.on('end', resolve);
  doc.on('error', reject);
});
const pdf = Buffer.concat(chunks);
writeFileSync('tmp/laporan-armada.pdf', pdf);

const xlsx = renderReportXlsx(report);
writeFileSync('tmp/laporan-armada.xlsx', xlsx);

const text = pdf.toString('latin1');
const pageCount = Number(/\/Count (\d+)/.exec(text)?.[1] || 0);

console.log('Kendaraan  :', scaled.length);
console.log('CSV baris  :', csv.split('\r\n').length);
console.log('PDF bytes  :', pdf.length);
console.log('PDF halaman:', pageCount);
console.log('PDF header :', pdf.subarray(0, 8).toString());
console.log('PDF EOF    :', text.trimEnd().endsWith('%%EOF'));
console.log('XLSX bytes :', xlsx.length);
console.log('XLSX zip   :', xlsx.subarray(0, 2).toString() === 'PK' ? 'OK' : 'BAD');
console.log('OK');
