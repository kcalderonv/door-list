export default function CardSkeleton() {
  return <div className="card-skeleton" aria-hidden="true">
    <div className="skeleton-title" />
    <div className="skeleton-meta" />
    <div className="skeleton-action" />
  </div>;
}
