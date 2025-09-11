export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          created_at: string
          created_by: string
          id: string
          is_internal: boolean
          organization_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          created_at?: string
          created_by: string
          id?: string
          is_internal?: boolean
          organization_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          conversation_type?: Database["public"]["Enums"]["conversation_type"]
          created_at?: string
          created_by?: string
          id?: string
          is_internal?: boolean
          organization_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_pairs: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_pairs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          recipient_email: string
          record_id: string | null
          record_type: string | null
          resend_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["email_status"]
          subject: string | null
          template_used: string | null
          test_mode: boolean | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          record_id?: string | null
          record_type?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          template_used?: string | null
          test_mode?: boolean | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          record_id?: string | null
          record_type?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          template_used?: string | null
          test_mode?: boolean | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          context_data: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          next_retry_at: string | null
          processed_at: string | null
          record_id: string
          record_type: string
          retry_count: number | null
          status: string | null
          template_name: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          next_retry_at?: string | null
          processed_at?: string | null
          record_id: string
          record_type: string
          retry_count?: number | null
          status?: string | null
          template_name: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          next_retry_at?: string | null
          processed_at?: string | null
          record_id?: string
          record_type?: string
          retry_count?: number | null
          status?: string | null
          template_name?: string
        }
        Relationships: []
      }
      email_queue_processing_log: {
        Row: {
          created_at: string | null
          duration_ms: number
          failed_count: number
          id: string
          processed_at: string
          processed_count: number
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          failed_count: number
          id?: string
          processed_at: string
          processed_count: number
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          failed_count?: number
          id?: string
          processed_at?: string
          processed_count?: number
        }
        Relationships: []
      }
      email_recipient_settings: {
        Row: {
          created_at: string
          id: string
          receives_email: boolean
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receives_email?: boolean
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receives_email?: boolean
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_recipient_settings_template_name_fkey"
            columns: ["template_name"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["template_name"]
          },
        ]
      }
      email_settings: {
        Row: {
          id: string
          organization_id: string | null
          setting_name: string
          setting_value: Json
          updated_at: string
          updated_by_user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          setting_name: string
          setting_value: Json
          updated_at?: string
          updated_by_user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          setting_name?: string
          setting_value?: Json
          updated_at?: string
          updated_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          is_active: boolean
          subject: string
          template_name: string
          text_content: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean
          subject: string
          template_name: string
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean
          subject?: string
          template_name?: string
          text_content?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_reports: {
        Row: {
          clock_in_time: string | null
          clock_out_location_address: string | null
          clock_out_location_lat: number | null
          clock_out_location_lng: number | null
          clock_out_time: string | null
          created_at: string
          employee_user_id: string
          hourly_rate_snapshot: number
          hours_worked: number
          id: string
          is_overtime: boolean | null
          is_retroactive: boolean
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          project_id: string | null
          report_date: string
          total_labor_cost: number | null
          updated_at: string
          work_order_id: string | null
          work_performed: string
        }
        Insert: {
          clock_in_time?: string | null
          clock_out_location_address?: string | null
          clock_out_location_lat?: number | null
          clock_out_location_lng?: number | null
          clock_out_time?: string | null
          created_at?: string
          employee_user_id: string
          hourly_rate_snapshot: number
          hours_worked: number
          id?: string
          is_overtime?: boolean | null
          is_retroactive?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          project_id?: string | null
          report_date: string
          total_labor_cost?: number | null
          updated_at?: string
          work_order_id?: string | null
          work_performed: string
        }
        Update: {
          clock_in_time?: string | null
          clock_out_location_address?: string | null
          clock_out_location_lat?: number | null
          clock_out_location_lng?: number | null
          clock_out_time?: string | null
          created_at?: string
          employee_user_id?: string
          hourly_rate_snapshot?: number
          hours_worked?: number
          id?: string
          is_overtime?: boolean | null
          is_retroactive?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          project_id?: string | null
          report_date?: string
          total_labor_cost?: number | null
          updated_at?: string
          work_order_id?: string | null
          work_performed?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_reports_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_reports_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "unified_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "work_order_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_location_sequences: {
        Row: {
          created_at: string
          id: string
          location_number: string
          next_sequence_number: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_number: string
          next_sequence_number?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_number?: string
          next_sequence_number?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_location_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          initials: string | null
          is_active: boolean
          name: string
          next_location_sequence: number | null
          next_sequence_number: number | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
          uses_partner_location_numbers: boolean | null
        }
        Insert: {
          address?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          initials?: string | null
          is_active?: boolean
          name: string
          next_location_sequence?: number | null
          next_sequence_number?: number | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          uses_partner_location_numbers?: boolean | null
        }
        Update: {
          address?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          initials?: string | null
          is_active?: boolean
          name?: string
          next_location_sequence?: number | null
          next_sequence_number?: number | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          uses_partner_location_numbers?: boolean | null
        }
        Relationships: []
      }
      partner_invoice_audit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          invoice_id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          invoice_id: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          invoice_id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_partner_invoice_audit_log_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_invoice_audit_log_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          partner_invoice_id: string
          work_order_report_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          partner_invoice_id: string
          work_order_report_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          partner_invoice_id?: string
          work_order_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoice_line_items_partner_invoice_id_fkey"
            columns: ["partner_invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoice_line_items_work_order_report_id_fkey"
            columns: ["work_order_report_id"]
            isOneToOne: false
            referencedRelation: "work_order_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          markup_percentage: number | null
          partner_organization_id: string
          payment_date: string | null
          payment_reference: string | null
          pdf_url: string | null
          quickbooks_export_date: string | null
          sent_at: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          markup_percentage?: number | null
          partner_organization_id: string
          payment_date?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          quickbooks_export_date?: string | null
          sent_at?: string | null
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          markup_percentage?: number | null
          partner_organization_id?: string
          payment_date?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          quickbooks_export_date?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_locations: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          location_name: string
          location_number: string
          organization_id: string
          state: string | null
          street_address: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_name: string
          location_number: string
          organization_id: string
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_name?: string
          location_number?: string
          organization_id?: string
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string
          hourly_billable_rate: number | null
          hourly_cost_rate: number | null
          id: string
          is_active: boolean
          is_employee: boolean
          is_overtime_eligible: boolean | null
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name: string
          hourly_billable_rate?: number | null
          hourly_cost_rate?: number | null
          id?: string
          is_active?: boolean
          is_employee?: boolean
          is_overtime_eligible?: boolean | null
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          hourly_billable_rate?: number | null
          hourly_cost_rate?: number | null
          id?: string
          is_active?: boolean
          is_employee?: boolean
          is_overtime_eligible?: boolean | null
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          assignment_type: string | null
          created_at: string | null
          id: string
          project_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_type?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_type?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          name: string
          organization_id: string | null
          project_number: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          organization_id?: string | null
          project_number?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          organization_id?: string | null
          project_number?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          line_number: number | null
          quantity: number | null
          receipt_id: string
          total_price: number
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          line_number?: number | null
          quantity?: number | null
          receipt_id: string
          total_price: number
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          line_number?: number | null
          quantity?: number | null
          receipt_id?: string
          total_price?: number
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_ocr_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          image_hash: string
          ocr_result: Json
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_hash: string
          ocr_result: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_hash?: string
          ocr_result?: Json
        }
        Relationships: []
      }
      receipt_work_orders: {
        Row: {
          allocated_amount: number
          allocation_notes: string | null
          created_at: string
          id: string
          receipt_id: string
          work_order_id: string
        }
        Insert: {
          allocated_amount: number
          allocation_notes?: string | null
          created_at?: string
          id?: string
          receipt_id: string
          work_order_id: string
        }
        Update: {
          allocated_amount?: number
          allocation_notes?: string | null
          created_at?: string
          id?: string
          receipt_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_work_orders_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_work_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          employee_user_id: string
          id: string
          line_items_extracted: boolean | null
          notes: string | null
          ocr_confidence: number | null
          receipt_date: string
          receipt_image_url: string | null
          subtotal: number | null
          tax_amount: number | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          employee_user_id: string
          id?: string
          line_items_extracted?: boolean | null
          notes?: string | null
          ocr_confidence?: number | null
          receipt_date: string
          receipt_image_url?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          employee_user_id?: string
          id?: string
          line_items_extracted?: boolean | null
          notes?: string | null
          ocr_confidence?: number | null
          receipt_date?: string
          receipt_image_url?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_bill_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          file_url: string
          id: string
          subcontractor_bill_id: string
          uploaded_by: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          file_url: string
          id?: string
          subcontractor_bill_id: string
          uploaded_by: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          file_url?: string
          id?: string
          subcontractor_bill_id?: string
          uploaded_by?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_bill_attachments_bill_id_fkey"
            columns: ["subcontractor_bill_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_bill_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_bill_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_bill_work_orders: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          subcontractor_bill_id: string
          work_order_id: string
          work_order_report_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          subcontractor_bill_id: string
          work_order_id: string
          work_order_report_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          subcontractor_bill_id?: string
          work_order_id?: string
          work_order_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_bill_work_orders_bill_id_fkey"
            columns: ["subcontractor_bill_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_bill_work_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_bill_work_orders_work_order_report_id_fkey"
            columns: ["work_order_report_id"]
            isOneToOne: false
            referencedRelation: "work_order_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_bills: {
        Row: {
          admin_notes: string | null
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          bill_date: string
          created_at: string
          created_by_admin_id: string | null
          due_date: string
          external_bill_number: string | null
          id: string
          internal_bill_number: string
          operational_status: string | null
          paid_at: string | null
          partner_billing_status: string | null
          payment_reference: string | null
          payment_terms: string | null
          purchase_order_number: string | null
          status: string
          subcontractor_notes: string | null
          subcontractor_organization_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bill_date?: string
          created_at?: string
          created_by_admin_id?: string | null
          due_date?: string
          external_bill_number?: string | null
          id?: string
          internal_bill_number: string
          operational_status?: string | null
          paid_at?: string | null
          partner_billing_status?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          purchase_order_number?: string | null
          status?: string
          subcontractor_notes?: string | null
          subcontractor_organization_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bill_date?: string
          created_at?: string
          created_by_admin_id?: string | null
          due_date?: string
          external_bill_number?: string | null
          id?: string
          internal_bill_number?: string
          operational_status?: string | null
          paid_at?: string | null
          partner_billing_status?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          purchase_order_number?: string | null
          status?: string
          subcontractor_notes?: string | null
          subcontractor_organization_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subcontractor_organization_id_fkey"
            columns: ["subcontractor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          severity?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by_user_id: string
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by_user_id: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      trigger_debug_log: {
        Row: {
          created_at: string | null
          id: number
          message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string | null
        }
        Relationships: []
      }
      work_order_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_organization_id: string | null
          assigned_to: string | null
          assignment_type: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_organization_id?: string | null
          assigned_to?: string | null
          assignment_type: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_organization_id?: string | null
          assigned_to?: string | null
          assignment_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_assigned_organization_id_fkey"
            columns: ["assigned_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          file_url: string
          id: string
          is_internal: boolean | null
          uploaded_at: string
          uploaded_by_user_id: string
          work_order_id: string | null
          work_order_message_id: string | null
          work_order_report_id: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          file_url: string
          id?: string
          is_internal?: boolean | null
          uploaded_at?: string
          uploaded_by_user_id: string
          work_order_id?: string | null
          work_order_message_id?: string | null
          work_order_report_id?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          file_url?: string
          id?: string
          is_internal?: boolean | null
          uploaded_at?: string
          uploaded_by_user_id?: string
          work_order_id?: string | null
          work_order_message_id?: string | null
          work_order_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_message_id_fkey"
            columns: ["work_order_message_id"]
            isOneToOne: false
            referencedRelation: "unified_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_message_id_fkey"
            columns: ["work_order_message_id"]
            isOneToOne: false
            referencedRelation: "work_order_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_report_id_fkey"
            columns: ["work_order_report_id"]
            isOneToOne: false
            referencedRelation: "work_order_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_messages: {
        Row: {
          attachment_ids: string[] | null
          conversation_id: string | null
          created_at: string | null
          crew_member_name: string | null
          id: string
          is_internal: boolean | null
          mentioned_user_ids: string[]
          message: string
          sender_id: string
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          attachment_ids?: string[] | null
          conversation_id?: string | null
          created_at?: string | null
          crew_member_name?: string | null
          id?: string
          is_internal?: boolean | null
          mentioned_user_ids?: string[]
          message: string
          sender_id: string
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          attachment_ids?: string[] | null
          conversation_id?: string | null
          created_at?: string | null
          crew_member_name?: string | null
          id?: string
          is_internal?: boolean | null
          mentioned_user_ids?: string[]
          message?: string
          sender_id?: string
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_messages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_reports: {
        Row: {
          approved_subcontractor_bill_amount: number | null
          bill_amount: number | null
          bill_number: string | null
          hours_worked: number | null
          id: string
          materials_used: string | null
          notes: string | null
          partner_billed_amount: number | null
          partner_billed_at: string | null
          partner_invoice_id: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          photos: Json | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          subcontractor_organization_id: string | null
          subcontractor_user_id: string | null
          submitted_at: string
          submitted_by_user_id: string | null
          work_order_id: string
          work_performed: string
        }
        Insert: {
          approved_subcontractor_bill_amount?: number | null
          bill_amount?: number | null
          bill_number?: string | null
          hours_worked?: number | null
          id?: string
          materials_used?: string | null
          notes?: string | null
          partner_billed_amount?: number | null
          partner_billed_at?: string | null
          partner_invoice_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          photos?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subcontractor_organization_id?: string | null
          subcontractor_user_id?: string | null
          submitted_at?: string
          submitted_by_user_id?: string | null
          work_order_id: string
          work_performed: string
        }
        Update: {
          approved_subcontractor_bill_amount?: number | null
          bill_amount?: number | null
          bill_number?: string | null
          hours_worked?: number | null
          id?: string
          materials_used?: string | null
          notes?: string | null
          partner_billed_amount?: number | null
          partner_billed_at?: string | null
          partner_invoice_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          photos?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subcontractor_organization_id?: string | null
          subcontractor_user_id?: string | null
          submitted_at?: string
          submitted_by_user_id?: string | null
          work_order_id?: string
          work_performed?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_reports_partner_invoice_id_fkey"
            columns: ["partner_invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_subcontractor_organization_id_fkey"
            columns: ["subcontractor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_subcontractor_user_id_fkey"
            columns: ["subcontractor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_completion_date: string | null
          actual_hours: number | null
          admin_completion_notes: string | null
          assigned_organization_id: string | null
          auto_completion_blocked: boolean | null
          city: string | null
          completion_checked_at: string | null
          completion_method: string | null
          created_at: string
          created_by: string
          date_approved: string | null
          date_assigned: string | null
          date_completed: string | null
          date_submitted: string
          description: string | null
          due_date: string | null
          estimated_completion_date: string | null
          estimated_hours: number | null
          final_completion_date: string | null
          id: string
          internal_estimate_amount: number | null
          internal_estimate_approved: boolean | null
          internal_estimate_approved_at: string | null
          internal_estimate_approved_by: string | null
          internal_estimate_created_at: string | null
          internal_estimate_created_by: string | null
          internal_estimate_description: string | null
          internal_estimate_notes: string | null
          internal_markup_percentage: number | null
          labor_cost: number | null
          location_address: string | null
          location_city: string | null
          location_name: string | null
          location_state: string | null
          location_street_address: string | null
          location_zip_code: string | null
          materials_cost: number | null
          organization_id: string | null
          partner_estimate_approved: boolean | null
          partner_estimate_approved_at: string | null
          partner_estimate_rejection_notes: string | null
          partner_location_number: string | null
          partner_po_number: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          state: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          store_location: string | null
          street_address: string | null
          subcontractor_bill_amount: number | null
          subcontractor_estimate_amount: number | null
          subcontractor_estimate_description: string | null
          subcontractor_estimate_submitted_at: string | null
          subcontractor_estimate_submitted_by: string | null
          subcontractor_report_submitted: boolean | null
          title: string
          trade_id: string | null
          updated_at: string
          work_order_number: string | null
          zip_code: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_hours?: number | null
          admin_completion_notes?: string | null
          assigned_organization_id?: string | null
          auto_completion_blocked?: boolean | null
          city?: string | null
          completion_checked_at?: string | null
          completion_method?: string | null
          created_at?: string
          created_by: string
          date_approved?: string | null
          date_assigned?: string | null
          date_completed?: string | null
          date_submitted?: string
          description?: string | null
          due_date?: string | null
          estimated_completion_date?: string | null
          estimated_hours?: number | null
          final_completion_date?: string | null
          id?: string
          internal_estimate_amount?: number | null
          internal_estimate_approved?: boolean | null
          internal_estimate_approved_at?: string | null
          internal_estimate_approved_by?: string | null
          internal_estimate_created_at?: string | null
          internal_estimate_created_by?: string | null
          internal_estimate_description?: string | null
          internal_estimate_notes?: string | null
          internal_markup_percentage?: number | null
          labor_cost?: number | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          location_street_address?: string | null
          location_zip_code?: string | null
          materials_cost?: number | null
          organization_id?: string | null
          partner_estimate_approved?: boolean | null
          partner_estimate_approved_at?: string | null
          partner_estimate_rejection_notes?: string | null
          partner_location_number?: string | null
          partner_po_number?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          state?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          store_location?: string | null
          street_address?: string | null
          subcontractor_bill_amount?: number | null
          subcontractor_estimate_amount?: number | null
          subcontractor_estimate_description?: string | null
          subcontractor_estimate_submitted_at?: string | null
          subcontractor_estimate_submitted_by?: string | null
          subcontractor_report_submitted?: boolean | null
          title: string
          trade_id?: string | null
          updated_at?: string
          work_order_number?: string | null
          zip_code?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_hours?: number | null
          admin_completion_notes?: string | null
          assigned_organization_id?: string | null
          auto_completion_blocked?: boolean | null
          city?: string | null
          completion_checked_at?: string | null
          completion_method?: string | null
          created_at?: string
          created_by?: string
          date_approved?: string | null
          date_assigned?: string | null
          date_completed?: string | null
          date_submitted?: string
          description?: string | null
          due_date?: string | null
          estimated_completion_date?: string | null
          estimated_hours?: number | null
          final_completion_date?: string | null
          id?: string
          internal_estimate_amount?: number | null
          internal_estimate_approved?: boolean | null
          internal_estimate_approved_at?: string | null
          internal_estimate_approved_by?: string | null
          internal_estimate_created_at?: string | null
          internal_estimate_created_by?: string | null
          internal_estimate_description?: string | null
          internal_estimate_notes?: string | null
          internal_markup_percentage?: number | null
          labor_cost?: number | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          location_street_address?: string | null
          location_zip_code?: string | null
          materials_cost?: number | null
          organization_id?: string | null
          partner_estimate_approved?: boolean | null
          partner_estimate_approved_at?: string | null
          partner_estimate_rejection_notes?: string | null
          partner_location_number?: string | null
          partner_po_number?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          state?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          store_location?: string | null
          street_address?: string | null
          subcontractor_bill_amount?: number | null
          subcontractor_estimate_amount?: number | null
          subcontractor_estimate_description?: string | null
          subcontractor_estimate_submitted_at?: string | null
          subcontractor_estimate_submitted_by?: string | null
          subcontractor_report_submitted?: boolean | null
          title?: string
          trade_id?: string | null
          updated_at?: string
          work_order_number?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_organization_id_fkey"
            columns: ["assigned_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_internal_estimate_approved_by_fkey"
            columns: ["internal_estimate_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_internal_estimate_created_by_fkey"
            columns: ["internal_estimate_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_subcontractor_estimate_submitted_by_fkey"
            columns: ["subcontractor_estimate_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      unified_messages: {
        Row: {
          attachment_ids: string[] | null
          context_organization_id: string | null
          context_type: string | null
          conversation_id: string | null
          created_at: string | null
          crew_member_name: string | null
          id: string | null
          is_internal: boolean | null
          message: string | null
          message_context: string | null
          sender_id: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_messages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      auth_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_profile_id_safe: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_user_assigned_to_work_order: {
        Args: { work_order_id: string }
        Returns: boolean
      }
      auth_user_belongs_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      auth_user_can_view_assignment: {
        Args: { assignment_id: string }
        Returns: boolean
      }
      auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_user_organization_assignments: {
        Args: Record<PropertyKey, never>
        Returns: {
          work_order_id: string
        }[]
      }
      auth_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_id: string
        }[]
      }
      auth_user_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      calculate_completion_time_by_trade: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_completion_hours: number
          completed_orders: number
          total_orders: number
          trade_name: string
        }[]
      }
      calculate_first_time_fix_rate: {
        Args: { end_date?: string; start_date?: string }
        Returns: number
      }
      call_send_email_trigger: {
        Args: {
          context_data?: Json
          record_id: string
          record_type?: string
          template_name: string
        }
        Returns: undefined
      }
      can_manage_work_orders: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_view_financial_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_assignment_completion_status: {
        Args: { work_order_id: string }
        Returns: boolean
      }
      check_assignment_completion_status_enhanced: {
        Args: { work_order_id: string }
        Returns: Json
      }
      check_email_queue_health: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_test_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      complete_test_environment_setup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      create_new_user: {
        Args: {
          email: string
          first_name: string
          last_name: string
          organization_id: string
          organization_role: string
          phone?: string
        }
        Returns: Json
      }
      debug_auth_state: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      debug_session_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      debug_upload_attempt: {
        Args: { p_uploaded_by_user_id: string; p_work_order_id: string }
        Returns: {
          auth_profile_id_result: string
          ids_match: boolean
          uploaded_by_user_id: string
          work_order_check: boolean
        }[]
      }
      debug_user_creation_state: {
        Args: { p_email?: string; p_user_id?: string }
        Returns: Json
      }
      ensure_single_organization_assignment: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_existing_test_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_existing_work_order_numbers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_work_order_sequence_numbers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      force_jwt_sync_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_internal_bill_number: {
        Args: Record<PropertyKey, never> | { org_id: string }
        Returns: string
      }
      generate_next_location_number: {
        Args: { org_id: string }
        Returns: string
      }
      generate_partner_invoice_number: {
        Args: { partner_org_id: string }
        Returns: string
      }
      generate_work_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_work_order_number_per_location: {
        Args: { location_code: string; org_id: string }
        Returns: string
      }
      generate_work_order_number_simple: {
        Args: { location_number?: string; org_id: string }
        Returns: string
      }
      generate_work_order_number_v2: {
        Args: { location_code?: string; org_id: string }
        Returns: string
      }
      get_conversation_messages: {
        Args: { p_before?: string; p_conversation_id: string; p_limit?: number }
        Returns: {
          attachment_ids: string[]
          created_at: string
          id: string
          message: string
          sender_id: string
        }[]
      }
      get_conversations_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          conversation_id: string
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          last_message: string
          last_message_at: string
          organization_id: string
          other_user_id: string
          title: string
          unread_count: number
          updated_at: string
        }[]
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_dashboard_data: {
        Args: {
          p_employee_id: string
          p_month_end: string
          p_month_start: string
          p_week_end: string
          p_week_start: string
        }
        Returns: Json
      }
      get_geographic_distribution: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_completion_hours: number
          city: string
          state: string
          work_order_count: number
        }[]
      }
      get_partner_ready_bills: {
        Args: { partner_org_id: string }
        Returns: {
          bill_date: string
          bill_id: string
          external_bill_number: string
          internal_bill_number: string
          subcontractor_org_initials: string
          subcontractor_org_name: string
          subcontractor_organization_id: string
          total_amount: number
          work_order_count: number
          work_order_numbers: string[]
        }[]
      }
      get_profile_id_direct: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_unread_message_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          unread_count: number
          work_order_id: string
        }[]
      }
      get_uploader_organization_type: {
        Args: { uploader_profile_id: string }
        Returns: Database["public"]["Enums"]["organization_type"]
      }
      get_user_id_from_legacy_path: {
        Args: { file_path: string }
        Returns: string
      }
      get_user_org_ids_by_type: {
        Args: {
          p_profile_id: string
          p_type: Database["public"]["Enums"]["organization_type"]
        }
        Returns: string[]
      }
      get_user_org_type: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["organization_type"]
      }
      get_user_organization_ids_direct: {
        Args: { p_user_id: string }
        Returns: {
          organization_id: string
        }[]
      }
      get_user_organization_ids_safe: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_organizations: {
        Args: { profile_uuid: string }
        Returns: {
          created_at: string
          id: string
          org_active: boolean
          org_initials: string
          org_name: string
          org_type: string
          organization_id: string
          role: string
          user_id: string
        }[]
      }
      get_user_organizations_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_id: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          role: Database["public"]["Enums"]["organization_role"]
        }[]
      }
      get_user_profile: {
        Args: { user_uuid: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          first_name: string
          hourly_billable_rate: number
          hourly_cost_rate: number
          id: string
          is_active: boolean
          is_employee: boolean
          last_name: string
          phone: string
          updated_at: string
          user_id: string
        }[]
      }
      get_work_order_id_from_path: {
        Args: { file_path: string }
        Returns: string
      }
      get_work_order_threads_overview: {
        Args: { p_limit?: number }
        Returns: {
          last_message: string
          last_message_at: string
          organization_id: string
          title: string
          unread_count: number
          updated_at: string
          work_order_id: string
        }[]
      }
      has_internal_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["organization_role"][]
        }
        Returns: boolean
      }
      initialize_all_user_jwt_metadata: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_valid_transition: {
        Args: {
          p_from_status: Database["public"]["Enums"]["work_order_status"]
          p_to_status: Database["public"]["Enums"]["work_order_status"]
        }
        Returns: boolean
      }
      jwt_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      jwt_organization_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      jwt_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jwt_profile_id_safe: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      list_dm_candidates: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      log_attachment_access_violation: {
        Args: { attachment_id: string; user_id: string; violation_type: string }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      monitor_email_queue: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      preview_work_order_number_per_location: {
        Args: { location_code: string; org_id: string }
        Returns: string
      }
      process_email_queue: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      queue_partner_invoice_email: {
        Args: { invoice_id: string }
        Returns: Json
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      seed_test_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_manual_completion_block: {
        Args: { blocked?: boolean; work_order_id: string }
        Returns: undefined
      }
      setup_bulletproof_test_data: {
        Args: Record<PropertyKey, never> | { admin_user_id?: string }
        Returns: Json
      }
      sync_user_auth_metadata: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      sync_user_organization_metadata: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      test_auth_context: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: {
          auth_uid: string
          org_count: number
          profile_found: boolean
        }[]
      }
      test_auth_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_basic_db_operations: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_ocr_functionality: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_rls_for_user: {
        Args: { test_email: string }
        Returns: {
          actual_result: boolean
          expected_access: string
          pass_fail: string
          test_scenario: string
          user_type: string
        }[]
      }
      test_user_creation: {
        Args: { test_email?: string }
        Returns: Json
      }
      test_work_order_transitions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      transition_work_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["work_order_status"]
          reason?: string
          user_id?: string
          work_order_id: string
        }
        Returns: Json
      }
      trigger_jwt_metadata_sync: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      trigger_send_email: {
        Args: { record_id: string; record_type: string; template_name: string }
        Returns: undefined
      }
      validate_direct_conversation_participants: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      validate_security_setup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_user_organization_assignment: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      verify_test_environment_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      assignment_type: "internal" | "subcontractor"
      conversation_type: "direct" | "organization" | "announcement"
      email_status: "sent" | "delivered" | "failed" | "bounced"
      file_type: "photo" | "invoice" | "document"
      organization_role: "owner" | "admin" | "manager" | "employee" | "member"
      organization_type: "partner" | "subcontractor" | "internal"
      report_status: "submitted" | "reviewed" | "approved" | "rejected"
      work_order_priority: "standard" | "urgent"
      work_order_status:
        | "received"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "estimate_needed"
        | "estimate_pending_approval"
        | "estimate_approved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assignment_type: ["internal", "subcontractor"],
      conversation_type: ["direct", "organization", "announcement"],
      email_status: ["sent", "delivered", "failed", "bounced"],
      file_type: ["photo", "invoice", "document"],
      organization_role: ["owner", "admin", "manager", "employee", "member"],
      organization_type: ["partner", "subcontractor", "internal"],
      report_status: ["submitted", "reviewed", "approved", "rejected"],
      work_order_priority: ["standard", "urgent"],
      work_order_status: [
        "received",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
        "estimate_needed",
        "estimate_pending_approval",
        "estimate_approved",
      ],
    },
  },
} as const
