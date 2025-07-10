import { useMemo } from 'react';

export const TEMPLATE_VARIABLES = {
  work_order: {
    'work_order_number': 'WO-2024-0001',
    'work_order_title': 'HVAC System Repair',
    'description': 'Replace faulty compressor in main HVAC unit',
    'store_location': 'Main Street Store #123',
    'street_address': '123 Main Street',
    'city': 'Springfield',
    'state': 'IL',
    'zip_code': '62701',
    'estimated_completion_date': '2024-01-15',
    'due_date': '2024-01-20',
    'trade_name': 'HVAC',
    'work_order_url': 'https://workorderpro.com/work-orders/123',
  },
  user: {
    'subcontractor_name': 'John Smith',
    'partner_name': 'Jane Doe',
    'admin_name': 'Mike Johnson',
    'user_email': 'user@example.com',
    'user_phone': '(555) 123-4567',
    'company_name': 'Smith HVAC Services',
  },
  organization: {
    'organization_name': 'Retail Corp',
    'organization_email': 'admin@retailcorp.com',
    'organization_phone': '(555) 987-6543',
  },
  system: {
    'system_url': 'https://workorderpro.com',
    'current_date': new Date().toLocaleDateString(),
  },
  report: {
    'invoice_amount': '$1,250.00',
    'hours_worked': '4.5',
    'materials_used': 'Compressor unit, refrigerant, gaskets',
    'work_performed': 'Replaced faulty compressor and recharged system',
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