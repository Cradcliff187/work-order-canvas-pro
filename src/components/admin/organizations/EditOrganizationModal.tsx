

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2 } from "lucide-react";
import { US_STATES } from '@/constants/states';
import { useUpdateOrganization, Organization } from '@/hooks/useOrganizations';

const editOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  initials: z.string().min(1, 'Initials are required').max(5, 'Initials must be less than 5 characters'),
  contact_email: z.string().email('Invalid email format'),
  contact_phone: z.string().optional().refine(
    (val) => !val || /^\(\d{3}\) \d{3}-\d{4}$/.test(val),
    { message: "Phone number must be in format (555) 123-4567" }
  ),
  address: z.string().optional(),
  organization_type: z.enum(['partner', 'subcontractor', 'internal']),
  uses_partner_location_numbers: z.boolean().default(false),
});

type EditOrganizationFormData = z.infer<typeof editOrganizationSchema>;

interface EditOrganizationModalProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrganizationModal({ organization, open, onOpenChange }: EditOrganizationModalProps) {
  const { toast } = useToast();
  const updateOrganizationMutation = useUpdateOrganization();

  const form = useForm<EditOrganizationFormData>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: {
      name: organization?.name || '',
      initials: organization?.initials || '',
      contact_email: organization?.contact_email || '',
      contact_phone: organization?.contact_phone || '',
      address: organization?.address || '',
      organization_type: organization?.organization_type || 'partner',
      uses_partner_location_numbers: organization?.uses_partner_location_numbers || false,
    },
  });

  // Reset form when organization changes
  React.useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || '',
        initials: organization.initials || '',
        contact_email: organization.contact_email || '',
        contact_phone: organization.contact_phone || '',
        address: organization.address || '',
        organization_type: organization.organization_type || 'partner',
        uses_partner_location_numbers: organization.uses_partner_location_numbers || false,
      });
    }
  }, [organization, form]);

  const onSubmit = async (data: EditOrganizationFormData) => {
    if (!organization) return;

    try {
      await updateOrganizationMutation.mutateAsync({
        id: organization.id,
        ...data,
      });
      
      toast({
        title: "Organization updated",
        description: "The organization has been successfully updated.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update organization",
      });
    }
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Organization
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Organization Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initials *</FormLabel>
                    <FormControl>
                      <Input placeholder="ORG" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email *</FormLabel>
                  <FormControl>
                    <FormattedInput formatter="email" placeholder="contact@company.com" {...field} />
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

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main Street, City, State 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uses_partner_location_numbers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Partner Uses Location Codes</FormLabel>
                    <FormDescription>
                      Enable if this partner organization manages their own location codes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateOrganizationMutation.isPending}
              >
                {updateOrganizationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Organization
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

