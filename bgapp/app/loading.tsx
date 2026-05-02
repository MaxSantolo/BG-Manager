import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={6} />
      </div>
    </div>
  );
}
