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
      <Badge variant="success" className="text-[10px] px-1 py-0.5 shrink-0">
        {showIcon && <Star className="h-2.5 w-2.5 mr-0.5 hidden sm:inline" />}
        <span className="xs:hidden">MY</span>
        <span className="hidden xs:inline sm:hidden">YOURS</span>
        <span className="hidden sm:inline">ASSIGNED TO YOU</span>
      </Badge>
    );
  }

  // Assigned to someone else  
  if (assigneeName) {
    return (
      <Badge variant="secondary" className="text-[10px] px-1 py-0.5 shrink-0">
        {showIcon && <User className="h-2.5 w-2.5 mr-0.5 hidden sm:inline" />}
        <span className="truncate max-w-[60px] xs:max-w-[80px] sm:max-w-none">{assigneeName}</span>
      </Badge>
    );
  }

  // Available/Unassigned
  return (
    <Badge variant="warning" className="text-[10px] px-1 py-0.5 shrink-0">
      {showIcon && <Clock className="h-2.5 w-2.5 mr-0.5 hidden sm:inline" />}
      <span className="xs:hidden">●</span>
      <span className="hidden xs:inline sm:hidden">OPEN</span>
      <span className="hidden sm:inline">AVAILABLE</span>
    </Badge>
  );
};