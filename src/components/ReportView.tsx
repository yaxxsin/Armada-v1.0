import { useCallback, useEffect, useId, useState } from 'react';
import { api } from '../api/client';
import { exportReport, fmtDate } from '../utils/helpers';
import TrendChart from './TrendChart';

export type ReportSummary = {
  total: number;
  ok: number;
  amber: number;
  red: number;
  totalPhotos: number;
  totalOdometer: number;
  totalServiceCost: number;
  duePajakTahunan: number;
  duePajak5Tahunan: number;
  dueKeur: number;
  dueService: number;
};

export type ReportBreakdown = {
  lokasi: string;
  total: number;
  ok: number;
  amber: number;
  red: number;
  totalOdometer: number;
  totalServiceCost: number;
};

export type ReportVehicle = {
  id: number | string;
  plat: string;
  merk: string;
  tahun: string;
  lokasi: string;
  pic: string;
  kmSekarang: number;
  overallStatus: string;
  overallStatusText: string;
  pajakTahunanBerlaku: string | null;
  pajak5TahunanBerlaku: string | null;
  keurBerlaku: string | null;
  lastServiceDate: string | null;
  nextServiceKm: number | null;
  kmLeft: number | null;
  serviceCount: number;
  photoCount: number;
};

export type ReportPayload = {
  generatedAt: string;
  filters: { text: string; lokasi: string; scope: string; sort: string };
  summary: ReportSummary;
  breakdown: ReportBreakdown[];
  totals: { armadaTotal: number; laporanJumlah: number; lokasiTerpakai: number };
  locations: string[];
  vehicles: ReportVehicle[];
};

export type ReportViewProps = {
  userRole: string | null;
  snapshots?: unknown[];
  className?: string;
};

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Semua status' },
  { value: 'overdue', label: 'Terlambat' },
  { value: 'due-soon', label: 'Perlu perhatian' },
  { value: 'safe', label: 'Aman' },
  { value: 'attention', label: 'Perlu tindakan' },
];

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Paling mendesak' },
  { value: 'plat', label: 'Plat nomor' },
  { value: 'lokasi', label: 'Lokasi' },
  { value: 'odometer', label: 'Odometer tertinggi' },
];

