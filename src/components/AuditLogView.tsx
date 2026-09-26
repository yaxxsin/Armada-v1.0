import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';

export type AuditLogEntry = {
  id: string | number;
  user_id?: string | number | null;
  user_email?: string | null;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | number | null;
  details?: unknown;
  ip_address?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export type AuditLogViewProps = {
  /** Only users with the admin role can view or fetch audit data. */
  userRole: string | null;
  title?: string;
  initialPage?: number;
  pageSize?: number;
  className?: string;
  onPageChange?: (page: number) => void;
};

type AuditLogResponse = {
  logs?: AuditLogEntry[] | null;
  total?: number;
  page?: number;
  limit?: number;
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const numberFormatter = new Intl.NumberFormat('id-ID');

const styles = `
  .ac-audit { min-width: 0; }
  .ac-audit__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border);
  }
  .ac-audit__header h2 { font-size: 15px; }
  .ac-audit__total { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .ac-audit__body { padding: 0 16px; }
  .ac-audit__table-wrap { overflow-x: auto; }
  .ac-audit__table { width: 100%; min-width: 720px; border-collapse: collapse; }
  .ac-audit__table th {
    padding: 12px 10px;
    border-bottom: 1px solid var(--border);
    color: var(--text-faint);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-align: left;
    text-transform: uppercase;
  }
  .ac-audit__table th:first-child, .ac-audit__table td:first-child { padding-left: 0; }
  .ac-audit__table th:last-child, .ac-audit__table td:last-child { padding-right: 0; }
  .ac-audit__table td {
    padding: 13px 10px;
    border-bottom: 1px solid var(--border);
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.45;
    vertical-align: top;
  }
  .ac-audit__table tbody tr:last-child td { border-bottom: 0; }
  .ac-audit__time { min-width: 120px; color: var(--text-dim); font: 11px 'JetBrains Mono', monospace; white-space: nowrap; }
  .ac-audit__actor { min-width: 145px; color: var(--text); overflow-wrap: anywhere; }
  .ac-audit__entity { min-width: 125px; color: var(--text); }
  .ac-audit__details { min-width: 240px; max-width: 390px; overflow-wrap: anywhere; }
  .ac-audit__ip { display: block; margin-top: 3px; color: var(--text-faint); font: 10px 'JetBrains Mono', monospace; }
  .ac-audit__text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  .ac-audit__text--open {
    display: block;
    max-height: 320px;
    overflow-y: auto;
    overflow-wrap: anywhere;
  }
  .ac-audit__toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    padding: 2px 0;
    background: none;
    border: 0;
    color: var(--blue);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  .ac-audit__toggle:hover { text-decoration: underline; }
  .ac-audit__toggle:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
  .ac-audit__chevron { transition: transform 0.15s; }
  .ac-audit__chevron--open { transform: rotate(180deg); }
  .ac-audit__action {
    display: inline-block;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-dim);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .ac-audit__action--create { border-color: var(--teal); color: var(--teal); }
  .ac-audit__action--update { border-color: var(--blue); color: var(--blue); }
  .ac-audit__action--delete { border-color: var(--red); color: var(--red); }
  .ac-audit__action--read { border-color: var(--amber); color: var(--amber); }
  .ac-audit__empty { padding: 38px 16px; color: var(--text-faint); text-align: center; }
  .ac-audit__empty strong { display: block; margin-bottom: 5px; color: var(--text-dim); font-size: 13px; }
  .ac-audit__empty span { font-size: 12px; }
  .ac-audit__error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 14px 0;
    padding: 12px 14px;
    border: 1px solid var(--red);
    border-radius: 8px;
    background: var(--red-dim);
    color: var(--red);
    font-size: 12px;
  }
  .ac-audit__error button { flex-shrink: 0; }
  .ac-audit__loading { padding: 60px 16px; }
  .ac-audit__pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 0;
    border-top: 1px solid var(--border);
  }
  .ac-audit__pager span { min-width: 115px; color: var(--text-dim); font: 10px 'JetBrains Mono', monospace; text-align: center; }
  .ac-audit__pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  .ac-audit__list { display: none; }
  .ac-audit__mobile-item { padding: 14px 0; border-bottom: 1px solid var(--border); }
  .ac-audit__mobile-item:last-child { border-bottom: 0; }
  .ac-audit__mobile-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ac-audit__mobile-time { color: var(--text-dim); font: 10px 'JetBrains Mono', monospace; text-align: right; }
  .ac-audit__mobile-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; margin-top: 10px; }
  .ac-audit__mobile-label { display: block; margin-bottom: 2px; color: var(--text-faint); font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; }
  .ac-audit__mobile-value { color: var(--text-dim); font-size: 12px; overflow-wrap: anywhere; }
  .ac-audit__mobile-details { grid-column: 1 / -1; }
  .ac-audit__access { padding: 30px 16px; color: var(--text-faint); font-size: 12px; text-align: center; }
  .ac-audit__pager button:focus-visible,
  .ac-audit__error button:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
  @media (max-width: 720px) {
    .ac-audit__body { padding: 0 16px; }
    .ac-audit__table-wrap { display: none; }
    .ac-audit__list { display: block; }
    .ac-audit__pager { padding-bottom: 16px; }
  }
  @media (max-width: 430px) {
    .ac-audit__mobile-grid { grid-template-columns: 1fr; }
    .ac-audit__mobile-details { grid-column: auto; }
    .ac-audit__mobile-time { max-width: 145px; }
  }
`;

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Waktu tidak tersedia';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 'Waktu tidak tersedia';
  return dateFormatter.format(new Date(timestamp));
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

type AuditField = { key: string; label: string; value: string };
type AuditDetails = { summary: string; fields: AuditField[] };

function toAuditDetails(value: unknown, key = ''): AuditField[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) {
    const items = value.map((item) => formatValue(item));
    return [{ key, label: humanizeKey(key), value: items.join(', ') }];
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([entryKey, entryValue]) =>
      toAuditDetails(entryValue, entryKey)
    );
  }
  return [{ key, label: humanizeKey(key), value: formatValue(value) }];
}

