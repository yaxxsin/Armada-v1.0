import { useEffect, useRef, useState } from 'react';

type NotificationBellProps = {
  reminders?: Array<{ status?: string }>;
  notifGranted?: boolean;
  onToggleNotif?: () => void;
  onShareWhatsApp?: () => void;
};

export default function NotificationBell({
  reminders = [],
  notifGranted = false,
  onToggleNotif,
  onShareWhatsApp,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const redCount = reminders.filter((reminder) => reminder.status === 'red').length;
  const badge = reminders.length;

  useEffect(() => {
    if (!open) return;
    const onDocumentPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocumentPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        type="button"
        className="bell-btn"
        onClick={() => setOpen((current) => !current)}
        title="Notifikasi &amp; pengaturan"
        aria-label={badge > 0 ? `Buka notifikasi, ${badge} pengingat${redCount > 0 ? `, ${redCount} terlambat` : ''}` : 'Buka notifikasi'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-settings-popover"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badge > 0 && <span className={`bell-badge ${redCount > 0 ? 'red' : 'amber'}`}>{badge > 99 ? '99+' : badge}</span>}
      </button>

      {open && (
        <div id="notification-settings-popover" className="bell-popover" role="dialog" aria-label="Notifikasi dan pengaturan">
          <div className="bell-pop-head">
            <span>Notifikasi &amp; Pengaturan</span>
            <button type="button" className="close-x" onClick={() => setOpen(false)} aria-label="Tutup notifikasi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          </div>
          <div className="bell-actions">
            {onToggleNotif && (
              <button type="button" className="btn secondary small" onClick={onToggleNotif} disabled={notifGranted}>
                {notifGranted ? 'Notifikasi browser diizinkan' : 'Aktifkan notifikasi browser'}
              </button>
            )}
            {onShareWhatsApp && (
              <button type="button" className="btn secondary small" onClick={onShareWhatsApp}>
                Kirim ringkasan ke WhatsApp
              </button>
            )}
            <div className="note">
              Notifikasi browser hanya muncul saat tab ini dibuka. Gunakan tombol WhatsApp untuk mengirim
              ringkasan pengingat secara manual.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
