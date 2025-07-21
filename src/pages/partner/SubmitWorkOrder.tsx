
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  title: string;
  description: string;
  trade_id: string;
  organization_id: string;
  store_location: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  location_contact_name: string;
  location_contact_phone: string;
  location_contact_email: string;
  partner_po_number: string;
  partner_location_number: string;
  due_date: string;
  estimated_hours: string;
}

export default function SubmitWorkOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Setup React Hook Form
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      trade_id: '',
      organization_id: '',
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      location_contact_name: '',
      location_contact_phone: '',
      location_contact_email: '',
      partner_po_number: '',
      partner_location_number: '',
      due_date: '',
      estimated_hours: '',
    }
  });

  // Load trades and organizations
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tradesResult, orgsResult] = await Promise.all([
          supabase.from('trades').select('*').eq('is_active', true),
          supabase.from('organizations').select('*').eq('is_active', true)
        ]);

        if (tradesResult.error) throw tradesResult.error;
        if (orgsResult.error) throw orgsResult.error;

        setTrades(tradesResult.data || []);
        setOrganizations(orgsResult.data || []);
      } catch (error: any) {
        setDataError(error.message || 'Failed to load data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .insert([{
          ...data,
          created_by: user?.id,
          date_submitted: new Date().toISOString(),
          status: 'received',
          due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
          estimated_hours: data.estimated_hours ? parseFloat(data.estimated_hours) : null,
        }]);

      if (error) throw error;

      toast({
        title: "Work order submitted successfully!",
        description: "You'll be redirected to the work orders list.",
      });
      
      setTimeout(() => {
        navigate('/partner/work-orders');
      }, 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description: error.message || "Failed to submit the work order.",
      });
    }
  };

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

      {/* Error and Loading States */}
      {dataError ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load data. Please check your network connection and try again.
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading form data...
          </CardContent>
        </Card>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <StandardFormLayout>
            <StandardFormLayout.Section
              title="Work Order Details"
              description="Provide detailed information about the work order"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief title of the work order"
                    {...register('title', { required: 'Title is required' })}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of the work to be performed..."
                    {...register('description')}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trade_id">Trade *</Label>
                  <Controller
                    name="trade_id"
                    control={control}
                    rules={{ required: 'Trade is required' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a trade" />
                        </SelectTrigger>
                        <SelectContent>
                          {trades.map((trade) => (
                            <SelectItem key={trade.id} value={trade.id}>
                              {trade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.trade_id && <p className="text-sm text-destructive">{errors.trade_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization_id">Organization *</Label>
                  <Controller
                    name="organization_id"
                    control={control}
                    rules={{ required: 'Organization is required' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.organization_id && <p className="text-sm text-destructive">{errors.organization_id.message}</p>}
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>

            <StandardFormLayout.Section
              title="Location Details"
              description="Enter the location details for the work order"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="store_location">Store/Location</Label>
                  <Input
                    id="store_location"
                    placeholder="Store or specific location within the building"
                    {...register('store_location')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street_address">Street Address</Label>
                  <Input
                    id="street_address"
                    placeholder="Street address"
                    {...register('street_address')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    {...register('city')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    {...register('state')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    placeholder="Zip code"
                    {...register('zip_code')}
                  />
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>

            <StandardFormLayout.Section
              title="Contact Information"
              description="Enter contact details for the location"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="location_contact_name">Contact Name</Label>
                  <Input
                    id="location_contact_name"
                    placeholder="Contact person's name"
                    {...register('location_contact_name')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_contact_phone">Contact Phone</Label>
                  <Input
                    id="location_contact_phone"
                    placeholder="Contact person's phone number"
                    {...register('location_contact_phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_contact_email">Contact Email</Label>
                  <Input
                    id="location_contact_email"
                    placeholder="Contact person's email address"
                    type="email"
                    {...register('location_contact_email')}
                  />
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>

            <StandardFormLayout.Section
              title="Partner References"
              description="Enter any partner-specific reference numbers"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="partner_po_number">Partner PO Number</Label>
                  <Input
                    id="partner_po_number"
                    placeholder="Partner purchase order number"
                    {...register('partner_po_number')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner_location_number">Partner Location Number</Label>
                  <Input
                    id="partner_location_number"
                    placeholder="Partner location number"
                    {...register('partner_location_number')}
                  />
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>

            <StandardFormLayout.Section
              title="Scheduling"
              description="Enter scheduling details for the work order"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    {...register('due_date')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_hours">Estimated Hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Estimated hours for the work order"
                    {...register('estimated_hours')}
                  />
                </div>
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
                disabled={isSubmitting}
                className="min-h-[44px]"
              >
                {isSubmitting ? (
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
      )}
    </div>
  );
}
