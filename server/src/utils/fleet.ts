// Standalone copy of shared/fleet.ts for server-side use.
// (Docker backend context doesn't include ../shared/)

export const DEFAULTS = { intervalKm: 5000, intervalBulan: 6 };

export function daysBetween(target) {
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
}

export function statusFromDays(days, warnThreshold) {
  if (days === null) return 'ok';
  if (days < 0) return 'red';
  if (days <= warnThreshold) return 'amber';
  return 'ok';
}

export function worstStatus(...statuses) {
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('amber')) return 'amber';
  return 'ok';
}

export function latestHistory(v) {
  const hist = (v.serviceHistory || []).filter((h) => h.tanggal);
  if (hist.length === 0) return null;
  return hist.reduce((a, b) => (a.tanggal > b.tanggal ? a : b));
}

function addMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
}

export function computeVehicle(v) {
  const defKm = v.intervalKm || DEFAULTS.intervalKm;
  const defBulan = v.intervalBulan || DEFAULTS.intervalBulan;

  const pajakTahunanDays = daysBetween(v.pajakTahunanBerlaku);
  const pajakTahunanStatus = statusFromDays(pajakTahunanDays, 30);
  const pajak5TahunanDays = daysBetween(v.pajak5TahunanBerlaku);
  const pajak5TahunanStatus = statusFromDays(pajak5TahunanDays, 60);
  const keurDays = daysBetween(v.keurBerlaku);
  const keurStatus = statusFromDays(keurDays, 30);

  const last = latestHistory(v);
  const nextServiceDate =
    last && last.tanggal ? addMonths(last.tanggal, defBulan) : null;
  const serviceDaysDate = nextServiceDate ? daysBetween(nextServiceDate) : null;
  const nextServiceKm =
    last && last.km !== '' && last.km != null
      ? Number(last.km) + Number(defKm)
      : null;
  const kmLeft =
    nextServiceKm != null && v.kmSekarang !== '' && v.kmSekarang != null
      ? nextServiceKm - Number(v.kmSekarang)
      : null;

  let serviceStatus = 'ok';
  if (
    (serviceDaysDate !== null && serviceDaysDate < 0) ||
    (kmLeft !== null && kmLeft <= 0)
  )
    serviceStatus = 'red';
  else if (
    (serviceDaysDate !== null && serviceDaysDate <= 14) ||
    (kmLeft !== null && kmLeft <= 500)
  )
    serviceStatus = 'amber';

  let serviceMsg;
  if (kmLeft === null && serviceDaysDate === null) {
    serviceMsg = '-';
  } else {
    const parts = [];
    if (kmLeft !== null)
      parts.push(
        (kmLeft < 0 ? 'lewat ' + Math.abs(kmLeft) : kmLeft) + ' km'
      );
    if (serviceDaysDate !== null)
      parts.push(statusLabel(serviceStatus, serviceDaysDate));
    serviceMsg = parts.join(' / ');
  }

  return {
    pajakTahunanDays,
    pajakTahunanStatus,
    pajak5TahunanDays,
    pajak5TahunanStatus,
    keurDays,
    keurStatus,
    nextServiceDate,
    nextServiceKm,
    kmLeft,
    serviceDaysDate,
    serviceStatus,
    serviceMsg,
    lastService: last,
  };
}

export function statusLabel(status, days) {
  if (days === null) return '-';
  if (status === 'red') return 'Terlambat ' + Math.abs(days) + ' hari';
  return days + ' hari lagi';
}

export function overallStatus(v) {
  const c = computeVehicle(v);
  return worstStatus(
    c.pajakTahunanStatus,
    c.pajak5TahunanStatus,
    c.keurStatus,
    c.serviceStatus
  );
}

export function buildReminders(vehicles) {
  const items = [];
  vehicles.forEach((v) => {
    const c = computeVehicle(v);
    if (c.pajakTahunanStatus !== 'ok')
      items.push({
        vehicleId: v.id,
        plat: v.plat,
        status: c.pajakTahunanStatus,
        msg: 'Pajak tahunan',
        days: c.pajakTahunanDays,
        sort: c.pajakTahunanDays,
      });
    if (c.pajak5TahunanStatus !== 'ok')
      items.push({
        vehicleId: v.id,
        plat: v.plat,
        status: c.pajak5TahunanStatus,
        msg: 'Pajak 5 tahun',
        days: c.pajak5TahunanDays,
        sort: c.pajak5TahunanDays,
      });
    if (c.keurStatus !== 'ok')
      items.push({
        vehicleId: v.id,
        plat: v.plat,
        status: c.keurStatus,
        msg: 'Keur',
        days: c.keurDays,
        sort: c.keurDays,
      });
    if (c.serviceStatus !== 'ok')
      items.push({
        vehicleId: v.id,
        plat: v.plat,
        status: c.serviceStatus,
        msg: 'Servis',
        days: c.serviceDaysDate,
        km: c.kmLeft,
        sort:
          c.serviceDaysDate !== null
            ? c.serviceDaysDate
            : c.kmLeft || 0,
      });
  });
  items.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
  return items;
}