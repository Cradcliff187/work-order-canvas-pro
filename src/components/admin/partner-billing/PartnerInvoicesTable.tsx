import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Eye } from 'lucide-react';
import { ViewMode } from '@/hooks/useViewMode';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { SkeletonGroup } from '@/components/ui/enhanced-skeleton';
import { TableToolbar } from '@/components/admin/shared/TableToolbar';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { PartnerInvoiceActions } from './PartnerInvoiceActions';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';

// Simple mobile pull-to-refresh wrapper
function MobilePullToRefresh({ 
  onRefresh, 
  children 
}: { 
  onRefresh: () => void; 
  children: React.ReactNode; 
}) {
  return <div>{children}</div>; // Simplified for now
}


interface PartnerInvoicesTableProps {
  // Data
  data: any[];
  isLoading: boolean;
  isError: any;
  
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  allowedModes: ViewMode[];
  
  // Filter component
  filterComponent?: React.ReactNode;
  
  // Selection
  selectedInvoices: string[];
  onSelectInvoice: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  
  // Actions
  onExport: (format: 'csv' | 'excel') => void;
  onRefresh: () => void;
  onInvoiceClick: (id: string) => void;
  
  // Column visibility
  columnVisibilityColumns?: Array<{
    id: string;
    label: string;
    description?: string;
    visible: boolean;
    canHide: boolean;
  }>;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  
  // Mobile
  isMobile: boolean;
  
  // Metadata
  title?: string;
  subtitle?: string;
}

export function PartnerInvoicesTable({
  data,
  isLoading,
  isError,
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
  allowedModes,
  filterComponent,
  selectedInvoices,
  onSelectInvoice,
  onSelectAll,
  onExport,
  onRefresh,
  onInvoiceClick,
  columnVisibilityColumns,
  onToggleColumn,
  onResetColumns,
  isMobile,
  title = "Partner Invoices",
  subtitle,
}: PartnerInvoicesTableProps) {
  
  // Error state
  if (isError) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileText}
          title="Error loading invoices"
          description="There was an error loading partner invoices. Please try again."
          action={{
            label: "Retry",
            onClick: onRefresh
          }}
        />
      </Card>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <MobilePullToRefresh onRefresh={onRefresh}>
        <div className="space-y-4">
          {/* Mobile filter component */}
          {filterComponent && (
            <div className="px-4">
              {filterComponent}
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <SkeletonGroup 
              count={8} 
              className="space-y-3" 
              itemClassName="h-24 rounded-lg"
            />
          ) : !data?.length ? (
            <EmptyState
              icon={FileText}
              title="No partner invoices found"
              description="Create your first invoice to bill partner organizations"
              action={{
                label: "Create Invoice",
                onClick: () => console.log('Create invoice')
              }}
              variant="card"
            />
          ) : (
            <div className="space-y-3">
              {data.map((invoice) => (
                <MobileTableCard
                  key={invoice.id}
                  title={invoice.invoice_number}
                  subtitle={invoice.partner_organization?.name || 'Unknown Partner'}
                  badge={<InvoiceStatusBadge status={invoice.status} />}
                  selected={selectedInvoices.includes(invoice.id)}
                  onSelect={(selected) => onSelectInvoice(invoice.id, selected)}
                  onClick={() => onInvoiceClick(invoice.id)}
                  metadata={[
                    { label: 'Due', value: invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'No due date' },
                    { label: 'Amount', value: formatCurrency(invoice.total_amount || 0) },
                  ]}
                  actions={[
                    {
                      label: 'View',
                      icon: Eye,
                      onClick: () => onInvoiceClick(invoice.id)
                    }
                  ]}
                />
              ))}
            </div>
          )}
        </div>
      </MobilePullToRefresh>
    );
  }

  // Desktop view
  return (
    <Card className="border-b">
      {/* Desktop toolbar */}
      <TableToolbar
        title={title}
        subtitle={subtitle}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search invoices..."
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        allowedViewModes={allowedModes}
        selectedCount={selectedInvoices.length}
        onClearSelection={() => onSelectAll(false)}
        onExport={onExport}
        columnVisibilityColumns={columnVisibilityColumns}
        onToggleColumn={onToggleColumn}
        onResetColumns={onResetColumns}
      />

      {/* Filter component */}
      {filterComponent && (
        <div className="px-6 pb-4">
          {filterComponent}
        </div>
      )}

      {/* Table content */}
      <div className="p-6">
        {isLoading ? (
          <EnhancedTableSkeleton rows={8} columns={8} showHeader={true} />
        ) : !data?.length ? (
          <EmptyState
            icon={FileText}
            title="No partner invoices found"
            description="Create your first invoice to bill partner organizations"
            action={{
              label: "Create Invoice",
              onClick: () => console.log('Create invoice')
            }}
          />
        ) : (
          <ResponsiveTableWrapper stickyFirstColumn minWidth="900px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        data.length > 0 && selectedInvoices.length === data.length
                      }
                      onCheckedChange={onSelectAll}
                      aria-label="Select all invoices"
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className={selectedInvoices.includes(invoice.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={(checked) => 
                          onSelectInvoice(invoice.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select invoice ${invoice.invoice_number}`}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-mono cursor-pointer hover:text-primary"
                      onClick={() => onInvoiceClick(invoice.id)}
                    >
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => onInvoiceClick(invoice.id)}
                    >
                      {invoice.partner_organization?.name || 'Unknown Partner'}
                    </TableCell>
                    <TableCell>
                      {invoice.invoice_date 
                        ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') 
                        : 'No date'}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date 
                        ? format(new Date(invoice.due_date), 'MMM dd, yyyy') 
                        : 'No due date'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PartnerInvoiceActions invoice={invoice} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInvoiceClick(invoice.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableWrapper>
        )}
      </div>
    </Card>
  );
}