import React from 'react';
import { UserCheck, Users, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationBadge } from '@/components/shared/OrganizationBadge';

interface Assignment {
  assigned_to: string;
  assignment_type: string; // Change to string to match database type
  assignee_profile: {
    first_name: string;
    last_name: string;
  } | null;
  assigned_organization?: {
    id: string;
    name: string;
    organization_type: 'partner' | 'subcontractor' | 'internal';
    initials?: string;
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

  // Check if this is primarily an organization assignment
  const isOrganizationAssignment = assignees.some(a => a.assigned_organization);

  // Helper function to get display name with lead indicator
  const getDisplayName = (assignment: Assignment) => {
    // If organization assignment without specific user
    if (assignment.assigned_organization && !assignment.assignee_profile) {
      return null; // Will show organization badge instead
    }
    
    if (!assignment.assignee_profile) {
      return 'Unassigned';
    }
    
    const { first_name, last_name } = assignment.assignee_profile;
    const shortName = `${first_name} ${last_name.charAt(0)}.`;
    return assignment.assignment_type === 'lead' ? `${shortName} (L)` : shortName;
  };

  // Helper function to get full name for tooltip
  const getFullName = (assignment: Assignment) => {
    if (assignment.assigned_organization && !assignment.assignee_profile) {
      return `Assigned to ${assignment.assigned_organization.name} (Organization)`;
    }
    
    if (!assignment.assignee_profile) {
      return 'Unassigned';
    }
    
    const { first_name, last_name } = assignment.assignee_profile;
    const orgInfo = assignment.assigned_organization ? ` - ${assignment.assigned_organization.name}` : '';
    return `${first_name} ${last_name}${assignment.assignment_type === 'lead' ? ' (Lead)' : ''}${orgInfo}`;
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
    
    // Organization-only assignment
    if (assignment.assigned_organization && !displayName) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          {showIcons && <Building2 className="h-4 w-4" />}
          <OrganizationBadge 
            organization={assignment.assigned_organization}
            size="sm"
            showIcon={true}
          />
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {showIcons && (
            assignment.assignment_type === 'lead' ? 
              <UserCheck className="h-4 w-4" /> : 
              <Users className="h-4 w-4" />
          )}
          {displayName && <span>{displayName}</span>}
        </div>
        {showOrganization && assignment.assigned_organization && (
          <OrganizationBadge 
            organization={assignment.assigned_organization}
            size="sm"
            showIcon={false}
            showName={false}
          />
        )}
      </div>
    );
  }

  // Get unique organizations
  const organizations = assignees
    .map(a => a.assigned_organization)
    .filter((org, index, arr) => org && arr.findIndex(o => o?.name === org.name) === index);

  // Render multiple assignments (2-3 shown, 4+ with "more")
  if (assignees.length <= 3) {
    const displayNames = assignees
      .map(assignment => getDisplayName(assignment))
      .filter(name => name);
    const displayText = displayNames.length > 0 ? displayNames.join(', ') : null;
    const tooltipText = assignees.map(assignment => getFullName(assignment)).join('\n');

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
              {!displayText && showIcons && organizations.length > 0 && (
                <Building2 className="h-4 w-4" />
              )}
              {showOrganization && organizations.length > 0 && (
                <div className="flex gap-1">
                  {organizations.slice(0, 2).map((org, idx) => org && (
                    <OrganizationBadge 
                      key={`${org.name}-${idx}`}
                      organization={org}
                      size="sm"
                      showIcon={!displayText}
                    />
                  ))}
                  {organizations.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{organizations.length - 2}</span>
                  )}
                </div>
              )}
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
  const firstDisplayName = getDisplayName(firstAssignee);
  const remainingCount = assignees.length - 1;
  const allAssignees = assignees.map(assignment => getFullName(assignment)).join('\n');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 cursor-help ${className}`}>
            {firstDisplayName && (
              <div className="flex items-center gap-1">
                {showIcons && <Users className="h-4 w-4" />}
                <span>
                  {firstDisplayName} + {remainingCount} more
                </span>
              </div>
            )}
            {!firstDisplayName && showIcons && organizations.length > 0 && (
              <Building2 className="h-4 w-4" />
            )}
            {showOrganization && organizations.length > 0 && (
              <div className="flex gap-1">
                {organizations.slice(0, 2).map((org, idx) => org && (
                  <OrganizationBadge 
                    key={`${org.name}-${idx}`}
                    organization={org}
                    size="sm"
                    showIcon={!firstDisplayName}
                  />
                ))}
                {organizations.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{organizations.length - 2} orgs</span>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">{allAssignees}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}