import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Building2, FileText, Clock, MapPin, User, Phone, Mail, MessageCircle, DollarSign, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAttachmentOrganizations } from '@/hooks/useAttachmentOrganizations';
import { useAuth } from '@/contexts/AuthContext';
import { WorkOrderMessages } from '@/components/work-orders/WorkOrderMessages';
import { MessageErrorBoundary } from '@/components/work-orders/MessageErrorBoundary';
import { AttachmentSection } from '@/components/work-orders/shared/AttachmentSection';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { AttachmentItem } from '@/components/work-orders/shared/AttachmentSection';

interface EstimateFormData {
  amount: string;
  description: string;
}

export default function SubcontractorWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const { data: workOrder, isLoading, error, refetch } = useWorkOrderDetail(id || '');
  const { uploadFiles } = useFileUpload();
  
  // Estimate form state
  const [estimateForm, setEstimateForm] = useState<EstimateFormData>({
    amount: '',
    description: ''
  });
  const [isSubmittingEstimate, setIsSubmittingEstimate] = useState(false);
  
  // Get organization data for all attachment uploaders
  const uploaderIds = workOrder?.work_order_attachments?.map(a => a.uploaded_by_user_id) || [];
  const { data: organizationMap } = useAttachmentOrganizations(uploaderIds);

  // Handle estimate submission
  const handleEstimateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const amount = parseFloat(estimateForm.amount);
    if (!estimateForm.amount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than $0",
        variant: "destructive",
      });
      return;
    }

    if (!estimateForm.description || estimateForm.description.trim().length < 20) {
      toast({
        title: "Description too short",
        description: "Description must be at least 20 characters",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Authentication error",
        description: "Unable to identify user profile",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingEstimate(true);

    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          subcontractor_estimate_amount: amount,
          subcontractor_estimate_description: estimateForm.description.trim(),
          subcontractor_estimate_submitted_at: new Date().toISOString(),
          subcontractor_estimate_submitted_by: profile.id
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Estimate submitted successfully!",
        description: "Your estimate has been sent for review.",
      });

      // Reset form and refresh data
      setEstimateForm({ amount: '', description: '' });
      await refetch();
    } catch (error: any) {
      toast({
        title: "Failed to submit estimate",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEstimate(false);
    }
  };

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

          {/* Estimate Submission Section */}
          {workOrder.status === 'estimate_needed' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Submit Estimate
                </CardTitle>
                <CardDescription>
                  Provide your cost estimate for this work order
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workOrder.subcontractor_estimate_submitted_at ? (
                  // Show read-only estimate details
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 text-green-600">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Estimate Submitted</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Estimated Amount</Label>
                        <p className="text-lg font-semibold">
                          ${workOrder.subcontractor_estimate_amount?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Submitted At</Label>
                        <p className="text-sm">
                          {workOrder.subcontractor_estimate_submitted_at
                            ? format(new Date(workOrder.subcontractor_estimate_submitted_at), 'MMM dd, yyyy hh:mm a')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {workOrder.subcontractor_estimate_description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Show estimate submission form
                  <form onSubmit={handleEstimateSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimate-amount">Estimated Amount *</Label>
                      <Input
                        id="estimate-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={estimateForm.amount}
                        onChange={(e) => setEstimateForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                        className="text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your estimated cost for this work order
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="estimate-description">Description *</Label>
                      <Textarea
                        id="estimate-description"
                        placeholder="Describe what work will be performed, materials needed, timeline, etc..."
                        value={estimateForm.description}
                        onChange={(e) => setEstimateForm(prev => ({ ...prev, description: e.target.value }))}
                        required
                        minLength={20}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 20 characters. Provide details about the work scope and pricing breakdown.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmittingEstimate}
                    >
                      {isSubmittingEstimate ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Submit Estimate
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* Project Files with Upload Capability */}
          <Card>
            <CardHeader>
              <CardTitle>Project Files</CardTitle>
              <CardDescription>Upload, view and download files related to this work order</CardDescription>
            </CardHeader>
            <CardContent>
              <AttachmentSection
                attachments={(workOrder.work_order_attachments || [])
                  // SECURITY: Subcontractors can see partner uploads, internal admin uploads, and their own org uploads
                  // but admin can mark files as internal which subcontractors should see
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
                      is_internal: attachment.is_internal || false,
                      uploader_organization_type: uploaderOrgType
                    };
                  })}
                workOrderId={workOrder.id}
                canUpload={true}
                onUpload={async (files) => {
                  try {
                    await uploadFiles(files, false, workOrder.id);
                    await refetch();
                  } catch (error) {
                    console.error('Upload failed:', error);
                  }
                }}
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
