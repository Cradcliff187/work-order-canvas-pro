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
          partner_invoice_line_items_with_reference!partner_invoice_id(
            id,
            amount,
            description,
            source_type,
            work_order_id,
            work_order_reference,
            work_order_number,
            work_order_title
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
        // Use the new partner_invoice_line_items_with_reference for consistent work order references
        const lineItems = invoice.partner_invoice_line_items_with_reference || [];
        
        // Legacy: Combine work orders from all sources for backward compatibility
        const directWorkOrders = invoice.partner_invoice_work_orders || [];
        const reportWorkOrders = (invoice.work_order_reports || []).map(report => ({
          work_order_id: report.work_order_id,
          work_orders: report.work_orders,
          amount: report.bill_amount * (1 + (invoice.markup_percentage || 0) / 100),
          description: `From report`,
          work_order_reference: report.work_orders?.work_order_number || `WO-${report.work_order_id?.substring(0, 8) || ''}`
        }));
        const employeeWorkOrders = (invoice.employee_reports || []).map(emp => ({
          work_order_id: emp.work_order_id,
          work_orders: emp.work_orders,
          amount: (emp.hours_worked * emp.hourly_rate_snapshot) * (1 + (invoice.markup_percentage || 0) / 100),
          description: `Employee time`,
          work_order_reference: emp.work_orders?.work_order_number || `WO-${emp.work_order_id?.substring(0, 8) || ''}`
        }));

        const allWorkOrders = [...directWorkOrders, ...reportWorkOrders, ...employeeWorkOrders];

        return {
          ...invoice,
          work_orders_count: allWorkOrders.length,
          work_orders: allWorkOrders,
          line_items: lineItems // Add standardized line items
        };
      });
    }
  });
}