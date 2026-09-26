import type { ReactNode } from 'react';
import StatsGrid from './StatsGrid';
import SkeletonStats from './SkeletonStats';

export type DashboardOverviewUser = {
  name?: string | null;
  email?: string | null;
} | null;

export type DashboardOverviewProps = {
  user?: DashboardOverviewUser;
  total?: number;
  overdue?: number;
  dueSoon?: number;
  safe?: number;
  locationCount?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  canManageFleet?: boolean;
  onAddVehicle?: () => void;
  children?: ReactNode;
};

const styles = `
  .ac-overview { min-width: 0; }
  .ac-overview__welcome {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 14px;
  }
  .ac-overview__welcome h1 { font-size: 30px; line-height: 1.1; letter-spacing: -0.035em; }
  .ac-overview__welcome p { margin-top: 4px; color: var(--text-dim); font-size: 12px; }
  .ac-overview__date { flex: 0 0 auto; color: var(--text-faint); font: 10px 'JetBrains Mono', monospace; text-transform: uppercase; }
  .ac-overview__command { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
  .ac-overview__status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding: 11px 14px;
    border: 1px solid var(--border);
    border-left-width: 1px;
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.45;
  }
  .ac-overview__status--ok { background: linear-gradient(90deg, rgba(65, 216, 189, 0.08), var(--panel) 34%); }
  .ac-overview__status--warn { background: linear-gradient(90deg, rgba(245, 184, 75, 0.08), var(--panel) 34%); }
  .ac-overview__status--danger { background: linear-gradient(90deg, rgba(255, 107, 104, 0.08), var(--panel) 34%); }
  .ac-overview__status--empty { background: linear-gradient(90deg, rgba(110, 164, 255, 0.08), var(--panel) 34%); }
  .ac-overview__status-icon {
    width: 9px;
    height: 9px;
    flex: 0 0 9px;
    border-radius: 50%;
    background: var(--text);
    box-shadow: 0 0 0 4px rgba(237, 243, 247, 0.06);
  }
  .ac-overview__status--ok .ac-overview__status-icon { background: var(--teal); box-shadow: 0 0 0 4px rgba(65, 216, 189, 0.1); }
  .ac-overview__status--warn .ac-overview__status-icon { background: var(--amber); box-shadow: 0 0 0 4px rgba(245, 184, 75, 0.1); }
  .ac-overview__status--danger .ac-overview__status-icon { background: var(--red); box-shadow: 0 0 0 4px rgba(255, 107, 104, 0.1); }
  .ac-overview__status--empty .ac-overview__status-icon { background: var(--blue); box-shadow: 0 0 0 4px rgba(110, 164, 255, 0.1); }
  .ac-overview__error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--red);
    border-radius: 8px;
    background: var(--red-dim);
    color: var(--red);
    font-size: 12px;
  }
  .ac-overview__error button { border: 0; background: transparent; color: inherit; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .ac-overview__error button:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
  @media (max-width: 600px) {
    .ac-overview__welcome { display: block; }
    .ac-overview__date { display: block; margin-top: 8px; }
    .ac-overview__command { justify-content: flex-start; margin-top: 12px; }
  }
`;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function getStatus(total: number, overdue: number, dueSoon: number) {
  if (total === 0) {
    return {
      tone: 'empty',
      message: 'Belum ada kendaraan. Tambahkan armada pertama untuk mulai memantau kondisi.',
    };
  }
  if (overdue > 0) {
    return {
      tone: 'danger',
      message: `${overdue} pengingat terlambat membutuhkan tindakan segera.`,
    };
  }
  if (dueSoon > 0) {
    return {
      tone: 'warn',
      message: `${dueSoon} pengingat akan segera jatuh tempo. Semua item lain masih aman.`,
    };
  }
  return {
    tone: 'ok',
    message: `Seluruh ${total} kendaraan berada dalam kondisi aman. Tidak ada tindakan mendesak.`,
  };
}

export default function DashboardOverview({
  user,
  total = 0,
  overdue = 0,
  dueSoon = 0,
  safe = 0,
  locationCount = 0,
  loading = false,
  error = null,
  onRetry,
  canManageFleet = false,
  onAddVehicle,
  children,
}: DashboardOverviewProps) {
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Admin';
  const status = getStatus(total, overdue, dueSoon);
  const today = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  return (
    <>
      <style>{styles}</style>
      <section className="ac-overview" aria-labelledby="dashboard-welcome-title" aria-busy={loading}>
        <div className="ac-overview__welcome">
          <div>
            <h1 id="dashboard-welcome-title">{getGreeting()}, {displayName}</h1>
            <p>Pantau kondisi pajak, keur, dan servis dari satu tempat.</p>
          </div>
          <div className="ac-overview__command">
            <time className="ac-overview__date" dateTime={new Date().toISOString().slice(0, 10)}>{today} · WIB</time>
            {canManageFleet && onAddVehicle && (
              <button type="button" className="btn" onClick={onAddVehicle}>+ Tambah kendaraan</button>
            )}
          </div>
        </div>

        {error ? (
          <div className="ac-overview__error" role="alert">
            <span>{error}</span>
            {onRetry && <button type="button" onClick={onRetry}>Coba lagi</button>}
          </div>
        ) : (
          <div className={`ac-overview__status ac-overview__status--${status.tone}`} role="status">
            <span className="ac-overview__status-icon" aria-hidden="true" />
            <span>{loading ? 'Memuat ringkasan kondisi armada…' : status.message}</span>
          </div>
        )}

        {loading ? <SkeletonStats /> : !error && <StatsGrid total={total} overdue={overdue} dueSoon={dueSoon} safe={safe} locationCount={locationCount} />}

        {children}
      </section>
    </>
  );
}
