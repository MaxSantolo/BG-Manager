import { SkeletonFilters, SkeletonGrid, Skeleton } from "@/components/Skeleton";

export default function WishlistLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <SkeletonFilters />
      <SkeletonGrid count={8} />
    </div>
  );
}
