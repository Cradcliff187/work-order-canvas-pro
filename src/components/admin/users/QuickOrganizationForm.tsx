
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateOrganization } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const quickOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  initials: z.string().min(1, 'Initials are required'),
  contact_email: z.string().email('Invalid email format'),
  organization_type: z.enum(['partner', 'subcontractor', 'internal']),
});

type QuickOrgFormData = z.infer<typeof quickOrgSchema>;

interface QuickOrganizationFormProps {
  onSuccess?: (organization: any) => void;
  userType: 'partner' | 'subcontractor' | 'employee';
}

export function QuickOrganizationForm({ onSuccess, userType }: QuickOrganizationFormProps) {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const createOrganizationMutation = useCreateOrganization();

  const form = useForm<QuickOrgFormData>({
    resolver: zodResolver(quickOrgSchema),
    defaultValues: {
      name: '',
      initials: '',
      contact_email: '',
      organization_type: userType === 'employee' ? 'internal' : userType,
    },
  });

  const onSubmit = async (data: QuickOrgFormData) => {
    try {
      const organizationData = {
        ...data,
        is_active: true,
        address: '',
        contact_phone: '',
        next_sequence_number: 1,
        next_location_sequence: 1,
        uses_partner_location_numbers: false,
      };
      
      const result = await createOrganizationMutation.mutateAsync(organizationData);
      
      toast({
        title: "Organization created",
        description: "The organization has been successfully created.",
      });
      
      form.reset();
      setIsVisible(false);
      onSuccess?.(result);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create organization",
      });
    }
  };

  if (!isVisible) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsVisible(true)}
      >
        Create New Organization
      </Button>
    );
  }

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <h3 className="font-medium">Create New Organization</h3>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              placeholder="Organization Name"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="initials">Initials *</Label>
            <Input
              id="initials"
              placeholder="ORG"
              {...form.register('initials')}
            />
            {form.formState.errors.initials && (
              <p className="text-sm text-red-600">{form.formState.errors.initials.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email *</Label>
          <Input
            id="contact_email"
            type="email"
            placeholder="contact@company.com"
            {...form.register('contact_email')}
          />
          {form.formState.errors.contact_email && (
            <p className="text-sm text-red-600">{form.formState.errors.contact_email.message}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createOrganizationMutation.isPending}
          >
            {createOrganizationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsVisible(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
