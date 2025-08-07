
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, DollarSign, Clock, ChevronRight, User, Building2, AlertCircle, Paperclip } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { WorkOrderStatusBadge } from '@/components/ui/status-badge';
import { formatLocationDisplay, formatAddress, generateMapUrl } from '@/lib/utils/addressUtils';
import { MobileQuickActions, createMapAction, createMessageAction, createViewDetailsAction, createSubmitReportAction, createPhoneAction } from '@/components/work-orders/MobileQuickActions';

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
  contactPhone
}: MobileWorkOrderCardProps) {
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwipeActive, setIsSwipeActive] = React.useState(false);
  const [showActionsState, setShowActionsState] = React.useState(false);

  const minSwipeDistance = 80;
  const maxSwipeDistance = 120;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipeActive(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isSwipeActive) return;
    
    const currentX = e.targetTouches[0].clientX;
    const distance = touchStart - currentX;
    
    // Only allow left swipes for revealing actions
    if (distance > 0) {
      const offset = Math.min(distance, maxSwipeDistance);
      setSwipeOffset(offset);
    }
    
    setTouchEnd(currentX);
  };

  const onTouchEnd = () => {
    setIsSwipeActive(false);
    
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe) {
      // Show action buttons
      setShowActionsState(true);
      setSwipeOffset(maxSwipeDistance);
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } else {
      // Reset swipe state
      setShowActionsState(false);
      setSwipeOffset(0);
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

  // Build quick actions based on role and available data
  const quickActions = React.useMemo(() => {
    if (!showQuickActions) return [];
    
    const actions = [];
    
    // Map action (always available if address exists)
    if (mapUrl) {
      actions.push(createMapAction(workOrder));
    }
    
    // Role-specific actions
    switch (viewerRole) {
      case 'admin':
        if (contactPhone && onCall) {
          actions.push(createPhoneAction(contactPhone, 'Call'));
        }
        if (onMessage) {
          actions.push(createMessageAction(onMessage));
        }
        break;
        
      case 'partner':
        if (onMessage) {
          actions.push(createMessageAction(onMessage));
        }
        if (onViewDetails) {
          actions.push(createViewDetailsAction(onViewDetails));
        }
        break;
        
      case 'subcontractor':
        if (onMessage) {
          actions.push(createMessageAction(onMessage));
        }
        if (onSubmitReport && ['assigned', 'in_progress'].includes(workOrder.status)) {
          actions.push(createSubmitReportAction(onSubmitReport));
        }
        break;
    }
    
    return actions;
  }, [showQuickActions, viewerRole, mapUrl, contactPhone, onCall, onMessage, onViewDetails, onSubmitReport, workOrder.status]);

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

  return (
    <div className="relative mb-4 overflow-hidden">
      {/* Swipe Action Background */}
      {showActionsState && (
        <div className="absolute inset-y-0 right-0 flex items-center bg-primary text-primary-foreground px-4 z-10">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-primary-foreground hover:bg-primary-foreground/20 touch-target"
              onClick={(e) => {
                e.stopPropagation();
                if (workOrder.status === 'assigned') {
                  // Start work action
                } else if (workOrder.status === 'in_progress') {
                  // Submit report action
                }
                setShowActionsState(false);
                setSwipeOffset(0);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <Card 
        className="touch-manipulation active:scale-95 transition-all duration-200 min-h-[48px] card-hover touch-action-pan-y"
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isSwipeActive ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={showActionsState ? undefined : handleTap}
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
              <WorkOrderStatusBadge 
                status={workOrder.status}
                size="sm"
                showIcon={false}
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

          {/* Enhanced organization context with team member indicator */}
          {shouldShowField('organization') && (
            <>
              {viewerRole === 'subcontractor' && workOrder.organizations && (
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
              {viewerRole === 'partner' && workOrder.assigned_organizations && (
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
              {/* Show team assignment for organization-wide assignments */}
              {viewerRole === 'subcontractor' && workOrder.work_order_assignments?.some(a => a.assignment_type === 'organization') && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Team assignment</span>
                  <Badge variant="secondary" className="text-xs">
                    Organization-wide
                  </Badge>
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

        {/* Static Action Buttons */}
        {showActionsDefault && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="default" variant="outline" className="flex-1 mobile-button touch-target">
              View Details
            </Button>
            {viewerRole === 'subcontractor' && workOrder.status === 'assigned' && (
              <Button size="default" className="flex-1 mobile-button touch-target">
                Start Work
              </Button>
            )}
            {viewerRole === 'subcontractor' && workOrder.status === 'in_progress' && (
              <Button size="default" className="flex-1 mobile-button touch-target">
                Submit Report
              </Button>
            )}
            {viewerRole === 'partner' && workOrder.status === 'received' && (
              <Button size="default" className="flex-1 mobile-button touch-target">
                Assign
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Quick Actions Footer */}
      <MobileQuickActions actions={quickActions} />
    </Card>
    </div>
  );
}
