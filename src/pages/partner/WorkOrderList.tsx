import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Eye, Plus, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePartnerWorkOrders } from '@/hooks/usePartnerWorkOrders';
import { useTrades } from '@/hooks/useWorkOrders';
import { format } from 'date-fns';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { formatLocationDisplay, formatLocationTooltip, generateMapUrl } from '@/lib/utils/addressUtils';

const statusColors = {
  received: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const WorkOrderList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  
  const filters = {
    search: search || undefined,
    status: statusFilter && statusFilter !== 'all' ? [statusFilter] : undefined,
    trade_id: tradeFilter && tradeFilter !== 'all' ? tradeFilter : undefined,
  };

  const { data: workOrdersData, isLoading } = usePartnerWorkOrders(filters);
  const { data: trades } = useTrades();

  const workOrders = workOrdersData?.data || [];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Work Orders</h1>
          <p className="text-muted-foreground">
            View and track all your organization's work orders
          </p>
        </div>
        <Button onClick={() => navigate('/partner/work-orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
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

            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades?.map((trade) => (
                  <SelectItem key={trade.id} value={trade.id}>
                    {trade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(search || (statusFilter && statusFilter !== 'all') || (tradeFilter && tradeFilter !== 'all')) && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setTradeFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Work Orders</CardTitle>
          <CardDescription>
            {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading work orders...</div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No work orders found</p>
              <Button onClick={() => navigate('/partner/work-orders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Work Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order #</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Est. Completion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((workOrder) => (
                    <TableRow key={workOrder.id}>
                      <TableCell className="font-medium">
                        {workOrder.work_order_number}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {formatLocationDisplay(workOrder)}
                                  </div>
                                </div>
                                {generateMapUrl(workOrder) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(generateMapUrl(workOrder)!, '_blank');
                                    }}
                                  >
                                    <MapPin className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="whitespace-pre-line text-sm max-w-64">
                                {formatLocationTooltip(workOrder)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {workOrder.trades?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <AssigneeDisplay 
                          assignments={workOrder.work_order_assignments}
                          assignedUser={workOrder.assigned_user}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={statusColors[workOrder.status as keyof typeof statusColors]}
                        >
                          {workOrder.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {workOrder.estimated_completion_date 
                          ? format(new Date(workOrder.estimated_completion_date), 'MMM d, yyyy')
                          : 'TBD'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/partner/work-orders/${workOrder.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkOrderList;