
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Plus, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreatePartnerLocation } from '@/hooks/usePartnerLocations';
import { useToast } from '@/hooks/use-toast';
import { US_STATES } from '@/constants/states';

interface LocationFieldsProps {
  organizationId: string;
  locations: any[];
  onLocationCreated: (location: any) => void;
  control: any;
  setValue: any;
  selectedLocationId?: string;
}

export function LocationFields({
  organizationId,
  locations,
  onLocationCreated,
  control,
  setValue,
  selectedLocationId,
}: LocationFieldsProps) {
  const { toast } = useToast();
  const [showQuickForm, setShowQuickForm] = React.useState(false);
  const createLocationMutation = useCreatePartnerLocation();

  const quickForm = useForm({
    defaultValues: {
      location_name: '',
      location_number: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
    },
  });

  const handleQuickCreate = async (data: any) => {
    try {
      const locationData = {
        ...data,
        organization_id: organizationId,
        is_active: true,
      };
      
      const result = await createLocationMutation.mutateAsync(locationData);
      
      toast({
        title: "Location created",
        description: "The location has been successfully created.",
      });
      
      quickForm.reset();
      setShowQuickForm(false);
      onLocationCreated(result);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create location",
      });
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="partner_location_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_name} ({location.location_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickForm(!showQuickForm)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {showQuickForm && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Create New Location</h4>
          
          <form onSubmit={quickForm.handleSubmit(handleQuickCreate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_name">Location Name *</Label>
                <Input
                  id="location_name"
                  placeholder="Main Building"
                  {...quickForm.register('location_name')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location_number">Location Code *</Label>
                <Input
                  id="location_number"
                  placeholder="001"
                  {...quickForm.register('location_number')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                placeholder="123 Main Street"
                {...quickForm.register('street_address')}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  {...quickForm.register('city')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select onValueChange={(value) => quickForm.setValue('state', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  placeholder="12345"
                  {...quickForm.register('zip_code')}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createLocationMutation.isPending}
              >
                {createLocationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Location'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQuickForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
