
import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface StatCard {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  href?: string;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}

interface StandardDashboardStatsProps {
  stats: StatCard[];
  loading?: boolean;
  className?: string;
}

export function StandardDashboardStats({ 
  stats, 
  loading = false, 
  className 
}: StandardDashboardStatsProps) {
  const isMobile = useIsMobile();
  if (loading) {
    return (
      <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getVariantStyles = (variant: StatCard['variant'] = 'default') => {
    switch (variant) {
      case 'warning':
        return 'border-warning/20 bg-warning/5';
      case 'success':
        return 'border-success/20 bg-success/5';
      case 'destructive':
        return 'border-destructive/20 bg-destructive/5';
      default:
        return '';
    }
  };

  const getIconStyles = (variant: StatCard['variant'] = 'default') => {
    switch (variant) {
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      case 'destructive':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getValueStyles = (variant: StatCard['variant'] = 'default') => {
    switch (variant) {
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      case 'destructive':
        return 'text-destructive';
      default:
        return '';
    }
  };

  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  const renderCard = (stat: StatCard, index: number) => {
    const cardContent = (
      <Card 
        key={index} 
        className={cn(
          getVariantStyles(stat.variant),
          stat.href && isMobile 
            ? "active:scale-98 active:border-primary/20 transition-transform cursor-pointer" 
            : "hover:bg-muted/50 transition-colors cursor-pointer",
          !stat.href && isMobile && "active:scale-98 transition-transform"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "rounded-lg p-2 bg-primary/10",
              isMobile ? "min-w-[44px] min-h-[44px] flex items-center justify-center" : ""
            )}>
              <stat.icon className={cn(
                isMobile ? "h-5 w-5" : "h-4 w-4", 
                getIconStyles(stat.variant)
              )} />
            </div>
            <span className="text-sm font-medium">{stat.label}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", getValueStyles(stat.variant))}>
            {formatValue(stat.value)}
          </div>
          {stat.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          )}
        </CardContent>
      </Card>
    );

    if (stat.href) {
      return (
        <Link key={index} to={stat.href}>
          {cardContent}
        </Link>
      );
    }

    return cardContent;
  };

  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map(renderCard)}
    </div>
  );
}
