import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons
import { 
  Search, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  Building2,
  MapPin
} from 'lucide-react';

// Hooks
import { useDebounce } from '@/hooks/useDebounce';

// Types
import type { PipelineStage, WorkOrderSummary } from '@/hooks/useWorkOrderPipeline';

interface PipelineStageModalProps {
  stage: PipelineStage | null;
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 10;

export function PipelineStageModal({ stage, isOpen, onClose }: PipelineStageModalProps) {
  const navigate = useNavigate();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [overdueFilter, setOverdueFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Filter and paginate work orders
  const filteredAndPaginatedData = useMemo(() => {
    if (!stage) return { workOrders: [], totalCount: 0 };
    
    let filtered = stage.workOrders;
    
    // Apply search filter
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(wo => 
        wo.work_order_number?.toLowerCase().includes(searchLower) ||
        wo.title?.toLowerCase().includes(searchLower) ||
        wo.store_location?.toLowerCase().includes(searchLower) ||
        wo.organization_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(wo => wo.priority === priorityFilter);
    }
    
    // Apply assignment filter - using placeholder logic since assignment data not in summary
    if (assignmentFilter === 'assigned') {
      // TODO: Add assignment data to WorkOrderSummary or fetch separately
      filtered = filtered.filter(wo => false); // Placeholder - always false for now
    } else if (assignmentFilter === 'unassigned') {
      // TODO: Add assignment data to WorkOrderSummary or fetch separately  
      filtered = filtered.filter(wo => true); // Placeholder - always true for now
    }
    
    // Apply overdue filter
    if (overdueFilter === 'overdue') {
      filtered = filtered.filter(wo => wo.due_date && new Date(wo.due_date) < new Date());
    } else if (overdueFilter === 'not_overdue') {
      filtered = filtered.filter(wo => !wo.due_date || new Date(wo.due_date) >= new Date());
    }
    
    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedWorkOrders = filtered.slice(startIndex, startIndex + PAGE_SIZE);
    
    return {
      workOrders: paginatedWorkOrders,
      totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE)
    };
  }, [stage, debouncedSearch, priorityFilter, assignmentFilter, overdueFilter, currentPage]);
  
  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, priorityFilter, assignmentFilter, overdueFilter]);
  
  const handleWorkOrderClick = useCallback((workOrderId: string) => {
    navigate(`/admin/work-orders/${workOrderId}`);
    onClose();
  }, [navigate, onClose]);
  
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setPriorityFilter('all');
    setAssignmentFilter('all');
    setOverdueFilter('all');
    setCurrentPage(1);
  }, []);
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const getWorkOrderAge = (dateSubmitted: string) => {
    const days = differenceInDays(new Date(), new Date(dateSubmitted));
    return days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
  };
  
  const isOverdue = (dueDateString: string | null) => {
    if (!dueDateString) return false;
    return new Date(dueDateString) < new Date();
  };
  
  const getPriorityColor = (priority: 'low' | 'standard' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'standard': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };
  
  const hasActiveFilters = debouncedSearch || priorityFilter !== 'all' || assignmentFilter !== 'all' || overdueFilter !== 'all';

  if (!stage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">{stage.stageName}</span>
              <Badge variant="outline" className="text-sm">
                {stage.totalCount} total
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4 pb-4 border-b">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search work orders, locations, organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Due Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="not_overdue">On Time</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Work Orders List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredAndPaginatedData.workOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {hasActiveFilters ? 'No work orders match your filters' : 'No work orders in this stage'}
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-2" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            filteredAndPaginatedData.workOrders.map((workOrder) => (
              <Card 
                key={workOrder.id}
                className="cursor-pointer hover:shadow-md smooth-transition-colors hover:border-primary/20 group"
                onClick={() => handleWorkOrderClick(workOrder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Header: Number, Title, Priority */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-primary">
                            {workOrder.work_order_number || 'No Number'}
                          </span>
                          <Badge variant={getPriorityColor(workOrder.priority)} className="text-xs">
                            {workOrder.priority}
                          </Badge>
                          {isOverdue(workOrder.due_date) && (
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {workOrder.title}
                        </h4>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {workOrder.organization_name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate">{workOrder.organization_name}</span>
                          </div>
                        )}
                        {workOrder.store_location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{workOrder.store_location}</span>
                          </div>
                        )}
                        {/* TODO: Add assignment display when data available */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{getWorkOrderAge(workOrder.date_submitted)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {workOrder.due_date && (
                        <div className={`text-xs text-right ${isOverdue(workOrder.due_date) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          Due: {formatDate(workOrder.due_date)}
                        </div>
                      )}
                      
                      {/* Quick assign button - always show for now since assignment data not available */}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement quick assign functionality
                          console.log('Quick assign for:', workOrder.id);
                        }}
                      >
                        Quick Assign
                      </Button>
                      
                      <Button size="sm" variant="ghost" className="text-xs">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredAndPaginatedData.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filteredAndPaginatedData.totalCount)} of {filteredAndPaginatedData.totalCount} work orders
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                <span className="text-sm">Page {currentPage} of {filteredAndPaginatedData.totalPages}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === filteredAndPaginatedData.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}