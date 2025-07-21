
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  Search, 
  Eye, 
  Calendar, 
  MapPin, 
  Building,
  Plus,
  ClipboardList,
  Filter,
  FileText
} from 'lucide-react';
import { usePartnerWorkOrders } from '@/hooks/usePartnerWorkOrders';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

const WorkOrderList = () => {
  const navigate = useNavigate();
  const { data: workOrdersData, isLoading } = usePartnerWorkOrders();
  const { organization: userOrganization } = useUserOrganization();
  const { data: locations } = usePartnerLocations(userOrganization?.id);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const workOrderList = workOrdersData?.data || [];

  const filteredWorkOrders = workOrderList.filter((workOrder) => {
    const matchesSearch = 
      workOrder.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.store_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workOrder.status === statusFilter;
    
    const matchesLocation = locationFilter === 'all' || 
      workOrder.partner_location_number === locationFilter ||
      (locationFilter === 'manual' && !workOrder.partner_location_number);
    
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const hasFilters = searchTerm || statusFilter !== 'all' || locationFilter !== 'all';

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLocationFilter('all');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <Button onClick={() => navigate('/partner/work-orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations && locations.length > 0 && locations.map((location) => (
                  <SelectItem key={location.id} value={location.location_number}>
                    {location.location_name} ({location.location_number})
                  </SelectItem>
                ))}
                <SelectItem value="manual">Manual Locations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Filter : ClipboardList}
            title={hasFilters ? "No results match your criteria" : "No work orders submitted yet"}
            description={hasFilters 
              ? "Try adjusting your filters or search terms to find what you're looking for."
              : "Get started by submitting your first work order to track and manage your maintenance requests."
            }
            action={hasFilters ? {
              label: "Clear Filters",
              onClick: clearAllFilters,
              icon: Filter
            } : {
              label: "Submit Your First Work Order",
              onClick: () => navigate('/partner/work-orders/new'),
              icon: Plus
            }}
          />
        ) : (
          filteredWorkOrders.map((workOrder) => (
            <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{workOrder.work_order_number}</h3>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </div>

                    <h4 className="font-medium text-foreground">{workOrder.title}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{workOrder.store_location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{workOrder.city}, {workOrder.state}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted: {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}</span>
                      </div>
                      {workOrder.trades?.name && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{workOrder.trades.name}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workOrder.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/partner/work-orders/${workOrder.id}`)}
                      className="min-h-[44px] sm:min-h-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkOrderList;
