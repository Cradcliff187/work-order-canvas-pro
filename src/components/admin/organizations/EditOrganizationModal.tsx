import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, Mail, Phone, MapPin, Hash } from 'lucide-react';
import { useOrganizationMutations, UpdateOrganizationData } from '@/hooks/useOrganizations';
import { Organization } from '@/pages/admin/AdminOrganizations';

const editOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  organization_type: z.enum(['partner', 'subcontractor', 'internal']),
  initials: z.string()
    .regex(/^[A-Z]{2,4}$/, 'Must be 2-4 uppercase letters')
    .optional()
    .refine((val, ctx) => {
      const orgType = ctx.parent.organization_type;
      if (orgType === 'partner' && !val) {
        return false;
      }
      return true;
    }, 'Initials are required for partner organizations'),
});

type EditOrganizationFormData = z.infer<typeof editOrganizationSchema>;

interface EditOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  onSuccess: () => void;
}

export function EditOrganizationModal({ open, onOpenChange, organization, onSuccess }: EditOrganizationModalProps) {
  const { updateOrganization } = useOrganizationMutations();
  
  const form = useForm<EditOrganizationFormData>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: {
      name: organization?.name || '',
      contact_email: organization?.contact_email || '',
      contact_phone: organization?.contact_phone || '',
      address: organization?.address || '',
      organization_type: organization?.organization_type || 'partner',
      initials: organization?.initials || '',
    },
  });

  React.useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        contact_email: organization.contact_email,
        contact_phone: organization.contact_phone || '',
        address: organization.address || '',
        organization_type: organization.organization_type,
        initials: organization.initials || '',
      });
    }
  }, [organization, form]);

  const onSubmit = async (data: EditOrganizationFormData) => {
    if (!organization) return;
    
    try {
      await updateOrganization.mutateAsync({
        organizationId: organization.id,
        orgData: {
          name: data.name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          address: data.address,
          organization_type: data.organization_type,
          initials: data.initials,
        },
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Organization
          </DialogTitle>
          <DialogDescription>
            Update the organization details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organization Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Property Management" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Email
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="contact@acme.com" type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Primary contact email for this organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Phone (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="123 Main St, City, State 12345" 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Physical address or headquarters location
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Initials {form.watch('organization_type') === 'partner' && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC" 
                      className="uppercase"
                      maxLength={4}
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    2-4 letter code for work order numbering (e.g., ABC)
                    {form.watch('organization_type') === 'partner' && ' - Required for partners'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type of organization determines their role in the system
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateOrganization.isPending}>
                {updateOrganization.isPending ? 'Updating...' : 'Update Organization'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}