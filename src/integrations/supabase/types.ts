export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          delivered_at: string | null
          error_message: string | null
          id: string
          recipient_email: string
          resend_message_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["email_status"]
          template_used: string | null
          work_order_id: string | null
        }
        Insert: {
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_message_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["email_status"]
          template_used?: string | null
          work_order_id?: string | null
        }
        Update: {
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_message_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["email_status"]
          template_used?: string | null
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
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
          created_at: string
          employee_user_id: string
          hourly_rate_snapshot: number
          hours_worked: number
          id: string
          notes: string | null
          report_date: string
          total_labor_cost: number | null
          updated_at: string
          work_order_id: string
          work_performed: string
        }
        Insert: {
          created_at?: string
          employee_user_id: string
          hourly_rate_snapshot: number
          hours_worked: number
          id?: string
          notes?: string | null
          report_date: string
          total_labor_cost?: number | null
          updated_at?: string
          work_order_id: string
          work_performed: string
        }
        Update: {
          created_at?: string
          employee_user_id?: string
          hourly_rate_snapshot?: number
          hours_worked?: number
          id?: string
          notes?: string | null
          report_date?: string
          total_labor_cost?: number | null
          updated_at?: string
          work_order_id?: string
          work_performed?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_reports_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "employee_reports_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      invoice_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          file_url: string
          id: string
          invoice_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          file_url: string
          id?: string
          invoice_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          file_url?: string
          id?: string
          invoice_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "invoice_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_work_orders: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          work_order_id: string
          work_order_report_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          work_order_id: string
          work_order_report_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          work_order_id?: string
          work_order_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_work_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_work_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_work_orders_work_order_report_id_fkey"
            columns: ["work_order_report_id"]
            isOneToOne: false
            referencedRelation: "work_order_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          external_invoice_number: string | null
          id: string
          internal_invoice_number: string
          paid_at: string | null
          payment_reference: string | null
          status: string
          subcontractor_organization_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          external_invoice_number?: string | null
          id?: string
          internal_invoice_number: string
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          subcontractor_organization_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          external_invoice_number?: string | null
          id?: string
          internal_invoice_number?: string
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
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
          next_sequence_number: number | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
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
          next_sequence_number?: number | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
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
          next_sequence_number?: number | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
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
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
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
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
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
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
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
          notes: string | null
          receipt_date: string
          receipt_image_url: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          employee_user_id: string
          id?: string
          notes?: string | null
          receipt_date: string
          receipt_image_url?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          employee_user_id?: string
          id?: string
          notes?: string | null
          receipt_date?: string
          receipt_image_url?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "receipts_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
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
      user_organizations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_organization_id: string | null
          assigned_to: string
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
          assigned_to: string
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
          assigned_to?: string
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
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
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
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
          uploaded_at: string
          uploaded_by_user_id: string
          work_order_id: string | null
          work_order_report_id: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by_user_id: string
          work_order_id?: string | null
          work_order_report_id?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by_user_id?: string
          work_order_id?: string | null
          work_order_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
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
            foreignKeyName: "work_order_attachments_work_order_report_id_fkey"
            columns: ["work_order_report_id"]
            isOneToOne: false
            referencedRelation: "work_order_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_reports: {
        Row: {
          hours_worked: number | null
          id: string
          invoice_amount: number
          invoice_number: string | null
          materials_used: string | null
          notes: string | null
          photos: Json | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          subcontractor_user_id: string
          submitted_at: string
          work_order_id: string
          work_performed: string
        }
        Insert: {
          hours_worked?: number | null
          id?: string
          invoice_amount: number
          invoice_number?: string | null
          materials_used?: string | null
          notes?: string | null
          photos?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subcontractor_user_id: string
          submitted_at?: string
          work_order_id: string
          work_performed: string
        }
        Update: {
          hours_worked?: number | null
          id?: string
          invoice_amount?: number
          invoice_number?: string | null
          materials_used?: string | null
          notes?: string | null
          photos?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subcontractor_user_id?: string
          submitted_at?: string
          work_order_id?: string
          work_performed?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_reports_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "work_order_reports_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_subcontractor_user_id_fkey"
            columns: ["subcontractor_user_id"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "work_order_reports_subcontractor_user_id_fkey"
            columns: ["subcontractor_user_id"]
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
          assigned_to: string | null
          assigned_to_type:
            | Database["public"]["Enums"]["assignment_type"]
            | null
          auto_completion_blocked: boolean | null
          city: string | null
          completed_at: string | null
          completion_checked_at: string | null
          completion_method: string | null
          created_at: string
          created_by: string
          date_assigned: string | null
          date_completed: string | null
          date_submitted: string
          description: string | null
          due_date: string | null
          estimated_completion_date: string | null
          estimated_hours: number | null
          final_completion_date: string | null
          id: string
          labor_cost: number | null
          location_address: string | null
          location_city: string | null
          location_name: string | null
          location_state: string | null
          location_street_address: string | null
          location_zip_code: string | null
          materials_cost: number | null
          organization_id: string | null
          partner_location_number: string | null
          partner_po_number: string | null
          state: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          store_location: string | null
          street_address: string | null
          subcontractor_invoice_amount: number | null
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
          assigned_to?: string | null
          assigned_to_type?:
            | Database["public"]["Enums"]["assignment_type"]
            | null
          auto_completion_blocked?: boolean | null
          city?: string | null
          completed_at?: string | null
          completion_checked_at?: string | null
          completion_method?: string | null
          created_at?: string
          created_by: string
          date_assigned?: string | null
          date_completed?: string | null
          date_submitted?: string
          description?: string | null
          due_date?: string | null
          estimated_completion_date?: string | null
          estimated_hours?: number | null
          final_completion_date?: string | null
          id?: string
          labor_cost?: number | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          location_street_address?: string | null
          location_zip_code?: string | null
          materials_cost?: number | null
          organization_id?: string | null
          partner_location_number?: string | null
          partner_po_number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          store_location?: string | null
          street_address?: string | null
          subcontractor_invoice_amount?: number | null
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
          assigned_to?: string | null
          assigned_to_type?:
            | Database["public"]["Enums"]["assignment_type"]
            | null
          auto_completion_blocked?: boolean | null
          city?: string | null
          completed_at?: string | null
          completion_checked_at?: string | null
          completion_method?: string | null
          created_at?: string
          created_by?: string
          date_assigned?: string | null
          date_completed?: string | null
          date_submitted?: string
          description?: string | null
          due_date?: string | null
          estimated_completion_date?: string | null
          estimated_hours?: number | null
          final_completion_date?: string | null
          id?: string
          labor_cost?: number | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          location_street_address?: string | null
          location_zip_code?: string | null
          materials_cost?: number | null
          organization_id?: string | null
          partner_location_number?: string | null
          partner_po_number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          store_location?: string | null
          street_address?: string | null
          subcontractor_invoice_amount?: number | null
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
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_subcontractor_performance"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
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
      mv_subcontractor_performance: {
        Row: {
          avg_completion_hours: number | null
          avg_invoice_amount: number | null
          company_name: string | null
          completed_jobs: number | null
          first_name: string | null
          last_name: string | null
          on_time_jobs: number | null
          quality_score: number | null
          subcontractor_id: string | null
          total_invoice_amount: number | null
          total_jobs: number | null
        }
        Relationships: []
      }
      mv_work_order_analytics: {
        Row: {
          assigned_count: number | null
          avg_completion_hours: number | null
          cancelled_count: number | null
          completed_count: number | null
          in_progress_count: number | null
          organization_id: string | null
          received_count: number | null
          submission_date: string | null
          submission_month: string | null
          submission_week: string | null
          total_invoice_amount: number | null
          total_orders: number | null
          trade_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
    Functions: {
      auth_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      auth_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_user_assigned_to_work_order: {
        Args: { wo_id: string }
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
        Returns: Database["public"]["Enums"]["user_type"]
      }
      calculate_completion_time_by_trade: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          trade_name: string
          avg_completion_hours: number
          total_orders: number
          completed_orders: number
        }[]
      }
      calculate_first_time_fix_rate: {
        Args: { start_date?: string; end_date?: string }
        Returns: number
      }
      check_assignment_completion_status: {
        Args: { work_order_id: string }
        Returns: boolean
      }
      check_assignment_completion_status_enhanced: {
        Args: { work_order_id: string }
        Returns: boolean
      }
      clear_test_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      complete_test_environment_setup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_existing_test_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_internal_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_work_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_work_order_number_simple: {
        Args: { org_id: string; location_number?: string }
        Returns: string
      }
      generate_work_order_number_v2: {
        Args: { org_id: string; location_number?: string }
        Returns: Json
      }
      get_current_user_type: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_type"]
      }
      get_geographic_distribution: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          state: string
          city: string
          work_order_count: number
          avg_completion_hours: number
        }[]
      }
      get_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_id: string
        }[]
      }
      get_user_type_secure: {
        Args: { user_uuid?: string }
        Returns: Database["public"]["Enums"]["user_type"]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
        Args: { work_order_id: string; blocked?: boolean }
        Returns: undefined
      }
      setup_bulletproof_test_data: {
        Args: Record<PropertyKey, never> | { admin_user_id?: string }
        Returns: Json
      }
      transition_work_order_status: {
        Args: {
          work_order_id: string
          new_status: Database["public"]["Enums"]["work_order_status"]
          reason?: string
          user_id?: string
        }
        Returns: boolean
      }
      trigger_completion_email: {
        Args: { work_order_id: string }
        Returns: undefined
      }
      user_assigned_to_work_order: {
        Args: { wo_id: string }
        Returns: boolean
      }
      user_belongs_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      assignment_type: "internal" | "subcontractor"
      email_status: "sent" | "delivered" | "failed" | "bounced"
      file_type: "photo" | "invoice" | "document"
      organization_type: "partner" | "subcontractor" | "internal"
      report_status: "submitted" | "reviewed" | "approved" | "rejected"
      user_type: "admin" | "partner" | "subcontractor" | "employee"
      work_order_status:
        | "received"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "estimate_needed"
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
      email_status: ["sent", "delivered", "failed", "bounced"],
      file_type: ["photo", "invoice", "document"],
      organization_type: ["partner", "subcontractor", "internal"],
      report_status: ["submitted", "reviewed", "approved", "rejected"],
      user_type: ["admin", "partner", "subcontractor", "employee"],
      work_order_status: [
        "received",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
        "estimate_needed",
      ],
    },
  },
} as const
