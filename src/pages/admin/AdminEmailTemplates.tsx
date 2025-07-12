import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  Mail,
  Calendar,
  Eye,
  Power,
  Trash2
} from 'lucide-react';
import { EmailTemplateEditor } from '@/components/admin/EmailTemplateEditor';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';

type EmailTemplate = Tables<'email_templates'>;

const AdminEmailTemplates: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    toggleActive,
    deleteTemplate,
  } = useEmailTemplates();

  const filteredTemplates = templates?.filter(template =>
    template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleSave = async (templateData: Partial<EmailTemplate>) => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        ...templateData,
      });
    } else {
      await createTemplate.mutateAsync(templateData as any);
    }
    
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (editingTemplate) {
      await deleteTemplate.mutateAsync(editingTemplate.id);
      setEditingTemplate(null);
    }
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    await deleteTemplate.mutateAsync(template.id);
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    await toggleActive.mutateAsync({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  if (isCreating || editingTemplate) {
    return (
      <div className="p-6">
        <EmailTemplateEditor
          template={editingTemplate || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={editingTemplate ? handleDelete : undefined}
          isLoading={
            createTemplate.isPending || 
            updateTemplate.isPending || 
            deleteTemplate.isPending
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage email templates for automated notifications
          </p>
        </div>
        
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading templates...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Mail className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            {searchTerm ? 'No templates found matching your search.' : 'No email templates found.'}
                          </p>
                          {!searchTerm && (
                            <Button variant="outline" onClick={handleCreate}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create your first template
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium font-mono">
                          {template.template_name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.subject}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={() => handleToggleActive(template)}
                              disabled={toggleActive.isPending}
                            />
                            <Badge variant={template.is_active ? 'default' : 'secondary'}>
                              {template.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(new Date(template.updated_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <TableActionsDropdown
                            actions={[
                              {
                                label: 'View Details',
                                icon: Eye,
                                onClick: () => {/* placeholder for future view functionality */}
                              },
                              {
                                label: 'Edit',
                                icon: Edit,
                                onClick: () => handleEdit(template)
                              },
                              {
                                label: 'Toggle Active',
                                icon: Power,
                                onClick: () => handleToggleActive(template)
                              },
                              {
                                label: 'Delete',
                                icon: Trash2,
                                onClick: () => handleDeleteTemplate(template),
                                variant: 'destructive' as const
                              }
                            ]}
                            align="end"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailTemplates;