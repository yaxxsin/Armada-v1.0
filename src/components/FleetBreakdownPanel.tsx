type FleetBreakdownVehicle = {
  lokasi?: string | null;
};

type FleetBreakdownPanelProps = {
  vehicles?: FleetBreakdownVehicle[];
  total?: number;
};

export default function FleetBreakdownPanel({ vehicles = [], total = vehicles.length }: FleetBreakdownPanelProps) {
  const counts = new Map<string, number>();
  vehicles.forEach((vehicle) => {
    const location = vehicle.lokasi?.trim() || 'Belum ada lokasi';
    counts.set(location, (counts.get(location) || 0) + 1);
  });
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(...rows.map(([, count]) => count), 1);

  return (
    <section className="panel-box fleet-breakdown" aria-labelledby="fleet-breakdown-title">
      <div className="fleet-breakdown__head">
        <div><h2 id="fleet-breakdown-title">Distribusi Armada</h2><p>Jumlah kendaraan per lokasi</p></div>
        <span>{total} unit</span>
      </div>
      {rows.length === 0 ? (
        <div className="fleet-breakdown__empty">Belum ada lokasi untuk ditampilkan.</div>
      ) : (
        <div className="fleet-breakdown__chart">
          {rows.map(([location, count]) => (
            <div className="fleet-breakdown__row" key={location}>
              <span className="fleet-breakdown__label" title={location}>{location}</span>
              <span className="fleet-breakdown__track"><i style={{ width: `${(count / max) * 100}%` }} /></span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
