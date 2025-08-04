import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonGroup, TableSkeleton } from '@/components/ui/enhanced-skeleton';

interface LoadingCardProps {
  count?: number;
  showHeader?: boolean;
}

function LoadingCard({ count = 1, showHeader = true }: LoadingCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          {showHeader && (
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
          )}
          <CardContent className="space-y-3">
            <SkeletonGroup count={3} itemClassName="h-4" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

interface LoadingListProps {
  count?: number;
  variant?: 'simple' | 'detailed' | 'grid';
}

function LoadingList({ count = 5, variant = 'simple' }: LoadingListProps) {
  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LoadingCard count={count} />
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="space-y-4">
        <LoadingCard count={count} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

function LoadingTable({ rows = 5, columns = 4, showHeader = true }: LoadingTableProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <TableSkeleton rows={rows} columns={columns} showHeader={showHeader} />
      </CardContent>
    </Card>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export { LoadingCard, LoadingList, LoadingTable, LoadingSpinner };