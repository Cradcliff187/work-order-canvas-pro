import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, DollarSign, Clock, ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { formatLocationDisplay } from '@/lib/utils/addressUtils';

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
  trades?: { name: string };
  subcontractor_invoice_amount?: number;
  assigned_user?: { 
    first_name: string; 
    last_name: string; 
    user_type?: string; 
  };
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

interface MobileWorkOrderCardProps {
  workOrder: WorkOrder;
  onTap: (workOrder: WorkOrder) => void;
  onSwipeLeft?: (workOrder: WorkOrder) => void;
  onSwipeRight?: (workOrder: WorkOrder) => void;
  showActions?: boolean;
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
  showActions = false 
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

  return (
    <Card 
      className="mb-4 touch-manipulation active:scale-95 transition-transform duration-150"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleTap}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
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
            </div>
            <h3 className="font-semibold text-sm truncate">
              {workOrder.title}
            </h3>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground ml-2 flex-shrink-0" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {formatLocationDisplay(workOrder)}
            </span>
          </div>

          {workOrder.trades && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{workOrder.trades.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <AssigneeDisplay 
              assignments={workOrder.work_order_assignments}
              assignedUser={workOrder.assigned_user}
              assignedOrganization={workOrder.assigned_organizations}
              showIcons={false}
              showOrganization={true}
            />
          </div>

          {/* Show submitting organization for subcontractors */}
          {workOrder.organizations && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">From:</span>
              <OrganizationBadge 
                organization={workOrder.organizations}
                size="sm"
                showIcon={true}
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>
              Submitted {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
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

          {workOrder.subcontractor_invoice_amount && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>${workOrder.subcontractor_invoice_amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="sm" variant="outline" className="flex-1">
              View Details
            </Button>
            {workOrder.status === 'assigned' && (
              <Button size="sm" className="flex-1">
                Start Work
              </Button>
            )}
            {workOrder.status === 'in_progress' && (
              <Button size="sm" className="flex-1">
                Submit Report
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}