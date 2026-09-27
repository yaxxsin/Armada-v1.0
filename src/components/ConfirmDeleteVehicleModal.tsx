import { useState } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

type ConfirmDeleteVehicleModalProps = {
  plat: string;
  /** Jumlah data turunan yang ikut terhapus, ditampilkan agar tidak ada kejutan. */
  serviceCount: number;
  photoCount: number;
  odometerCount: number;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

/**
 * Konfirmasi hapus kendaraan.
 *
 * `ON DELETE CASCADE` membuat satu hapus menghilangkan foto, seluruh riwayat
 * servis, dan semua pembacaan odometer tanpa jalan kembali. Karena itu tombol
 * hapus hanya aktif setelah nomor plat diketik ulang persis, dan daftar
 * Losses yang akan hilang ditampilkan terbuka.
 */
export default function ConfirmDeleteVehicleModal({
  plat,
  serviceCount,
  photoCount,
  odometerCount,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteVehicleModalProps) {
  const dialogRef = useDialogFocus(true);
  const [typed, setTyped] = useState('');
  // Tanpa plat, tidak ada yang bisa diketik ulang, jadi konfirmasi diabaikan.
  const target = plat.trim();
  const matches = target.length > 0 && typed.trim().toUpperCase() === target.toUpperCase();

  const losses = [
    photoCount > 0 ? `${photoCount} foto` : null,
    serviceCount > 0 ? `${serviceCount} baris riwayat servis` : null,
    odometerCount > 0 ? `${odometerCount} pembacaan odometer` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="overlay"
      onClick={(event) => !busy && event.target === event.currentTarget && onCancel()}
    >
      <div
        ref={dialogRef}
        className="modal confirm-delete"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">TINDAKAN PERMANEN</div>
            <h2 id="confirm-delete-title">Hapus kendaraan ini?</h2>
          </div>
          <button
            type="button"
            className="close-x"
            onClick={onCancel}
            disabled={busy}
            aria-label="Batal hapus kendaraan"
          >
            ×
          </button>
        </div>

        <p className="note" id="confirm-delete-desc">
          Kendaraan <strong>{target || 'tanpa plat'}</strong> akan dihapus permanen dan
          tidak dapat dikembalikan.
        </p>

        {losses.length > 0 && (
          <div className="confirm-delete__losses" role="list">
            <div className="confirm-delete__losses-label">Data berikut ikut terhapus:</div>
            {losses.map((item) => (
              <div key={item} role="listitem" className="confirm-delete__loss">
                {item}
              </div>
            ))}
          </div>
        )}

        {target && (
          <label className="confirm-delete__label" htmlFor="confirm-delete-input">
            Ketik nomor plat <code>{target}</code> untuk melanjutkan
          </label>
        )}
        <input
          id="confirm-delete-input"
          className="input"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches && !busy) onConfirm();
          }}
          disabled={busy}
          autoComplete="off"
          autoFocus
          spellCheck={false}
          placeholder={target}
        />

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn danger"
            onClick={() => onConfirm()}
            disabled={!matches || busy}
          >
            Hapus permanen
          </button>
          <button type="button" className="btn secondary" onClick={onCancel} disabled={busy}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
