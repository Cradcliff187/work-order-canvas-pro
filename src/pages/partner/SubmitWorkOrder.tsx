import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, ArrowRight, CheckCircle, MapPin, Wrench, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateWorkOrder } from '@/hooks/usePartnerWorkOrders';
import { useTrades } from '@/hooks/useWorkOrders';
import { useOrganizations } from '@/hooks/useOrganizations';

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store_location: z.string().min(1, 'Store location is required'),
  street_address: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(5, 'ZIP code must be at least 5 characters'),
  trade_id: z.string().min(1, 'Trade selection is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  organization_id: z.string().min(1, 'Organization is required'),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

const steps = [
  { id: 1, title: 'Location Details', icon: MapPin },
  { id: 2, title: 'Trade & Description', icon: Wrench },
  { id: 3, title: 'Review & Submit', icon: FileText },
];

const SubmitWorkOrder = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedWorkOrder, setSubmittedWorkOrder] = useState<any>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createWorkOrder = useCreateWorkOrder();
  const { data: trades } = useTrades();
  const { data: organizations } = useOrganizations();

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      title: '',
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      trade_id: '',
      description: '',
      organization_id: '',
    },
  });

  const handleNext = async () => {
    const currentStepFields = getCurrentStepFields();
    const isValid = await form.trigger(currentStepFields);
    
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getCurrentStepFields = (): (keyof WorkOrderFormData)[] => {
    switch (currentStep) {
      case 1:
        return ['title', 'store_location', 'street_address', 'city', 'state', 'zip_code'];
      case 2:
        return ['trade_id', 'description'];
      case 3:
        return ['organization_id'];
      default:
        return [];
    }
  };

  const onSubmit = async (data: WorkOrderFormData) => {
    try {
      const result = await createWorkOrder.mutateAsync(data as {
        title: string;
        store_location: string;
        street_address: string;
        city: string;
        state: string;
        zip_code: string;
        trade_id: string;
        description: string;
        organization_id: string;
      });
      setSubmittedWorkOrder(result);
      setCurrentStep(4); // Success step
    } catch (error) {
      console.error('Error submitting work order:', error);
    }
  };

  if (submittedWorkOrder) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-2xl">Work Order Submitted Successfully!</CardTitle>
            <CardDescription>
              Your work order has been received and assigned number:
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {submittedWorkOrder.work_order_number}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Location:</h4>
                <p className="text-muted-foreground">{submittedWorkOrder.store_location}</p>
                <p className="text-muted-foreground text-sm">
                  {submittedWorkOrder.street_address}, {submittedWorkOrder.city}, {submittedWorkOrder.state} {submittedWorkOrder.zip_code}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Status:</h4>
                <p className="text-muted-foreground capitalize">{submittedWorkOrder.status}</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/partner/work-orders')}>
                View All Work Orders
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Submit Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/partner/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">Submit New Work Order</h1>
        <p className="text-muted-foreground">Submit a new work order request for your organization</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground text-muted-foreground'
              }`}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  Step {step.id}
                </p>
                <p className={`text-xs ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-20 mx-4 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Location Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Location Details</CardTitle>
                <CardDescription>
                  Provide the store location and complete address information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Order Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="store_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Store name or identifier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Trade & Description */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Trade & Description</CardTitle>
                <CardDescription>
                  Select the type of work needed and provide detailed description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="trade_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the type of work needed" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trades?.map((trade) => (
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide detailed description of the work needed, including any specific requirements, issues observed, or special instructions"
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>
                  Review your work order details and select organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="organization_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations?.organizations?.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-3">Work Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Title:</span> {form.watch('title')}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {form.watch('store_location')}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {form.watch('street_address')}, {form.watch('city')}, {form.watch('state')} {form.watch('zip_code')}
                    </div>
                    <div>
                      <span className="font-medium">Trade:</span> {trades?.find(t => t.id === form.watch('trade_id'))?.name}
                    </div>
                    <div>
                      <span className="font-medium">Description:</span> 
                      <p className="mt-1 text-muted-foreground">{form.watch('description')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={createWorkOrder.isPending}>
                {createWorkOrder.isPending ? 'Submitting...' : 'Submit Work Order'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SubmitWorkOrder;