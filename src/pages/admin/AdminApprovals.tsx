import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, Filter, X, CheckCircle, RotateCcw } from 'lucide-react';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { ApprovalQueueItem } from '@/components/admin/approvals/ApprovalQueueItem';
import { useToast } from '@/hooks/use-toast';

export default function AdminApprovals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

  const { data: approvalItems = [], totalCount = 0, loading, error } = useApprovalQueue();

  // Filter items
  const filteredItems = approvalItems.filter(item => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesUrgency = urgencyFilter === 'all' || item.urgency === urgencyFilter;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesUrgency && matchesSearch;
  });

  const clearFilters = () => {
    setTypeFilter('all');
    setUrgencyFilter('all');
    setSearchQuery('');
  };

  const handleView = (item: any) => {
    if (item.type === 'report') {
      navigate(`/admin/reports/${item.id}`);
    } else {
      navigate(`/admin/invoices/${item.id}`);
    }
  };

  const handleApprove = async (item: any) => {
    setLoadingItems(prev => new Set(prev).add(item.id));
    try {
      // TODO: Implement approval API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Temporary simulation
      toast({
        title: "Item approved",
        description: `${item.title} has been approved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleReject = async (item: any) => {
    setLoadingItems(prev => new Set(prev).add(item.id));
    try {
      // TODO: Implement rejection API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Temporary simulation
      toast({
        title: "Item rejected",
        description: `${item.title} has been rejected.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Approval Center</h1>
          <p className="text-muted-foreground">
            Review and approve pending items
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load approvals</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading the approval queue.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Approval Center</h1>
        <p className="text-muted-foreground">
          Review and approve pending items
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or submitter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>

            {(typeFilter !== 'all' || urgencyFilter !== 'all' || searchQuery) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            renderLoadingSkeleton()
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No pending approvals"
              description={
                searchQuery || typeFilter !== 'all' || urgencyFilter !== 'all'
                  ? "No items match your current filters."
                  : "All items have been reviewed. New submissions will appear here."
              }
              variant="card"
            />
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ApprovalQueueItem
                  key={item.id}
                  item={item}
                  onView={handleView}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={loadingItems.has(item.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}