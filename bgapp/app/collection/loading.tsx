import { SkeletonFilters, SkeletonTable, SkeletonGrid, Skeleton } from "@/components/Skeleton";

export default function CollectionLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <SkeletonFilters />
      <div className="sm:hidden space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card flex gap-3 p-4">
            <Skeleton className="w-12 h-12 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block lg:hidden">
        <SkeletonGrid count={6} />
      </div>
      <div className="hidden lg:block">
        <SkeletonTable rows={10} />
      </div>
    </div>
  );
}
