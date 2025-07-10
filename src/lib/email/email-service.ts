import { resend, DEFAULT_FROM_EMAIL } from './resend-client';
import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  subject: string;
  html_content: string;
  template_name: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  template: EmailTemplate;
  variables?: Record<string, any>;
  work_order_id?: string;
  from?: string;
}

export interface BatchEmailOptions {
  emails: SendEmailOptions[];
  delay?: number; // ms between sends to avoid rate limiting
}

class EmailService {
  private interpolateTemplate(template: string, variables: Record<string, any> = {}): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private async logEmail(options: {
    work_order_id?: string;
    template_name: string;
    recipient_email: string;
    resend_message_id?: string;
    status: 'sent' | 'failed';
    error_message?: string;
  }) {
    try {
      await supabase.from('email_logs').insert({
        work_order_id: options.work_order_id,
        template_used: options.template_name,
        recipient_email: options.recipient_email,
        resend_message_id: options.resend_message_id,
        status: options.status,
        error_message: options.error_message,
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { to, template, variables = {}, work_order_id, from = DEFAULT_FROM_EMAIL } = options;

      // Interpolate template variables
      const subject = this.interpolateTemplate(template.subject, variables);
      const html = this.interpolateTemplate(template.html_content, variables);

      // Send email via Resend
      const response = await resend.emails.send({
        from,
        to: to.map(recipient => recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email),
        subject,
        html,
      });

      if (response.error) {
        // Log failed email
        for (const recipient of to) {
          await this.logEmail({
            work_order_id,
            template_name: template.template_name,
            recipient_email: recipient.email,
            status: 'failed',
            error_message: response.error.message,
          });
        }
        return { success: false, error: response.error.message };
      }

      // Log successful email
      for (const recipient of to) {
        await this.logEmail({
          work_order_id,
          template_name: template.template_name,
          recipient_email: recipient.email,
          resend_message_id: response.data?.id,
          status: 'sent',
        });
      }

      return { success: true, messageId: response.data?.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed emails
      for (const recipient of options.to) {
        await this.logEmail({
          work_order_id: options.work_order_id,
          template_name: options.template.template_name,
          recipient_email: recipient.email,
          status: 'failed',
          error_message: errorMessage,
        });
      }

      return { success: false, error: errorMessage };
    }
  }

  async sendBatch(options: BatchEmailOptions): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const { emails, delay = 100 } = options;
    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const result = await this.sendEmail(emails[i]);
        results.push(result);
        
        if (!result.success && result.error) {
          errors.push(result.error);
        }

        // Add delay between sends to respect rate limits
        if (i < emails.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMessage);
        results.push({ success: false, error: errorMessage });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  async getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', templateName)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Failed to fetch email template:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch email template:', error);
      return null;
    }
  }

  async testEmail(to: string, templateName: string, variables: Record<string, any> = {}): Promise<{ success: boolean; error?: string }> {
    const template = await this.getEmailTemplate(templateName);
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    return this.sendEmail({
      to: [{ email: to }],
      template,
      variables,
    });
  }
}

export const emailService = new EmailService();