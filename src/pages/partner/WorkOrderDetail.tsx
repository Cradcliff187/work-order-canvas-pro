
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, FileText, Clock, User, Phone, Mail, Building, Calendar, MessageCircle, DollarSign, CheckCircle, XCircle } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';


export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: workOrder, isLoading, isError, error, refetch } = useWorkOrderDetail(id!);
  const { uploadFiles } = useFileUpload();
  
  // Estimate approval state
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  
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

  // Handle estimate approval
  const handleApproveEstimate = async () => {
    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          partner_estimate_approved: true,
          partner_estimate_approved_at: new Date().toISOString(),
          status: 'estimate_approved'
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      toast({
        title: "Estimate Approved",
        description: "The estimate has been approved and status updated to 'Estimate Approved'.",
      });
      
      await refetch();
    } catch (error) {
      console.error('Error approving estimate:', error);
      toast({
        title: "Error",
        description: "Failed to approve estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Handle estimate rejection
  const handleRejectEstimate = async () => {
    if (!rejectionNotes.trim()) {
      toast({
        title: "Rejection Notes Required",
        description: "Please provide notes for rejecting the estimate.",
        variant: "destructive",
      });
      return;
    }

    setIsRejecting(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          partner_estimate_approved: false,
          partner_estimate_rejection_notes: rejectionNotes.trim(),
          partner_estimate_approved_at: new Date().toISOString(),
          status: 'estimate_needed'
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      toast({
        title: "Estimate Rejected",
        description: "The estimate has been rejected and status updated to 'Estimate Needed'.",
      });
      
      await refetch();
      setRejectionNotes('');
    } catch (error) {
      console.error('Error rejecting estimate:', error);
      toast({
        title: "Error",
        description: "Failed to reject estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Show estimate tab only when internal estimate exists
  const hasInternalEstimate = workOrder.internal_estimate_amount && workOrder.internal_estimate_amount > 0;

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
        <TabsList className={`grid w-full ${hasInternalEstimate ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          {hasInternalEstimate && (
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
          )}
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

        {/* Estimate Tab - Only show if internal estimate exists */}
        {hasInternalEstimate && (
          <TabsContent value="estimate" className="space-y-6">
            {/* Professional Estimate Display */}
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <DollarSign className="h-6 w-6" />
                      Work Order Estimate
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Professional estimate for work order #{workOrder.work_order_number}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {workOrder.partner_estimate_approved === true ? 'Approved' : 
                     workOrder.partner_estimate_approved === false ? 'Rejected' : 'Pending Review'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Estimate Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Work Order Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Work Order:</span>
                        <span className="font-medium">#{workOrder.work_order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trade:</span>
                        <span className="font-medium">{workOrder.trades?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{workOrder.store_location}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Estimate Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date Prepared:</span>
                        <span className="font-medium">{formatDate(workOrder.internal_estimate_created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid Until:</span>
                        <span className="font-medium">30 days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Estimate Amount */}
                <div className="bg-muted/20 rounded-lg p-6 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Total Estimate Amount</p>
                    <p className="text-4xl font-bold text-primary">
                      ${Number(workOrder.internal_estimate_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Estimate Description */}
                {workOrder.internal_estimate_description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3">Work Description</h3>
                    <div className="bg-muted/10 rounded-lg p-4">
                      <p className="text-sm leading-relaxed">{workOrder.internal_estimate_description}</p>
                    </div>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Approval Status Display */}
                {workOrder.partner_estimate_approved !== null && (
                  <div className="mb-6">
                    {workOrder.partner_estimate_approved === true ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Estimate Approved</p>
                          <p className="text-sm text-green-600">
                            Approved on {formatDate(workOrder.partner_estimate_approved_at)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium text-red-800">Estimate Rejected</p>
                            <p className="text-sm text-red-600">
                              Rejected on {formatDate(workOrder.partner_estimate_approved_at)}
                            </p>
                          </div>
                        </div>
                        {workOrder.partner_estimate_rejection_notes && (
                          <div className="p-4 bg-muted/20 rounded-lg">
                            <p className="font-medium text-sm mb-2">Rejection Notes:</p>
                            <p className="text-sm">{workOrder.partner_estimate_rejection_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Approval Actions - Only show if not yet decided */}
                {workOrder.partner_estimate_approved === null && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Review & Approval</h3>
                    
                    {/* Rejection Notes Input */}
                    <div className="space-y-2">
                      <Label htmlFor="rejection-notes">Rejection Notes (required if rejecting)</Label>
                      <Textarea
                        id="rejection-notes"
                        placeholder="Please provide detailed notes if you're rejecting this estimate..."
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button
                        onClick={handleApproveEstimate}
                        disabled={isApproving || isRejecting}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isApproving ? 'Approving...' : 'Approve Estimate'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRejectEstimate}
                        disabled={isApproving || isRejecting}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {isRejecting ? 'Rejecting...' : 'Reject Estimate'}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      * Once you approve or reject this estimate, the decision cannot be changed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
