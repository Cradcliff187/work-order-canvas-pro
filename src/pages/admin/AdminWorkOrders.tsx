import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface WorkOrder {
  id: string;
  work_order_number: string | null;
  title: string;
  status: WorkOrderStatus;
  created_at: string;
  organization: { name: string } | null;
  trade: { name: string } | null;
  assigned_user: { first_name: string; last_name: string } | null;
}

export default function AdminWorkOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ['admin-work-orders', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          title,
          status,
          created_at,
          organizations!organization_id(name),
          trades!trade_id(name)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,work_order_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as WorkOrderStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        work_order_number: item.work_order_number,
        title: item.title,
        status: item.status,
        created_at: item.created_at,
        organization: item.organizations ? { name: (item.organizations as any).name } : null,
        trade: item.trades ? { name: (item.trades as any).name } : null,
        assigned_user: null, // Simplified for now
      })) as WorkOrder[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading work orders: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Work Orders Management</h1>
          <p className="text-muted-foreground">Manage all work orders across organizations</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Work Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by title or work order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : workOrders?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No work orders found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders?.map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell className="font-mono">
                      {workOrder.work_order_number || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {workOrder.title}
                    </TableCell>
                    <TableCell>
                      {workOrder.organization?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {workOrder.trade?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(workOrder.status)}>
                        {workOrder.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workOrder.assigned_user 
                        ? `${workOrder.assigned_user.first_name} ${workOrder.assigned_user.last_name}`
                        : 'Unassigned'
                      }
                    </TableCell>
                    <TableCell>
                      {new Date(workOrder.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}