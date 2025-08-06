import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EnhancedApprovalSkeletonProps {
  showFilters?: boolean;
  showTabs?: boolean;
  rows?: number;
}

export function EnhancedApprovalSkeleton({ 
  showFilters = true, 
  showTabs = true, 
  rows = 5 
}: EnhancedApprovalSkeletonProps) {
  return (
    <div className="p-6 space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="space-y-6">
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      )}

      {/* Table Content */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block">
            <div className="rounded-md border">
              {/* Table Header */}
              <div className="border-b bg-muted/30 p-4">
                <div className="flex space-x-4">
                  <Skeleton className="h-4 w-4" /> {/* Checkbox */}
                  <Skeleton className="h-4 w-16" /> {/* Type */}
                  <Skeleton className="h-4 flex-1" /> {/* Title */}
                  <Skeleton className="h-4 w-32" /> {/* Submitted By */}
                  <Skeleton className="h-4 w-20" /> {/* Amount */}
                  <Skeleton className="h-4 w-24" /> {/* Date */}
                  <Skeleton className="h-4 w-16" /> {/* Actions */}
                </div>
              </div>
              
              {/* Table Rows */}
              <div className="divide-y">
                {Array.from({ length: rows }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex space-x-4 items-center">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        {Math.random() > 0.6 && (
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-2 w-2 rounded-full" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        )}
                      </div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Cards Skeleton */}
          <div className="block lg:hidden space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        {Math.random() > 0.5 && (
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-2 w-2 rounded-full" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        )}
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-4 w-3/5" />
                      {Math.random() > 0.6 && (
                        <Skeleton className="h-4 w-20" />
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}