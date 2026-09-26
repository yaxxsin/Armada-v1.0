import type { CSSProperties } from 'react';

type FleetStatusPanelProps = {
  total: number;
  safe: number;
  dueSoon: number;
  overdue: number;
  onViewFleet?: () => void;
};

function StatusIcon({ status }: { status: 'safe' | 'attention' | 'delayed' | 'untracked' }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (status === 'safe') return <svg {...common}><path d="M12 3a9 9 0 1 0 9 9" /><path d="m8 12 2.6 2.6L20 5" /></svg>;
  if (status === 'attention') return <svg {...common}><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z" /><path d="M12 9v4M12 16h.01" /></svg>;
  if (status === 'delayed') return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></svg>;
}

export default function FleetStatusPanel({ total, safe, dueSoon, overdue, onViewFleet }: FleetStatusPanelProps) {
  const untracked = Math.max(0, total - safe - dueSoon - overdue);
  const rows = [
    { key: 'safe', label: 'Dalam pantauan', value: safe, tone: 'safe' as const },
    { key: 'attention', label: 'Perlu perhatian', value: dueSoon, tone: 'attention' as const },
    { key: 'delayed', label: 'Terlambat', value: overdue, tone: 'delayed' as const },
    { key: 'untracked', label: 'Belum diperiksa', value: untracked, tone: 'untracked' as const },
  ];
  const healthyPercent = total > 0 ? Math.round((safe / total) * 100) : 0;

  return (
    <section className="panel-box fleet-status" aria-labelledby="fleet-status-title">
      <div className="fleet-status__head">
        <div>
          <span className="panel-kicker">Ringkasan_armada</span>
          <h2 id="fleet-status-title">Ringkasan Status Kendaraan</h2>
        </div>
        <span className="fleet-status__total">{total}</span>
      </div>
      <div className="fleet-status__list">
        {rows.map((row) => (
          <div className="fleet-status__row" key={row.key}>
            <StatusIcon status={row.tone} />
            <span className="fleet-status__label">{row.label}</span>
            <strong>{row.value}</strong>
            <span className="fleet-status__bar"><i className={`fleet-status__bar-fill fleet-status__bar-fill--${row.tone}`} style={{ width: `${total ? Math.min(100, (row.value / total) * 100) : 0}%` }} /></span>
          </div>
        ))}
      </div>
      <div className="fleet-status__foot">
        <div className="fleet-status__ring" style={{ '--ring-progress': `${healthyPercent * 3.6}deg` } as CSSProperties}><strong>{healthyPercent}%</strong><span>aman</span></div>
        <div><strong>{safe} dari {total} kendaraan</strong><small>terverifikasi aman</small></div>
        {onViewFleet && <button type="button" className="fleet-status__link" onClick={onViewFleet}>Lihat detail <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>}
      </div>
    </section>
  );
}
