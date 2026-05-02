import { SkeletonCard } from "@/components/Skeleton";
import { Skeleton } from "@/components/Skeleton";

export default function PlaysLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard rows={8} />
        <div className="lg:col-span-2"><SkeletonCard rows={10} /></div>
      </div>
    </div>
  );
}
