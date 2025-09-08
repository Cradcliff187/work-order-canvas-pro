import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, MapPin, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BasicClockButton } from '@/components/employee/BasicClockButton';
import { useClockState } from '@/hooks/useClockState';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isClocked, clockInTime, workOrderId } = useClockState();

  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ['assignment', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');

      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // First try as assignment ID
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('work_order_assignments')
        .select(`
          *,
          work_orders (
            id,
            title,
            work_order_number,
            description,
            status,
            priority,
            due_date,
            created_at
          ),
          assignee:profiles!work_order_assignments_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (assignmentData) {
        return assignmentData;
      }

      // If not found, try as work order ID and find user's assignment
      const { data: workOrderAssignment, error: workOrderError } = await supabase
        .from('work_order_assignments')
        .select(`
          *,
          work_orders (
            id,
            title,
            work_order_number,
            description,
            status,
            priority,
            due_date,
            created_at
          ),
          assignee:profiles!work_order_assignments_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('work_order_id', id)
        .eq('assigned_to', profile.id)
        .maybeSingle();

      if (workOrderAssignment) {
        return workOrderAssignment;
      }

      // If neither found, throw specific error
      throw new Error('Assignment not found - you may not be assigned to this work order');
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Assignment Not Found</h1>
        </div>
        <p className="text-muted-foreground">The assignment you're looking for could not be found.</p>
      </div>
    );
  }

  const workOrder = assignment.work_orders;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold truncate">Assignment Details</h1>
      </div>

      {/* Work Order Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{workOrder?.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{workOrder?.work_order_number}</p>
            </div>
            <Badge variant={workOrder?.status === 'completed' ? 'secondary' : 'default'}>
              {workOrder?.status}
            </Badge>
          </div>
        </CardHeader>
        {workOrder?.description && (
          <CardContent>
            <p className="text-sm text-foreground">{workOrder.description}</p>
          </CardContent>
        )}
      </Card>


      {/* Assignment Info */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start space-x-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Assignment Type</p>
              <p className="text-sm text-muted-foreground capitalize">{assignment.assignment_type}</p>
            </div>
          </div>
          

          <div className="flex items-start space-x-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Assigned Date</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {workOrder?.due_date && (
            <div className="flex items-start space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Due Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(workOrder.due_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clock Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Current Status</p>
                <p className="text-sm text-muted-foreground">
                  {isClocked 
                    ? `Clocked in ${workOrderId === workOrder?.id ? 'to this work order' : 'to another work order'}`
                    : 'Not clocked in'
                  }
                </p>
              </div>
            </div>
            
            <BasicClockButton 
              onClick={() => {
                if (isClocked && workOrderId === workOrder?.id) {
                  // Already clocked into this work order, this will clock out
                } else if (isClocked && workOrderId !== workOrder?.id) {
                  // Clocked into different work order, this will clock out and clock into this one
                } else {
                  // Not clocked in, this will clock into this work order
                }
                // The BasicClockButton handles the actual clock in/out logic
              }}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}