function formatDetails(details: unknown): AuditDetails {
  if (details === null || details === undefined || details === '') {
    return { summary: 'Tidak ada detail', fields: [] };
  }
  if (typeof details !== 'string') {
    return { summary: '', fields: toAuditDetails(details) };
  }

  const payloadMarker = details.indexOf(' payload=');
  if (payloadMarker === -1) {
    return { summary: details, fields: [] };
  }

  const summary = details.slice(0, payloadMarker).trim();
  const payloadText = details.slice(payloadMarker + ' payload='.length).trim();
  try {
    const payload = JSON.parse(payloadText) as unknown;
    return { summary, fields: toAuditDetails(payload) };
  } catch {
    return { summary: details, fields: [] };
  }
}

function actionLabel(action?: string | null) {
  const labels: Record<string, string> = {
    create: 'Buat',
    update: 'Perbarui',
    delete: 'Hapus',
    read: 'Baca',
  };
  const normalized = action?.trim().toLowerCase() || '';
  return labels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1) || 'Aktivitas';
}

function actionTone(action?: string | null) {
  const normalized = action?.trim().toLowerCase() || '';
  return ['create', 'update', 'delete', 'read'].includes(normalized) ? normalized : '';
}

function entityLabel(log: AuditLogEntry) {
  const labels: Record<string, string> = {
    vehicle: 'Kendaraan',
    user: 'Pengguna',
    service_history: 'Riwayat servis',
  };
  const type = log.entity_type?.trim().toLowerCase() || 'sistem';
  const label = labels[type] || type.replace(/[_-]+/g, ' ');
  return log.entity_id === null || log.entity_id === undefined
    ? label.charAt(0).toUpperCase() + label.slice(1)
    : `${label.charAt(0).toUpperCase() + label.slice(1)} #${log.entity_id}`;
}

function actorLabel(log: AuditLogEntry) {
  if (log.user_email) return log.user_email;
  if (log.user_id !== null && log.user_id !== undefined) return `Pengguna #${log.user_id}`;
  return 'Pengguna tidak tersedia';
}

function logKey(log: AuditLogEntry, index: number) {
  return log.id ?? `${log.created_at || 'audit'}-${index}`;
}

/**
 * Renders a collapsed summary with a dropdown toggle so long audit rows (for
 * example a vehicle photo edit) never stretch the table.
 */
