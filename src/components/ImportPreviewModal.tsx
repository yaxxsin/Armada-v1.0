import { useEffect, useMemo, useState } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

export type ImportPreviewVehicle = {
  merk?: string | null;
  plat?: string | null;
  tahun?: string | number | null;
  lokasi?: string | null;
  pic?: string | null;
  [key: string]: unknown;
};

type ImportPreviewModalProps = {
  vehicles: ImportPreviewVehicle[];
  existingPlates?: string[];
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (vehicles: ImportPreviewVehicle[]) => Promise<void> | void;
};

export default function ImportPreviewModal({
  vehicles,
  existingPlates = [],
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: ImportPreviewModalProps) {
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useDialogFocus(true);

  useEffect(() => {
    if (busy) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  const existing = useMemo(
    () => new Set(existingPlates.map((plate) => String(plate || '').trim().toUpperCase())),
    [existingPlates]
  );

  const rows = useMemo(() => {
    const seen = new Set<string>();
    return vehicles.map((vehicle, index) => {
      const plat = String(vehicle.plat || '').trim().toUpperCase();
      const merk = String(vehicle.merk || '').trim();
      return {
        ...vehicle,
        __row: index + 1,
        __plat: plat,
        __merk: merk,
        __valid: Boolean(plat && merk),
        __duplicate: existing.has(plat) || seen.has(plat),
        __newDuplicate: seen.has(plat),
      };
    });
  }, [existing, vehicles]);

  const validRows = rows.filter((row) => row.__valid && !row.__duplicate);
  const invalidRows = rows.filter((row) => !row.__valid);
  const duplicateRows = rows.filter((row) => row.__valid && row.__duplicate);
  const visibleRows = showAll ? rows : rows.slice(0, 50);

  return (
    <div className="overlay" onClick={(event) => !busy && event.target === event.currentTarget && onCancel()}>
      <div ref={dialogRef} className="modal import-preview" role="dialog" aria-modal="true" aria-labelledby="import-preview-title" tabIndex={-1}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">IMPORT DATA</div>
            <h2 id="import-preview-title">Pratinjau import armada</h2>
          </div>
          <button type="button" className="close-x" onClick={onCancel} disabled={busy} aria-label="Batal import">
            &times;
          </button>
        </div>

        <p className="note" style={{ marginBottom: 14 }}>
          Data dari file Excel yang sudah termuat berdasarkan plat akan ditandai dan dilewati. Server tetap akan melewati plat yang sudah terdaftar. Import bersifat menambahkan, bukan menghapus data lama.
        </p>

        <div className="import-summary">
          <div className="import-summary__item"><strong>{rows.length}</strong><span>Total baris</span></div>
          <div className="import-summary__item ok"><strong>{validRows.length}</strong><span>Siap diimpor</span></div>
          <div className="import-summary__item warn"><strong>{duplicateRows.length}</strong><span>Duplikat</span></div>
          <div className="import-summary__item alert"><strong>{invalidRows.length}</strong><span>Tidak valid</span></div>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="import-table-wrap">
          <table className="import-table">
            <thead>
              <tr>
                <th>Baris</th>
                <th>Plat</th>
                <th>Merk</th>
                <th>Lokasi</th>
                <th>PIC</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.__row}-${row.__plat}`}>
                  <td className="mono">{row.__row}</td>
                  <td className="mono">{row.__plat || '-'}</td>
                  <td>{row.__merk || '-'}</td>
                  <td>{row.lokasi || '-'}</td>
                  <td>{row.pic || '-'}</td>
                  <td>
                    {!row.__valid ? (
                      <span className="import-status invalid">Data wajib tidak lengkap</span>
                    ) : row.__duplicate ? (
                      <span className="import-status duplicate">
                        {row.__newDuplicate ? 'Duplikat di file' : 'Sudah ada'}
                      </span>
                    ) : (
                      <span className="import-status ready">Siap diimpor</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 50 && (
          <button type="button" className="link-btn" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Tampilkan 50 baris pertama' : `Tampilkan semua ${rows.length} baris`}
          </button>
        )}

        <div className="modal-actions">
          <button type="button" className="btn ghost" data-dialog-autofocus onClick={onCancel} disabled={busy}>Batal</button>
          <button
            type="button"
            className="btn"
            onClick={() => onConfirm(validRows.map(({ __row, __plat, __merk, __valid, __duplicate, __newDuplicate, ...vehicle }) => vehicle))}
            disabled={busy || validRows.length === 0}
          >
            {busy ? 'Mengimpor…' : `Impor ${validRows.length} kendaraan`}
          </button>
        </div>
      </div>
    </div>
  );
}
