import React from 'react';
import { UserCheck, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Assignment {
  assigned_to: string;
  assignment_type: string; // Change to string to match database type
  assignee_profile: {
    first_name: string;
    last_name: string;
  } | null;
}

interface AssigneeUser {
  first_name: string;
  last_name: string;
  user_type?: string;
}

interface AssigneeDisplayProps {
  assignments?: Assignment[];
  assignedUser?: AssigneeUser | null;
  className?: string;
  showIcons?: boolean;
}

export function AssigneeDisplay({ 
  assignments = [], 
  assignedUser, 
  className = "",
  showIcons = true 
}: AssigneeDisplayProps) {
  // If we have assignments, use them. Otherwise fall back to legacy assigned_user
  const hasAssignments = assignments && assignments.length > 0;
  const assignees = hasAssignments ? assignments : [];

  // Helper function to get display name with lead indicator
  const getDisplayName = (assignment: Assignment) => {
    if (!assignment.assignee_profile) return 'Unknown User';
    const { first_name, last_name } = assignment.assignee_profile;
    const shortName = `${first_name} ${last_name.charAt(0)}.`;
    return assignment.assignment_type === 'lead' ? `${shortName} (L)` : shortName;
  };

  // Helper function to get full name for tooltip
  const getFullName = (assignment: Assignment) => {
    if (!assignment.assignee_profile) return 'Unknown User';
    const { first_name, last_name } = assignment.assignee_profile;
    return `${first_name} ${last_name}${assignment.assignment_type === 'lead' ? ' (Lead)' : ''}`;
  };

  // Render unassigned state
  if (!hasAssignments && !assignedUser) {
    return (
      <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
        {showIcons && <Users className="h-4 w-4" />}
        <span>Unassigned</span>
      </div>
    );
  }

  // Render legacy single assignee
  if (!hasAssignments && assignedUser) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {showIcons && <UserCheck className="h-4 w-4" />}
        <span>{assignedUser.first_name} {assignedUser.last_name}</span>
      </div>
    );
  }

  // Render single assignment
  if (assignees.length === 1) {
    const assignment = assignees[0];
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {showIcons && (
          assignment.assignment_type === 'lead' ? 
            <UserCheck className="h-4 w-4" /> : 
            <Users className="h-4 w-4" />
        )}
        <span>{getDisplayName(assignment)}</span>
      </div>
    );
  }

  // Render multiple assignments (2-3 shown, 4+ with "more")
  if (assignees.length <= 3) {
    const displayText = assignees.map(assignment => getDisplayName(assignment)).join(', ');
    const tooltipText = assignees.map(assignment => getFullName(assignment)).join('\n');

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 cursor-help ${className}`}>
              {showIcons && <Users className="h-4 w-4" />}
              <span>{displayText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="whitespace-pre-line">{tooltipText}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Render 4+ assignments with "more" indicator
  const firstAssignee = assignees[0];
  const remainingCount = assignees.length - 1;
  const allAssignees = assignees.map(assignment => getFullName(assignment)).join('\n');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 cursor-help ${className}`}>
            {showIcons && <Users className="h-4 w-4" />}
            <span>
              {getDisplayName(firstAssignee)} + {remainingCount} more
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">{allAssignees}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}