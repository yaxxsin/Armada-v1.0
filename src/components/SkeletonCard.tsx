export default function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <div className="skeleton-photo" />
      <div className="skeleton-line skeleton-plate" />
      <div className="skeleton-line skeleton-merk" />
      <div className="skeleton-line skeleton-tahun" />
      <div className="skeleton-rail" />
      <div className="skeleton-line skeleton-km" />
    </div>
  );
}