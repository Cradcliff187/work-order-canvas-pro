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
import { Users, Briefcase, Clock, Mail, UserCheck, Info, AlertCircle, RefreshCw, Building, User } from 'lucide-react';
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
  const tradeName = hasValidWorkOrders ? workOrders[0]?.trades?.name : undefined;
  
  const { employees, isLoading } = useAllAssignees();
  
  // Debug logging
  console.log('📊 Assignment Modal Data:', {
    workOrders: workOrders?.length || 0,
    employees: employees.length,
    subcontractorOrgs: subcontractorOrgs.length,
    isLoading,
    isLoadingOrgs,
    orgDetails: subcontractorOrgs.map(o => ({ id: o.id, name: o.name, userCount: o.active_user_count }))
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedAssignees([]);
      setSelectedOrganizations([]);
      setNotes('');
      setValidationErrors([]);
      setNetworkError(null);
      
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
    setSelectedAssignees(employeeIds);
  };

  const clearAllSelections = () => {
    setSelectedAssignees([]);
    setSelectedOrganizations([]);
  };

  const handleAssign = async () => {
    // If no assignees or organizations selected, remove all assignments
    if (selectedAssignees.length === 0 && selectedOrganizations.length === 0) {
      await bulkRemoveAssignments.mutateAsync(workOrders.map(wo => wo.id));
      
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

      // Remove existing assignments
      await bulkRemoveAssignments.mutateAsync(workOrders.map(wo => wo.id));

      // Collect all assignees
      const allSelectedAssignees = [...selectedAssignees];
      
      // Add first active user from each selected organization (if they have one)
      for (const orgId of selectedOrganizations) {
        const org = subcontractorOrgs.find(o => o.id === orgId);
        if (org && org.first_active_user_id && !allSelectedAssignees.includes(org.first_active_user_id)) {
          allSelectedAssignees.push(org.first_active_user_id);
        }
      }

      // If we selected organizations without active users, show warning but continue
      const orgsWithoutUsers = selectedOrganizations.filter(orgId => {
        const org = subcontractorOrgs.find(o => o.id === orgId);
        return org && org.active_user_count === 0;
      });

      if (orgsWithoutUsers.length > 0) {
        const orgNames = orgsWithoutUsers.map(orgId => {
          const org = subcontractorOrgs.find(o => o.id === orgId);
          return org?.name;
        }).join(', ');
        console.warn(`Organizations without active users selected: ${orgNames}`);
      }

      // Create assignments only for users we have
      if (allSelectedAssignees.length > 0) {
        const assignments = workOrders.flatMap(wo => 
          allSelectedAssignees.map((assigneeId) => {
            const assignee = employees.find(e => e.id === assigneeId);
            
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

        await bulkAddAssignments.mutateAsync(assignments);

        // Update work_orders table with lead assignee
        const leadAssignee = allSelectedAssignees[0];
        const assignee = employees.find(e => e.id === leadAssignee);
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

  const selectedAssigneeData = useMemo(() => 
    employees.filter(employee => selectedAssignees.includes(employee.id)),
    [employees, selectedAssignees]
  );
  
  const selectedOrganizationData = useMemo(() => 
    subcontractorOrgs.filter(org => selectedOrganizations.includes(org.id)),
    [subcontractorOrgs, selectedOrganizations]
  );

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
                    </div>
                  </div>
                )}

                {/* Content when loaded */}
                {!isLoading && !isLoadingOrgs && (
                  <div className="space-y-6">
                    {/* Internal Employees Section */}
                    {employees.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Internal Employees</span>
                            <Badge variant="outline">{employees.length} available</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {employees.map((employee) => (
                            <div key={employee.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                              <Checkbox
                                id={`employee-${employee.id}`}
                                checked={selectedAssignees.includes(employee.id)}
                                onCheckedChange={() => toggleAssignee(employee.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{employee.first_name} {employee.last_name}</span>
                                  <Badge variant="outline" className={getWorkloadColor(employee.workload)}>
                                    {getWorkloadLabel(employee.workload)} ({employee.workload})
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{employee.organization}</span>
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{employee.email}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Subcontractor Organizations Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span className="font-medium">Subcontractor Organizations</span>
                          <Badge variant="outline">{subcontractorOrgs.length} available</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {subcontractorOrgs.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No subcontractor organizations available</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {subcontractorOrgs.map((org) => (
                              <div key={org.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                                <Checkbox
                                  id={`org-${org.id}`}
                                  checked={selectedOrganizations.includes(org.id)}
                                  onCheckedChange={() => toggleOrganization(org.id)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{org.name}</span>
                                    <Badge variant={org.active_user_count > 0 ? "default" : "secondary"}>
                                      {org.active_user_count} active user{org.active_user_count !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {org.contact_email && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        <span>{org.contact_email}</span>
                                      </div>
                                    )}
                                    {org.first_active_user && (
                                      <span>Lead: {org.first_active_user.full_name}</span>
                                    )}
                                    {org.active_user_count === 0 && (
                                      <span className="text-amber-600">No active users</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* No Data Available */}
                    {employees.length === 0 && subcontractorOrgs.length === 0 && (
                      <div className="p-4 bg-muted/50 border border-dashed rounded-md">
                        <div className="text-center">
                          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No assignees available</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Create employees or subcontractor organizations to assign work orders
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment Summary */}
                {(selectedAssigneeData.length > 0 || selectedOrganizationData.length > 0) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCheck className="h-4 w-4" />
                        <span className="font-medium">Assignment Summary</span>
                      </div>
                      
                      <div className="space-y-2">
                        {selectedAssigneeData.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Selected Employees:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedAssigneeData.map(assignee => (
                                <Badge key={assignee.id} variant="secondary">
                                  {assignee.first_name} {assignee.last_name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedOrganizationData.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Selected Organizations:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedOrganizationData.map(org => (
                                <Badge key={org.id} variant="secondary">
                                  {org.name}
                                  {org.active_user_count === 0 && (
                                    <span className="ml-1 text-amber-600">⚠</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!hasValidWorkOrders || (bulkAddAssignments.isPending || bulkRemoveAssignments.isPending)}
            >
              {(bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) ? 'Assigning...' : 'Unassigning...'}
                </>
              ) : (
                <>
                  {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) ? 'Assign' : 'Unassign All'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}