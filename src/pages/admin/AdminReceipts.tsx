import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceiptCard } from "@/components/receipts/ReceiptCard";
import { useReceipts } from "@/hooks/useReceipts";
import { useAdminReceipts } from "@/hooks/useAdminReceipts";
import { AdminReceiptCreateModal } from "@/components/admin/AdminReceiptCreateModal";
import { EnhancedReceiptsFilters, type EnhancedReceiptsFiltersValue } from "@/components/admin/receipts/EnhancedReceiptsFilters";
import { Search, Plus, Receipt as ReceiptIcon, DollarSign, FileText, AlertCircle, User, Settings, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminReceipts() {
  const { receipts, deleteReceipt } = useReceipts();
  const { allReceipts } = useAdminReceipts();
  const { toast } = useToast();
  const [filters, setFilters] = useState<EnhancedReceiptsFiltersValue>({});

  // Use admin receipts data which includes creator info
  const receiptList = allReceipts.data || [];

  // Enhanced filtering logic
  const filteredReceipts = useMemo(() => {
    return receiptList.filter((receipt) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          receipt.vendor_name.toLowerCase().includes(searchLower) ||
          receipt.description?.toLowerCase().includes(searchLower) ||
          receipt.receipt_work_orders?.some(allocation => 
            allocation.work_orders?.work_order_number.toLowerCase().includes(searchLower) ||
            allocation.work_orders?.title.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const receiptDate = new Date(receipt.receipt_date);
        if (filters.dateRange.from && filters.dateRange.to) {
          if (!isWithinInterval(receiptDate, { 
            start: filters.dateRange.from, 
            end: filters.dateRange.to 
          })) return false;
        } else if (filters.dateRange.from) {
          if (receiptDate < filters.dateRange.from) return false;
        } else if (filters.dateRange.to) {
          if (receiptDate > filters.dateRange.to) return false;
        }
      }

      // Status filter
      if (filters.status && receipt.status !== filters.status) {
        return false;
      }

      // Creator type filter
      if (filters.creator_type) {
        const isAdminCreated = receipt.is_admin_entered;
        if (filters.creator_type === 'admin' && !isAdminCreated) return false;
        if (filters.creator_type === 'employee' && isAdminCreated) return false;
      }

      // Vendor filter
      if (filters.vendor && !receipt.vendor_name.toLowerCase().includes(filters.vendor.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filters.category && receipt.category !== filters.category) {
        return false;
      }

      // Amount range filter
      if (filters.amount_min !== undefined && receipt.amount < filters.amount_min) {
        return false;
      }
      if (filters.amount_max !== undefined && receipt.amount > filters.amount_max) {
        return false;
      }

      // Allocation status filter
      if (filters.allocation_status) {
        const allocatedPercentage = receipt.allocation_percentage || 0;
        switch (filters.allocation_status) {
          case 'none':
            if (allocatedPercentage > 0) return false;
            break;
          case 'partial':
            if (allocatedPercentage === 0 || allocatedPercentage >= 100) return false;
            break;
          case 'full':
            if (allocatedPercentage < 100) return false;
            break;
        }
      }

      // Has attachment filter
      if (filters.has_attachment && !receipt.receipt_image_url) {
        return false;
      }

      return true;
    });
  }, [receiptList, filters]);

  // Calculate enhanced summary stats
  const totalReceipts = receiptList.length;
  const adminCreatedReceipts = receiptList.filter(r => r.is_admin_entered).length;
  const employeeCreatedReceipts = totalReceipts - adminCreatedReceipts;
  const pendingReceipts = receiptList.filter(r => r.status === 'submitted').length;
  const approvedReceipts = receiptList.filter(r => r.status === 'approved').length;
  const rejectedReceipts = receiptList.filter(r => r.status === 'rejected').length;
  
  const totalAmount = receiptList.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalAllocated = receiptList.reduce((sum, receipt) => 
    sum + (receipt.allocated_amount || 0), 0
  );

  const handleDelete = async (receiptId: string) => {
    try {
      await deleteReceipt.mutateAsync(receiptId);
      toast({
        title: "Receipt Deleted",
        description: "The receipt has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    // Export filtered receipts to CSV
    const csvData = filteredReceipts.map(receipt => ({
      'Receipt ID': receipt.id,
      'Vendor': receipt.vendor_name,
      'Amount': receipt.amount,
      'Date': format(new Date(receipt.receipt_date), 'yyyy-MM-dd'),
      'Status': receipt.status || 'submitted',
      'Category': receipt.category || 'Other',
      'Creator Type': receipt.is_admin_entered ? 'Admin' : 'Employee',
      'Employee': receipt.employee_profile ? 
        `${receipt.employee_profile.first_name} ${receipt.employee_profile.last_name}` : '',
      'Allocated Amount': receipt.allocated_amount || 0,
      'Allocation %': (receipt.allocation_percentage || 0).toFixed(1),
      'Description': receipt.description || '',
      'Notes': receipt.notes || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredReceipts.length} receipts to CSV.`,
    });
  };

  if (receipts.isLoading || allReceipts.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
        <div>
          <h1 className="text-2xl font-bold">Admin Receipts Management</h1>
          <p className="text-muted-foreground">Manage all receipts and create receipts for employees</p>
        </div>
        <div className="flex gap-2">
          <AdminReceiptCreateModal 
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Receipt
              </Button>
            }
          />
          <Link to="/admin/receipts/upload">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload Receipt
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-2">{totalReceipts}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-amber-600">{pendingReceipts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600">{approvedReceipts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-red-600">{rejectedReceipts}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Amount</span>
            </div>
            <p className="text-2xl font-bold mt-2">${totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Allocated</span>
            </div>
            <p className="text-2xl font-bold mt-2">${totalAllocated.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAmount > 0 ? ((totalAllocated / totalAmount) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <EnhancedReceiptsFilters
        value={filters}
        onChange={setFilters}
        onExport={filteredReceipts.length > 0 ? handleExport : undefined}
      />

      {/* Enhanced Results Display */}
      <div className="space-y-4">
        {filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <ReceiptIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Receipts Found</h3>
              <p className="text-muted-foreground mb-6">
                {Object.keys(filters).some(key => filters[key as keyof EnhancedReceiptsFiltersValue] !== undefined)
                  ? "No receipts match your current filter criteria. Try adjusting your filters or clearing them to see more results."
                  : "No receipts found. Create your first receipt to get started."
                }
              </p>
              {Object.keys(filters).some(key => filters[key as keyof EnhancedReceiptsFiltersValue] !== undefined) && (
                <Button variant="outline" onClick={() => setFilters({})}>
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredReceipts.length} of {totalReceipts} receipts
              </div>
              {filteredReceipts.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total filtered amount: ${filteredReceipts.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                </div>
              )}
            </div>
            
            {filteredReceipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}