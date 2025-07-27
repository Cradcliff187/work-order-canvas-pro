import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>;
  format?: 'number' | 'currency' | 'percentage' | 'hours';
  isLoading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  trend = 'neutral',
  icon: Icon,
  format = 'number',
  isLoading = false,
}) => {
  const formatValue = (val: string | number) => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numVal);
      case 'percentage':
        return `${numVal.toFixed(1)}%`;
      case 'hours':
        return `${numVal.toFixed(1)}h`;
      default:
        return new Intl.NumberFormat('en-US').format(numVal);
    }
  };

  const formatChange = (changeVal: number) => {
    const sign = changeVal >= 0 ? '+' : '';
    return `${sign}${changeVal.toFixed(1)}%`;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUpIcon;
    if (trend === 'down') return TrendingDownIcon;
    return null;
  };

  const getChangeIcon = () => {
    if (change === undefined) return null;
    return change >= 0 ? ArrowUpIcon : ArrowDownIcon;
  };

  const TrendIcon = getTrendIcon();
  const ChangeIcon = getChangeIcon();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">{formatValue(value)}</div>
            {TrendIcon && (
              <TrendIcon 
                className={cn(
                  "h-4 w-4",
                  trend === 'up' ? "text-green-600" : "text-red-600"
                )} 
              />
            )}
          </div>
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              {ChangeIcon && (
                <ChangeIcon 
                  className={cn(
                    "h-3 w-3",
                    change >= 0 ? "text-green-600" : "text-red-600"
                  )} 
                />
              )}
              <span 
                className={cn(
                  "text-xs font-medium",
                  change >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatChange(change)}
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};