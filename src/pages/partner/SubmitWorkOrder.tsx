
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Building2, FileText, Clock, MapPin } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { LocationFields } from '@/components/LocationFields';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCreateWorkOrder } from '@/hooks/usePartnerWorkOrders';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { useUserOrganization } from '@/hooks/useUserOrganization';

// Form schema with comprehensive validation
const workOrderFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  trade_id: z.string().min(1, 'Trade is required'),
  organization_id: z.string().min(1, 'Organization is required'),
  store_location: z.string().min(1, 'Location name is required'),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  location_street_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip_code: z.string().optional(),
  location_name: z.string().optional(),
  location_contact_name: z.string().optional(),
  location_contact_phone: z.string().optional(),
  location_contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  partner_po_number: z.string().optional(),
  partner_location_number: z.string().optional(),
  partner_location_selection: z.string().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
});

type FormData = z.infer<typeof workOrderFormSchema>;

export default function SubmitWorkOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);

  // User organization hook
  const { organization: userOrganization, loading: loadingUserOrg } = useUserOrganization();

  // Work order creation hook
  const createWorkOrderMutation = useCreateWorkOrder();

  // Form setup with comprehensive validation
  const form = useForm<FormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: '',
      description: '',
      trade_id: '',
      organization_id: userOrganization?.id || '',
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      location_street_address: '',
      location_city: '',
      location_state: '',
      location_zip_code: '',
      location_name: '',
      location_contact_name: '',
      location_contact_phone: '',
      location_contact_email: '',
      partner_po_number: '',
      partner_location_number: '',
      partner_location_selection: '',
      due_date: '',
      estimated_hours: '',
    }
  });

  // Work order number generation - watch for partner_location_number changes
  const {
    workOrderNumber,
    isLoading: isLoadingWorkOrderNumber,
    error: workOrderNumberError,
    isFallback,
    warning: workOrderNumberWarning,
    requiresInitials,
    organizationName,
  } = useWorkOrderNumberGeneration({
    organizationId: userOrganization?.id,
    locationNumber: form.watch('partner_location_number'),
  });

  // Load trades
  useEffect(() => {
    const loadTrades = async () => {
      try {
        setIsLoadingTrades(true);
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setTrades(data || []);
      } catch (error: any) {
        console.error('Error loading trades:', error);
        setTradesError(error.message || 'Failed to load trades');
      } finally {
        setIsLoadingTrades(false);
      }
    };

    loadTrades();
  }, []);

  // Update organization in form when user organization loads
  useEffect(() => {
    if (userOrganization?.id && !form.getValues('organization_id')) {
      form.setValue('organization_id', userOrganization.id);
    }
  }, [userOrganization?.id, form]);

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      // Prepare submission data
      const submissionData = {
        title: data.title,
        description: data.description || '',
        trade_id: data.trade_id,
        organization_id: data.organization_id,
        store_location: data.store_location,
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        location_street_address: data.location_street_address || '',
        location_city: data.location_city || '',
        location_state: data.location_state || '',
        location_zip_code: data.location_zip_code || '',
        location_name: data.location_name || '',
        location_contact_name: data.location_contact_name || '',
        location_contact_phone: data.location_contact_phone || '',
        location_contact_email: data.location_contact_email || '',
        partner_po_number: data.partner_po_number || '',
        partner_location_number: data.partner_location_number || '',
      };

      await createWorkOrderMutation.mutateAsync(submissionData);
      
      // Navigate back to work orders list
      navigate('/partner/work-orders');
    } catch (error: any) {
      console.error('Error submitting work order:', error);
      toast({
        variant: "destructive",
        title: "Submission error",
        description: error.message || "Failed to submit the work order.",
      });
    }
  };

  // Loading states
  if (loadingUserOrg || isLoadingTrades) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/partner/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Work Order</h1>
            <p className="text-muted-foreground">Create a new work order request</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading form data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (tradesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/partner/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Work Order</h1>
            <p className="text-muted-foreground">Create a new work order request</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load form data. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/partner/work-orders">
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Submit Work Order</h1>
          <p className="text-muted-foreground">Create a new work order request</p>
        </div>
      </div>

      {/* Work Order Number Preview */}
      {workOrderNumber && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Work Order Number:</span>
              </div>
              <Badge variant="outline" className="font-mono text-sm">
                {workOrderNumber}
              </Badge>
              {isFallback && (
                <Badge variant="secondary" className="text-xs">
                  Fallback
                </Badge>
              )}
            </div>
            {workOrderNumberWarning && (
              <p className="text-sm text-muted-foreground mt-2">
                {workOrderNumberWarning}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Organization Info */}
      {userOrganization && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{userOrganization.name}</div>
                <div className="text-sm text-muted-foreground">
                  {userOrganization.contact_email}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <StandardFormLayout>
            <StandardFormLayout.Section
              title="Work Order Details"
              description="Provide detailed information about the work order"
            >
              <StandardFormLayout.FieldGroup>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief title of the work order"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the work to be performed..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trade_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a trade" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>

            {/* Location Fields Integration */}
            <StandardFormLayout.Section
              title="Location Information"
              description="Enter the location details for the work order"
            >
              <LocationFields
                form={form}
                organizationId={userOrganization?.id}
                organizationType={userOrganization?.organization_type}
                showPoNumber={true}
              />
            </StandardFormLayout.Section>

            {/* Scheduling Section */}
            <StandardFormLayout.Section
              title="Scheduling"
              description="Enter scheduling details for the work order"
            >
              <StandardFormLayout.FieldGroup>
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="Estimated hours for the work order"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>

            <StandardFormLayout.Actions>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/partner/work-orders')}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createWorkOrderMutation.isPending || isLoadingWorkOrderNumber}
                className="min-h-[44px]"
              >
                {createWorkOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Work Order
                  </>
                )}
              </Button>
            </StandardFormLayout.Actions>
          </StandardFormLayout>
        </form>
      </Form>
    </div>
  );
}
