export default function EmptyState({ hasFleet }: { hasFleet: boolean }) {
  if (!hasFleet) {
    return (
      <div className="empty-state">
        <h2>Belum ada kendaraan</h2>
        <p>Armada masih kosong. Gunakan tombol Tambah Kendaraan di header untuk menambahkan kendaraan pertama.</p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <h2>Tidak ditemukan</h2>
      <p>Coba ubah kata kunci pencarian atau filter untuk melihat kendaraan lain.</p>
    </div>
  );
}
