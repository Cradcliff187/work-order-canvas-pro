
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormattedInput } from '@/components/ui/formatted-input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { useFocusManagement } from '@/hooks/useFocusManagement';
import type { Tables } from '@/integrations/supabase/types';

const locationSchema = z.object({
  location_number: z.string().min(1, 'Location number is required'),
  location_name: z.string().min(1, 'Location name is required'),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional().refine(
    (val) => !val || /^\d{5}(-\d{4})?$/.test(val),
    { message: "ZIP code must be in format 12345 or 12345-6789" }
  ),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional().refine(
    (val) => !val || /^\(\d{3}\) \d{3}-\d{4}$/.test(val),
    { message: "Phone number must be in format (555) 123-4567" }
  ),
  is_active: z.boolean().default(true),
});

type LocationFormData = z.infer<typeof locationSchema>;
type PartnerLocation = Tables<'partner_locations'>;

interface EditLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: PartnerLocation | null;
}

export const EditLocationModal: React.FC<EditLocationModalProps> = ({
  open,
  onOpenChange,
  location,
}) => {
  const { updateLocation } = usePartnerLocationMutations();
  const modalRef = useFocusManagement({ isOpen: open });

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      location_number: '',
      location_name: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        location_number: location.location_number || '',
        location_name: location.location_name || '',
        street_address: location.street_address || '',
        city: location.city || '',
        state: location.state || '',
        zip_code: location.zip_code || '',
        contact_name: location.contact_name || '',
        contact_email: location.contact_email || '',
        contact_phone: location.contact_phone || '',
        is_active: location.is_active,
      });
    }
  }, [location, form]);

  const onSubmit = async (data: LocationFormData) => {
    if (!location) return;
    
    await updateLocation.mutateAsync({
      id: location.id,
      ...data,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="max-w-md" role="dialog" aria-labelledby="edit-location-title" tabIndex={-1}>
        <DialogHeader>
          <DialogTitle id="edit-location-title">Edit Location</DialogTitle>
          <DialogDescription>
            Update the location details. Changes will be reflected in future work order submissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-busy={updateLocation.isPending}>
            <fieldset className="grid grid-cols-2 gap-4" disabled={updateLocation.isPending}>
              <legend className="sr-only">Basic Location Information</legend>
              <FormField
                control={form.control}
                name="location_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Number</FormLabel>
                    <FormControl>
                      <Input placeholder="504" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Downtown Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
            />
            </fieldset>

            <FormField
              control={form.control}
              name="street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <FormattedInput formatter="streetAddress" placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <fieldset className="grid grid-cols-2 gap-4" disabled={updateLocation.isPending}>
              <legend className="sr-only">Location Address</legend>
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <FormattedInput formatter="city" placeholder="New York" {...field} />
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
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <FormField
              control={form.control}
              name="zip_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <FormattedInput formatter="zip" placeholder="10001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <fieldset className="grid grid-cols-2 gap-4" disabled={updateLocation.isPending}>
              <legend className="sr-only">Contact Information</legend>
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <FormattedInput formatter="phone" placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <FormattedInput formatter="email" placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Active Location</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateLocation.isPending} aria-busy={updateLocation.isPending}>
                {updateLocation.isPending ? 'Updating...' : 'Update Location'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
