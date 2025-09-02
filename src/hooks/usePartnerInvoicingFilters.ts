import { useMemo } from 'react';
import { PartnerUnbilledReport } from '@/hooks/usePartnerUnbilledReports';
import { PartnerInvoicingFiltersValue } from '@/components/admin/partner-billing/PartnerBillingFilters';
import { subDays, isAfter } from 'date-fns';

export function usePartnerInvoicingFilters(
  reports: PartnerUnbilledReport[] | undefined,
  filters: PartnerInvoicingFiltersValue
) {
  return useMemo(() => {
    if (!reports) return [];

    return reports.filter(report => {
      // Search filter
      if (filters.search?.trim()) {
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          report.work_orders?.work_order_number,
          report.work_orders?.title,
          report.work_orders?.description,
          report.work_orders?.store_location,
          report.subcontractor_organization?.name,
          report.subcontractor?.first_name,
          report.subcontractor?.last_name,
          report.work_performed,
          report.materials_used,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchFields.includes(searchTerm)) {
          return false;
        }
      }

      // Report status filter
      if (filters.report_status?.length && !filters.report_status.includes(report.status)) {
        return false;
      }

      // Subcontractor organization filter
      if (filters.subcontractor_organization_id && 
          report.subcontractor_organization_id !== filters.subcontractor_organization_id) {
        return false;
      }

      // Amount range filter
      const amount = report.approved_subcontractor_bill_amount || 0;
      if (filters.amount_min && amount < parseFloat(filters.amount_min)) {
        return false;
      }
      if (filters.amount_max && amount > parseFloat(filters.amount_max)) {
        return false;
      }

      // Date range filter
      if (filters.date_from || filters.date_to) {
        const submittedDate = new Date(report.submitted_at);
        if (filters.date_from && submittedDate < filters.date_from) {
          return false;
        }
        if (filters.date_to && submittedDate > filters.date_to) {
          return false;
        }
      }

      // Location filter
      if (filters.location_filter?.length) {
        const location = report.work_orders?.store_location;
        if (!location || !filters.location_filter.includes(location)) {
          return false;
        }
      }

      // Variance filter
      if (filters.variance_filter?.length) {
        const estimate = report.work_orders?.internal_estimate_amount;
        const actual = report.approved_subcontractor_bill_amount || 0;
        
        let varianceCategory = 'no_estimate';
        if (estimate && estimate > 0) {
          const variance = ((actual - estimate) / estimate) * 100;
          if (variance > 20) varianceCategory = 'high_over';
          else if (variance > 5) varianceCategory = 'moderate_over';
          else if (variance < -5) varianceCategory = 'under_budget';
          else varianceCategory = 'on_budget';
        }

        if (!filters.variance_filter.includes(varianceCategory)) {
          return false;
        }
      }

      // Submitted by filter
      if (filters.submitted_by?.length && 
          (!report.submitted_by_user_id || !filters.submitted_by.includes(report.submitted_by_user_id))) {
        return false;
      }

      // Quick filters
      if (filters.high_variance) {
        const estimate = report.work_orders?.internal_estimate_amount;
        const actual = report.approved_subcontractor_bill_amount || 0;
        if (!estimate || estimate <= 0) return false;
        const variance = Math.abs(((actual - estimate) / estimate) * 100);
        if (variance <= 20) return false;
      }

      if (filters.recently_submitted) {
        const submittedDate = new Date(report.submitted_at);
        const sevenDaysAgo = subDays(new Date(), 7);
        if (!isAfter(submittedDate, sevenDaysAgo)) return false;
      }

      if (filters.has_invoice) {
        // This would need additional data to determine if there are invoice issues
        // For now, we'll skip this filter or implement based on available data
      }

      return true;
    });
  }, [reports, filters]);
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