const styles = `
  .rv { display: grid; gap: 16px; min-width: 0; }
  .rv__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
  .rv__toolbar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
    gap: 10px;
    align-items: end;
  }
  .rv__field { display: grid; gap: 5px; min-width: 0; }
  .rv__field label { color: var(--text-faint); font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; }
  .rv__field select, .rv__field input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    color: var(--text);
    font: inherit;
    font-size: 13px;
  }
  .rv__actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .rv__meta { display: flex; flex-wrap: wrap; gap: 8px 16px; color: var(--text-faint); font-size: 11px; }
  .rv__meta strong { color: var(--text); font-family: 'JetBrains Mono'; font-size: 11px; }
  .rv__kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .rv__kpi { padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); }
  .rv__kpi-label { display: block; color: var(--text-faint); font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
  .rv__kpi-value { display: block; margin-top: 4px; color: var(--text); font: 700 22px 'JetBrains Mono', monospace; }
  .rv__kpi--ok .rv__kpi-value { color: var(--teal); }
  .rv__kpi--amber .rv__kpi-value { color: var(--amber); }
  .rv__kpi--red .rv__kpi-value { color: var(--red); }
  .rv__kpi-note { display: block; margin-top: 3px; color: var(--text-faint); font-size: 10px; }
  .rv__grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  .rv__panel { border: 1px solid var(--border); border-radius: 10px; background: var(--panel); overflow: hidden; }
  .rv__panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
  .rv__panel-head h3 { margin: 0; font-size: 13px; }
  .rv__panel-head span { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .rv__scroll { max-height: 420px; overflow: auto; }
  .rv__table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .rv__table th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 9px 12px;
    background: var(--panel2);
    border-bottom: 1px solid var(--border);
    color: var(--text-faint);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .rv__table td { padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--text-dim); vertical-align: top; }
  .rv__table tbody tr:last-child td { border-bottom: 0; }
  .rv__table tbody tr:hover td { background: var(--panel2); }
  .rv__plate { color: var(--text); font: 700 12px 'JetBrains Mono', monospace; }
  .rv__num { text-align: right; font-family: 'JetBrains Mono', monospace; }
  .rv__pill {
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .rv__pill--ok { border-color: var(--teal); color: var(--teal); }
  .rv__pill--amber { border-color: var(--amber); color: var(--amber); }
  .rv__pill--red { border-color: var(--red); color: var(--red); }
  .rv__issues { display: grid; gap: 3px; }
  .rv__issue { color: var(--text-dim); font-size: 11px; }
  .rv__issue b { color: var(--text-faint); font-weight: 600; }
  .rv__bar { height: 5px; border-radius: 999px; background: var(--panel2); overflow: hidden; display: flex; margin-top: 5px; }
  .rv__bar span { display: block; height: 100%; }
  .rv__bar .ok { background: var(--teal); }
  .rv__bar .amber { background: var(--amber); }
  .rv__bar .red { background: var(--red); }
  .rv__legend { display: flex; gap: 10px; margin-top: 8px; color: var(--text-faint); font-size: 10px; }
  .rv__legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }
  .rv__empty { padding: 32px 14px; color: var(--text-faint); font-size: 12px; text-align: center; }
  .rv__error { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--red); border-radius: 8px; background: var(--red-dim); color: var(--red); font-size: 12px; }
  .rv__note { color: var(--text-faint); font-size: 11px; line-height: 1.5; }
  .rv__note code { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
  .rv__loading { display: grid; gap: 12px; }
  .rv__skeleton { height: 68px; border-radius: 10px; background: linear-gradient(90deg, var(--panel2) 25%, var(--panel) 50%, var(--panel2) 75%); background-size: 200% 100%; animation: rv-shimmer 1.2s infinite; }
  @keyframes rv-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (max-width: 1100px) {
    .rv__toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .rv__actions { grid-column: 1 / -1; }
    .rv__grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 720px) {
    .rv__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .rv__toolbar { grid-template-columns: 1fr; }
  }
`;

const numberFormatter = new Intl.NumberFormat('id-ID');

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  return numberFormatter.format(Number(value));
}

// Pinned to WIB to match the exported documents; without this the preview
// drifts whenever the browser sits in another timezone.
const REPORT_TIME_ZONE = 'Asia/Jakarta';

