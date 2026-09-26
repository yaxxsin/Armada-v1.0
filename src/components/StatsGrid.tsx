type StatsGridProps = {
  total: number;
  overdue: number;
  dueSoon: number;
  safe: number;
  locationCount?: number;
};

function StatIcon({ type }: { type: 'total' | 'alert' | 'warn' | 'ok' | 'location' }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (type === 'alert') return <svg {...common}><path d="M10.3 4.4 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
  if (type === 'warn') return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>;
  if (type === 'ok') return <svg {...common}><path d="M20 11.2V12a8 8 0 1 1-4.7-7.3" /><path d="m8.5 12 2.2 2.2L20 5" /></svg>;
  if (type === 'location') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  return <svg {...common}><path d="M4 17h16M6 17V9h3v8M11 17V5h3v12M16 17v-4h3v4" /></svg>;
}

export default function StatsGrid({ total, overdue, dueSoon, safe, locationCount = 0 }: StatsGridProps) {
  return (
    <div className="stats stats--overview" aria-label="Ringkasan kondisi armada">
      <article className="stat">
        <div className="stat__top"><span className="stat__icon"><StatIcon type="total" /></span><span className="stat__context">Armada</span></div>
        <div className="num mono">{total}</div><div className="lbl">Total kendaraan</div><div className="hint">terdaftar di semua lokasi</div>
      </article>
      <article className="stat alert">
        <div className="stat__top"><span className="stat__icon"><StatIcon type="alert" /></span><span className="stat__context">Prioritas</span></div>
        <div className="num mono">{overdue}</div><div className="lbl">Terlambat</div><div className="hint">perlu ditindaklanjuti</div>
      </article>
      <article className="stat warn">
        <div className="stat__top"><span className="stat__icon"><StatIcon type="warn" /></span><span className="stat__context">30 hari</span></div>
        <div className="num mono">{dueSoon}</div><div className="lbl">Perlu perhatian</div><div className="hint">jatuh tempo dekat</div>
      </article>
      <article className="stat ok">
        <div className="stat__top"><span className="stat__icon"><StatIcon type="ok" /></span><span className="stat__context">Verified</span></div>
        <div className="num mono">{safe}</div><div className="lbl">Kondisi aman</div><div className="hint">dokumen valid</div>
      </article>
      <article className="stat location">
        <div className="stat__top"><span className="stat__icon"><StatIcon type="location" /></span><span className="stat__context">Coverage</span></div>
        <div className="num mono">{locationCount}</div><div className="lbl">Lokasi aktif</div><div className="hint">area yang terpantau</div>
      </article>
    </div>
  );
}
