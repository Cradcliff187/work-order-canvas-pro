import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Edit, Flame, AlertTriangle, Save, X } from 'lucide-react';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useTrades } from '@/hooks/useWorkOrders';
import { Database } from '@/integrations/supabase/types';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
};

const bulkEditSchema = z.object({
  status: z.enum(['received', 'assigned', 'in_progress', 'completed', 'cancelled', 'estimate_needed', 'estimate_approved']).optional(),
  priority: z.enum(['standard', 'urgent']).optional(),
  due_date: z.string().optional(),
  partner_location_number: z.string().optional(),
  trade_id: z.string().optional(),
});

type BulkEditFormData = z.infer<typeof bulkEditSchema>;

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  onSave: (changes: BulkEditFormData) => Promise<void>;
}

export function BulkEditModal({ isOpen, onClose, workOrders, onSave }: BulkEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [conflictAnalysis, setConflictAnalysis] = useState<Record<string, boolean>>({});
  
  const { data: partnerLocations = [] } = usePartnerLocations();
  const { data: trades = [] } = useTrades();

  const form = useForm<BulkEditFormData>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      status: undefined,
      priority: undefined,
      due_date: undefined,
      partner_location_number: undefined,
      trade_id: undefined,
    },
  });

  // Analyze conflicts when modal opens or work orders change
  useEffect(() => {
    if (isOpen && workOrders.length > 0) {
      const conflicts: Record<string, boolean> = {};
      
      // Status conflicts
      const statuses = workOrders.map(wo => wo.status).filter(Boolean);
      conflicts.status = new Set(statuses).size > 1;
      
      // Priority conflicts
      const priorities = workOrders.map(wo => wo.priority).filter(Boolean);
      conflicts.priority = new Set(priorities).size > 1;
      
      // Due date conflicts
      const dueDates = workOrders.map(wo => wo.due_date).filter(Boolean);
      conflicts.due_date = new Set(dueDates).size > 1;
      
      // Partner location conflicts
      const locations = workOrders.map(wo => wo.partner_location_number).filter(Boolean);
      conflicts.partner_location_number = new Set(locations).size > 1;
      
      // Trade conflicts
      const tradeIds = workOrders.map(wo => wo.trade_id).filter(Boolean);
      conflicts.trade_id = new Set(tradeIds).size > 1;
      
      setConflictAnalysis(conflicts);
      
      // Reset form when modal opens
      form.reset({
        status: undefined,
        priority: undefined,
        due_date: undefined,
        partner_location_number: undefined,
        trade_id: undefined,
      });
    }
  }, [isOpen, workOrders, form]);

  const handleSave = async (data: BulkEditFormData) => {
    setIsLoading(true);
    try {
      // Only include fields that have been changed (not undefined)
      const changes = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          (acc as any)[key] = value;
        }
        return acc;
      }, {} as BulkEditFormData);

      await onSave(changes);
      onClose();
    } catch (error) {
      console.error('Bulk edit failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConflictMessage = (field: string) => {
    if (!conflictAnalysis[field]) return null;
    return `Multiple values detected for ${field.replace('_', ' ')}`;
  };

  const getCurrentValue = (field: keyof BulkEditFormData) => {
    if (conflictAnalysis[field]) return undefined;
    
    const values = workOrders.map(wo => wo[field]).filter(Boolean);
    return values.length > 0 ? values[0] : undefined;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Bulk Edit Work Orders
          </SheetTitle>
          <SheetDescription>
            Make changes to {workOrders.length} selected work order{workOrders.length > 1 ? 's' : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          {/* Work Orders Summary */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Work Orders</span>
              <Badge variant="secondary">{workOrders.length} items</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Only changed fields will be updated
            </div>
          </div>

          <Separator className="mb-6" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              conflictAnalysis.status 
                                ? "Mixed values" 
                                : getCurrentValue('status') || "Select status"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="estimate_needed">Estimate Needed</SelectItem>
                        <SelectItem value="estimate_approved">Estimate Approved</SelectItem>
                      </SelectContent>
                    </Select>
                    {conflictAnalysis.status && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('status')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-row space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="standard" id="bulk-standard" />
                          <Label htmlFor="bulk-standard">Standard</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="urgent" id="bulk-urgent" />
                          <Label htmlFor="bulk-urgent" className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-destructive" />
                            Urgent
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    {conflictAnalysis.priority && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('priority')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        placeholder={
                          conflictAnalysis.due_date 
                            ? "Mixed values" 
                            : getCurrentValue('due_date') || ""
                        }
                      />
                    </FormControl>
                    {conflictAnalysis.due_date && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('due_date')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Partner Location */}
              <FormField
                control={form.control}
                name="partner_location_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partner Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              conflictAnalysis.partner_location_number 
                                ? "Mixed values" 
                                : getCurrentValue('partner_location_number') || "Select location"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnerLocations.map((location) => (
                          <SelectItem key={location.id} value={location.location_number}>
                            {location.location_name} ({location.location_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {conflictAnalysis.partner_location_number && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('partner_location_number')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Trade */}
              <FormField
                control={form.control}
                name="trade_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              conflictAnalysis.trade_id 
                                ? "Mixed values" 
                                : getCurrentValue('trade_id') || "Select trade"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trades.map((trade) => (
                          <SelectItem key={trade.id} value={trade.id}>
                            {trade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {conflictAnalysis.trade_id && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('trade_id')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSave)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}