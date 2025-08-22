import { Skeleton } from '@/components/ui/skeleton';

interface DashboardSkeletonProps {
  isMobile?: boolean;
}

export function DashboardSkeleton({ isMobile }: DashboardSkeletonProps) {
  if (isMobile) {
    return (
      <div className="space-y-2 max-w-full overflow-hidden px-0">
        {/* Header skeleton */}
        <div className="flex items-center justify-between p-4 bg-card rounded-lg">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        
        {/* Clock card skeleton */}
        <Skeleton className="h-24 w-full rounded-lg" />
        
        {/* Stats row skeleton */}
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        
        {/* Filter chips skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-18 rounded-full" />
        </div>
        
        {/* Work items skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        
        {/* Quick actions skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Clock card skeleton */}
      <Skeleton className="h-32 w-full rounded-lg" />
      
      {/* Stats bar skeleton */}
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      
      {/* Filter chips skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      
      {/* Work items skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      
      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </div>
  );
}