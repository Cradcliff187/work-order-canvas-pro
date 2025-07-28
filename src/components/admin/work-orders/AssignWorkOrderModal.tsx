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
import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { Users, Briefcase, Clock, Mail, UserCheck, Info, AlertCircle, RefreshCw, Building, User, Search, Filter, X } from 'lucide-react';
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
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'individuals' | 'organizations'>('individuals');
  
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
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
  

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
          status: 'received' as const,
          date_assigned: null,
        })
        .in('id', workOrders.map(wo => wo.id));
      
      onClose();
      return;
    }

    try {
      setValidationErrors([]);

      // Safety check for current user profile
      if (!profile?.id) {
        throw new Error('Current user profile not found - cannot create assignments');
      }

      // Remove existing assignments
      await bulkRemoveAssignments.mutateAsync(workOrders.map(wo => wo.id));

      const assignments = [];

      // 1. Create individual employee assignments
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

      // 2. Create organization-level assignments
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

      // Create all assignments
      if (assignments.length > 0) {
        await bulkAddAssignments.mutateAsync(assignments);

        // Update work order status to assigned when assignments are created
        await supabase
          .from('work_orders')
          .update({
            status: 'assigned',
            date_assigned: new Date().toISOString()
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
      console.error('Failed to remove assignment:', error);
    }
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

                  {/* Assignment Tabs */}
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'individuals' | 'organizations')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="individuals" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Assign to Individual
                      </TabsTrigger>
                      <TabsTrigger value="organizations" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Assign to Organization
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="individuals" className="space-y-4 mt-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search employees by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
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
                                  <div key={employee.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                                    <Checkbox
                                      checked={selectedAssignees.includes(employee.id)}
                                      onCheckedChange={() => toggleAssignee(employee.id)}
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
                    </TabsContent>

                    <TabsContent value="organizations" className="space-y-4 mt-4">
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
                            className="pl-10"
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
                            <ScrollArea className="max-h-80 px-6 py-4">
                              <div className="space-y-2">
                                {filteredSubcontractorOrgs.map((org) => (
                                  <div key={org.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                                    <Checkbox
                                      id={`org-${org.id}`}
                                      checked={selectedOrganizations.includes(org.id)}
                                      onCheckedChange={() => toggleOrganization(org.id)}
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
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Clear All Button - Only show when selections exist */}
                  {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) && (
                    <div className="flex justify-center">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={clearAllSelections}
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
                    />
                  </div>
                </>
              )}

              {/* No Data Available - when both are empty */}
              {!isLoading && !isLoadingOrgs && employees.length === 0 && subcontractorOrgs.length === 0 && (
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
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!hasValidWorkOrders || (bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) || (!hasExistingAssignments && selectedAssignees.length === 0 && selectedOrganizations.length === 0)}
            >
              {(bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {(selectedAssignees.length > 0 || selectedOrganizations.length > 0) ? 'Assigning...' : 'Clearing...'}
                </>
              ) : (
                <>
                  {hasExistingAssignments
                    ? (selectedAssignees.length > 0 || selectedOrganizations.length > 0)
                      ? 'Update Assignment'
                      : 'Clear Assignment'
                    : 'Assign'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}