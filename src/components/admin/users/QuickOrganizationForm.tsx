import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCreateOrganization } from '@/hooks/useOrganizations';

const quickOrganizationSchema = z.object({
  name: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  }),
  initials: z.string().min(2, {
    message: "Initials must be at least 2 characters.",
  }).max(4, {
    message: "Initials must be at most 4 characters.",
  }),
  contact_email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  organization_type: z.enum(['partner', 'subcontractor', 'internal']),
});

type QuickOrganizationFormData = z.infer<typeof quickOrganizationSchema>;

interface QuickOrganizationFormProps {
  onOrganizationCreated: (organization: any) => void;
}

export function QuickOrganizationForm({ onOrganizationCreated }: QuickOrganizationFormProps) {
  const { toast } = useToast();
  const createOrganizationMutation = useCreateOrganization();

  const form = useForm<QuickOrganizationFormData>({
    resolver: zodResolver(quickOrganizationSchema),
    defaultValues: {
      name: '',
      initials: '',
      contact_email: '',
      organization_type: 'partner',
    },
  });

  const onSubmit = async (data: QuickOrganizationFormData) => {
    try {
      const organizationData = {
        name: data.name,
        initials: data.initials,
        contact_email: data.contact_email,
        contact_phone: '',
        address: '',
        organization_type: data.organization_type,
        uses_partner_location_numbers: false,
        is_active: true,
        next_sequence_number: 1,
        next_location_sequence: 1,
      };
      
      const newOrganization = await createOrganizationMutation.mutateAsync(organizationData);
      
      toast({
        title: "Organization created",
        description: "The organization has been successfully created.",
      });
      
      form.reset();
      onOrganizationCreated(newOrganization);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create organization",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Create New Organization</h4>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="initials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initials *</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC" {...field} />
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
                  <FormLabel>Type *</FormLabel>
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
          </div>

          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={createOrganizationMutation.isPending}
            className="w-full"
          >
            {createOrganizationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
