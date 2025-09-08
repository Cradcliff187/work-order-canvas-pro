import React from 'react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { useWorkItemMetrics } from '@/hooks/useWorkItemMetrics';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileWorkCard } from './mobile/MobileWorkCard';
import { DesktopWorkCard } from './DesktopWorkCard';

interface ResponsiveWorkCardProps {
  workItem: WorkItem;
  onViewDetails: (id: string) => void;
  variant?: 'assigned' | 'available';
  className?: string;
}

export const ResponsiveWorkCard: React.FC<ResponsiveWorkCardProps> = ({
  workItem,
  onViewDetails,
  variant = 'available',
  className
}) => {
  const isMobile = useIsMobile();
  const { data: metrics } = useWorkItemMetrics(workItem.id, workItem.type);

  const commonProps = {
    workItem,
    onViewDetails,
    variant,
    className,
    metrics
  };

  return isMobile ? (
    <MobileWorkCard {...commonProps} />
  ) : (
    <DesktopWorkCard {...commonProps} />
  );
};