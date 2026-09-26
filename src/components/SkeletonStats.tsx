export default function SkeletonStats() {
  return (
    <div className="stats">
      {[1, 2, 3, 4].map((i) => (
        <div className="stat" key={i}>
          <div className="skeleton-line skeleton-num" />
          <div className="skeleton-line skeleton-lbl" />
        </div>
      ))}
    </div>
  );
}