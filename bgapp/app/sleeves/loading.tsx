import { SkeletonFilters, SkeletonTable, Skeleton } from "@/components/Skeleton";

export default function SleevesLoading() {
  return (
    <div className="space-y-3">
      <SkeletonFilters />
      <div className="hidden lg:block">
        <SkeletonTable rows={12} />
      </div>
      <div className="lg:hidden space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card flex items-center justify-between p-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
