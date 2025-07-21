import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, FileText, Clock, User, Phone, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { capitalize } from '@/lib/utils';
import type { WorkOrderWithOrganization } from '@/integrations/supabase/types';

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [workOrder, setWorkOrder] = useState<WorkOrderWithOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkOrder = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!id) throw new Error("Work Order ID is required");

        const { data, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            organizations (
              id,
              name,
              initials,
              contact_email
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        setWorkOrder(data as WorkOrderWithOrganization);
      } catch (error: any) {
        console.error("Error fetching work order:", error);
        setError(error.message || "Failed to load work order details.");
        toast({
          variant: "destructive",
          title: "Woops! Something went wrong.",
          description: error.message || "Failed to load work order details.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkOrder();
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/partner/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Work Order Details</h1>
            <p className="text-muted-foreground">View details of a specific work order</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Skeleton className="w-[300px] h-[20px]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/partner/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Work Order Details</h1>
            <p className="text-muted-foreground">View details of a specific work order</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Work order not found.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/partner/work-orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Work Order Details</h1>
          <p className="text-muted-foreground">View details of a specific work order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Work Order Details
              </CardTitle>
              <CardDescription>
                Details about this specific work order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Work Order Number</Label>
                  <p className="text-sm font-bold">{workOrder.work_order_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant="secondary">{capitalize(workOrder.status)}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                  <p className="text-sm">{workOrder.title || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trade</Label>
                  <p className="text-sm">{workOrder.trade_id || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                  <p className="text-sm">
                    {workOrder.created_at ? format(new Date(workOrder.created_at), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                  <p className="text-sm">
                    {workOrder.due_date ? format(new Date(workOrder.due_date), 'MMM dd, yyyy') : 'Not specified'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{workOrder.description || 'No description provided.'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Partner PO Number</Label>
                  <p className="text-sm">{workOrder.partner_po_number || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Partner Location Number</Label>
                  <p className="text-sm">{workOrder.partner_location_number || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          {workOrder.organizations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`https://avatar.vercel.sh/${workOrder.organizations.contact_email}.png`} />
                    <AvatarFallback>{workOrder.organizations.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{workOrder.organizations.name}</div>
                    <div className="text-sm text-muted-foreground">{workOrder.organizations.contact_email}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Log (Example) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>Recent activities related to this work order</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="text-sm font-medium">Work order created</p>
                          <p className="text-xs text-muted-foreground">
                            {workOrder.created_at ? format(new Date(workOrder.created_at), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                          </p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-muted-foreground">
                        Work order was created by {profile?.full_name}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="text-sm font-medium">Status updated</p>
                          <p className="text-xs text-muted-foreground">
                            {workOrder.created_at ? format(new Date(workOrder.created_at), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                          </p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-muted-foreground">
                        Status was updated to {workOrder.status}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
