import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BillCardSkeleton() {
  return (
    <Card className="border-none bg-white rounded-2xl h-[400px]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-3/4 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Summary Snippet Skeleton */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <Skeleton className="h-3 w-full mb-2 rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
        </div>

        {/* Categories Skeleton */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-12 rounded-lg" />
          <Skeleton className="h-5 w-16 rounded-lg" />
          <Skeleton className="h-5 w-10 rounded-lg" />
        </div>

        {/* Bottom Info Skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>

        {/* Action Button Skeleton */}
        <Skeleton className="h-14 w-full rounded-xl mt-4" />
      </CardContent>
    </Card>
  );
}
