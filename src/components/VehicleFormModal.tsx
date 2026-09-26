import { useEffect, useState, useRef } from 'react';
import { uid, DEFAULTS, resizeImageFile, shrinkPhotoPayload } from '../utils/helpers';
import { useDialogFocus } from '../hooks/useDialogFocus';

export default function VehicleFormModal({ vehicle, onSave, onDelete, onClose }) {
  const isEditing = !!vehicle?.id && vehicle._existing;
  const [form, setForm] = useState({
    merk: vehicle?.merk || '',
    plat: vehicle?.plat || '',
    tahun: vehicle?.tahun || '',
    lokasi: vehicle?.lokasi || '',
    pic: vehicle?.pic || '',
    pajakTahunanBerlaku: vehicle?.pajakTahunanBerlaku || '',
    pajak5TahunanBerlaku: vehicle?.pajak5TahunanBerlaku || '',
    keurBerlaku: vehicle?.keurBerlaku || '',
    intervalKm: vehicle?.intervalKm || DEFAULTS.intervalKm,
    intervalBulan: vehicle?.intervalBulan || DEFAULTS.intervalBulan,
    kmSekarang: vehicle?.kmSekarang || '',
    catatan: vehicle?.catatan || '',
  });
  const initialPhotos = [
    ...(Array.isArray(vehicle?.photos) ? vehicle.photos : []),
    ...(vehicle?.foto ? [vehicle.foto] : []),
  ].filter((src, index, all) => typeof src === 'string' && src && all.indexOf(src) === index).slice(0, 4);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);
  const dialogRef = useDialogFocus(true);

  const maxPhotos = 4;
  const remaining = maxPhotos - photos.length;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, busy]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoSelect = async (ev) => {
    const files: File[] = Array.from(ev.target.files || []);
    ev.target.value = '';
    if (files.length === 0) return;

    setError('');
    const slot = Math.max(0, maxPhotos - photos.length);
    if (slot === 0) {
      setError(`Maksimal ${maxPhotos} foto kendaraan. Hapus foto yang ada sebelum menambah.`);
      return;
    }

    const accepted = files.filter((file) => file.type.startsWith('image/')).slice(0, slot);
    if (accepted.length === 0) {
      setError('File yang dipilih bukan gambar.');
      return;
    }
    if (files.length > slot) {
      setError(`Maksimal ${maxPhotos} foto kendaraan. ${files.length - slot} file diabaikan.`);
    }

    setPhotoBusy(true);
    try {
      const resized = await Promise.all(
        accepted.map((file) => resizeImageFile(file, { maxWidth: 960, quality: 0.72 }))
      );
      const next = [...photos, ...resized].slice(0, maxPhotos);
      setPhotos(await shrinkPhotoPayload(next));
    } catch {
      setError('Gagal memproses foto. Coba file lain.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const makePrimary = (index) => {
    setPhotos((prev) => {
      if (index <= 0) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });
  };

  const handleSave = async () => {
    setError('');
    if (!form.merk.trim() || !form.plat.trim()) {
      setError('Merk dan plat nomor wajib diisi.');
      return;
    }
    const data = {
      id: vehicle?.id || uid(),
      ...form,
      plat: form.plat.trim().toUpperCase(),
      merk: form.merk.trim(),
      lokasi: form.lokasi.trim(),
      pic: form.pic.trim(),
      catatan: form.catatan.trim(),
      serviceHistory: vehicle?.serviceHistory || [],
      foto: photos[0] || null,
      photos,
    };
    setBusy(true);
    try {
      const savedPhotos = await shrinkPhotoPayload(photos);
      await onSave({ ...data, foto: savedPhotos[0] || null, photos: savedPhotos }, isEditing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kendaraan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => !busy && e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title" tabIndex={-1}>
        <div className="modal-head">
          <h2 id="vehicle-form-title">{isEditing ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
          <button type="button" className="close-x" onClick={onClose} aria-label="Tutup dialog" disabled={busy}>
            &times;
          </button>
        </div>

        <div className="field">
          <label>
            Foto kendaraan{' '}
            <span className="foto-hint">
              {photos.length}/{maxPhotos} foto · sudut depan, samping, belakang, dan interior
            </span>
          </label>
          <div className="foto-grid">
            {photos.map((src, index) => (
              <figure key={`${index}-${src.slice(-12)}`} className="foto-tile">
                <img src={src} alt={`Foto kendaraan ${index + 1}`} />
                {index === 0 && <figcaption>Foto utama</figcaption>}
                <div className="foto-tile__actions">
                  {index > 0 && (
                    <button
                      type="button"
                      className="btn ghost tiny"
                      onClick={() => makePrimary(index)}
                      disabled={busy}
                      title="Jadikan foto utama"
                    >
                      Utama
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn ghost tiny"
                    onClick={() => removePhoto(index)}
                    disabled={busy}
                    title="Hapus foto"
                    aria-label={`Hapus foto ${index + 1}`}
                  >
                    &times;
                  </button>
                </div>
              </figure>
            ))}
            {remaining > 0 && (
              <button
                type="button"
                className="foto-tile add"
                onClick={() => fileRef.current?.click()}
                disabled={busy || photoBusy}
              >
                <span className="foto-tile__plus">+</span>
                <span>{photoBusy ? 'Memproses…' : 'Tambah foto'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
        </div>

        <div className="field">
          <label>Merk / model</label>
          <input
            data-dialog-autofocus
             value={form.merk}
            onChange={(e) => handleChange('merk', e.target.value)}
            placeholder="Toyota Hilux"
          />
        </div>

        <div className="row3">
          <div className="field">
            <label>Plat nomor</label>
            <input
              className="mono"
              value={form.plat}
              onChange={(e) => handleChange('plat', e.target.value)}
              placeholder="B 1234 XYZ"
            />
          </div>
          <div className="field">
            <label>Tahun</label>
            <input
              className="mono"
              value={form.tahun}
              onChange={(e) => handleChange('tahun', e.target.value)}
              placeholder="2021"
            />
          </div>
          <div className="field">
            <label htmlFor="vehicle-location">Lokasi / cabang</label>
            <input
              id="vehicle-location"
              value={form.lokasi}
              onChange={(e) => handleChange('lokasi', e.target.value)}
              placeholder="Gudang Cakung"
            />
          </div>
          <div className="field">
            <label htmlFor="vehicle-pic">PIC kendaraan</label>
            <input
              id="vehicle-pic"
              value={form.pic}
              onChange={(e) => handleChange('pic', e.target.value)}
              placeholder="Nama penanggung jawab"
            />
          </div>
        </div>

        <div className="section-title">Pajak &amp; keur</div>
        <div className="row3">
          <div className="field">
            <label>Pajak tahunan berlaku sampai</label>
            <input
              type="date"
              value={form.pajakTahunanBerlaku}
              onChange={(e) => handleChange('pajakTahunanBerlaku', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Pajak 5 tahun berlaku sampai</label>
            <input
              type="date"
              value={form.pajak5TahunanBerlaku}
              onChange={(e) => handleChange('pajak5TahunanBerlaku', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Keur berlaku sampai</label>
            <input
              type="date"
              value={form.keurBerlaku}
              onChange={(e) => handleChange('keurBerlaku', e.target.value)}
            />
          </div>
        </div>

        <div className="section-title">Servis</div>
        <div className="row2">
          <div className="field">
            <label>Interval servis (km)</label>
            <input
              className="mono"
              type="number"
              value={form.intervalKm}
              onChange={(e) => handleChange('intervalKm', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Interval servis (bulan)</label>
            <input
              className="mono"
              type="number"
              value={form.intervalBulan}
              onChange={(e) => handleChange('intervalBulan', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Odometer saat ini (km)</label>
          <input
            className="mono"
            type="number"
            value={form.kmSekarang}
            onChange={(e) => handleChange('kmSekarang', e.target.value)}
            placeholder="48200"
          />
        </div>

        <div className="field">
          <label>Catatan</label>
          <input
            value={form.catatan}
            onChange={(e) => handleChange('catatan', e.target.value)}
            placeholder="Opsional"
          />
        </div>

        {!isEditing && (
          <div className="note" style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
            Riwayat servis bisa ditambahkan setelah kendaraan disimpan, lewat halaman detail.
          </div>
        )}

        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="modal-actions">
          {isEditing && onDelete && (
            <button type="button" className="btn danger" onClick={() => onDelete(vehicle.id)} disabled={busy}>
              Hapus
            </button>
          )}
          <button className="btn secondary" onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button className="btn" onClick={handleSave} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
