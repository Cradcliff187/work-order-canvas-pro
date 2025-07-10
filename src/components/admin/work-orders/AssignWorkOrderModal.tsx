import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Briefcase, Clock, Mail } from 'lucide-react';
import { useSubcontractorsByTrade, useWorkOrderAssignment } from '@/hooks/useWorkOrderAssignment';
import { Database } from '@/integrations/supabase/types';

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
  const [selectedSubcontractor, setSelectedSubcontractor] = useState('');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { assignWorkOrders, validateAssignment, isAssigning } = useWorkOrderAssignment();
  
  // Get the trade ID from the first work order (they should all be the same trade for bulk assignment)
  const tradeId = workOrders[0]?.trade_id;
  const tradeName = workOrders[0]?.trades?.name;
  
  const { data: subcontractors, isLoading: isLoadingSubcontractors } = useSubcontractorsByTrade(tradeId);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubcontractor('');
      setNotes('');
      setSendEmail(true);
      setValidationErrors([]);
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedSubcontractor) return;

    try {
      // Validate assignment
      const validation = await validateAssignment(
        workOrders.map(wo => wo.id),
        selectedSubcontractor
      );

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      setValidationErrors([]);

      await assignWorkOrders.mutateAsync({
        workOrderIds: workOrders.map(wo => wo.id),
        subcontractorId: selectedSubcontractor,
        notes,
        sendEmail
      });

      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
    }
  };

  const selectedSubcontractorData = subcontractors?.find(s => s.id === selectedSubcontractor);

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

          {/* Subcontractor Selection */}
          <div className="space-y-3">
            <Label>Select Subcontractor</Label>
            <Select value={selectedSubcontractor} onValueChange={setSelectedSubcontractor}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingSubcontractors ? "Loading..." : "Choose a subcontractor"} />
              </SelectTrigger>
              <SelectContent>
                {subcontractors?.map((subcontractor) => (
                  <SelectItem key={subcontractor.id} value={subcontractor.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {subcontractor.first_name} {subcontractor.last_name}
                        {subcontractor.company_name && ` (${subcontractor.company_name})`}
                      </span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`text-xs ${getWorkloadColor(subcontractor.workload || 0)}`}>
                          {getWorkloadLabel(subcontractor.workload || 0)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {subcontractor.workload || 0} active
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Subcontractor Details */}
            {selectedSubcontractorData && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {selectedSubcontractorData.first_name} {selectedSubcontractorData.last_name}
                      </div>
                      {selectedSubcontractorData.company_name && (
                        <div className="text-sm text-muted-foreground">
                          {selectedSubcontractorData.company_name}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className={`text-sm ${getWorkloadColor(selectedSubcontractorData.workload || 0)}`}>
                          {getWorkloadLabel(selectedSubcontractorData.workload || 0)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedSubcontractorData.workload || 0} active work orders
                      </div>
                    </div>
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
              disabled={!selectedSubcontractor || isAssigning}
            >
              {isAssigning ? 'Assigning...' : `Assign ${workOrders.length} Work Order${workOrders.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}