
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_TEMPLATES = [
  {
    template_name: 'work_order_created',
    subject: 'New Work Order Created - {{work_order_number}}',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Work Order</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Work Order Submitted</h2>
        <p>A new work order has been submitted and requires assignment.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Trade:</strong> {{trade_name}}</p>
          <p><strong>Description:</strong> {{description}}</p>
        </div>
        <p>Please log in to assign this work order to the appropriate contractor.</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `,
    text_content: 'New work order {{work_order_number}} has been submitted by {{organization_name}} and requires assignment.',
    is_active: true
  },
  {
    template_name: 'work_order_assigned',
    subject: 'Work Order Assignment - {{work_order_number}}',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Order Assignment</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Work Order Assignment</h2>
        <p>Hello {{assignee_name}},</p>
        <p>You have been assigned a new work order. Please review the details below:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Trade:</strong> {{trade_name}}</p>
          <p><strong>Description:</strong> {{work_order_description}}</p>
        </div>
        <p>Please log in to view full details and begin work.</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `,
    text_content: 'You have been assigned work order {{work_order_number}}. Please log in to view details.',
    is_active: true
  },
  {
    template_name: 'report_submitted',
    subject: 'Work Report Submitted - {{work_order_number}}',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Report Submitted</title>
      </hand>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Work Report Submitted</h2>
        <p>A work completion report has been submitted and is ready for review.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Subcontractor:</strong> {{subcontractor_name}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Work Performed:</strong> {{work_performed}}</p>
          <p><strong>Invoice Amount:</strong> ${{invoice_amount}}</p>
        </div>
        <p>Please review and approve or request changes.</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `,
    text_content: 'Work report submitted for {{work_order_number}} by {{subcontractor_name}}. Amount: ${{invoice_amount}}',
    is_active: true
  },
  {
    template_name: 'report_reviewed',
    subject: 'Work Report {{status}} - {{work_order_number}}',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Report Review</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #059669; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Work Report {{status}}</h2>
        <p>Hello {{first_name}},</p>
        <p>Your report for work order {{work_order_number}} has been {{status}}.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">{{status}}</span></p>
          {{#if review_notes}}<p><strong>Review Notes:</strong> {{review_notes}}</p>{{/if}}
        </div>
        <p>Thank you for your work!</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `,
    text_content: 'Your report for work order {{work_order_number}} has been {{status}}.',
    is_active: true
  }
];

export const createDefaultEmailTemplates = async () => {
  try {
    // Check if templates already exist
    const { data: existingTemplates } = await supabase
      .from('email_templates')
      .select('template_name');

    const existingNames = existingTemplates?.map(t => t.template_name) || [];
    
    // Only create templates that don't exist
    const templatesToCreate = DEFAULT_TEMPLATES.filter(
      template => !existingNames.includes(template.template_name)
    );

    if (templatesToCreate.length > 0) {
      const { error } = await supabase
        .from('email_templates')
        .insert(templatesToCreate);

      if (error) throw error;
      
      console.log(`Created ${templatesToCreate.length} default email templates`);
      return templatesToCreate.length;
    }

    return 0;
  } catch (error) {
    console.error('Error creating default email templates:', error);
    throw error;
  }
};
