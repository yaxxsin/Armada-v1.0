type FleetSummaryCardProps = {
  total: number;
  safe: number;
  dueSoon: number;
  overdue: number;
  locationCount: number;
};

export default function FleetSummaryCard({ total, safe, dueSoon, overdue, locationCount }: FleetSummaryCardProps) {
  const safePercent = total > 0 ? Math.round((safe / total) * 100) : 0;
  return (
    <section className="panel-box fleet-summary-card" aria-labelledby="fleet-summary-title">
      <div className="fleet-summary-card__head">
        <div>
          <h2 id="fleet-summary-title">Statistik Armada</h2>
          <p>Ringkasan kondisi saat ini</p>
        </div>
        <span>{locationCount} lokasi</span>
      </div>
      <div className="fleet-summary-card__hero">
        <strong>{total}</strong>
        <span>unit kendaraan terdaftar</span>
      </div>
      <div className="fleet-summary-card__metrics">
        <div><strong>{safe}</strong><span>Aman</span></div>
        <div><strong>{dueSoon}</strong><span>Perlu perhatian</span></div>
        <div><strong>{overdue}</strong><span>Terlambat</span></div>
      </div>
      <div className="fleet-summary-card__progress" aria-label={`${safePercent}% armada dalam kondisi aman`}>
        <span style={{ width: `${safePercent}%` }} />
      </div>
      <div className="fleet-summary-card__foot"><span>{safePercent}% kondisi aman</span><span>{locationCount} lokasi aktif</span></div>
    </section>
  );
}
