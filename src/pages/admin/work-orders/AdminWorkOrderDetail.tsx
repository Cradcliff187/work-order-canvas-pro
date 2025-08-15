
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit, MapPin, Calendar, Clock, User, Building2, Wrench, FileText, Phone, Mail, Loader2, DollarSign, Calculator, AlertTriangle } from 'lucide-react';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAttachmentOrganizations } from '@/hooks/useAttachmentOrganizations';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { formatDate } from '@/lib/utils/date';
import { WorkOrderStatusBadge, ReportStatusBadge } from '@/components/ui/status-badge';
import { AttachmentSection } from '@/components/work-orders/shared/AttachmentSection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AdminWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workOrder, isLoading, error, refetch } = useWorkOrderDetail(id!);
  const { toast } = useToast();
  
  // Get organization data for all attachment uploaders
  const uploaderIds = workOrder?.work_order_attachments?.map(a => a.uploaded_by_user_id) || [];
  const { data: organizationMap } = useAttachmentOrganizations(uploaderIds);

  // Estimate form state
  const [internalEstimateForm, setInternalEstimateForm] = useState({
    amount: '',
    description: '',
    internal_notes: '',
    markup_percentage: 20
  });
  const [proxyMode, setProxyMode] = useState(false);
  const [proxyEstimateForm, setProxyEstimateForm] = useState({
    amount: '',
    description: ''
  });
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [isSubmittingProxy, setIsSubmittingProxy] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <WorkOrderBreadcrumb 
          workOrderId={id}
          currentPage="Details"
        />
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading work order...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="p-6 space-y-6">
        <WorkOrderBreadcrumb 
          workOrderId={id}
          currentPage="Details"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">
                {error?.message || 'Work order not found'}
              </p>
              <Button 
                onClick={() => navigate('/admin/work-orders')} 
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Work Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Received';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <WorkOrderBreadcrumb 
        workOrderId={id}
        currentPage="Details"
      />
      
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Button 
            onClick={() => navigate('/admin/work-orders')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{workOrder.title}</h1>
            <p className="text-muted-foreground truncate">
              {workOrder.work_order_number || `Work Order ${workOrder.id?.slice(0, 8)}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
          <WorkOrderStatusBadge
            status={workOrder.status}
            size="sm"
            showIcon
          />
          <Button asChild size="sm">
            <Link to={`/admin/work-orders/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 no-scrollbar">
          <TabsList className="min-w-max">
            <TabsTrigger value="details" className="whitespace-nowrap">Details</TabsTrigger>
            <TabsTrigger value="reports" className="whitespace-nowrap">Reports</TabsTrigger>
            <TabsTrigger value="estimates" className="whitespace-nowrap">Estimates</TabsTrigger>
            <TabsTrigger value="attachments" className="whitespace-nowrap">Attachments</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{workOrder.organizations?.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    {workOrder.organizations?.contact_email || 'N/A'}
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Trade</h4>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{workOrder.trades?.name || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{workOrder.store_location || 'N/A'}</p>
                  {workOrder.street_address && (
                    <p className="text-sm text-muted-foreground">
                      {workOrder.street_address}
                      {workOrder.city && `, ${workOrder.city}`}
                      {workOrder.state && `, ${workOrder.state}`}
                      {workOrder.zip_code && ` ${workOrder.zip_code}`}
                    </p>
                  )}
                </div>
                
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Date Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(workOrder.date_submitted)}
                  </p>
                </div>
                
                {workOrder.date_assigned && (
                  <div>
                    <p className="text-sm font-medium">Date Assigned</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.date_assigned)}
                    </p>
                  </div>
                )}
                
                {workOrder.due_date && (
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.due_date)}
                    </p>
                  </div>
                )}
                
                {workOrder.actual_completion_date && (
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.actual_completion_date)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assignment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium">Assigned To</p>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.work_order_assignments[0].profiles?.first_name} {workOrder.work_order_assignments[0].profiles?.last_name}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
                
                {workOrder.created_user && (
                  <div>
                    <p className="text-sm font-medium">Created By</p>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.created_user.first_name} {workOrder.created_user.last_name}
                    </p>
                  </div>
                )}
                
                {workOrder.estimated_hours && (
                  <div>
                    <p className="text-sm font-medium">Estimated Hours</p>
                    <p className="text-sm text-muted-foreground">{workOrder.estimated_hours}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {workOrder.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{workOrder.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.work_order_reports && workOrder.work_order_reports.length > 0 ? (
                <div className="space-y-4">
                  {workOrder.work_order_reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {report.subcontractor_user.first_name} {report.subcontractor_user.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ReportStatusBadge
                            status={report.status}
                            size="sm"
                            showIcon
                          />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(report.submitted_at)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">{report.work_performed}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {report.hours_worked && (
                            <span>Hours: {report.hours_worked}</span>
                          )}
                          <span>Status: {report.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No reports submitted yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-6">
          {/* Subcontractor Estimate View */}
          {workOrder.subcontractor_estimate_submitted_at && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Subcontractor Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <p className="text-lg font-semibold">
                      ${(workOrder.subcontractor_estimate_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submitted</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.subcontractor_estimate_submitted_at)}
                    </p>
                  </div>
                </div>
                {workOrder.subcontractor_estimate_description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {workOrder.subcontractor_estimate_description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Internal Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Create Internal Estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="internal-amount">Amount</Label>
                  <Input
                    id="internal-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={internalEstimateForm.amount}
                    onChange={(e) => setInternalEstimateForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                  {workOrder.subcontractor_estimate_amount && workOrder.subcontractor_estimate_amount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const scAmount = Number(workOrder.subcontractor_estimate_amount);
                        const markupPercent = Number(internalEstimateForm.markup_percentage) || 0;
                        
                        if (scAmount > 0 && !isNaN(scAmount)) {
                          const calculatedAmount = scAmount * (1 + markupPercent / 100);
                          const formattedAmount = calculatedAmount.toFixed(2);
                          setInternalEstimateForm(prev => ({ ...prev, amount: formattedAmount }));
                        }
                      }}
                    >
                      Auto-fill (SC amount + markup)
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="markup-percentage">Markup Percentage</Label>
                  <Input
                    id="markup-percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={internalEstimateForm.markup_percentage}
                    onChange={(e) => setInternalEstimateForm(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Real-time preview */}
              {internalEstimateForm.amount && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <Label className="text-sm font-medium">Partner will see:</Label>
                  <p className="text-lg font-semibold text-primary">
                    ${parseFloat(internalEstimateForm.amount || '0').toLocaleString()}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="partner-description">Description for Partner *</Label>
                <Textarea
                  id="partner-description"
                  placeholder="Description that will be shown to the partner..."
                  value={internalEstimateForm.description}
                  onChange={(e) => setInternalEstimateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internal-notes" className="flex items-center gap-2">
                  Internal Notes
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">(Admin only - never shown to partner)</span>
                </Label>
                <Textarea
                  id="internal-notes"
                  placeholder="Internal notes visible only to admin team..."
                  value={internalEstimateForm.internal_notes}
                  onChange={(e) => setInternalEstimateForm(prev => ({ ...prev, internal_notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button
                onClick={async () => {
                  if (!internalEstimateForm.amount || !internalEstimateForm.description.trim()) {
                    toast({
                      title: "Validation Error",
                      description: "Amount and description are required.",
                      variant: "destructive"
                    });
                    return;
                  }

                  setIsSubmittingInternal(true);
                  try {
                    const { error } = await supabase
                      .from('work_orders')
                      .update({
                        internal_estimate_amount: parseFloat(internalEstimateForm.amount),
                        internal_estimate_description: internalEstimateForm.description,
                        internal_estimate_notes: internalEstimateForm.internal_notes || null,
                        internal_estimate_created_at: new Date().toISOString(),
                        internal_markup_percentage: internalEstimateForm.markup_percentage
                      })
                      .eq('id', workOrder.id);

                    if (error) throw error;

                    toast({
                      title: "Success",
                      description: "Internal estimate created successfully!"
                    });
                    
                    setInternalEstimateForm({ amount: '', description: '', internal_notes: '', markup_percentage: 20 });
                    refetch();
                  } catch (error) {
                    console.error('Error submitting internal estimate:', error);
                    toast({
                      title: "Error",
                      description: "Failed to submit internal estimate. Please try again.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsSubmittingInternal(false);
                  }
                }}
                disabled={isSubmittingInternal || !internalEstimateForm.amount || !internalEstimateForm.description.trim()}
                className="w-full md:w-auto"
              >
                {isSubmittingInternal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send to Partner
              </Button>
            </CardContent>
          </Card>

          {/* Admin Proxy Submission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Proxy Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proxy-mode"
                  checked={proxyMode}
                  onCheckedChange={(checked) => setProxyMode(checked as boolean)}
                />
                <Label htmlFor="proxy-mode">Submit on behalf of subcontractor</Label>
              </div>

              {proxyMode && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Subcontractor Estimate</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="proxy-amount">Amount</Label>
                      <Input
                        id="proxy-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={proxyEstimateForm.amount}
                        onChange={(e) => setProxyEstimateForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proxy-description">Description</Label>
                    <Textarea
                      id="proxy-description"
                      placeholder="Subcontractor estimate description..."
                      value={proxyEstimateForm.description}
                      onChange={(e) => setProxyEstimateForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={async () => {
                      if (!proxyEstimateForm.amount || !proxyEstimateForm.description.trim()) {
                        toast({
                          title: "Validation Error",
                          description: "Amount and description are required for proxy submission.",
                          variant: "destructive"
                        });
                        return;
                      }

                      setIsSubmittingProxy(true);
                      try {
                        const updates: any = {
                          subcontractor_estimate_amount: parseFloat(proxyEstimateForm.amount),
                          subcontractor_estimate_description: proxyEstimateForm.description,
                          subcontractor_estimate_submitted_at: new Date().toISOString()
                        };

                        // If internal estimate form is also filled, include it
                        if (internalEstimateForm.amount && internalEstimateForm.description.trim()) {
                          updates.internal_estimate_amount = parseFloat(internalEstimateForm.amount);
                          updates.internal_estimate_description = internalEstimateForm.description;
                          updates.internal_estimate_notes = internalEstimateForm.internal_notes || null;
                          updates.internal_estimate_created_at = new Date().toISOString();
                          updates.internal_markup_percentage = internalEstimateForm.markup_percentage;
                        }

                        const { error } = await supabase
                          .from('work_orders')
                          .update(updates)
                          .eq('id', workOrder.id);

                        if (error) throw error;

                        toast({
                          title: "Success",
                          description: "Proxy estimate submitted successfully!"
                        });
                        
                        setProxyEstimateForm({ amount: '', description: '' });
                        setInternalEstimateForm({ amount: '', description: '', internal_notes: '', markup_percentage: 20 });
                        setProxyMode(false);
                        refetch();
                      } catch (error) {
                        console.error('Error submitting proxy estimate:', error);
                        toast({
                          title: "Error",
                          description: "Failed to submit proxy estimate. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setIsSubmittingProxy(false);
                      }
                    }}
                    disabled={isSubmittingProxy || !proxyEstimateForm.amount || !proxyEstimateForm.description.trim()}
                    className="w-full md:w-auto"
                  >
                    {isSubmittingProxy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Both Estimates
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-6">
          <AttachmentSection
            attachments={workOrder.work_order_attachments?.map(attachment => {
              const uploaderOrg = organizationMap?.[attachment.uploaded_by_user_id];
              const uploaderOrgType = (uploaderOrg?.organization_type || 'internal') as 'partner' | 'subcontractor' | 'internal';
              
              return {
                id: attachment.id,
                file_name: attachment.file_name,
                file_url: attachment.file_url,
                file_type: attachment.file_type as 'photo' | 'document',
                file_size: attachment.file_size || 0,
                uploaded_at: attachment.uploaded_at,
                uploader_name: `${attachment.uploaded_by_user?.first_name || ''} ${attachment.uploaded_by_user?.last_name || ''}`.trim(),
                is_internal: attachment.is_internal || false,
                uploader_organization_type: uploaderOrgType
              };
            }) || []}
            workOrderId={workOrder.id}
            canUpload={true}
            onUploadComplete={refetch}
            showInternalToggle={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
