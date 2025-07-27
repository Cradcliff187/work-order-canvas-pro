
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, DollarSign, Clock, ChevronRight, User, Building2, AlertCircle, Paperclip } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { formatLocationDisplay, generateMapUrl } from '@/lib/utils/addressUtils';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description?: string;
  status: string;
  store_location?: string;
  partner_location_number?: string;
  location_name?: string;
  // Structured address fields
  location_street_address?: string;
  location_city?: string;
  location_state?: string;
  location_zip_code?: string;
  // Legacy address fields
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  estimated_completion_date?: string;
  date_submitted: string;
  attachment_count?: number;
  trades?: { name: string };
  subcontractor_invoice_amount?: number;
  work_order_assignments?: Array<{
    assigned_to: string;
    assignment_type: string;
    assignee_profile: {
      first_name: string;
      last_name: string;
    } | null;
    assigned_organization?: {
      name: string;
      organization_type?: 'partner' | 'subcontractor' | 'internal';
    } | null;
  }> | null;
  organizations?: {
    name: string;
    organization_type?: 'partner' | 'subcontractor' | 'internal';
  } | null;
  assigned_organizations?: {
    name: string;
    organization_type?: 'partner' | 'subcontractor' | 'internal';
  } | null;
}

type FieldType = 'assignee' | 'organization' | 'invoice' | 'trade' | 'location' | 'daysOld';

interface MobileWorkOrderCardProps {
  workOrder: WorkOrder;
  onTap: (workOrder: WorkOrder) => void;
  onSwipeLeft?: (workOrder: WorkOrder) => void;
  onSwipeRight?: (workOrder: WorkOrder) => void;
  showActions?: boolean;
  // New customization props
  showAssignee?: boolean;
  showOrganization?: boolean;
  showInvoiceAmount?: boolean;
  showTrade?: boolean;
  showLocationNumber?: boolean;
  showDaysOld?: boolean;
  fieldsToShow?: Array<FieldType>;
  userType?: 'partner' | 'subcontractor' | 'admin';
}

const statusColors = {
  received: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  estimate_needed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function MobileWorkOrderCard({ 
  workOrder, 
  onTap, 
  onSwipeLeft, 
  onSwipeRight,
  showActions = false,
  showAssignee = true,
  showOrganization = true,
  showInvoiceAmount = true,
  showTrade = true,
  showLocationNumber = false,
  showDaysOld = false,
  fieldsToShow,
  userType = 'subcontractor'
}: MobileWorkOrderCardProps) {
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft(workOrder);
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight(workOrder);
    }
  };

  const handleTap = () => {
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTap(workOrder);
  };

  // Determine which fields to show based on props or fieldsToShow array
  const shouldShowField = (field: FieldType): boolean => {
    if (fieldsToShow) {
      return fieldsToShow.includes(field);
    }
    
    switch (field) {
      case 'assignee':
        return showAssignee;
      case 'organization':
        return showOrganization;
      case 'invoice':
        return showInvoiceAmount;
      case 'trade':
        return showTrade;
      case 'location':
        return showLocationNumber;
      case 'daysOld':
        return showDaysOld;
      default:
        return false;
    }
  };

  const daysOld = differenceInDays(new Date(), new Date(workOrder.date_submitted));
  const isOverdue = daysOld > 7; // Consider 7+ days old as overdue
  const mapUrl = generateMapUrl(workOrder);

  // Enhanced location display with partner location number
  const getLocationDisplay = () => {
    const baseLocation = formatLocationDisplay(workOrder);
    if (workOrder.partner_location_number && baseLocation !== 'N/A') {
      return `#${workOrder.partner_location_number} - ${baseLocation}`;
    }
    return baseLocation;
  };

  return (
    <Card 
      className="mb-4 touch-manipulation active:scale-95 transition-transform duration-150 min-h-[44px] card-hover"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleTap}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {workOrder.work_order_number && (
                <Badge variant="default" className="font-mono font-semibold bg-primary/90 text-primary-foreground text-xs">
                  {workOrder.work_order_number}
                </Badge>
              )}
              <Badge 
                variant="secondary"
                className={statusColors[workOrder.status as keyof typeof statusColors]}
              >
                {workOrder.status.replace('_', ' ')}
              </Badge>
              {(workOrder.attachment_count || 0) > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {(workOrder.attachment_count || 0) > 1 && (
                    <span className="text-xs">{workOrder.attachment_count}</span>
                  )}
                </div>
              )}
              {shouldShowField('daysOld') && isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {daysOld} days
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm truncate">
              {workOrder.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {mapUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(mapUrl, '_blank');
                }}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {getLocationDisplay()}
            </span>
          </div>

          {shouldShowField('trade') && workOrder.trades && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{workOrder.trades.name}</span>
            </div>
          )}

          {shouldShowField('assignee') && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <AssigneeDisplay 
                  assignments={(workOrder.work_order_assignments || []).map(assignment => ({
                    assigned_to: assignment.assigned_to,
                    assignment_type: assignment.assignment_type,
                    assignee_profile: assignment.assignee_profile,
                    assigned_organization: assignment.assigned_organization
                  }))}
                  showIcons={false}
                  showOrganization={true}
                />
              </div>
            </div>
          )}

          {/* Show submitting organization for subcontractors, assigned organization for partners */}
          {shouldShowField('organization') && (
            <>
              {userType === 'subcontractor' && workOrder.organizations && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">From:</span>
                  <OrganizationBadge 
                    organization={workOrder.organizations}
                    size="sm"
                    showIcon={false}
                  />
                </div>
              )}
              {userType === 'partner' && workOrder.assigned_organizations && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <OrganizationBadge 
                    organization={workOrder.assigned_organizations}
                    size="sm"
                    showIcon={false}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>
              Submitted {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
              {shouldShowField('daysOld') && (
                <span className="text-muted-foreground ml-1">
                  ({daysOld} day{daysOld !== 1 ? 's' : ''} ago)
                </span>
              )}
            </span>
          </div>

          {workOrder.estimated_completion_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>
                Due {format(new Date(workOrder.estimated_completion_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {shouldShowField('invoice') && workOrder.subcontractor_invoice_amount && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>${workOrder.subcontractor_invoice_amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="default" variant="outline" className="flex-1 min-h-[44px]">
              View Details
            </Button>
            {userType === 'subcontractor' && workOrder.status === 'assigned' && (
              <Button size="default" className="flex-1 min-h-[44px]">
                Start Work
              </Button>
            )}
            {userType === 'subcontractor' && workOrder.status === 'in_progress' && (
              <Button size="default" className="flex-1 min-h-[44px]">
                Submit Report
              </Button>
            )}
            {userType === 'partner' && workOrder.status === 'received' && (
              <Button size="default" className="flex-1 min-h-[44px]">
                Assign
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
