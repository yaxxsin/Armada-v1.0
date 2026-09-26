import { api } from '../api/client';
import {
  DEFAULTS,
  computeVehicle,
  buildReminders,
  statusLabel,
  worstStatus,
  latestHistory,
  daysBetween,
} from '../../shared/fleet.ts';

// ─── Utility functions ───────────────────────────────
export function uid() {
  return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Export helpers ───────────────────────────────────
export function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function shareWhatsApp(fleet) {
  const reminders = buildReminders(fleet).slice(0, 15);
  if (reminders.length === 0) {
    alert('Tidak ada pengingat aktif untuk dibagikan.');
    return;
  }
  let text = 'Ringkasan pengingat Armada Control 104 Group:\n\n';
  reminders.forEach((r) => {
    const tag = r.status === 'red' ? '[TERLAMBAT]' : '[SEGERA]';
    text +=
      tag + ' ' + r.plat + ' - ' + r.msg + ': ' +
      (r.days < 0 ? Math.abs(r.days) + ' hari lewat' : r.days + ' hari lagi') +
      '\n';
  });
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

export async function getFullFleet() {
  const data = await api('/reports/fleet?scope=all');
  return Array.isArray(data.vehicles) ? data.vehicles : [];
}

// ─── Report export ────────────────────────────────────
export type ReportFilters = {
  text?: string;
  lokasi?: string;
  scope?: string;
  sort?: string;
};

export function buildReportQuery(filters: ReportFilters) {
  const params = new URLSearchParams();
  if (filters.text) params.set('text', filters.text);
  if (filters.lokasi && filters.lokasi !== 'all') params.set('lokasi', filters.lokasi);
  if (filters.scope && filters.scope !== 'all') params.set('scope', filters.scope);
  if (filters.sort && filters.sort !== 'urgency') params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1] : fallback;
}

export async function exportReport(
  format: 'pdf' | 'xlsx' | 'csv',
  filters: ReportFilters = {}
): Promise<string> {
  const response = await fetch(`/api/reports/fleet/export?format=${format}${buildReportQuery(filters)}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Gagal mengekspor laporan ${format.toUpperCase()}.`);
  }
  const fallback = `laporan-armada.${format}`;
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallback);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

// ─── Image resize ────────────────────────────────────
export function resizeImageFile(file: File, options: { maxWidth?: number; quality?: number } = {}): Promise<string> {
  const maxWidth = options.maxWidth ?? 480;
  const quality = options.quality ?? 0.6;
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      if (typeof reader.result !== 'string') {
        reject(new Error('File gambar tidak dapat dibaca.'));
        return;
      }
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PHOTO_MAX_CHARS = 480_000;
const PHOTO_TOTAL_MAX_CHARS = 1_900_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, width: number): string {
  const scale = Math.min(1, width / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.7);
}

// Re-encode data-URL photos until each fits the server per-photo limit and the
// whole set fits the request body budget, so saving never fails on 413.
export async function shrinkPhotoPayload(photos: string[]): Promise<string[]> {
  const result: string[] = [];
  for (const photo of photos) {
    let current = photo;
    if (current.length > PHOTO_MAX_CHARS) {
      const img = await loadImage(current);
      for (const width of [960, 800, 640, 480, 360]) {
        current = drawScaled(img, width);
        if (current.length <= PHOTO_MAX_CHARS) break;
      }
    }
    result.push(current);
  }

  let total = result.reduce((sum, item) => sum + item.length, 0);
  while (total > PHOTO_TOTAL_MAX_CHARS && result.length > 0) {
    const lastIndex = result.length - 1;
    const img = await loadImage(result[lastIndex]);
    result[lastIndex] = drawScaled(img, 400);
    total = result.reduce((sum, item) => sum + item.length, 0);
    if (result[lastIndex].length > PHOTO_MAX_CHARS) {
      result.splice(lastIndex, 1);
      total = result.reduce((sum, item) => sum + item.length, 0);
    }
  }
  return result;
}

export { DEFAULTS, computeVehicle, buildReminders, statusLabel, worstStatus, latestHistory, daysBetween };