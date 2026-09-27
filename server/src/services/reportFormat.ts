// Pure formatting helpers shared by the report service and the renderers.
// Kept free of database imports so the renderers can be unit tested offline.

const STATUS_TEXT = {
  ok: 'Aman',
  amber: 'Perlu Perhatian',
  red: 'Terlambat',
};

const COMPLIANCE_TEXT = {
  ok: 'Aman',
  amber: 'Segera',
  red: 'Terlambat',
  none: 'Belum Ada Data',
};

export function statusText(status) {
  return STATUS_TEXT[status] || STATUS_TEXT.ok;
}

export function complianceText(status, days) {
  if (days === null || days === undefined) return COMPLIANCE_TEXT.none;
  return COMPLIANCE_TEXT[status] || COMPLIANCE_TEXT.ok;
}

export function daysLabel(days) {
  if (days === null || days === undefined) return '';
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`;
  if (days === 0) return 'Jatuh tempo hari ini';
  return `${days} hari lagi`;
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('id-ID');
}

// The report is labelled WIB, so every instant is rendered in this zone
// explicitly instead of inheriting the timezone of whatever machine happens to
// run the server. Without this the printed export time drifts from the real one.
const REPORT_TIME_ZONE = 'Asia/Jakarta';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calendar date of a date-only value (a Postgres DATE column, which the driver
 * hands over as local midnight). Local calendar parts are used on purpose:
 * toISOString() would shift the day by one whenever the server is not on UTC.
 */
export function formatDate(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = toDate(value);
  if (!date) return '-';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Calendar date of a real instant, resolved in the report timezone. */
export function formatInstantDate(value) {
  const date = toDate(value);
  if (!date) return '-';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatTimestamp(value) {
  const date = toDate(value);
  if (!date) return '-';
  const day = date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: REPORT_TIME_ZONE,
  });
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: REPORT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => clock.find((part) => part.type === type)?.value ?? '';
  // en-GB renders midnight as "24" in some ICU builds; normalise to "00".
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${day} ${hour}.${get('minute')} WIB`;
}
