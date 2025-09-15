import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceiptCard } from "@/components/receipts/ReceiptCard";
import { useReceipts } from "@/hooks/useReceipts";
import { useAdminReceipts } from "@/hooks/useAdminReceipts";
import { AdminReceiptCreateModal } from "@/components/admin/AdminReceiptCreateModal";
import { Search, Plus, Receipt as ReceiptIcon, DollarSign, FileText, AlertCircle, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function AdminReceipts() {
  const { receipts, deleteReceipt } = useReceipts();
  const { allReceipts } = useAdminReceipts();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");

  // Use admin receipts data which includes creator info
  const receiptList = allReceipts.data || [];

  // Filter receipts
  const filteredReceipts = receiptList.filter((receipt) => {
    const matchesSearch = 
      receipt.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.receipt_work_orders.some(allocation => 
        allocation.work_orders.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.work_orders.title.toLowerCase().includes(searchTerm.toLowerCase())
      );

    let matchesDate = true;
    if (dateFilter !== "all") {
      const receiptDate = new Date(receipt.receipt_date);
      const now = new Date();
      
      switch (dateFilter) {
        case "this-month":
          matchesDate = receiptDate >= startOfMonth(now) && receiptDate <= endOfMonth(now);
          break;
        case "last-month":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesDate = receiptDate >= startOfMonth(lastMonth) && receiptDate <= endOfMonth(lastMonth);
          break;
        case "last-3-months":
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          matchesDate = receiptDate >= threeMonthsAgo;
          break;
      }
    }

    let matchesCreator = true;
    if (creatorFilter !== "all") {
      const isAdminCreated = receipt.is_admin_entered;
      matchesCreator = creatorFilter === "admin" ? isAdminCreated : !isAdminCreated;
    }

    return matchesSearch && matchesDate && matchesCreator;
  });

  // Calculate summary stats
  const totalReceipts = receiptList.length;
  const adminCreatedReceipts = receiptList.filter(r => r.is_admin_entered).length;
  const employeeCreatedReceipts = totalReceipts - adminCreatedReceipts;
  const totalAmount = receiptList.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalAllocated = receiptList.reduce((sum, receipt) => 
    sum + receipt.receipt_work_orders.reduce((allocSum, allocation) => 
      allocSum + allocation.allocated_amount, 0
    ), 0
  );

  const handleDelete = async (receiptId: string) => {
    if (window.confirm("Are you sure you want to delete this receipt? This action cannot be undone.")) {
      await deleteReceipt.mutateAsync(receiptId);
    }
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Receipts</span>
            </div>
            <p className="text-2xl font-bold mt-2">{totalReceipts}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Admin Created</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-blue-600">{adminCreatedReceipts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Employee Created</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600">{employeeCreatedReceipts}</p>
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
              Unallocated: ${(totalAmount - totalAllocated).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="last-3-months">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
        <Select value={creatorFilter} onValueChange={setCreatorFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by creator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All creators</SelectItem>
            <SelectItem value="admin">Admin created</SelectItem>
            <SelectItem value="employee">Employee created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Receipts List */}
      <div className="space-y-4">
        {filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm || dateFilter !== "all" || creatorFilter !== "all"
                ? "No receipts match your search criteria."
                : "No receipts found. Create your first receipt to get started."
              }
            </CardContent>
          </Card>
        ) : (
          filteredReceipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}