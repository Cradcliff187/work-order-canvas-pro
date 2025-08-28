import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Filter } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface InvoiceFiltersValue {
  overdue?: boolean;
  invoice_status?: string[];
  partner_billing_status?: string[];
  subcontractor_organization_id?: string;
}

const invoiceStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const paymentStatusOptions = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];

const calculateFilterCount = (value: InvoiceFiltersValue): number => {
  return [
    value.overdue,
    value.invoice_status?.length,
    value.partner_billing_status?.length,
    value.subcontractor_organization_id
  ].filter(Boolean).length;
};

export function CompactInvoiceFilters({
  value,
  onChange,
  onClear
}: {
  value: InvoiceFiltersValue;
  onChange: (filters: InvoiceFiltersValue) => void;
  onClear: () => void;
}) {
  const isMobile = useIsMobile();
  const filterCount = calculateFilterCount(value);
  
  const filterContent = (
    <div className="space-y-4 p-4">
      {/* Overdue filter */}
      <div className="space-y-2">
        <Label>Quick Filters</Label>
        <Button
          variant={value.overdue ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({...value, overdue: !value.overdue})}
        >
          Overdue Only
        </Button>
      </div>
      
      {/* Status filter */}
      <div className="space-y-2">
        <Label>Invoice Status</Label>
        <MultiSelectFilter
          options={invoiceStatusOptions}
          selectedValues={value.invoice_status || []}
          onSelectionChange={(statuses) => 
            onChange({...value, invoice_status: statuses})
          }
        />
      </div>
      
      {/* Payment Status */}
      <div className="space-y-2">
        <Label>Payment Status</Label>
        <MultiSelectFilter
          options={paymentStatusOptions}
          selectedValues={value.partner_billing_status || []}
          onSelectionChange={(statuses) => 
            onChange({...value, partner_billing_status: statuses})
          }
        />
      </div>
      
      {/* Organizations */}
      <OrganizationSelector
        value={value.subcontractor_organization_id}
        onChange={(orgId) => 
          onChange({...value, subcontractor_organization_id: orgId})
        }
        organizationType="subcontractor"
        placeholder="Select subcontractor..."
      />
      
      {/* Clear button */}
      {filterCount > 0 && (
        <Button onClick={onClear} variant="outline" size="sm" className="w-full">
          Clear All Filters
        </Button>
      )}
    </div>
  );

  // Desktop: Popover
  if (!isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {filterCount > 0 && ` (${filterCount})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          {filterContent}
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: Sheet
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {filterCount > 0 && ` (${filterCount})`}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Filter Invoices</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto">
          {filterContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}