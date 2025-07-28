import React from 'react';
import { UserCheck, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationBadge } from '@/components/OrganizationBadge';

interface Assignment {
  assigned_to: string;
  assignment_type: string; // Change to string to match database type
  assignee_profile: {
    first_name: string;
    last_name: string;
  } | null;
  assigned_organization?: {
    name: string;
    organization_type?: string;
  } | null;
}

interface AssigneeUser {
  first_name: string;
  last_name: string;
  user_type?: string;
}

interface AssigneeDisplayProps {
  assignments?: Assignment[];
  className?: string;
  showIcons?: boolean;
  showOrganization?: boolean;
}

export function AssigneeDisplay({ 
  assignments = [], 
  className = "",
  showIcons = true,
  showOrganization = true 
}: AssigneeDisplayProps) {
  // Use only assignments table - no more legacy fallback
  const hasAssignments = assignments && assignments.length > 0;
  const assignees = hasAssignments ? assignments : [];

  // Helper function to get display name with lead indicator
  const getDisplayName = (assignment: Assignment) => {
    // For placeholder assignments, don't show user name
    if (assignment.assignment_type === 'placeholder') return null;
    if (!assignment.assignee_profile) return 'Unknown User';
    const { first_name, last_name } = assignment.assignee_profile;
    const shortName = `${first_name} ${last_name.charAt(0)}.`;
    return assignment.assignment_type === 'lead' ? `${shortName} (L)` : shortName;
  };

  // Helper function to get full name for tooltip
  const getFullName = (assignment: Assignment) => {
    // For placeholder assignments, don't show user name
    if (assignment.assignment_type === 'placeholder') return null;
    if (!assignment.assignee_profile) return 'Unknown User';
    const { first_name, last_name } = assignment.assignee_profile;
    return `${first_name} ${last_name}${assignment.assignment_type === 'lead' ? ' (Lead)' : ''}`;
  };

  // Render unassigned state
  if (!hasAssignments) {
    return (
      <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
        {showIcons && <Users className="h-4 w-4" />}
        <span>Unassigned</span>
      </div>
    );
  }

  // Render single assignment
  if (assignees.length === 1) {
    const assignment = assignees[0];
    const displayName = getDisplayName(assignment);
    const isPlaceholder = assignment.assignment_type === 'placeholder';
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!isPlaceholder && displayName && (
          <div className="flex items-center gap-1">
            {showIcons && (
              assignment.assignment_type === 'lead' ? 
                <UserCheck className="h-4 w-4" /> : 
                <Users className="h-4 w-4" />
            )}
            <span>{displayName}</span>
          </div>
        )}
        {showOrganization && assignment.assigned_organization && (
          <OrganizationBadge 
            organization={assignment.assigned_organization}
            size="sm"
            showIcon={isPlaceholder}
          />
        )}
      </div>
    );
  }

  // Render multiple assignments (2-3 shown, 4+ with "more")
  if (assignees.length <= 3) {
    const displayNames = assignees.map(assignment => getDisplayName(assignment)).filter(Boolean);
    const displayText = displayNames.length > 0 ? displayNames.join(', ') : '';
    const tooltipNames = assignees.map(assignment => getFullName(assignment)).filter(Boolean);
    const tooltipText = tooltipNames.length > 0 ? tooltipNames.join('\n') : '';
    const organizations = assignees
      .map(a => a.assigned_organization)
      .filter((org, index, arr) => org && arr.findIndex(o => o?.name === org.name) === index);
    const hasPlaceholders = assignees.some(a => a.assignment_type === 'placeholder');

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 cursor-help ${className}`}>
              {displayText && (
                <div className="flex items-center gap-1">
                  {showIcons && <Users className="h-4 w-4" />}
                  <span>{displayText}</span>
                </div>
              )}
              {showOrganization && organizations.length > 0 && (
                <div className="flex gap-1">
                  {organizations.slice(0, 2).map((org, idx) => org && (
                    <OrganizationBadge 
                      key={`${org.name}-${idx}`}
                      organization={org}
                      size="sm"
                      showIcon={hasPlaceholders && !displayText}
                    />
                  ))}
                  {organizations.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{organizations.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </TooltipTrigger>
          {tooltipText && (
            <TooltipContent>
              <div className="whitespace-pre-line">{tooltipText}</div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Render 4+ assignments with "more" indicator
  const firstAssignee = assignees[0];
  const firstDisplayName = getDisplayName(firstAssignee);
  const nonPlaceholderCount = assignees.filter(a => a.assignment_type !== 'placeholder').length;
  const remainingCount = nonPlaceholderCount > 1 ? nonPlaceholderCount - 1 : assignees.length - 1;
  const allAssigneeNames = assignees.map(assignment => getFullName(assignment)).filter(Boolean);
  const allAssignees = allAssigneeNames.length > 0 ? allAssigneeNames.join('\n') : '';
  const organizations = assignees
    .map(a => a.assigned_organization)
    .filter((org, index, arr) => org && arr.findIndex(o => o?.name === org.name) === index);
  const hasPlaceholders = assignees.some(a => a.assignment_type === 'placeholder');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 cursor-help ${className}`}>
            {firstDisplayName && remainingCount > 0 && (
              <div className="flex items-center gap-1">
                {showIcons && <Users className="h-4 w-4" />}
                <span>
                  {firstDisplayName} + {remainingCount} more
                </span>
              </div>
            )}
            {showOrganization && organizations.length > 0 && (
              <div className="flex gap-1">
                {organizations.slice(0, 2).map((org, idx) => org && (
                  <OrganizationBadge 
                    key={`${org.name}-${idx}`}
                    organization={org}
                    size="sm"
                    showIcon={hasPlaceholders && !firstDisplayName}
                  />
                ))}
                {organizations.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{organizations.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        {allAssignees && (
          <TooltipContent>
            <div className="whitespace-pre-line">{allAssignees}</div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}