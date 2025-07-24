// This is the CORRECTED FILE to replace: src/components/admin/work-orders/AssignWorkOrderModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Briefcase, Clock, Mail, UserCheck, Info, Filter, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, Building } from 'lucide-react';
import { useAllAssignees, type AssigneeData } from '@/hooks/useEmployeesForAssignment';
import { useWorkOrderAssignmentMutations } from '@/hooks/useWorkOrderAssignments';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const { bulkAddAssignments, bulkRemoveAssignments } = useWorkOrderAssignmentMutations();
  const { data: subcontractorOrgs = [], isLoading: isLoadingOrgs } = useSubcontractorOrganizations();
  
  // Validate work orders data
  const hasValidWorkOrders = workOrders && workOrders.length > 0;
  const tradeId = hasValidWorkOrders ? workOrders[0]?.trade_id : undefined;
  const tradeName = hasValidWorkOrders ? workOrders[0]?.trades?.name : undefined;
  
  const { employees, isLoading } = useAllAssignees();
  
  // Add comprehensive debugging for assignment data
  console.log('📊 Assignment Data:', {
    workOrders: workOrders?.length || 0,
    hasValidWorkOrders,
    employeesCount: employees.length,
    subcontractorOrgsCount: subcontractorOrgs.length,
    isLoading,
    isLoadingOrgs,
    employees: employees.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })),
    subcontractorOrgs: subcontractorOrgs.map(o => ({ id: o.id, name: o.name, users: o.active_users })),
    workOrderDetails: workOrders?.map(wo => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      assigned_to: wo.assigned_to,
      assigned_to_type: wo.assigned_to_type
    }))
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedAssignees([]);
      setSelectedOrganizations([]);
      setNotes('');
      setValidationErrors([]);
      setNetworkError(null);
      
      // Validate work orders on open
      if (!hasValidWorkOrders) {
        setValidationErrors(['No valid work orders provided']);
      }
    }
  }, [isOpen, hasValidWorkOrders]);

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

  const selectAllEmployees = () => {
    const employeeIds = employees.map(emp => emp.id);
    setSelectedAssignees(prev => {
      const nonEmployeeIds = prev.filter(id => !employeeIds.includes(id));
      return [...nonEmployeeIds, ...employeeIds];
    });
  };

  const clearAllSelections = () => {
    setSelectedAssignees([]);
    setSelectedOrganizations([]);
  };

  const handleAssign = async () => {
    // If no assignees or organizations selected, remove all assignments
    if (selectedAssignees.length === 0 && selectedOrganizations.length === 0) {
      await bulkRemoveAssignments.mutateAsync(workOrders.map(wo => wo.id));
      
      // Clear assigned_to in work_orders table and reset status
      await supabase
        .from('work_orders')
        .update({
          assigned_to: null,
          assigned_to_type: null,
          status: 'received' as const,
          date_assigned: null,
        })
        .in('id', workOrders.map(wo => wo.id));
      
      onClose();
      return;
    }

    try {
      setValidationErrors([]);

      // First remove all existing assignments for these work orders
      await bulkRemoveAssignments.mutateAsync(workOrders.map(wo => wo.id));

      // Collect all assignees (individual + from organizations)
      const allSelectedAssignees = [...selectedAssignees];
      
      // Add first active user from each selected organization
      for (const orgId of selectedOrganizations) {
        const org = subcontractorOrgs.find(o => o.id === orgId);
        if (org && org.first_active_user_id && !allSelectedAssignees.includes(org.first_active_user_id)) {
          allSelectedAssignees.push(org.first_active_user_id);
        }
      }

      // Prepare new assignments for all work orders and selected assignees
      const assignments = workOrders.flatMap(wo => 
        allSelectedAssignees.map((assigneeId) => {
          const assignee = employees.find(e => e.id === assigneeId);
          const isEmployee = assignee?.type === 'employee';
          
          // Check if this assignment is from an organization selection
          const fromOrganization = selectedOrganizations.some(orgId => {
            const org = subcontractorOrgs.find(o => o.id === orgId);
            return org?.first_active_user_id === assigneeId;
          });
          
          const selectedOrg = selectedOrganizations.find(orgId => {
            const org = subcontractorOrgs.find(o => o.id === orgId);
            return org?.first_active_user_id === assigneeId;
          });
          
          return {
            work_order_id: wo.id,
            assigned_to: assigneeId,
            assigned_organization_id: fromOrganization ? selectedOrg : null,
            assignment_type: 'assigned' as const,
            notes: fromOrganization ? `${notes}${notes ? ' - ' : ''}Assigned to organization` : notes
          };
        })
      );

      // Create all new assignments atomically - status will be automatically updated by trigger
      await bulkAddAssignments.mutateAsync(assignments);

      // Update work_orders table with lead assignee for backward compatibility (status handled by trigger)
      const leadAssignee = allSelectedAssignees[0];
      if (leadAssignee) {
        const assignee = employees.find(e => e.id === leadAssignee);
        const isFromOrganization = selectedOrganizations.some(orgId => {
          const org = subcontractorOrgs.find(o => o.id === orgId);
          return org?.first_active_user_id === leadAssignee;
        });
        const assignedToType: 'internal' | 'subcontractor' = assignee?.type === 'employee' ? 'internal' : 'subcontractor';
        
        await supabase
          .from('work_orders')
          .update({
            assigned_to: leadAssignee,
            assigned_to_type: assignedToType,
          })
          .in('id', workOrders.map(wo => wo.id));
      }

      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Assignment failed. Please try again.';
      setValidationErrors([errorMessage]);
      setNetworkError(errorMessage);
    }
  };


  // Memoize expensive calculations
  const selectedAssigneeData = useMemo(() => 
    employees.filter(employee => selectedAssignees.includes(employee.id)),
    [employees, selectedAssignees]
  );
  
  const selectedOrganizationData = useMemo(() => 
    subcontractorOrgs.filter(org => selectedOrganizations.includes(org.id)),
    [subcontractorOrgs, selectedOrganizations]
  );
  
  // Enhanced error handling for data loading with detailed debugging
  const hasDataError = !isLoading && !isLoadingOrgs && employees.length === 0 && subcontractorOrgs.length === 0;
  const isDataReady = !isLoading && !isLoadingOrgs && (employees.length > 0 || subcontractorOrgs.length > 0);
  
  // Add critical debugging for conditional rendering
  console.log('🔍 Conditional Rendering Debug:', {
    hasValidWorkOrders,
    isLoading,
    isLoadingOrgs,
    hasDataError,
    isDataReady,
    loadingCondition: isLoading || isLoadingOrgs,
    renderEmployeesCondition: employees.length > 0,
    renderSubcontractorsCondition: subcontractorOrgs.length > 0,
    willShowContent: !isLoading && !isLoadingOrgs && !hasDataError
  });

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

  return (
    <ErrorBoundary fallback={
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load assignment modal</p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">Close</Button>
      </div>
    }>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Work Order{hasValidWorkOrders && workOrders.length > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Select employees individually or assign to subcontractor organizations
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
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

          {hasValidWorkOrders && (
            <>
              {/* Work Order Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4" />
                    <span className="font-medium">Work Order{workOrders.length > 1 ? 's' : ''} Summary</span>
                    <Badge variant="secondary">{workOrders.length} item{workOrders.length > 1 ? 's' : ''}</Badge>
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
                    
                    {workOrders.length === 1 ? (
                      <div>
                        <span className="text-muted-foreground">Title:</span>
                        <span className="ml-2">{workOrders[0]?.title}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Multiple work orders selected for bulk assignment
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Status Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
              <Info className="h-4 w-4" />
              <span className="font-medium">Status Change Preview</span>
            </div>
            <div className="text-sm text-blue-700 space-y-2">
              {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) ? (
                <div>
                  {workOrders.some(wo => wo.status === 'received') ? (
                    <>Work orders will automatically change from <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> to <Badge className="mx-1 bg-yellow-100 text-yellow-800 text-xs">Assigned</Badge> when assignments are created.</>
                  ) : workOrders.some(wo => wo.assigned_to) ? (
                    <>Work orders will be reassigned to the selected users.</>
                  ) : (
                    <>Work orders will be assigned to the selected users.</>
                  )}
                </div>
              ) : (
                <div>
                  {workOrders.some(wo => wo.assigned_to) ? (
                    <>Work orders will be unassigned and returned to <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> status when all assignments are removed.</>
                  ) : (
                    <>No assignments will be made. Work orders will remain at <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> status.</>
                  )}
                </div>
              )}
              {(selectedAssigneeData.length > 0 || selectedOrganizationData.length > 0) && (
                <div className="text-xs">
                  <strong>Organizations involved:</strong> {
                    Array.from(new Set([
                      ...selectedAssigneeData.map(a => a.organization),
                      ...selectedOrganizationData.map(o => o.name)
                    ])).join(', ')
                  }
                </div>
              )}
            </div>
          </div>

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

          {/* Assignee Selection - Always show when modal is open */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Assignees</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllEmployees}
                  disabled={employees.length === 0}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Select All Employees
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllSelections}
                  disabled={selectedAssignees.length === 0 && selectedOrganizations.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {(isLoading || isLoadingOrgs) && (
              <div className="py-8">
                <LoadingSpinner />
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">Loading assignees...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tradeId ? `Finding users for ${tradeName || 'selected trade'}` : 'Loading all users'}
                  </p>
                </div>
              </div>
            )}

            {/* Data Error State */}
            {hasDataError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">No Data Available</span>
                </div>
                <p className="text-sm text-destructive mt-1">
                  No employees or subcontractor organizations found for assignment.
                </p>
              </div>
            )}

            {/* Content - Show when data is ready */}
            {isDataReady && (
              <div className="space-y-4">
                {/* Employees Section */}
                {employees.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span className="font-medium">Employees</span>
                        <Badge variant="secondary">{employees.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {employees.map((employee) => (
                          <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedAssignees.includes(employee.id)}
                                onCheckedChange={() => toggleAssignee(employee.id)}
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <OrganizationBadge 
                                    organization={{ 
                                      name: employee.organization, 
                                      organization_type: 'internal' 
                                    }} 
                                    size="sm"
                                    showIcon={true}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${getWorkloadColor(employee.workload)}`}>
                                {getWorkloadLabel(employee.workload)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {employee.workload} active
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Subcontractor Organizations Section */}
                {subcontractorOrgs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">Subcontractor Organizations</span>
                        <Badge variant="secondary">{subcontractorOrgs.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                         {subcontractorOrgs.map((org) => (
                           <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                             <div className="flex items-center gap-3">
                               <Checkbox
                                 checked={selectedOrganizations.includes(org.id)}
                                 onCheckedChange={() => toggleOrganization(org.id)}
                               />
                               <div className="flex-1">
                                 <div className="font-medium">{org.name}</div>
                                 <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                   {org.contact_email && (
                                     <div className="flex items-center gap-1">
                                       <Mail className="h-3 w-3" />
                                       <span>{org.contact_email}</span>
                                     </div>
                                   )}
                                   {org.contact_phone && (
                                     <span>• {org.contact_phone}</span>
                                   )}
                                 </div>
                               </div>
                             </div>
                             <Badge variant="default" className="text-xs">
                               <Building className="h-3 w-3 mr-1" />
                               Organization
                             </Badge>
                           </div>
                         ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Show message if both sections are empty but data loaded */}
                {employees.length === 0 && subcontractorOrgs.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No employees or subcontractor organizations available for assignment.</p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Assignees Summary */}
            {(selectedAssigneeData.length > 0 || selectedOrganizationData.length > 0) && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm font-medium mb-3">
                    Selected ({selectedAssigneeData.length + selectedOrganizationData.length}):
                  </div>
                  <div className="space-y-2">
                     {/* Selected Organizations */}
                     {selectedOrganizationData.map((org) => (
                       <div key={org.id} className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20">
                         <div className="flex items-center gap-2">
                           <Badge variant="default" className="text-xs">
                             <Building className="h-3 w-3 mr-1" />
                             Organization
                           </Badge>
                           <span className="text-sm font-medium">{org.name}</span>
                         </div>
                         {org.contact_email && (
                           <span className="text-xs text-muted-foreground">
                             {org.contact_email}
                           </span>
                         )}
                       </div>
                     ))}
                    {/* Selected Individual Assignees */}
                    {selectedAssigneeData.map((assignee) => (
                      <div key={assignee.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Individual</Badge>
                          <span className="text-sm font-medium">
                            {assignee.first_name} {assignee.last_name}
                          </span>
                        </div>
                        <OrganizationBadge 
                          organization={{ 
                            name: assignee.organization, 
                            organization_type: assignee.type === 'employee' ? 'internal' : 'subcontractor' 
                          }} 
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Assignment Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any special instructions or notes for the assignee..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!hasValidWorkOrders || !!networkError || bulkAddAssignments.isPending || bulkRemoveAssignments.isPending}
              aria-label={selectedAssignees.length > 0 || selectedOrganizations.length > 0 ? 'Assign selected' : 'Remove all assignments'}
            >
              {(bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                // Check if we're making new assignments or removing existing ones
                selectedAssignees.length > 0 || selectedOrganizations.length > 0 ? 
                  `Assign ${workOrders?.length || 0} Work Order${(workOrders?.length || 0) > 1 ? 's' : ''}` :
                  workOrders?.some(wo => wo.assigned_to) ?
                    `Unassign ${workOrders?.length || 0} Work Order${(workOrders?.length || 0) > 1 ? 's' : ''}` :
                    `Assign ${workOrders?.length || 0} Work Order${(workOrders?.length || 0) > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
} 