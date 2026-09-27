// Geometry check for the generated PDF. It walks the real content streams and
// proves two things that a page-count assertion cannot:
//
//   1. nothing is painted or written past the printable area (the report used to
//      run its tables ~60pt wide, silently cutting off the last columns), and
//   2. no two text runs overlap (rows used to be a fixed 17pt tall, so wrapped
//      cell text was painted over by the next row).
//
// Run: npm run test:report
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
// Rounding slack for the fixed-point numbers PDFKit writes.
const EPS = 1.5;

const file = resolve('tmp/laporan-armada.pdf');
const buffer = readFileSync(file);
const raw = buffer.toString('latin1');

/** Every `N 0 obj ... endobj` body, keyed by object number. */
function readObjects() {
  const objects = new Map<number, string>();
  const pattern = /(\d+) 0 obj\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endobj', start);
    objects.set(Number(match[1]), raw.slice(start, end === -1 ? raw.length : end));
  }
  return objects;
}

/** Inflates a `stream ... endstream` payload, or returns it as-is. */
function streamOf(body: string) {
  const marker = /stream\r?\n/.exec(body);
  if (!marker) return body;
  const start = marker.index + marker[0].length;
  const end = body.lastIndexOf('endstream');
  const payload = Buffer.from(body.slice(start, end), 'latin1');
  try {
    return inflateSync(payload).toString('latin1');
  } catch {
    return payload.toString('latin1');
  }
}

const objects = readObjects();

// Font metrics for the standard 14 faces, used to size each text run.
const metrics = new PDFDocument();
function widthOf(baseFont: string, value: string, size: number) {
  metrics.font(baseFont in metrics ? baseFont : 'Helvetica').fontSize(size);
  return metrics.widthOfString(value);
}

function hexToText(hex: string) {
  return Buffer.from(hex, 'hex').toString('latin1');
}

/** Pulls the glyph runs and kerns out of a `[...] TJ` array or a `(...) Tj`. */
function readShown(rawOperands: string) {
  const parts: Array<{ text: string; adjust: number }> = [];
  const token = /<([0-9A-Fa-f\s]*)>|\(((?:\\.|[^\\)])*)\)|(-?[\d.]+)/g;
  let match: RegExpExecArray | null;
  let pending = '';
  while ((match = token.exec(rawOperands))) {
    if (match[1] !== undefined) {
      pending += hexToText(match[1].replace(/\s+/g, ''));
    } else if (match[2] !== undefined) {
      pending += match[2];
    } else if (pending) {
      parts.push({ text: pending, adjust: Number(match[3]) });
      pending = '';
    }
  }
  if (pending) parts.push({ text: pending, adjust: 0 });
  return parts;
}

type Box = { page: number; x: number; y: number; w: number; h: number; text: string };
type Item =
  | { seq: number; kind: 'text'; page: number; box: Box }
  | { seq: number; kind: 'rect'; page: number; x: number; y: number; w: number; h: number; fill: boolean };

const textBoxes: Box[] = [];
const rectBoxes: Item[] = [];
const items: Item[] = [];
let pageCount = 0;

const pages = [...objects.entries()].filter(([, body]) => /\/Type\s*\/Page[^s]/.test(body));

for (const [pageIndex, [, body]] of pages.entries()) {
  const number = pageIndex + 1;

  // Resolve this page's font aliases (/F1 -> object -> /BaseFont).
  const fontMap = new Map<string, string>();
  const fontDict = /\/Font\s*<<([\s\S]*?)>>/.exec(body);
  if (fontDict) {
    for (const entry of fontDict[1].matchAll(/\/(\w+)\s+(\d+) 0 R/g)) {
      const target = objects.get(Number(entry[2])) || '';
      const base = /\/BaseFont\s*\/([A-Za-z0-9+#-]+)/.exec(target);
      fontMap.set(entry[1], base ? base[1] : 'Helvetica');
    }
  }

  const contentRef = /\/Contents\s+(\d+) 0 R/.exec(body);
  const content = streamOf(contentRef ? objects.get(Number(contentRef[1])) || '' : '');

  // Rectangles: `x y w h re`, remembering whether they are filled or stroked.
  for (const rect of content.matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) re\b/g)) {
    const after = content.slice(rect.index, rect.index + 300);
    const paint = /^\s*(?:\/[A-Za-z0-9]+ (?:cs|CS)\s*[\d.]+ [\d.]+ [\d.]+ (?:scn|sc|SCN|SC)\s*)?(f\*|f|B\*|B|S|s)\b/.exec(after);
    const fill = !paint || /^[fB]/.test(paint[1]);
    const item: Item = {
      seq: rect.index,
      kind: 'rect',
      page: number,
      x: Number(rect[1]),
      y: Number(rect[2]),
      w: Number(rect[3]),
      h: Number(rect[4]),
      fill,
    };
    rectBoxes.push(item);
    items.push(item);
  }

  // Text: `x y Tm` positions, `/Fn size Tf` selects the face, `[...] TJ` shows.
  let cursorX = 0;
  let cursorY = 0;
  let font = 'Helvetica';
  let size = 0;
  const ops = /(?:([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) Tm)|(?:\/(\w+) ([\d.]+) Tf)|(\[[^\]]*\]\s*TJ|\([^)]*\)\s*Tj)/g;
  let op: RegExpExecArray | null;
  while ((op = ops.exec(content))) {
    if (op[5] !== undefined) {
      cursorX = Number(op[5]);
      cursorY = Number(op[6]);
    } else if (op[7] !== undefined) {
      font = fontMap.get(op[7]) || 'Helvetica';
      size = Number(op[8]);
    } else if (op[9] !== undefined) {
      const runs = readShown(op[9]);
      let w = 0;
      let label = '';
      for (const run of runs) {
        w += widthOf(font, run.text, size) + (run.adjust / 1000) * size;
        label += run.text;
      }
      if (!label.trim()) continue;
      // Text runs are emitted inside a second y-flip, so the Tm y is measured
      // from the bottom of the page. Convert back to top-down page space
      // (0 = top edge) to compare against the margins, same as the rects.
      const ascent = size * 0.75;
      const descent = size * 0.25;
      const box: Box = {
        page: number,
        x: cursorX,
        y: A4.height - cursorY - ascent,
        w,
        h: ascent + descent,
        text: label,
      };
      textBoxes.push(box);
      items.push({ seq: op.index, kind: 'text', page: number, box });
    }
  }
}

