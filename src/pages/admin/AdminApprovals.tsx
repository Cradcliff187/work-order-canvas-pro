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
import { Search, Filter, X, CheckCircle, RotateCcw, FileText, DollarSign } from 'lucide-react';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApprovalQueue } from '@/hooks/useApprovalQueue';
import { useAdminReportMutations } from '@/hooks/useAdminReportMutations';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';
import { createApprovalColumns } from '@/components/admin/approvals/ApprovalColumns';
import { useToast } from '@/hooks/use-toast';

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
  const { reviewReport } = useAdminReportMutations();
  const { approveInvoice, rejectInvoice } = useInvoiceMutations();

  // Filter items by tab and other filters
  const filteredItems = approvalItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab.slice(0, -1); // 'reports' -> 'report'
    const matchesUrgency = urgencyFilter === 'all' || item.urgency === urgencyFilter;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesUrgency && matchesSearch;
  });

  // Separate items by type for tabs
  const reportItems = approvalItems.filter(item => item.type === 'report');
  const invoiceItems = approvalItems.filter(item => item.type === 'invoice');

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
    setLoadingItems(prev => new Set(prev).add(item.id));
    
    try {
      if (item.type === 'report') {
        await reviewReport.mutateAsync({ 
          reportId: item.id, 
          status: 'approved' 
        });
      } else {
        await approveInvoice.mutateAsync({ 
          invoiceId: item.id 
        });
      }
      
      // Refetch approval queue
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
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
      if (item.type === 'report') {
        await reviewReport.mutateAsync({ 
          reportId: item.id, 
          status: 'rejected',
          reviewNotes: 'Rejected from approval center'
        });
      } else {
        await rejectInvoice.mutateAsync({ 
          invoiceId: item.id,
          notes: 'Rejected from approval center'
        });
      }
      
      // Refetch approval queue
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
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

  // Table setup
  const columns = useMemo(() => createApprovalColumns({
    onView: handleView,
    onApprove: handleApprove,
    onReject: handleReject,
    loadingItems,
  }), [loadingItems]);

  const table = useReactTable({
    data: filteredItems.filter(item => 
      activeTab === 'reports' ? item.type === 'report' : item.type === 'invoice'
    ),
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const isMobile = useIsMobile();

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
                <TableSkeleton rows={5} columns={7} />
              ) : reportItems.filter(item => 
                (urgencyFilter === 'all' || item.urgency === urgencyFilter) &&
                (!searchQuery || 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <EmptyTableState
                  icon={FileText}
                  title="No pending report approvals"
                  description={
                    searchQuery || urgencyFilter !== 'all'
                      ? "No reports match your current filters."
                      : "All reports have been reviewed. New submissions will appear here."
                  }
                  colSpan={columns.length}
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
                      <EmptyTableState
                        icon={FileText}
                        title="No reports found"
                        description="Try adjusting your filters"
                        colSpan={1}
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
                <TableSkeleton rows={5} columns={7} />
              ) : invoiceItems.filter(item => 
                (urgencyFilter === 'all' || item.urgency === urgencyFilter) &&
                (!searchQuery || 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <EmptyTableState
                  icon={DollarSign}
                  title="No pending invoice approvals"
                  description={
                    searchQuery || urgencyFilter !== 'all'
                      ? "No invoices match your current filters."
                      : "All invoices have been reviewed. New submissions will appear here."
                  }
                  colSpan={columns.length}
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
                      <EmptyTableState
                        icon={DollarSign}
                        title="No invoices found"
                        description="Try adjusting your filters"
                        colSpan={1}
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}