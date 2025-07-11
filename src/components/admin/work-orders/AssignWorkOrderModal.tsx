import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Users, Briefcase, Clock, Mail, UserCheck, Info } from 'lucide-react';
import { useWorkOrderAssignment } from '@/hooks/useWorkOrderAssignment';
import { useAllAssignees, type AssigneeData } from '@/hooks/useEmployeesForAssignment';
import { useWorkOrderAssignmentMutations } from '@/hooks/useWorkOrderAssignments';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

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
  const [sendEmail, setSendEmail] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { assignWorkOrders, validateAssignment, isAssigning } = useWorkOrderAssignment();
  const { bulkAddAssignments, bulkRemoveAssignments } = useWorkOrderAssignmentMutations();
  
  // Get the trade ID from the first work order (they should all be the same trade for bulk assignment)
  const tradeId = workOrders[0]?.trade_id;
  const tradeName = workOrders[0]?.trades?.name;
  
  const { employees, subcontractors, isLoading } = useAllAssignees(tradeId);

  useEffect(() => {
    if (isOpen) {
      setSelectedAssignees([]);
      setNotes('');
      setSendEmail(true);
      setValidationErrors([]);
    }
  }, [isOpen]);

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
          const isSubcontractor = assignee?.type === 'subcontractor';
          
          return {
            work_order_id: wo.id,
            assigned_to: assigneeId,
            assigned_organization_id: isSubcontractor ? getSubcontractorOrganizationId(assigneeId) : null,
            assignment_type: assigneeIndex === 0 ? 'lead' as const : 'support' as const,
            notes
          };
        })
      );

      // Create all new assignments atomically - status will be automatically updated by trigger
      await bulkAddAssignments.mutateAsync(assignments);

      // Update work_orders table with lead assignee for backward compatibility (status handled by trigger)
      const leadAssignee = selectedAssignees[0];
      if (leadAssignee) {
        const assignee = allAssignees.find(a => a.id === leadAssignee);
        const assignedToType: 'internal' | 'subcontractor' = assignee?.type === 'employee' ? 'internal' : 'subcontractor';
        
        await supabase
          .from('work_orders')
          .update({
            assigned_to: leadAssignee,
            assigned_to_type: assignedToType,
          })
          .in('id', workOrders.map(wo => wo.id));

        // Send email notification if requested
        if (sendEmail) {
          try {
            await supabase.functions.invoke('email-work-order-assigned', {
              body: { 
                workOrderIds: workOrders.map(wo => wo.id),
                assignedUserId: leadAssignee,
                notes 
              }
            });
          } catch (emailError) {
            console.error('Failed to send assignment email:', emailError);
            // Don't throw here - assignment succeeded even if email failed
          }
        }
      }

      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
      setValidationErrors(['Assignment failed. Please try again.']);
    }
  };

  const getSubcontractorOrganizationId = (assigneeId: string) => {
    const assignee = allAssignees.find(a => a.id === assigneeId);
    if (assignee?.type === 'subcontractor' && assignee.organization_id) {
      return assignee.organization_id;
    }
    return null;
  };

  const allAssignees = [...employees, ...subcontractors];
  const selectedAssigneeData = allAssignees.filter(assignee => 
    selectedAssignees.includes(assignee.id)
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Work Order{workOrders.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Select one or more people to assign this work order to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Status Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
              <Info className="h-4 w-4" />
              <span className="font-medium">Status Change Preview</span>
            </div>
            <div className="text-sm text-blue-700">
              {selectedAssignees.length > 0 ? (
                <>Work orders will automatically change from <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> to <Badge className="mx-1 bg-yellow-100 text-yellow-800 text-xs">Assigned</Badge> when assignments are created.</>
              ) : (
                <>Work orders will be returned to <Badge className="mx-1 bg-blue-100 text-blue-800 text-xs">Received</Badge> status when all assignments are removed.</>
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
              <div className="text-center py-4 text-muted-foreground">Loading assignees...</div>
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
                              <div>
                                <div className="font-medium">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {employee.organization}
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
                {subcontractors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Subcontractors</span>
                        <Badge variant="secondary">{subcontractors.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {subcontractors.map((subcontractor) => (
                          <div key={subcontractor.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedAssignees.includes(subcontractor.id)}
                                onCheckedChange={() => toggleAssignee(subcontractor.id)}
                              />
                              <div>
                                <div className="font-medium">
                                  {subcontractor.first_name} {subcontractor.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {subcontractor.organization}
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
                  </Card>
                )}

                {employees.length === 0 && subcontractors.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No assignees available for this trade
                  </div>
                )}
              </div>
            )}

            {/* Selected Assignees Summary */}
            {selectedAssigneeData.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm font-medium mb-2">
                    Selected ({selectedAssigneeData.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssigneeData.map((assignee) => (
                      <Badge key={assignee.id} variant="secondary">
                        {assignee.first_name} {assignee.last_name} ({assignee.type})
                      </Badge>
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

          {/* Email Notification */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(!!checked)}
            />
            <Label htmlFor="sendEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send email notification to subcontractor
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={isAssigning || bulkAddAssignments.isPending || bulkRemoveAssignments.isPending}
            >
              {(isAssigning || bulkAddAssignments.isPending || bulkRemoveAssignments.isPending) ? 'Processing...' : 
               selectedAssignees.length === 0 ? `Unassign ${workOrders.length} Work Order${workOrders.length > 1 ? 's' : ''}` :
               `Assign ${workOrders.length} Work Order${workOrders.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}