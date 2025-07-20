import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useOrganizationMutations } from '@/hooks/useOrganizations';

const quickOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  contact_email: z.string().email('Invalid email address'),
  organization_type: z.enum(['partner', 'subcontractor', 'internal']),
});

type QuickOrgFormData = z.infer<typeof quickOrgSchema>;

interface QuickOrganizationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orgId: string) => void;
  userType?: string;
}

export function QuickOrganizationForm({ open, onOpenChange, onSuccess, userType }: QuickOrganizationFormProps) {
  const { createOrganization } = useOrganizationMutations();
  
  const getDefaultOrgType = (): 'partner' | 'subcontractor' | 'internal' => {
    if (userType === 'partner') return 'partner';
    if (userType === 'subcontractor') return 'subcontractor';
    return 'internal';
  };
  
  const form = useForm<QuickOrgFormData>({
    resolver: zodResolver(quickOrgSchema),
    defaultValues: {
      name: '',
      contact_email: '',
      organization_type: getDefaultOrgType(),
    },
  });

  const onSubmit = async (data: QuickOrgFormData) => {
    const orgData = {
      name: data.name,
      contact_email: data.contact_email,
      organization_type: data.organization_type,
    };
    
    await createOrganization.mutateAsync(orgData, {
      onSuccess: (newOrg) => {
        onSuccess(newOrg.id);
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to assign users to. This organization can be used for work order management.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
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
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@example.com" {...field} />
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
                  <FormLabel>Organization Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrganization.isPending}>
                {createOrganization.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}