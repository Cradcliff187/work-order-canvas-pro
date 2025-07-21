import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, FileText, Clock, User, Phone, Mail } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

// Function to fetch work order details by ID
const getWorkOrder = async (id: string) => {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export default function AdminWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();

  // Fetch work order details using React Query
  const { data: workOrder, isLoading, isError, error } = useQuery(
    ['workOrder', id],
    () => getWorkOrder(id!),
    {
      enabled: !!id, // Only run the query if the ID is available
    }
  );

  if (isLoading) {
    return <div>Loading work order details...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  if (!workOrder) {
    return <div>Work order not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/work-orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Work Order Details</h1>
          <p className="text-muted-foreground">View details of work order {workOrder.id}</p>
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
                Work Order Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                  <p className="text-sm">{workOrder.title || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant="secondary">{workOrder.status || 'Not specified'}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trade</Label>
                  <p className="text-sm">{workOrder.trade_id || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                  <p className="text-sm">{workOrder.created_at || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{workOrder.description || 'Not specified'}</p>
                </div>
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

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Name</Label>
                  <p className="text-sm">{workOrder.location_contact_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Phone</Label>
                  <p className="text-sm">{workOrder.location_contact_phone || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Email</Label>
                  <p className="text-sm">{workOrder.location_contact_email || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{workOrder.status || 'Not specified'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
