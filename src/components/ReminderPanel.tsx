import { useMemo, useState } from 'react';

type Reminder = {
  vehicleId?: string | null;
  plat?: string | null;
  status?: string | null;
  msg?: string | null;
  days?: number | null;
  km?: number | null;
};

type ReminderVehicle = {
  id: string;
  plat?: string | null;
  merk?: string | null;
  lokasi?: string | null;
};

type ReminderPanelProps = {
  reminders?: Reminder[];
  vehicles?: ReminderVehicle[];
  onOpenVehicle?: (vehicleId: string) => void;
};

export default function ReminderPanel({ reminders = [], vehicles = [], onOpenVehicle }: ReminderPanelProps) {
  const [filter, setFilter] = useState('all');
  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);

  const daysText = (r: Reminder) => {
    if (r.msg === 'Servis' && r.km != null) {
      const kmTxt = (r.km < 0 ? 'lewat ' + Math.abs(r.km) : r.km) + ' km';
      if (r.days === null || r.days === undefined) return kmTxt;
      const dTxt = r.days < 0 ? Math.abs(r.days) + ' hari lewat' : r.days + ' hari lagi';
      return kmTxt + ' / ' + dTxt;
    }
    if (r.days == null) return '-';
    return r.days < 0 ? Math.abs(r.days) + ' hari lewat' : r.days + ' hari lagi';
  };

  const counts = useMemo(() => ({
    all: reminders.length,
    overdue: reminders.filter((r) => r.status === 'red').length,
    seven: reminders.filter((r) => r.days != null && r.days >= 0 && r.days <= 7).length,
    thirty: reminders.filter((r) => r.days != null && r.days >= 0 && r.days <= 30).length,
  }), [reminders]);

  const visibleReminders = useMemo(() => {
    if (filter === 'overdue') return reminders.filter((r) => r.status === 'red');
    if (filter === 'seven') return reminders.filter((r) => r.days != null && r.days >= 0 && r.days <= 7);
    if (filter === 'thirty') return reminders.filter((r) => r.days != null && r.days >= 0 && r.days <= 30);
    return reminders;
  }, [filter, reminders]);

  const filters = [
    { key: 'all', label: 'Semua', count: counts.all },
    { key: 'overdue', label: 'Terlambat', count: counts.overdue },
    { key: 'seven', label: '7 Hari', count: counts.seven },
    { key: 'thirty', label: '30 Hari', count: counts.thirty },
  ];

  return (
    <div className="panel-box reminder-panel">
      <div className="head">
        <div className="reminder-panel__heading">
          <strong>Antrean kepatuhan</strong>
          <small>Urut berdasarkan tindakan terdekat</small>
        </div>
        <span className="reminder-panel__count">{reminders.length} item</span>
      </div>
      <div className="reminder-filter" aria-label="Filter pengingat">
        {filters.map((item) => (
          <button
            type="button"
            className={`reminder-filter__item${filter === item.key ? ' active' : ''}`}
            key={item.key}
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
          >
            {item.label} <span>{item.count}</span>
          </button>
        ))}
      </div>
      <div className="list rem-task-list">
        {visibleReminders.length === 0 ? (
          <div className="empty-rem">
            {filter === 'all'
              ? 'Tidak ada pengingat aktif. Semua kendaraan dalam kondisi aman.'
              : 'Tidak ada pengingat pada rentang ini.'}
          </div>
        ) : (
          visibleReminders.map((r) => {
            const vehicle = r.vehicleId ? vehicleById.get(r.vehicleId) : null;
            const canOpen = Boolean(r.vehicleId && onOpenVehicle);
            const row = (
              <>
                <span className={`dot ${r.status || 'amber'}`}></span>
                <span className="rem-task__identity">
                  <strong className="plat">{r.plat || 'Tanpa plat'}</strong>
                  <small>{vehicle?.lokasi || vehicle?.merk || 'Lokasi belum dicatat'}</small>
                </span>
                <span className="msg">{r.msg || 'Dokumen'}</span>
                <span className="days">{daysText(r)}</span>
                {canOpen && <span className="rem-task__action">Buka</span>}
              </>
            );
            return canOpen ? (
              <button
                type="button"
                className={`rem-item rem-task ${r.status || 'amber'}`}
                key={`${r.vehicleId || r.plat}-${r.msg}`}
                onClick={() => {
                  if (r.vehicleId) onOpenVehicle(r.vehicleId);
                }}
              >
                {row}
              </button>
            ) : (
              <div className={`rem-item rem-task ${r.status || 'amber'}`} key={`${r.vehicleId || r.plat}-${r.msg}`}>
                {row}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
