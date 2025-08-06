
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, FileText, Clock, User, Phone, Mail, Building, Calendar, MessageCircle } from 'lucide-react';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAttachmentOrganizations } from '@/hooks/useAttachmentOrganizations';
import { formatDate } from '@/lib/utils/date';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { WorkOrderMessages } from '@/components/work-orders/WorkOrderMessages';
import { MessageErrorBoundary } from '@/components/work-orders/MessageErrorBoundary';
import { AttachmentSection } from '@/components/work-orders/shared/AttachmentSection';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import type { AttachmentItem } from '@/components/work-orders/shared/AttachmentSection';


export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: workOrder, isLoading, isError, error, refetch } = useWorkOrderDetail(id!);
  const { uploadFiles } = useFileUpload();
  
  // Get organization data for all attachment uploaders
  const uploaderIds = workOrder?.work_order_attachments?.map(a => a.uploaded_by_user_id) || [];
  const { data: organizationMap } = useAttachmentOrganizations(uploaderIds);

  if (isLoading) {
    return <div>Loading work order details...</div>;
  }

  if (isError) {
    return <div>Error: {(error as Error).message}</div>;
  }

  if (!workOrder) {
    return <div>Work order not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/partner/work-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {workOrder.work_order_number ? `Work Order #${workOrder.work_order_number}` : `Work Order ${workOrder.id}`}
            </h1>
          </div>
        </div>
        <WorkOrderStatusBadge status={workOrder.status} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          {/* Work Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Work Order Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Work Order Number</Label>
                  <p className="text-sm">{workOrder.work_order_number || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <WorkOrderStatusBadge status={workOrder.status} />
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trade</Label>
                  <p className="text-sm">{workOrder.trades?.name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                  <p className="text-sm">{formatDate(workOrder.created_at)}</p>
                </div>
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{workOrder.description || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organization Info */}
              {workOrder.organizations && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">
                        {workOrder.organizations.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workOrder.organizations.contact_email}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location Name</Label>
                  <p className="text-sm">{workOrder.store_location || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location Code</Label>
                  <p className="text-sm">{workOrder.partner_location_number || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Street Address</Label>
                  <p className="text-sm">{workOrder.location_street_address || workOrder.street_address || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">City</Label>
                  <p className="text-sm">{workOrder.location_city || workOrder.city || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">State</Label>
                  <p className="text-sm">{workOrder.location_state || workOrder.state || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">ZIP Code</Label>
                  <p className="text-sm">{workOrder.location_zip_code || workOrder.zip_code || 'Not specified'}</p>
                </div>
              </div>

              {/* Contact Details */}
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Contact Details</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Contact Name</Label>
                    <p className="text-sm">{workOrder.location_contact_name || 'Not available'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="text-sm">{workOrder.location_contact_phone || 'Not available'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm">{workOrder.location_contact_email || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          {workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assignment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                  <p className="text-sm">
                    {workOrder.work_order_assignments[0].profiles?.first_name} {workOrder.work_order_assignments[0].profiles?.last_name}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <AttachmentSection
            attachments={(workOrder.work_order_attachments || [])
              // CRITICAL SECURITY FIX: Filter out internal attachments for partners
              .filter(attachment => !attachment.is_internal)
              .map((attachment): AttachmentItem => {
                const uploaderOrg = organizationMap?.[attachment.uploaded_by_user_id];
                const uploaderOrgType = (uploaderOrg?.organization_type || 'internal') as 'partner' | 'subcontractor' | 'internal';
                
                return {
                  id: attachment.id,
                  file_name: attachment.file_name,
                  file_url: attachment.file_url,
                  file_type: attachment.file_type === 'photo' ? 'photo' : 'document',
                  file_size: attachment.file_size || 0,
                  uploaded_at: attachment.uploaded_at,
                  uploader_name: attachment.uploaded_by_user ? 
                    `${attachment.uploaded_by_user.first_name} ${attachment.uploaded_by_user.last_name}` : 
                    'Unknown',
                  uploader_email: '',
                  // Remove is_internal since partners should never see internal files
                  uploader_organization_type: uploaderOrgType
                };
              })}
            workOrderId={workOrder.id}
            canUpload={true}
            onUpload={async (files, isInternal) => {
              try {
                // Force is_internal to false for partner uploads (security requirement)
                await uploadFiles(files, false, workOrder.id);
                await refetch();
              } catch (error) {
                console.error('Upload failed:', error);
              }
            }}
            showInternalToggle={false}
            onView={(attachment) => {
              const { data } = supabase.storage.from('work-order-attachments').getPublicUrl(attachment.file_url);
              window.open(data.publicUrl, '_blank');
            }}
            onDownload={(attachment) => {
              const { data } = supabase.storage.from('work-order-attachments').getPublicUrl(attachment.file_url);
              const link = document.createElement('a');
              link.href = data.publicUrl;
              link.download = attachment.file_name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            maxFileSize={50 * 1024 * 1024} // 50MB
            maxFiles={10}
          />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MessageErrorBoundary>
                <WorkOrderMessages workOrderId={id!} />
              </MessageErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
