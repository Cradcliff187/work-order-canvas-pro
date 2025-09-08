import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, MapPin, User, Building, Briefcase, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BasicClockButton } from '@/components/employee/BasicClockButton';
import { useClockState } from '@/hooks/useClockState';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Unified assignment interface
interface UnifiedAssignment {
  id: string;
  type: 'work_order' | 'project';
  assignment_type: string;
  assigned_at: string;
  assignee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  work_order?: {
    id: string;
    title: string;
    work_order_number: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    created_at: string;
  };
  project?: {
    id: string;
    name: string;
    project_number: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    created_at: string;
  };
}

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isClocked, clockInTime, workOrderId, projectId } = useClockState();

  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ['assignment', id],
    queryFn: async (): Promise<UnifiedAssignment> => {
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

      // 1. Try as work order assignment ID
      const { data: workOrderAssignmentData } = await supabase
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

      if (workOrderAssignmentData) {
        return {
          ...workOrderAssignmentData,
          type: 'work_order',
          work_order: workOrderAssignmentData.work_orders
        };
      }

      // 2. Try as project assignment ID
      const { data: projectAssignmentData } = await supabase
        .from('project_assignments')
        .select(`
          *,
          projects (
            id,
            name,
            project_number,
            description,
            status,
            start_date,
            end_date,
            created_at
          ),
          assignee:profiles!project_assignments_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (projectAssignmentData) {
        return {
          ...projectAssignmentData,
          type: 'project',
          project: projectAssignmentData.projects
        };
      }

      // 3. Try as work order ID and find user's assignment
      const { data: workOrderUserAssignment } = await supabase
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

      if (workOrderUserAssignment) {
        return {
          ...workOrderUserAssignment,
          type: 'work_order',
          work_order: workOrderUserAssignment.work_orders
        };
      }

      // 4. Try as project ID and find user's assignment
      const { data: projectUserAssignment } = await supabase
        .from('project_assignments')
        .select(`
          *,
          projects (
            id,
            name,
            project_number,
            description,
            status,
            start_date,
            end_date,
            created_at
          ),
          assignee:profiles!project_assignments_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', id)
        .eq('assigned_to', profile.id)
        .maybeSingle();

      if (projectUserAssignment) {
        return {
          ...projectUserAssignment,
          type: 'project',
          project: projectUserAssignment.projects
        };
      }

      // If nothing found, throw specific error
      throw new Error('Assignment not found - you may not be assigned to this work order or project');
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

  const workOrder = assignment?.work_order;
  const project = assignment?.project;
  const item = workOrder || project;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold truncate">Assignment Details</h1>
      </div>

      {/* Work Item Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {assignment.type === 'work_order' ? (
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-base">
                  {assignment.type === 'work_order' ? workOrder?.title : project?.name}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {assignment.type === 'work_order' ? workOrder?.work_order_number : project?.project_number}
              </p>
            </div>
            <Badge variant={item?.status === 'completed' ? 'secondary' : 'default'}>
              {item?.status}
            </Badge>
          </div>
        </CardHeader>
        {item?.description && (
          <CardContent>
            <p className="text-sm text-foreground">{item.description}</p>
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

          {assignment.type === 'work_order' && workOrder?.due_date && (
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

          {assignment.type === 'project' && project?.start_date && (
            <div className="flex items-start space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(project.start_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          {assignment.type === 'project' && project?.end_date && (
            <div className="flex items-start space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">End Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(project.end_date), 'MMM d, yyyy')}
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
                    ? assignment.type === 'work_order' 
                      ? `Clocked in ${workOrderId === workOrder?.id ? 'to this work order' : 'to another item'}`
                      : `Clocked in ${projectId === project?.id ? 'to this project' : 'to another item'}`
                    : 'Not clocked in'
                  }
                </p>
              </div>
            </div>
            
            <BasicClockButton 
              onClick={() => {
                // BasicClockButton now handles the proper logic for both work orders and projects
                // based on the useClockWidgetActions hook which already supports both types
              }}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}