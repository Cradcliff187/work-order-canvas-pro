import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, DollarSign, Clock, ChevronRight, User, Building2, AlertCircle, Paperclip, Check, Trash2, Navigation } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { formatLocationDisplay, formatAddress, generateMapUrl } from '@/lib/utils/addressUtils';
import { MobileQuickActions, createMapAction, createMessageAction, createViewDetailsAction, createSubmitReportAction, createPhoneAction } from '@/components/work-orders/MobileQuickActions';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description?: string;
  status: WorkOrderStatus;
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
  subcontractor_bill_amount?: number;
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
  showQuickActions?: boolean;
  // New customization props
  showAssignee?: boolean;
  showOrganization?: boolean;
  showInvoiceAmount?: boolean;
  showTrade?: boolean;
  showLocationNumber?: boolean;
  showDaysOld?: boolean;
  fieldsToShow?: Array<FieldType>;
  viewerRole?: 'partner' | 'subcontractor' | 'admin';
  // Action callbacks
  onMessage?: () => void;
  onViewDetails?: () => void;
  onSubmitReport?: () => void;
  onCall?: () => void;
  // Contact information for calls
  contactPhone?: string;
  className?: string;
}


export function MobileWorkOrderCard({ 
  workOrder, 
  onTap, 
  onSwipeLeft, 
  onSwipeRight,
  showActions: showActionsDefault = false,
  showQuickActions = false,
  showAssignee = true,
  showOrganization = true,
  showInvoiceAmount = true,
  showTrade = true,
  showLocationNumber = false,
  showDaysOld = false,
  fieldsToShow,
  viewerRole = 'subcontractor',
  onMessage,
  onViewDetails,
  onSubmitReport,
  onCall,
  contactPhone,
  className
}: MobileWorkOrderCardProps) {
  const isMobile = useIsMobile();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleSwipeLeft = () => {
    if ('vibrate' in navigator) (navigator as any).vibrate?.(20);
    setConfirmOpen(true);
  };

  const handleSwipeRight = () => {
    if ('vibrate' in navigator) (navigator as any).vibrate?.(20);
    onSwipeRight?.(workOrder);
  };

  const handleTap = () => {
    // Only add haptic feedback on mobile devices
    if (isMobile && 'vibrate' in navigator) {
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

  // Build quick actions based on role and available data
  const quickActions = React.useMemo(() => {
    if (!showQuickActions) return [] as any[];

    const actions: any[] = [];

    // Map action (available if address exists)
    if (mapUrl) {
      actions.push(createMapAction(workOrder));
    }

    // Always include core actions when provided
    if (onMessage) {
      actions.push(createMessageAction(onMessage));
    }
    if (onViewDetails) {
      actions.push(createViewDetailsAction(onViewDetails));
    }

    // Role-specific extras
    if (viewerRole === 'admin') {
      if (contactPhone && onCall) {
        actions.push(createPhoneAction(contactPhone, 'Call'));
      }
    } else if (viewerRole === 'subcontractor') {
      if (onSubmitReport && ['assigned', 'in_progress'].includes(workOrder.status)) {
        actions.push(createSubmitReportAction(onSubmitReport));
      }
    }

    return actions;
  }, [showQuickActions, mapUrl, onMessage, onViewDetails, viewerRole, contactPhone, onCall, onSubmitReport, workOrder.status, workOrder]);

  // Get full address for location display
  const getLocationDisplay = () => {
    const fullAddress = formatAddress(workOrder);
    if (fullAddress && fullAddress !== 'N/A') {
      return fullAddress;
    }
    // Fallback to compact location display if no address
    const compactLocation = formatLocationDisplay(workOrder);
    return compactLocation !== 'N/A' ? compactLocation : 'No location specified';
  };

  const cardContent = (
    <Card
      className="w-full max-w-full overflow-hidden min-h-[48px] card-hover"
      onClick={handleTap}
    >
      <CardContent className="p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {workOrder.work_order_number && (
                <Badge variant="default" className="font-mono font-semibold bg-primary/90 text-primary-foreground text-xs truncate max-w-[200px]">
                  {workOrder.work_order_number}
                </Badge>
              )}
              <WorkOrderStatusBadge 
                status={workOrder.status}
                size="sm"
                showIcon={false}
                workOrder={workOrder}
              />
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
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3 text-sm min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">
                {getLocationDisplay()}
              </span>
            </div>
            {formatAddress(workOrder) && formatAddress(workOrder) !== 'N/A' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (mapUrl) window.open(mapUrl, '_blank');
                }}
              >
                <Navigation className="h-3 w-3 mr-1" />
                Directions
              </Button>
            )}
          </div>

          {shouldShowField('trade') && workOrder.trades && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{workOrder.trades.name}</span>
            </div>
          )}

          {shouldShowField('assignee') && (
            <div className="flex items-center gap-2 text-sm min-w-0">
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
                  showOrganization={viewerRole !== 'partner'}
                />
              </div>
            </div>
          )}

          {shouldShowField('organization') && (
            <>
              {viewerRole === 'subcontractor' && workOrder.organizations && (
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">From:</span>
                  <OrganizationBadge 
                    organization={workOrder.organizations}
                    size="sm"
                    showIcon={false}
                  />
                </div>
              )}
              {viewerRole === 'partner' && workOrder.assigned_organizations && (
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <OrganizationBadge 
                    organization={workOrder.assigned_organizations}
                    size="sm"
                    showIcon={false}
                  />
                </div>
              )}
              {viewerRole === 'admin' && (
                <>
                  {workOrder.organizations && (
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">From:</span>
                      <OrganizationBadge 
                        organization={workOrder.organizations}
                        size="sm"
                        showIcon={false}
                      />
                    </div>
                  )}
                  {workOrder.assigned_organizations && (
                    <div className="flex items-center gap-2 text-sm min-w-0">
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
              {viewerRole === 'subcontractor' && workOrder.work_order_assignments?.some(a => a.assignment_type === 'organization') && (
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Team assignment</span>
                  <Badge variant="secondary" className="text-xs">
                    Organization-wide
                  </Badge>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 text-sm min-w-0">
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
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>
                Due {format(new Date(workOrder.estimated_completion_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {shouldShowField('invoice') && workOrder.subcontractor_bill_amount && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>${workOrder.subcontractor_bill_amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {showActionsDefault && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="default" variant="outline" className="flex-1 mobile-button touch-target">
              View Details
            </Button>
          </div>
        )}
      </CardContent>
      {showQuickActions && quickActions.length > 0 && (
        <MobileQuickActions actions={quickActions} />
      )}
    </Card>
  );

  // If swipe actions are enabled, wrap in SwipeableListItem
  if (isMobile && (onSwipeLeft || onSwipeRight)) {
    return (
      <div className={cn("relative mb-4 w-full max-w-full", className)}>
        <SwipeableListItem
          onSwipeLeft={onSwipeLeft ? handleSwipeLeft : undefined}
          onSwipeRight={onSwipeRight ? handleSwipeRight : undefined}
          leftAction={onSwipeLeft ? { icon: Trash2, label: 'Delete', color: 'destructive' } : undefined}
          rightAction={onSwipeRight ? { icon: Check, label: 'Complete', color: 'success' } : undefined}
          disabled={false}
          className="mb-0"
        >
          {cardContent}
        </SwipeableListItem>
        
        <DeleteConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={async () => {
            await onSwipeLeft?.(workOrder);
            setConfirmOpen(false);
          }}
          itemType="work order"
          itemName={workOrder.work_order_number || workOrder.title}
          isLoading={false}
        />
      </div>
    );
  }

  // Non-swipeable version for desktop or when swipe actions are disabled
  return (
    <div className={cn("relative mb-4 w-full max-w-full", className)}>
      {cardContent}
    </div>
  );
}