// Example filter configurations demonstrating the unified filter system

import { UnifiedFilterConfig } from './types';
import { AlertTriangle, Users, MapPin } from 'lucide-react';

// Example: Invoice Filters Configuration
export const invoiceFiltersConfig: UnifiedFilterConfig = {
  search: {
    type: 'search',
    placeholder: 'Search invoices...',
    storageKey: 'invoice-search-recent',
    debounceMs: 300
  },
  sections: {
    essential: {
      title: 'Essential Filters',
      filters: {
        overdue: {
          type: 'boolean',
          label: 'Overdue Only',
          icon: AlertTriangle,
          variant: 'outline'
        },
        partner_organization_id: {
          type: 'organization',
          label: 'Partner Organization',
          organizationType: 'partner',
          placeholder: 'Select partner...'
        },
        operational_status: {
          type: 'multi-select',
          label: 'Operational Status',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'on_hold', label: 'On Hold' }
          ],
          maxDisplayCount: 2,
          searchable: true
        }
      }
    },
    advanced: {
      title: 'Advanced Filters',
      filters: {
        invoice_status: {
          type: 'multi-select',
          label: 'Invoice Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' }
          ],
          placeholder: 'All statuses'
        },
        date_range: {
          type: 'date-range',
          label: 'Date Range',
          presets: [
            {
              label: 'Last 7 days',
              value: {
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                to: new Date()
              }
            },
            {
              label: 'Last 30 days', 
              value: {
                from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                to: new Date()
              }
            }
          ],
          allowCustomRange: true
        },
        subcontractor_organization_id: {
          type: 'organization',
          label: 'Subcontractor',
          organizationType: 'subcontractor',
          placeholder: 'Select subcontractor...'
        }
      }
    }
  }
};

// Example: Work Order Filters Configuration
export const workOrderFiltersConfig: UnifiedFilterConfig = {
  search: {
    type: 'search',
    placeholder: 'Search work orders...',
    storageKey: 'work-order-search-recent'
  },
  sections: {
    essential: {
      title: 'Essential Filters',
      filters: {
        status: {
          type: 'multi-select',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'approved', label: 'Approved' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ],
          maxDisplayCount: 3
        },
        organization_id: {
          type: 'organization',
          label: 'Organization',
          placeholder: 'Select organization...'
        },
        priority: {
          type: 'single-select',
          label: 'Priority',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ],
          emptyLabel: 'All priorities'
        }
      }
    },
    advanced: {
      title: 'Advanced Filters',
      filters: {
        trade: {
          type: 'multi-select',
          label: 'Trade',
          options: [
            { value: 'electrical', label: 'Electrical' },
            { value: 'plumbing', label: 'Plumbing' },
            { value: 'hvac', label: 'HVAC' },
            { value: 'carpentry', label: 'Carpentry' }
          ],
          searchable: true
        },
        assigned_to: {
          type: 'multi-select',
          label: 'Assigned To',
          options: [], // Would be populated from API
          searchable: true
        },
        created_date: {
          type: 'date-range',
          label: 'Created Date',
          allowCustomRange: true
        }
      }
    }
  }
};

// Example: Simple Employee Filters Configuration
export const employeeFiltersConfig: UnifiedFilterConfig = {
  search: {
    type: 'search',
    placeholder: 'Search employees...',
    storageKey: 'employee-search-recent'
  },
  filters: {
    department: {
      type: 'single-select',
      label: 'Department',
      options: [
        { value: 'engineering', label: 'Engineering' },
        { value: 'sales', label: 'Sales' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'hr', label: 'Human Resources' }
      ],
      emptyLabel: 'All departments'
    },
    is_active: {
      type: 'boolean',
      label: 'Active Only',
      icon: Users,
      variant: 'outline'
    },
    location: {
      type: 'multi-select',
      label: 'Location',
      options: [
        { value: 'new_york', label: 'New York' },
        { value: 'san_francisco', label: 'San Francisco' },
        { value: 'chicago', label: 'Chicago' },
        { value: 'remote', label: 'Remote' }
      ],
      maxDisplayCount: 2
    }
  }
};