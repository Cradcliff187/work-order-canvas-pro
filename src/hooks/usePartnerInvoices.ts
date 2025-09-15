import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePartnerInvoices() {
  return useQuery({
    queryKey: ['partner-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_invoices')
        .select(`
          *,
          partner_organization:organizations!partner_organization_id(
            id,
            name,
            contact_email
          ),
          partner_invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_orders:work_orders!work_order_id(
              id,
              work_order_number,
              title,
              store_location,
              street_address,
              city,
              state,
              description
            )
          ),
          work_order_reports:work_order_reports!partner_invoice_id(
            id,
            work_order_id,
            bill_amount,
            work_orders!work_order_id(
              id,
              work_order_number,
              title,
              store_location,
              street_address,
              city,
              state,
              description
            )
          ),
          employee_reports:employee_reports!partner_invoice_id(
            id,
            work_order_id,
            hours_worked,
            hourly_rate_snapshot,
            work_orders!work_order_id(
              id,
              work_order_number,
              title,
              store_location,
              street_address,
              city,
              state,
              description
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(invoice => {
        // Collect work orders from all sources
        const directWorkOrders = invoice.partner_invoice_work_orders || [];
        const reportWorkOrders = (invoice.work_order_reports || [])
          .filter(report => report.work_orders)
          .map(report => ({
            ...report,
            work_order_id: report.work_order_id,
            amount: report.bill_amount,
            description: `Report: ${report.work_orders.title}`,
            work_orders: report.work_orders
          }));
        const employeeWorkOrders = (invoice.employee_reports || [])
          .filter(report => report.work_orders)
          .map(report => ({
            ...report,
            work_order_id: report.work_order_id,
            amount: (report.hours_worked || 0) * (report.hourly_rate_snapshot || 0),
            description: `Employee Time: ${report.hours_worked}h @ $${report.hourly_rate_snapshot}/h`,
            work_orders: report.work_orders
          }));

        // Combine and deduplicate by work_order_id
        const allWorkOrders = [...directWorkOrders, ...reportWorkOrders, ...employeeWorkOrders];
        const uniqueWorkOrders = allWorkOrders.reduce((acc, current) => {
          const existing = acc.find(wo => wo.work_order_id === current.work_order_id);
          if (!existing) {
            acc.push(current);
          }
          return acc;
        }, []);

        return {
          ...invoice,
          work_orders_count: uniqueWorkOrders.length,
          work_orders: uniqueWorkOrders
        };
      });
    }
  });
}