import { useMemo } from 'react';

export type ActivityVehicle = {
  id: string;
  plat?: string | null;
  merk?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  serviceHistory?: Array<{ tanggal?: string | null }>;
};

export type AdminActivity = {
  id: string | number;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | number | null;
  entity_id?: string | number | null;
  entity_type?: string | null;
  userEmail?: string | null;
  user_email?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

export type DashboardActivityProps = {
  vehicles?: ActivityVehicle[];
  adminActivities?: AdminActivity[];
  userRole?: 'admin' | 'user' | string | null;
  maxItems?: number;
  onOpenVehicle?: (vehicleId: string) => void;
};

const styles = `
  .ac-activity { overflow: hidden; }
  .ac-activity__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border);
  }
  .ac-activity h2 { font-size: 15px; }
  .ac-activity__head span { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .ac-activity__list { max-height: 330px; overflow-y: auto; }
  .ac-activity__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 16px;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    text-align: left;
  }
  .ac-activity__item:last-child { border-bottom: 0; }
  button.ac-activity__item { cursor: pointer; }
  button.ac-activity__item:hover { background: var(--panel2); }
  button.ac-activity__item:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
  .ac-activity__marker { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 50%; background: var(--teal); }
  .ac-activity__marker--audit { background: var(--blue); }
  .ac-activity__copy { min-width: 0; flex: 1; display: grid; gap: 3px; }
  .ac-activity__copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .ac-activity__copy small { color: var(--text-faint); font-size: 10px; }
  .ac-activity__time { color: var(--text-dim); font: 10px 'JetBrains Mono', monospace; white-space: nowrap; }
  .ac-activity__empty { padding: 28px 16px; color: var(--text-faint); font-size: 12px; text-align: center; }
  @media (max-width: 480px) {
    .ac-activity__time { display: none; }
  }
`;

function timestamp(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatTime(value?: string | null) {
  const parsed = timestamp(value);
  if (parsed === null) return 'Waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(parsed);
}

export default function DashboardActivity({
  vehicles = [],
  adminActivities = [],
  userRole,
  maxItems = 6,
  onOpenVehicle,
}: DashboardActivityProps) {
  const safeMaxItems = Math.max(1, maxItems);
  const canSeeAudit = userRole === 'admin';

  const vehicleItems = useMemo(() => {
    return vehicles
      .map((vehicle, index) => {
        const historyDate = vehicle.serviceHistory?.[0]?.tanggal || null;
        const activityTime = timestamp(vehicle.updatedAt) ?? timestamp(vehicle.createdAt) ?? timestamp(historyDate);
        return { vehicle, index, activityTime };
      })
      .sort((a, b) => {
        if (a.activityTime === null && b.activityTime === null) return a.index - b.index;
        if (a.activityTime === null) return 1;
        if (b.activityTime === null) return -1;
        return b.activityTime - a.activityTime;
      })
      .slice(0, safeMaxItems);
  }, [safeMaxItems, vehicles]);

  const auditItems = useMemo(() => {
    if (!canSeeAudit) return [];
    return adminActivities.slice(0, Math.max(0, safeMaxItems - vehicleItems.length));
  }, [adminActivities, canSeeAudit, safeMaxItems, vehicleItems.length]);

  const hasContent = vehicleItems.length > 0 || auditItems.length > 0;

  return (
    <>
      <style>{styles}</style>
      <section className="panel-box ac-activity" aria-labelledby="dashboard-activity-title">
        <div className="ac-activity__head">
          <h2 id="dashboard-activity-title">Aktivitas terbaru</h2>
          <span>{canSeeAudit ? 'Armada & admin' : 'Armada'}</span>
        </div>
        <div className="ac-activity__list">
          {!hasContent ? (
            <div className="ac-activity__empty">Belum ada aktivitas untuk ditampilkan.</div>
          ) : (
            <>
              {vehicleItems.map(({ vehicle, activityTime }) => {
                const label = vehicle.plat || vehicle.merk || 'Kendaraan';
                const content = (
                  <>
                    <span className="ac-activity__marker" aria-hidden="true" />
                    <span className="ac-activity__copy">
                      <strong>{label}</strong>
                      <small>{vehicle.merk || 'Data kendaraan'} diperbarui</small>
                    </span>
                    <time className="ac-activity__time" dateTime={vehicle.updatedAt || vehicle.createdAt || undefined}>
                      {activityTime === null ? 'Terbaru' : formatTime(new Date(activityTime).toISOString())}
                    </time>
                  </>
                );
                return onOpenVehicle ? (
                  <button type="button" className="ac-activity__item" key={`vehicle-${vehicle.id}`} onClick={() => onOpenVehicle(vehicle.id)}>
                    {content}
                  </button>
                ) : (
                  <div className="ac-activity__item" key={`vehicle-${vehicle.id}`}>{content}</div>
                );
              })}

              {auditItems.map((activity) => {
                const entityType = activity.entityType || activity.entity_type || 'sistem';
                const entityId = activity.entityId ?? activity.entity_id;
                const userEmail = activity.userEmail || activity.user_email;
                const createdAt = activity.createdAt || activity.created_at;
                return (
                  <div className="ac-activity__item" key={`audit-${activity.id}`}>
                    <span className="ac-activity__marker ac-activity__marker--audit" aria-hidden="true" />
                    <span className="ac-activity__copy">
                      <strong>{activity.action || 'Aktivitas admin'}</strong>
                      <small>{entityType}{entityId ? ` · ${entityId}` : ''}{userEmail ? ` · ${userEmail}` : ''}</small>
                    </span>
                    <time className="ac-activity__time" dateTime={createdAt || undefined}>{formatTime(createdAt)}</time>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    </>
  );
}
