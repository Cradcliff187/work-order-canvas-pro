import { Skeleton } from '@/components/ui/skeleton';

interface DashboardSkeletonProps {
  showStats?: boolean;
  showChart?: boolean;
  showActivity?: boolean;
  gridCols?: number;
}

export function DashboardSkeleton({ 
  showStats = true,
  showChart = true,
  showActivity = true,
  gridCols = 4 
}: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards skeleton */}
      {showStats && (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${gridCols}`}>
          {Array.from({ length: gridCols }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart and activity layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart skeleton */}
        {showChart && (
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        )}

        {/* Activity feed skeleton */}
        {showActivity && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}