pageCount = pages.length;
items.sort((a, b) => a.seq - b.seq);

let failures = 0;
const fail = (message: string) => {
  failures += 1;
  console.log(`[FAIL] ${message}`);
};

console.log(`Halaman    : ${pageCount}`);
console.log(`Teks run  : ${textBoxes.length}`);
console.log(`Persegi   : ${rectBoxes.length}`);

const rightEdge = A4.width - MARGIN;
const bottomEdge = A4.height - MARGIN;

// 1. Nothing may reach into the margins.
for (const box of textBoxes) {
  if (box.x + box.w > rightEdge + EPS) {
    fail(`p${box.page} teks melewati margin kanan: ${(box.x + box.w).toFixed(1)} > ${rightEdge} "${box.text.slice(0, 40)}"`);
  }
  if (box.x < -EPS) fail(`p${box.page} teks melewati margin kiri: ${box.x.toFixed(1)} "${box.text.slice(0, 40)}"`);
  if (box.y < MARGIN - EPS) {
    fail(`p${box.page} teks melewati margin atas: ${box.y.toFixed(1)} < ${MARGIN} "${box.text.slice(0, 40)}"`);
  }
  if (box.y + box.h > bottomEdge + EPS) {
    fail(`p${box.page} teks melewati margin bawah: ${(box.y + box.h).toFixed(1)} > ${bottomEdge} "${box.text.slice(0, 40)}"`);
  }
}

for (const box of rectBoxes) {
  // Cover art deliberately bleeds to the paper edge; everything else is content.
  if (box.w >= A4.width || box.h >= A4.height) continue;
  if (box.x + box.w > rightEdge + EPS) {
    fail(`p${box.page} tabel melewati margin kanan: ${(box.x + box.w).toFixed(1)} > ${rightEdge}`);
  }
  if (box.x < -EPS) fail(`p${box.page} tabel melewati margin kiri: ${box.x.toFixed(1)}`);
}

// 2. No two text runs may collide.
const byPage = new Map<number, Box[]>();
for (const box of textBoxes) {
  if (!byPage.has(box.page)) byPage.set(box.page, []);
  byPage.get(box.page)!.push(box);
}
for (const [page, boxes] of byPage) {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (dx > 0.75 && dy > 0.75) {
        fail(
          `p${page} teks bertumpuk: "${a.text.slice(0, 28)}" [${a.x.toFixed(1)},${a.y.toFixed(1)}] ` +
            `vs "${b.text.slice(0, 28)}" [${b.x.toFixed(1)},${b.y.toFixed(1)}]`
        );
      }
    }
  }
}

// 3. No text may be painted over by a later opaque fill. This is how clipped
//    table cells actually manifest: the *next* row's background panel is filled
//    after the overflowing line was written, so the panel hides it.
for (const text of items) {
  if (text.kind !== 'text') continue;
  for (const rect of items) {
    if (rect.kind !== 'rect' || !rect.fill || rect.page !== text.page) continue;
    if (rect.seq <= text.seq) continue; // drawn before the text: harmless
    // Cover art deliberately spans the whole page.
    if (rect.w >= A4.width || rect.h >= A4.height) continue;
    const dx = Math.min(text.box.x + text.box.w, rect.x + rect.w) - Math.max(text.box.x, rect.x);
    const dy = Math.min(text.box.y + text.box.h, rect.y + rect.h) - Math.max(text.box.y, rect.y);
    if (dx > 0.75 && dy > 0.75) {
      fail(
        `p${text.page} teks tertutup kolom latar: "${text.box.text.slice(0, 32)}" ` +
          `[y=${text.box.y.toFixed(1)}] oleh kotak [${rect.x.toFixed(1)},${rect.y.toFixed(1)},` +
          `${rect.w.toFixed(1)}x${rect.h.toFixed(1)}]`
      );
    }
  }
}

if (failures === 0) {
  console.log('GEOMETRI PDF OK');
}
process.exit(failures === 0 ? 0 : 1);
