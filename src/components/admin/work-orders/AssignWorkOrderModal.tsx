/**
 * AssignWorkOrderModal - Modal component for assigning work orders to employees or organizations
 * 
 * PURPOSE:
 * This component provides a comprehensive interface for assigning work orders to either individual
 * employees or entire organizations. It supports bulk assignment operations and manages the complete
 * assignment lifecycle.
 * 
 * ASSIGNMENT MODES:
 * 1. Individual Assignment - Assign directly to specific employees with their personal workload tracking
 * 2. Organization Assignment - Assign to organizations with automatic user selection or placeholder handling
 * 
 * KEY FEATURES:
 * - Radio group selection between individual and organization assignment types
 * - Real-time search and filtering for employees and organizations  
 * - Current assignment display with ability to remove existing assignments
 * - Mobile-responsive design using Sheet component for mobile and Dialog for desktop
 * - Workload tracking and visual indicators for employee availability
 * - Empty state handling when no assignees are available
 * - Comprehensive error handling and validation
 * 
 * REFACTORING IMPROVEMENTS:
 * - Added mobile optimization with touch-friendly 44px minimum tap targets
 * - Implemented sticky header/footer for mobile navigation
 * - Added comprehensive search functionality with debouncing
 * - Improved TypeScript type safety and error handling
 * - Enhanced UI consistency with shadcn/ui component patterns
 * - Added proper loading states using TableSkeleton component
 * - Implemented workload color coding and status indicators
 * 
 * PROPS:
 * - isOpen: Controls modal visibility
 * - onClose: Callback function to close the modal
 * - workOrders: Array of work orders to be assigned
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { Users, Briefcase, Clock, Mail, UserCheck, Info, AlertCircle, RefreshCw, Building, User, Search, Filter, X, Plus } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useAllAssignees, type AssigneeData } from '@/hooks/useEmployeesForAssignment';
import { useWorkOrderAssignmentMutations } from '@/hooks/useWorkOrderAssignments';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { useAuth } from '@/contexts/AuthContext';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
};

interface AssignWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
}

export function AssignWorkOrderModal({ isOpen, onClose, workOrders }: AssignWorkOrderModalProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  // Assignment type state
  const [assignmentType, setAssignmentType] = useState<'individual' | 'organization'>('individual');
  
  // Search state for organizations
  const [searchQuery, setSearchQuery] = useState('');
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { bulkAddAssignments, bulkRemoveAssignments } = useWorkOrderAssignmentMutations();
  const { data: subcontractorOrgs = [], isLoading: isLoadingOrgs } = useSubcontractorOrganizations();
  
  // Validate work orders data
  const hasValidWorkOrders = workOrders && workOrders.length > 0;
  const tradeName = hasValidWorkOrders ? workOrders[0]?.trades?.name : undefined;
  
  const { employees, isLoading } = useAllAssignees();
  
  // Check if any work orders have existing assignments
  const [hasExistingAssignments, setHasExistingAssignments] = useState(false);
  
  // State for current assignments display
  interface CurrentAssignment {
    id: string;
    assigned_to: string;
    assignment_type: string;
    assignee_profile: { id: string; first_name: string; last_name: string } | null;
    assigned_organization: { id: string; name: string; organization_type: string } | null;
  }
  const [currentAssignments, setCurrentAssignments] = useState<CurrentAssignment[]>([]);
  

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setValidationErrors([]);
      setNetworkError(null);
      
      if (!hasValidWorkOrders) {
        setValidationErrors(['No valid work orders provided']);
        return;
      }

      // Fetch existing assignments when modal opens
      const fetchExistingAssignments = async () => {
        try {
          const workOrderIds = workOrders.map(wo => wo.id);
          const { data: existingAssignments } = await supabase
            .from('work_order_assignments')
            .select(`
              id,
              assigned_to,
              assigned_organization_id,
              assignment_type,
              notes,
              profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name),
              organizations!work_order_assignments_assigned_organization_id_fkey(id, name, organization_type)
            `)
            .in('work_order_id', workOrderIds);

          if (existingAssignments && existingAssignments.length > 0) {
            const individualAssignments: string[] = [];
            const organizationAssignments: string[] = [];
            
            // Transform assignments for display
            const formattedAssignments = existingAssignments.map(assignment => ({
              id: assignment.id,
              assigned_to: assignment.assigned_to,
              assignment_type: assignment.assignment_type || 'assigned',
              assignee_profile: assignment.profiles,
              assigned_organization: assignment.organizations
            }));
            
            setCurrentAssignments(formattedAssignments);

            existingAssignments.forEach(assignment => {
              // Check if this is a placeholder assignment by looking for the placeholder text in notes
              const isPlaceholder = assignment.notes && assignment.notes.includes('no active users - placeholder assignment');
              
              if (isPlaceholder && assignment.assigned_organization_id) {
                // For placeholder assignments, only select the organization
                organizationAssignments.push(assignment.assigned_organization_id);
              } else if (!assignment.assigned_organization_id) {
                // For individual assignments (no organization), select the user
                individualAssignments.push(assignment.assigned_to);
              } else if (assignment.assigned_organization_id && !isPlaceholder) {
                // For organization assignments with real users, select the organization
                organizationAssignments.push(assignment.assigned_organization_id);
              }
            });

            setSelectedAssignees([...new Set(individualAssignments)]);
            setSelectedOrganizations([...new Set(organizationAssignments)]);
            setHasExistingAssignments(true);
          } else {
            // No existing assignments
            setCurrentAssignments([]);
            setSelectedAssignees([]);
            setSelectedOrganizations([]);
            setHasExistingAssignments(false);
          }
        } catch (error) {
          setCurrentAssignments([]);
          setSelectedAssignees([]);
          setSelectedOrganizations([]);
          setHasExistingAssignments(false);
        }
      };

      fetchExistingAssignments();
    } else {
      // Reset when modal closes
      setSelectedAssignees([]);
      setSelectedOrganizations([]);
      setHasExistingAssignments(false);
    }
  }, [isOpen, hasValidWorkOrders, workOrders]);

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(assigneeId) 
        ? prev.filter(id => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const toggleOrganization = (orgId: string) => {
    setSelectedOrganizations(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  const handleAssignmentTypeChange = (type: 'individual' | 'organization') => {
    setAssignmentType(type);
    // Clear selections when switching types
    if (type === 'individual') {
      setSelectedOrganizations([]);
    } else {
      setSelectedAssignees([]);
    }
  };

  const selectAllEmployees = () => {
    const employeeIds = employees.map(emp => emp.id);
    setSelectedAssignees(employeeIds);
  };

  const clearAllSelections = () => {
    setSelectedAssignees([]);
    setSelectedOrganizations([]);
  };

  const handleAssign = async () => {
    try {
      setValidationErrors([]);

      // Safety check for current user profile
      if (!profile?.id) {
        throw new Error('Current user profile not found - cannot create assignments');
      }

      // Always clear ALL existing assignments first
      await bulkRemoveAssignments.mutateAsync(workOrders.map(wo => wo.id));

      const assignments = [];

      // Only create assignments for the selected type
      if (assignmentType === 'individual' && selectedAssignees.length > 0) {
        // Create individual employee assignments
        for (const assigneeId of selectedAssignees) {
          const assignee = employees.find(e => e.id === assigneeId);
          if (!assignee) continue;

          for (const wo of workOrders) {
            assignments.push({
              work_order_id: wo.id,
              assigned_to: assigneeId,
              assigned_organization_id: null, // Individual assignment
              assignment_type: 'assigned' as const,
              notes: notes || `Assigned to employee: ${assignee.first_name} ${assignee.last_name}`
            });
          }
        }
      } else if (assignmentType === 'organization' && selectedOrganizations.length > 0) {
        // Create organization-level assignments
        for (const orgId of selectedOrganizations) {
          const org = subcontractorOrgs.find(o => o.id === orgId);
          if (!org) continue;

          for (const wo of workOrders) {
            // For organizations with users, use the first active user
            // For organizations without users, use current user as placeholder
            const assignedTo = org.first_active_user_id || profile.id;
            
            const isPlaceholder = !org.first_active_user_id;
            const orgNotes = isPlaceholder 
              ? `${notes}${notes ? ' - ' : ''}Assigned to organization ${org.name} (no active users - placeholder assignment)`
              : `${notes}${notes ? ' - ' : ''}Assigned to organization ${org.name}`;

            assignments.push({
              work_order_id: wo.id,
              assigned_to: assignedTo,
              assigned_organization_id: orgId, // Always set for organization assignments
              assignment_type: 'assigned' as const,
              notes: orgNotes
            });
          }
        }
      }

      // Update work order status based on assignments
      if (assignments.length > 0) {
        // Create assignments and update status to 'assigned'
        await bulkAddAssignments.mutateAsync(assignments);
        
        await supabase
          .from('work_orders')
          .update({
            status: 'assigned',
            date_assigned: new Date().toISOString()
          })
          .in('id', workOrders.map(wo => wo.id));
      } else {
        // No new assignments, set status back to 'received'
        await supabase
          .from('work_orders')
          .update({
            status: 'received' as const,
            date_assigned: null,
          })
          .in('id', workOrders.map(wo => wo.id));
      }

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Assignment failed. Please try again.';
      setValidationErrors([errorMessage]);
      setNetworkError(errorMessage);
    }
  };

  const selectedAssigneeData = useMemo(() => 
    employees.filter(employee => selectedAssignees.includes(employee.id)),
    [employees, selectedAssignees]
  );
  
  const selectedOrganizationData = useMemo(() => 
    subcontractorOrgs.filter(org => selectedOrganizations.includes(org.id)),
    [subcontractorOrgs, selectedOrganizations]
  );

  // Filter subcontractor organizations - only show those with active users
  const filteredSubcontractorOrgs = useMemo(() => {
    let filtered = subcontractorOrgs.filter(org => org.active_user_count > 0);

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(query) ||
        org.contact_email?.toLowerCase().includes(query) ||
        org.first_active_user?.full_name.toLowerCase().includes(query)
      );
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [subcontractorOrgs, debouncedSearchQuery]);

  const getWorkloadColor = (workload: number) => {
    if (workload === 0) return 'text-green-600';
    if (workload <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWorkloadLabel = (workload: number) => {
    if (workload === 0) return 'Available';
    if (workload <= 3) return 'Busy';
    return 'Very Busy';
  };

  const removeCurrentAssignment = async (assignmentId: string) => {
    try {
      await supabase
        .from('work_order_assignments')
        .delete()
        .eq('id', assignmentId);
      
      // Refresh assignments by re-fetching
      const workOrderIds = workOrders.map(wo => wo.id);
      const { data: existingAssignments } = await supabase
        .from('work_order_assignments')
        .select(`
          id,
          assigned_to,
          assigned_organization_id,
          assignment_type,
          notes,
          profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name),
          organizations!work_order_assignments_assigned_organization_id_fkey(id, name, organization_type)
        `)
        .in('work_order_id', workOrderIds);

      if (existingAssignments && existingAssignments.length > 0) {
        const formattedAssignments = existingAssignments.map(assignment => ({
          id: assignment.id,
          assigned_to: assignment.assigned_to,
          assignment_type: assignment.assignment_type || 'assigned',
          assignee_profile: assignment.profiles,
          assigned_organization: assignment.organizations
        }));
        setCurrentAssignments(formattedAssignments);
      } else {
        setCurrentAssignments([]);
      }
    } catch (error) {
      setNetworkError('Failed to remove assignment. Please try again.');
    }
  };

  // Render Work Order Summary Component
  const renderWorkOrderSummary = () => (
    <Card className={isMobile ? "mb-4" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4" />
          <span className="font-medium">Work Order{workOrders.length > 1 ? 's' : ''} Summary</span>
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{workOrders.length} item{workOrders.length > 1 ? 's' : ''}</Badge>
        </div>
        
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Trade:</span>
              <span className="ml-2 font-medium">{tradeName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Organization:</span>
              <span className="ml-2">{workOrders[0]?.organizations?.name || 'N/A'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render main content
  const renderContent = () => (
    <div className="space-y-6">
      {/* Error States */}
      {!hasValidWorkOrders && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Invalid Work Orders</span>
          </div>
          <p className="text-sm text-destructive mt-1">No valid work orders provided for assignment.</p>
        </div>
      )}

      {networkError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Network Error</span>
          </div>
          <p className="text-sm text-destructive mt-1">{networkError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setNetworkError(null)} 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Work Order Summary - Only show on desktop, mobile shows in header */}
      {hasValidWorkOrders && !isMobile && renderWorkOrderSummary()}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="text-sm text-destructive space-y-1">
            {validationErrors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isLoadingOrgs) && (
        <div className="space-y-4">
          <TableSkeleton rows={5} columns={1} />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Loading assignees...</p>
          </div>
        </div>
      )}

      {/* Content when loaded */}
      {!isLoading && !isLoadingOrgs && (
        <>
          {/* Current Assignments Section */}
          {currentAssignments && currentAssignments.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Current Assignments</span>
                </div>
                <div className="space-y-2">
                  {currentAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <AssigneeDisplay assignments={[assignment]} showIcons={false} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCurrentAssignment(assignment.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Remove assignment"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Current Assignments</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Not yet assigned
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment Type Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Assignment Type</span>
                </div>
                
                <RadioGroup 
                  value={assignmentType} 
                  onValueChange={handleAssignmentTypeChange}
                  className={`${isMobile ? 'flex flex-col space-y-4' : 'flex gap-6'}`}
                  disabled={isLoading || isLoadingOrgs}
                >
                  <div className={`flex items-center space-x-2 ${isMobile ? 'min-h-[44px]' : ''}`}>
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Assign to Individuals
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-2 ${isMobile ? 'min-h-[44px]' : ''}`}>
                    <RadioGroupItem value="organization" id="organization" />
                    <Label htmlFor="organization" className="flex items-center gap-2 cursor-pointer">
                      <Building className="h-4 w-4" />
                      Assign to Organization
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Individual Assignment Section */}
          {assignmentType === 'individual' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Select Employees</span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 ${isMobile ? 'min-h-[44px]' : ''}`}
                  disabled={isLoading || isLoadingOrgs}
                />
              </div>

              {employees.length === 0 ? (
                <EmptyTableState
                  icon={Users}
                  title="No Employees Available"
                  description="There are no employees available for assignment at this time."
                  colSpan={1}
                />
              ) : (
                <div className="space-y-4">
                  {/* Group employees by organization */}
                  {Object.entries(
                    employees
                      .filter(emp => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          emp.first_name.toLowerCase().includes(query) ||
                          emp.last_name.toLowerCase().includes(query) ||
                          emp.email.toLowerCase().includes(query)
                        );
                      })
                      .reduce((groups: Record<string, AssigneeData[]>, emp) => {
                        const orgName = emp.organization || 'Internal';
                        if (!groups[orgName]) groups[orgName] = [];
                        groups[orgName].push(emp);
                        return groups;
                      }, {})
                  ).map(([orgName, groupEmployees], index) => (
                    <div key={orgName}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">{orgName}</h4>
                      </div>
                      <div className="space-y-2">
                        {groupEmployees.map((employee) => (
                          <div key={employee.id} className={`flex items-center space-x-3 p-2 rounded-md hover:bg-accent ${isMobile ? 'min-h-[44px]' : ''}`}>
                            <Checkbox
                              checked={selectedAssignees.includes(employee.id)}
                              onCheckedChange={() => toggleAssignee(employee.id)}
                              disabled={isLoading || isLoadingOrgs}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {employee.first_name} {employee.last_name}
                                </span>
                                <OrganizationBadge 
                                  organization={{ 
                                    name: employee.organization, 
                                    organization_type: 'internal' 
                                  }} 
                                  size="sm" 
                                />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {employee.email}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Organization Assignment Section */}
          {assignmentType === 'organization' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="font-medium">Subcontractor Organizations</span>
                <Badge variant="outline">
                  {filteredSubcontractorOrgs.length} available
                </Badge>
              </div>

              {/* Search Input */}
              {subcontractorOrgs.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${isMobile ? 'min-h-[44px]' : ''}`}
                    disabled={isLoading || isLoadingOrgs}
                  />
                </div>
              )}

              {filteredSubcontractorOrgs.length === 0 ? (
                subcontractorOrgs.length === 0 ? (
                  <EmptyTableState
                    icon={Building}
                    title="No subcontractor organizations"
                    description="Create subcontractor organizations to assign work orders"
                    colSpan={1}
                  />
                ) : (
                  <EmptyTableState
                    icon={Filter}
                    title="No organizations found"
                    description="No organizations with active users match your search"
                    colSpan={1}
                    action={{
                      label: "Clear search",
                      onClick: () => setSearchQuery('')
                    }}
                  />
                )
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className={isMobile ? "max-h-80 overflow-y-auto px-6 py-4" : ""}>
                      <ScrollArea className={isMobile ? "" : "max-h-80 px-6 py-4"}>
                        <div className="space-y-2">
                          {filteredSubcontractorOrgs.map((org) => (
                            <div key={org.id} className={`flex items-center space-x-3 p-2 rounded-md hover:bg-accent ${isMobile ? 'min-h-[44px]' : ''}`}>
                              <Checkbox
                                id={`org-${org.id}`}
                                checked={selectedOrganizations.includes(org.id)}
                                onCheckedChange={() => toggleOrganization(org.id)}
                                disabled={isLoading || isLoadingOrgs}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <OrganizationBadge 
                                    organization={{ 
                                      name: org.name, 
                                      organization_type: 'subcontractor' 
                                    }} 
                                    size="sm"
                                    showIcon={false}
                                    showType={false}
                                  />
                                  <span className="font-medium">
                                    {org.name} ({org.active_user_count} employee{org.active_user_count !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Clear All Button - Only show when selections exist */}
          {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) && (
            <div className="flex justify-center">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={clearAllSelections}
                className={isMobile ? 'min-h-[44px] w-full' : ''}
              >
                Clear All Selections
              </Button>
            </div>
          )}

          {/* Assignment Notes */}
          <div className="space-y-2">
            <Label htmlFor="assignment-notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="assignment-notes"
              placeholder="Add any notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={isMobile ? 'min-h-[88px]' : ''}
            />
          </div>
        </>
      )}

      {/* No Data Available - when both are empty */}
      {!isLoading && !isLoadingOrgs && employees.length === 0 && subcontractorOrgs.length === 0 && (
        <EmptyTableState 
          icon={Users}
          title="No assignees available"
          description="Create employees or subcontractor organizations to assign work orders"
          action={{
            label: "Create Employee",
            onClick: () => navigate('/admin/employees'),
            icon: Plus
          }}
          colSpan={1}
        />
      )}
    </div>
  );

  // Render footer actions
  const renderFooter = () => (
    <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'justify-end'}`}>
      <Button 
        variant="outline" 
        onClick={onClose}
        disabled={bulkAddAssignments.isPending || bulkRemoveAssignments.isPending}
        className={isMobile ? 'min-h-[44px] order-2' : ''}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleAssign}
        disabled={!hasValidWorkOrders || 
                 (bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) || 
                 (!hasExistingAssignments && 
                  ((assignmentType === 'individual' && selectedAssignees.length === 0) || 
                   (assignmentType === 'organization' && selectedOrganizations.length === 0)))}
        className={isMobile ? 'min-h-[44px] order-1' : ''}
      >
        {(bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            {((assignmentType === 'individual' && selectedAssignees.length > 0) || 
              (assignmentType === 'organization' && selectedOrganizations.length > 0)) ? 'Assigning...' : 'Clearing...'}
          </>
        ) : (
          <>
            {hasExistingAssignments
              ? ((assignmentType === 'individual' && selectedAssignees.length > 0) || 
                 (assignmentType === 'organization' && selectedOrganizations.length > 0))
                ? 'Update Assignment'
                : 'Clear Assignment'
              : 'Assign'}
          </>
        )}
      </Button>
    </div>
  );

  return (
    <ErrorBoundary fallback={
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load assignment modal</p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">Close</Button>
      </div>
    }>
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="bottom" className="h-[95vh] flex flex-col">
            <SheetHeader className="sticky top-0 bg-background border-b pb-4 z-10">
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) ? 'Update Assignment' : 'Assign Work Order'}{hasValidWorkOrders && workOrders.length > 1 ? 's' : ''}
              </SheetTitle>
              <SheetDescription>
                Select employees individually or assign to subcontractor organizations
              </SheetDescription>
              {hasValidWorkOrders && renderWorkOrderSummary()}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-0 py-4">
              {renderContent()}
            </div>

            <SheetFooter className="sticky bottom-0 bg-background border-t pt-4 z-10">
              {renderFooter()}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) ? 'Update Assignment' : 'Assign Work Order'}{hasValidWorkOrders && workOrders.length > 1 ? 's' : ''}
              </DialogTitle>
              <DialogDescription>
                Select employees individually or assign to subcontractor organizations
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4 h-[calc(85vh-180px)] sm:h-[calc(80vh-180px)]">
              {renderContent()}
            </ScrollArea>

            <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
              {renderFooter()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ErrorBoundary>
  );
}