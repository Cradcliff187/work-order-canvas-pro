import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Building2, FileText, Clock, MapPin, User, Phone, Mail, MessageCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAuth } from '@/contexts/AuthContext';
import { WorkOrderMessages } from '@/components/work-orders/WorkOrderMessages';
import { MessageErrorBoundary } from '@/components/work-orders/MessageErrorBoundary';
import { AttachmentSection } from '@/components/work-orders/shared/AttachmentSection';
import type { AttachmentItem } from '@/components/work-orders/shared/AttachmentSection';

export default function SubcontractorWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const { data: workOrder, isLoading, error } = useWorkOrderDetail(id || '');

  if (isLoading) {
    return <div>Loading work order details...</div>;
  }

  if (error || !workOrder) {
    return <div>Error: Work order not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/subcontractor/work-orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Work Order Details</h1>
          <p className="text-muted-foreground">View details of work order</p>
        </div>
      </div>

      <div className="space-y-6">
          {/* Organization Info */}
          {workOrder.organizations && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">
                      {workOrder.organizations.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {workOrder.organizations.contact_email}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Order Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Work Order Details
              </CardTitle>
              <CardDescription>
                Details about this work order
              </CardDescription>
              {/* Submit Report Button */}
              {(workOrder.status === 'assigned' || workOrder.status === 'in_progress') && (
                <div className="mt-4">
                  <Link to={`/subcontractor/reports/new/${workOrder.id}`}>
                    <Button className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                  </Link>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Work Order Number</Label>
                  <p className="text-sm font-bold">{workOrder.work_order_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant="secondary">{workOrder.status || 'N/A'}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                  <p className="text-sm">{workOrder.title || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trade</Label>
                  <p className="text-sm">{workOrder.trades?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                  <p className="text-sm">
                    {workOrder.created_at
                      ? format(new Date(workOrder.created_at), 'MMM dd, yyyy hh:mm a')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                  <p className="text-sm">
                    {workOrder.estimated_completion_date ? format(new Date(workOrder.estimated_completion_date), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{workOrder.description || 'No description provided.'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Location & Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location & Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <p className="text-sm">{workOrder.street_address || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">City</Label>
                  <p className="text-sm">{workOrder.city || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">State</Label>
                  <p className="text-sm">{workOrder.state || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">ZIP Code</Label>
                  <p className="text-sm">{workOrder.zip_code || 'Not specified'}</p>
                </div>
              </div>

              {/* Contact Details */}
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Contact Details</p>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Name</Label>
                  <p className="text-sm">{workOrder.location_contact_name || 'Not specified'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-sm">{workOrder.location_contact_phone || 'Not specified'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{workOrder.location_contact_email || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments - View Only for Subcontractors */}
          <Card>
            <CardHeader>
              <CardTitle>Project Files</CardTitle>
              <CardDescription>View and download files related to this work order</CardDescription>
            </CardHeader>
            <CardContent>
              <AttachmentSection
                attachments={(workOrder.work_order_attachments || []).map((attachment): AttachmentItem => ({
                  id: attachment.id,
                  file_name: attachment.file_name,
                  file_url: attachment.file_url,
                  file_type: attachment.file_type === 'photo' ? 'photo' : 'document',
                  file_size: attachment.file_size || 0,
                  uploaded_at: attachment.uploaded_at,
                  uploader_name: attachment.uploaded_by_user ? 
                    `${attachment.uploaded_by_user.first_name} ${attachment.uploaded_by_user.last_name}` : 
                    'Unknown',
                  uploader_email: '' // Email not available in current schema
                }))}
                workOrderId={workOrder.id}
                canUpload={false} // Subcontractors cannot upload files directly - use messages for communication
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
            </CardContent>
          </Card>

          {/* Messages Section - Primary Communication Channel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </CardTitle>
              <CardDescription>Communicate with the team and share updates about this work order</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageErrorBoundary>
                <WorkOrderMessages workOrderId={id!} />
              </MessageErrorBoundary>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any additional notes or comments</CardDescription>
            </CardHeader>
            <CardContent>
              <p>No notes provided.</p>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
