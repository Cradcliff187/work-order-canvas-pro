import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, User, Clock } from 'lucide-react';

interface AssignmentBadgeProps {
  isAssignedToMe: boolean;
  assigneeName?: string;
  showIcon?: boolean;
  className?: string;
}

export const AssignmentBadge: React.FC<AssignmentBadgeProps> = ({
  isAssignedToMe,
  assigneeName,
  showIcon = true,
  className
}) => {
  // Assigned to current user
  if (isAssignedToMe) {
    return (
      <Badge variant="success" className={className}>
        {showIcon && <Star className="h-3 w-3 mr-1" />}
        ASSIGNED TO YOU
      </Badge>
    );
  }

  // Assigned to someone else
  if (assigneeName) {
    return (
      <Badge variant="secondary" className={className}>
        {showIcon && <User className="h-3 w-3 mr-1" />}
        {assigneeName}
      </Badge>
    );
  }

  // Available/Unassigned
  return (
    <Badge variant="warning" className={className}>
      {showIcon && <Clock className="h-3 w-3 mr-1" />}
      AVAILABLE
    </Badge>
  );
};