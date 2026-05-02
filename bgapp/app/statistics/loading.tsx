import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function StatisticsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={6} />
        <div className="lg:col-span-2"><SkeletonCard rows={5} /></div>
        <div className="lg:col-span-2"><SkeletonCard rows={8} /></div>
      </div>
    </div>
  );
}
