import { Skeleton } from '@/components/ui/skeleton';

interface EnhancedTableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showActions?: boolean;
}

export function EnhancedTableSkeleton({ 
  rows = 5, 
  columns = 6, 
  showHeader = true,
  showActions = true 
}: EnhancedTableSkeletonProps) {
  return (
    <div className="space-y-4 fade-in">
      {/* Header skeleton */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          {showActions && (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          )}
        </div>
      )}
      
      {/* Table skeleton */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-muted/30 p-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        
        {/* Table rows */}
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex space-x-4">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton 
                    key={j} 
                    className={`h-4 flex-1 ${j === 0 ? 'w-8' : j === columns - 1 ? 'w-16' : ''}`} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}