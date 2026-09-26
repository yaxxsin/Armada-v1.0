export default function Toolbar({
  filterText,
  filterStatus,
  filterLokasi,
  lokasiList,
  onSearchChange,
  onStatusChange,
  onLokasiChange,
}) {
  return (
    <div className="toolbar">
      <input
        id="searchInput"
        type="text"
        placeholder="Cari merk atau plat nomor..."
        value={filterText}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select value={filterStatus} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="all">Semua status</option>
        <option value="attention">Perlu perhatian</option>
        <option value="overdue">Terlambat</option>
      </select>
      <select value={filterLokasi} onChange={(e) => onLokasiChange(e.target.value)}>
        <option value="all">Semua lokasi</option>
        {lokasiList.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
