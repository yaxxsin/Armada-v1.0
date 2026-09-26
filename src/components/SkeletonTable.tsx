export default function SkeletonTable({ rows = 5 }) {
  return (
    <div className="list">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="rem-item" key={i} aria-hidden="true">
          <span className="skeleton-dot" />
          <span className="skeleton-line skeleton-plat" />
          <span className="skeleton-line skeleton-msg" />
          <span className="skeleton-line skeleton-days" />
        </div>
      ))}
    </div>
  );
}