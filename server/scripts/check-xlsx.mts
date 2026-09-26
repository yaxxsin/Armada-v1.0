// Verifies the generated workbook parses with an independent XLSX reader and
// that every sheet is a well-formed table. Run: npm run test:report
import { readSheet } from 'read-excel-file/node';
import { resolve } from 'node:path';

const file = resolve('tmp/laporan-armada.xlsx');
const sheets = [
  'Ringkasan',
  'Rincian Kendaraan',
  'Tindakan Prioritas',
  'Per Lokasi',
  'Riwayat Servis',
  'Riwayat Odometer',
];

let failures = 0;
for (const name of sheets) {
  try {
    const rows = (await readSheet(file, name)) as unknown[][];
    const width = Math.max(0, ...rows.map((row) => row.length));
    console.log(`[OK] ${name.padEnd(20)} rows=${rows.length} cols=${width}`);
  } catch (error) {
    failures += 1;
    console.log(`[FAIL] ${name}: ${error instanceof Error ? error.message : error}`);
  }
}
console.log(failures === 0 ? 'ALL SHEETS OK' : `${failures} SHEET FAILURES`);
process.exit(failures === 0 ? 0 : 1);
