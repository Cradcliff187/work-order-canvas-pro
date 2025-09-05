import { useMemo } from 'react';
import { PartnerReadyBill } from '@/hooks/usePartnerReadyBills';
import { PartnerInvoicingFiltersValue } from '@/components/admin/partner-billing/PartnerInvoicingFilters';
import { subDays, isAfter } from 'date-fns';

export function usePartnerInvoicingFilters(
  bills: PartnerReadyBill[] | undefined,
  filters: PartnerInvoicingFiltersValue
) {
  return useMemo(() => {
    if (!bills) return [];

    return bills.filter(bill => {
      // Search filter
      if (filters.search?.trim()) {
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          bill.internal_bill_number,
          bill.external_bill_number,
          bill.subcontractor_org_name,
          ...bill.work_order_numbers,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchFields.includes(searchTerm)) {
          return false;
        }
      }

      // Amount range filter
      const amount = bill.total_amount || 0;
      if (filters.amount_min && amount < parseFloat(filters.amount_min)) {
        return false;
      }
      if (filters.amount_max && amount > parseFloat(filters.amount_max)) {
        return false;
      }

      // Date range filter
      if (filters.date_from || filters.date_to) {
        const billDate = new Date(bill.bill_date);
        if (filters.date_from && billDate < filters.date_from) {
          return false;
        }
        if (filters.date_to && billDate > filters.date_to) {
          return false;
        }
      }

      return true;
    });
  }, [bills, filters]);
}

export function usePartnerInvoicingFilterCount(filters: PartnerInvoicingFiltersValue) {
  return useMemo(() => {
    let count = 0;
    if (filters.search?.trim()) count++;
    if (filters.report_status?.length) count++;
    if (filters.subcontractor_organization_id) count++;
    if (filters.amount_min || filters.amount_max) count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.location_filter?.length) count++;
    if (filters.variance_filter?.length) count++;
    if (filters.submitted_by?.length) count++;
    if (filters.has_invoice) count++;
    if (filters.high_variance) count++;
    if (filters.recently_submitted) count++;
    return count;
  }, [filters]);
}