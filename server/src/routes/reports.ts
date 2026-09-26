import { Router } from 'express';
import requireAuth, { requireAdmin } from '../middleware/auth.ts';
import { buildReport } from '../services/reportService.ts';
import type { ReportFilters, ReportScope, ReportSort } from '../services/reportService.ts';
import { renderReportCsv } from '../services/reportCsv.ts';
import { renderReportPdf } from '../services/reportPdf.ts';
import { renderReportXlsx } from '../services/reportXlsx.ts';
import { recordSnapshot } from '../services/fleetService.ts';

const router = Router();
router.use(requireAuth);

const ALLOWED_SCOPES = new Set(['all', 'attention', 'overdue', 'due-soon', 'safe']);
const ALLOWED_SORTS = new Set(['urgency', 'plat', 'lokasi', 'odometer']);
const ALLOWED_FORMATS = new Set(['pdf', 'csv', 'xlsx']);

function readFilters(req): ReportFilters {
  const scope = String(req.query.scope || 'all');
  const sort = String(req.query.sort || 'urgency');
  return {
    text: String(req.query.text || '').slice(0, 120),
    lokasi: String(req.query.lokasi || 'all').slice(0, 120),
    scope: (ALLOWED_SCOPES.has(scope) ? scope : 'all') as ReportScope,
    sort: (ALLOWED_SORTS.has(sort) ? sort : 'urgency') as ReportSort,
  };
}

function filenameFor(report, extension) {
  const date = report.generatedAt.slice(0, 10);
  const lokasi = report.filters.lokasi === 'all' ? 'semua-lokasi' : report.filters.lokasi;
  const slug = lokasi
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `laporan-armada-${date}-${slug}.${extension}`;
}

// GET /api/reports/fleet
// Laporan ringkas untuk pratinjau di halaman Laporan.
router.get('/fleet', async (req, res) => {
  const report = await buildReport(readFilters(req));
  res.json({
    generatedAt: report.generatedAt,
    filters: report.filters,
    summary: report.summary,
    breakdown: report.breakdown,
    totals: report.totals,
    locations: report.locations,
    // Rincian kendaraan dipangkas agar tabel pratinjau tetap ringan.
    vehicles: report.rows.slice(0, 50).map((row) => ({
      id: row.id,
      plat: row.plat,
      merk: row.merk,
      tahun: row.tahun,
      lokasi: row.lokasi,
      pic: row.pic,
      kmSekarang: row.kmSekarang,
      overallStatus: row.overallStatus,
      overallStatusText: row.overallStatusText,
      pajakTahunanBerlaku: row.pajakTahunanBerlaku,
      pajak5TahunanBerlaku: row.pajak5TahunanBerlaku,
      keurBerlaku: row.keurBerlaku,
      lastServiceDate: row.lastService?.tanggal || null,
      nextServiceKm: row.nextServiceKm,
      kmLeft: row.kmLeft,
      serviceCount: row.serviceCount,
      photoCount: row.photos.length,
    })),
  });
});

function streamToResponse(doc, res) {
  return new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk) => res.write(chunk));
    doc.on('end', () => {
      res.end();
      resolve();
    });
    doc.on('error', reject);
  });
}

// GET /api/reports/fleet/export?format=pdf|xlsx|csv
router.get('/fleet/export', requireAdmin, async (req, res) => {
  const requested = String(req.query.format || 'pdf').toLowerCase();
  const format = ALLOWED_FORMATS.has(requested) ? requested : 'pdf';
  const report = await buildReport(readFilters(req));

  res.setHeader('X-Total-Vehicles', String(report.rows.length));
  res.setHeader('X-Report-Generated-At', report.generatedAt);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameFor(report, 'csv')}"`);
    return res.send(renderReportCsv(report));
  }

  if (format === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filenameFor(report, 'xlsx')}"`);
    return res.send(Buffer.from(renderReportXlsx(report)));
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameFor(report, 'pdf')}"`);
  const doc = renderReportPdf(report);
  await streamToResponse(doc, res);
});

// POST /api/reports/fleet/snapshot
// Mencatat komposisi status hari ini sebagai bahan pembanding antar periode.
router.post('/fleet/snapshot', requireAdmin, async (req, res) => {
  await recordSnapshot();
  res.json({ ok: true });
});

export default router;
