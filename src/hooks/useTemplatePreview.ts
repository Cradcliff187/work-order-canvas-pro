import { useMemo } from 'react';

// Updated to match actual database schema and Edge Function variable mapping
export const TEMPLATE_VARIABLES = {
  work_order: {
    // Work Order Details (matches database fields)
    'work_order_number': 'WO-ABC-001-001',
    'work_order_title': 'HVAC System Repair',
    'title': 'HVAC System Repair',
    'description': 'Replace faulty compressor in main HVAC unit',
    
    // Location Details (matches database schema)
    'store_location': 'Downtown Office',
    'street_address': '123 Main Street',
    'city': 'Springfield',
    'state': 'IL',
    'zip_code': '62701',
    'location_address': '123 Main Street, Springfield, IL, 62701',
    
    // Trade Details
    'trade_name': 'HVAC',
    
    // Dates (formatted as Edge Function provides)
    'date_submitted': 'January 15, 2024',
    'submitted_date': 'January 15, 2024',
    'estimated_completion_date': 'January 20, 2024',
    'due_date': 'January 20, 2024',
    'date_assigned': 'January 16, 2024',
    'reviewed_date': 'January 22, 2024',
    
    // URLs (matches Edge Function URL generation)
    'work_order_url': 'https://inudoymofztrvxhrlrek.supabase.co/work-orders/123',
    'admin_dashboard_url': 'https://inudoymofztrvxhrlrek.supabase.co/admin/dashboard',
    'review_url': 'https://inudoymofztrvxhrlrek.supabase.co/admin/reports/456',
    'report_url': 'https://inudoymofztrvxhrlrek.supabase.co/reports/456',
  },
  user: {
    // User Details (matches profiles table)
    'subcontractor_name': 'John Smith',
    'first_name': 'John',
    'partner_name': 'Jane Doe',
    'admin_name': 'Mike Johnson',
    'user_email': 'john.smith@pipesmore.test',
    'user_phone': '(555) 123-4567',
    'company_name': 'Pipes & More Plumbing',
  },
  organization: {
    // Organization Details (matches organizations table)
    'organization_name': 'ABC Property Management',
    'organization_email': 'contact@abc-property.test',
    'organization_phone': '(555) 987-6543',
  },
  system: {
    // System Variables
    'system_url': 'https://workorderpro.com',
    'current_date': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
  report: {
    // Report Details (matches work_order_reports table)
    'work_performed': 'Replaced faulty compressor and recharged HVAC system',
    'hours_worked': '4.5',
    'materials_used': 'Compressor unit, refrigerant, gaskets',
    'invoice_amount': '$1,250.00',
    'status': 'approved',
    'review_notes': 'Work completed satisfactorily. Quality meets standards.',
  },
};

export const useTemplatePreview = () => {
  const sampleData = useMemo(() => ({
    ...TEMPLATE_VARIABLES.work_order,
    ...TEMPLATE_VARIABLES.user,
    ...TEMPLATE_VARIABLES.organization,
    ...TEMPLATE_VARIABLES.system,
    ...TEMPLATE_VARIABLES.report,
  }), []);

  const interpolateTemplate = (template: string, data = sampleData) => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key as keyof typeof data] || match;
    });
  };

  const stripHtml = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const getAvailableVariables = (templateType?: string) => {
    const allVariables = Object.entries(TEMPLATE_VARIABLES).reduce((acc, [category, vars]) => {
      acc[category] = Object.keys(vars);
      return acc;
    }, {} as Record<string, string[]>);

    return allVariables;
  };

  return {
    sampleData,
    interpolateTemplate,
    stripHtml,
    getAvailableVariables,
  };
};