function DetailsCell({ log }: { log: AuditLogEntry }) {
  const { summary, fields } = useMemo(() => formatDetails(log.details), [log.details]);
  const [open, setOpen] = useState(false);
  const hasMore = fields.length > 2 || summary.length > 90;

  return (
    <div>
      <div className={`ac-audit__text${open ? ' ac-audit__text--open' : ''}`}>
        {summary}
        {fields.map((field) => (
          <span key={field.key} style={{ display: 'block' }}>
            {field.label}: {field.value}
          </span>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="ac-audit__toggle"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Sembunyikan detail' : `Lihat detail${fields.length ? ` (${fields.length} field)` : ''}`}
          <span className={`ac-audit__chevron${open ? ' ac-audit__chevron--open' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>
      )}
      {log.ip_address && <span className="ac-audit__ip">IP: {log.ip_address}</span>}
    </div>
  );
}

export default function AuditLogView({
  userRole,
  title = 'Audit log',
  initialPage = 1,
  pageSize = 50,
  className = '',
  onPageChange,
}: AuditLogViewProps) {
  const safePageSize = Math.min(100, positiveInteger(pageSize, 50));
  const safeInitialPage = positiveInteger(initialPage, 1);
  const titleId = useId();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(safeInitialPage);
  const [limit, setLimit] = useState(safePageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadPage = useCallback(async () => {
    if (userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const response = (await api(`/audit?page=${page}&limit=${safePageSize}`)) as AuditLogResponse;
      if (currentRequest !== requestId.current) return;

      const nextLogs = Array.isArray(response.logs) ? response.logs : [];
      const nextTotal = nonNegativeInteger(response.total, nextLogs.length);
      const nextLimit = positiveInteger(response.limit, safePageSize);
      const nextPage = positiveInteger(response.page, page);
      const lastPage = Math.max(1, Math.ceil(nextTotal / nextLimit));

      setLogs(nextLogs);
      setTotal(nextTotal);
      setLimit(nextLimit);
      if (nextPage > lastPage) {
        setPage(lastPage);
      } else {
        setPage(nextPage);
      }
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat audit log.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page, safePageSize, userRole]);

  useEffect(() => {
    void loadPage();
    return () => {
      requestId.current += 1;
    };
  }, [loadPage]);

  if (userRole !== 'admin') {
    return (
      <>
        <style>{styles}</style>
        <section className={`panel-box ac-audit ${className}`} aria-labelledby={titleId}>
          <div className="ac-audit__header">
            <h2 id={titleId}>{title}</h2>
          </div>
          <div className="ac-audit__access">Audit log hanya tersedia untuk pengguna dengan role admin.</div>
        </section>
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const currentPage = Math.min(page, totalPages);

  const changePage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    setPage(nextPage);
    onPageChange?.(nextPage);
  };

  const renderEmptyState = () => (
    <div className="ac-audit__empty">
      <strong>Belum ada audit log.</strong>
      <span>Aktivitas admin akan muncul di sini setelah tersedia.</span>
    </div>
  );

  const renderAction = (log: AuditLogEntry) => (
    <span className={`ac-audit__action${actionTone(log.action) ? ` ac-audit__action--${actionTone(log.action)}` : ''}`}>
      {actionLabel(log.action)}
    </span>
  );

  return (
    <>
      <style>{styles}</style>
      <section className={`panel-box ac-audit ${className}`} aria-labelledby={titleId} aria-busy={loading}>
        <div className="ac-audit__header">
          <h2 id={titleId}>{title}</h2>
          <span className="ac-audit__total" aria-live="polite">
            {loading ? 'Memuat…' : `${numberFormatter.format(total)} aktivitas`}
          </span>
        </div>

        <div className="ac-audit__body">
          {loading ? (
            <div className="ac-audit__loading loading" role="status">Memuat audit log…</div>
          ) : error ? (
            <div className="ac-audit__error" role="alert">
              <span>{error}</span>
              <button type="button" className="btn ghost small" onClick={() => void loadPage()}>Coba lagi</button>
            </div>
          ) : logs.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <div className="ac-audit__table-wrap">
                <table className="ac-audit__table">
                  <thead>
                    <tr>
                      <th scope="col">Waktu</th>
                      <th scope="col">Aksi</th>
                      <th scope="col">Entitas</th>
                      <th scope="col">Pengguna</th>
                      <th scope="col">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={logKey(log, index)}>
                        <td className="ac-audit__time">
                          <time dateTime={log.created_at || undefined}>{formatDateTime(log.created_at)}</time>
                        </td>
                        <td>{renderAction(log)}</td>
                        <td className="ac-audit__entity">{entityLabel(log)}</td>
                        <td className="ac-audit__actor">{actorLabel(log)}</td>
                        <td className="ac-audit__details">
                          <DetailsCell log={log} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ac-audit__list">
                {logs.map((log, index) => (
                  <article className="ac-audit__mobile-item" key={logKey(log, index)}>
                    <div className="ac-audit__mobile-top">
                      {renderAction(log)}
                      <time className="ac-audit__mobile-time" dateTime={log.created_at || undefined}>
                        {formatDateTime(log.created_at)}
                      </time>
                    </div>
                    <div className="ac-audit__mobile-grid">
                      <div>
                        <span className="ac-audit__mobile-label">Entitas</span>
                        <span className="ac-audit__mobile-value">{entityLabel(log)}</span>
                      </div>
                      <div>
                        <span className="ac-audit__mobile-label">Pengguna</span>
                        <span className="ac-audit__mobile-value">{actorLabel(log)}</span>
                      </div>
                      <div className="ac-audit__mobile-details">
                        <span className="ac-audit__mobile-label">Detail</span>
                        <div className="ac-audit__mobile-value">
                          <DetailsCell log={log} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <nav className="ac-audit__pager" aria-label="Navigasi audit log">
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={currentPage <= 1}
                  onClick={() => changePage(currentPage - 1)}
                >
                  ← Sebelumnya
                </button>
                <span aria-live="polite">Halaman {currentPage} dari {totalPages}</span>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={currentPage >= totalPages}
                  onClick={() => changePage(currentPage + 1)}
                >
                  Berikutnya →
                </button>
              </nav>
            </>
          )}
        </div>
      </section>
    </>
  );
}
