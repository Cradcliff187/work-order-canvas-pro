import React from 'react';
import { Clock, Eye } from 'lucide-react';
import { CompactMobileCard } from '@/components/admin/shared/CompactMobileCard';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
interface EmployeeAssignment {
  id: string;
  assignment_type: string;
  assigned_at: string;
  work_orders: {
    id: string;
    title: string;
    work_order_number: string;
    status: string;
  } | null;
}

interface SwipeableWorkOrderCardProps {
  assignment: EmployeeAssignment;
  onClockIn: (workOrderId: string) => void;
  onViewDetails: (assignmentId: string) => void;
  isDisabled?: boolean;
  onClick?: () => void;
}

export const SwipeableWorkOrderCard: React.FC<SwipeableWorkOrderCardProps> = ({
  assignment,
  onClockIn,
  onViewDetails,
  isDisabled = false,
  onClick
}) => {
  const isMobile = useIsMobile();
  const { onSwipeAction } = useHapticFeedback();

  const handleClockIn = () => {
    onSwipeAction();
    if (assignment.work_orders?.id) {
      onClockIn(assignment.work_orders.id);
    }
  };

  const handleViewDetails = () => {
    onSwipeAction();
    onViewDetails(assignment.id);
  };

  const cardContent = (
    <CompactMobileCard
      title={assignment.work_orders?.title || 'Untitled'}
      subtitle={`${assignment.work_orders?.work_order_number} • ${assignment.assignment_type}`}
      onClick={onClick}
    />
  );

  // Only enable swipe actions on mobile
  if (!isMobile) {
    return cardContent;
  }

  return (
    <SwipeableListItem
      onSwipeRight={handleClockIn}
      onSwipeLeft={handleViewDetails}
      rightAction={{
        icon: Clock,
        label: "Clock In",
        color: "success"
      }}
      leftAction={{
        icon: Eye,
        label: "View Details",
        color: "default"
      }}
      disabled={isDisabled}
      itemName={assignment.work_orders?.title || 'work order'}
      itemType="assignment"
    >
      {cardContent}
    </SwipeableListItem>
  );
};