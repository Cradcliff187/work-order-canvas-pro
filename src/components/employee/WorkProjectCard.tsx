import React from 'react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { ResponsiveWorkCard } from './ResponsiveWorkCard';

interface WorkProjectCardProps {
  workItem: WorkItem;
  onViewDetails: (id: string) => void;
  variant?: 'assigned' | 'available';
  className?: string;
}

export const WorkProjectCard: React.FC<WorkProjectCardProps> = (props) => {
  return <ResponsiveWorkCard {...props} />;
};