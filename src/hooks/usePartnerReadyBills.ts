import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  reference: string;
}

export interface PartnerReadyBill {
  bill_id: string;
  internal_bill_number: string;
  external_bill_number: string | null;
  total_amount: number;
  bill_date: string;
  subcontractor_organization_id: string;
  subcontractor_org_name: string;
  subcontractor_org_initials: string;
  work_order_count: number;
  work_orders: WorkOrder[];
}

export interface PartnerReadyInternalReport {
  id: string;
  work_order_id: string;
  bill_amount: number;
  status: string;
  work_order_number: string;
  title: string;
  organization_name: string;
}

export interface PartnerReadyEmployeeTimeEntry {
  id: string;
  work_order_id: string;
  employee_user_id: string;
  employee_name: string;
  report_date: string;
  hours_worked: number;
  hourly_rate_snapshot: number;
  bill_amount: number;
  work_order_number: string;
  title: string;
  work_performed: string;
}

export interface PartnerReadyData {
  bills: PartnerReadyBill[];
  internalReports: PartnerReadyInternalReport[];
  employeeTimeEntries: PartnerReadyEmployeeTimeEntry[];
}

export const usePartnerReadyBills = (partnerOrgId?: string) => {
  return useQuery({
    queryKey: ['partner-ready-data', partnerOrgId],
    queryFn: async (): Promise<PartnerReadyData> => {
      if (!partnerOrgId) return { bills: [], internalReports: [], employeeTimeEntries: [] };
      
      // Get subcontractor bills
      const { data: bills, error: billsError } = await supabase
        .rpc('get_partner_ready_bills', {
          partner_org_id: partnerOrgId
        });

      if (billsError) throw billsError;

      // Get internal reports ready for billing
      const { data: readyInternalReports, error: reportsError } = await supabase
        .from('work_order_reports')
        .select(`
          id,
          work_order_id,
          bill_amount,
          status,
          work_orders!inner(
            work_order_number,
            title,
            organization_id,
            assigned_organization_id,
            organizations!assigned_organization_id(
              organization_type,
              name
            )
          )
        `)
        .eq('status', 'approved')
        .is('partner_invoice_id', null)
        .not('bill_amount', 'is', null)
        .gt('bill_amount', 0)
        .eq('work_orders.organizations.organization_type', 'internal')
        .eq('work_orders.organization_id', partnerOrgId);

      if (reportsError) throw reportsError;

      // Get approved employee time entries ready for billing
      const { data: readyEmployeeTimeEntries, error: timeEntriesError } = await supabase
        .from('employee_reports')
        .select(`
          id,
          work_order_id,
          employee_user_id,
          report_date,
          hours_worked,
          hourly_rate_snapshot,
          work_performed,
          work_orders!inner(
            work_order_number,
            title,
            organization_id
          ),
          profiles!employee_user_id(
            first_name,
            last_name
          )
        `)
        .eq('approval_status', 'approved')
        .is('partner_invoice_id', null)
        .not('hourly_rate_snapshot', 'is', null)
        .gt('hours_worked', 0)
        .eq('work_orders.organization_id', partnerOrgId);

      if (timeEntriesError) throw timeEntriesError;

      // Transform internal reports data
      const transformedReports: PartnerReadyInternalReport[] = (readyInternalReports || []).map(report => ({
        id: report.id,
        work_order_id: report.work_order_id,
        bill_amount: report.bill_amount,
        status: report.status,
        work_order_number: report.work_orders.work_order_number,
        title: report.work_orders.title,
        organization_name: report.work_orders.organizations.name
      }));

      // Transform employee time entries data
      const transformedTimeEntries: PartnerReadyEmployeeTimeEntry[] = (readyEmployeeTimeEntries || []).map(entry => ({
        id: entry.id,
        work_order_id: entry.work_order_id,
        employee_user_id: entry.employee_user_id,
        employee_name: `${entry.profiles?.first_name || ''} ${entry.profiles?.last_name || ''}`.trim(),
        report_date: entry.report_date,
        hours_worked: entry.hours_worked,
        hourly_rate_snapshot: entry.hourly_rate_snapshot,
        bill_amount: entry.hours_worked * entry.hourly_rate_snapshot,
        work_order_number: entry.work_orders.work_order_number,
        title: entry.work_orders.title,
        work_performed: entry.work_performed
      }));

      return {
        bills: (bills || []).map(bill => ({
          ...bill,
          work_orders: (Array.isArray(bill.work_orders) ? bill.work_orders : []) as unknown as WorkOrder[]
        })),
        internalReports: transformedReports,
        employeeTimeEntries: transformedTimeEntries
      };
    },
    staleTime: 60000,
    enabled: !!partnerOrgId,
  });
};