import React from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useFocusManagement } from '@/hooks/useFocusManagement';

const locationSchema = z.object({
  organization_id: z.string().min(1, 'Organization is required'),
  location_number: z.string().min(1, 'Location number is required'),
  location_name: z.string().min(1, 'Location name is required'),
  street_address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional().refine(
    (val) => !val || /^\d{5}(-\d{4})?$/.test(val),
    { message: "ZIP code must be in format 12345 or 12345-6789" }
  ),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().optional().transform(val => 
    val && val.trim() !== '' ? val : null
  ).refine(
    val => !val || z.string().email().safeParse(val).success,
    'Invalid email'
  ),
  contact_phone: z.string().nullable().optional().refine(
    (val) => !val || /^\(\d{3}\) \d{3}-\d{4}$/.test(val),
    { message: "Phone number must be in format (555) 123-4567" }
  ),
  is_active: z.boolean().default(true),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
}

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  open,
  onOpenChange,
  organizationId,
}) => {
  const { createLocation } = usePartnerLocationMutations();
  const { data: organizations = [] } = useOrganizations();
  const modalRef = useFocusManagement({ isOpen: open });

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      organization_id: organizationId || '',
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

  // Update form when organizationId prop changes
  React.useEffect(() => {
    if (organizationId) {
      form.setValue('organization_id', organizationId);
    }
  }, [organizationId, form]);

  const onSubmit = async (data: LocationFormData) => {
    const submitData = {
      organization_id: data.organization_id,
      location_number: data.location_number,
      location_name: data.location_name,
      street_address: data.street_address || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      is_active: data.is_active,
    };
    
    await createLocation.mutateAsync(submitData);
    form.reset();
    onOpenChange(false);
  };

  // Filter to only show partner organizations
  const partnerOrganizations = organizations.filter(org => org.organization_type === 'partner');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="max-w-md" role="dialog" aria-labelledby="add-location-title" tabIndex={-1}>
        <DialogHeader>
          <DialogTitle id="add-location-title">Add New Location</DialogTitle>
          <DialogDescription>
            Add a new location for a partner organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-busy={createLocation.isPending}>
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!organizationId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {partnerOrganizations.map((org) => (
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

            <fieldset className="grid grid-cols-2 gap-4" disabled={createLocation.isPending}>
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

            <fieldset className="grid grid-cols-2 gap-4" disabled={createLocation.isPending}>
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

            <fieldset className="grid grid-cols-2 gap-4" disabled={createLocation.isPending}>
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
              <Button type="submit" disabled={createLocation.isPending} aria-busy={createLocation.isPending}>
                {createLocation.isPending ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};