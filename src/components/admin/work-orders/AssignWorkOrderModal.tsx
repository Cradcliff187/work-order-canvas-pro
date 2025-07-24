
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
import { Users, Briefcase, Clock, Mail, UserCheck, Info, Filter, AlertCircle, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { useWorkOrderAssignment } from '@/hooks/useWorkOrderAssignment';
import { useAllAssignees, type AssigneeData } from '@/hooks/useEmployeesForAssignment';
import { useWorkOrderAssignmentMutations } from '@/hooks/useWorkOrderAssignments';
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
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [showAllSubcontractors, setShowAllSubcontractors] = useState(true);

  const { assignWorkOrders, validateAssignment, isAssigning } = useWorkOrderAssignment();
  const { bulkAddAssignments, bulkRemoveAssignments } = useWorkOrderAssignmentMutations();
  
  // Validate work orders data
  const hasValidWorkOrders = workOrders && workOrders.length > 0;
  const tradeId = hasValidWorkOrders ? workOrders[0]?.trade_id : undefined;
  const tradeName = hasValidWorkOrders ? workOrders[0]?.trades?.name : undefined;
  
  // Add debugging for data flow
  console.log('AssignWorkOrderModal Debug:', {
    isOpen,
    workOrdersCount: workOrders?.length,
    tradeId,
    tradeName,
    hasValidWorkOrders,
    showAllSubcontractors
  });
  
  const { employees, subcontractors, isLoading } = useAllAssignees(tradeId, showAllSubcontractors);
  
  // Add more debugging for assignment data
  console.log('📊 Assignment Data:', {
    employeesCount: employees.length,
    subcontractorsCount: subcontractors.length,
    isLoading,
    employees: employees.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })),
    subcontractors: subcontractors.map(s => ({ id: s.id, name: s.organization }))
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedAssignees([]);
      setNotes('');
      setValidationErrors([]);
      setNetworkError(null);
      setShowAllSubcontractors(true);
      
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

  const selectAllEmployees = () => {
    const employeeIds = employees.map(emp => emp.id);
    setSelectedAssignees(prev => {
      const nonEmployeeIds = prev.filter(id => !employeeIds.includes(id));
      return [...nonEmployeeIds, ...employeeIds];
    });
  };

  const clearAllSelections = () => {
    setSelectedAssignees([]);
  };

  const handleAssign = async () => {
    if (selectedAssignees.length === 0) {
      // If no assignees selected, remove all assignments
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

      // Prepare new assignments for all work orders and selected assignees
      const assignments = workOrders.flatMap(wo => 
        selectedAssignees.map((assigneeId, assigneeIndex) => {
          const assignee = allAssignees.find(a => a.id === assigneeId);
          
          // For employees: assign to user, for subcontractors: assign to organization
          if (assignee?.type === 'employee') {
            return {
              work_order_id: wo.id,
              assigned_to: assigneeId, // Employee user ID
              assigned_organization_id: null, // No organization for employees
              assignment_type: assigneeIndex === 0 ? 'lead' as const : 'support' as const,
              notes
            };
          } else {
            // Subcontractor assignment - assign to organization
            return {
              work_order_id: wo.id,
              assigned_to: null, // No user assignment for subcontractors
              assigned_organization_id: assigneeId, // Organization ID (assigneeId is org ID for subcontractors)
              assignment_type: assigneeIndex === 0 ? 'lead' as const : 'support' as const,
              notes
            };
          }
        })
      );

      // Create all new assignments atomically - status will be automatically updated by trigger
      await bulkAddAssignments.mutateAsync(assignments);

      // Update work_orders table with lead assignee for backward compatibility (status handled by trigger)
      const leadAssignee = selectedAssignees[0];
      if (leadAssignee) {
        const assignee = allAssignees.find(a => a.id === leadAssignee);
        const assignedToType: 'internal' | 'subcontractor' = assignee?.type === 'employee' ? 'internal' : 'subcontractor';
        
        // For employees: assign to user ID, for subcontractors: assign to organization
        if (assignee?.type === 'employee') {
          await supabase
            .from('work_orders')
            .update({
              assigned_to: leadAssignee,
              assigned_to_type: assignedToType,
            })
            .in('id', workOrders.map(wo => wo.id));
        } else {
          // For subcontractors, assign to organization, not user
          await supabase
            .from('work_orders')
            .update({
              assigned_to: null, // No individual user assignment for subcontractors
              assigned_to_type: assignedToType,
            })
            .in('id', workOrders.map(wo => wo.id));
        }
      }

      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Assignment failed. Please try again.';
      setValidationErrors([errorMessage]);
      setNetworkError(errorMessage);
    }
  };

  const getSubcontractorOrganizationId = (assigneeId: string) => {
    const assignee = allAssignees.find(a => a.id === assigneeId);
    if (assignee?.type === 'subcontractor' && assignee.organization_id) {
      return assignee.organization_id;
    }
    return null;
  };

  // Memoize expensive calculations
  const allAssignees = useMemo(() => [...employees, ...subcontractors], [employees, subcontractors]);
  const selectedAssigneeData = useMemo(() => 
    allAssignees.filter(assignee => selectedAssignees.includes(assignee.id)),
    [allAssignees, selectedAssignees]
  );
  
  // Enhanced error handling for data loading
  const hasDataError = !isLoading && employees.length === 0 && subcontractors.length === 0 && tradeId;
  const isDataReady = !isLoading && (employees.length > 0 || subcontractors.length > 0 || !tradeId);
  
  // Check if any work orders are currently assigned
  const hasCurrentAssignments = workOrders.some(wo => wo.assigned_to || wo.status === 'assigned');

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
              Select one or more people to assign this work order to
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
              {selectedAssignees.length > 0 ? (
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
                  {workOrders.some(wo => wo.assigned_to || wo.status === 'assigned') ? (
                    <>Work orders will be unassigned and returned to <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> status when all assignments are removed.</>
                  ) : (
                    <>No assignments will be made. Work orders will remain at <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> status.</>
                  )}
                </div>
              )}
              {selectedAssigneeData.length > 0 && (
                <div className="text-xs">
                  <strong>Organizations involved:</strong> {
                    Array.from(new Set(selectedAssigneeData.map(a => a.organization))).join(', ')
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

          {/* Assignee Selection */}
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
                  disabled={selectedAssignees.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8">
                <LoadingSpinner />
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">Loading assignees...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tradeId ? `Finding users for ${tradeName || 'selected trade'}` : 'Loading all users'}
                  </p>
                </div>
              </div>
            ) : !isDataReady ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Data not ready</p>
                <p className="text-xs text-muted-foreground">
                  Please wait while we load the assignee data
                </p>
              </div>
            ) : (
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

                {/* Subcontractors Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Subcontractors</span>
                        {subcontractors.length > 0 && (
                          <Badge variant="secondary">{subcontractors.length}</Badge>
                        )}
                        {tradeId && !showAllSubcontractors && (
                          <Badge variant="outline" className="text-xs">
                            {tradeName} only
                          </Badge>
                        )}
                        {showAllSubcontractors && (
                          <Badge variant="outline" className="text-xs">
                            All trades
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllSubcontractors(!showAllSubcontractors)}
                        className="text-xs"
                      >
                        {showAllSubcontractors ? (
                          <>
                            <Filter className="h-3 w-3 mr-1" />
                            Show {tradeName || 'Trade'} Only
                          </>
                        ) : (
                          <>
                            <Users className="h-3 w-3 mr-1" />
                            Show All Subcontractors
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {isLoading ? (
                    <CardContent className="pt-0">
                      <div className="text-center py-6 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Loading subcontractors...
                        </div>
                      </div>
                    </CardContent>
                  ) : subcontractors.length > 0 ? (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {subcontractors.map((subcontractor) => (
                          <div key={subcontractor.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedAssignees.includes(subcontractor.id)}
                                onCheckedChange={() => toggleAssignee(subcontractor.id)}
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {subcontractor.organization}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <OrganizationBadge 
                                    organization={{ 
                                      name: subcontractor.organization, 
                                      organization_type: 'subcontractor' 
                                    }} 
                                    size="sm"
                                    showIcon={true}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${getWorkloadColor(subcontractor.workload)}`}>
                                {getWorkloadLabel(subcontractor.workload)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {subcontractor.workload} active
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">
                          {showAllSubcontractors 
                            ? 'No subcontractors available'
                            : `No subcontractors available for ${tradeName || 'this trade'}`
                          }
                        </p>
                        {!showAllSubcontractors && (
                          <p className="text-xs mt-1">
                            Click "Show All Subcontractors" to see everyone
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {employees.length === 0 && subcontractors.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">No assignees available</p>
                    <p className="text-xs text-muted-foreground">
                      {tradeName ? `No active users found for ${tradeName}` : 'No active users in the system'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Assignees Summary */}
            {selectedAssigneeData.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm font-medium mb-3">
                    Selected Assignees ({selectedAssigneeData.length}):
                  </div>
                  <div className="space-y-2">
                    {selectedAssigneeData.map((assignee, index) => (
                      <div key={assignee.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                            {index === 0 ? "Lead" : "Support"}
                          </Badge>
                          <span className="text-sm font-medium">
                            {assignee.type === 'subcontractor' ? assignee.organization : `${assignee.first_name} ${assignee.last_name}`}
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
              placeholder="Add any special instructions or notes for the subcontractor..."
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
              disabled={isAssigning || !hasValidWorkOrders || !!networkError || bulkAddAssignments.isPending || bulkRemoveAssignments.isPending}
              aria-label={selectedAssignees.length > 0 ? 'Assign selected users' : 'Remove all assignments'}
            >
              {(isAssigning || bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                hasCurrentAssignments && selectedAssignees.length === 0 ? 
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
