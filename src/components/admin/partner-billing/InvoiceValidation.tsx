import { z } from 'zod';

export const partnerInvoiceSchema = z.object({
  partner_organization_id: z.string().uuid('Invalid organization ID'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  subtotal: z.number().min(0, 'Subtotal must be greater than or equal to 0'),
  markup_percentage: z.number().min(0, 'Markup percentage must be greater than or equal to 0').max(100, 'Markup percentage cannot exceed 100%'),
  total_amount: z.number().min(0, 'Total amount must be greater than or equal to 0'),
  payment_reference: z.string().optional(),
}).refine((data) => {
  const invoiceDate = new Date(data.invoice_date);
  const dueDate = new Date(data.due_date);
  return dueDate >= invoiceDate;
}, {
  message: "Due date must be on or after invoice date",
  path: ["due_date"]
}).refine((data) => {
  const calculatedTotal = data.subtotal * (1 + data.markup_percentage / 100);
  const difference = Math.abs(calculatedTotal - data.total_amount);
  return difference < 0.01; // Allow for small rounding differences
}, {
  message: "Total amount must match subtotal plus markup",
  path: ["total_amount"]
});

export type PartnerInvoiceFormData = z.infer<typeof partnerInvoiceSchema>;

export const validateInvoiceLineItems = (lineItems: Array<{ description: string; amount: number }>) => {
  const errors: string[] = [];
  
  if (lineItems.length === 0) {
    errors.push('At least one line item is required');
  }
  
  lineItems.forEach((item, index) => {
    if (!item.description?.trim()) {
      errors.push(`Line item ${index + 1}: Description is required`);
    }
    if (item.amount <= 0) {
      errors.push(`Line item ${index + 1}: Amount must be greater than 0`);
    }
  });
  
  return errors;
};

export const validateInvoiceStatus = (currentStatus: string, newStatus: string) => {
  const validTransitions: Record<string, string[]> = {
    'draft': ['sent', 'cancelled'],
    'sent': ['paid', 'overdue', 'cancelled'],
    'paid': [],
    'overdue': ['paid', 'cancelled'],
    'cancelled': []
  };
  
  const allowedStatuses = validTransitions[currentStatus] || [];
  
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Cannot change status from ${currentStatus} to ${newStatus}`);
  }
  
  return true;
};