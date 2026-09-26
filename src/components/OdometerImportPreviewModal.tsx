import { useMemo } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

type OdometerReading = {
  plat: string;
  tanggal: string | null;
  odometerKm: number;
  sumber: string;
  catatan: string;
  isCorrection: boolean;
  correctionReason: string;
};

type OdometerImportPreviewModalProps = {
  readings: OdometerReading[];
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (readings: OdometerReading[]) => Promise<void> | void;
};

export default function OdometerImportPreviewModal({ readings, busy = false, error, onCancel, onConfirm }: OdometerImportPreviewModalProps) {
  const dialogRef = useDialogFocus(true);
  const validRows = useMemo(() => readings.filter((row) => row.plat && row.tanggal && Number.isFinite(row.odometerKm) && (!row.isCorrection || row.correctionReason)), [readings]);
  const invalidCount = readings.length - validRows.length;

  return (
    <div className="overlay" onClick={(event) => !busy && event.target === event.currentTarget && onCancel()}>
      <div ref={dialogRef} className="modal odometer-preview" role="dialog" aria-modal="true" aria-labelledby="odometer-preview-title" tabIndex={-1}>
        <div className="modal-head">
          <div><div className="eyebrow">IMPORT DATA</div><h2 id="odometer-preview-title">Pratinjau odometer</h2></div>
          <button type="button" className="close-x" onClick={onCancel} disabled={busy} aria-label="Batal import odometer">×</button>
        </div>
        <p className="note">File akan disimpan sebagai riwayat pembacaan. Odometer turun hanya dapat diimpor sebagai koreksi dengan alasan.</p>
        <div className="import-summary">
          <div className="import-summary__item"><strong>{readings.length}</strong><span>Total baris</span></div>
          <div className="import-summary__item ok"><strong>{validRows.length}</strong><span>Siap diimpor</span></div>
          <div className="import-summary__item alert"><strong>{invalidCount}</strong><span>Perlu diperiksa</span></div>
        </div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <div className="import-table-wrap odometer-table-wrap">
          <table className="import-table">
            <thead><tr><th>Plat</th><th>Tanggal</th><th>Odometer</th><th>Sumber</th><th>Catatan</th><th>Status</th></tr></thead>
            <tbody>
              {readings.map((reading, index) => {
                const valid = reading.plat && reading.tanggal && Number.isFinite(reading.odometerKm) && (!reading.isCorrection || reading.correctionReason);
                return <tr key={`${reading.plat}-${reading.tanggal}-${index}`}>
                  <td className="mono">{reading.plat || '-'}</td>
                  <td>{reading.tanggal || '-'}</td>
                  <td className="mono">{Number.isFinite(reading.odometerKm) ? reading.odometerKm.toLocaleString('id-ID') : '-'}</td>
                  <td>{reading.sumber || 'Excel'}</td>
                  <td>{reading.catatan || (reading.isCorrection ? reading.correctionReason : '-')}</td>
                  <td><span className={`import-status ${valid ? 'ready' : 'invalid'}`}>{valid ? 'Siap diimpor' : 'Periksa data'}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Batal</button>
          <button type="button" className="btn" onClick={() => onConfirm(validRows)} disabled={busy || validRows.length === 0}>{busy ? 'Menyimpan…' : `Impor ${validRows.length} pembacaan`}</button>
        </div>
      </div>
    </div>
  );
}
