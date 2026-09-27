function dateToStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function photosFrom(v) {
  let stored = v.photos;
  if (typeof stored === 'string') {
    try {
      stored = JSON.parse(stored);
    } catch {
      stored = [];
    }
  }
  if (Array.isArray(stored)) {
    const valid = stored.filter((item) => typeof item === 'string' && item.startsWith('data:image/'));
    if (valid.length > 0) return valid.slice(0, 4);
  }
  return v.foto ? [v.foto] : [];
}

export function toDTO(v, history = []) {
  const allPhotos = photosFrom(v);
  return {
    id: v.id,
    merk: v.merk,
    plat: v.plat,
    tahun: v.tahun,
    lokasi: v.lokasi,
    pic: v.pic,
    pajakTahunanBerlaku: dateToStr(v.pajak_tahunan_berlaku),
    pajak5TahunanBerlaku: dateToStr(v.pajak_5tahunan_berlaku),
    keurBerlaku: dateToStr(v.keur_berlaku),
    intervalKm: v.interval_km,
    intervalBulan: v.interval_bulan,
    kmSekarang: v.km_sekarang,
    catatan: v.catatan,
    foto: v.foto,
    // Daftar armada hanya mengirim kolom `cover_photo` (satu foto pertama),
    // sedangkan endpoint detail mengirim `photos` lengkap. Keduanya dilayani
    // oleh field yang sama supaya FleetView tidak perlu tahu asal datanya.
    coverPhoto: v.cover_photo || allPhotos[0] || null,
    photoCount: allPhotos.length,
    photos: allPhotos,
    createdBy: v.created_by,
    serviceHistory: history,
  };
}