function formatTimestamp(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: REPORT_TIME_ZONE })} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: REPORT_TIME_ZONE })} WIB`;
}

function scopeText(value: string) {
  return SCOPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

function sortText(value: string) {
  return SORT_OPTIONS.find((option) => option.value === value)?.label || value;
}

function issueList(vehicle: ReportVehicle) {
  const today = new Date();
  const issues: string[] = [];
  const check = (label: string, date: string | null, warnDays: number) => {
    if (!date) return;
    const days = Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(today.toDateString()).getTime()) / 86400000);
    if (days < 0) issues.push(`${label} terlambat ${Math.abs(days)} hari`);
    else if (days <= warnDays) issues.push(`${label} ${days} hari lagi`);
  };
  check('Pajak tahunan', vehicle.pajakTahunanBerlaku, 30);
  check('Pajak 5 tahun', vehicle.pajak5TahunanBerlaku, 60);
  check('KEUR', vehicle.keurBerlaku, 30);
  if (vehicle.kmLeft !== null && vehicle.kmLeft <= 500) {
    issues.push(vehicle.kmLeft < 0 ? `Servis lewat ${formatNumber(Math.abs(vehicle.kmLeft))} km` : `Servis ${formatNumber(vehicle.kmLeft)} km lagi`);
  }
  return issues;
}

export default function ReportView({ userRole, snapshots = [], className = '' }: ReportViewProps) {
  const headingId = useId();
  const [filters, setFilters] = useState({ text: '', lokasi: 'all', scope: 'all', sort: 'urgency' });
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | 'csv' | null>(null);
  const [exportNote, setExportNote] = useState('');

  const isAdmin = userRole === 'admin';

  const query = new URLSearchParams();
  if (filters.text) query.set('text', filters.text);
  if (filters.lokasi !== 'all') query.set('lokasi', filters.lokasi);
  if (filters.scope !== 'all') query.set('scope', filters.scope);
  if (filters.sort !== 'urgency') query.set('sort', filters.sort);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api(`/reports/fleet?${query.toString()}`);
      setData(payload as ReportPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.text, filters.lokasi, filters.scope, filters.sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    setExporting(format);
    setExportNote('');
    try {
      const filename = await exportReport(format, filters);
      setExportNote(`Berkas ${filename} berhasil diunduh.`);
    } catch (exportError) {
      setExportNote(exportError instanceof Error ? exportError.message : 'Gagal mengekspor laporan.');
    } finally {
      setExporting(null);
    }
  };

  const summary = data?.summary;
  const breakdown = data?.breakdown || [];

  return (
    <>
      <style>{styles}</style>
      <section className={`rv ${className}`} aria-label="Pratinjau laporan armada">
        <h2 id={headingId} className="rv__sr-only">
          Pratinjau laporan armada
        </h2>

        <div className="rv__toolbar">
          <div className="rv__field">
            <label htmlFor="report-search">Pencarian</label>
            <input
              id="report-search"
              value={filters.text}
              placeholder="Plat, merk, atau PIC"
              onChange={(event) => setFilters((prev) => ({ ...prev, text: event.target.value }))}
            />
          </div>
          <div className="rv__field">
            <label htmlFor="report-location">Lokasi</label>
            <select
              id="report-location"
              value={filters.lokasi}
              onChange={(event) => setFilters((prev) => ({ ...prev, lokasi: event.target.value }))}
            >
              <option value="all">Semua lokasi</option>
              {(data?.locations || []).map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="rv__field">
            <label htmlFor="report-scope">Status</label>
            <select
              id="report-scope"
              value={filters.scope}
              onChange={(event) => setFilters((prev) => ({ ...prev, scope: event.target.value }))}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rv__field">
            <label htmlFor="report-sort">Urutan</label>
            <select
              id="report-sort"
              value={filters.sort}
              onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rv__field">
            <label htmlFor="report-refresh">Aksi</label>
            <div className="rv__actions" id="report-refresh">
              <button
                type="button"
                className="btn"
                onClick={() => void handleExport('xlsx')}
                disabled={exporting !== null || !isAdmin}
                title={isAdmin ? 'Unduh workbook Excel multi-sheet' : 'Hanya admin yang dapat mengunduh laporan'}
              >
                {exporting === 'xlsx' ? 'Membuat Excel…' : 'Export Excel'}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => void handleExport('pdf')}
                disabled={exporting !== null || !isAdmin}
                title={isAdmin ? 'Unduh laporan PDF untuk dicetak' : 'Hanya admin yang dapat mengunduh laporan'}
              >
                {exporting === 'pdf' ? 'Membuat PDF…' : 'Export PDF'}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => void handleExport('csv')}
                disabled={exporting !== null || !isAdmin}
                title={isAdmin ? 'Unduh laporan CSV' : 'Hanya admin yang dapat mengunduh laporan'}
              >
                {exporting === 'csv' ? 'Membuat CSV…' : 'Export CSV'}
              </button>
              <button type="button" className="btn ghost small" onClick={() => void load()} disabled={loading}>
                Muat ulang
              </button>
            </div>
          </div>
        </div>
        {exportNote && (
          <div className="rv__note" role="status">
            {exportNote}
          </div>
        )}
        {!isAdmin && (
          <div className="rv__note">
            Pratinjau laporan tersedia untuk semua pengguna. Unduh Excel, PDF, dan CSV hanya untuk admin.
          </div>
        )}

        {error && (
          <div className="rv__error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn ghost small" onClick={() => void load()}>
              Coba lagi
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="rv__loading" aria-busy="true">
            <div className="rv__skeleton" />
            <div className="rv__skeleton" />
            <div className="rv__skeleton" />
          </div>
        ) : summary ? (
          <>
            <div className="rv__meta">
              <span>
                Dibuat <strong>{formatTimestamp(data?.generatedAt)}</strong>
              </span>
              <span>
                Kendaraan <strong>{formatNumber(data?.totals.laporanJumlah)}</strong> dari{' '}
                <strong>{formatNumber(data?.totals.armadaTotal)}</strong>
              </span>
              <span>
                Lokasi <strong>{formatNumber(data?.totals.lokasiTerpakai)}</strong>
              </span>
              <span>
                Filter <strong>{scopeText(filters.scope)}</strong>
              </span>
              <span>
                Urutan <strong>{sortText(filters.sort)}</strong>
              </span>
            </div>

            <div className="rv__kpis">
              <div className="rv__kpi">
                <span className="rv__kpi-label">Total kendaraan</span>
                <span className="rv__kpi-value">{formatNumber(summary.total)}</span>
                <span className="rv__kpi-note">{formatNumber(summary.totalOdometer)} km total odometer</span>
              </div>
              <div className="rv__kpi rv__kpi--ok">
                <span className="rv__kpi-label">Aman</span>
                <span className="rv__kpi-value">{formatNumber(summary.ok)}</span>
                <span className="rv__kpi-note">
                  Total biaya servis Rp {formatNumber(summary.totalServiceCost)}
                </span>
              </div>
              <div className="rv__kpi rv__kpi--amber">
                <span className="rv__kpi-label">Perlu perhatian</span>
                <span className="rv__kpi-value">{formatNumber(summary.amber)}</span>
                <span className="rv__kpi-note">
                  Pajak {summary.duePajakTahunan + summary.duePajak5Tahunan + summary.dueKeur} · Servis{' '}
                  {summary.dueService}
                </span>
              </div>
              <div className="rv__kpi rv__kpi--red">
                <span className="rv__kpi-label">Terlambat</span>
                <span className="rv__kpi-value">{formatNumber(summary.red)}</span>
                <span className="rv__kpi-note">{formatNumber(summary.totalPhotos)} foto terlampir</span>
              </div>
            </div>

            <div className="rv__grid">
              <div className="rv__panel">
                <div className="rv__panel-head">
                  <h3>Kendaraan perlu tindakan</h3>
                  <span>50 pertama</span>
                </div>
                {data && data.vehicles.length > 0 ? (
                  <div className="rv__scroll">
                    <table className="rv__table">
                      <thead>
                        <tr>
                          <th scope="col">Plat</th>
                          <th scope="col">Kendaraan</th>
                          <th scope="col">Lokasi / PIC</th>
                          <th scope="col" className="rv__num">Odo</th>
                          <th scope="col">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.vehicles.map((vehicle) => {
                          const issues = issueList(vehicle);
                          return (
                            <tr key={vehicle.id}>
                              <td className="rv__plate">{vehicle.plat || '-'}</td>
                              <td>
                                <span className="rv__plate" style={{ background: 'none', color: 'var(--text)' }}>
                                  {vehicle.merk || '-'}
                                </span>
                                {vehicle.tahun ? ` · ${vehicle.tahun}` : ''}
                                <div>
                                  <span className={`rv__pill rv__pill--${vehicle.overallStatus}`}>
                                    {vehicle.overallStatusText}
                                  </span>
                                </div>
                              </td>
                              <td>
                                {vehicle.lokasi || '-'}
                                <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                                  PIC: {vehicle.pic || '-'}
                                </div>
                              </td>
                              <td className="rv__num">{formatNumber(vehicle.kmSekarang)}</td>
                              <td>
                                {issues.length === 0 ? (
                                  <span style={{ color: 'var(--text-faint)' }}>Tidak ada</span>
                                ) : (
                                  <div className="rv__issues">
                                    {issues.slice(0, 3).map((issue) => (
                                      <span className="rv__issue" key={issue}>
                                        {issue}
                                      </span>
                                    ))}
                                    {issues.length > 3 && (
                                      <span className="rv__issue">+{issues.length - 3} lainnya</span>
                                    )}
                                  </div>
                                )}
                                {vehicle.lastServiceDate && (
                                  <div style={{ color: 'var(--text-faint)', fontSize: 10, marginTop: 3 }}>
                                    Servis {fmtDate(vehicle.lastServiceDate)} · {vehicle.serviceCount} riwayat
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rv__empty">Tidak ada kendaraan yang cocok dengan filter ini.</div>
                )}
              </div>

              <div className="rv__panel">
                <div className="rv__panel-head">
                  <h3>Status per lokasi</h3>
                  <span>{breakdown.length} lokasi</span>
                </div>
                {breakdown.length === 0 ? (
                  <div className="rv__empty">Belum ada data lokasi.</div>
                ) : (
                  <div className="rv__scroll">
                    <table className="rv__table">
                      <thead>
                        <tr>
                          <th scope="col">Lokasi</th>
                          <th scope="col" className="rv__num">Total</th>
                          <th scope="col" className="rv__num">Aman</th>
                          <th scope="col" className="rv__num">Perhatian</th>
                          <th scope="col" className="rv__num">Terlambat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((item) => (
                          <tr key={item.lokasi}>
                            <td>
                              {item.lokasi}
                              <div className="rv__bar" aria-hidden="true">
                                <span className="ok" style={{ width: `${(item.ok / Math.max(1, item.total)) * 100}%` }} />
                                <span className="amber" style={{ width: `${(item.amber / Math.max(1, item.total)) * 100}%` }} />
                                <span className="red" style={{ width: `${(item.red / Math.max(1, item.total)) * 100}%` }} />
                              </div>
                            </td>
                            <td className="rv__num">{item.total}</td>
                            <td className="rv__num">{item.ok}</td>
                            <td className="rv__num">{item.amber}</td>
                            <td className="rv__num">{item.red}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="rv__legend" style={{ padding: '0 14px 14px' }}>
                      <span>
                        <i style={{ background: 'var(--teal)' }} />
                        Aman
                      </span>
                      <span>
                        <i style={{ background: 'var(--amber)' }} />
                        Perlu perhatian
                      </span>
                      <span>
                        <i style={{ background: 'var(--red)' }} />
                        Terlambat
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rv__panel">
              <div className="rv__panel-head">
                <h3>Tren kepatuhan</h3>
                <span>Snapshot harian</span>
              </div>
              <div style={{ padding: 14 }}>
                <TrendChart snapshots={snapshots as never} />
              </div>
            </div>

            <p className="rv__note">
              Berkas Excel adalah workbook 6 sheet (Ringkasan, Rincian Kendaraan, Tindakan Prioritas, Per Lokasi,
              Riwayat Servis, Riwayat Odometer) dengan header beku dan autofilter. Sheet Rincian Kendaraan memakai
              urutan kolom yang sama dengan template import Excel pada kolom A-L
              (<code>Merk, Plat, Tahun, Lokasi, PIC, Pajak Tahunan Berlaku, Pajak 5 Tahun Berlaku, Keur Berlaku,
              Interval KM, Interval Bulan, Odometer, Catatan</code>), sehingga dapat disunting lalu diimpor kembali.
              Kolom M dan seterusnya hanya untuk analisis. Berkas PDF berisi sampul, ringkasan eksekutif, rincian
              kendaraan, daftar tindakan prioritas, riwayat servis, dan riwayat odometer. Berkas CSV disusun sebagai
              satu grid persegi penuh agar tidak terpecah saat dibuka di Excel.
            </p>
          </>
        ) : (
          <div className="rv__empty">Laporan belum tersedia.</div>
        )}
      </section>
    </>
  );
}
