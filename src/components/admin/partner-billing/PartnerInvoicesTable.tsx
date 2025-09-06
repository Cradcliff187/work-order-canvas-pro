import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  X, 
  FileText, 
  Eye, 
  Download, 
  Upload,
  MoreVertical 
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ViewMode } from '@/hooks/useViewMode';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { SkeletonGroup } from '@/components/ui/enhanced-skeleton';
import { InvoiceFilters } from './InvoiceFilters';
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

// Simple export dropdown
function ExportDropdown({ onExport }: { onExport: (format: 'csv' | 'excel') => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport('csv')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('excel')}>
          <Upload className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InvoiceFiltersValue {
  statusFilter: string;
  organizationFilter: string;
  dateRange: { from?: Date; to?: Date };
}

interface PartnerInvoicesTableProps {
  data: any[];
  isLoading: boolean;
  isError: any;
  searchValue: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  allowedModes: ViewMode[];
  filters: InvoiceFiltersValue;
  onFiltersChange: (filters: InvoiceFiltersValue) => void;
  onClearFilters: () => void;
  filterCount: number;
  onExport: (format: 'csv' | 'excel') => void;
  onRefresh: () => void;
  isMobile: boolean;
  selectedInvoices: string[];
  onSelectInvoice: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onInvoiceClick: (id: string) => void;
  organizations: Array<{ id: string; name: string }>;
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
  filters,
  onFiltersChange,
  onClearFilters,
  filterCount,
  onExport,
  onRefresh,
  isMobile,
  selectedInvoices,
  onSelectInvoice,
  onSelectAll,
  onInvoiceClick,
  organizations,
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
          {/* Mobile toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search invoices..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile filters */}
          <InvoiceFilters
            searchTerm={searchValue}
            onSearchChange={onSearchChange}
            statusFilter={filters.statusFilter}
            onStatusChange={(status) => 
              onFiltersChange({ ...filters, statusFilter: status })}
            organizationFilter={filters.organizationFilter}
            onOrganizationChange={(org) => 
              onFiltersChange({ ...filters, organizationFilter: org })}
            dateRange={filters.dateRange}
            onDateRangeChange={(range) => 
              onFiltersChange({ ...filters, dateRange: range })}
            organizations={organizations}
            onClearFilters={onClearFilters}
          />

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
              description={
                filterCount > 0
                  ? "No invoices match your filters. Try adjusting your search."
                  : "Create your first invoice to bill partner organizations"
              }
              action={
                filterCount > 0
                  ? {
                      label: "Clear Filters",
                      onClick: onClearFilters
                    }
                  : {
                      label: "Create Invoice",
                      onClick: () => console.log('Create invoice')
                    }
              }
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
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Partner Invoices</h2>
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={onViewModeChange}
            allowedModes={allowedModes}
          />
        </div>
        <div className="flex items-center gap-4">
          <InvoiceFilters
            searchTerm={searchValue}
            onSearchChange={onSearchChange}
            statusFilter={filters.statusFilter}
            onStatusChange={(status) => 
              onFiltersChange({ ...filters, statusFilter: status })}
            organizationFilter={filters.organizationFilter}
            onOrganizationChange={(org) => 
              onFiltersChange({ ...filters, organizationFilter: org })}
            dateRange={filters.dateRange}
            onDateRangeChange={(range) => 
              onFiltersChange({ ...filters, dateRange: range })}
            organizations={organizations}
            onClearFilters={onClearFilters}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search invoices..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <ExportDropdown onExport={onExport} />
        </div>
      </div>

      {/* Table content */}
      <div className="p-4">
        {isLoading ? (
          <EnhancedTableSkeleton rows={8} columns={8} showHeader={true} />
        ) : !data?.length ? (
          <EmptyState
            icon={FileText}
            title="No partner invoices found"
            description={
              filterCount > 0
                ? "No invoices match your filters. Try adjusting your search."
                : "Create your first invoice to bill partner organizations"
            }
            action={
              filterCount > 0
                ? {
                    label: "Clear Filters",
                    onClick: onClearFilters
                  }
                : {
                    label: "Create Invoice",
                    onClick: () => console.log('Create invoice')
                  }
            }
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