import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { computeVehicle, fmtDate, statusLabel, uid, DEFAULTS, resizeImageFile } from '../utils/helpers';
import { useDialogFocus } from '../hooks/useDialogFocus';

export default function VehicleDetailModal({
  vehicle,
  sessionRole,
  onClose,
  onEdit,
  onDelete,
  onAddHistory,
  onDeleteHistory,
}) {
  const v = vehicle;
  const c = computeVehicle(v);
  const hist = [...(v.serviceHistory || [])].sort((a, b) =>
    (b.tanggal || '').localeCompare(a.tanggal || '')
  );

  const [histForm, setHistForm] = useState({
    tanggal: '',
    km: '',
    jenis: '',
    biaya: '',
    bengkel: '',
    struk: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const dialogRef = useDialogFocus(true);
  const receiptDialogRef = useDialogFocus(Boolean(receiptPreview));

  const photos = [
    ...(Array.isArray(v.photos) ? v.photos : []),
    ...(v.foto ? [v.foto] : []),
  ].filter((src, index, all) => typeof src === 'string' && src && all.indexOf(src) === index).slice(0, 4);
  const safePhotoIndex = Math.min(activePhoto, Math.max(photos.length - 1, 0));

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, busy]);

  const handleHistChange = (key: keyof typeof histForm, value: string) => {
    setHistForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReceiptSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Struk harus berupa gambar.');
      event.target.value = '';
      return;
    }
    setError('');
    try {
      const resized = await resizeImageFile(file);
      setHistForm((current) => ({ ...current, struk: resized }));
      setReceiptName(file.name);
    } catch {
      setError('Gagal memproses foto struk. Coba file lain.');
    }
    event.target.value = '';
  };

  const handleAddHistory = async () => {
    setError('');
    if (!histForm.tanggal) {
      setError('Tanggal servis wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      await onAddHistory(v.id, {
        id: uid(),
        tanggal: histForm.tanggal,
        km: histForm.km,
        jenis: histForm.jenis.trim(),
        biaya: histForm.biaya,
        bengkel: histForm.bengkel.trim(),
        struk: histForm.struk,
      });
      setHistForm({ tanggal: '', km: '', jenis: '', biaya: '', bengkel: '', struk: '' });
      setReceiptName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah histori servis.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteHistory = async (historyId) => {
    setError('');
    if (!confirm('Hapus histori servis ini?')) return;
    setBusy(true);
    try {
      await onDeleteHistory(v.id, historyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus histori servis.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="overlay" onClick={(e) => !busy && e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-title" tabIndex={-1}>
        <div className="modal-head">
          <div>
            {v.lokasi && (
              <>
                <span
                  className="loc-tag"
                  style={{ float: 'none', marginBottom: '6px', display: 'inline-block' }}
                >
                  {v.lokasi}
                </span>
                <br />
              </>
            )}
            <span className="plate">{v.plat}</span>
            <h2 id="vehicle-detail-title" className="merk" style={{ marginTop: '8px' }}>
              {v.merk} {v.tahun ? '· ' + v.tahun : ''}
            </h2>
          </div>
          <button type="button" className="close-x" onClick={onClose} aria-label="Tutup dialog" disabled={busy}>
            &times;
          </button>
        </div>

        {photos.length > 0 && (
          <div className="vehicle-gallery">
            <img
              className="hero-photo"
              src={photos[safePhotoIndex]}
              alt={`${v.merk} foto ${safePhotoIndex + 1}`}
            />
            {photos.length > 1 && (
              <div className="gallery-strip" role="tablist" aria-label="Foto kendaraan">
                {photos.map((src, index) => (
                  <button
                    key={`${index}-${src.slice(-12)}`}
                    type="button"
                    role="tab"
                    aria-selected={index === safePhotoIndex}
                    aria-label={`Tampilkan foto ${index + 1}`}
                    className={`gallery-thumb${index === safePhotoIndex ? ' active' : ''}`}
                    onClick={() => setActivePhoto(index)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
            {photos.length > 1 && (
              <div className="gallery-nav">
                <button
                  type="button"
                  className="btn ghost tiny"
                  onClick={() => setActivePhoto((i) => (i - 1 + photos.length) % photos.length)}
                >
                  &larr; Sebelumnya
                </button>
                <span className="mono">
                  {safePhotoIndex + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  className="btn ghost tiny"
                  onClick={() => setActivePhoto((i) => (i + 1) % photos.length)}
                >
                  Berikutnya &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        <div className="detail-grid">
          <div className={`dblock ${c.pajakTahunanStatus}`}>
            <div className="t">Pajak tahunan</div>
            <div className="v">{fmtDate(v.pajakTahunanBerlaku)}</div>
            <div className="status">{statusLabel(c.pajakTahunanStatus, c.pajakTahunanDays)}</div>
          </div>
          <div className={`dblock ${c.pajak5TahunanStatus}`}>
            <div className="t">Pajak 5 tahun</div>
            <div className="v">{fmtDate(v.pajak5TahunanBerlaku)}</div>
            <div className="status">{statusLabel(c.pajak5TahunanStatus, c.pajak5TahunanDays)}</div>
          </div>
          <div className={`dblock ${c.keurStatus}`}>
            <div className="t">Keur</div>
            <div className="v">{fmtDate(v.keurBerlaku)}</div>
            <div className="status">{statusLabel(c.keurStatus, c.keurDays)}</div>
          </div>
          <div className={`dblock ${c.serviceStatus}`}>
            <div className="t">Servis berikutnya</div>
            <div className="v">
              {c.nextServiceKm
                ? 'KM ' + Number(c.nextServiceKm).toLocaleString('id-ID')
                : '-'}
              {c.nextServiceDate ? ' · ' + fmtDate(c.nextServiceDate) : ''}
            </div>
            <div className="status">{c.serviceMsg}</div>
          </div>
        </div>

        <div className="detail-row">
          <span className="k">Odometer sekarang</span>
          <span className="v">
            {v.kmSekarang
              ? Number(v.kmSekarang).toLocaleString('id-ID') + ' km'
              : '-'}
          </span>
        </div>
        <div className="detail-row">
          <span className="k">PIC kendaraan</span>
           <span className="v">{v.pic || '-'}</span>
         </div>
         <div className="detail-row">
           <span className="k">Target KM servis berikutnya</span>
          <span className="v">
            {c.nextServiceKm
              ? Number(c.nextServiceKm).toLocaleString('id-ID') + ' km'
              : '-'}
          </span>
        </div>
        <div className="detail-row">
          <span className="k">Interval servis</span>
          <span className="v">
            {v.intervalKm || DEFAULTS.intervalKm} km / {v.intervalBulan || DEFAULTS.intervalBulan}{' '}
            bulan
          </span>
        </div>
        {v.catatan && (
          <div className="detail-row">
            <span className="k">Catatan</span>
            <span className="v">{v.catatan}</span>
          </div>
        )}

        <div className="section-title">Riwayat servis</div>
        {hist.length === 0 ? (
          <div className="hist-empty">Belum ada riwayat servis.</div>
        ) : (
          <div className="hist-table-wrap">
            <table className="hist-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>KM</th>
                <th>Jenis</th>
                <th>Biaya</th>
                <th>Bengkel</th>
                <th>Struk service</th>
                {sessionRole === 'edit' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {hist.map((h) => (
                <tr key={h.id}>
                  <td>{fmtDate(h.tanggal)}</td>
                  <td>{h.km ? Number(h.km).toLocaleString('id-ID') : '-'}</td>
                  <td>{h.jenis || '-'}</td>
                  <td>{h.biaya ? 'Rp' + Number(h.biaya).toLocaleString('id-ID') : '-'}</td>
                  <td>{h.bengkel || '-'}</td>
                  <td>
                    {h.struk ? (
                      <a
                        className="receipt-link"
                        href={h.struk}
                        onClick={(event) => {
                          event.preventDefault();
                          setReceiptPreview(h.struk);
                        }}
                        aria-label={`Lihat foto struk ${fmtDate(h.tanggal)}`}
                      >
                        Lihat struk
                      </a>
                    ) : '-'}
                  </td>
                  {sessionRole === 'edit' && (
                    <td className="del">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => void handleDeleteHistory(h.id)}
                        aria-label={`Hapus servis ${fmtDate(h.tanggal)}`}
                         disabled={busy}
                      >
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}

        {sessionRole === 'edit' && (
          <div className="add-hist-row">
            <div className="field">
              <label htmlFor="history-date">Tanggal</label>
              <input
                id="history-date"
                type="date"
                value={histForm.tanggal}
                onChange={(e) => handleHistChange('tanggal', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="history-km">KM</label>
              <input
                id="history-km"
                className="mono"
                type="number"
                placeholder="50000"
                value={histForm.km}
                onChange={(e) => handleHistChange('km', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="history-type">Jenis</label>
              <input
                id="history-type"
                placeholder="Ganti oli"
                value={histForm.jenis}
                onChange={(e) => handleHistChange('jenis', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="history-cost">Biaya</label>
              <input
                id="history-cost"
                className="mono"
                type="number"
                placeholder="450000"
                value={histForm.biaya}
                onChange={(e) => handleHistChange('biaya', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="history-workshop">Bengkel</label>
              <input
                id="history-workshop"
                placeholder="Bengkel Jaya"
                value={histForm.bengkel}
                onChange={(e) => handleHistChange('bengkel', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="history-receipt">Foto struk service</label>
              <input id="history-receipt" type="file" accept="image/*" onChange={handleReceiptSelect} />
              {histForm.struk && <small className="receipt-ready">Foto siap: {receiptName || 'struk service'}</small>}
            </div>
            <button type="button" className="btn small" onClick={handleAddHistory} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Tambah'}
            </button>
          </div>
        )}

        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="modal-actions">
          {sessionRole === 'edit' && (
            <button type="button" className="btn danger" onClick={() => onDelete(v.id)} disabled={busy}>
              Hapus kendaraan
            </button>
          )}
          <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
            Tutup
          </button>
          {sessionRole === 'edit' && (
            <button type="button" className="btn" onClick={() => onEdit(v.id)} disabled={busy}>
              Edit
            </button>
          )}
        </div>
      </div>
      </div>
      {receiptPreview && (
        <div className="overlay receipt-overlay" onClick={(event) => event.target === event.currentTarget && setReceiptPreview(null)}>
          <div ref={receiptDialogRef} className="modal receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title" tabIndex={-1}>
            <div className="modal-head">
              <h2 id="receipt-title">Foto struk service</h2>
              <button type="button" className="close-x" onClick={() => setReceiptPreview(null)} aria-label="Tutup foto struk">&times;</button>
            </div>
            <img className="receipt-image" src={receiptPreview} alt="Foto struk service" />
          </div>
        </div>
      )}
    </>
  );
}
