import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  RowSelectionState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, Filter, X, CheckCircle, RotateCcw, FileText, DollarSign } from 'lucide-react';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { useAdminReportMutations } from '@/hooks/useAdminReportMutations';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';
import { createApprovalColumns } from '@/components/admin/approvals/ApprovalColumns';
import { useToast } from '@/hooks/use-toast';
import { QueryErrorBoundary } from '@/components/ui/query-error-boundary';
import { isValidUUID } from '@/lib/utils/validation';
import { useOptimisticApprovals } from '@/hooks/useOptimisticApprovals';
import { useApprovalRetry } from '@/hooks/useApprovalRetry';
import { BulkActionsBar } from '@/components/admin/approvals/BulkActionsBar';
import { EnhancedApprovalSkeleton } from '@/components/admin/approvals/EnhancedApprovalSkeleton';

export default function AdminApprovals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('reports');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data: approvalItems = [], totalCount = 0, loading, error } = useApprovalQueue();
  
  // Enhanced hooks for Phase 3
  const optimistic = useOptimisticApprovals();
  const retry = useApprovalRetry();
  
  // Retry mechanism for the approval queue
  const retryApprovalQueue = () => {
    queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
  };
  const { reviewReport } = useAdminReportMutations();
  const { approveInvoice, rejectInvoice } = useInvoiceMutations();

  // Optimized filtering with memoization and optimistic updates
  const { reportItems, invoiceItems, filteredItems } = useMemo(() => {
    // Apply optimistic filtering to hide approved/rejected items
    const optimisticItems = optimistic.applyOptimisticFiltering(approvalItems);
    
    const reports = optimisticItems.filter(item => item.type === 'report');
    const invoices = optimisticItems.filter(item => item.type === 'invoice');
    
    const filtered = optimisticItems.filter(item => {
      const matchesTab = activeTab === 'reports' ? item.type === 'report' : item.type === 'invoice';
      const matchesUrgency = urgencyFilter === 'all' || item.urgency === urgencyFilter;
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesTab && matchesUrgency && matchesSearch;
    });
    
    return {
      reportItems: reports,
      invoiceItems: invoices,
      filteredItems: filtered
    };
  }, [approvalItems, activeTab, urgencyFilter, searchQuery, optimistic]);

  // Get current tab items
  const currentTabItems = activeTab === 'reports' ? reportItems : invoiceItems;

  const clearFilters = () => {
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
    // Enhanced validation with UUID checking
    if (!item?.id || !isValidUUID(item.id)) {
      toast({
        title: "Invalid item",
        description: "The selected item has an invalid identifier",
        variant: "destructive",
      });
      return;
    }

    if (!item.type || !['report', 'invoice'].includes(item.type)) {
      toast({
        title: "Invalid item type",
        description: "The selected item type is not supported",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    optimistic.updateOptimisticState(item.id, 'approving');
    setLoadingItems(prev => new Set(prev).add(item.id));
    
    const performApproval = async () => {
      if (item.type === 'report') {
        return await reviewReport.mutateAsync({ 
          reportId: item.id, 
          status: 'approved' 
        });
      } else {
        return await approveInvoice.mutateAsync({ 
          invoiceId: item.id 
        });
      }
    };

    try {
      await performApproval();
      
      // Mark as approved optimistically
      optimistic.updateOptimisticState(item.id, 'approved');
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
      toast({
        title: "Item approved",
        description: `${item.title} has been approved successfully.`,
      });
    } catch (error: any) {
      console.error('Approval error:', error);
      
      // Check if retry is applicable
      if (retry.shouldRetry(item.id, error)) {
        toast({
          title: "Approval failed - retrying",
          description: "Attempting to retry the approval...",
          variant: "destructive",
        });
        
        await retry.scheduleRetry(
          item.id,
          performApproval,
          () => {
            optimistic.updateOptimisticState(item.id, 'approved');
            queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
            toast({
              title: "Item approved",
              description: `${item.title} has been approved after retry.`,
            });
          },
          (retryError) => {
            optimistic.rollbackOptimisticUpdate(item.id);
            toast({
              title: "Approval failed",
              description: retryError?.message || "Failed to approve item after retries",
              variant: "destructive",
            });
          }
        );
      } else {
        // Rollback optimistic update
        optimistic.rollbackOptimisticUpdate(item.id);
        
        const errorMessage = error?.message || "Failed to approve item";
        toast({
          title: "Approval failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleReject = async (item: any) => {
    // Enhanced validation with UUID checking
    if (!item?.id || !isValidUUID(item.id)) {
      toast({
        title: "Invalid item",
        description: "The selected item has an invalid identifier",
        variant: "destructive",
      });
      return;
    }

    if (!item.type || !['report', 'invoice'].includes(item.type)) {
      toast({
        title: "Invalid item type",
        description: "The selected item type is not supported",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    optimistic.updateOptimisticState(item.id, 'rejecting');
    setLoadingItems(prev => new Set(prev).add(item.id));
    
    const performRejection = async () => {
      if (item.type === 'report') {
        return await reviewReport.mutateAsync({ 
          reportId: item.id, 
          status: 'rejected',
          reviewNotes: 'Rejected from approval center'
        });
      } else {
        return await rejectInvoice.mutateAsync({ 
          invoiceId: item.id,
          notes: 'Rejected from approval center'
        });
      }
    };

    try {
      await performRejection();
      
      // Mark as rejected optimistically
      optimistic.updateOptimisticState(item.id, 'rejected');
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
      toast({
        title: "Item rejected",
        description: `${item.title} has been rejected.`,
      });
    } catch (error: any) {
      console.error('Rejection error:', error);
      
      // Check if retry is applicable
      if (retry.shouldRetry(item.id, error)) {
        toast({
          title: "Rejection failed - retrying",
          description: "Attempting to retry the rejection...",
          variant: "destructive",
        });
        
        await retry.scheduleRetry(
          item.id,
          performRejection,
          () => {
            optimistic.updateOptimisticState(item.id, 'rejected');
            queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
            toast({
              title: "Item rejected",
              description: `${item.title} has been rejected after retry.`,
            });
          },
          (retryError) => {
            optimistic.rollbackOptimisticUpdate(item.id);
            toast({
              title: "Rejection failed",
              description: retryError?.message || "Failed to reject item after retries",
              variant: "destructive",
            });
          }
        );
      } else {
        // Rollback optimistic update
        optimistic.rollbackOptimisticUpdate(item.id);
        
        const errorMessage = error?.message || "Failed to reject item";
        toast({
          title: "Rejection failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Optimized table setup with stable references
  const columns = useMemo(() => createApprovalColumns({
    onView: handleView,
    onApprove: handleApprove,
    onReject: handleReject,
    loadingItems: new Set([...loadingItems, ...Array.from(optimistic.isPending ? [] : [])]),
  }), [loadingItems, optimistic]);

  const tableData = useMemo(() => filteredItems, [filteredItems]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  // Get selected items for bulk actions
  const selectedItems = useMemo(() => {
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    return filteredItems.filter((item, index) => selectedIds.includes(String(index)));
  }, [rowSelection, filteredItems]);

  const isMobile = useIsMobile();
  
  const clearSelection = () => setRowSelection({});

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
    <QueryErrorBoundary 
      onRetry={retryApprovalQueue}
      fallbackTitle="Failed to load approval center"
      fallbackDescription="There was an error loading the approval queue. Please try again."
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Approval Center</h1>
          <p className="text-muted-foreground">
            Review and approve pending items
          </p>
        </div>

      {/* Filters */}
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

            {(urgencyFilter !== 'all' || searchQuery) && (
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

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports ({reportItems.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Invoices ({invoiceItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Report Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <EnhancedApprovalSkeleton showFilters={false} showTabs={false} />
              ) : reportItems.filter(item =>
                (urgencyFilter === 'all' || item.urgency === urgencyFilter) &&
                (!searchQuery || 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No pending report approvals"
                  description={
                    searchQuery || urgencyFilter !== 'all'
                      ? "No reports match your current filters."
                      : "All reports have been reviewed. New submissions will appear here."
                  }
                  variant="full"
                />
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-md border">
                    <Table className="admin-table">
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              onClick={(e) => {
                                // Don't navigate if clicking interactive elements
                                const target = e.target as HTMLElement;
                                if (target instanceof HTMLButtonElement || 
                                    target instanceof HTMLInputElement ||
                                    target.closest('[role="checkbox"]') ||
                                    target.closest('[data-radix-collection-item]') ||
                                    target.closest('.dropdown-trigger')) {
                                  return;
                                }
                                handleView(row.original);
                              }}
                              className="cursor-pointer"
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <EmptyTableState
                            icon={FileText}
                            title="No reports found"
                            description="Try adjusting your filters"
                            colSpan={columns.length}
                          />
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block lg:hidden space-y-3">
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const item = row.original;
                        return (
                          <MobileTableCard
                            key={item.id}
                            title={item.title}
                            subtitle={`By: ${item.submittedBy} • ${item.urgency} urgency`}
                            status={
                              <div className="flex flex-col gap-1">
                                <div className="text-xs text-muted-foreground">
                                  {item.submittedAt}
                                </div>
                              </div>
                            }
                            onClick={() => handleView(item)}
                          />
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={FileText}
                        title="No reports found"
                        description="Try adjusting your filters"
                        variant="full"
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invoice Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <EnhancedApprovalSkeleton showFilters={false} showTabs={false} />
              ) : invoiceItems.filter(item =>
                (urgencyFilter === 'all' || item.urgency === urgencyFilter) &&
                (!searchQuery || 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="No pending invoice approvals"
                  description={
                    searchQuery || urgencyFilter !== 'all'
                      ? "No invoices match your current filters."
                      : "All invoices have been reviewed. New submissions will appear here."
                  }
                  variant="full"
                />
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-md border">
                    <Table className="admin-table">
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              onClick={(e) => {
                                // Don't navigate if clicking interactive elements
                                const target = e.target as HTMLElement;
                                if (target instanceof HTMLButtonElement || 
                                    target instanceof HTMLInputElement ||
                                    target.closest('[role="checkbox"]') ||
                                    target.closest('[data-radix-collection-item]') ||
                                    target.closest('.dropdown-trigger')) {
                                  return;
                                }
                                handleView(row.original);
                              }}
                              className="cursor-pointer"
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <EmptyTableState
                            icon={DollarSign}
                            title="No invoices found"
                            description="Try adjusting your filters"
                            colSpan={columns.length}
                          />
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block lg:hidden space-y-3">
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const item = row.original;
                        return (
                          <MobileTableCard
                            key={item.id}
                            title={item.title}
                            subtitle={`By: ${item.submittedBy} • $${item.amount}`}
                            status={
                              <div className="flex flex-col gap-1">
                                <div className="text-xs text-muted-foreground">
                                  {item.submittedAt}
                                </div>
                              </div>
                            }
                            onClick={() => handleView(item)}
                          />
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={DollarSign}
                        title="No invoices found"
                        description="Try adjusting your filters"
                        variant="full"
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
        {/* Bulk Actions Bar */}
        <BulkActionsBar 
          selectedItems={selectedItems}
          onClearSelection={clearSelection}
        />
      </div>
    </QueryErrorBoundary>
  );
}