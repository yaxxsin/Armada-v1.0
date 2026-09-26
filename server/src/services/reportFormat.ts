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

export function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time} WIB`;
}
