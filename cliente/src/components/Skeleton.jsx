export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-ink/10 ${className}`} />;
}

export function EntrySkeleton() {
  return (
    <div className="flex gap-3 bg-white border-2 border-border p-3">
      <Skeleton className="w-20 h-20 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="p-3 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <EntrySkeleton key={i} />
      ))}
    </div>
  );
}
