import { readFileSync } from 'node:fs';

// Minimal RFC4180 parser to count real cells, not naive comma splits.
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const body = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') { cell += '"'; i += 1; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r') { /* skip */ }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const rows = parseCsv(readFileSync('tmp/laporan-armada.csv', 'utf8'));
const widths = new Set(rows.map((r) => r.length));
console.log('rows:', rows.length);
console.log('column widths:', [...widths].join(', '));
console.log('rectangular:', widths.size === 1 ? 'YES' : 'NO');
const headerIndex = rows.findIndex((r) => r[0] === 'Merk');
console.log('detail header at row', headerIndex + 1, 'with', rows[headerIndex].length, 'columns');
console.log('first data row cells:', rows[headerIndex + 1].length);
